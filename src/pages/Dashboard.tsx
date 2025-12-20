import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, DollarSign, Calendar, PlusCircle, Target, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { GlobalDateFilter } from "@/components/GlobalDateFilter";
import { DatePicker } from "@/components/ui/date-picker";
import { DatePreset, useDateFilterPresets } from "@/hooks/useDateFilterPresets";
import { DateRange } from "react-day-picker";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
import { useRecurringExpenses, calculateDailyRecurringAmount, calculatePeriodRecurringAmount } from "@/hooks/useRecurringExpenses";
import { ProfitComparisonChart } from "@/components/charts/ProfitComparisonChart";
import { ExpensesByCategoryChart } from "@/components/charts/ExpensesByCategoryChart";
import { DailyGoalCard } from "@/components/goals/DailyGoalCard";
import { PeriodGoalCard } from "@/components/goals/PeriodGoalCard";
import { GoalEditor } from "@/components/goals/GoalEditor";
import { useDailyGoals } from "@/hooks/useDailyGoals";
import { useMaintenance } from "@/hooks/useMaintenance";
import { MaintenanceSummaryCard } from "@/components/maintenance/MaintenanceSummaryCard";
import { DailyKmCard } from "@/components/dashboard/DailyKmCard";
import { WorkTimerCard } from "@/components/dashboard/WorkTimerCard";
import { PlatformBreakdownCard } from "@/components/dashboard/PlatformBreakdownCard";
import { DailySummaryCard } from "@/components/dashboard/DailySummaryCard";
import { format, eachDayOfInterval, isSameDay, startOfDay, endOfDay } from "date-fns";
import { parseLocalDate, formatLocalDate } from "@/lib/dateUtils";

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

  // View mode: "period" or "day"
  const [viewMode, setViewMode] = useState<"period" | "day">("period");

  // Global date filter state for period view
  const [preset, setPreset] = useState<DatePreset>("thisMonth");
  const [customRange, setCustomRange] = useState<DateRange>();
  const { dateRange, formattedRange } = useDateFilterPresets(preset, customRange);

  // Single day selection for day view
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Determine actual period based on view mode
  const periodStart = viewMode === "period" ? dateRange.from! : startOfDay(selectedDate);
  const periodEnd = viewMode === "period" ? (dateRange.to || dateRange.from!) : endOfDay(selectedDate);

  // Fetch revenues for selected period
  const { data: revenues = [] } = useQuery({
    queryKey: ["revenues", user?.id, format(periodStart, "yyyy-MM-dd"), format(periodEnd, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("revenues")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", format(periodStart, "yyyy-MM-dd"))
        .lte("date", format(periodEnd, "yyyy-MM-dd"));
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

  // Fetch maintenance data
  const { getCounts: getMaintenanceCounts } = useMaintenance();
  const maintenanceCounts = getMaintenanceCounts();

  // Calculate recurring expenses for the period
  const daysInPeriod = eachDayOfInterval({ start: periodStart, end: periodEnd }).length;
  const periodRecurringTotal = calculatePeriodRecurringAmount(recurringExpenses, periodStart, periodEnd);

  // Calculate KPIs
  const totalRevenue = revenues.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalAllExpenses = totalExpenses + periodRecurringTotal;
  const netProfit = totalRevenue - totalAllExpenses;

  // Calculate average per day based on days with revenue
  const daysWithRevenue = new Set(revenues.map((r) => r.date)).size;
  const avgPerDay = daysWithRevenue > 0 ? netProfit / daysWithRevenue : 0;

  // Determine if single day or period view for goals
  const isSingleDay = viewMode === "day" || isSameDay(periodStart, periodEnd);
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

  // Goals summary for period view
  const goalsForPeriod = getGoalsForPeriod(periodStart, periodEnd);
  const totalGoalForPeriod = getTotalGoalsForPeriod(periodStart, periodEnd);
  const daysWithGoal = goalsForPeriod.size;
  const daysWithoutGoal = daysInPeriod - daysWithGoal;
  const goalPercentage = totalGoalForPeriod > 0 ? (totalRevenue / totalGoalForPeriod) * 100 : 0;
  const hasGoalsInPeriod = daysWithGoal > 0;

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
      day: DAY_NAMES[day.getDay()],
      fullDate: format(day, "dd/MM"),
      lucro: dayRevenues - dayExpenses - dailyRecurring.total,
      receita: dayRevenues,
      despesa: dayExpenses + dailyRecurring.total,
    };
  });

  const hasData = revenues.length > 0 || combinedExpenses.length > 0;

  // Period view KPIs
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

  return (
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
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "period" | "day")}>
            <TabsList>
              <TabsTrigger value="period">Período</TabsTrigger>
              <TabsTrigger value="day">Dia</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Date Selection */}
        <div className="flex flex-wrap items-center gap-3">
          {viewMode === "period" ? (
            <GlobalDateFilter
              preset={preset}
              onPresetChange={setPreset}
              customRange={customRange}
              onCustomRangeChange={setCustomRange}
              className="flex-wrap"
            />
          ) : (
            <>
              <DatePicker
                date={selectedDate}
                onDateChange={(date) => date && setSelectedDate(date)}
                placeholder="Selecione o dia"
              />
              <GoalEditor date={selectedDate} currentGoal={currentDayGoal} />
            </>
          )}
        </div>
      </div>

      {/* === DAY VIEW === */}
      {viewMode === "day" && (
        <>
          {/* Day Header Summary - Receita, Despesa, Lucro */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Receita</span>
                </div>
                <p className="text-xl font-bold">
                  R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Despesas</span>
                </div>
                <p className="text-xl font-bold">
                  R$ {totalAllExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card className={`border-border ${netProfit < 0 ? "bg-destructive/5 border-destructive/20" : "bg-card"}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Lucro</span>
                </div>
                <p className={`text-xl font-bold ${netProfit < 0 ? "text-destructive" : "text-primary"}`}>
                  R$ {netProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Day Controls Row: Meta, KM, Timer */}
          <div className="grid md:grid-cols-3 gap-4">
            <DailyGoalCard
              goal={currentDayGoal}
              revenue={totalRevenue}
              label={`Meta de ${format(selectedDate, "dd/MM/yyyy")}`}
            />
            <DailyKmCard date={selectedDate} />
            <WorkTimerCard currentDate={selectedDate} />
          </div>

          {/* Platform Breakdown */}
          <PlatformBreakdownCard revenues={revenues} />

          {/* Daily Summary with transactions */}
          <DailySummaryCard
            revenues={revenues}
            expenses={combinedExpenses}
            recurringTotal={calculateDailyRecurringAmount(recurringExpenses, selectedDate).total}
            totalRevenue={totalRevenue}
            totalExpenses={totalAllExpenses}
            netProfit={netProfit}
          />

          {/* Expenses by Category - Compact for day view */}
          {expenseCategoriesData.length > 0 && (
            <ExpensesByCategoryChart data={expenseCategoriesData} compact />
          )}
        </>
      )}

      {/* === PERIOD VIEW === */}
      {viewMode === "period" && (
        <>
          {/* Goals Section */}
          {!isSingleDay ? (
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
          ) : (
            <DailyGoalCard
              goal={currentDayGoal}
              revenue={totalRevenue}
              label={`Meta de ${format(periodStart, "dd/MM/yyyy")}`}
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
        </>
      )}

      {/* Maintenance Summary Card - both views */}
      {maintenanceCounts.total > 0 && (
        <MaintenanceSummaryCard
          total={maintenanceCounts.total}
          ok={maintenanceCounts.ok}
          warning={maintenanceCounts.warning}
          overdue={maintenanceCounts.overdue}
          compact
        />
      )}

      {/* Empty State or Charts - Period View */}
      {viewMode === "period" && !hasData && (
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

      {/* Charts - Period View */}
      {viewMode === "period" && hasData && (
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
                          {goalPercentage >= 100 ? (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          ) : (
                            <XCircle className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className={`font-bold ${goalPercentage >= 100 ? "text-success" : "text-foreground"}`}>
                            {goalPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all ${goalPercentage >= 100 ? "bg-success" : "bg-primary"}`}
                          style={{ width: `${Math.min(goalPercentage, 100)}%` }}
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

      {/* Profit Comparison Chart - Always show if there's any data (period view only) */}
      {viewMode === "period" && hasData && (
        <ProfitComparisonChart userId={user?.id} />
      )}
    </div>
  );
}
