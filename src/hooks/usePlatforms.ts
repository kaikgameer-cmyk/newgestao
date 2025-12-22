import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface Platform {
  id: string;
  key: string; // slug interno
  name: string; // nome amigável para exibição
  is_other: boolean;
  is_active: boolean;
  is_default: boolean;
  user_id: string | null;
  color: string; // cor em hex (#RRGGBB)
  icon?: string | null; // nome do ícone Lucide
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

  // Fetch all platforms (system + user's custom)
  const { data: platforms = [], isLoading: loadingPlatforms } = useQuery({
    queryKey: ["platforms", user?.id],
    queryFn: async () => {
      // Fetch system platforms (user_id is null, is_active = true) AND user's custom platforms
      const { data, error } = await supabase
        .from("platforms")
        .select("*")
        .or(`and(user_id.is.null,is_active.eq.true),user_id.eq.${user?.id}`)
        .order("name");

      if (error) throw error;
      return (data || []) as Platform[];
    },
    enabled: !!user,
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

  const createPlatform = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!user) throw new Error("Não autenticado");

      const trimmedName = name.trim();
      if (!trimmedName) throw new Error("Nome é obrigatório");

      // Generate a slug from the name (lowercase, no accents, hyphens)
      const baseSlug = trimmedName
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");

      if (!baseSlug) throw new Error("Nome inválido para gerar identificador interno");

      // Ensure slug uniqueness by suffixing -2, -3, ... if needed
      let slug = baseSlug;
      let counter = 2;
      const existingSlugs = new Set(platforms.map((p) => p.key));
      while (existingSlugs.has(slug)) {
        slug = `${baseSlug}-${counter++}`;
      }

      // Check if platform with same display name already exists
      const existingPlatform = platforms.find(
        (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (existingPlatform) {
        throw new Error("Já existe uma plataforma com esse nome");
      }
 
       const safeColor = /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#2563eb";
 
        // Insert platform
       const { data: newPlatform, error: platformError } = await supabase
         .from("platforms")
         .insert({
           user_id: user.id,
           key: slug,
           name: trimmedName,
           is_active: true,
           is_default: false,
           is_other: false,
           color: safeColor,
         })
         .select()
         .single();

       if (platformError) {
         // Tratar erro de unicidade vindo do backend
         if ((platformError as any)?.code === "23505") {
           throw new Error("Já existe uma plataforma com esse nome");
         }
         throw platformError;
       }
 
       // Auto-enable the new platform for the user
       const { error: prefError } = await supabase
         .from("user_platforms")
         .upsert(
           {
             user_id: user.id,
             platform_key: newPlatform.key,
             enabled: true,
           },
           { onConflict: "user_id,platform_key" }
         );
 
       if (prefError) throw prefError;
 
       return newPlatform;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["platforms"] });
       queryClient.invalidateQueries({ queryKey: ["user_platforms"] });
       toast({
         title: "Plataforma criada",
         description: "A plataforma foi cadastrada com sucesso.",
       });
     },
     onError: (error: Error) => {
       toast({
         title: "Erro ao criar plataforma",
         description: error.message,
         variant: "destructive",
       });
     },
   });

  // Update custom platform (only user's own)
  const updatePlatform = useMutation({
    mutationFn: async ({
      platformId,
      name,
      color,
    }: {
      platformId: string;
      name: string;
      color: string;
    }) => {
      if (!user) throw new Error("Não autenticado");

      const trimmedName = name.trim();
      if (!trimmedName) throw new Error("Nome é obrigatório");
 
      const safeColor = /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#2563eb";

      const { error } = await supabase
        .from("platforms")
        .update({ name: trimmedName, color: safeColor })
        .eq("id", platformId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platforms"] });
      toast({
        title: "Plataforma atualizada",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: (error: any) => {
      const message =
        error?.code === "23505" || /unique|duplicado|duplicate/i.test(error?.message || "")
          ? "Já existe uma plataforma com esse nome"
          : error?.message || "Não foi possível atualizar a plataforma";
 
      toast({
        title: "Erro ao atualizar plataforma",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Delete custom platform (only user's own)
  const deletePlatform = useMutation({
    mutationFn: async ({ platformId, platformKey }: { platformId: string; platformKey: string }) => {
      if (!user) throw new Error("Não autenticado");

      // Delete user_platforms entry first
      await supabase
        .from("user_platforms")
        .delete()
        .eq("user_id", user.id)
        .eq("platform_key", platformKey);

      // Delete the platform
      const { error } = await supabase
        .from("platforms")
        .delete()
        .eq("id", platformId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platforms"] });
      queryClient.invalidateQueries({ queryKey: ["user_platforms"] });
      toast({
        title: "Plataforma removida",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao remover plataforma",
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
    createPlatform,
    updatePlatform,
    deletePlatform,
    isPlatformEnabled,
  };
}