import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatLocalDate } from "@/lib/dateUtils";
import { toast } from "sonner";

export interface DailyWorkSummary {
  id: string;
  user_id: string;
  date: string;
  km_rodados: number | null;
  worked_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export function useDailyWorkSummary() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all work summaries
  const { data: summaries = [], isLoading } = useQuery({
    queryKey: ["daily_work_summary", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("daily_work_summary")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });
      if (error) throw error;
      return data as DailyWorkSummary[];
    },
    enabled: !!user,
  });

  // Get summary for a specific date
  const getSummaryForDate = (date: Date): DailyWorkSummary | null => {
    const dateStr = formatLocalDate(date);
    return summaries.find((s) => s.date === dateStr) || null;
  };

  // Upsert KM rodados
  const upsertKmRodados = useMutation({
    mutationFn: async ({ date, kmRodados }: { date: Date; kmRodados: number }) => {
      if (!user) throw new Error("Não autenticado");
      const dateStr = formatLocalDate(date);

      const existing = summaries.find((s) => s.date === dateStr);

      if (existing) {
        const { error } = await supabase
          .from("daily_work_summary")
          .update({ km_rodados: kmRodados })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("daily_work_summary")
          .insert({
            user_id: user.id,
            date: dateStr,
            km_rodados: kmRodados,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily_work_summary"] });
      toast.success("KM rodados salvos!");
    },
    onError: () => {
      toast.error("Erro ao salvar KM rodados");
    },
  });

  // Upsert worked minutes
  const upsertWorkedMinutes = useMutation({
    mutationFn: async ({ date, workedMinutes }: { date: Date; workedMinutes: number }) => {
      if (!user) throw new Error("Não autenticado");
      const dateStr = formatLocalDate(date);

      const existing = summaries.find((s) => s.date === dateStr);

      if (existing) {
        const { error } = await supabase
          .from("daily_work_summary")
          .update({ worked_minutes: workedMinutes })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("daily_work_summary")
          .insert({
            user_id: user.id,
            date: dateStr,
            worked_minutes: workedMinutes,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily_work_summary"] });
      toast.success("Horas trabalhadas salvas!");
    },
    onError: () => {
      toast.error("Erro ao salvar horas trabalhadas");
    },
  });

  // Upsert both KM and hours
  const upsertSummary = useMutation({
    mutationFn: async ({ date, kmRodados, workedMinutes }: { date: Date; kmRodados?: number | null; workedMinutes?: number | null }) => {
      if (!user) throw new Error("Não autenticado");
      const dateStr = formatLocalDate(date);

      const existing = summaries.find((s) => s.date === dateStr);
      const updates: Partial<DailyWorkSummary> = {};
      
      if (kmRodados !== undefined) updates.km_rodados = kmRodados;
      if (workedMinutes !== undefined) updates.worked_minutes = workedMinutes;

      if (existing) {
        const { error } = await supabase
          .from("daily_work_summary")
          .update(updates)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("daily_work_summary")
          .insert({
            user_id: user.id,
            date: dateStr,
            km_rodados: kmRodados ?? null,
            worked_minutes: workedMinutes ?? null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily_work_summary"] });
      toast.success("Dados do dia salvos!");
    },
    onError: () => {
      toast.error("Erro ao salvar dados do dia");
    },
  });

  // Add minutes to existing (for timer)
  const addWorkedMinutes = useMutation({
    mutationFn: async ({ date, minutesToAdd }: { date: Date; minutesToAdd: number }) => {
      if (!user) throw new Error("Não autenticado");
      const dateStr = formatLocalDate(date);

      const existing = summaries.find((s) => s.date === dateStr);
      const currentMinutes = existing?.worked_minutes || 0;
      const newTotal = currentMinutes + minutesToAdd;

      if (existing) {
        const { error } = await supabase
          .from("daily_work_summary")
          .update({ worked_minutes: newTotal })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("daily_work_summary")
          .insert({
            user_id: user.id,
            date: dateStr,
            worked_minutes: newTotal,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily_work_summary"] });
    },
    onError: () => {
      toast.error("Erro ao adicionar horas trabalhadas");
    },
  });

  // Delete summary
  const deleteSummary = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("daily_work_summary")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily_work_summary"] });
      toast.success("Dados do dia removidos!");
    },
    onError: () => {
      toast.error("Erro ao remover dados do dia");
    },
  });

  // Format minutes to HH:MM
  const formatMinutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  // Parse HH:MM to minutes
  const parseTimeToMinutes = (time: string): number => {
    const [hours, mins] = time.split(":").map(Number);
    return (hours || 0) * 60 + (mins || 0);
  };

  return {
    summaries,
    isLoading,
    getSummaryForDate,
    upsertKmRodados,
    upsertWorkedMinutes,
    upsertSummary,
    addWorkedMinutes,
    deleteSummary,
    formatMinutesToTime,
    parseTimeToMinutes,
  };
}
