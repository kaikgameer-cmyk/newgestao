import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

export interface PlatformRevenue {
  platform_key: string;
  platform_name: string;
  platform_label: string | null;
  total_amount: number;
  total_trips: number;
}

export function useRevenueByPlatform(startDate: Date, endDate: Date) {
  const { user } = useAuth();

  const { data: platformRevenues = [], isLoading } = useQuery({
    queryKey: ["revenue_by_platform", user?.id, format(startDate, "yyyy-MM-dd"), format(endDate, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase.rpc("get_revenue_by_platform", {
        p_start_date: format(startDate, "yyyy-MM-dd"),
        p_end_date: format(endDate, "yyyy-MM-dd"),
      });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        platform_key: item.platform_key,
        platform_name: item.platform_name,
        platform_label: item.platform_label,
        total_amount: Number(item.total_amount),
        total_trips: Number(item.total_trips),
      })) as PlatformRevenue[];
    },
    enabled: !!user,
  });

  const totalRevenue = platformRevenues.reduce((sum, p) => sum + p.total_amount, 0);

  return {
    platformRevenues,
    totalRevenue,
    isLoading,
  };
}
