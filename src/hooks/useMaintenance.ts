import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface MaintenanceRecord {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  current_km: number;
  next_km: number;
  date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceStatus {
  status: "ok" | "warning" | "overdue";
  kmRemaining: number;
}

// Warning threshold in km
export const WARNING_KM = 1000;

export function useMaintenance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all active maintenance records
  const { data: maintenanceRecords = [], isLoading } = useQuery({
    queryKey: ["maintenance_records", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("maintenance_records")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("next_km", { ascending: true });
      if (error) throw error;
      return data as MaintenanceRecord[];
    },
    enabled: !!user,
  });

  // Fetch latest odometer from fuel logs
  const { data: latestOdometer } = useQuery({
    queryKey: ["latest_odometer", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("fuel_logs")
        .select("odometer_km, date")
        .eq("user_id", user.id)
        .not("odometer_km", "is", null)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0]?.odometer_km ? Number(data[0].odometer_km) : null;
    },
    enabled: !!user,
  });

  // Calculate status for a maintenance record
  const getMaintenanceStatus = (record: MaintenanceRecord, currentOdometer: number | null): MaintenanceStatus => {
    const odometerToUse = currentOdometer ?? record.current_km;
    const kmRemaining = record.next_km - odometerToUse;

    if (kmRemaining <= 0) {
      return { status: "overdue", kmRemaining };
    } else if (kmRemaining <= WARNING_KM) {
      return { status: "warning", kmRemaining };
    }
    return { status: "ok", kmRemaining };
  };

  // Get records with status
  const getRecordsWithStatus = () => {
    return maintenanceRecords.map((record) => ({
      ...record,
      ...getMaintenanceStatus(record, latestOdometer ?? null),
    }));
  };

  // Get sorted records (overdue first, then warning, then ok)
  const getSortedRecords = () => {
    const recordsWithStatus = getRecordsWithStatus();
    return recordsWithStatus.sort((a, b) => {
      const statusOrder = { overdue: 0, warning: 1, ok: 2 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return a.kmRemaining - b.kmRemaining;
    });
  };

  // Get counts
  const getCounts = () => {
    const recordsWithStatus = getRecordsWithStatus();
    return {
      total: recordsWithStatus.length,
      ok: recordsWithStatus.filter((r) => r.status === "ok").length,
      warning: recordsWithStatus.filter((r) => r.status === "warning").length,
      overdue: recordsWithStatus.filter((r) => r.status === "overdue").length,
    };
  };

  // Check for maintenance alerts (for fuel log integration)
  const checkMaintenanceAlerts = (newOdometer: number) => {
    const alerts: { title: string; kmRemaining: number; status: "warning" | "overdue" }[] = [];
    
    maintenanceRecords.forEach((record) => {
      const kmRemaining = record.next_km - newOdometer;
      if (kmRemaining <= 0) {
        alerts.push({ title: record.title, kmRemaining, status: "overdue" });
      } else if (kmRemaining <= WARNING_KM) {
        alerts.push({ title: record.title, kmRemaining, status: "warning" });
      }
    });

    return alerts.sort((a, b) => a.kmRemaining - b.kmRemaining);
  };

  // Create maintenance record
  const createMaintenance = useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      current_km: number;
      next_km: number;
      date: string;
    }) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("maintenance_records").insert({
        user_id: user.id,
        title: data.title,
        description: data.description || null,
        current_km: data.current_km,
        next_km: data.next_km,
        date: data.date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance_records"] });
    },
  });

  // Update maintenance record
  const updateMaintenance = useMutation({
    mutationFn: async (data: {
      id: string;
      title: string;
      description?: string;
      current_km: number;
      next_km: number;
      date: string;
    }) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("maintenance_records")
        .update({
          title: data.title,
          description: data.description || null,
          current_km: data.current_km,
          next_km: data.next_km,
          date: data.date,
        })
        .eq("id", data.id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance_records"] });
    },
  });

  // Delete (soft delete) maintenance record
  const deleteMaintenance = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("maintenance_records")
        .update({ is_active: false })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance_records"] });
    },
  });

  return {
    maintenanceRecords,
    isLoading,
    latestOdometer,
    getRecordsWithStatus,
    getSortedRecords,
    getCounts,
    getMaintenanceStatus,
    checkMaintenanceAlerts,
    createMaintenance,
    updateMaintenance,
    deleteMaintenance,
  };
}
