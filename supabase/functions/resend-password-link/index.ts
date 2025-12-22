import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { emailPasswordReset, BRAND } from "../_shared/emailTemplates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// CRITICAL: Hard-coded production URL - NEVER use lovable.app
const PROD_APP_URL = "https://newgestao.app";

// Hash token for secure storage
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Validates a URL does NOT contain lovable.app - blocks broken links
 */
function validateNoLovableUrl(url: string, context: string): void {
  if (url.includes("lovable.app") || url.includes("lovableproject.com")) {
    const errorMsg = `[SECURITY BLOCK] ${context}: URL contains lovable.app domain which is FORBIDDEN. URL: ${url}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    const { email, userId, skipSubscriptionCheck } = await req.json();

    if (!email && !userId) {
      console.error("[RESEND-LINK] Missing email or userId");
      return new Response(
        JSON.stringify({ error: "Email ou ID do usuário é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[RESEND-LINK] Processing request - email:", email, "userId:", userId);

    let user: any = null;
    let userEmail: string | null = null;

    if (userId) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (userError) {
        console.error("[RESEND-LINK] Error getting user by ID:", userError);
        return new Response(
          JSON.stringify({ error: "Usuário não encontrado" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      user = userData?.user;
      userEmail = user?.email;
      console.log("[RESEND-LINK] User found by ID:", user?.id, "email:", userEmail);
    } else {
      const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
      if (usersError) {
        console.error("[RESEND-LINK] Error listing users:", usersError);
        throw new Error("Erro ao buscar usuário");
      }

      user = usersData?.users?.find(
        (u: any) => u.email?.toLowerCase() === email.toLowerCase()
      );
      userEmail = email;
    }

    if (!user) {
      console.log("[RESEND-LINK] User not found");
      return new Response(
        JSON.stringify({ 
          ok: true, 
          message: "Se o email estiver cadastrado, você receberá o link em breve." 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!userEmail) {
      console.error("[RESEND-LINK] User has no email:", user.id);
      return new Response(
        JSON.stringify({ error: "Usuário não possui email cadastrado" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[RESEND-LINK] User found:", user.id, "email:", userEmail);

    if (!skipSubscriptionCheck) {
      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gt("current_period_end", new Date().toISOString())
        .maybeSingle();

      if (subError) {
        console.error("[RESEND-LINK] Error checking subscription:", subError);
      }

      if (!subscription) {
        console.log("[RESEND-LINK] No active subscription for user:", user.id);
        return new Response(
          JSON.stringify({ 
            error: "Usuário não possui assinatura ativa. Entre em contato com o suporte." 
          }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("[RESEND-LINK] Active subscription found:", subscription.id);
    } else {
      console.log("[RESEND-LINK] Subscription check skipped (admin request)");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, first_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const userName = profile?.first_name || profile?.name || "Usuário";

    const rawToken = crypto.randomUUID() + "-" + crypto.randomUUID();
    const tokenHash = await hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const { error: tokenError } = await supabase
      .from("password_tokens")
      .insert({
        user_id: user.id,
        token_hash: tokenHash,
        token_preview: rawToken.substring(0, 8),
        type: "set_password",
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error("[RESEND-LINK] Error storing token:", tokenError);
      throw new Error("Erro ao gerar link de acesso");
    }

    const passwordUrl = `${PROD_APP_URL}/definir-senha?token=${rawToken}`;

    validateNoLovableUrl(passwordUrl, "passwordUrl");

    console.log("[RESEND-LINK] Generated password URL - AUDIT LOG:");
    console.log("  - finalVerifyUrl:", passwordUrl);
    console.log("  - linkPreview:", rawToken.substring(0, 8) + "...");

    const { subject, html } = emailPasswordReset({
      name: userName,
      resetUrl: passwordUrl,
    });

    if (!resendApiKey) {
      console.error("[RESEND-LINK] RESEND_API_KEY not configured");
      throw new Error("Email service not configured");
    }

    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: `${BRAND.appName} <no-reply@newgestao.app>`,
      to: [userEmail],
      reply_to: BRAND.supportEmail,
      subject,
      html,
    });

    console.log("[RESEND-LINK] Email sent successfully to:", userEmail);

    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: "Link enviado com sucesso!" 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("[RESEND-LINK] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao processar solicitação" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
