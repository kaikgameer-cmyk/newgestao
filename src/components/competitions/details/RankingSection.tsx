import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Crown, Users, TrendingUp } from "lucide-react";
import { formatCurrencyBRL } from "@/lib/format";
import type { RankingMember, TeamRanking } from "@/hooks/useCompetitionDashboard";

interface RankingSectionProps {
  ranking: RankingMember[] | null;
  teamRanking: TeamRanking[] | null;
  allowTeams: boolean;
  currentUserId: string | undefined;
  goalValue: number;
}

export function RankingSection({
  ranking,
  teamRanking,
  allowTeams,
  currentUserId,
  goalValue,
}: RankingSectionProps) {
  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-primary" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-600" />;
    return (
      <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-muted-foreground">
        {index + 1}
      </span>
    );
  };

  const hasTeams = teamRanking && teamRanking.length > 0;
  const hasRanking = ranking && ranking.length > 0;
  const defaultTab = allowTeams && hasTeams ? "teams" : "individual";

  // Empty state component
  const EmptyRanking = () => (
    <div className="text-center py-8 text-muted-foreground">
      <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
      <p className="font-medium">Nenhum dado de ranking ainda</p>
      <p className="text-sm mt-1">
        Registre receitas no período da competição para aparecer no ranking
      </p>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Ranking</CardTitle>
        </div>
        <CardDescription>
          Classificação baseada em receita acumulada no período
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="mb-4 w-full grid grid-cols-2 md:w-auto md:inline-flex">
            {allowTeams && (
              <TabsTrigger value="teams" className="gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Times</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="individual" className="gap-2">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Individual</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="individual" className="mt-0">
            {hasRanking ? (
              <div className="space-y-3">
                {ranking.map((member, index) => {
                  const progressPercent = goalValue > 0 
                    ? (member.total_income / goalValue) * 100 
                    : 0;
                  const maxScore = ranking[0]?.total_income || 1;
                  const barWidth = maxScore > 0 ? (member.total_income / maxScore) * 100 : 0;
                  const isCurrentUser = member.user_id === currentUserId;

                  return (
                    <div
                      key={member.user_id}
                      className={`relative flex items-center gap-3 sm:gap-4 p-3 rounded-lg overflow-hidden transition-all ${
                        isCurrentUser
                          ? "bg-primary/10 border border-primary/30 shadow-sm"
                          : "bg-muted/50"
                      }`}
                    >
                      {/* Progress bar background */}
                      <div 
                        className="absolute inset-0 bg-primary/5 transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                      
                      {/* Position */}
                      <div className="relative flex items-center justify-center w-8 shrink-0">
                        {getRankIcon(index)}
                      </div>
                      
                      {/* Name and info */}
                      <div className="relative flex-1 min-w-0">
                        <div className="font-medium truncate flex items-center gap-1 flex-wrap">
                          <span className="truncate">{member.display_name}</span>
                          {member.role === "host" && (
                            <Crown className="w-3 h-3 text-primary shrink-0" />
                          )}
                          {isCurrentUser && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              Você
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {progressPercent.toFixed(1)}% da meta
                        </p>
                      </div>
                      
                      {/* Score */}
                      <div className="relative text-right shrink-0">
                        <p className="font-bold text-base sm:text-lg">
                          {formatCurrencyBRL(member.total_income)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyRanking />
            )}
          </TabsContent>

          {allowTeams && (
            <TabsContent value="teams" className="mt-0">
              {hasTeams ? (
                <div className="space-y-4">
                  {teamRanking.map((team, index) => {
                    const maxScore = teamRanking[0]?.team_score || 1;
                    const barWidth = maxScore > 0 ? (team.team_score / maxScore) * 100 : 0;
                    const userInTeam = team.members.some(m => m.user_id === currentUserId);

                    return (
                      <div
                        key={team.team_id}
                        className={`relative p-4 rounded-lg space-y-3 overflow-hidden transition-all ${
                          userInTeam 
                            ? "bg-primary/10 border border-primary/30" 
                            : "bg-muted/50"
                        }`}
                      >
                        {/* Progress bar background */}
                        <div 
                          className="absolute inset-0 bg-primary/5 transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                        
                        <div className="relative flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getRankIcon(index)}
                            <span className="font-bold text-base sm:text-lg truncate">{team.team_name}</span>
                            {userInTeam && (
                              <Badge variant="secondary" className="text-xs">
                                Seu time
                              </Badge>
                            )}
                          </div>
                          <span className="font-bold text-lg sm:text-xl text-primary shrink-0">
                            {formatCurrencyBRL(team.team_score)}
                          </span>
                        </div>
                        <div className="relative flex flex-wrap gap-2">
                          {team.members
                            .filter((m) => m.user_id)
                            .map((member) => (
                              <Badge
                                key={member.user_id}
                                variant={member.user_id === currentUserId ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {member.display_name}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">Nenhum time criado</p>
                  <p className="text-sm mt-1">
                    O host pode criar times para a competição
                  </p>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
