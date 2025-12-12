import { PlanCard } from "./PlanCard";
import { 
  KIWIFY_CHECKOUT_MENSAL, 
  KIWIFY_CHECKOUT_TRIMESTRAL, 
  KIWIFY_CHECKOUT_ANUAL 
} from "@/hooks/useSubscription";

interface Plan {
  name: string;
  interval: "month" | "quarter" | "year";
  price: string;
  period: string;
  equivalent?: string;
  checkoutUrl: string;
  popular?: boolean;
  bestValue?: boolean;
}

const plans: Plan[] = [
  {
    name: "Mensal",
    interval: "month",
    price: "R$ 14,90",
    period: "/mês",
    checkoutUrl: KIWIFY_CHECKOUT_MENSAL,
  },
  {
    name: "3 Meses",
    interval: "quarter",
    price: "R$ 37,90",
    period: "/trimestre",
    checkoutUrl: KIWIFY_CHECKOUT_TRIMESTRAL,
    popular: true,
  },
  {
    name: "Anual",
    interval: "year",
    price: "R$ 97,00",
    period: "/ano",
    equivalent: "R$ 8,08/mês",
    checkoutUrl: KIWIFY_CHECKOUT_ANUAL,
    bestValue: true,
  },
];

interface PlansSectionProps {
  currentInterval?: string;
  isActive: boolean;
  hasSubscription: boolean;
}

export function PlansSection({ currentInterval, isActive, hasSubscription }: PlansSectionProps) {
  const handleSelectPlan = (checkoutUrl: string) => {
    window.open(checkoutUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">
          {hasSubscription && isActive ? "Alterar Plano" : "Escolha seu Plano"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Todos os planos incluem acesso completo ao Driver Control
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 pt-4">
        {plans.map((plan) => {
          const isCurrentPlan = currentInterval === plan.interval && isActive;

          return (
            <PlanCard
              key={plan.name}
              name={plan.name}
              price={plan.price}
              period={plan.period}
              equivalent={plan.equivalent}
              isCurrentPlan={isCurrentPlan}
              isPopular={plan.popular}
              isBestValue={plan.bestValue}
              hasSubscription={hasSubscription}
              onSelect={() => handleSelectPlan(plan.checkoutUrl)}
            />
          );
        })}
      </div>
    </div>
  );
}
