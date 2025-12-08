import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Shield, Sparkles, TrendingUp } from "lucide-react";
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
    price: "R$ 19,90",
    period: "/mês",
    checkoutUrl: KIWIFY_CHECKOUT_MENSAL,
    features: [
      "Acesso completo ao Driver Control",
      "Atualizações inclusas",
      "Suporte básico",
    ],
  },
  {
    name: "3 Meses",
    subtitle: "Escolha mais popular",
    price: "R$ 47,90",
    period: "/trimestre",
    checkoutUrl: KIWIFY_CHECKOUT_TRIMESTRAL,
    popular: true,
    features: [
      "Acesso completo ao Driver Control",
      "Atualizações inclusas",
      "Suporte prioritário",
      "Perfeito para testar na prática",
    ],
  },
  {
    name: "Anual",
    subtitle: "Melhor custo-benefício",
    price: "R$ 147,90",
    period: "/ano",
    equivalent: "Equivale a apenas R$ 15,30/mês",
    checkoutUrl: KIWIFY_CHECKOUT_ANUAL,
    bestValue: true,
    features: [
      "Acesso completo ao Driver Control",
      "Atualizações inclusas",
      "Suporte prioritário",
      "Maior economia no longo prazo",
    ],
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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

        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {plans.map((plan) => {
            // Determine the highlight badge (only show one per card)
            const getBadge = () => {
              if (plan.bestValue) {
                return (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground shadow-lg">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Mais Economia
                  </Badge>
                );
              }
              if (plan.popular) {
                return (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground shadow-lg">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Mais Popular
                  </Badge>
                );
              }
              return null;
            };

            // Determine card border style
            const getCardStyle = () => {
              if (plan.bestValue) {
                return "border-2 border-primary shadow-lg shadow-primary/10";
              }
              if (plan.popular) {
                return "border-2 border-primary/50";
              }
              return "";
            };
            
            return (
              <Card 
                key={plan.name} 
                className={`relative overflow-hidden ${getCardStyle()}`}
              >
                {getBadge()}
                
                <CardHeader className="text-center pb-2 pt-6">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-primary" />
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                  </div>
                  <CardDescription>{plan.subtitle}</CardDescription>
                  <div className="mt-3">
                    <span className="text-sm text-muted-foreground">R$ </span>
                    <span className="text-3xl font-bold">{plan.price.replace("R$ ", "")}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  {plan.equivalent && (
                    <p className="text-xs text-primary mt-1">{plan.equivalent}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full" 
                    variant={plan.popular || plan.bestValue ? "default" : "outline"}
                    onClick={() => handleSelectPlan(plan.checkoutUrl)}
                  >
                    Assinar {plan.name === "3 Meses" ? "Plano 3 Meses" : `Plano ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
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
