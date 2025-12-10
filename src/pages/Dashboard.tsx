import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Calendar, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { GlobalDateFilter } from "@/components/GlobalDateFilter";
import { DatePreset, useDateFilterPresets } from "@/hooks/useDateFilterPresets";
import { DateRange } from "react-day-picker";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCombinedExpenses } from "@/hooks/useCombinedExpenses";
import { useRecurringExpenses, calculateDailyRecurringAmount } from "@/hooks/useRecurringExpenses";
import { ProfitComparisonChart } from "@/components/charts/ProfitComparisonChart";
import { ExpensesByCategoryChart } from "@/components/charts/ExpensesByCategoryChart";
import { DailyGoalCard } from "@/components/goals/DailyGoalCard";
import { PeriodGoalCard } from "@/components/goals/PeriodGoalCard";
import { GoalEditor } from "@/components/goals/GoalEditor";
import { useDailyGoals } from "@/hooks/useDailyGoals";
import { format, eachDayOfInterval, isSameDay } from "date-fns";
import { parseLocalDate, formatLocalDate } from "@/lib/dateUtils";

const COLORS = [
  "hsl(48, 96%, 53%)",
  "hsl(142, 76%, 36%)",
  "hsl(0, 84%, 60%)",
  "hsl(217, 91%, 60%)",
  "hsl(0, 0%, 50%)",
];

export default function Dashboard() {
  const { user } = useAuth();
  
  // Global date filter state
  const [preset, setPreset] = useState<DatePreset>("thisMonth");
  const [customRange, setCustomRange] = useState<DateRange>();
  const { dateRange, formattedRange } = useDateFilterPresets(preset, customRange);

  const periodStart = dateRange.from!;
  const periodEnd = dateRange.to || dateRange.from!;

  // Fetch revenues for selected period
  const { data: revenues = [] } = useQuery({
    queryKey: ["revenues", user?.id, formattedRange.from, formattedRange.to],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("revenues")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", formattedRange.from)
        .lte("date", formattedRange.to);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!formattedRange.from,
  });

  // Fetch combined expenses (expenses + fuel logs)
  const { combinedExpenses, totalExpenses } = useCombinedExpenses(
    user?.id,
    periodStart,
    periodEnd
  );

  // Fetch recurring expenses
  const { recurringExpenses } = useRecurringExpenses(user?.id);

  // Fetch daily goals
  const { getGoalForDate, getGoalsForPeriod } = useDailyGoals();

  // Calculate recurring expenses for the period
  const daysInPeriod = eachDayOfInterval({ start: periodStart, end: periodEnd }).length;
  const periodRecurringTotal = recurringExpenses
    .filter((e) => e.is_active && e.start_date <= formattedRange.to && (!e.end_date || e.end_date >= formattedRange.from))
    .reduce((sum, e) => sum + (e.amount / 30) * daysInPeriod, 0);

  // Calculate KPIs
  const totalRevenue = revenues.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalAllExpenses = totalExpenses + periodRecurringTotal;
  const netProfit = totalRevenue - totalAllExpenses;
  
  // Calculate average per day based on days with revenue
  const daysWithRevenue = new Set(revenues.map((r) => r.date)).size;
  const avgPerDay = daysWithRevenue > 0 ? netProfit / daysWithRevenue : 0;

  // Determine if single day or period view for goals
  const isSingleDay = isSameDay(periodStart, periodEnd);
  const currentDayGoal = isSingleDay ? getGoalForDate(periodStart) : null;

  // Build period goals data for multi-day view
  const periodGoalsData = !isSingleDay
    ? eachDayOfInterval({ start: periodStart, end: periodEnd }).map((day) => {
        const dateStr = formatLocalDate(day);
        const dayRevenue = revenues
          .filter((r) => r.date === dateStr)
          .reduce((sum, r) => sum + Number(r.amount), 0);
        return {
          date: dateStr,
          goal: getGoalForDate(day),
          revenue: dayRevenue,
        };
      })
    : [];

  // Group combined expenses by category (includes fuel)
  const expensesByCategory = combinedExpenses.reduce((acc, expense) => {
    const category = expense.category || "Outros";
    acc[category] = (acc[category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  // Add recurring expenses as a category
  if (periodRecurringTotal > 0) {
    expensesByCategory["despesas_fixas"] = periodRecurringTotal;
  }

  const categoryLabels: Record<string, string> = {
    combustivel: "Combustível",
    manutencao: "Manutenção",
    lavagem: "Lavagem",
    pedagio: "Pedágio",
    estacionamento: "Estacionamento",
    alimentacao: "Alimentação",
    cartao: "Cartão",
    outro: "Outro",
    despesas_fixas: "Despesas Fixas",
  };

  const expenseCategoriesData = Object.entries(expensesByCategory).map(([name, value], index) => ({
    name: categoryLabels[name] || name,
    value,
    color: COLORS[index % COLORS.length],
  }));

  // Daily profit data (including recurring expenses)
  const daysInterval = eachDayOfInterval({ start: periodStart, end: periodEnd });
  const dailyData = daysInterval.map((day) => {
    const dayRevenues = revenues
      .filter((r) => isSameDay(parseLocalDate(r.date), day))
      .reduce((sum, r) => sum + Number(r.amount), 0);
    const dayExpenses = combinedExpenses
      .filter((e) => isSameDay(parseLocalDate(e.date), day))
      .reduce((sum, e) => sum + e.amount, 0);
    
    // Add daily recurring expenses
    const dailyRecurring = calculateDailyRecurringAmount(recurringExpenses, day);
    
    return {
      day: format(day, "dd"),
      lucro: dayRevenues - dayExpenses - dailyRecurring.total,
    };
  });

  const hasData = revenues.length > 0 || combinedExpenses.length > 0;

  const kpis = [
    {
      title: "Receita Total",
      value: `R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      change: "",
      changeType: "positive" as const,
      icon: DollarSign,
    },
    {
      title: "Despesas",
      value: `R$ ${totalAllExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      change: "",
      changeType: "positive" as const,
      icon: TrendingDown,
    },
    {
      title: "Lucro Líquido",
      value: `R$ ${netProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      change: "",
      changeType: netProfit >= 0 ? "positive" as const : "negative" as const,
      icon: TrendingUp,
    },
    {
      title: "Média/Dia",
      value: `R$ ${avgPerDay.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      change: "",
      changeType: "positive" as const,
      icon: Calendar,
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Acompanhe seus resultados financeiros
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <GlobalDateFilter
            preset={preset}
            onPresetChange={setPreset}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
            className="flex-wrap"
          />
          {isSingleDay && (
            <GoalEditor date={periodStart} currentGoal={currentDayGoal} />
          )}
        </div>
      </div>

      {/* Goals Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isSingleDay ? (
          <DailyGoalCard
            goal={currentDayGoal}
            revenue={totalRevenue}
            label={`Meta de ${format(periodStart, "dd/MM/yyyy")}`}
          />
        ) : (
          <PeriodGoalCard
            days={periodGoalsData}
            periodLabel={
              preset === "last7days"
                ? "Últimos 7 dias"
                : preset === "last30days"
                ? "Últimos 30 dias"
                : preset === "thisMonth"
                ? "Este mês"
                : "Período selecionado"
            }
          />
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi, index) => (
          <Card key={index} variant="elevated" className="hover:border-primary/20 transition-colors">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <kpi.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
              </div>
              <p className="text-lg sm:text-2xl font-bold truncate">{kpi.value}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{kpi.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State or Charts */}
      {!hasData ? (
        <Card variant="elevated" className="p-8 sm:p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <PlusCircle className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Comece a registrar seus lançamentos</h3>
              <p className="text-muted-foreground max-w-md">
                Adicione suas receitas e despesas para ver seus resultados aqui. 
                Quanto mais dados você registrar, mais útil será seu dashboard.
              </p>
            </div>
            <Button variant="hero" size="lg" asChild>
              <Link to="/dashboard/lancamentos">
                <PlusCircle className="w-5 h-5 mr-2" />
                Adicionar Lançamento
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Area Chart - Daily Profit */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="text-lg">Lucro Diário</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(48, 96%, 53%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(48, 96%, 53%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 20%)" />
                    <XAxis
                      dataKey="day"
                      stroke="hsl(0, 0%, 50%)"
                      tick={{ fill: "hsl(0, 0%, 60%)", fontSize: 12 }}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="hsl(0, 0%, 50%)"
                      tick={{ fill: "hsl(0, 0%, 60%)", fontSize: 12 }}
                      tickFormatter={(value) => `R$${value}`}
                      tickLine={false}
                      width={60}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Lucro"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="lucro"
                      stroke="hsl(48, 96%, 53%)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorLucro)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Pie Chart - Expense Categories (Responsive Component) */}
          <ExpensesByCategoryChart data={expenseCategoriesData} />
        </div>
      )}

      {/* Profit Comparison Chart - Always show if there's any data */}
      {hasData && (
        <ProfitComparisonChart userId={user?.id} />
      )}
    </div>
  );
}
