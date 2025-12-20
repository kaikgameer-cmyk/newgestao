import { Card, CardContent } from "@/components/ui/card";
import { 
  Car, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  MapPin,
  Timer,
  Gauge,
  Calculator
} from "lucide-react";

interface DayMetricsPanelProps {
  totalTrips: number;
  workedMinutes: number;
  kmRodados: number;
  revenue: number;
  expenses: number;
}

export function DayMetricsPanel({ 
  totalTrips, 
  workedMinutes, 
  kmRodados, 
  revenue, 
  expenses 
}: DayMetricsPanelProps) {
  const profit = revenue - expenses;
  const workedHours = workedMinutes / 60;

  // Helper for safe division
  const safeDivide = (num: number, den: number): number | null => {
    if (den <= 0 || num === 0) return null;
    return num / den;
  };

  // Format currency
  const formatCurrency = (value: number | null): string => {
    if (value === null) return "R$ —";
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format hours
  const formatHours = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  // Calculate derived metrics
  const revenuePerTrip = safeDivide(revenue, totalTrips);
  const revenuePerHour = safeDivide(revenue, workedHours);
  const revenuePerKm = safeDivide(revenue, kmRodados);

  const costPerTrip = safeDivide(expenses, totalTrips);
  const costPerHour = safeDivide(expenses, workedHours);
  const costPerKm = safeDivide(expenses, kmRodados);

  const profitPerTrip = safeDivide(profit, totalTrips);
  const profitPerHour = safeDivide(profit, workedHours);
  const profitPerKm = safeDivide(profit, kmRodados);

  const metrics = [
    // Row 1: Base data
    {
      title: "Viagens",
      value: totalTrips > 0 ? totalTrips.toString() : "—",
      icon: Car,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Horas",
      value: workedMinutes > 0 ? formatHours(workedMinutes) : "—",
      icon: Clock,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "KM Rodados",
      value: kmRodados > 0 ? `${kmRodados.toLocaleString("pt-BR")} km` : "—",
      icon: MapPin,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    // Row 2: Financials
    {
      title: "Receita",
      value: formatCurrency(revenue > 0 ? revenue : null),
      icon: DollarSign,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "Despesas",
      value: formatCurrency(expenses > 0 ? expenses : null),
      icon: TrendingDown,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    {
      title: "Lucro",
      value: formatCurrency(profit !== 0 || (revenue > 0 || expenses > 0) ? profit : null),
      icon: TrendingUp,
      color: profit >= 0 ? "text-primary" : "text-red-500",
      bg: profit >= 0 ? "bg-primary/10" : "bg-red-500/10",
    },
    // Row 3: Revenue derived metrics
    {
      title: "Faturamento/Viagem",
      value: formatCurrency(revenuePerTrip),
      icon: Car,
      color: "text-green-500",
      bg: "bg-green-500/5",
      small: true,
    },
    {
      title: "Faturamento/Hora",
      value: formatCurrency(revenuePerHour),
      icon: Timer,
      color: "text-green-500",
      bg: "bg-green-500/5",
      small: true,
    },
    {
      title: "Faturamento/KM",
      value: formatCurrency(revenuePerKm),
      icon: Gauge,
      color: "text-green-500",
      bg: "bg-green-500/5",
      small: true,
    },
    // Row 4: Cost derived metrics
    {
      title: "Custo/Viagem",
      value: formatCurrency(costPerTrip),
      icon: Car,
      color: "text-red-500",
      bg: "bg-red-500/5",
      small: true,
    },
    {
      title: "Custo/Hora",
      value: formatCurrency(costPerHour),
      icon: Timer,
      color: "text-red-500",
      bg: "bg-red-500/5",
      small: true,
    },
    {
      title: "Custo/KM",
      value: formatCurrency(costPerKm),
      icon: Gauge,
      color: "text-red-500",
      bg: "bg-red-500/5",
      small: true,
    },
    // Row 5: Profit derived metrics
    {
      title: "Lucro/Viagem",
      value: formatCurrency(profitPerTrip),
      icon: Calculator,
      color: profitPerTrip !== null && profitPerTrip >= 0 ? "text-primary" : "text-red-500",
      bg: profitPerTrip !== null && profitPerTrip >= 0 ? "bg-primary/5" : "bg-red-500/5",
      small: true,
    },
    {
      title: "Lucro/Hora",
      value: formatCurrency(profitPerHour),
      icon: Calculator,
      color: profitPerHour !== null && profitPerHour >= 0 ? "text-primary" : "text-red-500",
      bg: profitPerHour !== null && profitPerHour >= 0 ? "bg-primary/5" : "bg-red-500/5",
      small: true,
    },
    {
      title: "Lucro/KM",
      value: formatCurrency(profitPerKm),
      icon: Calculator,
      color: profitPerKm !== null && profitPerKm >= 0 ? "text-primary" : "text-red-500",
      bg: profitPerKm !== null && profitPerKm >= 0 ? "bg-primary/5" : "bg-red-500/5",
      small: true,
    },
  ];

  return (
    <Card variant="elevated">
      <CardContent className="p-4">
        <h3 className="font-semibold mb-4 text-base">Métricas do Dia</h3>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {metrics.map((metric, index) => (
            <div
              key={metric.title}
              className={`rounded-lg p-2 sm:p-3 ${metric.bg} ${metric.small ? "col-span-1" : ""}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <metric.icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${metric.color}`} />
                <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  {metric.title}
                </span>
              </div>
              <p className={`font-semibold ${metric.small ? "text-xs sm:text-sm" : "text-sm sm:text-base"} ${metric.color} truncate`}>
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
