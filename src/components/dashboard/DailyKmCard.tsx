import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gauge, Edit2, Check, X, Trash2 } from "lucide-react";
import { useDailyKm } from "@/hooks/useDailyKm";
import { format } from "date-fns";

interface DailyKmCardProps {
  date: Date;
}

export function DailyKmCard({ date }: DailyKmCardProps) {
  const { getKmForDate, upsertKm, deleteKm } = useDailyKm();
  const kmLog = getKmForDate(date);

  const [isEditing, setIsEditing] = useState(false);
  const [startKm, setStartKm] = useState("");
  const [endKm, setEndKm] = useState("");

  const handleEdit = () => {
    setStartKm(kmLog?.start_km?.toString() || "");
    setEndKm(kmLog?.end_km?.toString() || "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    const start = parseFloat(startKm);
    const end = parseFloat(endKm);
    
    if (isNaN(start) || isNaN(end)) {
      return;
    }

    if (end < start) {
      return;
    }

    await upsertKm.mutateAsync({ date, startKm: start, endKm: end });
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

  if (isEditing) {
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
                placeholder="0"
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">KM Final</Label>
              <Input
                type="number"
                value={endKm}
                onChange={(e) => setEndKm(e.target.value)}
                placeholder="0"
                className="h-9"
              />
            </div>
          </div>
          {parseFloat(endKm) >= parseFloat(startKm) && startKm && endKm && (
            <p className="text-sm text-muted-foreground text-center">
              Rodado: <span className="font-bold text-primary">{(parseFloat(endKm) - parseFloat(startKm)).toFixed(1)} km</span>
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="w-4 h-4 mr-1" /> Cancelar
            </Button>
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={upsertKm.isPending || !startKm || !endKm || parseFloat(endKm) < parseFloat(startKm)}
            >
              <Check className="w-4 h-4 mr-1" /> Salvar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className={kmLog ? "border-primary/20" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" />
            KM do Dia
          </CardTitle>
          <div className="flex gap-1">
            {kmLog && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDelete}>
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEdit}>
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {kmLog ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Inicial</span>
              <span>{kmLog.start_km.toLocaleString("pt-BR")} km</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Final</span>
              <span>{kmLog.end_km.toLocaleString("pt-BR")} km</span>
            </div>
            <div className="pt-2 border-t border-border flex justify-between">
              <span className="text-sm font-medium">Rodado</span>
              <span className="text-lg font-bold text-primary">{kmLog.km_driven.toLocaleString("pt-BR")} km</span>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full" onClick={handleEdit}>
            Registrar KM do dia
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
