import { Check, Zap, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLANS_LIST } from "@/config/plans";

export function PricingSection() {
  const handleSelectPlan = (checkoutUrl: string) => {
    window.open(checkoutUrl, "_blank");
  };

  return (
    <section id="precos" className="py-24 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Escolha o <span className="text-gradient-primary">plano ideal</span> para você
          </h2>
          <p className="text-muted-foreground text-lg">
            Todos os planos incluem acesso completo ao New Gestão
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANS_LIST.map((plan) => {
            const showBestValueBadge = plan.bestValue;
            const showPopularBadge = !plan.bestValue && plan.popular;

            return (
              <div
                key={plan.id}
                onClick={() => handleSelectPlan(plan.checkoutUrl)}
                className={cn(
                  "relative group flex flex-col rounded-2xl p-6 cursor-pointer transition-all duration-300",
                  "bg-card border border-border",
                  "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10",
                  plan.bestValue && "border-primary/30 scale-105"
                )}
              >
                {/* Badge */}
                {showBestValueBadge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground shadow-md">
                      <TrendingUp className="w-3 h-3" />
                      Mais Economia
                    </span>
                  </div>
                )}
                
                {showPopularBadge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground shadow-md">
                      <Sparkles className="w-3 h-3" />
                      Mais Popular
                    </span>
                  </div>
                )}

                {/* Plan name */}
                <h3 className="text-xl font-bold text-foreground text-center mt-2">
                  {plan.displayName}
                </h3>
                <p className="text-sm text-muted-foreground text-center">{plan.subtitle}</p>

                {/* Price section */}
                <div className="flex items-center justify-center mt-6 mb-2">
                  <span className="text-2xl font-bold text-foreground tracking-tight">
                    {plan.priceLabel}
                  </span>
                </div>

                <div className="h-6" />

                {/* Features */}
                <ul className="space-y-3 mb-6 flex-1">
                  <li className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-success flex-shrink-0" />
                    Dashboard completo
                  </li>
                  <li className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-success flex-shrink-0" />
                    Controle de combustível
                  </li>
                  <li className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-success flex-shrink-0" />
                    Gestão de despesas
                  </li>
                  <li className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-success flex-shrink-0" />
                    Metas e competições
                  </li>
                  <li className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-success flex-shrink-0" />
                    Atualizações inclusas
                  </li>
                </ul>

                {/* Action button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectPlan(plan.checkoutUrl);
                  }}
                  className={cn(
                    "w-full py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200",
                    "flex items-center justify-center gap-2",
                    "bg-primary text-primary-foreground",
                    "hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                  )}
                >
                  <Zap className="w-4 h-4" />
                  Começar agora
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
