import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MaintenanceStatusBadgeProps {
  status: "ok" | "warning" | "overdue";
  kmRemaining: number;
  showKm?: boolean;
}

export function MaintenanceStatusBadge({
  status,
  kmRemaining,
  showKm = true,
}: MaintenanceStatusBadgeProps) {
  const formatKm = (km: number) => {
    return new Intl.NumberFormat("pt-BR").format(Math.abs(km));
  };

  const config = {
    ok: {
      label: "Em dia",
      icon: CheckCircle2,
      className: "bg-green-500/10 text-green-500 border-green-500/20",
    },
    warning: {
      label: "Próxima",
      icon: AlertTriangle,
      className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    },
    overdue: {
      label: "Vencida",
      icon: AlertCircle,
      className: "bg-red-500/10 text-red-500 border-red-500/20",
    },
  };

  const { label, icon: Icon, className } = config[status];

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={cn("gap-1", className)}>
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
      {showKm && (
        <span
          className={cn(
            "text-sm font-medium",
            status === "ok" && "text-green-500",
            status === "warning" && "text-yellow-500",
            status === "overdue" && "text-red-500"
          )}
        >
          {status === "overdue" ? `-${formatKm(kmRemaining)} km` : `+${formatKm(kmRemaining)} km`}
        </span>
      )}
    </div>
  );
}
