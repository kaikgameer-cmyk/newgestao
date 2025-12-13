import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Extract the token from the header
    const token = authHeader.replace("Bearer ", "");
    console.log("Auth token received, validating...");

    // Use service role client to get user from token (more reliable)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !callerUser) {
      console.log("Auth error:", authError?.message || "User not found");
      return new Response(JSON.stringify({ error: "Unauthorized", details: authError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      
      return new Response(JSON.stringify({ 
        ok: false,
        error: userMessage, 
        code: errorCode,
        details: createError.message
      }), {
        status: statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    // Send welcome email with password reset link (no plain text password)
    if (sendWelcomeEmail && newUser.user && resendApiKey) {
      try {
        const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: email,
          options: {
            redirectTo: 'https://drivercontrol1.lovable.app/login',
          },
        });

        if (resetError) {
          console.error("Error generating password reset link:", resetError);
          throw resetError;
        }

        const resetLink = resetData?.properties?.action_link || '';
        console.log("Generated password reset link for user");

        const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Driver Control <kaikgivaldodias@gmail.com>";
        const isTestMode = Deno.env.get("RESEND_TEST_MODE") === "true";
        const testEmail = "kaikgivaldodias@gmail.com";
        const recipientEmail = isTestMode ? testEmail : email;

        const resend = new Resend(resendApiKey);
        const emailResponse = await resend.emails.send({
          from: resendFromEmail,
          to: [recipientEmail],
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
                
                <h2 style="color: #ffffff; margin-bottom: 24px;">Olá${name ? `, ${name}` : ''}!</h2>
                
                <p style="color: #a1a1a1; line-height: 1.6; margin-bottom: 24px;">
                  Sua conta foi criada com sucesso! Clique no botão abaixo para definir sua senha e começar a gerenciar suas finanças como motorista de aplicativo.
                </p>
                
                <div style="background-color: #262626; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                  <h3 style="color: #facc15; margin: 0 0 16px 0; font-size: 16px;">📧 Seu email de acesso:</h3>
                  <p style="margin: 8px 0; color: #ffffff;"><strong>Email:</strong> ${email}</p>
                </div>
                
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${resetLink}" style="display: inline-block; background-color: #facc15; color: #0a0a0a; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Definir Minha Senha
                  </a>
                </div>
                
                <p style="color: #a1a1a1; line-height: 1.6; font-size: 14px;">
                  <strong>Importante:</strong> Este link expira em 24 horas. Se você não solicitou esta conta, ignore este email.
                </p>
                
                <hr style="border: none; border-top: 1px solid #333; margin: 32px 0;">
                
                <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">
                  © ${new Date().getFullYear()} Driver Control. Todos os direitos reservados.<br>
                  <a href="https://drivercontrol1.lovable.app" style="color: #facc15; text-decoration: none;">drivercontrol1.lovable.app</a>
                </p>
              </div>
            </body>
            </html>
          `,
        });
        console.log("Welcome email sent:", emailResponse);
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
