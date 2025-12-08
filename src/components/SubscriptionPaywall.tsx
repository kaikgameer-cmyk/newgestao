import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Shield } from "lucide-react";
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
    price: "R$ 29,90",
    period: "/mês",
    description: "Acesso completo por 1 mês",
    checkoutUrl: KIWIFY_CHECKOUT_MENSAL,
    features: [
      "Dashboard completo",
      "Relatórios semanais",
      "Controle de combustível",
      "Gestão de cartões",
    ],
  },
  {
    name: "Trimestral",
    price: "R$ 79,90",
    period: "/3 meses",
    description: "Economize 11%",
    checkoutUrl: KIWIFY_CHECKOUT_TRIMESTRAL,
    popular: true,
    features: [
      "Tudo do plano mensal",
      "3 meses de acesso",
      "Economia garantida",
      "Suporte prioritário",
    ],
  },
  {
    name: "Anual",
    price: "R$ 249,90",
    period: "/ano",
    description: "Economize 30%",
    checkoutUrl: KIWIFY_CHECKOUT_ANUAL,
    features: [
      "Tudo do plano trimestral",
      "12 meses de acesso",
      "Maior economia",
      "Acesso antecipado a novidades",
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
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative ${plan.popular ? "border-primary shadow-lg" : ""}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  Mais Popular
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full" 
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handleSelectPlan(plan.checkoutUrl)}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Assinar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 mt-6 text-sm text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>Pagamento seguro via Kiwify. Cancele quando quiser.</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
