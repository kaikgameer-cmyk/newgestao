import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Crown, Users } from "lucide-react";
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
  const defaultTab = allowTeams && hasTeams ? "teams" : "individual";

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="mb-4">
        {allowTeams && hasTeams && (
          <TabsTrigger value="teams" className="gap-2">
            <Users className="w-4 h-4" />
            Ranking por Times
          </TabsTrigger>
        )}
        <TabsTrigger value="individual" className="gap-2">
          <Trophy className="w-4 h-4" />
          Ranking Individual
        </TabsTrigger>
      </TabsList>

      <TabsContent value="individual">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ranking Individual</CardTitle>
            <CardDescription>
              Classificação baseada em receita acumulada no período
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ranking && ranking.length > 0 ? (
              <div className="space-y-3">
                {ranking.map((member, index) => {
                  const progressPercent = goalValue > 0 
                    ? (member.total_income / goalValue) * 100 
                    : 0;
                  const maxScore = ranking[0]?.total_income || 1;
                  const barWidth = (member.total_income / maxScore) * 100;

                  return (
                    <div
                      key={member.user_id}
                      className={`relative flex items-center gap-4 p-3 rounded-lg overflow-hidden ${
                        member.user_id === currentUserId
                          ? "bg-primary/10 border border-primary/30"
                          : "bg-muted/50"
                      }`}
                    >
                      {/* Progress bar background */}
                      <div 
                        className="absolute inset-0 bg-primary/5 transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                      
                      <div className="relative flex items-center justify-center w-8">
                        {getRankIcon(index)}
                      </div>
                      <div className="relative flex-1 min-w-0">
                        <p className="font-medium truncate flex items-center gap-1">
                          {member.display_name}
                          {member.role === "host" && (
                            <Crown className="w-3 h-3 text-primary" />
                          )}
                          {member.user_id === currentUserId && (
                            <Badge variant="secondary" className="text-xs ml-1">
                              Você
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {progressPercent.toFixed(1)}% da meta
                        </p>
                      </div>
                      <div className="relative text-right">
                        <p className="font-bold text-lg">
                          {formatCurrencyBRL(member.total_income)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Nenhum dado de ranking ainda</p>
                <p className="text-sm mt-1">Registre receitas para aparecer no ranking</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {allowTeams && hasTeams && (
        <TabsContent value="teams">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ranking por Times</CardTitle>
              <CardDescription>
                Soma das receitas dos membros de cada time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamRanking.map((team, index) => {
                  const maxScore = teamRanking[0]?.team_score || 1;
                  const barWidth = (team.team_score / maxScore) * 100;

                  return (
                    <div
                      key={team.team_id}
                      className="relative p-4 rounded-lg bg-muted/50 space-y-3 overflow-hidden"
                    >
                      {/* Progress bar background */}
                      <div 
                        className="absolute inset-0 bg-primary/5 transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                      
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getRankIcon(index)}
                          <span className="font-bold text-lg">{team.team_name}</span>
                        </div>
                        <span className="font-bold text-xl text-primary">
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
                            >
                              {member.display_name}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      )}
    </Tabs>
  );
}
