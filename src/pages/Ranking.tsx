import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award, Loader2, Users, Crown } from "lucide-react";
import { useGlobalRanking } from "@/hooks/useGlobalRanking";
import { UserAvatar } from "@/components/user/UserAvatar";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { AchievementBadges } from "@/components/competitions/AchievementBadges";

export default function RankingPage() {
  const { data: ranking, isLoading } = useGlobalRanking();
  const { user } = useAuth();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getAvatarUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="w-6 h-6 text-primary" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return (
          <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">
            {position}
          </span>
        );
    }
  };

  const getPositionStyle = (position: number) => {
    switch (position) {
      case 1:
        return "bg-primary/10 border-primary/30";
      case 2:
        return "bg-gray-400/10 border-gray-400/30";
      case 3:
        return "bg-amber-600/10 border-amber-600/30";
      default:
        return "bg-card border-border";
    }
  };

  // Calculate totals
  const totals = ranking?.reduce(
    (acc, entry) => ({
      totalWins: acc.totalWins + entry.wins,
      totalPrizes: acc.totalPrizes + entry.total_prizes,
      totalParticipations: acc.totalParticipations + entry.participations,
    }),
    { totalWins: 0, totalPrizes: 0, totalParticipations: 0 }
  ) || { totalWins: 0, totalPrizes: 0, totalParticipations: 0 };

  const uniqueWinners = ranking?.filter((r) => r.wins > 0).length || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Crown className="w-7 h-7 text-primary" />
          Ranking Geral
        </h1>
        <p className="text-muted-foreground">
          Classificação de todos os competidores baseada em vitórias e prêmios
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="elevated">
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{ranking?.length || 0}</div>
              <div className="text-xs text-muted-foreground">Competidores</div>
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="pt-6">
            <div className="text-center">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
              <div className="text-2xl font-bold">{uniqueWinners}</div>
              <div className="text-xs text-muted-foreground">Vencedores</div>
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="pt-6">
            <div className="text-center">
              <Medal className="w-8 h-8 mx-auto mb-2 text-amber-500" />
              <div className="text-2xl font-bold">{totals.totalWins}</div>
              <div className="text-xs text-muted-foreground">Vitórias Totais</div>
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="pt-6">
            <div className="text-center">
              <span className="text-2xl">💰</span>
              <div className="text-2xl font-bold text-primary">{formatCurrency(totals.totalPrizes)}</div>
              <div className="text-xs text-muted-foreground">Prêmios Distribuídos</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking Table */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-lg">Classificação</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : ranking && ranking.length > 0 ? (
            <div className="space-y-2">
              {/* Header */}
              <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Competidor</div>
                <div className="col-span-2 text-center">Vitórias</div>
                <div className="col-span-2 text-center">Participações</div>
                <div className="col-span-2 text-right">Prêmios</div>
              </div>

              {/* Entries */}
              {ranking.map((entry, index) => {
                const position = index + 1;
                const isCurrentUser = entry.user_id === user?.id;

                return (
                  <div
                    key={entry.user_id}
                    className={cn(
                      "grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-lg border transition-colors",
                      getPositionStyle(position),
                      isCurrentUser && "ring-2 ring-primary"
                    )}
                  >
                    {/* Position */}
                    <div className="col-span-2 sm:col-span-1 flex items-center justify-center">
                      {getPositionIcon(position)}
                    </div>

                    {/* User */}
                    <div className="col-span-10 sm:col-span-5 flex items-center gap-3">
                      <UserAvatar
                        avatarUrl={getAvatarUrl(entry.avatar_url)}
                        firstName={entry.display_name.split(" ")[0]}
                        lastName={entry.display_name.split(" ")[1]}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate flex items-center gap-2">
                          {entry.display_name}
                          {isCurrentUser && (
                            <span className="text-xs text-primary">(você)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <AchievementBadges
                            wins={entry.wins}
                            participations={entry.participations}
                            totalPrizes={entry.total_prizes}
                            compact
                          />
                        </div>
                        <div className="sm:hidden text-xs text-muted-foreground mt-1">
                          {entry.wins} vitórias • {formatCurrency(entry.total_prizes)}
                        </div>
                      </div>
                    </div>

                    {/* Wins */}
                    <div className="hidden sm:flex col-span-2 items-center justify-center gap-1">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span className="font-semibold">{entry.wins}</span>
                    </div>

                    {/* Participations */}
                    <div className="hidden sm:block col-span-2 text-center text-muted-foreground">
                      {entry.participations}
                    </div>

                    {/* Prizes */}
                    <div className="hidden sm:block col-span-2 text-right font-semibold text-primary">
                      {formatCurrency(entry.total_prizes)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Nenhum ranking disponível</p>
              <p className="text-sm">As competições finalizadas aparecerão aqui.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
