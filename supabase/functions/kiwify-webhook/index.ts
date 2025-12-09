import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-kiwify-secret",
};

// App URL - using the current Lovable app URL
const APP_URL = "https://drivercontrol1.lovable.app";

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

// Generate random password
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

    // Validate webhook secret - accept via header OR query string for Kiwify compatibility
    const url = new URL(req.url);
    const secretFromQuery = url.searchParams.get("secret");
    const secretFromHeader = req.headers.get("x-kiwify-secret");
    const providedSecret = secretFromHeader || secretFromQuery;

    console.log("Secret validation:");
    console.log("  - From header (x-kiwify-secret):", secretFromHeader ? "present" : "not present");
    console.log("  - From query string (?secret=):", secretFromQuery ? "present" : "not present");
    console.log("  - Expected secret configured:", webhookSecret ? "yes" : "no");

    if (!providedSecret) {
      console.error("❌ No secret provided in header or query string");
      return new Response(JSON.stringify({ error: "Missing webhook secret" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (providedSecret !== webhookSecret) {
      console.error("❌ Invalid webhook secret - secrets do not match");
      console.error("  Provided:", providedSecret.substring(0, 4) + "***");
      console.error("  Expected:", webhookSecret.substring(0, 4) + "***");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ Webhook secret validated successfully");

    // Parse webhook payload
    const payload = await req.json();
    console.log("=== WEBHOOK PAYLOAD ===");
    console.log(JSON.stringify(payload, null, 2));

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
    
    console.log("Extracted data:");
    console.log("  - Email:", email);
    console.log("  - Name:", name);
    console.log("  - Subscription ID:", kiwifySubscriptionId);
    console.log("  - Product ID:", kiwifyProductId);
    console.log("  - Raw interval:", rawInterval);

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

    // Initialize Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resend = resendApiKey ? new Resend(resendApiKey) : null;
    console.log("Resend API configured:", resend ? "yes" : "no");

    // Check if user exists
    console.log("Searching for existing user with email:", email);
    const { data: existingUsers, error: searchError } = await supabase.auth.admin.listUsers();
    
    if (searchError) {
      console.error("❌ Error searching users:", searchError);
      throw searchError;
    }

    let userId: string;
    let isNewUser = false;
    let generatedPassword = "";

    const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === email);

    if (!existingUser) {
      // Create new user
      generatedPassword = generateRandomPassword();
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
    const shouldSendEmail = status === "active" && resend;
    console.log("Should send email?", shouldSendEmail ? "yes" : "no", `(status: ${status}, resend configured: ${resend ? 'yes' : 'no'})`);

    if (shouldSendEmail) {
      try {
        console.log("Preparing to send email to:", email);
        
        if (isNewUser) {
          // New user - send welcome email with credentials
          console.log("Sending WELCOME email with credentials...");
          await resend.emails.send({
            from: "Driver Control <onboarding@resend.dev>",
            to: [email],
            subject: "Bem-vindo ao Driver Control! 🚗",
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 40px 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 16px; padding: 40px; border: 1px solid #333;">
                  <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="color: #facc15; margin: 0; font-size: 28px;">🚗 Driver Control</h1>
                  </div>
                  
                  <h2 style="color: #ffffff; margin-bottom: 24px;">Olá${name !== email?.split("@")[0] ? `, ${name}` : ''}!</h2>
                  
                  <p style="color: #a1a1a1; line-height: 1.6; margin-bottom: 24px;">
                    Sua assinatura foi confirmada com sucesso! Agora você pode acessar o Driver Control e começar a gerenciar suas finanças como motorista de aplicativo.
                  </p>
                  
                  <div style="background-color: #262626; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                    <h3 style="color: #facc15; margin: 0 0 16px 0; font-size: 16px;">📧 Suas credenciais de acesso:</h3>
                    <p style="margin: 8px 0; color: #ffffff;"><strong>Email:</strong> ${email}</p>
                    <p style="margin: 8px 0; color: #ffffff;"><strong>Senha:</strong> ${generatedPassword}</p>
                  </div>
                  
                  <div style="background-color: #262626; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                    <h3 style="color: #facc15; margin: 0 0 16px 0; font-size: 16px;">📋 Detalhes do seu plano:</h3>
                    <p style="margin: 8px 0; color: #ffffff;"><strong>Plano:</strong> ${planName}</p>
                    <p style="margin: 8px 0; color: #ffffff;"><strong>Status:</strong> Ativo ✅</p>
                  </div>
                  
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${APP_URL}/login" style="display: inline-block; background-color: #facc15; color: #0a0a0a; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Acessar o Painel
                    </a>
                  </div>
                  
                  <p style="color: #a1a1a1; line-height: 1.6; font-size: 14px;">
                    <strong>Importante:</strong> Recomendamos que você altere sua senha após o primeiro acesso para maior segurança.
                  </p>
                  
                  <hr style="border: none; border-top: 1px solid #333; margin: 32px 0;">
                  
                  <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">
                    © ${new Date().getFullYear()} Driver Control. Todos os direitos reservados.<br>
                    <a href="${APP_URL}" style="color: #facc15; text-decoration: none;">${APP_URL}</a>
                  </p>
                </div>
              </body>
              </html>
            `,
          });
          console.log(`✅ Welcome email sent to ${email}`);
        } else {
          // Existing user - send subscription activation/renewal email
          console.log("Sending ACTIVATION/RENEWAL email...");
          await resend.emails.send({
            from: "Driver Control <onboarding@resend.dev>",
            to: [email],
            subject: "Sua assinatura está ativa! 🚗",
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 40px 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 16px; padding: 40px; border: 1px solid #333;">
                  <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="color: #facc15; margin: 0; font-size: 28px;">🚗 Driver Control</h1>
                  </div>
                  
                  <h2 style="color: #ffffff; margin-bottom: 24px;">Olá${name !== email?.split("@")[0] ? `, ${name}` : ''}!</h2>
                  
                  <p style="color: #a1a1a1; line-height: 1.6; margin-bottom: 24px;">
                    Sua assinatura do Driver Control está ativa! Continue gerenciando suas finanças com facilidade.
                  </p>
                  
                  <div style="background-color: #262626; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                    <h3 style="color: #facc15; margin: 0 0 16px 0; font-size: 16px;">📋 Detalhes do seu plano:</h3>
                    <p style="margin: 8px 0; color: #ffffff;"><strong>Plano:</strong> ${planName}</p>
                    <p style="margin: 8px 0; color: #ffffff;"><strong>Status:</strong> Ativo ✅</p>
                    <p style="margin: 8px 0; color: #ffffff;"><strong>Próxima renovação:</strong> ${currentPeriodEnd.toLocaleDateString('pt-BR')}</p>
                  </div>
                  
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${APP_URL}/login" style="display: inline-block; background-color: #facc15; color: #0a0a0a; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Acessar o Painel
                    </a>
                  </div>
                  
                  <p style="color: #a1a1a1; line-height: 1.6; font-size: 14px;">
                    Use seu e-mail e senha cadastrados para acessar.
                  </p>
                  
                  <hr style="border: none; border-top: 1px solid #333; margin: 32px 0;">
                  
                  <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">
                    © ${new Date().getFullYear()} Driver Control. Todos os direitos reservados.<br>
                    <a href="${APP_URL}" style="color: #facc15; text-decoration: none;">${APP_URL}</a>
                  </p>
                </div>
              </body>
              </html>
            `,
          });
          console.log(`✅ Activation email sent to ${email}`);
        }
      } catch (emailError: any) {
        // Safely log email error without circular references
        const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
        const errorName = emailError instanceof Error ? emailError.name : "Unknown";
        console.error("❌ Error sending email - Name:", errorName, "- Message:", errorMessage);
        // Don't fail the webhook if email fails - log it but continue
      }
    } else {
      console.log("Skipping email - either status is not 'active' or Resend not configured");
    }

    console.log("=== WEBHOOK PROCESSED SUCCESSFULLY ===");

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Webhook processed successfully",
      userId,
      isNewUser,
      status,
      emailSent: shouldSendEmail,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    // Safely log error without circular references
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "Unknown";
    console.error("❌ WEBHOOK ERROR - Name:", errorName, "- Message:", errorMessage);
    return new Response(JSON.stringify({ 
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
