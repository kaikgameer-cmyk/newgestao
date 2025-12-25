import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Zap, Gauge, DollarSign, TrendingUp, Loader2, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useInvalidateFinancialData } from "@/hooks/useInvalidateFinancialData";
import { GlobalDateFilter } from "@/components/GlobalDateFilter";
import { DatePreset, useDateFilterPresets } from "@/hooks/useDateFilterPresets";
import { DateRange } from "react-day-picker";
import { format, isWithinInterval } from "date-fns";
import { parseLocalDate } from "@/lib/dateUtils";
import { useMaintenance, WARNING_KM } from "@/hooks/useMaintenance";
import { MaintenanceAlertBanner } from "@/components/maintenance/MaintenanceAlertBanner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { 
  ElectricRechargeForm, 
  ElectricRechargeFormData, 
  ELECTRIC_CHARGE_TYPES, 
  chargeTypeLabels 
} from "@/components/electric/ElectricRechargeForm";

export default function ElectricControl() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Global date filter state
  const [preset, setPreset] = useState<DatePreset>("thisMonth");
  const [customRange, setCustomRange] = useState<DateRange>();
  const { dateRange, formattedRange } = useDateFilterPresets(preset, customRange);

  const { user } = useAuth();
  const { toast } = useToast();
  const { invalidateAll } = useInvalidateFinancialData();
  const queryClient = useQueryClient();
  const { checkMaintenanceAlerts, maintenanceRecords } = useMaintenance();

  // Fetch all fuel logs that are electric charges
  const { data: allElectricLogs = [], isLoading } = useQuery({
    queryKey: ["electric_logs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("fuel_logs")
        .select("*, credit_cards(name)")
        .eq("user_id", user.id)
        .in("fuel_type", ELECTRIC_CHARGE_TYPES)
        .order("date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: creditCards = [] } = useQuery({
    queryKey: ["credit_cards", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("credit_cards")
        .select("*")
        .eq("user_id", user.id)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Filter electric logs by selected period
  const electricLogs = allElectricLogs.filter((log) => {
    const logDate = parseLocalDate(log.date);
    return isWithinInterval(logDate, {
      start: dateRange.from!,
      end: dateRange.to || dateRange.from!,
    });
  });

  const createElectricLog = useMutation({
    mutationFn: async (formData: ElectricRechargeFormData) => {
      if (!user) throw new Error("Não autenticado");
      const newOdometer = formData.odometerKm ? parseFloat(formData.odometerKm) : null;
      
      // Use the fuel_logs table with electric charge type
      const { error } = await supabase.from("fuel_logs").insert({
        user_id: user.id,
        date: formData.date,
        station: formData.station || null,
        liters: parseFloat(formData.kwh), // Using liters field for kWh
        total_value: parseFloat(formData.totalValue),
        fuel_type: formData.chargeType,
        odometer_km: newOdometer,
        payment_method: formData.paymentMethod || null,
        credit_card_id: formData.paymentMethod === "credito" && formData.creditCardId ? formData.creditCardId : null,
      });
      if (error) throw error;
      return newOdometer;
    },
    onSuccess: (newOdometer) => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ["electric_logs"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance_records"] });
      queryClient.invalidateQueries({ queryKey: ["latest_odometer"] });
      setIsDialogOpen(false);
      toast({ title: "Recarga registrada!" });

      // Check for maintenance alerts if odometer was provided
      if (newOdometer && maintenanceRecords.length > 0) {
        const alerts = checkMaintenanceAlerts(newOdometer);
        if (alerts.length > 0) {
          const mostUrgent = alerts[0];
          const formatKm = (km: number) => new Intl.NumberFormat("pt-BR").format(Math.abs(km));
          
          if (mostUrgent.status === "overdue") {
            toast({
              title: "⚠️ Manutenção vencida",
              description: `Você já passou da quilometragem da manutenção: ${mostUrgent.title}. Faça a revisão o quanto antes.`,
              variant: "destructive",
            });
          } else {
            toast({
              title: "⚡ Manutenção próxima",
              description: `Você está a ${formatKm(mostUrgent.kmRemaining)} km da próxima manutenção: ${mostUrgent.title}.`,
            });
          }
        }
      }
    },
    onError: () => {
      toast({ title: "Erro ao registrar recarga", variant: "destructive" });
    },
  });

  const deleteElectricLog = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fuel_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ["electric_logs"] });
      toast({ title: "Recarga removida!" });
    },
  });

  // Calculate metrics for filtered period
  const totalPeriodValue = electricLogs.reduce((sum, log) => sum + Number(log.total_value), 0);
  const totalKwh = electricLogs.reduce((sum, log) => sum + Number(log.liters), 0);
  const avgPricePerKwh = totalKwh > 0 ? totalPeriodValue / totalKwh : 0;

  // Calculate average consumption (km/kWh) from odometer readings
  const sortedAllLogs = [...allElectricLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let avgConsumption = 0;
  if (sortedAllLogs.length >= 2) {
    let totalKm = 0;
    let totalKwhForConsumption = 0;
    for (let i = 1; i < sortedAllLogs.length; i++) {
      if (sortedAllLogs[i].odometer_km && sortedAllLogs[i - 1].odometer_km) {
        const kmDiff = Number(sortedAllLogs[i].odometer_km) - Number(sortedAllLogs[i - 1].odometer_km);
        if (kmDiff > 0) {
          totalKm += kmDiff;
          totalKwhForConsumption += Number(sortedAllLogs[i].liters);
        }
      }
    }
    avgConsumption = totalKwhForConsumption > 0 ? totalKm / totalKwhForConsumption : 0;
  }

  const costPerKm = avgConsumption > 0 ? avgPricePerKwh / avgConsumption : 0;

  // Chart data - consumption over time (km/kWh per charge)
  const consumptionChartData = useMemo(() => {
    const sortedLogs = [...electricLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const data: { date: string; consumption: number; pricePerKwh: number }[] = [];
    
    for (let i = 1; i < sortedLogs.length; i++) {
      if (sortedLogs[i].odometer_km && sortedLogs[i - 1].odometer_km) {
        const kmDiff = Number(sortedLogs[i].odometer_km) - Number(sortedLogs[i - 1].odometer_km);
        const kwhUsed = Number(sortedLogs[i].liters);
        if (kmDiff > 0 && kwhUsed > 0) {
          data.push({
            date: format(parseLocalDate(sortedLogs[i].date), "dd/MM"),
            consumption: Number((kmDiff / kwhUsed).toFixed(1)),
            pricePerKwh: Number((Number(sortedLogs[i].total_value) / kwhUsed).toFixed(2)),
          });
        }
      }
    }
    return data;
  }, [electricLogs]);

  // Chart data - monthly spending
  const monthlySpendingData = useMemo(() => {
    const monthlyMap = new Map<string, { total: number; kwh: number }>();
    
    electricLogs.forEach((log) => {
      const monthKey = format(parseLocalDate(log.date), "MMM/yy");
      const existing = monthlyMap.get(monthKey) || { total: 0, kwh: 0 };
      monthlyMap.set(monthKey, {
        total: existing.total + Number(log.total_value),
        kwh: existing.kwh + Number(log.liters),
      });
    });
    
    return Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      total: Number(data.total.toFixed(2)),
      kwh: Number(data.kwh.toFixed(1)),
    }));
  }, [electricLogs]);

  const chartConfig = {
    consumption: {
      label: "km/kWh",
      color: "hsl(var(--success))",
    },
    pricePerKwh: {
      label: "R$/kWh",
      color: "hsl(var(--primary))",
    },
    total: {
      label: "Gasto Total",
      color: "hsl(var(--primary))",
    },
    kwh: {
      label: "kWh",
      color: "hsl(var(--success))",
    },
  } satisfies ChartConfig;

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Get maintenance alerts for current odometer
  const latestOdometerValue = allElectricLogs[0]?.odometer_km ? Number(allElectricLogs[0].odometer_km) : null;
  const maintenanceAlerts = latestOdometerValue ? checkMaintenanceAlerts(latestOdometerValue) : [];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto w-full">
      {/* Maintenance Alert Banner */}
      {maintenanceAlerts.length > 0 && (
        <MaintenanceAlertBanner alerts={maintenanceAlerts} />
      )}

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold break-words">Recarga Elétrica</h1>
            <p className="text-muted-foreground">
              Controle suas recargas e consumo elétrico
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" size="lg">
                <Plus className="w-5 h-5" />
                Nova Recarga
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="break-words">Registrar Recarga</DialogTitle>
              </DialogHeader>
              <ElectricRechargeForm
                onSubmit={(data) => createElectricLog.mutate(data)}
                isPending={createElectricLog.isPending}
                creditCards={creditCards}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Date Filter */}
        <GlobalDateFilter
          preset={preset}
          onPresetChange={setPreset}
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
          className="flex-wrap"
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card variant="elevated">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">Média km/kWh</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold">{avgConsumption > 0 ? `${avgConsumption.toFixed(1)} km/kWh` : "—"}</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">Preço Médio/kWh</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold">{avgPricePerKwh > 0 ? `R$ ${avgPricePerKwh.toFixed(2)}` : "—"}</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">Custo por Km</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold">{costPerKm > 0 ? `R$ ${costPerKm.toFixed(2)}` : "—"}</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">Total do Período</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold">R$ {totalPeriodValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      {electricLogs.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Consumption Chart */}
          {consumptionChartData.length > 0 && (
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-success" />
                  Consumo ao Longo do Tempo (km/kWh)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <LineChart data={consumptionChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                      axisLine={false}
                      className="fill-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      className="fill-muted-foreground"
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="consumption"
                      stroke="var(--color-consumption)"
                      strokeWidth={2}
                      dot={{ fill: "var(--color-consumption)", strokeWidth: 0, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Price per kWh Chart */}
          {consumptionChartData.length > 0 && (
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Preço por kWh ao Longo do Tempo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <LineChart data={consumptionChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                      axisLine={false}
                      className="fill-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      className="fill-muted-foreground"
                      tickFormatter={(value) => `R$${value}`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="pricePerKwh"
                      stroke="var(--color-pricePerKwh)"
                      strokeWidth={2}
                      dot={{ fill: "var(--color-pricePerKwh)", strokeWidth: 0, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

      {/* Electric Logs */}
      {electricLogs.length === 0 ? (
        <Card variant="elevated" className="p-8 sm:p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <Zap className="w-8 h-8 text-success" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Nenhuma recarga no período</h3>
              <p className="text-muted-foreground max-w-md">
                Registre suas recargas para acompanhar seu consumo e custos com energia elétrica.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {electricLogs.map((log) => {
              const pricePerKwh = Number(log.total_value) / Number(log.liters || 1);
              const dateLabel = (() => {
                const [year, month, day] = log.date.split("-").map(Number);
                return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
              })();

              return (
                <div
                  key={log.id}
                  className="rounded-lg border border-border bg-card p-3 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Zap className="w-4 h-4 text-success" />
                        <span className="text-sm font-medium break-words">{dateLabel}</span>
                        <span className="text-xs text-muted-foreground">
                          {chargeTypeLabels[log.fuel_type] || log.fuel_type}
                        </span>
                      </div>
                      {log.station && (
                        <p className="text-xs text-muted-foreground break-words">
                          Estação: {log.station}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>kWh: {Number(log.liters).toFixed(1)}</span>
                        <span>R$/kWh: R$ {pricePerKwh.toFixed(2)}</span>
                        {log.odometer_km && (
                          <span>
                            Km: {Number(log.odometer_km).toLocaleString("pt-BR")} km
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="text-sm font-semibold text-success">
                        R$ {Number(log.total_value).toFixed(2)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteElectricLog.mutate(log.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <Card variant="elevated" className="hidden md:block">
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Recargas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">
                        Data
                      </th>
                      <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground hidden sm:table-cell">
                        Estação
                      </th>
                      <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">
                        Tipo
                      </th>
                      <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground hidden sm:table-cell">
                        kWh
                      </th>
                      <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground hidden md:table-cell">
                        R$/kWh
                      </th>
                      <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">
                        Total
                      </th>
                      <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground hidden lg:table-cell">
                        Km
                      </th>
                      <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {electricLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                      >
                        <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm">
                          {(() => {
                            const [year, month, day] = log.date.split("-").map(Number);
                            return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
                          })()}
                        </td>
                        <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell">
                          {log.station || "—"}
                        </td>
                        <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm">
                          {chargeTypeLabels[log.fuel_type] || log.fuel_type}
                        </td>
                        <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm text-right hidden sm:table-cell">
                          {Number(log.liters).toFixed(1)}
                        </td>
                        <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm text-right hidden md:table-cell">
                          R$ {(Number(log.total_value) / Number(log.liters)).toFixed(2)}
                        </td>
                        <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm text-right font-medium text-success">
                          R$ {Number(log.total_value).toFixed(2)}
                        </td>
                        <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm text-right text-muted-foreground hidden lg:table-cell">
                          {log.odometer_km
                            ? Number(log.odometer_km).toLocaleString("pt-BR")
                            : "—"}
                        </td>
                        <td className="py-3 px-2 sm:px-4 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteElectricLog.mutate(log.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
