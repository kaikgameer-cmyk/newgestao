import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrencyBRL } from '@/lib/format';

interface DailyGoalCardProps {
  goal: number | null;
  revenue: number;
  label?: string;
}

/**
 * Compact card component displaying daily goal vs actual revenue
 * Shows progress bar and achievement status
 * Design: Neutral card, semantic colors only on values
 */
export function DailyGoalCard({ goal, revenue, label = 'Meta do Dia' }: DailyGoalCardProps) {
  const hasGoal = goal !== null && goal > 0;
  const percentage = hasGoal ? Math.min((revenue / goal) * 100, 100) : 0;
  const achieved = hasGoal && revenue >= goal;

  if (!hasGoal) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0">
              <Target className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">
                Nenhuma meta definida para este dia
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* Header with percentage */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0">
              <Target className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{label}</p>
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium",
                achieved ? "text-positive" : "text-negative"
              )}>
                {achieved ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    Meta batida
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3" />
                    Meta não batida
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className={cn(
              "text-lg font-semibold",
              achieved ? "text-positive" : "text-foreground"
            )}>
              {percentage.toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground">da meta</p>
          </div>
        </div>

        {/* Progress bar */}
        <Progress value={percentage} className="h-2" />

        {/* Stats */}
        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="text-muted-foreground">Meta: </span>
            <span className="font-medium text-foreground">{formatCurrencyBRL(goal)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Faturado: </span>
            <span className={cn(
              "font-medium",
              revenue >= goal ? "text-positive" : "text-foreground"
            )}>
              {formatCurrencyBRL(revenue)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
