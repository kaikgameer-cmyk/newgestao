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
    priceLabel: "R$ 39,90 / mês",
    checkoutUrl: "https://pay.kiwify.com.br/51OuL2D",
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
    priceLabel: "R$ 89,70 / trimestre",
    checkoutUrl: "https://pay.kiwify.com.br/BbhpYl4",
    highlight: true,
    popular: true,
    bestValue: false,
    billingInterval: "quarter",
    subtitle: "3x de R$ 32,01",
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
