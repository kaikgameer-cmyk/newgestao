import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface MaintenanceHistoryRecord {
  id: string;
  maintenance_id: string;
  user_id: string;
  performed_at: string;
  performed_km: number;
  next_due_km: number;
  notes: string | null;
  created_at: string;
}

export function useMaintenanceHistory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all maintenance history
  const { data: historyRecords = [], isLoading } = useQuery({
    queryKey: ["maintenance_history", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("maintenance_history")
        .select("*")
        .eq("user_id", user.id)
        .order("performed_at", { ascending: false });
      if (error) throw error;
      return data as MaintenanceHistoryRecord[];
    },
    enabled: !!user,
  });

  // Get total count of completed maintenance
  const completedCount = historyRecords.length;

  // Create a new history record (when renewing maintenance)
  const createHistoryRecord = useMutation({
    mutationFn: async (data: {
      maintenance_id: string;
      performed_at: string;
      performed_km: number;
      next_due_km: number;
      notes?: string;
    }) => {
      if (!user) throw new Error("Não autenticado");

      // Insert history record
      const { error: historyError } = await supabase
        .from("maintenance_history")
        .insert({
          maintenance_id: data.maintenance_id,
          user_id: user.id,
          performed_at: data.performed_at,
          performed_km: data.performed_km,
          next_due_km: data.next_due_km,
          notes: data.notes || null,
        });

      if (historyError) throw historyError;

      // Update the maintenance record with new km values
      const { error: updateError } = await supabase
        .from("maintenance_records")
        .update({
          current_km: data.performed_km,
          next_km: data.next_due_km,
          date: data.performed_at,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.maintenance_id)
        .eq("user_id", user.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance_history"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance_records"] });
    },
  });

  return {
    historyRecords,
    isLoading,
    completedCount,
    createHistoryRecord,
  };
}
