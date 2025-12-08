import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface RecurringExpense {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useRecurringExpenses(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: recurringExpenses = [], isLoading } = useQuery({
    queryKey: ["recurring_expenses", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("recurring_expenses")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RecurringExpense[];
    },
    enabled: !!userId,
  });

  const createMutation = useMutation({
    mutationFn: async (expense: {
      name: string;
      amount: number;
      start_date: string;
      end_date?: string | null;
    }) => {
      if (!userId) throw new Error("User not authenticated");
      const { error } = await supabase.from("recurring_expenses").insert({
        user_id: userId,
        name: expense.name,
        amount: expense.amount,
        start_date: expense.start_date,
        end_date: expense.end_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_expenses"] });
      toast({ title: "Despesa fixa adicionada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao adicionar despesa fixa", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (expense: {
      id: string;
      name?: string;
      amount?: number;
      start_date?: string;
      end_date?: string | null;
      is_active?: boolean;
    }) => {
      const { id, ...updates } = expense;
      const { error } = await supabase
        .from("recurring_expenses")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_expenses"] });
      toast({ title: "Despesa fixa atualizada!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar despesa fixa", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("recurring_expenses")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_expenses"] });
      toast({ title: "Despesa fixa removida!" });
    },
    onError: () => {
      toast({ title: "Erro ao remover despesa fixa", variant: "destructive" });
    },
  });

  return {
    recurringExpenses,
    isLoading,
    createRecurring: createMutation.mutate,
    updateRecurring: updateMutation.mutate,
    deleteRecurring: deleteMutation.mutate,
  };
}

// Calculate daily recurring expense for a given date
export function calculateDailyRecurringAmount(
  recurringExpenses: RecurringExpense[],
  date: Date
): { total: number; breakdown: { name: string; dailyAmount: number }[] } {
  const DAYS_DIVISOR = 30; // Always divide by 30 as per user preference
  const dateStr = date.toISOString().split("T")[0];
  
  const activeExpenses = recurringExpenses.filter((expense) => {
    if (!expense.is_active) return false;
    if (expense.start_date > dateStr) return false;
    if (expense.end_date && expense.end_date < dateStr) return false;
    return true;
  });

  const breakdown = activeExpenses.map((expense) => ({
    name: expense.name,
    dailyAmount: expense.amount / DAYS_DIVISOR,
  }));

  const total = breakdown.reduce((sum, item) => sum + item.dailyAmount, 0);

  return { total, breakdown };
}
