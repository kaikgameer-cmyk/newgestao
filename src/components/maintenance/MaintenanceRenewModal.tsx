import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, RotateCcw, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { MaintenanceRecord } from "@/hooks/useMaintenance";

interface MaintenanceRenewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    performed_at: string;
    performed_km: number;
    next_due_km: number;
    notes?: string;
  }) => Promise<void>;
  record: MaintenanceRecord | null;
  suggestedKm: number | null;
  isPending?: boolean;
}

export function MaintenanceRenewModal({
  open,
  onOpenChange,
  onSubmit,
  record,
  suggestedKm,
  isPending,
}: MaintenanceRenewModalProps) {
  const [performedAt, setPerformedAt] = useState(format(new Date(), "yyyy-MM-dd"));
  const [performedKm, setPerformedKm] = useState("");
  const [nextDueKm, setNextDueKm] = useState("");
  const [notes, setNotes] = useState("");

  // Reset form when modal opens
  useEffect(() => {
    if (open && record) {
      setPerformedAt(format(new Date(), "yyyy-MM-dd"));
      
      // Use suggested km (current vehicle odometer) as default
      const defaultKm = suggestedKm ?? record.next_km;
      setPerformedKm(String(defaultKm));
      
      // Calculate default next km based on the interval pattern
      const interval = record.next_km - record.current_km;
      const defaultNextKm = defaultKm + (interval > 0 ? interval : 5000);
      setNextDueKm(String(defaultNextKm));
      
      setNotes("");
    }
  }, [open, record, suggestedKm]);

  // Auto-update next km when performed km changes
  useEffect(() => {
    if (record && performedKm) {
      const km = parseInt(performedKm, 10);
      if (!isNaN(km)) {
        const interval = record.next_km - record.current_km;
        const nextKm = km + (interval > 0 ? interval : 5000);
        setNextDueKm(String(nextKm));
      }
    }
  }, [performedKm, record]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const km = parseInt(performedKm, 10);
    const nextKm = parseInt(nextDueKm, 10);
    
    if (isNaN(km) || isNaN(nextKm)) return;
    if (nextKm <= km) return;

    await onSubmit({
      performed_at: performedAt,
      performed_km: km,
      next_due_km: nextKm,
      notes: notes || undefined,
    });
  };

  const formatKm = (km: number) => new Intl.NumberFormat("pt-BR").format(km);

  if (!record) return null;

  const performedKmNum = parseInt(performedKm, 10);
  const nextDueKmNum = parseInt(nextDueKm, 10);
  const isValid = !isNaN(performedKmNum) && !isNaN(nextDueKmNum) && nextDueKmNum > performedKmNum;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 break-words">
            <RotateCcw className="w-5 h-5 text-primary" />
            Renovar Manutenção
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Maintenance info */}
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <p className="font-medium">{record.title}</p>
            <p className="text-sm text-muted-foreground">
              Km anterior: {formatKm(record.current_km)} km → Próxima em: {formatKm(record.next_km)} km
            </p>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="performed_at">Data da realização</Label>
            <Input
              id="performed_at"
              type="date"
              value={performedAt}
              onChange={(e) => setPerformedAt(e.target.value)}
              required
            />
          </div>

          {/* Performed KM */}
          <div className="space-y-2">
            <Label htmlFor="performed_km">Km em que foi realizada</Label>
            <Input
              id="performed_km"
              type="number"
              value={performedKm}
              onChange={(e) => setPerformedKm(e.target.value)}
              placeholder="Ex: 50000"
              required
              min={0}
            />
            {suggestedKm && (
              <p className="text-xs text-muted-foreground">
                Km atual do veículo: {formatKm(suggestedKm)} km
              </p>
            )}
          </div>

          {/* Next Due KM */}
          <div className="space-y-2">
            <Label htmlFor="next_due_km">Próxima manutenção em</Label>
            <Input
              id="next_due_km"
              type="number"
              value={nextDueKm}
              onChange={(e) => setNextDueKm(e.target.value)}
              placeholder="Ex: 55000"
              required
              min={0}
            />
            {!isNaN(performedKmNum) && !isNaN(nextDueKmNum) && nextDueKmNum > performedKmNum && (
              <p className="text-xs text-muted-foreground">
                Intervalo: {formatKm(nextDueKmNum - performedKmNum)} km
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Trocado óleo 5W30 sintético"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !isValid}>
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Concluir Manutenção
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
