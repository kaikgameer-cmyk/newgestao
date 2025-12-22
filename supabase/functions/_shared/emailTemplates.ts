/**
 * Email Templates - New Gestão
 * 
 * Template único profissional para todos os emails do sistema.
 * Cores: dark theme (#0B1220) com amarelo (#FFC700)
 */

export const BRAND = {
  appName: "New Gestão",
  appUrl: "https://newgestao.app",
  supportEmail: "newgestao.contato@outlook.com",
  primary: "#FFC700",
  bg: "#0B1220",
  card: "#101B2E",
  text: "#EAF0FA",
  muted: "#A9B6CC",
  border: "rgba(255,255,255,0.10)",
  logoUrl: "https://newgestao.app/brand/ng-email.png",
};

type DetailRow = { label: string; value: string };

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function hiddenPreheader(text: string): string {
  const t = escapeHtml(text || "");
  return `
  <div style="display:none;font-size:1px;color:#0B1220;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${t}
  </div>
  <div style="display:none;max-height:0px;overflow:hidden;">
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
`;
}

function renderDetails(rows?: DetailRow[]): string {
  if (!rows?.length) return "";
  const items = rows
    .map(
      (r) => `
      <tr>
        <td style="padding:8px 0;font-size:14px;color:${BRAND.muted};border-bottom:1px solid ${BRAND.border};">
          ${escapeHtml(r.label)}
        </td>
        <td style="padding:8px 0;font-size:14px;color:${BRAND.text};text-align:right;font-weight:500;border-bottom:1px solid ${BRAND.border};">
          ${escapeHtml(r.value)}
        </td>
      </tr>`
    )
    .join("");

  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;background:${BRAND.card};border-radius:8px;border:1px solid ${BRAND.border};padding:16px;">
    <tbody>
      ${items}
    </tbody>
  </table>
`;
}

interface EmailOptions {
  subject: string;
  preheader?: string;
  title: string;
  greeting?: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  details?: DetailRow[];
  noteHtml?: string;
}

export function renderEmail(options: EmailOptions): { subject: string; html: string } {
  const {
    subject,
    preheader,
    title,
    greeting,
    bodyHtml,
    cta,
    details,
    noteHtml,
  } = options;

  const safeGreeting = greeting ? `<p style="margin:0 0 16px 0;font-size:16px;color:${BRAND.text};">${escapeHtml(greeting)},</p>` : "";
  const safeTitle = escapeHtml(title);

  const button = cta
    ? `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;">
      <tr>
        <td align="center" style="background:${BRAND.primary};border-radius:8px;">
          <a href="${escapeHtml(cta.url)}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:600;color:${BRAND.bg};text-decoration:none;">
            ${escapeHtml(cta.label)}
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 16px 0;font-size:12px;color:${BRAND.muted};text-align:center;">
      Se o botao nao funcionar, copie e cole este link no navegador:<br/>
      <a href="${escapeHtml(cta.url)}" style="color:${BRAND.primary};word-break:break-all;">${escapeHtml(cta.url)}</a>
    </p>
    `
    : "";

  const detailsBlock = renderDetails(details);

  const note = noteHtml
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;">
        <tr>
          <td style="background:#422006;border-left:4px solid #f59e0b;border-radius:8px;padding:12px 16px;">
            <p style="margin:0;font-size:14px;color:#fcd34d;">${noteHtml}</p>
          </td>
        </tr>
      </table>`
    : "";

  const pre = hiddenPreheader(preheader || subject);

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  ${pre}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${BRAND.bg};">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;">
          
          <!-- Header -->
          <tr>
            <td style="padding-bottom:24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <img src="${BRAND.logoUrl}" alt="${BRAND.appName}" width="40" height="40" style="display:inline-block;vertical-align:middle;border-radius:8px;" />
                    <span style="margin-left:12px;font-size:18px;font-weight:600;color:${BRAND.primary};vertical-align:middle;">${BRAND.appName}</span>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="font-size:12px;color:${BRAND.muted};">${escapeHtml(new Date().toLocaleDateString("pt-BR"))}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Card -->
          <tr>
            <td style="background-color:${BRAND.card};border-radius:16px;padding:32px;border:1px solid ${BRAND.border};">
              <h1 style="margin:0 0 24px 0;font-size:24px;font-weight:700;color:${BRAND.text};">
                ${safeTitle}
              </h1>

              ${safeGreeting}

              <div style="font-size:16px;line-height:1.6;color:${BRAND.muted};">
                ${bodyHtml}
              </div>

              ${button}
              ${detailsBlock}
              ${note}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:32px;">
              <p style="margin:0 0 8px 0;font-size:14px;color:${BRAND.muted};">
                Precisa de ajuda? Fale com a gente em
              </p>
              <p style="margin:0 0 16px 0;">
                <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.primary};text-decoration:none;font-size:14px;">
                  ${BRAND.supportEmail}
                </a>
              </p>
              <p style="margin:0;font-size:12px;color:${BRAND.muted};">
                &copy; ${new Date().getFullYear()} ${BRAND.appName}. Todos os direitos reservados.
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

  return { subject, html };
}

// ============================================
// EMAILS PRONTOS
// ============================================

export function emailWelcome(params: { name?: string; setPasswordUrl: string }) {
  return renderEmail({
    subject: "Bem-vindo ao New Gestao - defina sua senha",
    preheader: "Finalize seu acesso definindo sua senha.",
    title: "Sua conta foi criada com sucesso",
    greeting: params.name ? `Ola, ${params.name}` : "Ola",
    bodyHtml: `
      <p style="margin:0 0 16px 0;">
        Para concluir seu acesso, defina sua senha clicando no botao abaixo.
      </p>
      <p style="margin:0 0 16px 0;">
        Depois disso, voce ja podera entrar no painel sempre que quiser.
      </p>
    `,
    cta: { label: "Definir minha senha", url: params.setPasswordUrl },
    noteHtml: `<strong>Importante:</strong> este link expira em 24 horas.`,
  });
}

export function emailPasswordReset(params: { name?: string; resetUrl: string }) {
  return renderEmail({
    subject: "Redefinicao de senha - New Gestao",
    preheader: "Use este link para redefinir sua senha.",
    title: "Solicitacao de redefinicao de senha",
    greeting: params.name ? `Ola, ${params.name}` : "Ola",
    bodyHtml: `
      <p style="margin:0 0 16px 0;">
        Recebemos uma solicitacao para redefinir sua senha.
      </p>
      <p style="margin:0 0 16px 0;">
        Se foi voce, clique no botao abaixo. Se nao foi voce, ignore este email.
      </p>
    `,
    cta: { label: "Redefinir senha", url: params.resetUrl },
    noteHtml: `<strong>Importante:</strong> este link expira em 24 horas.`,
  });
}

export function emailPurchaseApproved(params: {
  name?: string;
  setPasswordUrl: string;
  planName: string;
  orderId: string;
  purchasedAt: string;
  validUntil?: string;
  buyerEmail: string;
}) {
  const details: DetailRow[] = [
    { label: "Plano", value: params.planName },
    { label: "Pedido", value: params.orderId },
    { label: "Data", value: params.purchasedAt },
  ];
  
  if (params.validUntil) {
    details.push({ label: "Valido ate", value: params.validUntil });
  }
  
  details.push({ label: "E-mail", value: params.buyerEmail });

  return renderEmail({
    subject: "Compra aprovada - seu acesso ao New Gestao esta pronto",
    preheader: "Clique para definir sua senha e ativar seu acesso.",
    title: "Acesso liberado",
    greeting: params.name ? `Ola, ${params.name}` : "Ola",
    bodyHtml: `
      <p style="margin:0 0 16px 0;">
        Sua compra foi aprovada com sucesso. Para ativar seu acesso, defina sua senha.
      </p>
    `,
    cta: { label: "Definir minha senha", url: params.setPasswordUrl },
    details,
    noteHtml: `<strong>Importante:</strong> este link expira em 24 horas.`,
  });
}

export function emailSubscriptionRenewed(params: { name?: string; planName: string; validUntil: string }) {
  return renderEmail({
    subject: "Assinatura renovada - New Gestao",
    preheader: "Sua assinatura foi renovada com sucesso.",
    title: "Assinatura renovada",
    greeting: params.name ? `Ola, ${params.name}` : "Ola",
    bodyHtml: `
      <p style="margin:0 0 16px 0;">
        Sua assinatura foi renovada com sucesso.
      </p>
      <p style="margin:0 0 16px 0;">
        Voce continua com acesso completo a plataforma.
      </p>
    `,
    details: [
      { label: "Plano", value: params.planName },
      { label: "Valido ate", value: params.validUntil },
    ],
    cta: { label: "Acessar plataforma", url: `${BRAND.appUrl}/login` },
  });
}

export function emailTest() {
  return renderEmail({
    subject: "Email de Teste - New Gestao",
    preheader: "Verificando configuracao de email.",
    title: "Email de Teste",
    bodyHtml: `
      <p style="margin:0 0 16px 0;">
        Se voce esta vendo este email, a configuracao do Resend esta funcionando corretamente.
      </p>
      <p style="margin:0 0 16px 0;">
        <strong style="color:${BRAND.text};">From:</strong> New Gestao &lt;no-reply@newgestao.app&gt;<br/>
        <strong style="color:${BRAND.text};">Reply-To:</strong> ${BRAND.supportEmail}<br/>
        <strong style="color:${BRAND.text};">App URL:</strong> ${BRAND.appUrl}
      </p>
      <p style="margin:0;font-size:14px;color:${BRAND.muted};">
        Enviado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
      </p>
    `,
    cta: { label: "Acessar plataforma", url: BRAND.appUrl },
  });
}
