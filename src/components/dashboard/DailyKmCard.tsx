import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gauge, Edit2, Check, X, Trash2, DollarSign, Clock } from "lucide-react";
import { useDailyKm, DailyKmLog } from "@/hooks/useDailyKm";
import { format } from "date-fns";

interface DailyKmCardProps {
  date: Date;
  dayRevenue?: number;
  dayWorkedHours?: number;
}

export function DailyKmCard({ date, dayRevenue = 0, dayWorkedHours = 0 }: DailyKmCardProps) {
  const { getKmForDate, upsertKm, deleteKm } = useDailyKm();
  const kmLog = getKmForDate(date);

  const [isEditing, setIsEditing] = useState(false);
  const [editMode, setEditMode] = useState<"start" | "end" | "both">("both");
  const [startKm, setStartKm] = useState("");
  const [endKm, setEndKm] = useState("");

  // Calculate metrics
  const kmDriven = kmLog?.km_driven ?? 0;
  const hasKmEnd = kmLog?.end_km !== null && kmLog?.end_km !== undefined;
  const revenuePerKm = kmDriven > 0 ? dayRevenue / kmDriven : 0;
  const revenuePerHour = dayWorkedHours > 0 ? dayRevenue / dayWorkedHours : 0;

  const handleEditStart = () => {
    setStartKm(kmLog?.start_km?.toString() || "");
    setEndKm("");
    setEditMode("start");
    setIsEditing(true);
  };

  const handleEditEnd = () => {
    setStartKm(kmLog?.start_km?.toString() || "");
    setEndKm(kmLog?.end_km?.toString() || "");
    setEditMode("end");
    setIsEditing(true);
  };

  const handleEditBoth = () => {
    setStartKm(kmLog?.start_km?.toString() || "");
    setEndKm(kmLog?.end_km?.toString() || "");
    setEditMode("both");
    setIsEditing(true);
  };

  const handleSave = async () => {
    const start = parseInt(startKm);
    
    if (isNaN(start)) {
      return;
    }

    if (editMode === "start") {
      // Save only start_km
      await upsertKm.mutateAsync({ date, startKm: start, endKm: null });
    } else {
      // Save both or just end
      const end = parseInt(endKm);
      if (isNaN(end) || end < start) {
        return;
      }
      await upsertKm.mutateAsync({ date, startKm: start, endKm: end });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setStartKm("");
    setEndKm("");
  };

  const handleDelete = async () => {
    if (kmLog) {
      await deleteKm.mutateAsync(kmLog.id);
    }
  };

  // Editing state
  if (isEditing) {
    const canSave = editMode === "start" 
      ? !isNaN(parseInt(startKm)) && parseInt(startKm) >= 0
      : !isNaN(parseInt(startKm)) && !isNaN(parseInt(endKm)) && parseInt(endKm) >= parseInt(startKm);

    return (
      <Card variant="elevated" className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" />
            KM do Dia - {format(date, "dd/MM")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">KM Inicial</Label>
              <Input
                type="number"
                value={startKm}
                onChange={(e) => setStartKm(e.target.value)}
                placeholder="Ex: 45000"
                className="h-9"
                disabled={editMode === "end"}
              />
            </div>
            <div>
              <Label className="text-xs">KM Final {editMode === "start" && "(opcional)"}</Label>
              <Input
                type="number"
                value={endKm}
                onChange={(e) => setEndKm(e.target.value)}
                placeholder={editMode === "start" ? "Depois" : "Ex: 45200"}
                className="h-9"
                disabled={editMode === "start"}
              />
            </div>
          </div>
          
          {editMode !== "start" && parseInt(endKm) >= parseInt(startKm) && startKm && endKm && (
            <p className="text-sm text-muted-foreground text-center">
              Rodado: <span className="font-bold text-primary">{parseInt(endKm) - parseInt(startKm)} km</span>
            </p>
          )}
          
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="w-4 h-4 mr-1" /> Cancelar
            </Button>
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={upsertKm.isPending || !canSave}
            >
              <Check className="w-4 h-4 mr-1" /> 
              {editMode === "start" ? "Salvar Inicial" : "Salvar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Display state - no data yet
  if (!kmLog) {
    return (
      <Card variant="elevated">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" />
            KM do Dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={handleEditStart}>
            Registrar KM inicial
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Display state - has start but no end
  if (!hasKmEnd) {
    return (
      <Card variant="elevated" className="border-yellow-500/30 bg-yellow-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Gauge className="w-4 h-4 text-yellow-500" />
              KM do Dia
            </CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDelete}>
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Inicial</span>
            <span className="font-medium">{kmLog.start_km.toLocaleString("pt-BR")} km</span>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-yellow-600 mb-2">Aguardando KM final...</p>
            <Button variant="default" size="sm" className="w-full" onClick={handleEditEnd}>
              Informar KM Final
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Display state - complete
  return (
    <Card variant="elevated" className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" />
            KM do Dia
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDelete}>
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEditBoth}>
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Inicial</span>
            <span>{kmLog.start_km.toLocaleString("pt-BR")} km</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Final</span>
            <span>{kmLog.end_km?.toLocaleString("pt-BR")} km</span>
          </div>
          <div className="pt-2 border-t border-border flex justify-between">
            <span className="text-sm font-medium">Rodado</span>
            <span className="text-lg font-bold text-primary">{kmDriven.toLocaleString("pt-BR")} km</span>
          </div>
          
          {/* R$/KM do dia */}
          {kmDriven > 0 && dayRevenue > 0 && (
            <div className="pt-2 border-t border-border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <DollarSign className="w-3 h-3" />
                <span>R$/KM do dia</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">
                  R$ {dayRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / {kmDriven} km
                </span>
                <span className="text-lg font-bold text-green-500">
                  R$ {revenuePerKm.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>
          )}

          {/* R$/hora if timer has hours */}
          {dayWorkedHours > 0 && dayRevenue > 0 && (
            <div className="pt-2 border-t border-border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Clock className="w-3 h-3" />
                <span>R$/hora do dia</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">
                  {dayWorkedHours.toFixed(1).replace(".", ",")}h trabalhadas
                </span>
                <span className="text-lg font-bold text-blue-500">
                  R$ {revenuePerHour.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>
          )}

          {/* Empty state for metrics */}
          {kmDriven > 0 && dayRevenue === 0 && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                Sem receita registrada para calcular R$/KM
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}