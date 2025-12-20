import { useState, useEffect, useMemo } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Clock, MapPin, Car } from "lucide-react";
import { useIncomeDay, IncomeDay, IncomeDayItem } from "@/hooks/useIncomeDay";
import { usePlatforms, Platform } from "@/hooks/usePlatforms";
import { format } from "date-fns";

interface IncomeDayFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  existingData?: IncomeDay | null;
}

interface PlatformAmount {
  platform: Platform;
  amount: string;
}

export function IncomeDayForm({
  open,
  onOpenChange,
  selectedDate,
  existingData,
}: IncomeDayFormProps) {
  const { saveIncomeDay } = useIncomeDay();
  const { enabledPlatforms, loadingPlatforms } = usePlatforms();

  // Form state
  const [kmRodados, setKmRodados] = useState("");
  const [horasTrabalhadas, setHorasTrabalhadas] = useState("");
  const [trips, setTrips] = useState("");
  const [notes, setNotes] = useState("");
  
  // Platform amounts - one input per enabled platform
  const [platformAmounts, setPlatformAmounts] = useState<Record<string, string>>({});

  // Get all platforms to show (enabled + any with existing data)
  const platformsToShow = useMemo(() => {
    if (!existingData) return enabledPlatforms;
    
    // Include enabled platforms + any platforms with existing items
    const existingPlatformKeys = existingData.items.map((item) => item.platform);
    const allPlatforms = [...enabledPlatforms];
    
    // Add legacy platforms that have data but aren't in enabled list
    existingPlatformKeys.forEach((key) => {
      if (!allPlatforms.find((p) => p.key === key)) {
        // Create a synthetic platform entry for legacy data
        allPlatforms.push({
          id: key,
          key,
          name: existingData.items.find((i) => i.platform === key)?.platform_label || key,
          is_other: false,
          is_active: false,
          user_id: null,
        });
      }
    });
    
    return allPlatforms;
  }, [enabledPlatforms, existingData]);

  // Reset form when dialog opens or data changes
  useEffect(() => {
    if (open) {
      if (existingData) {
        setKmRodados(existingData.km_rodados?.toString() || "");
        setHorasTrabalhadas(formatMinutesToTime(existingData.hours_minutes || 0));
        // Get trips from items (legacy) or use 0
        const totalTrips = existingData.items.reduce((sum, item) => sum + item.trips, 0);
        setTrips(totalTrips.toString() || "");
        setNotes(existingData.notes || "");
        
        // Populate platform amounts from existing items
        const amounts: Record<string, string> = {};
        existingData.items.forEach((item) => {
          amounts[item.platform] = item.amount.toString();
        });
        setPlatformAmounts(amounts);
      } else {
        setKmRodados("");
        setHorasTrabalhadas("");
        setTrips("");
        setNotes("");
        setPlatformAmounts({});
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

  const updatePlatformAmount = (platformKey: string, value: string) => {
    setPlatformAmounts((prev) => ({
      ...prev,
      [platformKey]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const totalTrips = parseInt(trips) || 0;
    const platformCount = Object.values(platformAmounts).filter((v) => parseFloat(v) > 0).length;
    const tripsPerPlatform = platformCount > 0 ? Math.floor(totalTrips / platformCount) : 0;
    const remainder = platformCount > 0 ? totalTrips % platformCount : 0;

    // Build items from platform amounts
    let platformIndex = 0;
    const items: IncomeDayItem[] = platformsToShow
      .filter((p) => {
        const amount = parseFloat(platformAmounts[p.key] || "0");
        return amount > 0;
      })
      .map((p) => {
        // Distribute trips evenly with remainder going to first platforms
        const itemTrips = tripsPerPlatform + (platformIndex < remainder ? 1 : 0);
        platformIndex++;
        return {
          platform: p.key,
          platform_label: p.user_id ? p.name : null,
          amount: parseFloat(platformAmounts[p.key] || "0"),
          trips: itemTrips,
          payment_method: null,
          notes: null,
        };
      });

    const data: IncomeDay = {
      id: existingData?.id,
      date: format(selectedDate, "yyyy-MM-dd"),
      km_rodados: parseInt(kmRodados) || 0,
      hours_minutes: parseTimeToMinutes(horasTrabalhadas),
      trips: totalTrips,
      notes: notes || null,
      items,
    };

    saveIncomeDay.mutate(data, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  // Calculate total
  const totalAmount = useMemo(() => {
    return Object.values(platformAmounts).reduce((sum, val) => {
      return sum + (parseFloat(val) || 0);
    }, 0);
  }, [platformAmounts]);

  // Validation
  const hasAtLeastOnePlatformWithValue = Object.values(platformAmounts).some(
    (val) => parseFloat(val) > 0
  );
  const isFormValid =
    parseInt(kmRodados) > 0 &&
    parseTimeToMinutes(horasTrabalhadas) > 0 &&
    parseInt(trips) > 0 &&
    hasAtLeastOnePlatformWithValue;

  const getPlatformColor = (key: string): string => {
    if (key === "uber") return "bg-black";
    if (key === "99") return "bg-[#FFB800]";
    if (key === "indrive") return "bg-[#2DCC70]";
    return "bg-primary";
  };

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
              
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="trips" className="flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5" />
                    Viagens *
                  </Label>
                  <Input
                    id="trips"
                    type="number"
                    placeholder="25"
                    value={trips}
                    onChange={(e) => setTrips(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="km" className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    KM *
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
                    Horas *
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

          {/* Platform value inputs */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Valor por Plataforma</h4>
              
              {loadingPlatforms ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : platformsToShow.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma plataforma habilitada. Vá em Configurações para ativar.
                </p>
              ) : (
                <div className="space-y-3">
                  {platformsToShow.map((platform) => (
                    <div key={platform.key} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${getPlatformColor(platform.key)}`} />
                      <Label className="w-24 shrink-0 font-medium">
                        {platform.name}
                      </Label>
                      <div className="flex-1">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={platformAmounts[platform.key] || ""}
                          onChange={(e) => updatePlatformAmount(platform.key, e.target.value)}
                          className="text-right"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Totals */}
          <Card className="bg-secondary/30">
            <CardContent className="p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total do Dia</span>
                <p className="text-xl font-bold text-primary">
                  R$ {totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
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
