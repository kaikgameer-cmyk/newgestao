import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Wrench, Loader2, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMaintenance, MaintenanceRecord } from "@/hooks/useMaintenance";
import { MaintenanceModal } from "@/components/maintenance/MaintenanceModal";
import { MaintenanceDeleteDialog } from "@/components/maintenance/MaintenanceDeleteDialog";
import { MaintenanceStatusBadge } from "@/components/maintenance/MaintenanceStatusBadge";
import { MaintenanceSummaryCard } from "@/components/maintenance/MaintenanceSummaryCard";
import { format } from "date-fns";

export default function Maintenance() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<MaintenanceRecord | null>(null);

  const { toast } = useToast();
  const {
    isLoading,
    latestOdometer,
    getSortedRecords,
    getCounts,
    createMaintenance,
    updateMaintenance,
    deleteMaintenance,
  } = useMaintenance();

  const sortedRecords = getSortedRecords();
  const counts = getCounts();

  const formatKm = (km: number) => new Intl.NumberFormat("pt-BR").format(km);
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
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

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manutenção</h1>
          <p className="text-muted-foreground">
            Controle as manutenções do seu veículo
          </p>
        </div>
        <Button variant="hero" size="lg" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-5 h-5" />
          Nova Manutenção
        </Button>
      </div>

      {/* Summary Card */}
      <MaintenanceSummaryCard
        total={counts.total}
        ok={counts.ok}
        warning={counts.warning}
        overdue={counts.overdue}
      />

      {/* Current Odometer Info */}
      {latestOdometer && (
        <div className="text-sm text-muted-foreground">
          Km atual do veículo (último abastecimento):{" "}
          <span className="font-medium text-foreground">{formatKm(latestOdometer)} km</span>
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
            <div className="overflow-x-auto">
              <table className="w-full">
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
                          <p className="text-sm font-medium">{record.title}</p>
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
    </div>
  );
}
