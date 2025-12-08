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
import { Plus, Fuel as FuelIcon, Gauge, DollarSign, TrendingUp, Loader2, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth } from "date-fns";

export default function FuelControl() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [station, setStation] = useState("");
  const [liters, setLiters] = useState("");
  const [totalValue, setTotalValue] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [odometerKm, setOdometerKm] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const { data: fuelLogs = [], isLoading } = useQuery({
    queryKey: ["fuel_logs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("fuel_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const createFuelLog = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("fuel_logs").insert({
        user_id: user.id,
        date,
        station: station || null,
        liters: parseFloat(liters),
        total_value: parseFloat(totalValue),
        fuel_type: fuelType,
        odometer_km: odometerKm ? parseFloat(odometerKm) : null,
        payment_method: paymentMethod || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel_logs"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Abastecimento registrado!" });
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
      queryClient.invalidateQueries({ queryKey: ["fuel_logs"] });
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
  };

  // Calculate metrics
  const monthlyLogs = fuelLogs.filter(
    (log) => new Date(log.date) >= monthStart && new Date(log.date) <= monthEnd
  );
  const totalMonthValue = monthlyLogs.reduce((sum, log) => sum + Number(log.total_value), 0);
  const totalLiters = monthlyLogs.reduce((sum, log) => sum + Number(log.liters), 0);
  const avgPricePerLiter = totalLiters > 0 ? totalMonthValue / totalLiters : 0;

  // Calculate average consumption (km/l) from odometer readings
  const sortedLogs = [...fuelLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let avgConsumption = 0;
  if (sortedLogs.length >= 2) {
    let totalKm = 0;
    let totalLitersForConsumption = 0;
    for (let i = 1; i < sortedLogs.length; i++) {
      if (sortedLogs[i].odometer_km && sortedLogs[i - 1].odometer_km) {
        const kmDiff = Number(sortedLogs[i].odometer_km) - Number(sortedLogs[i - 1].odometer_km);
        if (kmDiff > 0) {
          totalKm += kmDiff;
          totalLitersForConsumption += Number(sortedLogs[i].liters);
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Combustível</h1>
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
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Registrar Abastecimento</DialogTitle>
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
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="debito">Débito</SelectItem>
                    <SelectItem value="credito">Cartão de Crédito</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" variant="hero" className="w-full" disabled={createFuelLog.isPending}>
                {createFuelLog.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Abastecimento"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Gauge className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Consumo Médio</span>
            </div>
            <p className="text-2xl font-bold">{avgConsumption > 0 ? `${avgConsumption.toFixed(1)} km/l` : "—"}</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FuelIcon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Preço Médio/Litro</span>
            </div>
            <p className="text-2xl font-bold">{avgPricePerLiter > 0 ? `R$ ${avgPricePerLiter.toFixed(2)}` : "—"}</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Custo por Km</span>
            </div>
            <p className="text-2xl font-bold">{costPerKm > 0 ? `R$ ${costPerKm.toFixed(2)}` : "—"}</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Total do Mês</span>
            </div>
            <p className="text-2xl font-bold">R$ {totalMonthValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
      </div>

      {/* Fuel Logs Table */}
      {fuelLogs.length === 0 ? (
        <Card variant="elevated" className="p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <FuelIcon className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Nenhum abastecimento registrado</h3>
              <p className="text-muted-foreground max-w-md">
                Registre seus abastecimentos para acompanhar seu consumo e custos com combustível.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Abastecimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Data</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Posto</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Tipo</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Litros</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">R$/L</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Total</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Km</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {fuelLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm">
                        {new Date(log.date).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-3 px-4 text-sm">{log.station || "—"}</td>
                      <td className="py-3 px-4 text-sm capitalize">{log.fuel_type}</td>
                      <td className="py-3 px-4 text-sm text-right">{Number(log.liters).toFixed(1)}</td>
                      <td className="py-3 px-4 text-sm text-right">
                        R$ {(Number(log.total_value) / Number(log.liters)).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-primary">
                        R$ {Number(log.total_value).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-muted-foreground">
                        {log.odometer_km ? Number(log.odometer_km).toLocaleString("pt-BR") : "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteFuelLog.mutate(log.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
