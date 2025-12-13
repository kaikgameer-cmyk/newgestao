import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatLocalDate, parseLocalDate } from "@/lib/dateUtils";

export interface RecurringExpense {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  recurrence_type: "monthly_fixed_day" | "distributed";
  recurrence_day: number | null;
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
      recurrence_type: "monthly_fixed_day" | "distributed";
      recurrence_day?: number | null;
    }) => {
      if (!userId) throw new Error("User not authenticated");
      const { error } = await supabase.from("recurring_expenses").insert({
        user_id: userId,
        name: expense.name,
        amount: expense.amount,
        start_date: expense.start_date,
        end_date: expense.end_date || null,
        recurrence_type: expense.recurrence_type,
        recurrence_day: expense.recurrence_day || null,
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
      recurrence_type?: "monthly_fixed_day" | "distributed";
      recurrence_day?: number | null;
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

/**
 * Helper: Get the number of days in a distributed expense period
 */
function getDistributedDays(expense: RecurringExpense): number {
  if (expense.recurrence_type !== "distributed" || !expense.end_date) return 1;
  const start = parseLocalDate(expense.start_date);
  const end = parseLocalDate(expense.end_date);
  const diffTime = end.getTime() - start.getTime();
  const days = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(days, 1);
}

/**
 * Helper: Get daily value for a distributed expense
 */
export function getDistributedDailyValue(expense: RecurringExpense): number | null {
  if (expense.recurrence_type !== "distributed" || !expense.end_date) return null;
  const days = getDistributedDays(expense);
  return expense.amount / days;
}

/**
 * Calculate daily recurring expense for a given date
 * - monthly_fixed_day: Full value on that specific day of month
 * - distributed: Daily prorated value within date range
 */
export function calculateDailyRecurringAmount(
  recurringExpenses: RecurringExpense[],
  date: Date
): { total: number; breakdown: { name: string; dailyAmount: number }[] } {
  // Use string comparison to avoid timezone issues
  const dateStr = formatLocalDate(date);
  const dayOfMonth = date.getDate();

  const breakdown: { name: string; dailyAmount: number }[] = [];

  for (const expense of recurringExpenses) {
    if (!expense.is_active) continue;
    
    // String comparison for date boundaries
    if (expense.start_date > dateStr) continue;
    if (expense.end_date && expense.end_date < dateStr) continue;

    if (expense.recurrence_type === "monthly_fixed_day") {
      // Monthly fixed day - full value on that specific day each month
      if (expense.recurrence_day === dayOfMonth) {
        breakdown.push({
          name: expense.name,
          dailyAmount: expense.amount,
        });
      }
    } else if (expense.recurrence_type === "distributed") {
      // Distributed - prorated daily within the date range
      // Check if date is within the range using string comparison
      const isInRange = dateStr >= expense.start_date && 
                       (!expense.end_date || dateStr <= expense.end_date);
      
      if (isInRange) {
        const dailyAmount = getDistributedDailyValue(expense);
        if (dailyAmount !== null) {
          breakdown.push({
            name: expense.name,
            dailyAmount,
          });
        }
      }
    }
  }

  const total = breakdown.reduce((sum, item) => sum + item.dailyAmount, 0);

  return { total, breakdown };
}

/**
 * Calculate total recurring expenses for a date range
 * - monthly_fixed_day: Full value for each occurrence within the period
 * - distributed: Prorated amount for days within the period that overlap with expense range
 */
export function calculatePeriodRecurringAmount(
  recurringExpenses: RecurringExpense[],
  startDate: Date,
  endDate: Date
): number {
  let total = 0;

  // Convert to string format for consistent comparison
  const periodStartStr = formatLocalDate(startDate);
  const periodEndStr = formatLocalDate(endDate);

  for (const expense of recurringExpenses) {
    if (!expense.is_active) continue;

    // Skip if expense starts after period ends
    if (expense.start_date > periodEndStr) continue;
    // Skip if expense ended before period starts
    if (expense.end_date && expense.end_date < periodStartStr) continue;

    if (expense.recurrence_type === "monthly_fixed_day") {
      // Monthly fixed day - count occurrences of that day within the period
      if (expense.recurrence_day) {
        // Iterate through each day in the period
        const current = new Date(startDate);
        while (current <= endDate) {
          const dayOfMonth = current.getDate();
          const currentStr = formatLocalDate(current);
          
          // Check if this day matches the recurrence day and is within expense validity
          if (dayOfMonth === expense.recurrence_day) {
            if (currentStr >= expense.start_date && (!expense.end_date || currentStr <= expense.end_date)) {
              total += expense.amount;
            }
          }
          
          current.setDate(current.getDate() + 1);
        }
      }
    } else if (expense.recurrence_type === "distributed") {
      // Distributed - calculate prorated amount for overlapping days
      const dailyValue = getDistributedDailyValue(expense);
      if (dailyValue === null) continue;

      // Calculate overlapping range using string comparison
      const overlapStartStr = expense.start_date > periodStartStr ? expense.start_date : periodStartStr;
      const overlapEndStr = (expense.end_date && expense.end_date < periodEndStr) ? expense.end_date : periodEndStr;
      
      // Count overlapping days
      const overlapStart = parseLocalDate(overlapStartStr);
      const overlapEnd = parseLocalDate(overlapEndStr);
      
      if (overlapEnd >= overlapStart) {
        const overlappingDays = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        total += dailyValue * overlappingDays;
      }
    }
  }

  return total;
}

/**
 * Calculate combined daily cost for all active recurring expenses (for summary display)
 * - monthly_fixed_day: divided by 30 days
 * - distributed: daily value based on actual period
 */
export function calculateAllExpensesDailyCost(
  recurringExpenses: RecurringExpense[]
): { 
  total: number; 
  monthlyTotal: number;
  distributedTotal: number;
  breakdown: { name: string; dailyAmount: number; monthlyAmount?: number; type: string }[] 
} {
  const DAYS_DIVISOR = 30;
  const breakdown: { name: string; dailyAmount: number; monthlyAmount?: number; type: string }[] = [];
  const today = new Date();
  const todayStr = formatLocalDate(today);

  let monthlyTotal = 0;
  let distributedTotal = 0;

  for (const expense of recurringExpenses) {
    if (!expense.is_active) continue;
    if (expense.start_date > todayStr) continue;
    if (expense.end_date && expense.end_date < todayStr) continue;

    if (expense.recurrence_type === "monthly_fixed_day") {
      // Monthly fixed day: divide by 30 for daily cost estimate
      const dailyAmount = expense.amount / DAYS_DIVISOR;
      breakdown.push({
        name: expense.name,
        dailyAmount,
        monthlyAmount: expense.amount,
        type: "monthly",
      });
      monthlyTotal += dailyAmount;
    } else if (expense.recurrence_type === "distributed") {
      // Distributed: use actual daily value
      const dailyAmount = getDistributedDailyValue(expense);
      if (dailyAmount !== null) {
        breakdown.push({
          name: expense.name,
          dailyAmount,
          type: "distributed",
        });
        distributedTotal += dailyAmount;
      }
    }
  }

  const total = monthlyTotal + distributedTotal;
  return { total, monthlyTotal, distributedTotal, breakdown };
}

/**
 * Legacy function - Calculate monthly expenses daily cost (for backwards compatibility)
 * Only considers monthly_fixed_day divided by 30 days
 */
export function calculateMonthlyExpensesDailyCost(
  recurringExpenses: RecurringExpense[]
): { total: number; breakdown: { name: string; dailyAmount: number; monthlyAmount: number }[] } {
  const DAYS_DIVISOR = 30;
  const breakdown: { name: string; dailyAmount: number; monthlyAmount: number }[] = [];
  const today = new Date();
  const todayStr = formatLocalDate(today);

  for (const expense of recurringExpenses) {
    if (!expense.is_active) continue;
    if (expense.start_date > todayStr) continue;
    if (expense.end_date && expense.end_date < todayStr) continue;

    // Only include monthly_fixed_day expenses in daily cost calculation
    if (expense.recurrence_type === "monthly_fixed_day") {
      breakdown.push({
        name: expense.name,
        dailyAmount: expense.amount / DAYS_DIVISOR,
        monthlyAmount: expense.amount,
      });
    }
  }

  const total = breakdown.reduce((sum, item) => sum + item.dailyAmount, 0);
  return { total, breakdown };
}