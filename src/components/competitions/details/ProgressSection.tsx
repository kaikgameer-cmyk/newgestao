import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target, Trophy, Users } from "lucide-react";
import { formatCurrencyBRL } from "@/lib/format";

interface ProgressSectionProps {
  totalCompetition: number;
  totalUser: number;
  totalUserTeam: number;
  /** Meta individual definida pelo host (por participante) */
  individualGoalValue: number;
  /** Meta total dinâmica (meta individual × participantes ativos) */
  totalGoalValue: number;
  progressPercent: number;
  remaining: number;
  participantsCount: number;
  isMember: boolean;
  allowTeams: boolean;
  teamId: string | null;
  result: {
    meta_reached: boolean;
    winner_name: string | null;
    winner_score: number;
  } | null;
}

export function ProgressSection({
  totalCompetition,
  totalUser,
  totalUserTeam,
  individualGoalValue,
  totalGoalValue,
  progressPercent,
  remaining,
  participantsCount,
  isMember,
  allowTeams,
  teamId,
  result,
}: ProgressSectionProps) {
  const metaReached = result?.meta_reached || progressPercent >= 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Progresso da Competição
        </CardTitle>
        <CardDescription>
          Acompanhe o progresso em direção à meta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Competition Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Meta da Competição
            </span>
            <span className="text-sm text-muted-foreground">
              {progressPercent.toFixed(1)}%
            </span>
          </div>
          <Progress value={Math.min(progressPercent, 100)} className="h-3" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Arrecadado: <span className="text-foreground font-medium">{formatCurrencyBRL(totalCompetition)}</span>
            </span>
            <span className="text-muted-foreground text-right">
              <span className="block">
                Meta total ({participantsCount} participantes):
              </span>
              <span className="text-foreground font-medium">
                {formatCurrencyBRL(totalGoalValue)}
              </span>
            </span>
          </div>
          {!metaReached && (
            <p className="text-xs text-muted-foreground">
              Faltam <span className="font-medium text-foreground">{formatCurrencyBRL(remaining)}</span> para bater a meta
            </p>
          )}
          {metaReached && (
            <div className="flex items-center gap-2 text-primary text-sm font-medium">
              <Trophy className="w-4 h-4" />
              Meta atingida!
              {result?.winner_name && (
                <span className="text-muted-foreground">
                  Vencedor: {result.winner_name}
                </span>
              )}
            </div>
          )}
        </div>

        {/* User Progress - only for members */}
        {isMember && (
          <div className="border-t pt-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Sua Contribuição</span>
                <span className="text-sm font-medium text-primary">
                  {formatCurrencyBRL(totalUser)}
                </span>
              </div>
              <Progress 
                value={individualGoalValue > 0 ? Math.min((totalUser / individualGoalValue) * 100, 100) : 0} 
                className="h-2" 
              />
              <p className="text-xs text-muted-foreground">
                {individualGoalValue > 0 
                  ? `${((totalUser / individualGoalValue) * 100).toFixed(1)}% da meta individual`
                  : "Sem meta definida"
                }
              </p>
            </div>

            {/* Team Progress - only if in a team */}
            {allowTeams && teamId && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Seu Time
                  </span>
                  <span className="text-sm font-medium text-primary">
                    {formatCurrencyBRL(totalUserTeam)}
                  </span>
                </div>
                <Progress 
                  value={individualGoalValue > 0 ? Math.min((totalUserTeam / individualGoalValue) * 100, 100) : 0} 
                  className="h-2" 
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
