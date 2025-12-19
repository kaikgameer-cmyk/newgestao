import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { MaintenanceRecord } from "@/hooks/useMaintenance";
import { format } from "date-fns";

const maintenanceSchema = z.object({
  title: z.string().min(1, "Nome da manutenção é obrigatório"),
  description: z.string().optional(),
  current_km: z.number().min(0, "Km deve ser positivo"),
  next_km: z.number().min(1, "Km da próxima deve ser positivo"),
  date: z.string().min(1, "Data é obrigatória"),
}).refine((data) => data.next_km > data.current_km, {
  message: "Km da próxima manutenção deve ser maior que km atual",
  path: ["next_km"],
});

type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

interface MaintenanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: MaintenanceFormData) => Promise<void>;
  record?: MaintenanceRecord | null;
  suggestedKm?: number | null;
  isPending?: boolean;
}

export function MaintenanceModal({
  open,
  onOpenChange,
  onSubmit,
  record,
  suggestedKm,
  isPending,
}: MaintenanceModalProps) {
  const isEditing = !!record;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      title: "",
      description: "",
      current_km: suggestedKm || 0,
      next_km: 0,
      date: format(new Date(), "yyyy-MM-dd"),
    },
  });

  useEffect(() => {
    if (open) {
      if (record) {
        reset({
          title: record.title,
          description: record.description || "",
          current_km: record.current_km,
          next_km: record.next_km,
          date: record.date,
        });
      } else {
        reset({
          title: "",
          description: "",
          current_km: suggestedKm || 0,
          next_km: 0,
          date: format(new Date(), "yyyy-MM-dd"),
        });
      }
    }
  }, [open, record, suggestedKm, reset]);

  const handleFormSubmit = async (data: MaintenanceFormData) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Manutenção" : "Nova Manutenção"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Nome da Manutenção *</Label>
            <Input
              id="title"
              placeholder="Ex: Troca de óleo, Alinhamento e balanceamento"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Detalhes adicionais sobre a manutenção..."
              rows={3}
              {...register("description")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data da manutenção *</Label>
            <Input
              id="date"
              type="date"
              {...register("date")}
            />
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current_km">Km atual no dia *</Label>
              <Input
                id="current_km"
                type="number"
                min={0}
                placeholder="Ex: 45000"
                {...register("current_km", { valueAsNumber: true })}
              />
              {errors.current_km && (
                <p className="text-sm text-destructive">{errors.current_km.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="next_km">Próxima manutenção em (km) *</Label>
              <Input
                id="next_km"
                type="number"
                min={1}
                placeholder="Ex: 50000"
                {...register("next_km", { valueAsNumber: true })}
              />
              {errors.next_km && (
                <p className="text-sm text-destructive">{errors.next_km.message}</p>
              )}
            </div>
          </div>

          <Button type="submit" variant="hero" className="w-full" disabled={isPending}>
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isEditing ? (
              "Salvar Alterações"
            ) : (
              "Cadastrar Manutenção"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
