import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Star,
  MessageSquare,
  Send,
  XCircle,
  CheckCircle,
  Loader2,
  Download,
  Users,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useFeedbackAdmin } from "@/hooks/useFeedback";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function FeedbackAdminPanel() {
  const {
    activeCampaign,
    responses,
    stats,
    loadingResponses,
    createCampaign,
    endCampaign,
  } = useFeedbackAdmin();
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<"all" | "submitted" | "dismissed">("all");
  const [filterStars, setFilterStars] = useState<number | null>(null);

  const handleCreateCampaign = async () => {
    try {
      await createCampaign.mutateAsync({});
      toast({ title: "Campanha criada!", description: "Todos os usuários verão o popup de avaliação." });
    } catch {
      toast({ title: "Erro ao criar campanha", variant: "destructive" });
    }
  };

  const handleEndCampaign = async () => {
    if (!activeCampaign) return;
    try {
      await endCampaign.mutateAsync(activeCampaign.id);
      toast({ title: "Campanha encerrada" });
    } catch {
      toast({ title: "Erro ao encerrar campanha", variant: "destructive" });
    }
  };

  const handleExportCSV = () => {
    if (responses.length === 0) {
      toast({ title: "Nenhuma resposta para exportar" });
      return;
    }

    const headers = ["Data", "Usuário", "Email", "Estrelas", "Status", "Comentário"];
    const rows = responses.map((r) => [
      format(new Date(r.submitted_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      r.profiles?.name || r.profiles?.first_name || "—",
      r.profiles?.email || "—",
      r.stars?.toString() || "—",
      r.status === "submitted" ? "Respondido" : "Dispensado",
      (r.comment || "").replace(/"/g, '""'),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `feedback_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({ title: "CSV exportado!" });
  };

  const filteredResponses = responses.filter((r) => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (filterStars !== null && r.stars !== filterStars) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Sistema de Avaliação
          </h2>
          <p className="text-sm text-muted-foreground">
            Colete feedback dos usuários com campanhas controladas
          </p>
        </div>

        <div className="flex gap-2">
          {activeCampaign ? (
            <Button
              variant="outline"
              onClick={handleEndCampaign}
              disabled={endCampaign.isPending}
            >
              {endCampaign.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Encerrar Campanha
            </Button>
          ) : (
            <Button
              variant="hero"
              onClick={handleCreateCampaign}
              disabled={createCampaign.isPending}
            >
              {createCampaign.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Disparar Avaliação
            </Button>
          )}
        </div>
      </div>

      {/* Status da Campanha */}
      {activeCampaign && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-success text-success-foreground">
                <CheckCircle className="w-3 h-3 mr-1" />
                Campanha Ativa
              </Badge>
              <span className="text-sm text-muted-foreground">
                Iniciada em {format(new Date(activeCampaign.starts_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Respostas</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">Respondidos</span>
            </div>
            <p className="text-2xl font-bold text-success">{stats.submitted}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Dispensados</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{stats.dismissed}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Média</span>
            </div>
            <p className="text-2xl font-bold">
              {stats.avgStars > 0 ? stats.avgStars.toFixed(1) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Star Distribution */}
      {stats.submitted > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Distribuição de Notas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.starDistribution[star] || 0;
                const percentage = stats.submitted > 0 ? (count / stats.submitted) * 100 : 0;

                return (
                  <div key={star} className="flex items-center gap-3">
                    <button
                      onClick={() => setFilterStars(filterStars === star ? null : star)}
                      className={cn(
                        "flex items-center gap-1 min-w-[60px] transition-opacity",
                        filterStars !== null && filterStars !== star && "opacity-40"
                      )}
                    >
                      <span className="text-sm font-medium">{star}</span>
                      <Star className="w-4 h-4 fill-primary text-primary" />
                    </button>
                    <div className="flex-1 h-4 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground min-w-[40px] text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros e Exportar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["all", "submitted", "dismissed"] as const).map((status) => (
            <Badge
              key={status}
              variant={filterStatus === status ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilterStatus(status)}
            >
              {status === "all" ? "Todos" : status === "submitted" ? "Respondidos" : "Dispensados"}
            </Badge>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Lista de Respostas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Respostas ({filteredResponses.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingResponses ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredResponses.length === 0 ? (
            <div className="text-center text-muted-foreground p-8">
              {activeCampaign
                ? "Nenhuma resposta ainda. Aguarde os usuários responderem."
                : "Dispare uma campanha para coletar feedback dos usuários."}
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="divide-y divide-border">
                {filteredResponses.map((response) => (
                  <div key={response.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">
                            {response.profiles?.name ||
                              response.profiles?.first_name ||
                              response.profiles?.email ||
                              "Usuário"}
                          </span>
                          <Badge
                            variant={response.status === "submitted" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {response.status === "submitted" ? "Respondido" : "Dispensado"}
                          </Badge>
                        </div>

                        {response.status === "submitted" && response.stars && (
                          <div className="flex items-center gap-1 mt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={cn(
                                  "w-4 h-4",
                                  star <= response.stars!
                                    ? "fill-primary text-primary"
                                    : "text-muted-foreground"
                                )}
                              />
                            ))}
                          </div>
                        )}

                        {response.comment && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            "{response.comment}"
                          </p>
                        )}
                      </div>

                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(response.submitted_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
