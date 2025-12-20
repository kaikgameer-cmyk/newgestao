import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Gauge, DollarSign, Clock, Edit2, Plus } from "lucide-react";
import { useDailyWorkSummary } from "@/hooks/useDailyWorkSummary";
import { format } from "date-fns";

interface DayYieldCardProps {
  date: Date;
  dayRevenue: number;
}

export function DayYieldCard({ date, dayRevenue }: DayYieldCardProps) {
  const { getSummaryForDate, upsertSummary, formatMinutesToTime, parseTimeToMinutes } = useDailyWorkSummary();
  const summary = getSummaryForDate(date);

  const [showModal, setShowModal] = useState(false);
  const [kmRodados, setKmRodados] = useState("");
  const [horasTrabalhadas, setHorasTrabalhadas] = useState("");

  const kmDriven = summary?.km_rodados ?? 0;
  const workedMinutes = summary?.worked_minutes ?? 0;
  const workedHours = workedMinutes / 60;

  const revenuePerKm = kmDriven > 0 ? dayRevenue / kmDriven : 0;
  const revenuePerHour = workedHours > 0 ? dayRevenue / workedHours : 0;

  const handleOpenModal = () => {
    setKmRodados(summary?.km_rodados?.toString() || "");
    setHorasTrabalhadas(summary?.worked_minutes ? formatMinutesToTime(summary.worked_minutes) : "");
    setShowModal(true);
  };

  const handleSave = async () => {
    const km = kmRodados ? parseInt(kmRodados) : null;
    const minutes = horasTrabalhadas ? parseTimeToMinutes(horasTrabalhadas) : null;
    
    await upsertSummary.mutateAsync({
      date,
      kmRodados: km,
      workedMinutes: minutes,
    });
    setShowModal(false);
  };

  const hasData = kmDriven > 0 || workedMinutes > 0;

  return (
    <>
      <Card variant="elevated" className={hasData ? "border-primary/20" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Gauge className="w-4 h-4 text-primary" />
              Rendimento do Dia
            </CardTitle>
            {hasData && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleOpenModal}>
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Informe KM rodados e horas trabalhadas para calcular R$/KM e R$/hora
              </p>
              <Button variant="outline" className="w-full" onClick={handleOpenModal}>
                <Plus className="w-4 h-4 mr-2" />
                Informar KM/Horas do dia
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* KM Rodados */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">KM rodados</span>
                <span className="font-medium">{kmDriven.toLocaleString("pt-BR")} km</span>
              </div>

              {/* Horas trabalhadas */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Horas trabalhadas</span>
                <span className="font-medium">{formatMinutesToTime(workedMinutes)}</span>
              </div>

              {/* R$/KM */}
              {kmDriven > 0 && dayRevenue > 0 && (
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <DollarSign className="w-3 h-3" />
                    <span>R$/KM do dia</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">
                      R$ {dayRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ÷ {kmDriven} km
                    </span>
                    <span className="text-lg font-bold text-green-500">
                      R$ {revenuePerKm.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>
              )}

              {/* R$/hora */}
              {workedHours > 0 && dayRevenue > 0 && (
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Clock className="w-3 h-3" />
                    <span>R$/hora do dia</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">
                      {workedHours.toFixed(1).replace(".", ",")}h trabalhadas
                    </span>
                    <span className="text-lg font-bold text-blue-500">
                      R$ {revenuePerHour.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>
              )}

              {/* Empty state for metrics */}
              {kmDriven === 0 && dayRevenue > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground text-center">
                    Informe KM para calcular R$/KM
                  </p>
                </div>
              )}
              {workedMinutes === 0 && dayRevenue > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground text-center">
                    Informe horas para calcular R$/hora
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal for editing */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dados do Dia - {format(date, "dd/MM/yyyy")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>KM rodados</Label>
              <Input
                type="number"
                value={kmRodados}
                onChange={(e) => setKmRodados(e.target.value)}
                placeholder="Ex: 200"
              />
              <p className="text-xs text-muted-foreground">Total de quilômetros rodados no dia</p>
            </div>
            <div className="space-y-2">
              <Label>Horas trabalhadas (HH:MM)</Label>
              <Input
                type="text"
                value={horasTrabalhadas}
                onChange={(e) => setHorasTrabalhadas(e.target.value)}
                placeholder="Ex: 10:30"
              />
              <p className="text-xs text-muted-foreground">Formato: horas:minutos (ex: 10:30 = 10h30min)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={upsertSummary.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
