import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type VehicleType = "electric" | "fuel";

export function useVehicleType() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: vehicleType, isLoading } = useQuery({
    queryKey: ["vehicle-type", user?.id],
    queryFn: async () => {
      if (!user) return "fuel" as VehicleType;
      const { data, error } = await supabase
        .from("profiles")
        .select("vehicle_type")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.vehicle_type as VehicleType) || "fuel";
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateVehicleType = useMutation({
    mutationFn: async (newType: VehicleType) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("profiles")
        .update({ vehicle_type: newType })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-type"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding-profile"] });
    },
  });

  return {
    vehicleType: vehicleType || "fuel",
    isElectric: vehicleType === "electric",
    isFuel: vehicleType !== "electric", // default to fuel
    isLoading,
    updateVehicleType,
  };
}
