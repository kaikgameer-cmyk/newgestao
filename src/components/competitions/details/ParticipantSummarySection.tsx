import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";
import { formatCurrencyBRL, formatDecimal } from "@/lib/format";
import type { RankingMember } from "@/hooks/useCompetitionDashboard";

interface ParticipantSummarySectionProps {
  ranking: RankingMember[] | null;
  goalValue: number;
  currentUserId?: string;
}

export function ParticipantSummarySection({
  ranking,
  goalValue,
  currentUserId,
}: ParticipantSummarySectionProps) {
  if (!ranking || ranking.length === 0 || goalValue <= 0) {
    return null;
  }

  const sorted = [...ranking].sort((a, b) => {
    const aPercent = a.total_income / goalValue;
    const bPercent = b.total_income / goalValue;
    if (bPercent !== aPercent) return bPercent - aPercent;
    if (b.total_income !== a.total_income) return b.total_income - a.total_income;
    return a.display_name.localeCompare(b.display_name);
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Resumo por participante</CardTitle>
        </div>
        <CardDescription>
          Meta individual, valor arrecadado e progresso lado a lado
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((member) => {
            const percent = (member.total_income / goalValue) * 100;
            const isCurrentUser = member.user_id === currentUserId;
            const completed = member.total_income >= goalValue;

            return (
              <div
                key={member.user_id}
                className={`relative flex flex-col gap-2 rounded-lg border p-3 md:p-4 bg-muted/40`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">{member.display_name}</span>
                    {isCurrentUser && (
                      <Badge variant="secondary" className="text-[11px] px-1.5 py-0">
                        Você
                      </Badge>
                    )}
                    {completed && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        Concluiu
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDecimal(percent)}% da meta
                  </span>
                </div>

                <div className="flex items-end justify-between gap-3 text-sm">
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground">Meta individual</p>
                    <p className="font-semibold">{formatCurrencyBRL(goalValue)}</p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="text-muted-foreground">Arrecadado</p>
                    <p className="font-semibold">{formatCurrencyBRL(member.total_income)}</p>
                  </div>
                </div>

                <div className="space-y-1 pt-1.5">
                  <Progress value={Math.min(percent, 100)} className="h-2" />
                  <p className="text-[11px] text-muted-foreground flex justify-between">
                    <span>Progresso individual</span>
                    <span>{formatDecimal(percent)}%</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
