import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formatLocalDate, parseLocalDate } from '@/lib/dateUtils';

interface DailyGoal {
  id: string;
  user_id: string;
  date: string;
  daily_goal: number;
  created_at: string;
  updated_at: string;
}

interface GoalInput {
  date: Date;
  dailyGoal: number;
}

/**
 * Hook for managing daily goals (metas diárias)
 * Provides CRUD operations and period-based queries for goal tracking
 */
export function useDailyGoals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all goals for the user
  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['daily-goals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('daily_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as DailyGoal[];
    },
    enabled: !!user?.id,
  });

  // Get goal for a specific date
  const getGoalForDate = (date: Date): number | null => {
    const dateStr = formatLocalDate(date);
    const goal = goals.find(g => g.date === dateStr);
    return goal ? Number(goal.daily_goal) : null;
  };

  // Get goals for a date range
  const getGoalsForPeriod = (startDate: Date, endDate: Date): Map<string, number> => {
    const goalsMap = new Map<string, number>();
    const start = formatLocalDate(startDate);
    const end = formatLocalDate(endDate);
    
    goals.forEach(goal => {
      if (goal.date >= start && goal.date <= end) {
        goalsMap.set(goal.date, Number(goal.daily_goal));
      }
    });
    
    return goalsMap;
  };

  // Calculate total goals for a period
  const getTotalGoalsForPeriod = (startDate: Date, endDate: Date): number => {
    const goalsMap = getGoalsForPeriod(startDate, endDate);
    let total = 0;
    goalsMap.forEach(value => {
      total += value;
    });
    return total;
  };

  // Upsert goal mutation (create or update)
  const upsertGoal = useMutation({
    mutationFn: async ({ date, dailyGoal }: GoalInput) => {
      if (!user?.id) throw new Error('User not authenticated');

      const dateStr = formatLocalDate(date);
      
      // Check if goal exists for this date
      const existingGoal = goals.find(g => g.date === dateStr);
      
      if (existingGoal) {
        // Update existing goal
        const { data, error } = await supabase
          .from('daily_goals')
          .update({ daily_goal: dailyGoal })
          .eq('id', existingGoal.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new goal
        const { data, error } = await supabase
          .from('daily_goals')
          .insert({
            user_id: user.id,
            date: dateStr,
            daily_goal: dailyGoal,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-goals'] });
      toast.success('Meta salva com sucesso!');
    },
    onError: (error) => {
      console.error('Error saving goal:', error);
      toast.error('Erro ao salvar meta');
    },
  });

  // Delete goal mutation
  const deleteGoal = useMutation({
    mutationFn: async (date: Date) => {
      if (!user?.id) throw new Error('User not authenticated');

      const dateStr = formatLocalDate(date);
      
      const { error } = await supabase
        .from('daily_goals')
        .delete()
        .eq('user_id', user.id)
        .eq('date', dateStr);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-goals'] });
      toast.success('Meta removida');
    },
    onError: (error) => {
      console.error('Error deleting goal:', error);
      toast.error('Erro ao remover meta');
    },
  });

  return {
    goals,
    isLoading,
    getGoalForDate,
    getGoalsForPeriod,
    getTotalGoalsForPeriod,
    upsertGoal,
    deleteGoal,
  };
}
