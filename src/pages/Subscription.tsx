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
} from "lucide-react";
import { useSubscription, KIWIFY_CHECKOUT_MENSAL } from "@/hooks/useSubscription";
import { PlansSection } from "@/components/subscription/PlansSection";
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


export default function SubscriptionPage() {
  const { subscription, isLoading, isActive, isPastDue, isCanceled, daysRemaining, hasSubscription } = useSubscription();
  const { toast } = useToast();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const getStatusBadge = () => {
    if (isActive) {
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Ativa</Badge>;
    }
    if (isPastDue) {
      return <Badge className="bg-primary/10 text-primary border-primary/30">Pagamento Pendente</Badge>;
    }
    if (isCanceled) {
      return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Cancelada</Badge>;
    }
    return <Badge variant="outline">Sem Assinatura</Badge>;
  };

  const getStatusIcon = () => {
    if (isActive) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (isPastDue) return <AlertTriangle className="w-5 h-5 text-primary" />;
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

      {/* Available Plans */}
      <PlansSection 
        currentInterval={subscription?.billing_interval}
        isActive={isActive}
        hasSubscription={hasSubscription}
      />

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
                <a href="mailto:drivercontrolcontato@outlook.com" className="text-primary hover:underline">
                  drivercontrolcontato@outlook.com
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
