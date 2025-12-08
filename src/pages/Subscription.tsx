import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Crown, 
  Calendar, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  ExternalLink,
  Loader2,
  Zap,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { useSubscription, KIWIFY_CHECKOUT_MENSAL, KIWIFY_CHECKOUT_TRIMESTRAL, KIWIFY_CHECKOUT_ANUAL } from "@/hooks/useSubscription";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const plans = [
  {
    name: "Mensal",
    interval: "month",
    price: "R$ 19,90",
    period: "/mês",
    checkoutUrl: KIWIFY_CHECKOUT_MENSAL,
  },
  {
    name: "3 Meses",
    interval: "quarter",
    price: "R$ 47,90",
    period: "/trimestre",
    checkoutUrl: KIWIFY_CHECKOUT_TRIMESTRAL,
    popular: true,
  },
  {
    name: "Anual",
    interval: "year",
    price: "R$ 147,90",
    period: "/ano",
    equivalent: "R$ 15,30/mês",
    checkoutUrl: KIWIFY_CHECKOUT_ANUAL,
    bestValue: true,
  },
];

export default function SubscriptionPage() {
  const { subscription, isLoading, isActive, isPastDue, isCanceled, daysRemaining, hasSubscription } = useSubscription();
  const { toast } = useToast();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const getStatusBadge = () => {
    if (isActive) {
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Ativa</Badge>;
    }
    if (isPastDue) {
      return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Pagamento Pendente</Badge>;
    }
    if (isCanceled) {
      return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Cancelada</Badge>;
    }
    return <Badge variant="outline">Sem Assinatura</Badge>;
  };

  const getStatusIcon = () => {
    if (isActive) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (isPastDue) return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    if (isCanceled) return <XCircle className="w-5 h-5 text-red-500" />;
    return <XCircle className="w-5 h-5 text-muted-foreground" />;
  };

  const handleCancelSubscription = () => {
    toast({
      title: "Redirecionando...",
      description: "Você será direcionado para o portal da Kiwify para gerenciar sua assinatura.",
    });
    window.open("https://dashboard.kiwify.com.br/subscriptions", "_blank");
    setCancelDialogOpen(false);
  };

  const handleUpgrade = (checkoutUrl: string) => {
    window.open(checkoutUrl, "_blank");
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Crown className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Minha Assinatura</h1>
          <p className="text-muted-foreground">Gerencie seu plano e pagamentos</p>
        </div>
      </div>

      {/* Current Subscription Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <CardTitle>Status da Assinatura</CardTitle>
                <CardDescription>Informações do seu plano atual</CardDescription>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {hasSubscription && subscription ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Plano</p>
                  <p className="text-lg font-semibold">{subscription.plan_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Próxima Renovação</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <p className="text-lg font-semibold">
                      {format(new Date(subscription.current_period_end), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Dias Restantes</p>
                  <p className={`text-lg font-semibold ${daysRemaining <= 7 ? "text-yellow-500" : ""}`}>
                    {daysRemaining} dias
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-3">
                {!isActive && (
                  <Button onClick={() => handleUpgrade(KIWIFY_CHECKOUT_MENSAL)}>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Reativar Assinatura
                  </Button>
                )}
                
                <Button variant="outline" asChild>
                  <a href="https://dashboard.kiwify.com.br/subscriptions" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Portal do Cliente
                  </a>
                </Button>

                {isActive && (
                  <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" className="text-destructive hover:text-destructive">
                        Cancelar Assinatura
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja cancelar sua assinatura? Você perderá acesso a todos os recursos premium após o término do período atual.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Manter Assinatura</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleCancelSubscription}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Sim, Cancelar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Você não possui uma assinatura ativa</h3>
              <p className="text-muted-foreground mb-6">
                Assine agora para ter acesso completo ao Driver Control
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans - IMPROVED DESIGN */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {hasSubscription && isActive ? "Alterar Plano" : "Escolha seu Plano"}
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrentPlan = subscription?.billing_interval === plan.interval && isActive;
            
            // Determine the highlight badge (only show one)
            const getBadge = () => {
              if (isCurrentPlan) {
                return (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white shadow-lg">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Plano Atual
                  </Badge>
                );
              }
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
              if (isCurrentPlan) {
                return "border-2 border-green-500 shadow-lg shadow-green-500/10";
              }
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
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-sm text-muted-foreground">R$ </span>
                    <span className="text-3xl font-bold">{plan.price.replace("R$ ", "")}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  {plan.equivalent && (
                    <p className="text-xs text-primary mt-1">Equivale a {plan.equivalent}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    variant={isCurrentPlan ? "secondary" : plan.popular || plan.bestValue ? "default" : "outline"}
                    disabled={isCurrentPlan}
                    onClick={() => handleUpgrade(plan.checkoutUrl)}
                  >
                    {isCurrentPlan ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Plano Atual
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        {hasSubscription ? "Alterar" : "Assinar"}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Help Section */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <AlertTriangle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Precisa de ajuda?</h3>
              <p className="text-sm text-muted-foreground">
                Se você tiver problemas com sua assinatura ou pagamentos, entre em contato conosco pelo email{" "}
                <a href="mailto:suporte@drivercontrol.com.br" className="text-primary hover:underline">
                  suporte@drivercontrol.com.br
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
