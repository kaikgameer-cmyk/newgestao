import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  TrendingUp, 
  Flame,
  Target,
  BarChart3 
} from "lucide-react";
import { format, parseISO, isWeekend } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDailyCompetitionScores } from "@/hooks/useDailyCompetitionScores";
import { useAuth } from "@/hooks/useAuth";

interface DailyScoresPanelProps {
  startDate: string;
  endDate: string;
  goalValue: number;
  userId?: string;
}

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function DailyScoresPanel({ startDate, endDate, goalValue, userId: propUserId }: DailyScoresPanelProps) {
  const { user } = useAuth();
  const userId = propUserId || user?.id;
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading, error } = useDailyCompetitionScores(
    userId,
    startDate,
    endDate,
    !!userId
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null;
  }

  const { scores, totalAmount, totalTrips, daysWorked, averagePerDay } = data;
  const progressPercent = goalValue > 0 ? Math.min((totalAmount / goalValue) * 100, 100) : 0;
  const bestDay = scores.length > 0 ? scores.reduce((a, b) => a.amount > b.amount ? a : b) : null;

  // Calculate streak (consecutive days worked)
  let currentStreak = 0;
  for (let i = scores.length - 1; i >= 0; i--) {
    if (scores[i].amount > 0) {
      currentStreak++;
    } else {
      break;
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Meu Histórico Diário
            </CardTitle>
            <CardDescription>
              Pontuação dia a dia durante a competição
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-bold text-lg">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Dias Trabalhados</p>
            <p className="font-bold text-lg">{daysWorked}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Média/Dia</p>
            <p className="font-bold text-lg">{formatCurrency(averagePerDay)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Sequência</p>
            <p className="font-bold text-lg flex items-center justify-center gap-1">
              {currentStreak > 0 && <Flame className="w-4 h-4 text-orange-500" />}
              {currentStreak} dias
            </p>
          </div>
        </div>

        {/* Progress to Goal */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Target className="w-3 h-3" />
              Progresso para meta
            </span>
            <span className="font-medium">{progressPercent.toFixed(1)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            {formatCurrency(totalAmount)} de {formatCurrency(goalValue)}
          </p>
        </div>

        {/* Best Day Highlight */}
        {bestDay && bestDay.amount > 0 && (
          <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/30 rounded-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Melhor Dia</p>
              <p className="text-xs text-muted-foreground">
                {format(parseISO(bestDay.date), "EEEE, dd/MM", { locale: ptBR })}
              </p>
            </div>
            <p className="font-bold text-primary">{formatCurrency(bestDay.amount)}</p>
          </div>
        )}

        {/* Expandable Daily Breakdown */}
        {expanded && scores.length > 0 && (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {scores.map((score) => {
                const date = parseISO(score.date);
                const isWeekendDay = isWeekend(date);
                const dayProgress = goalValue > 0 ? (score.amount / (goalValue / 30)) * 100 : 0;

                return (
                  <div
                    key={score.date}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      score.amount > 0 ? "bg-muted/50" : "bg-muted/20 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-2 w-28">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {format(date, "dd/MM", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {format(date, "EEE", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex-1">
                      <Progress 
                        value={Math.min(dayProgress, 100)} 
                        className="h-2" 
                      />
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="font-medium">
                        {score.amount > 0 ? formatCurrency(score.amount) : "—"}
                      </p>
                      {score.trips > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {score.trips} viagens
                        </p>
                      )}
                    </div>
                    {isWeekendDay && (
                      <Badge variant="outline" className="text-xs">
                        FDS
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* No data state */}
        {scores.length === 0 && (
          <p className="text-center text-muted-foreground py-4 text-sm">
            Nenhum registro de receita neste período ainda.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
