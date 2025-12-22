/**
 * Configuração centralizada de branding do sistema
 * Todas as referências de marca devem vir deste arquivo
 */

export const BRAND = {
  // Nome do produto
  APP_NAME: "New Gestão",
  APP_NAME_SHORT: "NewGestao",
  
  // Domínio e URLs
  APP_DOMAIN: "newgestao.app",
  APP_URL: "https://newgestao.app",
  
  // E-mail de suporte
  SUPPORT_EMAIL: "newgestao.contato@outlook.com",
  
  // Paths de assets
  LOGO_PATH: "/logo-ng.png",
  FAVICON_PATH: "/favicon.png",
  
  // Descrições para SEO
  DESCRIPTION: "Controle financeiro simples para motoristas de Uber, 99 e InDrive. Veja quanto entrou, quanto saiu e quanto sobrou no fim da semana.",
  TAGLINE: "Controle financeiro para motoristas de app",
  
  // Planos de assinatura
  PLANS: {
    MONTHLY: {
      name: "New Gestão - Mensal",
      displayName: "Mensal",
      price: "R$ 39,90 / mês",
      duration: "1 mês",
    },
    QUARTERLY: {
      name: "New Gestão - Trimestral", 
      displayName: "Trimestral",
      price: "R$ 89,70 / trimestre",
      duration: "3 meses",
      installments: "3x de R$ 32,01",
    },
    YEARLY: {
      name: "New Gestão - Anual",
      displayName: "Anual", 
      price: "R$ 297,90 / ano",
      duration: "12 meses",
      installments: "12x de R$ 30,81",
    },
  },
} as const;

export type BrandConfig = typeof BRAND;
