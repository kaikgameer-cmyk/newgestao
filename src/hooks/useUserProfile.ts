import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type VehicleType = "electric" | "fuel";

export function useUserProfile() {
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url, name, email, vehicle_type")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const displayName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile?.name || user?.email || "Usuário";

  const getAvatarUrl = () => {
    if (!profile?.avatar_url) return null;
    if (profile.avatar_url.startsWith("http")) return profile.avatar_url;
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`;
  };

  const vehicleType = (profile?.vehicle_type as VehicleType) || "fuel";

  return {
    profile,
    isLoading,
    displayName,
    avatarUrl: getAvatarUrl(),
    vehicleType,
    isElectric: vehicleType === "electric",
    isFuel: vehicleType !== "electric",
  };
}
