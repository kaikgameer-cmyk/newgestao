import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlatforms } from "@/hooks/usePlatforms";

export interface OnboardingProfile {
  first_name: string | null;
  last_name: string | null;
  whatsapp: string | null;
  email: string | null;
  city: string | null;
  onboarding_completed: boolean;
}

export function useOnboarding() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { enabledPlatforms, userPlatforms } = usePlatforms();

  // Fetch profile for onboarding check
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["onboarding-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, whatsapp, email, city, onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as OnboardingProfile | null;
    },
    enabled: !!user,
  });

  // Check if onboarding is required
  const needsOnboarding = (): boolean => {
    if (!profile) return true; // No profile = needs onboarding
    
    // Check if onboarding was completed
    if (!profile.onboarding_completed) return true;
    
    // Check if required fields are filled
    if (!profile.first_name || profile.first_name.trim() === "") return true;
    if (!profile.last_name || profile.last_name.trim() === "") return true;
    if (!profile.whatsapp || profile.whatsapp.trim() === "") return true;
    if (!profile.city || profile.city.trim() === "") return true;
    
    // Check if at least one platform is enabled
    const hasEnabledPlatform = enabledPlatforms.length > 0;
    if (!hasEnabledPlatform && userPlatforms.length > 0) {
      // User has platform preferences but none enabled
      return true;
    }
    
    return false;
  };

  // Complete onboarding mutation
  const completeOnboarding = useMutation({
    mutationFn: async (data: {
      first_name: string;
      last_name: string;
      whatsapp: string;
      city: string;
      enabledPlatformKeys: string[];
      vehicleType: "electric" | "fuel";
    }) => {
      if (!user) throw new Error("Não autenticado");

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          whatsapp: data.whatsapp,
          city: data.city,
          onboarding_completed: true,
          vehicle_type: data.vehicleType,
          // Also update legacy 'name' field for backwards compatibility
          name: `${data.first_name} ${data.last_name}`.trim(),
        })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Update platform preferences - enable selected, disable others
      const { data: allPlatforms } = await supabase
        .from("platforms")
        .select("key")
        .or(`user_id.is.null,user_id.eq.${user.id}`);

      if (allPlatforms) {
        for (const platform of allPlatforms) {
          const enabled = data.enabledPlatformKeys.includes(platform.key);
          await supabase
            .from("user_platforms")
            .upsert(
              {
                user_id: user.id,
                platform_key: platform.key,
                enabled,
              },
              { onConflict: "user_id,platform_key" }
            );
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-profile"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-type"] });
      queryClient.invalidateQueries({ queryKey: ["user_platforms"] });
      queryClient.invalidateQueries({ queryKey: ["platforms"] });
    },
  });

  return {
    profile,
    loadingProfile,
    needsOnboarding: needsOnboarding(),
    completeOnboarding,
    userEmail: user?.email || profile?.email || "",
  };
}
