import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface CombinedExpense {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  category: string;
  payment_method: string | null;
  credit_card_id: string | null;
  notes: string | null;
  source: "expense" | "fuel";
  // Additional fields for display
  fuel_type?: string;
  liters?: number;
  station?: string;
  installments?: number;
  current_installment?: number;
  total_installments?: number;
  credit_cards?: { name: string } | null;
}

export function useCombinedExpenses(
  userId: string | undefined,
  startDate?: Date,
  endDate?: Date,
  options?: { limit?: number }
) {
  const startStr = startDate ? format(startDate, "yyyy-MM-dd") : undefined;
  const endStr = endDate ? format(endDate, "yyyy-MM-dd") : undefined;

  // Fetch expenses
  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ["expenses", userId, startStr, endStr],
    queryFn: async () => {
      if (!userId) return [];
      let query = supabase
        .from("expenses")
        .select("*, credit_cards(name)")
        .eq("user_id", userId)
        .order("date", { ascending: false });

      if (startStr) query = query.gte("date", startStr);
      if (endStr) query = query.lte("date", endStr);
      if (options?.limit) query = query.limit(options.limit);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Fetch fuel logs
  const { data: fuelLogs = [], isLoading: loadingFuel } = useQuery({
    queryKey: ["fuel_logs", userId, startStr, endStr],
    queryFn: async () => {
      if (!userId) return [];
      let query = supabase
        .from("fuel_logs")
        .select("*, credit_cards(name)")
        .eq("user_id", userId)
        .order("date", { ascending: false });

      if (startStr) query = query.gte("date", startStr);
      if (endStr) query = query.lte("date", endStr);
      if (options?.limit) query = query.limit(options.limit);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Combine and normalize both sources
  // IMPORTANT: Filter out expenses that have fuel_log_id to avoid duplicates
  // Fuel logs are already fetched separately and have more details
  const combinedExpenses: CombinedExpense[] = [
    ...expenses
      .filter((e) => !e.fuel_log_id) // Exclude fuel-related expenses (they come from fuel_logs)
      .map((e) => ({
        id: e.id,
        user_id: e.user_id,
        date: e.date,
        amount: Number(e.amount),
        category: e.category,
        payment_method: e.payment_method,
        credit_card_id: e.credit_card_id,
        notes: e.notes,
        source: "expense" as const,
        installments: e.installments,
        current_installment: e.current_installment,
        total_installments: e.total_installments,
        credit_cards: e.credit_cards,
      })),
    ...fuelLogs.map((f) => ({
      id: f.id,
      user_id: f.user_id,
      date: f.date,
      amount: Number(f.total_value),
      category: "combustivel",
      payment_method: f.payment_method,
      credit_card_id: f.credit_card_id,
      notes: f.station ? `${f.station} - ${f.liters}L ${f.fuel_type}` : `${f.liters}L ${f.fuel_type}`,
      source: "fuel" as const,
      fuel_type: f.fuel_type,
      liters: Number(f.liters),
      station: f.station,
      credit_cards: f.credit_cards,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalExpenses = combinedExpenses.reduce((sum, e) => sum + e.amount, 0);

  return {
    combinedExpenses,
    expenses,
    fuelLogs,
    totalExpenses,
    isLoading: loadingExpenses || loadingFuel,
  };
}
