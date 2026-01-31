import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  subWeeks, 
  subMonths,
  format,
  eachDayOfInterval,
  isSameDay
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { useCombinedExpenses } from "@/hooks/useCombinedExpenses";
import { useRecurringExpenses, calculateDailyRecurringAmount } from "@/hooks/useRecurringExpenses";
import { parseLocalDate } from "@/lib/dateUtils";
import { formatCurrencyBRL, formatChartAxis, roundCurrency } from "@/lib/format";

interface ProfitComparisonChartProps {
  userId: string | undefined;
}

type ComparisonMode = "weekly" | "monthly";

export function ProfitComparisonChart({ userId }: ProfitComparisonChartProps) {
  const [mode, setMode] = useState<ComparisonMode>("weekly");
  const now = new Date();

  // Generate periods for comparison (last 4 weeks or 4 months)
  const periods = mode === "weekly" 
    ? Array.from({ length: 4 }, (_, i) => {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 0 });
        const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 0 });
        return { 
          start: weekStart, 
          end: weekEnd, 
          label: i === 0 ? "Esta semana" : i === 1 ? "Semana passada" : format(weekStart, "dd/MM", { locale: ptBR })
        };
      }).reverse()
    : Array.from({ length: 4 }, (_, i) => {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(subMonths(now, i));
        return { 
          start: monthStart, 
          end: monthEnd, 
          label: format(monthStart, "MMM", { locale: ptBR })
        };
      }).reverse();

  // Fetch all income days with items for the comparison period
  const { data: allIncomeDays = [] } = useQuery({
    queryKey: ["income-days-comparison", userId, mode],
    queryFn: async () => {
      if (!userId) return [];
      const oldestDate = periods[0].start;
      
      // Fetch income_days
      const { data: days, error: daysError } = await supabase
        .from("income_days")
        .select("*")
        .eq("user_id", userId)
        .gte("date", format(oldestDate, "yyyy-MM-dd"))
        .lte("date", format(now, "yyyy-MM-dd"));
      
      if (daysError) throw daysError;
      if (!days || days.length === 0) return [];

      const dayIds = days.map((d) => d.id);

      // Fetch all items for these days
      const { data: items, error: itemsError } = await supabase
        .from("income_day_items")
        .select("*")
        .in("income_day_id", dayIds);

      if (itemsError) throw itemsError;

      return days.map((day) => ({
        date: day.date,
        amount: (items || [])
          .filter((item) => item.income_day_id === day.id)
          .reduce((sum, item) => sum + Number(item.amount), 0),
      }));
    },
    enabled: !!userId,
  });

  // Fetch all expenses for the comparison period
  const oldestDate = periods[0]?.start || now;
  const { combinedExpenses: allExpenses } = useCombinedExpenses(
    userId,
    oldestDate,
    now
  );

  // Fetch recurring expenses
  const { recurringExpenses } = useRecurringExpenses(userId);

  // Calculate data for each period
  const comparisonData = periods.map((period) => {
    const periodRevenues = allIncomeDays
      .filter((r) => {
        const date = parseLocalDate(r.date);
        return date >= period.start && date <= period.end;
      })
      .reduce((sum, r) => sum + r.amount, 0);

    const periodExpenses = allExpenses
      .filter((e) => {
        const date = parseLocalDate(e.date);
        return date >= period.start && date <= period.end;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    // Calculate recurring expenses for this period
    const daysInPeriod = eachDayOfInterval({ start: period.start, end: period.end });
    const periodRecurring = daysInPeriod.reduce((sum, day) => {
      return sum + calculateDailyRecurringAmount(recurringExpenses, day).total;
    }, 0);

    const totalExpenses = roundCurrency(periodExpenses + periodRecurring);
    const profit = roundCurrency(periodRevenues - totalExpenses);

    return {
      period: period.label,
      receita: roundCurrency(periodRevenues),
      despesa: totalExpenses,
      lucro: profit,
    };
  });

  const hasData = comparisonData.some((d) => d.receita > 0 || d.despesa > 0);

  if (!hasData) {
    return null;
  }

  return (
    <Card variant="elevated">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Evolução do Lucro</CardTitle>
        <Tabs value={mode} onValueChange={(v) => setMode(v as ComparisonMode)}>
          <TabsList className="h-8">
            <TabsTrigger value="weekly" className="text-xs px-3">Semanal</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs px-3">Mensal</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="period"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={formatChartAxis}
                width={65}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
                formatter={(value: number, name: string) => [
                  formatCurrencyBRL(value),
                  name === "receita" ? "Receita" : name === "despesa" ? "Despesa" : "Lucro"
                ]}
                labelStyle={{ fontWeight: "bold", marginBottom: "4px" }}
              />
              <Legend 
                formatter={(value) => 
                  value === "receita" ? "Receita" : value === "despesa" ? "Despesa" : "Lucro"
                }
              />
              {/* Semantic colors: green for revenue, red for expense, blue for profit */}
              <Bar 
                dataKey="receita" 
                fill="hsl(142, 76%, 36%)" 
                radius={[4, 4, 0, 0]} 
                name="receita"
              />
              <Bar 
                dataKey="despesa" 
                fill="hsl(0, 84%, 60%)" 
                radius={[4, 4, 0, 0]} 
                name="despesa"
              />
              <Bar 
                dataKey="lucro" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]} 
                name="lucro"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
