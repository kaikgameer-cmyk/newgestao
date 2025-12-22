import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendAppEmail({ to, subject, html }: SendEmailParams) {
  const isTestMode = Deno.env.get("RESEND_TEST_MODE") === "true";
  const replyTo = Deno.env.get("RESEND_REPLY_TO_EMAIL") || undefined;
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");

  console.log("[EMAIL] Configuration check:");
  console.log("  - RESEND_API_KEY:", Deno.env.get("RESEND_API_KEY") ? "configured (length: " + Deno.env.get("RESEND_API_KEY")!.length + ")" : "NOT SET");
  console.log("  - RESEND_FROM_EMAIL:", fromEmail || "NOT SET");
  console.log("  - RESEND_REPLY_TO_EMAIL:", replyTo || "NOT SET");
  console.log("  - RESEND_TEST_MODE:", isTestMode);

  if (!fromEmail) {
    console.error("[EMAIL] RESEND_FROM_EMAIL não configurado");
    throw new Error("RESEND_FROM_EMAIL is required");
  }

  // Validate fromEmail format - must be just an email, not "Name <email>"
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(fromEmail)) {
    console.error("[EMAIL] RESEND_FROM_EMAIL formato inválido:", fromEmail);
    console.error("[EMAIL] Deve conter apenas o email (ex: suporte@newgestao.app), não 'Nome <email>'");
    throw new Error(`RESEND_FROM_EMAIL must be a valid email address, got: ${fromEmail}`);
  }

  // Validate to email
  if (!to || !emailRegex.test(to)) {
    console.error("[EMAIL] Email destinatário inválido:", to);
    throw new Error(`Invalid recipient email: ${to}`);
  }

  // Em modo de teste, envia sempre para o reply-to (email de controle)
  const finalTo = isTestMode && replyTo ? replyTo : to;

  // Build the from field properly
  const fromField = `New Gestão Suporte <${fromEmail}>`;

  console.log("[EMAIL] Sending email:");
  console.log("  - From (constructed):", fromField);
  console.log("  - To (final):", finalTo);
  console.log("  - To (original):", to);
  console.log("  - Subject:", subject);
  console.log("  - Test Mode:", isTestMode);
  console.log("  - Reply-To:", replyTo);

  try {
    const result = await resend.emails.send({
      from: fromField,
      to: [finalTo],
      subject,
      html,
      reply_to: replyTo,
    });

    // Check for Resend API errors in the response
    const resendResult = result as any;
    if (resendResult?.error) {
      console.error("[EMAIL] Resend API error:", JSON.stringify(resendResult.error));
      throw new Error(`Resend API error: ${resendResult.error.message || JSON.stringify(resendResult.error)}`);
    }

    console.log("[EMAIL] Sent successfully!");
    console.log("  - Resend ID:", resendResult?.data?.id || resendResult?.id || "unknown");
    console.log("  - To:", finalTo);
    console.log("  - Subject:", subject);

    return result;
  } catch (error: any) {
    console.error("[EMAIL] Failed to send:");
    console.error("  - Error name:", error?.name || "Unknown");
    console.error("  - Error message:", error?.message || String(error));
    console.error("  - To:", finalTo);
    console.error("  - Subject:", subject);
    throw error;
  }
}

export function getAppBaseUrl(): string {
  return Deno.env.get("APP_BASE_URL") || "https://newgestao.app";
}
