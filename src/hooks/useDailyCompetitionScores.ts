import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DailyScore {
  date: string;
  amount: number;
  trips: number;
}

interface DailyCompetitionScoresResult {
  scores: DailyScore[];
  totalAmount: number;
  totalTrips: number;
  daysWorked: number;
  averagePerDay: number;
}

export function useDailyCompetitionScores(
  userId: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["daily-competition-scores", userId, startDate, endDate],
    queryFn: async (): Promise<DailyCompetitionScoresResult> => {
      if (!userId || !startDate || !endDate) {
        return { scores: [], totalAmount: 0, totalTrips: 0, daysWorked: 0, averagePerDay: 0 };
      }

      // Get income_days in the competition period
      const { data: incomeDays, error: incomeDaysError } = await supabase
        .from("income_days")
        .select("id, date")
        .eq("user_id", userId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true });

      if (incomeDaysError) throw incomeDaysError;
      if (!incomeDays || incomeDays.length === 0) {
        return { scores: [], totalAmount: 0, totalTrips: 0, daysWorked: 0, averagePerDay: 0 };
      }

      // Get income_day_items for these days
      const { data: items, error: itemsError } = await supabase
        .from("income_day_items")
        .select("income_day_id, amount, trips")
        .in("income_day_id", incomeDays.map(d => d.id));

      if (itemsError) throw itemsError;

      // Aggregate by date
      const dateMap = new Map<string, { amount: number; trips: number }>();
      
      for (const day of incomeDays) {
        dateMap.set(day.date, { amount: 0, trips: 0 });
      }

      for (const item of items || []) {
        const day = incomeDays.find(d => d.id === item.income_day_id);
        if (day) {
          const current = dateMap.get(day.date) || { amount: 0, trips: 0 };
          dateMap.set(day.date, {
            amount: current.amount + Number(item.amount),
            trips: current.trips + Number(item.trips),
          });
        }
      }

      // Convert to array and calculate totals
      const scores: DailyScore[] = [];
      let totalAmount = 0;
      let totalTrips = 0;
      let daysWorked = 0;

      for (const [date, data] of dateMap.entries()) {
        scores.push({
          date,
          amount: data.amount,
          trips: data.trips,
        });
        totalAmount += data.amount;
        totalTrips += data.trips;
        if (data.amount > 0) daysWorked++;
      }

      return {
        scores,
        totalAmount,
        totalTrips,
        daysWorked,
        averagePerDay: daysWorked > 0 ? totalAmount / daysWorked : 0,
      };
    },
    enabled: enabled && !!userId && !!startDate && !!endDate,
  });
}
