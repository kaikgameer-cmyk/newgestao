import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatLocalDate } from "@/lib/dateUtils";
import { toast } from "sonner";

export interface DailyKmLog {
  id: string;
  user_id: string;
  date: string;
  start_km: number;
  end_km: number | null;
  km_driven: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useDailyKm() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: kmLogs = [], isLoading } = useQuery({
    queryKey: ["daily_km_logs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("daily_km_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });
      if (error) throw error;
      return data as DailyKmLog[];
    },
    enabled: !!user,
  });

  const getKmForDate = (date: Date): DailyKmLog | null => {
    const dateStr = formatLocalDate(date);
    return kmLogs.find((log) => log.date === dateStr) || null;
  };

  const upsertKm = useMutation({
    mutationFn: async ({
      date,
      startKm,
      endKm,
      notes,
    }: {
      date: Date;
      startKm: number;
      endKm?: number | null;
      notes?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const dateStr = formatLocalDate(date);

      const payload = {
        user_id: user.id,
        date: dateStr,
        start_km: Math.round(startKm),
        end_km: endKm !== undefined && endKm !== null ? Math.round(endKm) : null,
        notes: notes || null,
      };

      const { data, error } = await supabase
        .from("daily_km_logs")
        .upsert(payload, { onConflict: "user_id,date" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["daily_km_logs"] });
      if (data.end_km !== null) {
        toast.success("KM registrado com sucesso!");
      } else {
        toast.success("KM inicial salvo! Informe o KM final ao terminar.");
      }
    },
    onError: (error) => {
      toast.error("Erro ao salvar KM: " + error.message);
    },
  });

  const deleteKm = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("daily_km_logs")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily_km_logs"] });
      toast.success("Registro de KM removido!");
    },
    onError: (error) => {
      toast.error("Erro ao remover KM: " + error.message);
    },
  });

  return {
    kmLogs,
    isLoading,
    getKmForDate,
    upsertKm,
    deleteKm,
  };
}
