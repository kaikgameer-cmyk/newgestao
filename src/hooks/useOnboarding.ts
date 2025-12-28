import { useEffect } from "react";
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
  vehicle_type: "electric" | "fuel" | null;
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
        .select(
          "first_name, last_name, whatsapp, email, city, vehicle_type, onboarding_completed"
        )
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as OnboardingProfile | null;
    },
    enabled: !!user,
  });

  // Helper to detect complete profiles (single source of truth)
  const isProfileComplete = (p: OnboardingProfile | null | undefined) => {
    if (!p) return false;
    if (!p.first_name || p.first_name.trim() === "") return false;
    if (!p.last_name || p.last_name.trim() === "") return false;
    if (!p.whatsapp || p.whatsapp.trim() === "") return false;
    if (!p.city || p.city.trim() === "") return false;
    if (!p.vehicle_type) return false;
    return true;
  };

  // Helper to detect complete legacy profiles (used only for one-time migration)
  const isLegacyProfileComplete = (p: OnboardingProfile | null | undefined) => {
    if (!isProfileComplete(p)) return false;

    if (!p) return false;

    const hasEnabledPlatform = enabledPlatforms.length > 0;
    if (!hasEnabledPlatform && userPlatforms.length > 0) {
      // User has platform preferences but none enabled
      return false;
    }

    return true;
  };

  // One-time migration for old accounts: silently mark complete profiles as onboarded
  useEffect(() => {
    if (!user || !profile) return;
    if (profile.onboarding_completed) return;
    if (!isLegacyProfileComplete(profile)) return;

    const markCompleted = async () => {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("user_id", user.id);

      queryClient.invalidateQueries({ queryKey: ["onboarding-profile", user.id] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    };

    void markCompleted();
  }, [user, profile, enabledPlatforms, userPlatforms, queryClient]);

  // Final rule: only show onboarding when the profile is missing or incomplete
  const needsOnboarding = (): boolean => {
    if (!user) return false;
    if (!profile) return true;
    if (!isProfileComplete(profile)) return true;
    return !profile.onboarding_completed;
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

      // Upsert profile using user_id as the conflict target
      const { data: upsertedProfile, error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: user.id,
            first_name: data.first_name,
            last_name: data.last_name,
            whatsapp: data.whatsapp,
            city: data.city,
            onboarding_completed: true,
            vehicle_type: data.vehicleType,
            // Also update legacy 'name' field for backwards compatibility
            name: `${data.first_name} ${data.last_name}`.trim(),
            email: user.email ?? undefined,
          },
          { onConflict: "user_id" }
        )
        .select(
          "first_name, last_name, whatsapp, city, vehicle_type, onboarding_completed, email"
        )
        .maybeSingle();

      console.log("[onboarding] upsert profile response", {
        data: upsertedProfile,
        error: profileError,
      });

      if (profileError) {
        console.error("[onboarding] error upserting profile", profileError);
        throw profileError;
      }

      if (!upsertedProfile) {
        console.error("[onboarding] profile not returned after upsert");
        throw new Error("Perfil não foi retornado após salvar");
      }

      // Update platform preferences - enable selected, disable others
      const { data: allPlatforms, error: platformsError } = await supabase
        .from("platforms")
        .select("key")
        .or(`user_id.is.null,user_id.eq.${user.id}`);

      if (platformsError) {
        console.error("[onboarding] error loading platforms", platformsError);
        throw platformsError;
      }

      if (allPlatforms) {
        for (const platform of allPlatforms) {
          const enabled = data.enabledPlatformKeys.includes(platform.key);
          const { error: userPlatformError } = await supabase
            .from("user_platforms")
            .upsert(
              {
                user_id: user.id,
                platform_key: platform.key,
                enabled,
              },
              { onConflict: "user_id,platform_key" }
            );

          if (userPlatformError) {
            console.error("[onboarding] error upserting user_platform", userPlatformError);
            throw userPlatformError;
          }
        }
      }

      return upsertedProfile;
    },
    onSuccess: (upsertedProfile) => {
      if (user && upsertedProfile) {
        // Immediately update onboarding profile cache to avoid loops
        queryClient.setQueryData(
          ["onboarding-profile", user.id],
          upsertedProfile
        );
      }

      queryClient.invalidateQueries({ queryKey: ["onboarding-profile", user?.id] });
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

