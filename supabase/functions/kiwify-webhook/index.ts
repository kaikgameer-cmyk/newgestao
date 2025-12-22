/**
 * Edge Function: kiwify-webhook
 * 
 * Recebe webhooks da Kiwify para processar pagamentos/assinaturas.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { emailPurchaseApproved, emailSubscriptionRenewed, BRAND } from "../_shared/emailTemplates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-kiwify-secret",
};

// Event mapping to internal status
const EVENT_STATUS_MAP: Record<string, "active" | "past_due" | "canceled"> = {
  "order_approved": "active",
  "subscription_activated": "active",
  "subscription_renewed": "active",
  "payment_approved": "active",
  "compra_aprovada": "active",
  "payment_refused": "past_due",
  "subscription_past_due": "past_due",
  "payment_refunded": "past_due",
  "subscription_canceled": "canceled",
  "subscription_expired": "canceled",
  "refund_requested": "canceled",
};

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

function getPlanName(interval: "month" | "quarter" | "year"): string {
  switch (interval) {
    case "year": return "Plano Anual";
    case "quarter": return "Plano Trimestral";
    default: return "Plano Mensal";
  }
}

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

function generateRandomPassword(length: number = 16): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// CRITICAL: Hard-coded production URL
const PROD_APP_URL = "https://newgestao.app";

function validateNoLovableUrl(url: string, context: string): void {
  if (url.includes("lovable.app") || url.includes("lovableproject.com")) {
    const errorMsg = `[SECURITY BLOCK] ${context}: URL contains lovable.app domain which is FORBIDDEN. URL: ${url}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

async function updateWebhookLog(
  supabase: any,
  logId: string | undefined,
  status: string,
  response: any
): Promise<void> {
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

serve(async (req) => {
  console.log("=== KIWIFY WEBHOOK RECEIVED ===");
  console.log("Method:", req.method);
  console.log("Timestamp:", new Date().toISOString());
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  let orderId = "";
  let eventName = "";
  let payload: any = {};

  try {
    const webhookSecret = Deno.env.get("KIWIFY_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("KIWIFY_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const secretFromQuery = url.searchParams.get("secret");
    const secretFromHeader = req.headers.get("x-kiwify-secret");
    
    const providedSecret = secretFromQuery || secretFromHeader;

    if (!providedSecret) {
      console.error("Missing webhook secret");
      return new Response(JSON.stringify({ error: "Missing webhook secret" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (providedSecret !== webhookSecret) {
      console.error("Invalid webhook secret");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Webhook secret validated");

    payload = await req.json();
    
    eventName = payload.webhook_event_type || payload.event || payload.trigger || payload.order_status || "";
    orderId = payload.order_id || payload.subscription?.id || payload.Subscription?.id || `unknown_${Date.now()}`;
    
    console.log("Event:", eventName);
    console.log("Order ID:", orderId);

    // Idempotency check
    const { data: existingLog } = await supabase
      .from("webhook_logs")
      .select("id, status, processed_at")
      .eq("source", "kiwify")
      .eq("order_id", orderId)
      .eq("event_type", eventName)
      .maybeSingle();

    if (existingLog) {
      console.log("DUPLICATE WEBHOOK - already processed");
      return new Response(
        JSON.stringify({ success: true, duplicate: true, message: "Event already processed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    if (logInsertError && logInsertError.code === "23505") {
      console.log("Race condition duplicate detected");
      return new Response(
        JSON.stringify({ success: true, duplicate: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const logId = webhookLog?.id;

    // Extract data
    const customer = payload.Customer || payload.customer || {};
    const subscription = payload.Subscription || payload.subscription || {};
    const product = payload.Product || payload.product || {};

    const email = customer.email?.toLowerCase().trim();
    const name = customer.full_name || customer.name || customer.first_name || email?.split("@")[0] || "Usuário";
    const kiwifySubscriptionId = subscription.id || payload.subscription_id || orderId;
    const kiwifyProductId = product.id || payload.product_id || "";
    const rawInterval = subscription.plan?.frequency || subscription.interval || subscription.billing_interval || "month";
    
    console.log("Customer email:", email);
    console.log("Customer name:", name);

    if (!email) {
      console.error("Missing customer email");
      await updateWebhookLog(supabase, logId, "error", { error: "Missing customer email" });
      return new Response(JSON.stringify({ error: "Missing customer email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const status = EVENT_STATUS_MAP[eventName] || EVENT_STATUS_MAP[eventName?.toLowerCase()];
    
    if (!status) {
      console.log(`Unknown event type: '${eventName}', ignoring`);
      await updateWebhookLog(supabase, logId, "ignored", { reason: "Unknown event type" });
      return new Response(JSON.stringify({ message: "Event ignored", event: eventName }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const billingInterval = mapBillingInterval(rawInterval);
    const planName = getPlanName(billingInterval);

    let currentPeriodEnd: Date;
    if (subscription.current_period_end || subscription.next_payment_at) {
      currentPeriodEnd = new Date(subscription.current_period_end || subscription.next_payment_at);
    } else {
      currentPeriodEnd = calculatePeriodEnd(billingInterval);
    }

    // User management
    const { data: existingUsers, error: searchError } = await supabase.auth.admin.listUsers();
    
    if (searchError) {
      console.error("Error searching users:", searchError);
      await updateWebhookLog(supabase, logId, "error", { error: searchError.message });
      throw searchError;
    }

    let userId: string;
    let isNewUser = false;

    const existingUser = existingUsers.users.find((u: any) => u.email?.toLowerCase() === email);

    if (!existingUser) {
      const generatedPassword = generateRandomPassword();
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: { name },
      });

      if (createError) {
        console.error("Error creating user:", createError);
        await updateWebhookLog(supabase, logId, "error", { error: createError.message });
        throw createError;
      }

      userId = newUser.user.id;
      isNewUser = true;
      console.log(`Created new user: ${email} (ID: ${userId})`);
    } else {
      userId = existingUser.id;
      console.log(`Found existing user: ${email} (ID: ${userId})`);
    }

    // Subscription upsert
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
      await updateWebhookLog(supabase, logId, "error", { error: subscriptionError.message });
      throw subscriptionError;
    }

    console.log(`Subscription upserted: ${status}`);

    // Email sending
    let emailSent = false;
    let emailError = null;

    if (status === "active" && resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);

        if (isNewUser) {
          // Generate password token
          const rawToken = crypto.randomUUID() + crypto.randomUUID();
          
          const encoder = new TextEncoder();
          const data = encoder.encode(rawToken);
          const hashBuffer = await crypto.subtle.digest("SHA-256", data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const tokenHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
          
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 24);
          
          const { error: tokenError } = await supabase
            .from("password_tokens")
            .insert({
              user_id: userId,
              token_hash: tokenHash,
              token_preview: rawToken.substring(0, 8) + "...",
              type: "signup",
              expires_at: expiresAt.toISOString(),
            });
          
          let setPasswordUrl: string;
          if (tokenError) {
            console.error("Error storing password token:", tokenError.message);
            setPasswordUrl = `${PROD_APP_URL}/definir-senha?email=${encodeURIComponent(email)}`;
          } else {
            setPasswordUrl = `${PROD_APP_URL}/definir-senha?token=${encodeURIComponent(rawToken)}`;
            validateNoLovableUrl(setPasswordUrl, "setPasswordUrl");
          }

          const { subject, html } = emailPurchaseApproved({
            name,
            setPasswordUrl,
            planName,
            orderId,
            purchasedAt: formatDate(new Date()),
            validUntil: formatDate(currentPeriodEnd),
            buyerEmail: email,
          });

          await resend.emails.send({
            from: `${BRAND.appName} <no-reply@newgestao.app>`,
            to: [email],
            reply_to: BRAND.supportEmail,
            subject,
            html,
          });

          emailSent = true;
          console.log("Purchase approved email sent");
        } else {
          // Renewal email
          const { subject, html } = emailSubscriptionRenewed({
            name,
            planName,
            validUntil: formatDate(currentPeriodEnd),
          });

          await resend.emails.send({
            from: `${BRAND.appName} <no-reply@newgestao.app>`,
            to: [email],
            reply_to: BRAND.supportEmail,
            subject,
            html,
          });

          emailSent = true;
          console.log("Renewal email sent");
        }
      } catch (emailErr: any) {
        console.error("Email error:", emailErr?.message || String(emailErr));
        emailError = emailErr?.message || String(emailErr);
      }
    }

    await updateWebhookLog(supabase, logId, emailSent ? "completed" : "completed_no_email", {
      userId,
      isNewUser,
      status,
      planName,
      emailSent,
      emailError,
    });

    console.log("=== WEBHOOK COMPLETED ===");
    
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
    console.error("Webhook error:", error?.message || String(error));
    
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
