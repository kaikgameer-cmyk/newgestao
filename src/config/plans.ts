/**
 * Configuração de planos do New Gestão
 * 
 * NOTA: Sistema preparado para múltiplos planos no futuro.
 * Atualmente, apenas o plano único (FULL) está ativo.
 * Os planos legados (monthly, quarterly, yearly) foram mantidos
 * para compatibilidade com assinaturas existentes.
 */

export type PlanId = "full" | "monthly" | "quarterly" | "yearly";
export type BillingInterval = "month" | "quarter" | "year";

export interface Plan {
  id: PlanId;
  name: string;
  displayName: string;
  priceLabel: string;
  checkoutUrl: string;
  highlight: boolean;
  popular: boolean;
  bestValue: boolean;
  billingInterval: BillingInterval;
  subtitle: string;
  features: string[];
  isActive: boolean; // Flag para controlar exibição
}

// Plano único oficial (FONTE DE VERDADE)
export const SINGLE_PLAN: Plan = {
  id: "full",
  name: "Plano Full New Gestão",
  displayName: "Acesso Completo",
  priceLabel: "R$ 19,90/mês",
  checkoutUrl: "https://pay.kiwify.com.br/8N9LRSz",
  highlight: true,
  popular: false,
  bestValue: false,
  billingInterval: "month",
  subtitle: "Assinatura mensal com acesso total à plataforma",
  features: [
    "Dashboard completo",
    "Lançamentos ilimitados",
    "Controle de combustível e manutenção",
    "Timer de trabalho inteligente",
    "Relatórios financeiros",
    "Suporte integrado",
    "Atualizações contínuas",
  ],
  isActive: true,
};

// Planos legados (mantidos para compatibilidade com assinaturas existentes)
// Sistema preparado para múltiplos planos no futuro
export const PLANS: Record<PlanId, Plan> = {
  full: SINGLE_PLAN,
  monthly: {
    id: "monthly",
    name: "New Gestão - Mensal",
    displayName: "Mensal",
    priceLabel: "R$ 19,90/mês",
    checkoutUrl: "https://pay.kiwify.com.br/8N9LRSz",
    highlight: false,
    popular: false,
    bestValue: false,
    billingInterval: "month",
    subtitle: "Acesso mensal",
    features: SINGLE_PLAN.features,
    isActive: false, // Desativado na UI
  },
  quarterly: {
    id: "quarterly",
    name: "New Gestão - Trimestral",
    displayName: "Trimestral",
    priceLabel: "R$ 89,70 / trimestre",
    checkoutUrl: "https://pay.kiwify.com.br/BbhpYl4",
    highlight: true,
    popular: true,
    bestValue: false,
    billingInterval: "quarter",
    subtitle: "3x de R$ 32,01",
    features: SINGLE_PLAN.features,
    isActive: false, // Desativado na UI
  },
  yearly: {
    id: "yearly",
    name: "New Gestão - Anual",
    displayName: "Anual",
    priceLabel: "R$ 297,90 / ano",
    checkoutUrl: "https://pay.kiwify.com.br/YY05uru",
    highlight: false,
    popular: false,
    bestValue: true,
    billingInterval: "year",
    subtitle: "12x de R$ 30,81",
    features: SINGLE_PLAN.features,
    isActive: false, // Desativado na UI
  },
} as const;

// Lista apenas planos ativos para exibição
export const PLANS_LIST = Object.values(PLANS).filter(plan => plan.isActive);

// Map billing_interval from database to plan
export function getPlanByInterval(interval: BillingInterval | string): Plan {
  switch (interval) {
    case "month":
      return SINGLE_PLAN;
    case "quarter":
      return PLANS.quarterly;
    case "year":
      return PLANS.yearly;
    default:
      return SINGLE_PLAN;
  }
}

// Get plan display name for UI
export function getPlanDisplayName(interval: BillingInterval | string): string {
  return getPlanByInterval(interval).name;
}

// Legacy exports for backwards compatibility
export const KIWIFY_CHECKOUT_MENSAL = SINGLE_PLAN.checkoutUrl;
export const KIWIFY_CHECKOUT_TRIMESTRAL = PLANS.quarterly.checkoutUrl;
export const KIWIFY_CHECKOUT_ANUAL = PLANS.yearly.checkoutUrl;

// Link oficial do plano único
export const KIWIFY_CHECKOUT_URL = SINGLE_PLAN.checkoutUrl;
