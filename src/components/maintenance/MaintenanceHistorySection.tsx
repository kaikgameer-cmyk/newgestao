import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, ChevronUp, History, Gauge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MaintenanceHistoryRecord } from "@/hooks/useMaintenanceHistory";

interface MaintenanceHistorySectionProps {
  historyRecords: MaintenanceHistoryRecord[];
  maintenanceRecords: Array<{ id: string; title: string }>;
  isLoading: boolean;
}

export function MaintenanceHistorySection({
  historyRecords,
  maintenanceRecords,
  isLoading,
}: MaintenanceHistorySectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getMaintenanceTitle = (maintenanceId: string) => {
    const record = maintenanceRecords.find((m) => m.id === maintenanceId);
    return record?.title || "Manutenção";
  };

  if (isLoading) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-card border-border">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-lg flex items-center gap-2 break-words">
                <History className="h-5 w-5 text-primary" />
                Histórico de Manutenções ({historyRecords.length})
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {historyRecords.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                Nenhuma manutenção concluída ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {historyRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border"
                  >
                  <div className="space-y-1 min-w-0">
                    <p className="font-medium text-foreground break-words">
                      {getMaintenanceTitle(record.maintenance_id)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Realizada em{" "}
                      {format(new Date(record.performed_at), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                    {record.notes && (
                      <p className="text-sm text-muted-foreground italic break-words">
                        {record.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right space-y-1 flex-shrink-0">
                    <div className="flex items-center justify-end gap-1 text-sm text-foreground">
                      <Gauge className="h-3.5 w-3.5 text-primary" />
                      <span>{record.performed_km.toLocaleString()} km</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Próx: {record.next_due_km.toLocaleString()} km
                    </p>
                  </div>
                </div>
              ))}
            </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
