import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyGoalCardProps {
  goal: number | null;
  revenue: number;
  label?: string;
}

/**
 * Card component displaying daily goal vs actual revenue
 * Shows progress bar and achievement status
 */
export function DailyGoalCard({ goal, revenue, label = 'Meta do Dia' }: DailyGoalCardProps) {
  const hasGoal = goal !== null && goal > 0;
  const percentage = hasGoal ? Math.min((revenue / goal) * 100, 100) : 0;
  const achieved = hasGoal && revenue >= goal;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (!hasGoal) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Target className="h-4 w-4" />
            {label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Nenhuma meta definida para este período
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "bg-card border-border transition-all",
      achieved && "border-green-500/50 bg-green-500/5"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Target className="h-4 w-4" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Meta</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(goal)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Faturado</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(revenue)}</p>
          </div>
        </div>

        <Progress value={percentage} className="h-2" />

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {percentage.toFixed(0)}% da meta
          </span>
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium",
            achieved ? "text-green-500" : "text-red-500"
          )}>
            {achieved ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Meta batida
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4" />
                Meta não batida
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
