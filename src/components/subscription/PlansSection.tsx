import { PlanCard } from "./PlanCard";
import { PLANS_LIST } from "@/config/plans";

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
        {PLANS_LIST.map((plan) => {
          const isCurrentPlan = currentInterval === plan.billingInterval && isActive;

          return (
            <PlanCard
              key={plan.id}
              name={plan.displayName}
              price={plan.priceLabel}
              period=""
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
