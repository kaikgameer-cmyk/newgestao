import { Check, ArrowRight, Sparkles } from "lucide-react";
import { SINGLE_PLAN } from "@/config/plans";

export function PricingSection() {
  const handleSubscribe = () => {
    window.open(SINGLE_PLAN.checkoutUrl, "_blank");
  };

  return (
    <section id="precos" className="py-20 md:py-28 relative">
      <div className="absolute inset-0 bg-secondary/30" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Acesso completo ao <span className="text-primary">New Gestão</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            {SINGLE_PLAN.subtitle}
          </p>
        </div>

        {/* Single Plan Card - Centered */}
        <div className="max-w-md mx-auto">
          <div className="relative flex flex-col rounded-xl p-6 md:p-8 bg-card border border-primary/50 shadow-lg shadow-primary/5">
            {/* Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                <Sparkles className="w-3.5 h-3.5" />
                Acesso Total
              </span>
            </div>

            {/* Plan info */}
            <div className="text-center mb-6 pt-4">
              <h3 className="text-xl font-semibold mb-2">{SINGLE_PLAN.displayName}</h3>
            </div>

            {/* Price - Prominent display */}
            <div className="text-center mb-8">
              <span className="text-4xl md:text-5xl font-bold text-primary">{SINGLE_PLAN.priceLabel}</span>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-8 flex-1">
              {SINGLE_PLAN.features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={handleSubscribe}
              className="w-full py-4 px-6 rounded-lg text-base font-medium transition-all duration-200 flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]"
            >
              Assinar agora
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Pagamento seguro via Kiwify. Cancele quando quiser.
        </p>
      </div>
    </section>
  );
}
