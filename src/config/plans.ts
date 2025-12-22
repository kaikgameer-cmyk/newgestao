export type PlanId = "monthly" | "quarterly" | "yearly";
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
}

export const PLANS: Record<PlanId, Plan> = {
  monthly: {
    id: "monthly",
    name: "New Gestão - Mensal",
    displayName: "Mensal",
    priceLabel: "R$ 29,90 / mês",
    checkoutUrl: "https://pay.kiwify.com.br/V3CP89P",
    highlight: false,
    popular: false,
    bestValue: false,
    billingInterval: "month",
    subtitle: "Para quem quer testar",
  },
  quarterly: {
    id: "quarterly",
    name: "New Gestão - Trimestral",
    displayName: "Trimestral",
    priceLabel: "R$ 79,90 / trimestre",
    checkoutUrl: "https://pay.kiwify.com.br/gxYp8mQ",
    highlight: true,
    popular: true,
    bestValue: false,
    billingInterval: "quarter",
    subtitle: "Mais Popular",
  },
  yearly: {
    id: "yearly",
    name: "New Gestão - Anual",
    displayName: "Anual",
    priceLabel: "R$ 199,00 / ano",
    checkoutUrl: "https://pay.kiwify.com.br/17tlyZi",
    highlight: false,
    popular: false,
    bestValue: true,
    billingInterval: "year",
    subtitle: "Melhor custo-benefício",
  },
} as const;

export const PLANS_LIST = Object.values(PLANS);

// Map billing_interval from database to plan
export function getPlanByInterval(interval: BillingInterval | string): Plan {
  switch (interval) {
    case "month":
      return PLANS.monthly;
    case "quarter":
      return PLANS.quarterly;
    case "year":
      return PLANS.yearly;
    default:
      return PLANS.monthly;
  }
}

// Get plan display name for UI
export function getPlanDisplayName(interval: BillingInterval | string): string {
  return getPlanByInterval(interval).name;
}

// Legacy exports for backwards compatibility
export const KIWIFY_CHECKOUT_MENSAL = PLANS.monthly.checkoutUrl;
export const KIWIFY_CHECKOUT_TRIMESTRAL = PLANS.quarterly.checkoutUrl;
export const KIWIFY_CHECKOUT_ANUAL = PLANS.yearly.checkoutUrl;
