import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useIsAdmin() {
  const { user } = useAuth();

  const { data: isAdmin, isLoading, isFetched, refetch } = useQuery({
    queryKey: ["isAdmin", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .rpc("has_role", { _user_id: user.id, _role: "admin" });

      if (error) {
        console.error("Error checking admin role:", error);
        return false;
      }

      return data ?? false;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes - reduced for faster updates
    gcTime: 1000 * 60 * 5,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  return { 
    isAdmin: isAdmin ?? false, 
    isLoading, 
    isFetched,
    refetch
  };
}
