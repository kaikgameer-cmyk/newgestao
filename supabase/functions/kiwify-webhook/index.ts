import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Kiwify checkout links
const KIWIFY_CHECKOUT_MENSAL = "https://pay.kiwify.com.br/uFtH74A";
const KIWIFY_CHECKOUT_TRIMESTRAL = "https://pay.kiwify.com.br/LPmRPJG";
const KIWIFY_CHECKOUT_ANUAL = "https://pay.kiwify.com.br/vQFj0v8";

// Event mapping to internal status
const EVENT_STATUS_MAP: Record<string, "active" | "past_due" | "canceled"> = {
  // Active events
  "order_approved": "active",
  "subscription_activated": "active",
  "subscription_renewed": "active",
  "payment_approved": "active",
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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate webhook secret
    const url = new URL(req.url);
    const secretParam = url.searchParams.get("secret");
    const secretHeader = req.headers.get("x-kiwify-secret");
    const webhookSecret = Deno.env.get("KIWIFY_WEBHOOK_SECRET");

    if (!webhookSecret) {
      console.error("KIWIFY_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const providedSecret = secretParam || secretHeader;
    if (providedSecret !== webhookSecret) {
      console.error("Invalid webhook secret");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse webhook payload
    const payload = await req.json();
    console.log("Kiwify webhook received:", JSON.stringify(payload, null, 2));

    // Extract data from payload (adapt based on actual Kiwify payload structure)
    const eventName = payload.webhook_event_type || payload.event || payload.trigger || "";
    const customer = payload.Customer || payload.customer || {};
    const subscription = payload.Subscription || payload.subscription || {};
    const product = payload.Product || payload.product || {};

    const email = customer.email?.toLowerCase().trim();
    const name = customer.full_name || customer.name || email?.split("@")[0] || "Usuário";
    const kiwifySubscriptionId = subscription.id || payload.subscription_id || payload.order_id || `kiwify_${Date.now()}`;
    const kiwifyProductId = product.id || payload.product_id || "";
    const rawInterval = subscription.plan?.frequency || subscription.interval || subscription.billing_interval || "month";
    
    // Validate required fields
    if (!email) {
      console.error("Missing customer email in webhook payload");
      return new Response(JSON.stringify({ error: "Missing customer email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map event to status
    const status = EVENT_STATUS_MAP[eventName] || EVENT_STATUS_MAP[eventName.toLowerCase()];
    if (!status) {
      console.log(`Unknown event type: ${eventName}, ignoring`);
      return new Response(JSON.stringify({ message: "Event ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map billing interval
    const billingInterval = mapBillingInterval(rawInterval);
    const planName = getPlanName(billingInterval);

    // Calculate period end
    let currentPeriodEnd: Date;
    if (subscription.current_period_end || subscription.next_payment_at) {
      currentPeriodEnd = new Date(subscription.current_period_end || subscription.next_payment_at);
    } else {
      currentPeriodEnd = calculatePeriodEnd(billingInterval);
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    // Check if user exists
    const { data: existingUsers, error: searchError } = await supabase.auth.admin.listUsers();
    
    if (searchError) {
      console.error("Error searching users:", searchError);
      throw searchError;
    }

    let userId: string;
    let isNewUser = false;
    let generatedPassword = "";

    const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === email);

    if (!existingUser) {
      // Create new user
      generatedPassword = generateRandomPassword();
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: { name },
      });

      if (createError) {
        console.error("Error creating user:", createError);
        throw createError;
      }

      userId = newUser.user.id;
      isNewUser = true;
      console.log(`Created new user: ${email}`);
    } else {
      userId = existingUser.id;
      console.log(`Found existing user: ${email}`);
    }

    // Upsert subscription
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
      console.error("Error upserting subscription:", subscriptionError);
      throw subscriptionError;
    }

    console.log(`Subscription upserted for user ${email}: ${status}`);

    // Send welcome email for new users
    if (isNewUser && resend) {
      const loginUrl = `${Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app")}/login`;
      
      try {
        await resend.emails.send({
          from: "Driver Control <onboarding@resend.dev>",
          to: [email],
          subject: "Bem-vindo ao Driver Control! 🚗",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #F59E0B;">Bem-vindo ao Driver Control!</h1>
              
              <p>Olá ${name},</p>
              
              <p>Sua conta foi criada com sucesso! Agora você tem acesso ao melhor sistema de controle financeiro para motoristas de aplicativo.</p>
              
              <div style="background-color: #1F2937; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #F59E0B; margin-top: 0;">Seus dados de acesso:</h3>
                <p style="color: #E5E7EB;"><strong>E-mail:</strong> ${email}</p>
                <p style="color: #E5E7EB;"><strong>Senha:</strong> ${generatedPassword}</p>
              </div>
              
              <p><strong>Importante:</strong> Recomendamos que você altere sua senha após o primeiro acesso.</p>
              
              <a href="${loginUrl}" style="display: inline-block; background-color: #F59E0B; color: #1F2937; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;">
                Acessar Driver Control
              </a>
              
              <p>Seu plano: <strong>${planName}</strong></p>
              
              <p style="color: #9CA3AF; font-size: 14px;">Se você tiver alguma dúvida, responda a este e-mail.</p>
            </div>
          `,
        });
        console.log(`Welcome email sent to ${email}`);
      } catch (emailError) {
        console.error("Error sending welcome email:", emailError);
        // Don't fail the webhook if email fails
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Webhook processed successfully",
      userId,
      isNewUser,
      status,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
