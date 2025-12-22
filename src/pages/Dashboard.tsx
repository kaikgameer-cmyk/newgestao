import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Calendar, PlusCircle, Clock, Target, CheckCircle2, XCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useDashboardFilter } from "@/hooks/useDashboardFilter";
import { DashboardFilterBar } from "@/components/dashboard/DashboardFilterBar";
import { useIncomeDay } from "@/hooks/useIncomeDay";
import { useIncomeDays } from "@/hooks/useIncomeDays";
import { IncomeDayForm } from "@/components/income/IncomeDayForm";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useAuth } from "@/hooks/useAuth";
import { useCombinedExpenses } from "@/hooks/useCombinedExpenses";
import { useRecurringExpenses, calculateDailyRecurringAmount, calculatePeriodRecurringAmount } from "@/hooks/useRecurringExpenses";
import { ProfitComparisonChart } from "@/components/charts/ProfitComparisonChart";
import { ExpensesByCategoryChart } from "@/components/charts/ExpensesByCategoryChart";
import { DailyGoalCard } from "@/components/goals/DailyGoalCard";
import { PeriodGoalCard } from "@/components/goals/PeriodGoalCard";
import { GoalEditor } from "@/components/goals/GoalEditor";
import { useDailyGoals } from "@/hooks/useDailyGoals";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { useMaintenance } from "@/hooks/useMaintenance";
import { MaintenanceSummaryCard } from "@/components/maintenance/MaintenanceSummaryCard";
import { DayMetricsPanel } from "@/components/dashboard/DayMetricsPanel";
import { PlatformBreakdownCard } from "@/components/dashboard/PlatformBreakdownCard";
import { PeriodPlatformBreakdownCard } from "@/components/dashboard/PeriodPlatformBreakdownCard";
import { DailySummaryCard } from "@/components/dashboard/DailySummaryCard";
import { useRevenueByPlatform } from "@/hooks/useRevenueByPlatform";
import { format, eachDayOfInterval, isSameDay, differenceInDays } from "date-fns";
import { parseLocalDate, formatLocalDate } from "@/lib/dateUtils";
import { Badge } from "@/components/ui/badge";

const COLORS = [
  "hsl(48, 96%, 53%)",
  "hsl(142, 76%, 36%)",
  "hsl(0, 84%, 60%)",
  "hsl(217, 91%, 60%)",
  "hsl(0, 0%, 50%)",
];

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // New unified filter state with URL persistence
  const filter = useDashboardFilter();
  const { mode, startDate, endDate, isSingleDay } = filter;

  // Convert string dates to Date objects for hooks that need them
  const periodStart = parseLocalDate(startDate);
  const periodEnd = parseLocalDate(endDate);

  // In "day" mode, we use the same UI for single day or range
  const isDayMode = mode === "day";
  const isRange = !isSingleDay;
  const daysCount = differenceInDays(periodEnd, periodStart) + 1;

  // Fetch revenues for selected period (legacy)
  const { data: revenues = [] } = useQuery({
    queryKey: ["revenues", user?.id, startDate, endDate],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("revenues")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
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
  const { getGoalForDate, getGoalsForPeriod, getTotalGoalsForPeriod } = useDailyGoals();
  
  // Fetch expense categories for icons
  const { enabledCategories } = useExpenseCategories();

  // Fetch maintenance data
  const { getCounts: getMaintenanceCounts } = useMaintenance();
  const maintenanceCounts = getMaintenanceCounts();

  // Fetch income_day data for the new model (single day)
  const { incomeDay } = useIncomeDay(isSingleDay ? periodStart : undefined);
  
  // Fetch income_days for period (aggregated data)
  const { 
    totalRevenue: incomeDaysTotalRevenue,
    totalTrips: incomeDaysTotalTrips,
    totalKm: incomeDaysTotalKm,
    totalMinutes: incomeDaysTotalMinutes,
    platformBreakdown: incomeDaysPlatformBreakdown,
    incomeDays,
  } = useIncomeDays(periodStart, periodEnd);

  // Fetch revenue by platform for period view
  const { 
    platformRevenues, 
    totalRevenue: platformTotalRevenue, 
    isLoading: loadingPlatformRevenues 
  } = useRevenueByPlatform(periodStart, periodEnd);

  // State for income day form
  const [isIncomeDayFormOpen, setIsIncomeDayFormOpen] = useState(false);

  // Calculate recurring expenses for the period
  const daysInPeriod = eachDayOfInterval({ start: periodStart, end: periodEnd }).length;
  const periodRecurringTotal = calculatePeriodRecurringAmount(recurringExpenses, periodStart, periodEnd);

  // Calculate KPIs - use income_days data when available
  const totalRevenue = incomeDaysTotalRevenue > 0 ? incomeDaysTotalRevenue : revenues.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalAllExpenses = totalExpenses + periodRecurringTotal;
  const netProfit = totalRevenue - totalAllExpenses;

  // Goal calculations
  const currentDayGoal = isSingleDay ? getGoalForDate(periodStart) : null;
  const totalGoalForPeriod = getTotalGoalsForPeriod(periodStart, periodEnd);

  // For range: meta total do período = soma das metas diárias
  const goalProgress = totalGoalForPeriod > 0 ? (totalRevenue / totalGoalForPeriod) * 100 : 0;

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
    eletrico: "Elétrico",
    manutencao: "Manutenção",
    lavagem: "Lavagem",
    pedagio: "Pedágio",
    estacionamento: "Estacionamento",
    alimentacao: "Alimentação",
    cartao: "Cartão",
    outro: "Outro",
    despesas_fixas: "Despesas Fixas",
  };

  const expenseCategoriesData = Object.entries(expensesByCategory).map(([key, value], index) => {
    const category = enabledCategories.find(c => c.key === key);
    return {
      name: category?.name || categoryLabels[key] || key,
      value,
      color: category?.color || COLORS[index % COLORS.length],
      icon: category?.icon || null,
    };
  });

  // Build period goals data for multi-day view
  const periodGoalsData = isRange
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

  // Goals summary for period view
  const goalsForPeriod = getGoalsForPeriod(periodStart, periodEnd);
  const daysWithGoal = goalsForPeriod.size;
  const daysWithoutGoal = daysInPeriod - daysWithGoal;
  const hasGoalsInPeriod = daysWithGoal > 0;

  // Calculate average per day based on days with revenue
  const daysWithRevenue = new Set(revenues.map((r) => r.date)).size;
  const avgPerDay = daysWithRevenue > 0 ? netProfit / daysWithRevenue : 0;

  // Daily profit data (for charts in non-day modes)
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
      day: DAY_NAMES[day.getDay()],
      fullDate: format(day, "dd/MM"),
      lucro: dayRevenues - dayExpenses - dailyRecurring.total,
      receita: dayRevenues,
      despesa: dayExpenses + dailyRecurring.total,
    };
  });

  const hasData = totalRevenue > 0 || totalAllExpenses > 0;

  // Period view KPIs (for week/month/year modes)
  const periodKpis = [
    {
      title: "Receita Total",
      value: `R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      highlight: false,
    },
    {
      title: "Despesas",
      value: `R$ ${totalAllExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingDown,
      highlight: false,
    },
    {
      title: "Lucro Líquido",
      value: `R$ ${netProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      highlight: true,
      isNegative: netProfit < 0,
    },
    {
      title: "Dias Rodados",
      value: daysWithRevenue.toString(),
      icon: Calendar,
      highlight: false,
    },
    {
      title: "Média/Dia",
      value: `R$ ${avgPerDay.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Clock,
      highlight: false,
    },
  ];

  // === DAY MODE (single day or range with same UI) ===
  if (isDayMode) {
    // Use aggregated data from income_days
    const dayTotalTrips = isSingleDay && incomeDay 
      ? incomeDay.items.reduce((sum, item) => sum + item.trips, 0)
      : incomeDaysTotalTrips;
    
    const dayKmRodados = isSingleDay && incomeDay
      ? incomeDay.km_rodados || 0
      : incomeDaysTotalKm;
    
    const dayWorkedMinutes = isSingleDay && incomeDay
      ? incomeDay.hours_minutes || 0
      : incomeDaysTotalMinutes;
    
    const dayRevenue = totalRevenue;

    // Platform breakdown - build from income_days data
    const dayPlatformRevenues = isSingleDay && incomeDay
      ? incomeDay.items.map(item => ({
          app: item.platform === "outro" && item.platform_label ? item.platform_label : item.platform,
          amount: item.amount,
        }))
      : Object.entries(incomeDaysPlatformBreakdown).map(([key, data]) => ({
          app: key,
          amount: data.amount,
        }));

    // Period label
    const periodLabel = isSingleDay
      ? `Dia ${format(periodStart, "dd/MM/yyyy")}`
      : `Período: ${format(periodStart, "dd/MM")} – ${format(periodEnd, "dd/MM")} (${daysCount} dias)`;

    // Goal label for range
    const goalLabel = isSingleDay
      ? `Meta de ${format(periodStart, "dd/MM/yyyy")}`
      : `Meta do Período (${daysCount} dias)`;

    const handleDayRefresh = async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["revenues"] }),
        queryClient.invalidateQueries({ queryKey: ["income-day"] }),
        queryClient.invalidateQueries({ queryKey: ["income-days"] }),
        queryClient.invalidateQueries({ queryKey: ["combined-expenses"] }),
        queryClient.invalidateQueries({ queryKey: ["revenue-by-platform"] }),
      ]);
    };

    return (
      <PullToRefresh onRefresh={handleDayRefresh} className="h-full">
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">
                Acompanhe seus resultados financeiros
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <DashboardFilterBar filter={filter} />

          {/* Period Badge for range */}
          {isRange && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 px-3 py-1">
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                {periodLabel}
              </Badge>
            </div>
          )}

          {/* Goal Editor for single day view */}
          {isSingleDay && (
            <div className="flex items-center gap-2">
              <GoalEditor date={periodStart} currentGoal={currentDayGoal} />
            </div>
          )}
        </div>

        {/* Income Day Form Modal */}
        <IncomeDayForm
          open={isIncomeDayFormOpen}
          onOpenChange={setIsIncomeDayFormOpen}
          selectedDate={periodStart}
          existingData={isSingleDay ? incomeDay : undefined}
        />

        {/* Button to add/edit income (only for single day) */}
        {isSingleDay && (
          <div className="flex justify-end">
            <Button
              variant={incomeDay ? "outline" : "hero"}
              onClick={() => setIsIncomeDayFormOpen(true)}
            >
              {incomeDay ? (
                <>
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar Receita do Dia
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Lançar Receita do Dia
                </>
              )}
            </Button>
          </div>
        )}

        {/* ORDER: A) Meta */}
        {isSingleDay ? (
          <DailyGoalCard
            goal={currentDayGoal}
            revenue={dayRevenue}
            label={goalLabel}
          />
        ) : hasGoalsInPeriod ? (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                {goalLabel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Meta Total</p>
                    <p className="text-lg font-bold text-primary">
                      R$ {totalGoalForPeriod.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Faturado</p>
                    <p className="text-lg font-bold text-success">
                      R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progresso</span>
                    <div className="flex items-center gap-1">
                      {goalProgress >= 100 ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : (
                        <XCircle className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className={`font-bold ${goalProgress >= 100 ? "text-success" : "text-foreground"}`}>
                        {goalProgress.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${goalProgress >= 100 ? "bg-success" : "bg-primary"}`}
                      style={{ width: `${Math.min(goalProgress, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border text-sm">
                  <span className="text-muted-foreground">Dias com meta</span>
                  <span className="font-medium">
                    {daysWithGoal} / {daysCount} dias
                  </span>
                </div>
                {daysWithoutGoal > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {daysWithoutGoal} {daysWithoutGoal === 1 ? "dia" : "dias"} sem meta definida
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                {goalLabel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-4 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                  <Target className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Nenhuma meta definida para esse período.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/dashboard/metas">Definir Metas</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ORDER: B) Resumo do dia/período */}
        <DailySummaryCard
          revenues={revenues}
          expenses={combinedExpenses}
          recurringTotal={isSingleDay 
            ? calculateDailyRecurringAmount(recurringExpenses, periodStart).total 
            : periodRecurringTotal
          }
          totalRevenue={dayRevenue}
          totalExpenses={totalAllExpenses}
          netProfit={dayRevenue - totalAllExpenses}
        />

        {/* ORDER: C) Receita por plataforma */}
        {dayPlatformRevenues.length > 0 && (
          <PlatformBreakdownCard revenues={dayPlatformRevenues} />
        )}

        {/* ORDER: D) Métricas do dia/período */}
        <DayMetricsPanel
          totalTrips={dayTotalTrips}
          workedMinutes={dayWorkedMinutes}
          kmRodados={dayKmRodados}
          revenue={dayRevenue}
          expenses={totalAllExpenses}
        />

        {/* ORDER: E) Despesas por categoria */}
        {expenseCategoriesData.length > 0 && (
          <ExpensesByCategoryChart data={expenseCategoriesData} compact />
        )}

        {/* ORDER: F) Manutenções */}
        {maintenanceCounts.total > 0 && (
          <MaintenanceSummaryCard
            total={maintenanceCounts.total}
            ok={maintenanceCounts.ok}
            warning={maintenanceCounts.warning}
            overdue={maintenanceCounts.overdue}
            compact
          />
        )}
      </div>
      </PullToRefresh>
    );
  }

  const handlePeriodRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["revenues"] }),
      queryClient.invalidateQueries({ queryKey: ["income-days"] }),
      queryClient.invalidateQueries({ queryKey: ["combined-expenses"] }),
      queryClient.invalidateQueries({ queryKey: ["revenue-by-platform"] }),
    ]);
  };

  // === NON-DAY MODES (week, month, year) ===
  return (
    <PullToRefresh onRefresh={handlePeriodRefresh} className="h-full">
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Acompanhe seus resultados financeiros
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <DashboardFilterBar filter={filter} />
      </div>

      {/* Goals Section */}
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
            mode === "week"
              ? "Esta semana"
              : mode === "month"
              ? "Este mês"
              : mode === "year"
              ? "Este ano"
              : "Período selecionado"
          }
        />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {periodKpis.map((kpi, index) => (
          <Card
            key={index}
            variant={kpi.highlight ? "elevated" : "default"}
            className={kpi.highlight ? "bg-gradient-card border-primary/30" : ""}
          >
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className={`w-4 h-4 ${kpi.highlight ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-xs text-muted-foreground">{kpi.title}</span>
              </div>
              <p className={`text-lg sm:text-xl font-bold truncate ${kpi.highlight && !kpi.isNegative ? "text-primary" : ""} ${kpi.isNegative ? "text-destructive" : ""}`}>
                {kpi.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Maintenance + Platform Revenue Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Maintenance Summary */}
        <MaintenanceSummaryCard
          total={maintenanceCounts.total}
          ok={maintenanceCounts.ok}
          warning={maintenanceCounts.warning}
          overdue={maintenanceCounts.overdue}
          compact
        />

        {/* Platform Revenue Breakdown */}
        <PeriodPlatformBreakdownCard
          platformRevenues={platformRevenues}
          totalRevenue={platformTotalRevenue}
          isLoading={loadingPlatformRevenues}
        />
      </div>

      {/* Empty State */}
      {!hasData && (
        <Card variant="elevated" className="p-8 sm:p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <PlusCircle className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Comece a registrar seus lançamentos</h3>
              <p className="text-muted-foreground max-w-md">
                Adicione suas receitas e despesas para ver seus resultados aqui.
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
      )}

      {/* Charts */}
      {hasData && (
        <>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Bar Chart - Daily Profit */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="text-lg">Lucro por Dia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 20%)" />
                      <XAxis
                        dataKey={daysInPeriod > 7 ? "fullDate" : "day"}
                        stroke="hsl(0, 0%, 50%)"
                        tick={{ fill: "hsl(0, 0%, 60%)", fontSize: 12 }}
                      />
                      <YAxis
                        stroke="hsl(0, 0%, 50%)"
                        tick={{ fill: "hsl(0, 0%, 60%)" }}
                        tickFormatter={(value) => `R$${value}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Lucro"]}
                      />
                      <Bar dataKey="lucro" fill="hsl(48, 96%, 53%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Stacked Bar Chart - Revenue vs Expenses */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="text-lg">Receitas vs Despesas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 20%)" />
                      <XAxis
                        dataKey={daysInPeriod > 7 ? "fullDate" : "day"}
                        stroke="hsl(0, 0%, 50%)"
                        tick={{ fill: "hsl(0, 0%, 60%)", fontSize: 12 }}
                      />
                      <YAxis stroke="hsl(0, 0%, 50%)" tick={{ fill: "hsl(0, 0%, 60%)" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="receita" fill="hsl(142, 76%, 36%)" stackId="a" name="Receita" />
                      <Bar dataKey="despesa" fill="hsl(0, 84%, 60%)" stackId="a" radius={[4, 4, 0, 0]} name="Despesa" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Goals Summary + Expense Categories */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Goals Summary Card */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Metas do Período
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasGoalsInPeriod ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Meta Total</p>
                        <p className="text-lg font-bold text-primary">
                          R$ {totalGoalForPeriod.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Faturado</p>
                        <p className="text-lg font-bold text-success">
                          R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progresso</span>
                        <div className="flex items-center gap-1">
                          {goalProgress >= 100 ? (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          ) : (
                            <XCircle className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className={`font-bold ${goalProgress >= 100 ? "text-success" : "text-foreground"}`}>
                            {goalProgress.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all ${goalProgress >= 100 ? "bg-success" : "bg-primary"}`}
                          style={{ width: `${Math.min(goalProgress, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border text-sm">
                      <span className="text-muted-foreground">Dias com meta</span>
                      <span className="font-medium">
                        {daysWithGoal} / {daysInPeriod} dias
                      </span>
                    </div>
                    {daysWithoutGoal > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {daysWithoutGoal} {daysWithoutGoal === 1 ? "dia" : "dias"} sem meta definida
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                      <Target className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Nenhuma meta definida para esse período.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/dashboard/metas">Definir Metas</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expense Categories Chart */}
            <ExpensesByCategoryChart data={expenseCategoriesData} />
          </div>
        </>
      )}

      {/* Profit Comparison Chart */}
      {hasData && (
        <ProfitComparisonChart userId={user?.id} />
      )}
    </div>
    </PullToRefresh>
  );
}
