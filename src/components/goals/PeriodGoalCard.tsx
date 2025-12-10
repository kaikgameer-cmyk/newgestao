import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DayData {
  date: string;
  goal: number | null;
  revenue: number;
}

interface PeriodGoalCardProps {
  days: DayData[];
  periodLabel: string;
}

/**
 * Card component displaying goals summary for a multi-day period
 * Shows total goal vs total revenue with daily breakdown
 */
export function PeriodGoalCard({ days, periodLabel }: PeriodGoalCardProps) {
  const totalGoal = days.reduce((sum, day) => sum + (day.goal || 0), 0);
  const totalRevenue = days.reduce((sum, day) => sum + day.revenue, 0);
  const daysWithGoal = days.filter(day => day.goal !== null && day.goal > 0).length;
  const percentage = totalGoal > 0 ? Math.min((totalRevenue / totalGoal) * 100, 100) : 0;
  const achieved = totalGoal > 0 && totalRevenue >= totalGoal;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}`;
  };

  if (daysWithGoal === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Target className="h-4 w-4" />
            Metas do Período
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
          <TrendingUp className="h-4 w-4" />
          Resumo de Metas - {periodLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Meta Total</p>
            <p className="text-xl font-semibold text-foreground">{formatCurrency(totalGoal)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Faturado Total</p>
            <p className="text-xl font-semibold text-foreground">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>

        <Progress value={percentage} className="h-3" />

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {percentage.toFixed(0)}% da meta ({daysWithGoal} dias com meta)
          </span>
          <span className={cn(
            "font-medium",
            achieved ? "text-green-500" : "text-red-500"
          )}>
            {achieved ? '✅ Meta batida' : '❌ Meta não batida'}
          </span>
        </div>

        {/* Daily breakdown */}
        <div className="border-t border-border pt-3 mt-3">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Detalhamento por dia
          </p>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {days.map((day) => {
              const dayPercentage = day.goal && day.goal > 0 
                ? (day.revenue / day.goal) * 100 
                : 0;
              const dayAchieved = day.goal && day.revenue >= day.goal;
              
              return (
                <div key={day.date} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{formatDate(day.date)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {day.goal ? formatCurrency(day.goal) : 'Sem meta'}
                    </span>
                    <span className="text-foreground font-medium">
                      {formatCurrency(day.revenue)}
                    </span>
                    {day.goal && day.goal > 0 && (
                      <span className={cn(
                        "text-xs",
                        dayAchieved ? "text-green-500" : "text-red-500"
                      )}>
                        {dayPercentage.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
