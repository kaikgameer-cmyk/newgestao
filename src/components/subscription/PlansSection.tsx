import { Check, Zap, Sparkles } from "lucide-react";
import { SINGLE_PLAN } from "@/config/plans";

/**
 * Seção de planos - Plano único
 * 
 * NOTA: Sistema preparado para múltiplos planos no futuro.
 * Atualmente exibe apenas o plano único com acesso total.
 */

interface PlansSectionProps {
  currentInterval?: string;
  isActive: boolean;
  hasSubscription: boolean;
}

export function PlansSection({ isActive, hasSubscription }: PlansSectionProps) {
  const handleSubscribe = () => {
    window.open(SINGLE_PLAN.checkoutUrl, "_blank");
  };

  // Se já tem assinatura ativa, não mostrar a seção de planos
  if (hasSubscription && isActive) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">
          {hasSubscription ? "Reativar Assinatura" : "Assine o New Gestão"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Acesso completo a todas as funcionalidades
        </p>
      </div>

      {/* Single Plan Card */}
      <div className="max-w-md mx-auto">
        <div className="relative flex flex-col rounded-2xl p-6 bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300">
          {/* Badge */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground shadow-md">
              <Sparkles className="w-3 h-3" />
              Acesso Total
            </span>
          </div>

          {/* Plan name */}
          <h3 className="text-lg font-semibold text-foreground text-center mt-2">
            {SINGLE_PLAN.displayName}
          </h3>

          {/* Price - Prominent */}
          <div className="flex items-center justify-center mt-4 mb-4">
            <span className="text-2xl font-bold text-primary tracking-tight">
              {SINGLE_PLAN.priceLabel}
            </span>
          </div>

          {/* Features */}
          <ul className="space-y-2 mb-6">
            {SINGLE_PLAN.features.slice(0, 5).map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <button
            onClick={handleSubscribe}
            className="w-full py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:scale-[1.02] hover:shadow-primary-hover active:scale-[0.98]"
          >
            <Zap className="w-4 h-4" />
            {hasSubscription ? "Reativar Agora" : "Assinar Agora"}
          </button>
        </div>
      </div>
    </div>
  );
}
