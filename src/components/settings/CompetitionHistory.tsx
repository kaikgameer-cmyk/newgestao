import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Users, Calendar, Target, Loader2 } from "lucide-react";
import { useCompetitionHistory } from "@/hooks/useCompetitionHistory";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { AchievementBadges } from "@/components/competitions/AchievementBadges";

export function CompetitionHistory() {
  const { data, isLoading } = useCompetitionHistory();
  
  const history = data?.items || [];
  const historyStats = data?.stats;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Em andamento</Badge>;
      case "upcoming":
        return <Badge variant="outline">Em breve</Badge>;
      case "finished":
        return <Badge variant="secondary">Encerrada</Badge>;
      default:
        return null;
    }
  };

  const stats = {
    total: historyStats?.totalParticipations || 0,
    wins: historyStats?.totalWins || 0,
    active: history.filter((h) => h.status === "active").length,
    totalEarned: historyStats?.totalPrizes || 0,
  };

  if (isLoading) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Histórico de Competições</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Histórico de Competições</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Participações</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-primary/10">
            <div className="text-2xl font-bold text-primary">{stats.wins}</div>
            <div className="text-xs text-muted-foreground">Vitórias</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-green-500/10">
            <div className="text-2xl font-bold text-green-500">{stats.active}</div>
            <div className="text-xs text-muted-foreground">Ativas</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-amber-500/10">
            <div className="text-2xl font-bold text-amber-500">{formatCurrency(stats.totalEarned)}</div>
            <div className="text-xs text-muted-foreground">Prêmios ganhos</div>
          </div>
        </div>

        {/* Achievements */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Conquistas</h3>
          <AchievementBadges
            wins={stats.wins}
            participations={stats.total}
            totalPrizes={stats.totalEarned}
          />
        </div>

        {/* Competition List */}
        {history && history.length > 0 ? (
          <div className="space-y-3">
            {history.map((competition) => (
              <Link
                key={competition.id}
                to={`/dashboard/competicoes/${competition.code}`}
                className="block"
              >
                <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    competition.is_winner 
                      ? "bg-primary/20" 
                      : "bg-muted"
                  }`}>
                    {competition.is_winner ? (
                      <Medal className="w-5 h-5 text-primary" />
                    ) : (
                      <Users className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{competition.name}</span>
                      {competition.is_winner && (
                        <Badge className="bg-primary/20 text-primary border-primary/30 gap-1">
                          <Trophy className="w-3 h-3" />
                          Vencedor
                        </Badge>
                      )}
                      {competition.role === "host" && (
                        <Badge variant="outline" className="text-xs">Host</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(competition.start_date), "dd MMM", { locale: ptBR })} - {format(new Date(competition.end_date), "dd MMM yyyy", { locale: ptBR })}
                      </span>
                      {competition.is_competitor && (
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {formatCurrency(competition.user_score)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status & Prize */}
                  <div className="text-right space-y-1">
                    {getStatusBadge(competition.status)}
                    {competition.payout_status === "winner" && competition.payout_value !== undefined ? (
                      <div className="text-xs text-primary font-medium">
                        Você ganhou: {formatCurrency(competition.payout_value)}
                      </div>
                    ) : competition.payout_status === "no_winner" ? (
                      <div className="text-xs text-muted-foreground">
                        Sem vencedor
                      </div>
                    ) : competition.status === "finished" && competition.payout_status === "loser" ? (
                      <div className="text-xs text-muted-foreground">
                        Prêmio: {formatCurrency(competition.prize_value)}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Prêmio: {formatCurrency(competition.prize_value)}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Você ainda não participou de nenhuma competição.</p>
            <Link to="/dashboard/competicoes" className="text-primary hover:underline text-sm">
              Ver competições disponíveis
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
