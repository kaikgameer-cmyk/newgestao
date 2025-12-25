import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Fuel as FuelIcon, Gauge, DollarSign, TrendingUp, Loader2, Trash2, CreditCard } from "lucide-react";
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

// Traditional fuel types (exclude electric)
const TRADITIONAL_FUEL_TYPES = ['gasolina', 'etanol', 'diesel', 'gnv'];

export default function FuelControl() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [station, setStation] = useState("");
  const [liters, setLiters] = useState("");
  const [totalValue, setTotalValue] = useState("");
  const [creditCardId, setCreditCardId] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [odometerKm, setOdometerKm] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  // Global date filter state
  const [preset, setPreset] = useState<DatePreset>("thisMonth");
  const [customRange, setCustomRange] = useState<DateRange>();
  const { dateRange, formattedRange } = useDateFilterPresets(preset, customRange);

  const { user } = useAuth();
  const { toast } = useToast();
  const { invalidateAll } = useInvalidateFinancialData();
  const queryClient = useQueryClient();
  const { checkMaintenanceAlerts, maintenanceRecords } = useMaintenance();

  const { data: allFuelLogs = [], isLoading } = useQuery({
    queryKey: ["fuel_logs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("fuel_logs")
        .select("*, credit_cards(name)")
        .eq("user_id", user.id)
        .in("fuel_type", TRADITIONAL_FUEL_TYPES)
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

  // Filter fuel logs by selected period
  const fuelLogs = allFuelLogs.filter((log) => {
    const logDate = parseLocalDate(log.date);
    return isWithinInterval(logDate, {
      start: dateRange.from!,
      end: dateRange.to || dateRange.from!,
    });
  });

  const createFuelLog = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      const newOdometer = odometerKm ? parseFloat(odometerKm) : null;
      const { error } = await supabase.from("fuel_logs").insert({
        user_id: user.id,
        date,
        station: station || null,
        liters: parseFloat(liters),
        total_value: parseFloat(totalValue),
        fuel_type: fuelType,
        odometer_km: newOdometer,
        payment_method: paymentMethod || null,
        credit_card_id: paymentMethod === "credito" && creditCardId ? creditCardId : null,
      });
      if (error) throw error;
      return newOdometer;
    },
    onSuccess: (newOdometer) => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ["maintenance_records"] });
      queryClient.invalidateQueries({ queryKey: ["latest_odometer"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Abastecimento registrado!" });

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
      toast({ title: "Erro ao registrar abastecimento", variant: "destructive" });
    },
  });

  const deleteFuelLog = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fuel_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Abastecimento removido!" });
    },
  });

  const resetForm = () => {
    setDate(format(new Date(), "yyyy-MM-dd"));
    setStation("");
    setLiters("");
    setTotalValue("");
    setFuelType("");
    setOdometerKm("");
    setPaymentMethod("");
    setCreditCardId("");
  };

  // Calculate metrics for filtered period
  const totalPeriodValue = fuelLogs.reduce((sum, log) => sum + Number(log.total_value), 0);
  const totalLiters = fuelLogs.reduce((sum, log) => sum + Number(log.liters), 0);
  const avgPricePerLiter = totalLiters > 0 ? totalPeriodValue / totalLiters : 0;

  // Calculate average consumption (km/l) from odometer readings (uses all logs for accuracy)
  const sortedAllLogs = [...allFuelLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let avgConsumption = 0;
  if (sortedAllLogs.length >= 2) {
    let totalKm = 0;
    let totalLitersForConsumption = 0;
    for (let i = 1; i < sortedAllLogs.length; i++) {
      if (sortedAllLogs[i].odometer_km && sortedAllLogs[i - 1].odometer_km) {
        const kmDiff = Number(sortedAllLogs[i].odometer_km) - Number(sortedAllLogs[i - 1].odometer_km);
        if (kmDiff > 0) {
          totalKm += kmDiff;
          totalLitersForConsumption += Number(sortedAllLogs[i].liters);
        }
      }
    }
    avgConsumption = totalLitersForConsumption > 0 ? totalKm / totalLitersForConsumption : 0;
  }

  const costPerKm = avgConsumption > 0 ? avgPricePerLiter / avgConsumption : 0;

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Get maintenance alerts for current odometer
  const latestOdometerValue = allFuelLogs[0]?.odometer_km ? Number(allFuelLogs[0].odometer_km) : null;
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
            <h1 className="text-2xl font-bold break-words">Combustível</h1>
            <p className="text-muted-foreground">
              Controle seus abastecimentos e consumo
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" size="lg">
                <Plus className="w-5 h-5" />
                Novo Abastecimento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="break-words">Registrar Abastecimento</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createFuelLog.mutate(); }} className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Posto (opcional)</Label>
                    <Input placeholder="Ex: Shell" value={station} onChange={(e) => setStation(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Litros *</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={liters} onChange={(e) => setLiters(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Total *</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={totalValue} onChange={(e) => setTotalValue(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de combustível *</Label>
                  <Select value={fuelType} onValueChange={setFuelType} required>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gasolina">Gasolina</SelectItem>
                      <SelectItem value="etanol">Etanol</SelectItem>
                      <SelectItem value="diesel">Diesel</SelectItem>
                      <SelectItem value="gnv">GNV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quilometragem atual</Label>
                  <Input type="number" placeholder="0" value={odometerKm} onChange={(e) => setOdometerKm(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Método de pagamento</Label>
                  <Select value={paymentMethod} onValueChange={(value) => {
                    setPaymentMethod(value);
                    if (value !== "credito") setCreditCardId("");
                  }}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="debito">Débito</SelectItem>
                      <SelectItem value="credito">Cartão de Crédito</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {paymentMethod === "credito" && creditCards.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Selecione o cartão
                    </Label>
                    <Select value={creditCardId} onValueChange={setCreditCardId}>
                      <SelectTrigger><SelectValue placeholder="Escolha um cartão cadastrado" /></SelectTrigger>
                      <SelectContent>
                        {creditCards.map((card) => (
                          <SelectItem key={card.id} value={card.id}>
                            {card.name} {card.last_digits ? `(•••• ${card.last_digits})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {paymentMethod === "credito" && creditCards.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum cartão cadastrado. Cadastre um cartão na seção de Cartões de Crédito.
                  </p>
                )}
                <Button type="submit" variant="hero" className="w-full" disabled={createFuelLog.isPending}>
                  {createFuelLog.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Abastecimento"}
                </Button>
              </form>
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
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">Consumo Médio</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold">{avgConsumption > 0 ? `${avgConsumption.toFixed(1)} km/l` : "—"}</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FuelIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">Preço Médio/Litro</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold">{avgPricePerLiter > 0 ? `R$ ${avgPricePerLiter.toFixed(2)}` : "—"}</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">Custo por Km</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold">{costPerKm > 0 ? `R$ ${costPerKm.toFixed(2)}` : "—"}</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">Total do Período</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold">R$ {totalPeriodValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
      </div>

      {/* Fuel Logs */}
      {fuelLogs.length === 0 ? (
        <Card variant="elevated" className="p-8 sm:p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <FuelIcon className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Nenhum abastecimento no período</h3>
              <p className="text-muted-foreground max-w-md">
                Registre seus abastecimentos para acompanhar seu consumo e custos com combustível.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {fuelLogs.map((log) => {
              const pricePerLiter = Number(log.total_value) / Number(log.liters || 1);
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
                        <FuelIcon className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium break-words">{dateLabel}</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {log.fuel_type}
                        </span>
                      </div>
                      {log.station && (
                        <p className="text-xs text-muted-foreground break-words">
                          Posto: {log.station}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>Litros: {Number(log.liters).toFixed(1)}</span>
                        <span>R$/L: R$ {pricePerLiter.toFixed(2)}</span>
                        {log.odometer_km && (
                          <span>
                            Km: {Number(log.odometer_km).toLocaleString("pt-BR")} km
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="text-sm font-semibold text-primary">
                        R$ {Number(log.total_value).toFixed(2)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteFuelLog.mutate(log.id)}
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
              <CardTitle className="text-lg">Histórico de Abastecimentos</CardTitle>
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
                        Posto
                      </th>
                      <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">
                        Tipo
                      </th>
                      <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground hidden sm:table-cell">
                        Litros
                      </th>
                      <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground hidden md:table-cell">
                        R$/L
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
                    {fuelLogs.map((log) => (
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
                        <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm capitalize">
                          {log.fuel_type}
                        </td>
                        <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm text-right hidden sm:table-cell">
                          {Number(log.liters).toFixed(1)}
                        </td>
                        <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm text-right hidden md:table-cell">
                          R$ {(Number(log.total_value) / Number(log.liters)).toFixed(2)}
                        </td>
                        <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm text-right font-medium text-primary">
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
                            onClick={() => deleteFuelLog.mutate(log.id)}
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
