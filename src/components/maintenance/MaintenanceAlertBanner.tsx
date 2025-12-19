import { AlertTriangle, AlertCircle, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MaintenanceAlert {
  title: string;
  kmRemaining: number;
  status: "warning" | "overdue";
}

interface MaintenanceAlertBannerProps {
  alerts: MaintenanceAlert[];
  className?: string;
}

export function MaintenanceAlertBanner({
  alerts,
  className,
}: MaintenanceAlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || alerts.length === 0) return null;

  const mostUrgent = alerts[0];
  const formatKm = (km: number) => new Intl.NumberFormat("pt-BR").format(Math.abs(km));

  const isOverdue = mostUrgent.status === "overdue";

  return (
    <div
      className={cn(
        "rounded-lg p-3 flex items-center justify-between gap-3",
        isOverdue ? "bg-red-500/10 border border-red-500/20" : "bg-yellow-500/10 border border-yellow-500/20",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {isOverdue ? (
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
        )}
        <div className="text-sm">
          {isOverdue ? (
            <span className="text-red-500">
              <strong>Manutenção vencida:</strong> {mostUrgent.title} (você já passou{" "}
              {formatKm(mostUrgent.kmRemaining)} km do limite)
            </span>
          ) : (
            <span className="text-yellow-500">
              <strong>Próxima revisão:</strong> {mostUrgent.title} — faltam{" "}
              {formatKm(mostUrgent.kmRemaining)} km
            </span>
          )}
          {alerts.length > 1 && (
            <span className="text-muted-foreground ml-1">
              (+{alerts.length - 1} {alerts.length - 1 === 1 ? "outra" : "outras"})
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard/manutencao">Ver todas</Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setDismissed(true)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
