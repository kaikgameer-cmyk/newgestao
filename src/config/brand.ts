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
      price: "R$ 29,90 / mês",
      duration: "1 mês",
    },
    QUARTERLY: {
      name: "New Gestão - Trimestral", 
      displayName: "Trimestral",
      price: "R$ 79,90 / trimestre",
      duration: "3 meses",
    },
    YEARLY: {
      name: "New Gestão - Anual",
      displayName: "Anual", 
      price: "R$ 199,00 / ano",
      duration: "12 meses",
    },
  },
} as const;

export type BrandConfig = typeof BRAND;
