import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Kiwify Webhook V2 - Focused on stability and logging
 * 
 * Features:
 * - Validates secret via query string (?secret=...)
 * - ALWAYS returns 200 OK to prevent Kiwify retries
 * - Logs all payloads for debugging
 * - Safe JSON parsing with fallback
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to return JSON response
function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  const timestamp = new Date().toISOString();
  
  console.log("=== KIWIFY WEBHOOK V2 ===");
  console.log("Timestamp:", timestamp);
  console.log("Method:", req.method);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    console.log("❌ Method not allowed:", req.method);
    // Still return 200 to not trigger retries
    return jsonResponse({ ok: true, message: "method_not_allowed", received: req.method });
  }

  try {
    // 1. Validate secret from query string
    const url = new URL(req.url);
    const secretParam = url.searchParams.get("secret");
    const expectedSecret = Deno.env.get("KIWIFY_WEBHOOK_SECRET");

    console.log("Secret param present:", !!secretParam);
    console.log("Expected secret configured:", !!expectedSecret);

    if (!expectedSecret) {
      console.error("❌ KIWIFY_WEBHOOK_SECRET not configured in environment");
      // Return 200 anyway to prevent retries
      return jsonResponse({ ok: true, warning: "missing_secret_config" });
    }

    if (!secretParam) {
      console.error("❌ Missing ?secret= query parameter");
      return jsonResponse({ ok: true, warning: "missing_secret_param" });
    }

    if (secretParam !== expectedSecret) {
      console.error("❌ Invalid secret provided");
      return jsonResponse({ ok: true, warning: "invalid_secret" });
    }

    console.log("✅ Secret validated successfully");

    // 2. Parse body safely
    let payload: Record<string, unknown> | null = null;
    let rawBody = "";

    try {
      rawBody = await req.text();
      console.log("Raw body length:", rawBody.length);
      
      if (rawBody && rawBody.trim()) {
        payload = JSON.parse(rawBody);
        console.log("✅ JSON parsed successfully");
      } else {
        console.log("⚠️ Empty body received");
      }
    } catch (parseError) {
      console.error("❌ JSON parse error:", parseError);
      console.log("Raw body preview:", rawBody.substring(0, 500));
      return jsonResponse({ ok: true, warning: "invalid_json", preview: rawBody.substring(0, 100) });
    }

    // 3. Log the full payload
    console.log("=== KIWIFY_EVENT_PAYLOAD ===");
    console.log(JSON.stringify(payload, null, 2));

    // 4. Extract key information for logging
    if (payload) {
      const p = payload as Record<string, unknown>;
      const order = p.order as Record<string, unknown> | undefined;
      const customer = (p.Customer || p.customer) as Record<string, unknown> | undefined;
      const product = (p.Product || p.product) as Record<string, unknown> | undefined;

      const orderId = p.order_id || order?.order_id || "unknown";
      const orderStatus = p.order_status || order?.status || "unknown";
      const customerEmail = customer?.email || "unknown";
      const productName = product?.product_name || product?.name || "unknown";

      console.log("=== EXTRACTED DATA ===");
      console.log("Order ID:", orderId);
      console.log("Order Status:", orderStatus);
      console.log("Customer Email:", customerEmail);
      console.log("Product Name:", productName);
    }

    // 5. Return success
    console.log("✅ Webhook V2 processed successfully");
    return jsonResponse({
      ok: true, 
      message: "received",
      timestamp 
    });

  } catch (error) {
    // Global error handler - still return 200
    console.error("❌ Unexpected error:", error);
    return jsonResponse({ 
      ok: true, 
      warning: "unexpected_error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
