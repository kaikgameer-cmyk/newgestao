/**
 * Edge Function: send-test-email
 * 
 * Endpoint para testar configuração de email (somente admin)
 * 
 * POST { email?: string }
 * - Se email não fornecido, usa o email do usuário autenticado
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendAppEmail, getTestEmailHtml, getEmailConfig } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== SEND-TEST-EMAIL FUNCTION ===");
  console.log("Method:", req.method);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método não permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.log("❌ No authorization header");
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Client with user's JWT to verify auth
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      console.log("❌ User not authenticated:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User authenticated:", user.email);

    // Check if user is admin using service role client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: isAdmin, error: adminError } = await supabaseAdmin.rpc(
      "has_role",
      { _role: "admin", _user_id: user.id }
    );

    if (adminError) {
      console.error("❌ Error checking admin role:", adminError.message);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar permissões" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isAdmin) {
      console.log("❌ User is not admin");
      return new Response(
        JSON.stringify({ error: "Acesso negado. Somente administradores podem enviar emails de teste." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Admin verified");

    // Parse request body
    let targetEmail = user.email;
    try {
      const body = await req.json();
      if (body.email) {
        targetEmail = body.email;
      }
    } catch {
      // No body or invalid JSON, use user's email
    }

    if (!targetEmail) {
      return new Response(
        JSON.stringify({ error: "Email não encontrado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending test email to:", targetEmail);

    // Get email configuration for response
    const config = getEmailConfig();

    // Send test email
    const emailResult = await sendAppEmail({
      to: targetEmail,
      subject: "🧪 Email de Teste - New Gestão",
      html: getTestEmailHtml(),
    });

    console.log("✅ Test email sent successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email de teste enviado para ${targetEmail}`,
        config: {
          from: `${config.fromName} <${config.fromEmail}>`,
          replyTo: config.replyTo,
          appUrl: config.appUrl,
          testMode: config.isTestMode,
        },
        resendId: (emailResult as any)?.data?.id || (emailResult as any)?.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Error sending test email:", error?.message || String(error));
    return new Response(
      JSON.stringify({ 
        error: "Erro ao enviar email de teste",
        details: error?.message || String(error)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
