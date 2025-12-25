import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Wrench, Loader2, Pencil, Trash2, RotateCcw, Fuel, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMaintenance, MaintenanceRecord } from "@/hooks/useMaintenance";
import { useMaintenanceHistory } from "@/hooks/useMaintenanceHistory";
import { MaintenanceModal } from "@/components/maintenance/MaintenanceModal";
import { MaintenanceDeleteDialog } from "@/components/maintenance/MaintenanceDeleteDialog";
import { MaintenanceStatusBadge } from "@/components/maintenance/MaintenanceStatusBadge";
import { MaintenanceSummaryCard } from "@/components/maintenance/MaintenanceSummaryCard";
import { MaintenanceRenewModal } from "@/components/maintenance/MaintenanceRenewModal";
import { MaintenanceHistorySection } from "@/components/maintenance/MaintenanceHistorySection";
import { MaintenanceAlertBanner } from "@/components/maintenance/MaintenanceAlertBanner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Maintenance() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<MaintenanceRecord | null>(null);
  const [renewRecord, setRenewRecord] = useState<MaintenanceRecord | null>(null);

  const { toast } = useToast();
  const {
    isLoading,
    latestOdometer,
    odometerSource,
    odometerDate,
    getSortedRecords,
    getCounts,
    createMaintenance,
    updateMaintenance,
    deleteMaintenance,
  } = useMaintenance();

  const { historyRecords, isLoading: historyLoading, completedCount, createHistoryRecord } = useMaintenanceHistory();

  const sortedRecords = getSortedRecords();
  const counts = getCounts();

  // Build alerts for warning/overdue maintenance
  const maintenanceAlerts = sortedRecords
    .filter((r) => r.status === "warning" || r.status === "overdue")
    .map((r) => ({
      title: r.title,
      kmRemaining: r.next_km - (latestOdometer || 0),
      status: r.status as "warning" | "overdue",
    }))
    .sort((a, b) => a.kmRemaining - b.kmRemaining);

  const formatKm = (km: number) => new Intl.NumberFormat("pt-BR").format(km);
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      const [year, month, day] = dateStr.split("-").map(Number);
      return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
    }
  };

  const handleCreate = async (data: {
    title: string;
    description?: string;
    current_km: number;
    next_km: number;
    date: string;
  }) => {
    await createMaintenance.mutateAsync(data);
    toast({ title: "Manutenção cadastrada com sucesso!" });
  };

  const handleEdit = async (data: {
    title: string;
    description?: string;
    current_km: number;
    next_km: number;
    date: string;
  }) => {
    if (!editingRecord) return;
    await updateMaintenance.mutateAsync({ id: editingRecord.id, ...data });
    setEditingRecord(null);
    toast({ title: "Manutenção atualizada com sucesso!" });
  };

  const handleDelete = async () => {
    if (!deleteRecord) return;
    await deleteMaintenance.mutateAsync(deleteRecord.id);
    setDeleteRecord(null);
    toast({ title: "Manutenção excluída com sucesso." });
  };

  const handleRenew = async (data: {
    performed_at: string;
    performed_km: number;
    next_due_km: number;
    notes?: string;
  }) => {
    if (!renewRecord) return;
    await createHistoryRecord.mutateAsync({
      maintenance_id: renewRecord.id,
      ...data,
    });
    setRenewRecord(null);
    toast({ title: "Manutenção concluída e renovada com sucesso!" });
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getSourceLabel = () => {
    if (!odometerSource) return "";
    return odometerSource === "fuel" ? "Combustível" : "Elétrico";
  };

  const getSourceIcon = () => {
    if (!odometerSource) return null;
    return odometerSource === "fuel" ? (
      <Fuel className="w-3 h-3" />
    ) : (
      <Zap className="w-3 h-3" />
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold break-words">Manutenção</h1>
          <p className="text-muted-foreground">
            Controle as manutenções do seu veículo
          </p>
        </div>
        <Button variant="hero" size="lg" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-5 h-5" />
          Nova Manutenção
        </Button>
      </div>

      {/* Alert Banner */}
      <MaintenanceAlertBanner alerts={maintenanceAlerts} />

      {/* Summary Card */}
      <MaintenanceSummaryCard
        total={counts.total}
        ok={counts.ok}
        warning={counts.warning}
        overdue={counts.overdue}
        completed={completedCount}
      />

      {/* Current Odometer Info */}
      {latestOdometer && (
        <div className="text-sm text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <span>Km atual do veículo (último registro):</span>
            <span className="font-medium text-foreground">{formatKm(latestOdometer)} km</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {getSourceIcon()}
            <span>Fonte: {getSourceLabel()}</span>
            {odometerDate && (
              <>
                <span>•</span>
                <span>{formatDate(odometerDate)}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Maintenance List */}
      {sortedRecords.length === 0 ? (
        <Card variant="elevated" className="p-8 sm:p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Wrench className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Nenhuma manutenção cadastrada</h3>
              <p className="text-muted-foreground max-w-md">
                Registre as manutenções do seu veículo para acompanhar quando será a
                próxima revisão.
              </p>
            </div>
            <Button variant="hero" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-5 h-5" />
              Cadastrar Manutenção
            </Button>
          </div>
        </Card>
      ) : (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-lg">Manutenções Cadastradas</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {sortedRecords.map((record) => (
                <div
                  key={record.id}
                  className="rounded-lg border border-border bg-card p-3 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm font-medium break-words">{record.title}</p>
                      {record.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                          {record.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDate(record.date)} • Km manutenção: {formatKm(record.current_km)} km
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Próxima: {formatKm(record.next_km)} km
                      </p>
                      {latestOdometer && (
                        <p className="text-xs text-muted-foreground">
                          Km atual: {formatKm(latestOdometer)} km
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <MaintenanceStatusBadge
                        status={record.status}
                        kmRemaining={record.kmRemaining}
                      />
                      <div className="flex items-center gap-1">
                        {record.status === "overdue" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary"
                            onClick={() => setRenewRecord(record)}
                            title="Renovar/Concluir"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditingRecord(record)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteRecord(record)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[720px] text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">
                      Manutenção
                    </th>
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground hidden sm:table-cell">
                      Data
                    </th>
                    <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground hidden md:table-cell">
                      Km da manutenção
                    </th>
                    <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground hidden lg:table-cell">
                      Próxima em
                    </th>
                    <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground hidden xl:table-cell">
                      Km atual
                    </th>
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="py-3 px-2 sm:px-4">
                        <div>
                          <p className="text-sm font-medium break-words">{record.title}</p>
                          {record.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {record.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-sm hidden sm:table-cell">
                        {formatDate(record.date)}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-sm text-right hidden md:table-cell">
                        {formatKm(record.current_km)} km
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-sm text-right hidden lg:table-cell">
                        {formatKm(record.next_km)} km
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-sm text-right hidden xl:table-cell">
                        {latestOdometer ? `${formatKm(latestOdometer)} km` : "—"}
                      </td>
                      <td className="py-3 px-2 sm:px-4">
                        <MaintenanceStatusBadge
                          status={record.status}
                          kmRemaining={record.kmRemaining}
                        />
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {record.status === "overdue" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:text-primary"
                              onClick={() => setRenewRecord(record)}
                              title="Renovar/Concluir"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingRecord(record)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteRecord(record)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Modal */}
      <MaintenanceModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreate}
        suggestedKm={latestOdometer}
        isPending={createMaintenance.isPending}
      />

      {/* Edit Modal */}
      <MaintenanceModal
        open={!!editingRecord}
        onOpenChange={(open) => !open && setEditingRecord(null)}
        onSubmit={handleEdit}
        record={editingRecord}
        isPending={updateMaintenance.isPending}
      />

      {/* Delete Dialog */}
      <MaintenanceDeleteDialog
        open={!!deleteRecord}
        onOpenChange={(open) => !open && setDeleteRecord(null)}
        onConfirm={handleDelete}
        title={deleteRecord?.title}
      />

      {/* Renew Modal */}
      <MaintenanceRenewModal
        open={!!renewRecord}
        onOpenChange={(open) => !open && setRenewRecord(null)}
        onSubmit={handleRenew}
        record={renewRecord}
        suggestedKm={latestOdometer}
        isPending={createHistoryRecord.isPending}
      />

      {/* History Section */}
      <MaintenanceHistorySection
        historyRecords={historyRecords}
        maintenanceRecords={sortedRecords}
        isLoading={historyLoading}
      />
    </div>
  );
}
