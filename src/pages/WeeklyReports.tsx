import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, DollarSign, Clock, Calendar, PlusCircle, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCombinedExpenses } from "@/hooks/useCombinedExpenses";
import { useRecurringExpenses, calculateDailyRecurringAmount } from "@/hooks/useRecurringExpenses";
import { startOfWeek, endOfWeek, addWeeks, format, eachDayOfInterval, isSameDay, parseISO, startOfMonth, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = [
  "hsl(48, 96%, 53%)",
  "hsl(142, 76%, 36%)",
  "hsl(0, 84%, 60%)",
  "hsl(217, 91%, 60%)",
  "hsl(0, 0%, 50%)",
];

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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

export default function WeeklyReports() {
  const { user } = useAuth();
  const now = new Date();
  const monthStart = startOfMonth(now);
  
  // View mode: "week" or "day"
  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  
  // Generate weeks for the current month
  const weeks = useMemo(() => {
    const result = [];
    let weekStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    let weekNum = 1;
    
    while (weekStart <= now) {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
      result.push({
        value: weekNum.toString(),
        label: `Semana ${weekNum} (${format(weekStart, "dd")}–${format(weekEnd, "dd")})`,
        start: weekStart,
        end: weekEnd > now ? now : weekEnd,
      });
      weekStart = addWeeks(weekStart, 1);
      weekNum++;
    }
    return result;
  }, [now]);

  // Generate days for the current month
  const days = useMemo(() => {
    const result = [];
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: now });
    
    daysInMonth.forEach((day) => {
      result.push({
        value: format(day, "yyyy-MM-dd"),
        label: format(day, "EEEE, dd 'de' MMMM", { locale: ptBR }),
        start: startOfDay(day),
        end: endOfDay(day),
      });
    });
    return result.reverse(); // Most recent first
  }, [now]);

  const [selectedWeek, setSelectedWeek] = useState(weeks[weeks.length - 1]?.value || "1");
  const [selectedDay, setSelectedDay] = useState(days[0]?.value || format(now, "yyyy-MM-dd"));

  // Determine date range based on view mode
  const selectedWeekData = weeks.find((w) => w.value === selectedWeek);
  const selectedDayData = days.find((d) => d.value === selectedDay);
  
  const periodStart = viewMode === "week" 
    ? (selectedWeekData?.start || startOfWeek(now, { weekStartsOn: 0 }))
    : (selectedDayData?.start || startOfDay(now));
  const periodEnd = viewMode === "week"
    ? (selectedWeekData?.end || now)
    : (selectedDayData?.end || endOfDay(now));

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

  // Fetch combined expenses (expenses + fuel logs) for selected period
  const { combinedExpenses, totalExpenses } = useCombinedExpenses(
    user?.id,
    periodStart,
    periodEnd
  );

  // Fetch recurring expenses
  const { recurringExpenses } = useRecurringExpenses(user?.id);

  // Calculate recurring expenses for the period
  const daysInPeriod = eachDayOfInterval({ start: periodStart, end: periodEnd }).length;
  const periodRecurringTotal = recurringExpenses
    .filter((e) => e.is_active && e.start_date <= format(periodEnd, "yyyy-MM-dd") && (!e.end_date || e.end_date >= format(periodStart, "yyyy-MM-dd")))
    .reduce((sum, e) => sum + (e.amount / 30) * daysInPeriod, 0);

  // Calculate KPIs
  const totalRevenue = revenues.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalAllExpenses = totalExpenses + periodRecurringTotal;
  const netProfit = totalRevenue - totalAllExpenses;
  
  const daysWithRevenue = new Set(revenues.map((r) => r.date)).size;
  const avgPerDay = daysWithRevenue > 0 ? netProfit / daysWithRevenue : 0;

  // Daily data for charts (including recurring expenses)
  const daysInterval = eachDayOfInterval({ start: periodStart, end: periodEnd });
  const dailyData = daysInterval.map((day) => {
    const dayRevenues = revenues
      .filter((r) => isSameDay(parseISO(r.date), day))
      .reduce((sum, r) => sum + Number(r.amount), 0);
    const dayExpenses = combinedExpenses
      .filter((e) => isSameDay(parseISO(e.date), day))
      .reduce((sum, e) => sum + e.amount, 0);
    
    // Add daily recurring expenses
    const dailyRecurring = calculateDailyRecurringAmount(recurringExpenses, day);
    const totalDayExpenses = dayExpenses + dailyRecurring.total;
    
    return {
      day: DAY_NAMES[day.getDay()],
      lucro: dayRevenues - totalDayExpenses,
      receita: dayRevenues,
      despesa: totalDayExpenses,
    };
  });

  // Expense categories (includes fuel and recurring)
  const expensesByCategory = combinedExpenses.reduce((acc, expense) => {
    const category = expense.category || "Outros";
    acc[category] = (acc[category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  // Add recurring expenses as a category
  if (periodRecurringTotal > 0) {
    expensesByCategory["despesas_fixas"] = periodRecurringTotal;
  }

  const expenseCategoriesData = Object.entries(expensesByCategory).map(([name, value], index) => ({
    name: categoryLabels[name] || name,
    value,
    color: COLORS[index % COLORS.length],
  }));

  const hasData = revenues.length > 0 || combinedExpenses.length > 0 || periodRecurringTotal > 0;

  const kpis = [
    { title: "Receita", value: `R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign },
    { title: "Despesas", value: `R$ ${totalAllExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: TrendingDown },
    { title: "Lucro", value: `R$ ${netProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: TrendingUp, highlight: true },
    { title: "Dias rodados", value: daysWithRevenue.toString(), icon: Calendar },
    { title: "Média/dia", value: `R$ ${avgPerDay.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: Clock },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">
            Acompanhe seu desempenho por período
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "week" | "day")}>
            <TabsList>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="day">Dia</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {viewMode === "week" ? (
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione a semana" />
              </SelectTrigger>
              <SelectContent>
                {weeks.map((week) => (
                  <SelectItem key={week.value} value={week.value}>
                    {week.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Select value={selectedDay} onValueChange={setSelectedDay}>
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder="Selecione o dia" />
              </SelectTrigger>
              <SelectContent>
                {days.map((day) => (
                  <SelectItem key={day.value} value={day.value}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, index) => (
          <Card
            key={index}
            variant={kpi.highlight ? "elevated" : "default"}
            className={kpi.highlight ? "bg-gradient-card border-primary/30" : ""}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className={`w-4 h-4 ${kpi.highlight ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-xs text-muted-foreground">{kpi.title}</span>
              </div>
              <p className={`text-xl font-bold ${kpi.highlight ? "text-primary" : ""}`}>
                {kpi.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!hasData ? (
        <Card variant="elevated" className="p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <PlusCircle className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Sem dados neste {viewMode === "week" ? "período" : "dia"}</h3>
              <p className="text-muted-foreground max-w-md">
                Adicione lançamentos para ver seus relatórios.
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
          {/* Daily Profit Bar Chart - only show for weekly view */}
          {viewMode === "week" && (
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
                      dataKey="day"
                      stroke="hsl(0, 0%, 50%)"
                      tick={{ fill: "hsl(0, 0%, 60%)" }}
                    />
                    <YAxis
                      stroke="hsl(0, 0%, 50%)"
                      tick={{ fill: "hsl(0, 0%, 60%)" }}
                      tickFormatter={(value) => `R$${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(0, 0%, 10%)",
                        border: "1px solid hsl(0, 0%, 20%)",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Lucro"]}
                    />
                    <Bar
                      dataKey="lucro"
                      fill="hsl(48, 96%, 53%)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
            </Card>
          )}

          {/* Revenue vs Expense Stacked Bar - only show for weekly view */}
          {viewMode === "week" && (
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
                      dataKey="day"
                      stroke="hsl(0, 0%, 50%)"
                      tick={{ fill: "hsl(0, 0%, 60%)" }}
                    />
                    <YAxis
                      stroke="hsl(0, 0%, 50%)"
                      tick={{ fill: "hsl(0, 0%, 60%)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(0, 0%, 10%)",
                        border: "1px solid hsl(0, 0%, 20%)",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="receita" fill="hsl(142, 76%, 36%)" stackId="a" radius={[0, 0, 0, 0]} name="Receita" />
                    <Bar dataKey="despesa" fill="hsl(0, 84%, 60%)" stackId="a" radius={[4, 4, 0, 0]} name="Despesa" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
            </Card>
          )}

          {/* Daily Summary for day view */}
          {viewMode === "day" && (
            <Card variant="elevated" className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Resumo do Dia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Receita</p>
                    <p className="text-xl font-bold text-success">
                      R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Despesas</p>
                    <p className="text-xl font-bold text-destructive">
                      R$ {totalAllExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Lucro</p>
                    <p className={`text-xl font-bold ${netProfit >= 0 ? "text-primary" : "text-destructive"}`}>
                      R$ {netProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* List of transactions for the day */}
                {combinedExpenses.length > 0 && (
                  <div className="pt-4 border-t border-border">
                    <h4 className="text-sm font-medium mb-3">Despesas do dia</h4>
                    <div className="space-y-2">
                      {combinedExpenses.map((expense) => (
                        <div 
                          key={expense.id} 
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30 text-sm"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium capitalize">
                              {expense.source === "fuel" ? "Combustível" : categoryLabels[expense.category] || expense.category}
                            </span>
                            {expense.notes && (
                              <span className="text-xs text-muted-foreground">{expense.notes}</span>
                            )}
                          </div>
                          <span className="font-medium text-destructive">
                            R$ {expense.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {revenues.length > 0 && (
                  <div className="pt-4 border-t border-border">
                    <h4 className="text-sm font-medium mb-3">Receitas do dia</h4>
                    <div className="space-y-2">
                      {revenues.map((revenue) => (
                        <div 
                          key={revenue.id} 
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30 text-sm"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium capitalize">{revenue.app}</span>
                            {revenue.notes && (
                              <span className="text-xs text-muted-foreground">{revenue.notes}</span>
                            )}
                          </div>
                          <span className="font-medium text-success">
                            R$ {Number(revenue.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {/* Expense Distribution - only show for weekly view */}
          {expenseCategoriesData.length > 0 && viewMode === "week" && (
            <Card variant="elevated" className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Distribuição de Despesas da Semana</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="w-full md:w-1/2 h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseCategoriesData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {expenseCategoriesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(0, 0%, 10%)",
                            border: "1px solid hsl(0, 0%, 20%)",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [`R$ ${value.toFixed(2)}`, ""]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full md:w-1/2 grid grid-cols-2 gap-4">
                    {expenseCategoriesData.map((category, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg bg-secondary/30 border border-border/50"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-sm text-muted-foreground">
                            {category.name}
                          </span>
                        </div>
                        <p className="text-lg font-semibold">R$ {category.value.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
