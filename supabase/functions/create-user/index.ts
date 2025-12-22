import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { emailWelcome, BRAND } from "../_shared/emailTemplates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// CRITICAL: Hard-coded production URL - NEVER use lovable.app
const PROD_APP_URL = "https://newgestao.app";

// Email validation regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

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

/**
 * Input validation for user creation
 */
function validateInput(data: Record<string, unknown>): { valid: boolean; error?: string; sanitized?: Record<string, unknown> } {
  if (!data.email || typeof data.email !== 'string') {
    return { valid: false, error: 'Email é obrigatório' };
  }
  
  const email = data.email.trim().toLowerCase();
  if (email.length === 0) {
    return { valid: false, error: 'Email é obrigatório' };
  }
  if (email.length > 255) {
    return { valid: false, error: 'Email deve ter no máximo 255 caracteres' };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, error: 'Formato de email inválido' };
  }
  
  if (!data.password || typeof data.password !== 'string') {
    return { valid: false, error: 'Senha é obrigatória' };
  }
  if (data.password.length < 8) {
    return { valid: false, error: 'Senha deve ter no mínimo 8 caracteres' };
  }
  if (data.password.length > 128) {
    return { valid: false, error: 'Senha deve ter no máximo 128 caracteres' };
  }
  
  let name: string | null = null;
  if (data.name !== undefined && data.name !== null && data.name !== '') {
    if (typeof data.name !== 'string') {
      return { valid: false, error: 'Nome deve ser uma string' };
    }
    name = data.name.trim();
    if (name.length > 100) {
      return { valid: false, error: 'Nome deve ter no máximo 100 caracteres' };
    }
  }
  
  let city: string | null = null;
  if (data.city !== undefined && data.city !== null && data.city !== '') {
    if (typeof data.city !== 'string') {
      return { valid: false, error: 'Cidade deve ser uma string' };
    }
    city = data.city.trim();
    if (city.length > 100) {
      return { valid: false, error: 'Cidade deve ter no máximo 100 caracteres' };
    }
  }
  
  return {
    valid: true,
    sanitized: {
      email,
      password: data.password,
      name,
      city,
      sendWelcomeEmail: data.sendWelcomeEmail !== false,
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("No authorization header provided");
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("Auth token received, validating...");

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !callerUser) {
      console.log("Auth error:", authError?.message || "User not found");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    
    console.log("User authenticated:", callerUser.id);

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: callerUser.id,
      _role: "admin",
    });

    if (!isAdmin) {
      console.log("User is not an admin:", callerUser.id);
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawData = await req.json();
    const validation = validateInput(rawData);
    
    if (!validation.valid) {
      console.log("Input validation failed:", validation.error);
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, name, city, sendWelcomeEmail } = validation.sanitized as {
      email: string;
      password: string;
      name: string | null;
      city: string | null;
      sendWelcomeEmail: boolean;
    };

    console.log("Creating user with validated input:", { email, name, city });

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      
      let errorCode = "CREATE_USER_ERROR";
      let statusCode = 400;
      let userMessage = createError.message;
      
      if (createError.message?.includes("already been registered") || 
          createError.code === "email_exists" ||
          createError.message?.includes("email_exists")) {
        errorCode = "EMAIL_ALREADY_EXISTS";
        statusCode = 409;
        userMessage = "Já existe um usuário cadastrado com este e-mail.";
      }
      
      return new Response(
        JSON.stringify({ 
          ok: false,
          error: userMessage, 
          code: errorCode,
        }),
        {
          status: statusCode,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (newUser.user) {
      const userId = newUser.user.id;
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ 
          name: name || null,
          city: city || null,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId);

      if (updateError) {
        console.log("Profile update failed, attempting insert:", updateError.message);
        
        const { error: insertError } = await supabaseAdmin
          .from("profiles")
          .insert({ 
            user_id: userId,
            name: name || null,
            city: city || null
          });
          
        if (insertError) {
          console.error("Error creating profile:", insertError);
        } else {
          console.log("Profile created successfully via insert");
        }
      } else {
        console.log("Profile updated successfully");
      }
      
      const { data: profileCheck, error: checkError } = await supabaseAdmin
        .from("profiles")
        .select("id, name, city")
        .eq("user_id", userId)
        .maybeSingle();
        
      if (checkError) {
        console.error("Error checking profile:", checkError);
      } else if (profileCheck) {
        console.log("Profile verified:", profileCheck);
      } else {
        console.warn("Profile not found after creation attempts, creating now...");
        await supabaseAdmin
          .from("profiles")
          .insert({ 
            user_id: userId,
            name: name || null,
            city: city || null
          });
      }
    }

    // Send welcome email with SET PASSWORD link
    if (sendWelcomeEmail && newUser.user && resendApiKey) {
      try {
        const rawToken = crypto.randomUUID() + "-" + crypto.randomUUID();

        const encoder = new TextEncoder();
        const data = encoder.encode(rawToken);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const tokenHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const { error: tokenError } = await supabaseAdmin
          .from("password_tokens")
          .insert({
            user_id: newUser.user.id,
            token_hash: tokenHash,
            token_preview: rawToken.substring(0, 8),
            type: "set_password",
            expires_at: expiresAt.toISOString(),
          });

        if (tokenError) {
          console.error("[CREATE-USER] Error storing password token:", tokenError);
          throw new Error("Erro ao gerar link de acesso");
        }

        const finalVerifyUrl = `${PROD_APP_URL}/definir-senha?token=${encodeURIComponent(rawToken)}`;

        validateNoLovableUrl(finalVerifyUrl, "finalVerifyUrl");

        console.log("[CREATE-USER] Welcome email link - AUDIT LOG:");
        console.log("  - finalVerifyUrl:", finalVerifyUrl);

        const { subject, html } = emailWelcome({
          name: name || "Motorista",
          setPasswordUrl: finalVerifyUrl,
        });

        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: `${BRAND.appName} <no-reply@newgestao.app>`,
          to: [email],
          reply_to: BRAND.supportEmail,
          subject,
          html,
        });

        console.log("Welcome email sent successfully");
      } catch (emailError) {
        console.error("Error sending welcome email:", emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: newUser.user?.id,
        message: "User created successfully" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
