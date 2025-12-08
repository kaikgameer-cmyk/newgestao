import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Calendar, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
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
import { startOfMonth, endOfMonth, format, parseISO, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = [
  "hsl(48, 96%, 53%)",
  "hsl(142, 76%, 36%)",
  "hsl(0, 84%, 60%)",
  "hsl(217, 91%, 60%)",
  "hsl(0, 0%, 50%)",
];

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function Dashboard() {
  const { user } = useAuth();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Fetch revenues for current month
  const { data: revenues = [] } = useQuery({
    queryKey: ["revenues", user?.id, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("revenues")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"));
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch expenses for current month
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", user?.id, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"));
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Calculate KPIs
  const totalRevenue = revenues.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfit = totalRevenue - totalExpenses;
  const daysInMonth = now.getDate();
  const avgPerDay = daysInMonth > 0 ? netProfit / daysInMonth : 0;

  // Group expenses by category
  const expensesByCategory = expenses.reduce((acc, expense) => {
    const category = expense.category || "Outros";
    acc[category] = (acc[category] || 0) + Number(expense.amount);
    return acc;
  }, {} as Record<string, number>);

  const expenseCategoriesData = Object.entries(expensesByCategory).map(([name, value], index) => ({
    name,
    value,
    color: COLORS[index % COLORS.length],
  }));

  // Daily profit data
  const daysInterval = eachDayOfInterval({ start: monthStart, end: now });
  const dailyData = daysInterval.map((day) => {
    const dayRevenues = revenues
      .filter((r) => isSameDay(parseISO(r.date), day))
      .reduce((sum, r) => sum + Number(r.amount), 0);
    const dayExpenses = expenses
      .filter((e) => isSameDay(parseISO(e.date), day))
      .reduce((sum, e) => sum + Number(e.amount), 0);
    return {
      day: format(day, "dd"),
      lucro: dayRevenues - dayExpenses,
    };
  });

  const hasData = revenues.length > 0 || expenses.length > 0;

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
      value: `R$ ${totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Olá! Aqui está seu resultado de {format(now, "MMMM yyyy", { locale: ptBR })}.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <Card key={index} variant="elevated" className="hover:border-primary/20 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <kpi.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-sm text-muted-foreground">{kpi.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State or Charts */}
      {!hasData ? (
        <Card variant="elevated" className="p-12">
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
              <CardTitle className="text-lg">Lucro Diário do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
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

          {/* Pie Chart - Expense Categories */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="text-lg">Despesas por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {expenseCategoriesData.length > 0 ? (
                <div className="h-[300px] flex items-center">
                  <div className="w-1/2">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={expenseCategoriesData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
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
                  <div className="w-1/2 space-y-3">
                    {expenseCategoriesData.map((category, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-sm text-muted-foreground">
                            {category.name}
                          </span>
                        </div>
                        <span className="text-sm font-medium">R$ {category.value.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Nenhuma despesa registrada
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
