import { Card, CardContent } from "@/components/ui/card";
import { Wrench, CheckCircle2, AlertTriangle, AlertCircle, ClipboardCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface MaintenanceSummaryCardProps {
  total: number;
  ok: number;
  warning: number;
  overdue: number;
  completed?: number;
  compact?: boolean;
}

export function MaintenanceSummaryCard({
  total,
  ok,
  warning,
  overdue,
  completed = 0,
  compact = false,
}: MaintenanceSummaryCardProps) {
  if (compact) {
    return (
      <Card variant="elevated" className="hover:border-primary/20 transition-colors">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-bold mb-1">Manutenções</p>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1 text-green-500">
              <CheckCircle2 className="w-3 h-3" />
              {ok}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-yellow-500">
              <AlertTriangle className="w-3 h-3" />
              {warning}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-red-500">
              <AlertCircle className="w-3 h-3" />
              {overdue}
            </span>
          </div>
          <Button variant="link" size="sm" className="mt-2 p-0 h-auto" asChild>
            <Link to="/dashboard/manutencao">Ver detalhes</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Wrench className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Manutenções por Quilometragem</h3>
            <p className="text-sm text-muted-foreground">
              Acompanhe as manutenções do seu veículo
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="text-center p-3 rounded-lg bg-primary/10">
            <ClipboardCheck className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-primary break-words">{completed}</p>
            <p className="text-xs text-muted-foreground">Concluídas</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-green-500/10">
            <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-500 break-words">{ok}</p>
            <p className="text-xs text-muted-foreground">Em dia</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-yellow-500/10">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-yellow-500 break-words">{warning}</p>
            <p className="text-xs text-muted-foreground">Próximas</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-500/10">
            <AlertCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-500 break-words">{overdue}</p>
            <p className="text-xs text-muted-foreground">Vencidas</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
