import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendAppEmail, getWelcomeEmailHtml, validateNoLovableUrl } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// CRITICAL: Hard-coded production URL - NEVER use lovable.app
const PROD_APP_URL = "https://newgestao.app";

// Email validation regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Input validation for user creation
 * Defense-in-depth: validate all inputs before processing
 */
function validateInput(data: Record<string, unknown>): { valid: boolean; error?: string; sanitized?: Record<string, unknown> } {
  // Validate email (required)
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
  
  // Validate password (required)
  if (!data.password || typeof data.password !== 'string') {
    return { valid: false, error: 'Senha é obrigatória' };
  }
  if (data.password.length < 8) {
    return { valid: false, error: 'Senha deve ter no mínimo 8 caracteres' };
  }
  if (data.password.length > 128) {
    return { valid: false, error: 'Senha deve ter no máximo 128 caracteres' };
  }
  
  // Validate name (optional)
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
  
  // Validate city (optional)
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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const hasResendKey = !!Deno.env.get("RESEND_API_KEY");

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("No authorization header provided");
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract the token from the header
    const token = authHeader.replace("Bearer ", "");
    console.log("Auth token received, validating...");

    // Use service role client to get user from token (more reliable)
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

    // Check if caller is admin
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

    // Parse and validate request body
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

    // Create auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      
      // Handle specific error cases with clear codes
      let errorCode = "CREATE_USER_ERROR";
      let statusCode = 400;
      let userMessage = createError.message;
      
      if (createError.message?.includes("already been registered") || 
          createError.code === "email_exists" ||
          createError.message?.includes("email_exists")) {
        errorCode = "EMAIL_ALREADY_EXISTS";
        statusCode = 409; // Conflict
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

    // Handle profile creation/update
    if (newUser.user) {
      const userId = newUser.user.id;
      
      // Wait for the trigger to potentially create the profile
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Try to update the profile first
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ 
          name: name || null,
          city: city || null,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId);

      // If update failed (profile doesn't exist), create it
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
      
      // Verify the profile exists
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

    // Send welcome email with password reset link using centralized email module
    if (sendWelcomeEmail && newUser.user && hasResendKey) {
      try {
        // ALWAYS use production URL for redirects - MUST be /definir-senha, NOT /login
        const redirectUrl = `${PROD_APP_URL}/definir-senha`;
        
        console.log("[CREATE-USER] Generating password reset link");
        console.log("  - redirectTo:", redirectUrl);
        
        const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: email,
          options: {
            redirectTo: redirectUrl,
          },
        });

        if (resetError) {
          console.error("Error generating password reset link:", resetError);
          throw resetError;
        }

        let resetLink = resetData?.properties?.action_link || '';
        
        // CRITICAL: Validate the generated link does NOT contain lovable.app
        // If it does, we need to replace it with production URL
        if (resetLink.includes("lovable.app") || resetLink.includes("lovableproject.com")) {
          console.warn("[CREATE-USER] Generated link contains lovable.app - replacing with production URL");
          // Replace any lovable.app redirect_to with production URL
          const url = new URL(resetLink);
          const redirectTo = url.searchParams.get("redirect_to");
          if (redirectTo) {
            url.searchParams.set("redirect_to", `${PROD_APP_URL}/definir-senha`);
            resetLink = url.toString();
          }
        }
        
        // Final validation - block if still contains lovable.app
        validateNoLovableUrl(resetLink, "resetLink");
        
        console.log("[CREATE-USER] Password reset link generated - AUDIT LOG:");
        console.log("  - computedRedirectTo:", redirectUrl);
        console.log("  - finalVerifyUrl:", resetLink.substring(0, 100) + "...");

        // Use centralized email template
        await sendAppEmail({
          to: email,
          subject: "Bem-vindo ao New Gestão! 🚗",
          html: getWelcomeEmailHtml(name || "Motorista", resetLink),
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
