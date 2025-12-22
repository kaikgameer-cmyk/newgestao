import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, FlaskConical, Trophy, AlertCircle, Trash2, RefreshCw, Eye } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMyCompetitions } from "@/hooks/useCompetitions";
import {
  useAdminSimulateFinish,
  useAdminClearNotifications,
  useCompetitionTestNotifications,
  useAdminGetHostPayouts,
} from "@/hooks/useAdminCompetitionTests";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function TestCompetitionMessages() {
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>("");
  const [showHostPayouts, setShowHostPayouts] = useState(false);

  const { data: competitions, isLoading: loadingCompetitions } = useMyCompetitions();
  const { data: notifications, isLoading: loadingNotifications } = useCompetitionTestNotifications(
    selectedCompetitionId || undefined
  );
  const { data: hostPayouts } = useAdminGetHostPayouts(
    showHostPayouts && selectedCompetitionId ? selectedCompetitionId : undefined
  );

  const simulateFinishMutation = useAdminSimulateFinish();
  const clearNotificationsMutation = useAdminClearNotifications();

  if (!isAdmin) {
    return (
      <div className="p-4 md:p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Acesso negado</AlertTitle>
          <AlertDescription>Apenas administradores podem acessar esta página.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const selectedCompetition = competitions?.find((c) => c.id === selectedCompetitionId);

  const handleSimulateWithGoal = async () => {
    if (!selectedCompetitionId) return;
    await simulateFinishMutation.mutateAsync({
      competition_id: selectedCompetitionId,
      meta_reached: true,
    });
  };

  const handleSimulateWithoutGoal = async () => {
    if (!selectedCompetitionId) return;
    await simulateFinishMutation.mutateAsync({
      competition_id: selectedCompetitionId,
      meta_reached: false,
    });
  };

  const handleClear = async () => {
    if (!selectedCompetitionId) return;
    await clearNotificationsMutation.mutateAsync(selectedCompetitionId);
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case "competition_finish_winner":
        return { label: "Vencedor", variant: "default" as const };
      case "competition_finish_loser":
        return { label: "Perdedor", variant: "secondary" as const };
      case "competition_host_payout":
        return { label: "Host (Pagar)", variant: "destructive" as const };
      case "competition_host_no_winner":
        return { label: "Host (Sem Vencedor)", variant: "outline" as const };
      default:
        return { label: type, variant: "outline" as const };
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/admin")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-primary" />
            Teste de Mensagens de Competições
          </h1>
          <p className="text-muted-foreground mt-1">
            Simule finalizações e valide mensagens (ADMIN ONLY)
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecione uma Competição</CardTitle>
          <CardDescription>
            Escolha uma competição para simular a finalização e testar as mensagens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedCompetitionId} onValueChange={setSelectedCompetitionId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma competição..." />
            </SelectTrigger>
            <SelectContent>
              {loadingCompetitions ? (
                <SelectItem value="loading" disabled>
                  Carregando...
                </SelectItem>
              ) : competitions && competitions.length > 0 ? (
                competitions.map((comp) => (
                  <SelectItem key={comp.id} value={comp.id}>
                    {comp.code} - {comp.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="empty" disabled>
                  Nenhuma competição encontrada
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          {selectedCompetition && (
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{selectedCompetition.name}</h3>
                <Badge variant="outline">{selectedCompetition.code}</Badge>
              </div>
              <MarkdownRenderer content={selectedCompetition.description || ""} className="text-sm text-muted-foreground" />
              <div className="flex gap-4 text-sm">
                <span>
                  Meta: <strong>{formatCurrency(selectedCompetition.goal_value)}</strong>
                </span>
                <span>
                  Prêmio: <strong>{formatCurrency(selectedCompetition.prize_value)}</strong>
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Período:{" "}
                {format(parseISO(selectedCompetition.start_date), "dd/MM/yy", { locale: ptBR })} até{" "}
                {format(parseISO(selectedCompetition.end_date), "dd/MM/yy", { locale: ptBR })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCompetitionId && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Ações de Teste</CardTitle>
              <CardDescription>
                Simule finalizações e valide as mensagens geradas. Ações são idempotentes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 md:grid-cols-2">
                <Button
                  onClick={handleSimulateWithGoal}
                  disabled={simulateFinishMutation.isPending}
                  className="gap-2"
                >
                  <Trophy className="w-4 h-4" />
                  {simulateFinishMutation.isPending ? "Simulando..." : "Simular: META ATINGIDA"}
                </Button>
                <Button
                  onClick={handleSimulateWithoutGoal}
                  variant="secondary"
                  disabled={simulateFinishMutation.isPending}
                  className="gap-2"
                >
                  <AlertCircle className="w-4 h-4" />
                  {simulateFinishMutation.isPending ? "Simulando..." : "Simular: META NÃO ATINGIDA"}
                </Button>
              </div>
              <Separator />
              <div className="flex gap-2">
                <Button
                  onClick={handleClear}
                  variant="destructive"
                  disabled={clearNotificationsMutation.isPending}
                  className="gap-2 flex-1"
                >
                  <Trash2 className="w-4 h-4" />
                  {clearNotificationsMutation.isPending ? "Limpando..." : "Limpar Mensagens"}
                </Button>
                <Button
                  onClick={() => setShowHostPayouts(true)}
                  variant="outline"
                  className="gap-2 flex-1"
                >
                  <Eye className="w-4 h-4" />
                  Ver Detalhes do Host
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Mensagens Geradas</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    useCompetitionTestNotifications(selectedCompetitionId).refetch()
                  }
                  className="gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Recarregar
                </Button>
              </CardTitle>
              <CardDescription>
                Notifications criadas para esta competição (todos os tipos de mensagem)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingNotifications ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : notifications && notifications.length > 0 ? (
                <div className="space-y-3">
                  {notifications.map((notif) => {
                    const typeInfo = getNotificationTypeLabel(notif.type);
                    return (
                      <div key={notif.id} className="rounded-lg border bg-card p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(notif.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-sm">{notif.payload?.message || "Sem mensagem"}</p>
                        {notif.payload?.payout_value && (
                          <p className="text-sm font-semibold text-primary">
                            Valor: {formatCurrency(notif.payload.payout_value)}
                          </p>
                        )}
                        {notif.read_at && (
                          <p className="text-xs text-muted-foreground">
                            Lida em: {format(parseISO(notif.read_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma mensagem gerada ainda</p>
                  <p className="text-sm">Clique em "Simular" acima para gerar</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={showHostPayouts} onOpenChange={setShowHostPayouts}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Host (Payout)</DialogTitle>
            <DialogDescription>
              Informações para pagamento dos vencedores
            </DialogDescription>
          </DialogHeader>
          {hostPayouts ? (
            <div className="space-y-4">
              {hostPayouts.meta_reached ? (
                <>
                  <Alert>
                    <Trophy className="h-4 w-4" />
                    <AlertTitle>Meta Atingida!</AlertTitle>
                    <AlertDescription>
                      Competição: {hostPayouts.competition_name} ({hostPayouts.competition_code})
                      <br />
                      Meta: {formatCurrency(hostPayouts.goal_value || 0)} | Prêmio Total:{" "}
                      {formatCurrency(hostPayouts.prize_value || 0)}
                    </AlertDescription>
                  </Alert>
                  {hostPayouts.winners && hostPayouts.winners.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="font-semibold">Vencedores ({hostPayouts.winners.length}):</h4>
                      {hostPayouts.winners.map((winner) => (
                        <Card key={winner.user_id}>
                          <CardContent className="pt-4 space-y-1">
                            <div className="font-semibold">{winner.name}</div>
                            <div className="text-sm text-muted-foreground">
                              WhatsApp: {winner.whatsapp || "Não informado"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              PIX ({winner.pix_key_type || "Não especificado"}): {winner.pix_key}
                            </div>
                            <div className="text-base font-bold text-primary mt-2">
                              Valor a pagar: {formatCurrency(winner.payout_value)}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Nenhum vencedor encontrado</p>
                  )}
                </>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Meta Não Atingida</AlertTitle>
                  <AlertDescription>{hostPayouts.message}</AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
