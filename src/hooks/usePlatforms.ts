import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface Platform {
  id: string;
  key: string;
  name: string;
  is_other: boolean;
  is_active: boolean;
}

export interface UserPlatform {
  id: string;
  user_id: string;
  platform_key: string;
  enabled: boolean;
}

export function usePlatforms() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all active platforms from catalog
  const { data: platforms = [], isLoading: loadingPlatforms } = useQuery({
    queryKey: ["platforms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platforms")
        .select("*")
        .eq("is_active", true)
        .order("key");

      if (error) throw error;
      return data as Platform[];
    },
  });

  // Fetch user's platform preferences
  const { data: userPlatforms = [], isLoading: loadingUserPlatforms } = useQuery({
    queryKey: ["user_platforms", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_platforms")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data as UserPlatform[];
    },
    enabled: !!user,
  });

  // Get enabled platforms for the user (with fallback to all if not configured)
  const enabledPlatforms = platforms.filter((p) => {
    const userPref = userPlatforms.find((up) => up.platform_key === p.key);
    // If user has preferences, respect them; otherwise, default to enabled
    return userPref ? userPref.enabled : true;
  });

  // Initialize user platforms (call when user first accesses settings)
  const initializeUserPlatforms = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");

      // Only initialize if no preferences exist
      if (userPlatforms.length > 0) return;

      const defaultPlatforms = platforms.map((p) => ({
        user_id: user.id,
        platform_key: p.key,
        enabled: true,
      }));

      const { error } = await supabase
        .from("user_platforms")
        .upsert(defaultPlatforms, { onConflict: "user_id,platform_key" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_platforms"] });
    },
  });

  // Toggle platform enabled/disabled
  const togglePlatform = useMutation({
    mutationFn: async ({ platformKey, enabled }: { platformKey: string; enabled: boolean }) => {
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("user_platforms")
        .upsert(
          {
            user_id: user.id,
            platform_key: platformKey,
            enabled,
          },
          { onConflict: "user_id,platform_key" }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_platforms"] });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar plataforma",
        variant: "destructive",
      });
    },
  });

  // Check if a platform is enabled for the user
  const isPlatformEnabled = (platformKey: string): boolean => {
    const userPref = userPlatforms.find((up) => up.platform_key === platformKey);
    return userPref ? userPref.enabled : true; // Default to enabled
  };

  return {
    platforms,
    userPlatforms,
    enabledPlatforms,
    loadingPlatforms,
    loadingUserPlatforms,
    initializeUserPlatforms,
    togglePlatform,
    isPlatformEnabled,
  };
}
