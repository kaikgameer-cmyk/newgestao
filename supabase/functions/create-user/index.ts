import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser }, error: authError } = await anonClient.auth.getUser();
    if (authError || !callerUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if caller is admin
    const { data: isAdmin } = await anonClient.rpc("has_role", {
      _user_id: callerUser.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { email, password, name, city, sendWelcomeEmail = true } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client to create user
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Create auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profile with city if provided
    if (city && newUser.user) {
      await supabaseAdmin
        .from("profiles")
        .update({ city })
        .eq("user_id", newUser.user.id);
    }

    // Send welcome email with credentials
    if (sendWelcomeEmail && newUser.user && resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        const emailResponse = await resend.emails.send({
          from: "Driver Control <onboarding@resend.dev>",
          to: [email],
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
                  Sua conta foi criada com sucesso! Agora você pode acessar o Driver Control e começar a gerenciar suas finanças como motorista de aplicativo.
                </p>
                
                <div style="background-color: #262626; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                  <h3 style="color: #facc15; margin: 0 0 16px 0; font-size: 16px;">📧 Suas credenciais de acesso:</h3>
                  <p style="margin: 8px 0; color: #ffffff;"><strong>Email:</strong> ${email}</p>
                  <p style="margin: 8px 0; color: #ffffff;"><strong>Senha:</strong> ${password}</p>
                </div>
                
                <div style="text-align: center; margin: 32px 0;">
                  <a href="https://drivercontrol.com.br/login" style="display: inline-block; background-color: #facc15; color: #0a0a0a; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Acessar o Painel
                  </a>
                </div>
                
                <p style="color: #a1a1a1; line-height: 1.6; font-size: 14px;">
                  <strong>Importante:</strong> Recomendamos que você altere sua senha após o primeiro acesso para maior segurança.
                </p>
                
                <hr style="border: none; border-top: 1px solid #333; margin: 32px 0;">
                
                <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">
                  © ${new Date().getFullYear()} Driver Control. Todos os direitos reservados.<br>
                  <a href="https://drivercontrol.com.br" style="color: #facc15; text-decoration: none;">drivercontrol.com.br</a>
                </p>
              </div>
            </body>
            </html>
          `,
        });
        console.log("Welcome email sent:", emailResponse);
      } catch (emailError) {
        console.error("Error sending welcome email:", emailError);
        // Don't fail the request if email fails, user was created successfully
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
