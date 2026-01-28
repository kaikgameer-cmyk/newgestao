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
import { cn } from "@/lib/utils";

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
    if (value === null) return "—";
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

  // Metric item component - consistent neutral styling
  const MetricItem = ({ 
    title, 
    value, 
    icon: Icon, 
    valueClass = "text-foreground",
    small = false 
  }: { 
    title: string; 
    value: string; 
    icon: any;
    valueClass?: string;
    small?: boolean;
  }) => (
    <div className="rounded-lg p-3 bg-secondary/40">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{title}</span>
      </div>
      <p className={cn(
        "font-semibold break-words",
        small ? "text-sm" : "text-base",
        valueClass
      )}>
        {value}
      </p>
    </div>
  );

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Métricas do Dia</h3>
        
        {/* Row 1: Base data */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <MetricItem 
            title="Viagens" 
            value={totalTrips > 0 ? totalTrips.toString() : "—"} 
            icon={Car} 
          />
          <MetricItem 
            title="Horas" 
            value={workedMinutes > 0 ? formatHours(workedMinutes) : "—"} 
            icon={Clock} 
          />
          <MetricItem 
            title="KM Rodados" 
            value={kmRodados > 0 ? `${kmRodados.toLocaleString("pt-BR")} km` : "—"} 
            icon={MapPin} 
          />
        </div>

        {/* Row 2: Financials */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <MetricItem 
            title="Receita" 
            value={formatCurrency(revenue > 0 ? revenue : null)} 
            icon={DollarSign}
            valueClass={revenue > 0 ? "text-positive" : "text-muted-foreground"}
          />
          <MetricItem 
            title="Despesas" 
            value={formatCurrency(expenses > 0 ? expenses : null)} 
            icon={TrendingDown}
            valueClass={expenses > 0 ? "text-negative" : "text-muted-foreground"}
          />
          <MetricItem 
            title="Lucro" 
            value={formatCurrency(profit !== 0 || (revenue > 0 || expenses > 0) ? profit : null)} 
            icon={TrendingUp}
            valueClass={profit >= 0 ? "text-primary" : "text-negative"}
          />
        </div>

        {/* Derived metrics - smaller, more subtle */}
        <div className="pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Por Viagem / Hora / KM</p>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <MetricItem 
              title="Fat./Viagem" 
              value={formatCurrency(revenuePerTrip)} 
              icon={Car}
              valueClass={revenuePerTrip !== null ? "text-positive" : "text-muted-foreground"}
              small
            />
            <MetricItem 
              title="Fat./Hora" 
              value={formatCurrency(revenuePerHour)} 
              icon={Timer}
              valueClass={revenuePerHour !== null ? "text-positive" : "text-muted-foreground"}
              small
            />
            <MetricItem 
              title="Fat./KM" 
              value={formatCurrency(revenuePerKm)} 
              icon={Gauge}
              valueClass={revenuePerKm !== null ? "text-positive" : "text-muted-foreground"}
              small
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <MetricItem 
              title="Custo/Viagem" 
              value={formatCurrency(costPerTrip)} 
              icon={Car}
              valueClass={costPerTrip !== null ? "text-negative" : "text-muted-foreground"}
              small
            />
            <MetricItem 
              title="Custo/Hora" 
              value={formatCurrency(costPerHour)} 
              icon={Timer}
              valueClass={costPerHour !== null ? "text-negative" : "text-muted-foreground"}
              small
            />
            <MetricItem 
              title="Custo/KM" 
              value={formatCurrency(costPerKm)} 
              icon={Gauge}
              valueClass={costPerKm !== null ? "text-negative" : "text-muted-foreground"}
              small
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MetricItem 
              title="Lucro/Viagem" 
              value={formatCurrency(profitPerTrip)} 
              icon={Calculator}
              valueClass={profitPerTrip !== null && profitPerTrip >= 0 ? "text-primary" : profitPerTrip !== null ? "text-negative" : "text-muted-foreground"}
              small
            />
            <MetricItem 
              title="Lucro/Hora" 
              value={formatCurrency(profitPerHour)} 
              icon={Calculator}
              valueClass={profitPerHour !== null && profitPerHour >= 0 ? "text-primary" : profitPerHour !== null ? "text-negative" : "text-muted-foreground"}
              small
            />
            <MetricItem 
              title="Lucro/KM" 
              value={formatCurrency(profitPerKm)} 
              icon={Calculator}
              valueClass={profitPerKm !== null && profitPerKm >= 0 ? "text-primary" : profitPerKm !== null ? "text-negative" : "text-muted-foreground"}
              small
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
