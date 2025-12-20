import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Loader2, Clock, MapPin, Car } from "lucide-react";
import { useIncomeDay, IncomeDay, IncomeDayItem } from "@/hooks/useIncomeDay";
import { format } from "date-fns";

interface IncomeDayFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  existingData?: IncomeDay | null;
}

const PLATFORMS = [
  { value: "uber", label: "Uber" },
  { value: "99", label: "99" },
  { value: "indrive", label: "inDrive" },
  { value: "outro", label: "Outro" },
];

const emptyItem: IncomeDayItem = {
  platform: "",
  amount: 0,
  trips: 0,
  platform_label: null,
  payment_method: null,
  notes: null,
};

export function IncomeDayForm({
  open,
  onOpenChange,
  selectedDate,
  existingData,
}: IncomeDayFormProps) {
  const { saveIncomeDay } = useIncomeDay();

  // Form state
  const [kmRodados, setKmRodados] = useState("");
  const [horasTrabalhadas, setHorasTrabalhadas] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<IncomeDayItem[]>([{ ...emptyItem }]);

  // Reset form when dialog opens or data changes
  useEffect(() => {
    if (open) {
      if (existingData) {
        setKmRodados(existingData.km_rodados?.toString() || "");
        setHorasTrabalhadas(formatMinutesToTime(existingData.hours_minutes || 0));
        setNotes(existingData.notes || "");
        setItems(
          existingData.items.length > 0
            ? existingData.items.map((item) => ({ ...item }))
            : [{ ...emptyItem }]
        );
      } else {
        setKmRodados("");
        setHorasTrabalhadas("");
        setNotes("");
        setItems([{ ...emptyItem }]);
      }
    }
  }, [open, existingData]);

  const formatMinutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  const parseTimeToMinutes = (time: string): number => {
    if (!time) return 0;
    if (time.includes(":")) {
      const [hours, mins] = time.split(":").map(Number);
      return (hours || 0) * 60 + (mins || 0);
    }
    const decimal = parseFloat(time);
    return Math.round(decimal * 60);
  };

  const addItem = () => {
    setItems([...items, { ...emptyItem }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof IncomeDayItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: IncomeDay = {
      id: existingData?.id,
      date: format(selectedDate, "yyyy-MM-dd"),
      km_rodados: parseInt(kmRodados) || 0,
      hours_minutes: parseTimeToMinutes(horasTrabalhadas),
      notes: notes || null,
      items: items.map((item) => ({
        ...item,
        amount: typeof item.amount === "string" ? parseFloat(item.amount) || 0 : item.amount,
        trips: typeof item.trips === "string" ? parseInt(item.trips as any) || 0 : item.trips,
      })),
    };

    saveIncomeDay.mutate(data, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  // Calculate totals
  const totalAmount = items.reduce(
    (sum, item) => sum + (typeof item.amount === "string" ? parseFloat(item.amount) || 0 : item.amount),
    0
  );
  const totalTrips = items.reduce(
    (sum, item) => sum + (typeof item.trips === "string" ? parseInt(item.trips as any) || 0 : item.trips),
    0
  );

  const isFormValid =
    parseInt(kmRodados) > 0 &&
    parseTimeToMinutes(horasTrabalhadas) > 0 &&
    items.every(
      (item) =>
        item.platform &&
        (typeof item.amount === "string" ? parseFloat(item.amount) : item.amount) > 0 &&
        (typeof item.trips === "string" ? parseInt(item.trips as any) : item.trips) > 0
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingData ? "Editar" : "Nova"} Receita do Dia —{" "}
            {format(selectedDate, "dd/MM/yyyy")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Day-level fields */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Dados do Dia</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="km" className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    KM Rodados *
                  </Label>
                  <Input
                    id="km"
                    type="number"
                    placeholder="150"
                    value={kmRodados}
                    onChange={(e) => setKmRodados(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="hours" className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Horas Trabalhadas *
                  </Label>
                  <Input
                    id="hours"
                    type="text"
                    placeholder="10:30"
                    value={horasTrabalhadas}
                    onChange={(e) => setHorasTrabalhadas(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Observação</Label>
                <Textarea
                  id="notes"
                  placeholder="Observações gerais do dia..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Platform items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm flex items-center gap-1.5">
                <Car className="w-4 h-4" />
                Plataformas
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {items.map((item, index) => (
              <Card key={index} className="border-dashed">
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Plataforma {index + 1}
                    </span>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>App *</Label>
                      <Select
                        value={item.platform}
                        onValueChange={(v) => updateItem(index, "platform", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {PLATFORMS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {item.platform === "outro" && (
                      <div className="space-y-1.5">
                        <Label>Nome do App</Label>
                        <Input
                          placeholder="Ex: Bolt"
                          value={item.platform_label || ""}
                          onChange={(e) =>
                            updateItem(index, "platform_label", e.target.value)
                          }
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label>Valor (R$) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="250.00"
                        value={item.amount || ""}
                        onChange={(e) =>
                          updateItem(index, "amount", e.target.value)
                        }
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Viagens *</Label>
                      <Input
                        type="number"
                        placeholder="15"
                        value={item.trips || ""}
                        onChange={(e) =>
                          updateItem(index, "trips", e.target.value)
                        }
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Totals */}
          <Card className="bg-secondary/30">
            <CardContent className="p-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total do Dia</span>
                <div className="text-right">
                  <p className="font-bold text-primary">
                    R$ {totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">{totalTrips} viagens</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="hero"
              className="flex-1"
              disabled={!isFormValid || saveIncomeDay.isPending}
            >
              {saveIncomeDay.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
