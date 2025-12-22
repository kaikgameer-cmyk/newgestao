/**
 * Edge Function: set-password
 * 
 * Valida tokens de criação/redefinição de senha e atualiza a senha do usuário.
 * 
 * Endpoints:
 * - GET ?token=xxx  -> Valida o token e retorna informações do usuário
 * - POST { token, newPassword } -> Define a nova senha
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  console.log("=== SET-PASSWORD FUNCTION ===");
  console.log("Method:", req.method);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // GET: Validate token
    if (req.method === "GET") {
      const url = new URL(req.url);
      const token = url.searchParams.get("token");

      if (!token) {
        console.log("❌ No token provided");
        return new Response(
          JSON.stringify({ error: "Token não fornecido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Validating token...");

      const tokenHash = await hashToken(token);

      // Find token in database using hashed value
      const { data: tokenData, error: tokenError } = await supabase
        .from("password_tokens")
        .select("*")
        .eq("token_hash", tokenHash)
        .single();

      if (tokenError || !tokenData) {
        console.log("❌ Token not found:", tokenError?.message);
        return new Response(
          JSON.stringify({ error: "Link inválido ou não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if token is expired
      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);
      if (now > expiresAt) {
        console.log("❌ Token expired at:", tokenData.expires_at);
        return new Response(
          JSON.stringify({ error: "Este link expirou. Solicite um novo." }),
          { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if token was already used
      if (tokenData.used_at) {
        console.log("❌ Token already used at:", tokenData.used_at);
        return new Response(
          JSON.stringify({ error: "Este link já foi utilizado." }),
          { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user email
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(tokenData.user_id);

      if (userError || !userData?.user) {
        console.log("❌ User not found:", userError?.message);
        return new Response(
          JSON.stringify({ error: "Usuário não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("✅ Token valid for user:", userData.user.email);

      return new Response(
        JSON.stringify({
          valid: true,
          email: userData.user.email,
          type: tokenData.type,
          userId: tokenData.user_id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST: Set new password
    if (req.method === "POST") {
      const { token, newPassword } = await req.json();

      if (!token || !newPassword) {
        console.log("❌ Missing token or password");
        return new Response(
          JSON.stringify({ error: "Token e senha são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate password
      if (newPassword.length < 8) {
        console.log("❌ Password too short");
        return new Response(
          JSON.stringify({ error: "Senha deve ter no mínimo 8 caracteres" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (newPassword.length > 128) {
        console.log("❌ Password too long");
        return new Response(
          JSON.stringify({ error: "Senha deve ter no máximo 128 caracteres" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Setting password...");

      // Resolve and validate token via SECURITY DEFINER function (marks as used)
      // Try "set_password" type first (new tokens), fallback to "signup" for legacy tokens
      let consumedUserId: string | null = null;
      let consumeError: any = null;
      
      // Try set_password type first (current token type)
      const { data: result1, error: error1 } = await supabase.rpc(
        "consume_password_token",
        {
          p_token: token,
          p_type: "set_password",
        },
      );
      
      if (!error1 && result1) {
        consumedUserId = result1 as string;
      } else {
        // Fallback to signup type for legacy tokens
        const { data: result2, error: error2 } = await supabase.rpc(
          "consume_password_token",
          {
            p_token: token,
            p_type: "signup",
          },
        );
        
        if (!error2 && result2) {
          consumedUserId = result2 as string;
        } else {
          // Try reset type as well
          const { data: result3, error: error3 } = await supabase.rpc(
            "consume_password_token",
            {
              p_token: token,
              p_type: "reset",
            },
          );
          
          if (!error3 && result3) {
            consumedUserId = result3 as string;
          } else {
            consumeError = error1 || error2 || error3;
          }
        }
      }

      if (consumeError || !consumedUserId) {
        console.log("❌ Invalid or expired token via consume_password_token:", consumeError?.message);
        return new Response(
          JSON.stringify({ error: "Link inválido ou expirado" }),
          { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = consumedUserId as string;

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (updateError) {
        console.error("❌ Error updating password:", updateError);
        return new Response(
          JSON.stringify({ error: "Não foi possível definir a senha. Tente novamente." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Token was already marked as used by consume_password_token; no additional update needed

      // Get user email for response
      const { data: userData } = await supabase.auth.admin.getUserById(userId);

      console.log("✅ Password set successfully for user:", userData?.user?.email);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Senha definida com sucesso!",
          email: userData?.user?.email,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Method not allowed
    return new Response(
      JSON.stringify({ error: "Método não permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Unexpected error:", error?.message || String(error));
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
