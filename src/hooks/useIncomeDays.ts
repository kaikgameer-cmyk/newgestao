import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { IncomeDay, IncomeDayItem } from "./useIncomeDay";

export function useIncomeDays(startDate: Date, endDate: Date) {
  const { user } = useAuth();

  const start = format(startDate, "yyyy-MM-dd");
  const end = format(endDate, "yyyy-MM-dd");

  const { data: incomeDays = [], isLoading } = useQuery({
    queryKey: ["income_days", user?.id, start, end],
    queryFn: async () => {
      if (!user) return [];

      // Fetch income_days
      const { data: days, error: daysError } = await supabase
        .from("income_days")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", start)
        .lte("date", end);

      if (daysError) throw daysError;
      if (!days || days.length === 0) return [];

      const dayIds = days.map((d) => d.id);

      // Fetch all items for these days
      const { data: items, error: itemsError } = await supabase
        .from("income_day_items")
        .select("*")
        .in("income_day_id", dayIds);

      if (itemsError) throw itemsError;

      return days.map((day) => ({
        id: day.id,
        date: day.date,
        km_rodados: day.km_rodados,
        hours_minutes: day.hours_minutes,
        notes: day.notes,
        items: (items || [])
          .filter((item) => item.income_day_id === day.id)
          .map((item) => ({
            id: item.id,
            platform: item.platform,
            platform_label: item.platform_label,
            amount: Number(item.amount),
            trips: item.trips,
            payment_method: item.payment_method,
            notes: item.notes,
          })),
      })) as IncomeDay[];
    },
    enabled: !!user,
  });

  // Calculate aggregated metrics
  const totalRevenue = incomeDays.reduce(
    (sum, day) => sum + day.items.reduce((s, item) => s + item.amount, 0),
    0
  );

  const totalTrips = incomeDays.reduce(
    (sum, day) => sum + day.items.reduce((s, item) => s + item.trips, 0),
    0
  );

  const totalKm = incomeDays.reduce((sum, day) => sum + (day.km_rodados || 0), 0);
  const totalMinutes = incomeDays.reduce((sum, day) => sum + (day.hours_minutes || 0), 0);

  // Platform breakdown
  const platformBreakdown = incomeDays.reduce((acc, day) => {
    day.items.forEach((item) => {
      const key = item.platform === "outro" && item.platform_label
        ? item.platform_label
        : item.platform;
      if (!acc[key]) {
        acc[key] = { amount: 0, trips: 0 };
      }
      acc[key].amount += item.amount;
      acc[key].trips += item.trips;
    });
    return acc;
  }, {} as Record<string, { amount: number; trips: number }>);

  return {
    incomeDays,
    isLoading,
    totalRevenue,
    totalTrips,
    totalKm,
    totalMinutes,
    platformBreakdown,
    daysCount: incomeDays.length,
  };
}
