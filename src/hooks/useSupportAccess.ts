import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Hook to check if user has support access (admin or support role)
 * This allows both admins and support staff to manage tickets
 */
export function useSupportAccess() {
  const { user } = useAuth();

  const { data: hasSupportAccess, isLoading, isFetched, refetch } = useQuery({
    queryKey: ["supportAccess", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .rpc("has_support_access", { _user_id: user.id });

      if (error) {
        console.error("Error checking support access:", error);
        return false;
      }

      return data ?? false;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  return { 
    hasSupportAccess: hasSupportAccess ?? false, 
    isLoading, 
    isFetched,
    refetch
  };
}

/**
 * Hook to get the actual support role (admin, support, or user)
 */
export function useSupportRole() {
  const { user } = useAuth();

  const { data: role, isLoading } = useQuery({
    queryKey: ["supportRole", user?.id],
    queryFn: async (): Promise<"admin" | "support" | "user"> => {
      if (!user?.id) return "user";

      // Check if user is admin first
      const { data: isAdmin } = await supabase
        .rpc("has_role", { _user_id: user.id, _role: "admin" });

      if (isAdmin) return "admin";

      // Check if user is support
      const { data: isSupport } = await supabase
        .rpc("has_role", { _user_id: user.id, _role: "support" });

      if (isSupport) return "support";

      return "user";
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  return { 
    role: role ?? "user", 
    isLoading 
  };
}
