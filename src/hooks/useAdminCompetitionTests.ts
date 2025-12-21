import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useAdminSimulateFinish() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { competition_id: string; meta_reached: boolean }) => {
      const { data, error } = await supabase.rpc("admin_simulate_competition_finish", {
        p_competition_id: params.competition_id,
        p_meta_reached: params.meta_reached,
      });

      if (error) throw error;
      return data as {
        finalized: boolean;
        already_finalized?: boolean;
        winner_type: string;
        winner_team_id: string | null;
        winner_user_id: string | null;
        winner_total: number;
        meta_reached: boolean;
        payout_per_winner: number;
      };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["competition-test-notifications", variables.competition_id] });
      queryClient.invalidateQueries({ queryKey: ["competition-leaderboard", variables.competition_id] });
      queryClient.invalidateQueries({ queryKey: ["finished-competitions"] });
      queryClient.invalidateQueries({ queryKey: ["unread-host-notifications"] });
      
      if (data.already_finalized) {
        toast.info("Competição já finalizada anteriormente");
      } else {
        toast.success(
          data.meta_reached
            ? `Meta atingida! Vencedor: ${data.winner_type === "team" ? "Time" : "Usuário"}`
            : "Meta não atingida - sem vencedor"
        );
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao simular finalização");
    },
  });
}

export function useAdminClearNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (competition_id: string) => {
      const { data, error } = await supabase.rpc("admin_clear_competition_notifications", {
        p_competition_id: competition_id,
      });

      if (error) throw error;
      return data as {
        cleared: boolean;
        deleted_notifications: number;
        deleted_payouts: number;
        deleted_results: number;
      };
    },
    onSuccess: (data, competition_id) => {
      queryClient.invalidateQueries({ queryKey: ["competition-test-notifications", competition_id] });
      queryClient.invalidateQueries({ queryKey: ["competition-leaderboard", competition_id] });
      queryClient.invalidateQueries({ queryKey: ["finished-competitions"] });
      queryClient.invalidateQueries({ queryKey: ["unread-host-notifications"] });
      
      toast.success(
        `Limpeza concluída: ${data.deleted_notifications} notificações, ${data.deleted_payouts} payouts, ${data.deleted_results} resultado`
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao limpar mensagens");
    },
  });
}

export function useCompetitionTestNotifications(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["competition-test-notifications", competitionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("competition_id", competitionId)
        .in("type", [
          "competition_finish_winner",
          "competition_finish_loser",
          "competition_host_payout",
          "competition_host_no_winner",
        ])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as {
        id: string;
        type: string;
        user_id: string;
        competition_id: string;
        payload: any;
        created_at: string;
        read_at: string | null;
      }[];
    },
    enabled: !!competitionId,
  });
}

export function useAdminGetHostPayouts(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["admin-host-payouts", competitionId],
    queryFn: async () => {
      type HostPayouts = {
        meta_reached: boolean;
        competition_name?: string;
        competition_code?: string;
        goal_value?: number;
        prize_value?: number;
        winner_type?: string;
        winner_total?: number;
        winners?: {
          user_id: string;
          name: string;
          whatsapp: string;
          pix_key: string;
          pix_key_type?: string;
          payout_value: number;
        }[];
        message?: string;
      };

      const { data, error } = await supabase.rpc("get_winner_payouts_for_host", {
        p_competition_id: competitionId,
      });

      if (error) {
        if (error.message?.includes("Competição ainda não finalizou")) {
          const fallback: HostPayouts = {
            meta_reached: false,
            competition_name: undefined,
            competition_code: undefined,
            goal_value: undefined,
            prize_value: undefined,
            winner_type: undefined,
            winner_total: undefined,
            winners: [],
            message:
              "Competição ainda não finalizou ou está em modo de teste sem vencedor. Use 'Simular: META ATINGIDA' para ver os detalhes de payout.",
          };
          return fallback;
        }

        throw error;
      }

      return data as HostPayouts;
    },
    enabled: !!competitionId,
  });
}
