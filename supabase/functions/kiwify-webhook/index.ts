import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendAppEmail, getAppBaseUrl } from "../_shared/email.ts";
import { generateSecureToken, getTokenExpiration, hashToken } from "../_shared/tokens.ts";

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

// Generate random password (still needed for user creation, but not sent in email)
function generateRandomPassword(length: number = 16): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

serve(async (req) => {
  console.log("=== KIWIFY WEBHOOK RECEIVED ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("CORS preflight request - returning 200");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get webhook secret from environment
    const webhookSecret = Deno.env.get("KIWIFY_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("❌ KIWIFY_WEBHOOK_SECRET not configured in environment");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SECURITY: Validate webhook secret via header ONLY (query string exposes secrets in logs)
    const secretFromHeader = req.headers.get("x-kiwify-secret");

    console.log("Secret validation:");
    console.log("  - From header (x-kiwify-secret):", secretFromHeader ? "present" : "not present");
    console.log("  - Expected secret configured:", webhookSecret ? "yes" : "no");

    if (!secretFromHeader) {
      console.error("❌ No secret provided in x-kiwify-secret header");
      return new Response(JSON.stringify({ error: "Missing webhook secret header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (secretFromHeader !== webhookSecret) {
      console.error("❌ Invalid webhook secret - secrets do not match");
      console.error("  Provided:", secretFromHeader.substring(0, 4) + "***");
      console.error("  Expected:", webhookSecret.substring(0, 4) + "***");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ Webhook secret validated successfully");

    // Parse webhook payload
    const payload = await req.json();

    // Environment-aware logging to avoid leaking sensitive data in production
    const environment = Deno.env.get("ENVIRONMENT") || "production";

    if (environment === "development") {
      console.log("=== WEBHOOK PAYLOAD (DEV) ===");
      console.log(JSON.stringify(payload, null, 2));
    } else {
      console.log("Webhook received (sanitized log)", {
        event: payload.webhook_event_type || payload.event || payload.trigger || payload.order_status || "",
        timestamp: Date.now(),
      });
    }

    // Extract data from payload (adapt based on actual Kiwify payload structure)
    const eventName = payload.webhook_event_type || payload.event || payload.trigger || payload.order_status || "";
    console.log("Event name extracted:", eventName);

    const customer = payload.Customer || payload.customer || {};
    const subscription = payload.Subscription || payload.subscription || {};
    const product = payload.Product || payload.product || {};

    const email = customer.email?.toLowerCase().trim();
    const name = customer.full_name || customer.name || customer.first_name || email?.split("@")[0] || "Usuário";
    const kiwifySubscriptionId = subscription.id || payload.subscription_id || payload.order_id || `kiwify_${Date.now()}`;
    const kiwifyProductId = product.id || payload.product_id || "";
    const rawInterval = subscription.plan?.frequency || subscription.interval || subscription.billing_interval || "month";
    
    if (environment === "development") {
      console.log("Extracted data (DEV):");
      console.log("  - Email:", email);
      console.log("  - Name:", name);
      console.log("  - Subscription ID:", kiwifySubscriptionId);
      console.log("  - Product ID:", kiwifyProductId);
      console.log("  - Raw interval:", rawInterval);
    } else {
      const emailDomain = email?.split("@")[1] || null;
      console.log("Extracted data (sanitized):", {
        email_domain: emailDomain,
        subscription_id: kiwifySubscriptionId,
        product_id: kiwifyProductId,
        raw_interval: rawInterval,
      });
    }

    // Validate required fields
    if (!email) {
      console.error("❌ Missing customer email in webhook payload");
      return new Response(JSON.stringify({ error: "Missing customer email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map event to status
    const status = EVENT_STATUS_MAP[eventName] || EVENT_STATUS_MAP[eventName.toLowerCase()];
    console.log("Mapped status:", status || "unknown event");
    
    if (!status) {
      console.log(`⚠️ Unknown event type: '${eventName}', ignoring webhook`);
      return new Response(JSON.stringify({ message: "Event ignored", event: eventName }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map billing interval
    const billingInterval = mapBillingInterval(rawInterval);
    const planName = getPlanName(billingInterval);
    console.log("Billing interval:", billingInterval, "- Plan name:", planName);

    // Calculate period end
    let currentPeriodEnd: Date;
    if (subscription.current_period_end || subscription.next_payment_at) {
      currentPeriodEnd = new Date(subscription.current_period_end || subscription.next_payment_at);
    } else {
      currentPeriodEnd = calculatePeriodEnd(billingInterval);
    }
    console.log("Period end:", currentPeriodEnd.toISOString());

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get app base URL
    const appBaseUrl = getAppBaseUrl();
    console.log("App base URL:", appBaseUrl);

    // Check if user exists
    console.log("Searching for existing user with email:", email);
    const { data: existingUsers, error: searchError } = await supabase.auth.admin.listUsers();
    
    if (searchError) {
      console.error("❌ Error searching users:", searchError);
      throw searchError;
    }

    let userId: string;
    let isNewUser = false;

    const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === email);

    if (!existingUser) {
      // Create new user with random password (not sent to user)
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
        throw createError;
      }

      userId = newUser.user.id;
      isNewUser = true;
      console.log(`✅ Created new user: ${email} (ID: ${userId})`);
    } else {
      userId = existingUser.id;
      console.log(`✅ Found existing user: ${email} (ID: ${userId})`);
    }

    // Upsert subscription
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
      throw subscriptionError;
    }

    console.log(`✅ Subscription upserted for user ${email}: ${status}`);

    // Send email based on user state and subscription status
    const shouldSendEmail = status === "active";
    console.log("Should send email?", shouldSendEmail ? "yes" : "no", `(status: ${status})`);

    let emailSent = false;

    if (shouldSendEmail) {
      // Log pre-email info for debugging
      console.log("=== PRE-EMAIL SEND INFO ===");
      console.log("  - User ID:", userId);
      console.log("  - User Email:", email);
      console.log("  - User Name:", name);
      console.log("  - Is New User:", isNewUser);
      console.log("  - Plan:", planName);
      console.log("  - Billing Interval:", billingInterval);
      console.log("  - Event Type:", eventName);
      console.log("  - App Base URL:", appBaseUrl);
      
      try {
        // For new users, generate custom password token and link
        let resetLink = '';
        if (isNewUser) {
          try {
            console.log("[WEBHOOK] Novo cliente - gerando token próprio de definição de senha...");
            
            // Generate custom token and save to database
            const token = generateSecureToken();
            const tokenHash = await hashToken(token);
            const expiresAt = getTokenExpiration(24); // 24 hours

            const { error: tokenError } = await supabase
              .from("password_tokens")
              .insert({
                user_id: userId,
                token_hash: tokenHash,
                token_preview: token.length >= 6 ? token.slice(-6) : token,
                type: "signup",
                expires_at: expiresAt.toISOString(),
              });

            if (tokenError) {
              console.error("[WEBHOOK] Erro ao salvar token:", tokenError.message || tokenError);
              // Fallback: use direct link to definir-senha with email param
              resetLink = `${appBaseUrl}/definir-senha?email=${encodeURIComponent(email)}`;
            } else {
              // Build link using our own token (NOT Supabase's magic link)
              resetLink = `${appBaseUrl}/definir-senha?token=${encodeURIComponent(token)}`;
              console.log("[WEBHOOK] Token de senha gerado e salvo com sucesso");
              console.log("  - Token expira em:", expiresAt.toISOString());
              console.log("  - Link:", resetLink);
            }
          } catch (linkError: any) {
            console.error("[WEBHOOK] Exceção ao gerar token de senha:", linkError?.message || String(linkError));
            // Fallback to direct link
            resetLink = `${appBaseUrl}/definir-senha?email=${encodeURIComponent(email)}`;
          }
        } else {
          console.log("[WEBHOOK] Cliente existente - apenas confirmação de renovação/reativação");
        }

        // Build email HTML based on user state
        const emailHtml = isNewUser ? `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 40px 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 16px; padding: 40px; border: 1px solid #333;">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #facc15; margin: 0; font-size: 28px;">New Gestão</h1>
              </div>
              
              <h2 style="color: #ffffff; margin-bottom: 24px;">Sua assinatura do New Gestão está ativa! 🚗</h2>
              
              <p style="color: #a1a1a1; line-height: 1.6; margin-bottom: 24px;">
                Olá${name !== email?.split("@")[0] ? `, ${name}` : ''}! Sua assinatura foi confirmada com sucesso.
              </p>
              
              <div style="background-color: #262626; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h3 style="color: #facc15; margin: 0 0 16px 0; font-size: 16px;">📋 Detalhes do seu plano:</h3>
                <p style="margin: 8px 0; color: #ffffff;"><strong>Plano:</strong> ${planName}</p>
                <p style="margin: 8px 0; color: #ffffff;"><strong>Status:</strong> Ativo ✅</p>
                <p style="margin: 8px 0; color: #ffffff;"><strong>Próxima renovação:</strong> ${currentPeriodEnd.toLocaleDateString('pt-BR')}</p>
              </div>
              
              <div style="background-color: #262626; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h3 style="color: #facc15; margin: 0 0 12px 0; font-size: 16px;">🔐 Acesso ao New Gestão</h3>
                <p style="margin: 4px 0; color: #e5e5e5;">
                  <strong>E-mail de acesso:</strong> ${email}
                </p>
                <p style="margin: 4px 0 16px 0; color: #a3a3a3;">
                  Para criar ou definir sua senha pela primeira vez, clique no botão abaixo:
                </p>
              </div>
              
              <div style="text-align: center; margin: 24px 0;">
                <a href="${resetLink}" style="display: inline-block; background-color: #facc15; color: #0a0a0a; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Criar/Definir minha senha
                </a>
              </div>
              
              <p style="margin-top: 8px; color: #737373; font-size: 13px; text-align: center;">
                Depois de definir sua senha, você pode acessar o painel sempre que quiser por:<br/>
                <a href="${appBaseUrl}/login" style="color: #facc15; text-decoration: none;">
                  ${appBaseUrl}/login
                </a>
              </p>
              
              <div style="text-align: center; margin: 24px 0;">
                <a href="${appBaseUrl}/login" style="display: inline-block; background-color: transparent; color: #facc15; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; border: 1px solid #facc15;">
                  Acessar o Painel
                </a>
              </div>
              
              <p style="color: #a1a1a1; line-height: 1.6; font-size: 14px;">
                <strong>Importante:</strong> O link para definir sua senha expira em 24 horas. Se você não solicitou esta conta, ignore este email.
              </p>
              
              <hr style="border: none; border-top: 1px solid #333; margin: 32px 0;">
              
              <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">
                © ${new Date().getFullYear()} New Gestão. Todos os direitos reservados.<br>
                <a href="${appBaseUrl}" style="color: #facc15; text-decoration: none;">${appBaseUrl}</a><br>
                <span style="color: #888;">Suporte: newgestao.contato@outlook.com</span>
              </p>
            </div>
          </body>
          </html>
        ` : `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 40px 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 16px; padding: 40px; border: 1px solid #333;">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #facc15; margin: 0; font-size: 28px;">New Gestão</h1>
              </div>
              
              <h2 style="color: #ffffff; margin-bottom: 24px;">Sua assinatura está ativa! 🚗</h2>
              
              <p style="color: #a1a1a1; line-height: 1.6; margin-bottom: 24px;">
                Olá${name !== email?.split("@")[0] ? `, ${name}` : ''}! Sua assinatura do New Gestão foi renovada/reativada com sucesso.
              </p>
              
              <div style="background-color: #262626; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h3 style="color: #facc15; margin: 0 0 16px 0; font-size: 16px;">📋 Detalhes do seu plano:</h3>
                <p style="margin: 8px 0; color: #ffffff;"><strong>Plano:</strong> ${planName}</p>
                <p style="margin: 8px 0; color: #ffffff;"><strong>Status:</strong> Ativo ✅</p>
                <p style="margin: 8px 0; color: #ffffff;"><strong>Próxima renovação:</strong> ${currentPeriodEnd.toLocaleDateString('pt-BR')}</p>
              </div>
              
              <div style="background-color: #262626; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h3 style="color: #facc15; margin: 0 0 12px 0; font-size: 16px;">🔐 Acesso ao New Gestão</h3>
                <p style="margin: 4px 0; color: #e5e5e5;">
                  <strong>E-mail de acesso:</strong> ${email}
                </p>
                <p style="margin: 4px 0; color: #a3a3a3;">
                  Seu acesso continua o mesmo. Use seu e-mail e senha já cadastrados para entrar no painel.
                  Se tiver esquecido a senha, clique em "Esqueci minha senha" na tela de login.
                </p>
              </div>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${appBaseUrl}/login" style="display: inline-block; background-color: #facc15; color: #0a0a0a; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Acessar o Painel
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #333; margin: 32px 0;">
              
              <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">
                © ${new Date().getFullYear()} New Gestão. Todos os direitos reservados.<br>
                <a href="${appBaseUrl}" style="color: #facc15; text-decoration: none;">${appBaseUrl}</a><br>
                <span style="color: #888;">Suporte: newgestao.contato@outlook.com</span>
              </p>
            </div>
          </body>
          </html>
        `;

        const emailSubject = "Sua assinatura está ativa! 🚗";
        
        console.log("Attempting to send email via Resend...");
        console.log("  - To:", email);
        console.log("  - Subject:", emailSubject);
        console.log("  - Is New User:", isNewUser);

        const emailResult = await sendAppEmail({
          to: email,
          subject: emailSubject,
          html: emailHtml,
        });

        emailSent = true;
        console.log("✅ Email sent successfully");
        console.log("  - Resend response:", JSON.stringify(emailResult));
      } catch (emailError: any) {
        console.error("=== EMAIL SEND ERROR ===");
        console.error("  - Error name:", emailError?.name || "Unknown");
        console.error("  - Error message:", emailError?.message || String(emailError));
        console.error("  - Error stack:", emailError?.stack || "No stack trace");
        // Don't throw - email failure shouldn't fail the webhook
      }
    }

    // Return success response
    console.log("=== WEBHOOK COMPLETED SUCCESSFULLY ===");
    return new Response(
      JSON.stringify({
        success: true,
        userId,
        isNewUser,
        status,
        planName,
        billingInterval,
        emailSent,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Webhook error:", error?.message || String(error));
    return new Response(
      JSON.stringify({ error: error?.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
