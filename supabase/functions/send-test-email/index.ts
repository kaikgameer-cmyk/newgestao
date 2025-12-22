/**
 * Edge Function: send-test-email
 * 
 * Endpoint para testar configuração de email (somente admin)
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { emailTest, BRAND } from "../_shared/emailTemplates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== SEND-TEST-EMAIL FUNCTION ===");
  console.log("Method:", req.method);

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
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.log("No authorization header");
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      console.log("User not authenticated:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User authenticated:", user.email);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: isAdmin, error: adminError } = await supabaseAdmin.rpc(
      "has_role",
      { _role: "admin", _user_id: user.id }
    );

    if (adminError) {
      console.error("Error checking admin role:", adminError.message);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar permissões" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isAdmin) {
      console.log("User is not admin");
      return new Response(
        JSON.stringify({ error: "Acesso negado. Somente administradores podem enviar emails de teste." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Admin verified");

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

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Serviço de email não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { subject, html } = emailTest();

    const resend = new Resend(resendApiKey);
    const emailResult = await resend.emails.send({
      from: `${BRAND.appName} <no-reply@newgestao.app>`,
      to: [targetEmail],
      reply_to: BRAND.supportEmail,
      subject,
      html,
    });

    console.log("Test email sent successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email de teste enviado para ${targetEmail}`,
        config: {
          from: `${BRAND.appName} <no-reply@newgestao.app>`,
          replyTo: BRAND.supportEmail,
          appUrl: BRAND.appUrl,
        },
        resendId: (emailResult as any)?.data?.id || (emailResult as any)?.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error sending test email:", error?.message || String(error));
    return new Response(
      JSON.stringify({ 
        error: "Erro ao enviar email de teste",
        details: error?.message || String(error)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
