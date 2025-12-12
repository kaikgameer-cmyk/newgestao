import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Crown, Shield, Zap, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  KIWIFY_CHECKOUT_MENSAL, 
  KIWIFY_CHECKOUT_TRIMESTRAL, 
  KIWIFY_CHECKOUT_ANUAL 
} from "@/hooks/useSubscription";

interface SubscriptionPaywallProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  reason?: "expired" | "past_due" | "canceled" | "no_subscription";
}

const plans = [
  {
    name: "Mensal",
    subtitle: "Para quem quer testar",
    price: "R$ 14,90",
    period: "/mês",
    checkoutUrl: KIWIFY_CHECKOUT_MENSAL,
  },
  {
    name: "3 Meses",
    subtitle: "Escolha mais popular",
    price: "R$ 37,90",
    period: "/trimestre",
    checkoutUrl: KIWIFY_CHECKOUT_TRIMESTRAL,
    popular: true,
  },
  {
    name: "Anual",
    subtitle: "Melhor custo-benefício",
    price: "R$ 97,00",
    period: "/ano",
    equivalent: "R$ 8,08/mês",
    checkoutUrl: KIWIFY_CHECKOUT_ANUAL,
    bestValue: true,
  },
];

const getReasonMessage = (reason?: string) => {
  switch (reason) {
    case "expired":
      return "Sua assinatura expirou. Renove para continuar usando o Driver Control.";
    case "past_due":
      return "Sua assinatura está com pagamento pendente. Regularize para continuar.";
    case "canceled":
      return "Sua assinatura foi cancelada. Reative para continuar usando.";
    case "no_subscription":
    default:
      return "Assine o Driver Control para ter acesso completo ao sistema.";
  }
};

export function SubscriptionPaywall({ 
  open, 
  onOpenChange,
  reason = "no_subscription" 
}: SubscriptionPaywallProps) {
  const handleSelectPlan = (checkoutUrl: string) => {
    window.open(checkoutUrl, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Crown className="w-8 h-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-2xl">Acesso Premium Necessário</DialogTitle>
          <DialogDescription className="text-base">
            {getReasonMessage(reason)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-4 mt-6 pt-4">
          {plans.map((plan) => {
            const showBestValueBadge = plan.bestValue;
            const showPopularBadge = !plan.bestValue && plan.popular;

            return (
              <div
                key={plan.name}
                onClick={() => handleSelectPlan(plan.checkoutUrl)}
                className={cn(
                  "relative group flex flex-col rounded-2xl p-5 cursor-pointer transition-all duration-300",
                  "bg-card border border-border",
                  "hover:border-primary/50 hover:shadow-primary",
                  plan.bestValue && "border-primary/30"
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
                <h3 className="text-lg font-semibold text-foreground text-center mt-2">
                  {plan.name}
                </h3>
                <p className="text-xs text-muted-foreground text-center">{plan.subtitle}</p>

                {/* Price section */}
                <div className="flex items-baseline justify-center gap-1 mt-3 mb-1">
                  <span className="text-sm text-muted-foreground">R$</span>
                  <span className="text-3xl font-bold text-foreground tracking-tight">
                    {plan.price.replace("R$ ", "")}
                  </span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>

                {/* Equivalent pricing for annual */}
                {plan.equivalent && (
                  <p className="text-center text-xs text-primary font-medium mb-3">
                    Equivale a {plan.equivalent}
                  </p>
                )}
                
                {!plan.equivalent && <div className="h-5 mb-3" />}

                {/* Features */}
                <ul className="space-y-2 mb-4 flex-1">
                  <li className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-success flex-shrink-0" />
                    Acesso completo
                  </li>
                  <li className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-success flex-shrink-0" />
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
                    "w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200",
                    "flex items-center justify-center gap-2",
                    "bg-primary text-primary-foreground",
                    "hover:scale-[1.02] hover:shadow-primary-hover active:scale-[0.98]"
                  )}
                >
                  <Zap className="w-4 h-4" />
                  Assinar
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-2 mt-6 text-sm text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>Pagamento seguro via Kiwify. Cancele quando quiser.</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
