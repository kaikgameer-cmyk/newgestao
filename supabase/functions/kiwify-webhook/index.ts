/**
 * Edge Function: kiwify-webhook
 * 
 * Recebe webhooks da Kiwify para processar pagamentos/assinaturas.
 * 
 * Melhorias implementadas:
 * - Idempotência por order_id + event_type (tabela webhook_logs)
 * - Geração de link via supabase.auth.admin.generateLink (recovery)
 * - Template de email dark elegante
 * - Logging completo para debugging
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-kiwify-secret",
};

// Event mapping to internal status
const EVENT_STATUS_MAP: Record<string, "active" | "past_due" | "canceled"> = {
  // Active events
  "order_approved": "active",
  "subscription_activated": "active",
  "subscription_renewed": "active",
  "payment_approved": "active",
  "compra_aprovada": "active",
  // Past due events
  "payment_refused": "past_due",
  "subscription_past_due": "past_due",
  "payment_refunded": "past_due",
  // Canceled events
  "subscription_canceled": "canceled",
  "subscription_expired": "canceled",
  "refund_requested": "canceled",
};

// Billing interval mapping
function mapBillingInterval(interval: string): "month" | "quarter" | "year" {
  const normalizedInterval = interval?.toLowerCase().trim();
  
  if (normalizedInterval === "year" || normalizedInterval === "yearly" || normalizedInterval === "annual") {
    return "year";
  }
  if (normalizedInterval === "quarter" || normalizedInterval === "quarterly" || normalizedInterval === "3_months" || normalizedInterval === "3months") {
    return "quarter";
  }
  return "month";
}

// Plan name based on interval
function getPlanName(interval: "month" | "quarter" | "year"): string {
  switch (interval) {
    case "year": return "Plano Anual";
    case "quarter": return "Plano Trimestral";
    default: return "Plano Mensal";
  }
}

// Calculate period end based on interval
function calculatePeriodEnd(interval: "month" | "quarter" | "year"): Date {
  const now = new Date();
  switch (interval) {
    case "year":
      return new Date(now.setFullYear(now.getFullYear() + 1));
    case "quarter":
      return new Date(now.setMonth(now.getMonth() + 3));
    default:
      return new Date(now.setMonth(now.getMonth() + 1));
  }
}

// Generate random password for user creation
function generateRandomPassword(length: number = 16): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Get email config
function getEmailConfig() {
  return {
    fromEmail: Deno.env.get("RESEND_FROM_EMAIL") || "no-reply@newgestao.app",
    fromName: "New Gestão",
    replyTo: Deno.env.get("RESEND_REPLY_TO_EMAIL") || "newgestao.contato@outlook.com",
    appUrl: Deno.env.get("APP_BASE_URL") || "https://newgestao.app",
  };
}

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Format date
function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Build purchase approved email HTML (dark elegant template)
function buildPurchaseApprovedEmail(params: {
  name: string;
  email: string;
  planName: string;
  planValue?: number;
  orderId: string;
  periodEnd: Date;
  setPasswordUrl: string;
  appUrl: string;
}): string {
  const { name, email, planName, planValue, orderId, periodEnd, setPasswordUrl, appUrl } = params;
  
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compra Aprovada - New Gestão</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background: linear-gradient(135deg, #facc15, #eab308); border-radius: 12px; padding: 16px 24px;">
                    <span style="font-size: 28px; font-weight: bold; color: #0f172a; letter-spacing: 2px;">NG</span>
                  </td>
                </tr>
              </table>
              <p style="margin: 16px 0 0 0; font-size: 22px; font-weight: 600; color: #f8fafc;">New Gestão</p>
            </td>
          </tr>
          
          <!-- Content Card -->
          <tr>
            <td style="background-color: #1e293b; border-radius: 16px; padding: 32px; border: 1px solid #334155;">
              
              <!-- Title -->
              <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #22c55e; text-align: center;">
                ✅ Compra Aprovada!
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #94a3b8; text-align: center;">
                Seu acesso ao New Gestão está pronto.
              </p>
              
              <!-- Greeting -->
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #e2e8f0;">
                Olá${name && name !== email?.split("@")[0] ? `, <strong style="color: #f8fafc;">${name}</strong>` : ''}! 🎉
              </p>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #94a3b8;">
                Sua compra foi aprovada com sucesso. Agora você tem acesso completo a todas as funcionalidades do New Gestão para gerenciar seus ganhos como motorista de aplicativo.
              </p>
              
              <!-- Order Details Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td style="background-color: #334155; border-left: 4px solid #facc15; border-radius: 8px; padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #facc15;">📋 Detalhes do Pedido</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #94a3b8;">Plano:</td>
                        <td style="padding: 4px 0; font-size: 14px; color: #f8fafc; text-align: right; font-weight: 500;">${planName}</td>
                      </tr>
                      ${planValue ? `
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #94a3b8;">Valor:</td>
                        <td style="padding: 4px 0; font-size: 14px; color: #22c55e; text-align: right; font-weight: 500;">${formatCurrency(planValue)}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #94a3b8;">Pedido:</td>
                        <td style="padding: 4px 0; font-size: 14px; color: #f8fafc; text-align: right; font-weight: 500;">${orderId}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #94a3b8;">Data:</td>
                        <td style="padding: 4px 0; font-size: 14px; color: #f8fafc; text-align: right; font-weight: 500;">${formatDate(new Date())}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #94a3b8;">Válido até:</td>
                        <td style="padding: 4px 0; font-size: 14px; color: #f8fafc; text-align: right; font-weight: 500;">${formatDate(periodEnd)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Access Info Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td style="background-color: #334155; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #3b82f6;">🔐 Seus Dados de Acesso</p>
                    <p style="margin: 0; font-size: 14px; color: #94a3b8;">
                      E-mail: <strong style="color: #f8fafc;">${email}</strong>
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 32px auto;">
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #facc15, #eab308); border-radius: 8px;">
                    <a href="${setPasswordUrl}" target="_blank" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 600; color: #0f172a; text-decoration: none;">
                      Definir minha senha
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b; text-align: center;">
                Clique no botão acima para criar sua senha e ativar seu acesso.
              </p>
              
              <!-- Warning Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td style="background-color: #422006; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px;">
                    <p style="margin: 0; font-size: 14px; color: #fcd34d;">
                      <strong>⏰ Importante:</strong> Este link expira em 24 horas. Após definir sua senha, você poderá acessar o painel sempre que quiser.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Secondary Button -->
              <p style="margin: 24px 0 8px 0; font-size: 14px; color: #64748b; text-align: center;">
                Depois de definir sua senha, acesse o painel em:
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 16px auto;">
                <tr>
                  <td align="center" style="border: 1px solid #facc15; border-radius: 8px;">
                    <a href="${appUrl}/login" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: 500; color: #facc15; text-decoration: none;">
                      ${appUrl.replace('https://', '')}/login
                    </a>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 32px;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">
                Precisa de ajuda? Entre em contato:
              </p>
              <p style="margin: 0 0 16px 0;">
                <a href="mailto:newgestao.contato@outlook.com" style="color: #facc15; text-decoration: none; font-size: 14px;">
                  newgestao.contato@outlook.com
                </a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                © ${new Date().getFullYear()} New Gestão. Todos os direitos reservados.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px;">
                <a href="${appUrl}" style="color: #64748b; text-decoration: none;">
                  ${appUrl.replace('https://', '')}
                </a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Build renewal email HTML
function buildRenewalEmail(params: {
  name: string;
  email: string;
  planName: string;
  periodEnd: Date;
  appUrl: string;
}): string {
  const { name, email, planName, periodEnd, appUrl } = params;
  
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Assinatura Renovada - New Gestão</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background: linear-gradient(135deg, #facc15, #eab308); border-radius: 12px; padding: 16px 24px;">
                    <span style="font-size: 28px; font-weight: bold; color: #0f172a; letter-spacing: 2px;">NG</span>
                  </td>
                </tr>
              </table>
              <p style="margin: 16px 0 0 0; font-size: 22px; font-weight: 600; color: #f8fafc;">New Gestão</p>
            </td>
          </tr>
          
          <!-- Content Card -->
          <tr>
            <td style="background-color: #1e293b; border-radius: 16px; padding: 32px; border: 1px solid #334155;">
              
              <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700; color: #22c55e; text-align: center;">
                ✅ Assinatura Renovada!
              </h1>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #e2e8f0;">
                Olá${name && name !== email?.split("@")[0] ? `, <strong style="color: #f8fafc;">${name}</strong>` : ''}!
              </p>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #94a3b8;">
                Sua assinatura do <strong style="color: #facc15;">${planName}</strong> foi renovada com sucesso e está ativa até <strong style="color: #f8fafc;">${formatDate(periodEnd)}</strong>.
              </p>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #94a3b8;">
                Seu acesso continua o mesmo. Use seu e-mail <strong style="color: #f8fafc;">${email}</strong> e a senha já cadastrada para entrar no painel.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 32px auto;">
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #facc15, #eab308); border-radius: 8px;">
                    <a href="${appUrl}/login" target="_blank" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 600; color: #0f172a; text-decoration: none;">
                      Acessar o Painel
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0 0; font-size: 14px; color: #64748b; text-align: center;">
                Se tiver esquecido a senha, clique em "Esqueci minha senha" na tela de login.
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 32px;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">
                Precisa de ajuda? Entre em contato:
              </p>
              <p style="margin: 0 0 16px 0;">
                <a href="mailto:newgestao.contato@outlook.com" style="color: #facc15; text-decoration: none; font-size: 14px;">
                  newgestao.contato@outlook.com
                </a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                © ${new Date().getFullYear()} New Gestão. Todos os direitos reservados.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Send email via Resend
async function sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; id?: string; error?: string }> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("[EMAIL] RESEND_API_KEY not configured");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }
  
  const config = getEmailConfig();
  const fromField = `${config.fromName} <${config.fromEmail}>`;
  
  console.log("[EMAIL] Sending...");
  console.log("  - From:", fromField);
  console.log("  - To:", to);
  console.log("  - Subject:", subject);
  console.log("  - Reply-To:", config.replyTo);
  
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromField,
        to: [to],
        subject,
        html,
        reply_to: config.replyTo,
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error("[EMAIL] Resend API error:", JSON.stringify(result));
      return { success: false, error: result.message || "Resend API error" };
    }
    
    console.log("[EMAIL] Sent successfully! ID:", result.id);
    return { success: true, id: result.id };
  } catch (error: any) {
    console.error("[EMAIL] Exception:", error?.message || String(error));
    return { success: false, error: error?.message || "Unknown error" };
  }
}

serve(async (req) => {
  console.log("=== KIWIFY WEBHOOK RECEIVED ===");
  console.log("Method:", req.method);
  console.log("Timestamp:", new Date().toISOString());
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("CORS preflight - returning 200");
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client early for logging
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  let orderId = "";
  let eventName = "";
  let payload: any = {};

  try {
    // Get webhook secret from environment
    const webhookSecret = Deno.env.get("KIWIFY_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("❌ KIWIFY_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate webhook secret via header
    const secretFromHeader = req.headers.get("x-kiwify-secret");
    console.log("Secret validation - header present:", !!secretFromHeader);

    if (!secretFromHeader) {
      console.error("❌ Missing x-kiwify-secret header");
      return new Response(JSON.stringify({ error: "Missing webhook secret header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (secretFromHeader !== webhookSecret) {
      console.error("❌ Invalid webhook secret");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ Webhook secret validated");

    // Parse webhook payload
    payload = await req.json();
    
    // Extract event and order_id for idempotency
    eventName = payload.webhook_event_type || payload.event || payload.trigger || payload.order_status || "";
    orderId = payload.order_id || payload.subscription?.id || payload.Subscription?.id || `unknown_${Date.now()}`;
    
    console.log("Event:", eventName);
    console.log("Order ID:", orderId);

    // ============================================
    // IDEMPOTENCY CHECK - Prevent duplicate processing
    // ============================================
    const { data: existingLog, error: logCheckError } = await supabase
      .from("webhook_logs")
      .select("id, status, processed_at")
      .eq("source", "kiwify")
      .eq("order_id", orderId)
      .eq("event_type", eventName)
      .maybeSingle();

    if (existingLog) {
      console.log("⚠️ DUPLICATE WEBHOOK - already processed");
      console.log("  - Previous log ID:", existingLog.id);
      console.log("  - Processed at:", existingLog.processed_at);
      return new Response(
        JSON.stringify({ 
          success: true, 
          duplicate: true, 
          message: "Event already processed",
          logId: existingLog.id 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create webhook log entry
    const { data: webhookLog, error: logInsertError } = await supabase
      .from("webhook_logs")
      .insert({
        source: "kiwify",
        order_id: orderId,
        event_type: eventName,
        status: "processing",
        payload: payload,
      })
      .select("id")
      .single();

    if (logInsertError) {
      // If unique constraint violation, it's a race condition duplicate
      if (logInsertError.code === "23505") {
        console.log("⚠️ Race condition duplicate detected");
        return new Response(
          JSON.stringify({ success: true, duplicate: true, message: "Event already being processed" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("Error creating webhook log:", logInsertError);
    }
    
    const logId = webhookLog?.id;
    console.log("Webhook log created:", logId);

    // Extract data from payload
    const customer = payload.Customer || payload.customer || {};
    const subscription = payload.Subscription || payload.subscription || {};
    const product = payload.Product || payload.product || {};
    const orderData = payload.order || {};

    const email = customer.email?.toLowerCase().trim();
    const name = customer.full_name || customer.name || customer.first_name || email?.split("@")[0] || "Usuário";
    const kiwifySubscriptionId = subscription.id || payload.subscription_id || orderId;
    const kiwifyProductId = product.id || payload.product_id || "";
    const rawInterval = subscription.plan?.frequency || subscription.interval || subscription.billing_interval || "month";
    const orderValue = orderData.total || product.price || subscription.plan?.price || null;
    
    console.log("Customer email:", email);
    console.log("Customer name:", name);
    console.log("Product ID:", kiwifyProductId);
    console.log("Subscription ID:", kiwifySubscriptionId);

    // Validate required fields
    if (!email) {
      console.error("❌ Missing customer email");
      await updateWebhookLog(supabase, logId, "error", { error: "Missing customer email" });
      return new Response(JSON.stringify({ error: "Missing customer email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map event to status
    const status = EVENT_STATUS_MAP[eventName] || EVENT_STATUS_MAP[eventName?.toLowerCase()];
    console.log("Mapped status:", status || "unknown");
    
    if (!status) {
      console.log(`⚠️ Unknown event type: '${eventName}', ignoring`);
      await updateWebhookLog(supabase, logId, "ignored", { reason: "Unknown event type" });
      return new Response(JSON.stringify({ message: "Event ignored", event: eventName }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map billing interval and plan name
    const billingInterval = mapBillingInterval(rawInterval);
    const planName = getPlanName(billingInterval);
    console.log("Plan:", planName, "- Interval:", billingInterval);

    // Calculate period end
    let currentPeriodEnd: Date;
    if (subscription.current_period_end || subscription.next_payment_at) {
      currentPeriodEnd = new Date(subscription.current_period_end || subscription.next_payment_at);
    } else {
      currentPeriodEnd = calculatePeriodEnd(billingInterval);
    }
    console.log("Period end:", currentPeriodEnd.toISOString());

    // Get app base URL
    const config = getEmailConfig();
    console.log("App URL:", config.appUrl);

    // ============================================
    // USER MANAGEMENT
    // ============================================
    
    // Check if user exists
    console.log("Searching for existing user...");
    const { data: existingUsers, error: searchError } = await supabase.auth.admin.listUsers();
    
    if (searchError) {
      console.error("❌ Error searching users:", searchError);
      await updateWebhookLog(supabase, logId, "error", { error: searchError.message });
      throw searchError;
    }

    let userId: string;
    let isNewUser = false;

    const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === email);

    if (!existingUser) {
      // Create new user with random password
      const generatedPassword = generateRandomPassword();
      console.log("Creating new user...");
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: { name },
      });

      if (createError) {
        console.error("❌ Error creating user:", createError);
        await updateWebhookLog(supabase, logId, "error", { error: createError.message });
        throw createError;
      }

      userId = newUser.user.id;
      isNewUser = true;
      console.log(`✅ Created new user: ${email} (ID: ${userId})`);
    } else {
      userId = existingUser.id;
      console.log(`✅ Found existing user: ${email} (ID: ${userId})`);
    }

    // ============================================
    // SUBSCRIPTION UPSERT
    // ============================================
    
    console.log("Upserting subscription...");
    const { error: subscriptionError } = await supabase
      .from("subscriptions")
      .upsert({
        user_id: userId,
        kiwify_subscription_id: kiwifySubscriptionId,
        kiwify_product_id: kiwifyProductId,
        plan_name: planName,
        billing_interval: billingInterval,
        status,
        current_period_end: currentPeriodEnd.toISOString(),
        last_event: eventName,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "kiwify_subscription_id",
      });

    if (subscriptionError) {
      console.error("❌ Error upserting subscription:", subscriptionError);
      await updateWebhookLog(supabase, logId, "error", { error: subscriptionError.message });
      throw subscriptionError;
    }

    console.log(`✅ Subscription upserted: ${status}`);

    // ============================================
    // EMAIL SENDING (only for active status)
    // ============================================
    
    let emailSent = false;
    let emailError = null;
    let setPasswordUrl = "";

    if (status === "active") {
      console.log("=== PREPARING EMAIL ===");
      
      try {
        if (isNewUser) {
          // Generate recovery link using Supabase Admin API
          console.log("Generating recovery link for new user...");
          
          const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: "recovery",
            email,
            options: {
              redirectTo: `${config.appUrl}/definir-senha`,
            },
          });

          if (linkError || !linkData?.properties?.action_link) {
            console.error("❌ Error generating recovery link:", linkError?.message || "No action_link returned");
            // Fallback: use direct link with email param
            setPasswordUrl = `${config.appUrl}/definir-senha?email=${encodeURIComponent(email)}`;
            console.log("Using fallback URL:", setPasswordUrl);
          } else {
            // The action_link is the full Supabase URL, we need to use it directly
            // or extract the token and build our own URL
            setPasswordUrl = linkData.properties.action_link;
            console.log("✅ Recovery link generated successfully");
            console.log("  - Link preview:", setPasswordUrl.substring(0, 80) + "...");
          }

          // Build and send purchase approved email
          const emailHtml = buildPurchaseApprovedEmail({
            name,
            email,
            planName,
            planValue: orderValue ? parseFloat(orderValue) : undefined,
            orderId,
            periodEnd: currentPeriodEnd,
            setPasswordUrl,
            appUrl: config.appUrl,
          });

          const emailResult = await sendEmail(
            email,
            "✅ Compra aprovada — Defina sua senha e ative seu acesso",
            emailHtml
          );

          emailSent = emailResult.success;
          if (!emailResult.success) {
            emailError = emailResult.error;
          }
        } else {
          // Existing user - send renewal email
          console.log("Sending renewal email to existing user...");
          
          const emailHtml = buildRenewalEmail({
            name,
            email,
            planName,
            periodEnd: currentPeriodEnd,
            appUrl: config.appUrl,
          });

          const emailResult = await sendEmail(
            email,
            "✅ Assinatura renovada — Seu acesso continua ativo",
            emailHtml
          );

          emailSent = emailResult.success;
          if (!emailResult.success) {
            emailError = emailResult.error;
          }
        }
      } catch (emailErr: any) {
        console.error("=== EMAIL ERROR ===");
        console.error("Error:", emailErr?.message || String(emailErr));
        emailError = emailErr?.message || String(emailErr);
      }
    }

    // ============================================
    // UPDATE WEBHOOK LOG WITH RESULT
    // ============================================
    
    await updateWebhookLog(supabase, logId, emailSent ? "completed" : "completed_no_email", {
      userId,
      isNewUser,
      status,
      planName,
      emailSent,
      emailError,
    });

    // Return success response
    console.log("=== WEBHOOK COMPLETED ===");
    console.log("  - User ID:", userId);
    console.log("  - Is New User:", isNewUser);
    console.log("  - Status:", status);
    console.log("  - Email Sent:", emailSent);
    
    return new Response(
      JSON.stringify({
        success: true,
        userId,
        isNewUser,
        status,
        planName,
        billingInterval,
        emailSent,
        logId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Webhook error:", error?.message || String(error));
    
    // Try to log the error
    try {
      if (orderId && eventName) {
        await supabase
          .from("webhook_logs")
          .update({
            status: "error",
            response: { error: error?.message || String(error) },
            processed_at: new Date().toISOString(),
          })
          .eq("source", "kiwify")
          .eq("order_id", orderId)
          .eq("event_type", eventName);
      }
    } catch (logError) {
      console.error("Could not update webhook log:", logError);
    }
    
    return new Response(
      JSON.stringify({ error: error?.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper function to update webhook log
async function updateWebhookLog(
  supabase: any,
  logId: string | undefined,
  status: string,
  response: Record<string, any>
) {
  if (!logId) return;
  
  try {
    await supabase
      .from("webhook_logs")
      .update({
        status,
        response,
        processed_at: new Date().toISOString(),
      })
      .eq("id", logId);
  } catch (error) {
    console.error("Error updating webhook log:", error);
  }
}
