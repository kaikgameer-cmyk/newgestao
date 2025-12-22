import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// ============================================
// CONFIGURAÇÃO DE EMAIL - NEW GESTÃO
// ============================================
// RESEND_API_KEY: API Key do Resend (NUNCA expor no client)
// RESEND_FROM_EMAIL: Email remetente (ex: no-reply@newgestao.app)
// RESEND_REPLY_TO_EMAIL: Email para respostas (ex: newgestao.contato@outlook.com)
// APP_BASE_URL: URL base do app (ex: https://newgestao.app)
// RESEND_TEST_MODE: Se "true", envia todos emails para RESEND_REPLY_TO_EMAIL
// ============================================

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export interface EmailConfig {
  fromEmail: string;
  fromName: string;
  replyTo: string;
  appUrl: string;
  isTestMode: boolean;
}

/**
 * Obtém a configuração de email a partir das variáveis de ambiente
 */
export function getEmailConfig(): EmailConfig {
  return {
    fromEmail: Deno.env.get("RESEND_FROM_EMAIL") || "no-reply@newgestao.app",
    fromName: "New Gestão",
    replyTo: Deno.env.get("RESEND_REPLY_TO_EMAIL") || "newgestao.contato@outlook.com",
    appUrl: Deno.env.get("APP_BASE_URL") || "https://newgestao.app",
    isTestMode: Deno.env.get("RESEND_TEST_MODE") === "true",
  };
}

/**
 * Envia um email usando Resend com configuração centralizada
 */
export async function sendAppEmail({ to, subject, html }: SendEmailParams) {
  const config = getEmailConfig();

  console.log("[EMAIL] Configuration check:");
  console.log("  - RESEND_API_KEY:", Deno.env.get("RESEND_API_KEY") ? "configured (length: " + Deno.env.get("RESEND_API_KEY")!.length + ")" : "NOT SET");
  console.log("  - RESEND_FROM_EMAIL:", config.fromEmail);
  console.log("  - RESEND_REPLY_TO_EMAIL:", config.replyTo);
  console.log("  - APP_BASE_URL:", config.appUrl);
  console.log("  - RESEND_TEST_MODE:", config.isTestMode);

  // Validate fromEmail format - must be just an email, not "Name <email>"
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(config.fromEmail)) {
    console.error("[EMAIL] RESEND_FROM_EMAIL formato inválido:", config.fromEmail);
    console.error("[EMAIL] Deve conter apenas o email (ex: no-reply@newgestao.app), não 'Nome <email>'");
    throw new Error(`RESEND_FROM_EMAIL must be a valid email address, got: ${config.fromEmail}`);
  }

  // Validate to email
  if (!to || !emailRegex.test(to)) {
    console.error("[EMAIL] Email destinatário inválido:", to);
    throw new Error(`Invalid recipient email: ${to}`);
  }

  // Em modo de teste, envia sempre para o reply-to (email de controle)
  const finalTo = config.isTestMode && config.replyTo ? config.replyTo : to;

  // Build the from field properly
  const fromField = `${config.fromName} <${config.fromEmail}>`;

  console.log("[EMAIL] Sending email:");
  console.log("  - From (constructed):", fromField);
  console.log("  - To (final):", finalTo);
  console.log("  - To (original):", to);
  console.log("  - Subject:", subject);
  console.log("  - Test Mode:", config.isTestMode);
  console.log("  - Reply-To:", config.replyTo);

  try {
    const result = await resend.emails.send({
      from: fromField,
      to: [finalTo],
      subject,
      html,
      reply_to: config.replyTo,
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

/**
 * Retorna a URL base do app
 */
export function getAppBaseUrl(): string {
  return getEmailConfig().appUrl;
}

// ============================================
// TEMPLATES DE EMAIL - NEW GESTÃO
// ============================================

const EMAIL_STYLES = {
  // Cores do tema dark
  bgDark: "#0f172a",
  bgCard: "#1e293b",
  bgCardAlt: "#334155",
  textPrimary: "#f8fafc",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  accent: "#3b82f6",
  accentHover: "#2563eb",
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
  border: "#334155",
};

/**
 * Gera o layout base do email com header e footer
 */
export function getEmailLayout(content: string, options?: { showLogo?: boolean }): string {
  const config = getEmailConfig();
  const showLogo = options?.showLogo ?? true;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Gestão</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${EMAIL_STYLES.bgDark}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${EMAIL_STYLES.bgDark};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px;">
          
          <!-- Header -->
          ${showLogo ? `
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background: linear-gradient(135deg, ${EMAIL_STYLES.accent}, ${EMAIL_STYLES.accentHover}); border-radius: 12px; padding: 16px 24px;">
                    <span style="font-size: 28px; font-weight: bold; color: ${EMAIL_STYLES.textPrimary}; letter-spacing: 2px;">NG</span>
                  </td>
                </tr>
              </table>
              <p style="margin: 16px 0 0 0; font-size: 20px; font-weight: 600; color: ${EMAIL_STYLES.textPrimary};">New Gestão</p>
            </td>
          </tr>
          ` : ''}
          
          <!-- Content Card -->
          <tr>
            <td style="background-color: ${EMAIL_STYLES.bgCard}; border-radius: 16px; padding: 32px; border: 1px solid ${EMAIL_STYLES.border};">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 32px;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: ${EMAIL_STYLES.textMuted};">
                Precisa de ajuda? Entre em contato:
              </p>
              <p style="margin: 0 0 16px 0;">
                <a href="mailto:${config.replyTo}" style="color: ${EMAIL_STYLES.accent}; text-decoration: none; font-size: 14px;">
                  ${config.replyTo}
                </a>
              </p>
              <p style="margin: 0; font-size: 12px; color: ${EMAIL_STYLES.textMuted};">
                © ${new Date().getFullYear()} New Gestão. Todos os direitos reservados.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: ${EMAIL_STYLES.textMuted};">
                <a href="${config.appUrl}" style="color: ${EMAIL_STYLES.textMuted}; text-decoration: none;">
                  ${config.appUrl.replace('https://', '')}
                </a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Gera um botão estilizado para emails
 */
export function getEmailButton(text: string, url: string, variant: 'primary' | 'success' = 'primary'): string {
  const bgColor = variant === 'success' ? EMAIL_STYLES.success : EMAIL_STYLES.accent;
  
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
      <tr>
        <td align="center" style="background: ${bgColor}; border-radius: 8px;">
          <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: ${EMAIL_STYLES.textPrimary}; text-decoration: none;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Gera um card de destaque para emails
 */
export function getEmailHighlightCard(content: string, variant: 'info' | 'success' | 'warning' = 'info'): string {
  const colors = {
    info: { bg: EMAIL_STYLES.bgCardAlt, border: EMAIL_STYLES.accent },
    success: { bg: '#14532d', border: EMAIL_STYLES.success },
    warning: { bg: '#713f12', border: EMAIL_STYLES.warning },
  };
  const { bg, border } = colors[variant];

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 16px 0;">
      <tr>
        <td style="background-color: ${bg}; border-left: 4px solid ${border}; border-radius: 8px; padding: 16px;">
          ${content}
        </td>
      </tr>
    </table>
  `;
}

// ============================================
// EMAILS TRANSACIONAIS ESPECÍFICOS
// ============================================

/**
 * Email de boas-vindas / definição de senha
 */
export function getWelcomeEmailHtml(name: string, setPasswordUrl: string): string {
  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.textPrimary};">
      Bem-vindo ao New Gestão! 🎉
    </h1>
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_STYLES.textSecondary};">
      Olá, <strong style="color: ${EMAIL_STYLES.textPrimary};">${name}</strong>!
    </p>
    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_STYLES.textSecondary};">
      Sua conta foi criada com sucesso. Clique no botão abaixo para definir sua senha e começar a usar a plataforma.
    </p>
    
    ${getEmailButton('Definir Minha Senha', setPasswordUrl, 'success')}
    
    ${getEmailHighlightCard(`
      <p style="margin: 0; font-size: 14px; color: ${EMAIL_STYLES.textSecondary};">
        <strong style="color: ${EMAIL_STYLES.textPrimary};">⏰ Importante:</strong> 
        Este link expira em 24 horas.
      </p>
    `, 'warning')}
    
    <p style="margin: 24px 0 0 0; font-size: 14px; color: ${EMAIL_STYLES.textMuted};">
      Se você não solicitou esta conta, pode ignorar este email com segurança.
    </p>
  `;

  return getEmailLayout(content);
}

/**
 * Email de confirmação de assinatura
 */
export function getSubscriptionEmailHtml(name: string, planName: string, expiresAt: string): string {
  const config = getEmailConfig();
  
  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.textPrimary};">
      Assinatura Confirmada! ✅
    </h1>
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_STYLES.textSecondary};">
      Olá, <strong style="color: ${EMAIL_STYLES.textPrimary};">${name}</strong>!
    </p>
    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_STYLES.textSecondary};">
      Sua assinatura do plano <strong style="color: ${EMAIL_STYLES.success};">${planName}</strong> foi ativada com sucesso.
    </p>
    
    ${getEmailHighlightCard(`
      <p style="margin: 0 0 8px 0; font-size: 14px; color: ${EMAIL_STYLES.textSecondary};">
        <strong style="color: ${EMAIL_STYLES.textPrimary};">📅 Válida até:</strong> ${expiresAt}
      </p>
    `, 'success')}
    
    <p style="margin: 24px 0 0 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_STYLES.textSecondary};">
      Agora você tem acesso completo a todas as funcionalidades da plataforma.
    </p>
    
    ${getEmailButton('Acessar Plataforma', config.appUrl)}
  `;

  return getEmailLayout(content);
}

/**
 * Email de teste (para verificar configuração)
 */
export function getTestEmailHtml(): string {
  const config = getEmailConfig();
  
  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.textPrimary};">
      Email de Teste ✉️
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_STYLES.textSecondary};">
      Se você está vendo este email, a configuração do Resend está funcionando corretamente!
    </p>
    
    ${getEmailHighlightCard(`
      <p style="margin: 0 0 8px 0; font-size: 14px; color: ${EMAIL_STYLES.textSecondary};">
        <strong style="color: ${EMAIL_STYLES.textPrimary};">📧 From:</strong> ${config.fromName} &lt;${config.fromEmail}&gt;
      </p>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: ${EMAIL_STYLES.textSecondary};">
        <strong style="color: ${EMAIL_STYLES.textPrimary};">↩️ Reply-To:</strong> ${config.replyTo}
      </p>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: ${EMAIL_STYLES.textSecondary};">
        <strong style="color: ${EMAIL_STYLES.textPrimary};">🌐 App URL:</strong> ${config.appUrl}
      </p>
      <p style="margin: 0; font-size: 14px; color: ${EMAIL_STYLES.textSecondary};">
        <strong style="color: ${EMAIL_STYLES.textPrimary};">🧪 Test Mode:</strong> ${config.isTestMode ? 'Ativado' : 'Desativado'}
      </p>
    `, 'info')}
    
    <p style="margin: 24px 0 0 0; font-size: 14px; color: ${EMAIL_STYLES.textMuted};">
      Enviado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
    </p>
  `;

  return getEmailLayout(content);
}
