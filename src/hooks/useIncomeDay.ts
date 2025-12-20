import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export interface IncomeDayItem {
  id?: string;
  platform: string;
  platform_label?: string | null;
  amount: number;
  trips: number;
  payment_method?: string | null;
  notes?: string | null;
}

export interface IncomeDay {
  id?: string;
  date: string;
  km_rodados: number;
  hours_minutes: number;
  notes?: string | null;
  items: IncomeDayItem[];
}

export function useIncomeDay(selectedDate?: Date) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;

  // Fetch income_day for a specific date with items
  const { data: incomeDay, isLoading } = useQuery({
    queryKey: ["income_day", user?.id, dateStr],
    queryFn: async () => {
      if (!user || !dateStr) return null;

      // Fetch income_day
      const { data: dayData, error: dayError } = await supabase
        .from("income_days")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", dateStr)
        .maybeSingle();

      if (dayError) throw dayError;
      if (!dayData) return null;

      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from("income_day_items")
        .select("*")
        .eq("income_day_id", dayData.id)
        .order("created_at");

      if (itemsError) throw itemsError;

      return {
        ...dayData,
        items: (itemsData || []).map((item) => ({
          id: item.id,
          platform: item.platform,
          platform_label: item.platform_label,
          amount: Number(item.amount),
          trips: item.trips,
          payment_method: item.payment_method,
          notes: item.notes,
        })),
      } as IncomeDay;
    },
    enabled: !!user && !!dateStr,
  });

  // Fetch all income_days for a date range (for dashboard)
  const fetchIncomeDaysRange = async (startDate: Date, endDate: Date) => {
    if (!user) return [];

    const start = format(startDate, "yyyy-MM-dd");
    const end = format(endDate, "yyyy-MM-dd");

    const { data: days, error: daysError } = await supabase
      .from("income_days")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", start)
      .lte("date", end);

    if (daysError) throw daysError;
    if (!days || days.length === 0) return [];

    const dayIds = days.map((d) => d.id);

    const { data: items, error: itemsError } = await supabase
      .from("income_day_items")
      .select("*")
      .in("income_day_id", dayIds);

    if (itemsError) throw itemsError;

    return days.map((day) => ({
      ...day,
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
  };

  // Save (upsert) income_day with items
  const saveIncomeDay = useMutation({
    mutationFn: async (data: IncomeDay) => {
      if (!user) throw new Error("Não autenticado");

      // Validate
      if (!data.km_rodados || data.km_rodados <= 0) {
        throw new Error("KM rodados é obrigatório");
      }
      if (!data.hours_minutes || data.hours_minutes <= 0) {
        throw new Error("Horas trabalhadas é obrigatório");
      }
      if (!data.items || data.items.length === 0) {
        throw new Error("Adicione pelo menos uma plataforma");
      }

      for (const item of data.items) {
        if (!item.amount || item.amount <= 0) {
          throw new Error(`Valor é obrigatório para ${item.platform}`);
        }
        if (!item.trips || item.trips <= 0) {
          throw new Error(`Quantidade de viagens é obrigatória para ${item.platform}`);
        }
      }

      // Upsert income_day
      const { data: dayResult, error: dayError } = await supabase
        .from("income_days")
        .upsert(
          {
            user_id: user.id,
            date: data.date,
            km_rodados: data.km_rodados,
            hours_minutes: data.hours_minutes,
            notes: data.notes || null,
          },
          {
            onConflict: "user_id,date",
          }
        )
        .select()
        .single();

      if (dayError) throw dayError;

      const incomeDayId = dayResult.id;

      // Delete existing items
      const { error: deleteError } = await supabase
        .from("income_day_items")
        .delete()
        .eq("income_day_id", incomeDayId);

      if (deleteError) throw deleteError;

      // Insert new items
      const itemsToInsert = data.items.map((item) => ({
        income_day_id: incomeDayId,
        user_id: user.id,
        platform: item.platform,
        platform_label: item.platform === "outro" ? item.platform_label : null,
        amount: item.amount,
        trips: item.trips,
        payment_method: item.payment_method || null,
        notes: item.notes || null,
      }));

      const { error: insertError } = await supabase
        .from("income_day_items")
        .insert(itemsToInsert);

      if (insertError) throw insertError;

      return incomeDayId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["income_day"] });
      queryClient.invalidateQueries({ queryKey: ["income_days"] });
      queryClient.invalidateQueries({ queryKey: ["revenues"] }); // Keep legacy queries fresh
      toast({ title: "Receita do dia salva!" });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  // Delete income_day
  const deleteIncomeDay = useMutation({
    mutationFn: async (incomeDayId: string) => {
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("income_days")
        .delete()
        .eq("id", incomeDayId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["income_day"] });
      queryClient.invalidateQueries({ queryKey: ["income_days"] });
      toast({ title: "Receita do dia excluída!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir receita", variant: "destructive" });
    },
  });

  return {
    incomeDay,
    isLoading,
    saveIncomeDay,
    deleteIncomeDay,
    fetchIncomeDaysRange,
  };
}
