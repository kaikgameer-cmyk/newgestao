import { Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLANS_LIST } from "@/config/plans";

export function PricingSection() {
  const handleSelectPlan = (checkoutUrl: string) => {
    window.open(checkoutUrl, "_blank");
  };

  return (
    <section id="precos" className="py-20 md:py-28 relative">
      <div className="absolute inset-0 bg-secondary/30" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Escolha seu <span className="text-primary">plano</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Todos os planos incluem acesso completo ao New Gestão
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
          {PLANS_LIST.map((plan) => {
            const isHighlighted = plan.bestValue || plan.popular;

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-xl p-5 md:p-6 transition-all duration-200",
                  "bg-card border",
                  isHighlighted 
                    ? "border-primary/50 shadow-lg shadow-primary/5" 
                    : "border-border hover:border-border-strong"
                )}
              >
                {/* Badge */}
                {plan.bestValue && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                      Mais economia
                    </span>
                  </div>
                )}
                
                {!plan.bestValue && plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                      Popular
                    </span>
                  </div>
                )}

                {/* Plan info */}
                <div className="text-center mb-6 pt-2">
                  <h3 className="text-lg font-semibold mb-1">{plan.displayName}</h3>
                  <p className="text-sm text-muted-foreground">{plan.subtitle}</p>
                </div>

                {/* Price */}
                <div className="text-center mb-6">
                  <span className="text-2xl font-bold">{plan.priceLabel}</span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6 flex-1">
                  {[
                    "Dashboard completo",
                    "Controle de combustível",
                    "Gestão de despesas",
                    "Metas e competições",
                    "Atualizações inclusas",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleSelectPlan(plan.checkoutUrl)}
                  className={cn(
                    "w-full py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200",
                    "flex items-center justify-center gap-2",
                    isHighlighted
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  )}
                >
                  Começar agora
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Pagamento seguro via Kiwify. Cancele quando quiser.
        </p>
      </div>
    </section>
  );
}
