import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Competition {
  id: string;
  code: string;
  name: string;
  description: string | null;
  goal_type: "income_goal";
  goal_value: number;
  prize_value: number | null;
  has_prize?: boolean | null;
  start_date: string;
  end_date: string;
  max_members: number | null;
  allow_teams: boolean;
  team_size: number | null;
  created_by: string;
  created_at: string;
  is_public: boolean;
  host_participates: boolean;
  is_listed: boolean;
}

const COMPETITION_FIELDS = [
  "id",
  "code",
  "name",
  "description",
  "goal_type",
  "goal_value",
  "prize_value",
  "has_prize",
  "start_date",
  "end_date",
  "max_members",
  "allow_teams",
  "team_size",
  "created_by",
  "created_at",
  "is_public",
  "host_participates",
  "is_listed",
].join(", ");

export interface CompetitionMember {
  id: string;
  user_id: string;
  role: 'host' | 'member';
  joined_at: string;
  display_name?: string;
  is_competitor: boolean;
  transparency_accepted: boolean;
  transparency_accepted_at: string | null;
}

export interface LeaderboardMember {
  user_id: string;
  display_name: string;
  role: string;
  is_competitor: boolean;
  total_income: number;
  score: number;
  progress: number;
}

export interface AllMember {
  user_id: string;
  display_name: string;
  role: string;
  is_competitor: boolean;
}

export interface LeaderboardTeam {
  team_id: string;
  team_name: string;
  team_score: number;
  members: { user_id: string; display_name: string }[];
}

export interface LeaderboardData {
  competition: {
    id: string;
    name: string;
    goal_type: string;
    goal_value: number;
    prize_value: number;
    start_date: string;
    end_date: string;
    host_participates: boolean;
  };
  members: LeaderboardMember[];
  all_members: AllMember[];
  teams: LeaderboardTeam[] | null;
}

export interface ListedCompetition {
  id: string;
  code: string;
  name: string;
  description: string | null;
  goal_value: number;
  prize_value: number;
  start_date: string;
  end_date: string;
  max_members: number | null;
  allow_teams: boolean;
  member_count: number;
  is_member: boolean;
}

export type CompetitionTabStatus = "available" | "mine" | "finished";

export interface CompetitionForTabs {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  prize_value: number;
  goal_value: number;
  allow_teams: boolean;
  host_user_id: string;
  participants_count: number;
  user_is_member: boolean;
  user_is_host: boolean;
  computed_status: CompetitionTabStatus;
  computed_label: string;
  meta_reached: boolean;
}

export function useCompetitionsForTabs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["competitions-for-tabs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_competitions_for_tabs");

      if (error) throw error;
      return (data || []) as CompetitionForTabs[];
    },
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
  });
}
 
export function useMyCompetitions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-competitions", user?.id],
    queryFn: async () => {
      const { data, error } = (await supabase
        .from("competitions")
        .select(
          `${COMPETITION_FIELDS}, competition_members!inner(user_id, role, is_competitor)` as any,
        )
        .order("created_at", { ascending: false })) as { data: any; error: any };

      if (error) throw error;
      
      // Filter to only include non-finished competitions
      const now = new Date();
      const filtered = (data || []).filter((comp) => {
        const endExclusive = new Date(comp.end_date);
        endExclusive.setDate(endExclusive.getDate() + 1);
        return now < endExclusive; // Not finished yet
      });
      
      return filtered as (Competition & { 
        competition_members: { user_id: string; role: string; is_competitor: boolean }[] 
      })[];
    },
    enabled: !!user,
  });
}

export function useFinishedCompetitions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["finished-competitions", user?.id],
    queryFn: async () => {
      // Get all competitions user is member of
      const { data: competitions, error: compError } = (await supabase
        .from("competitions")
        .select(
          `${COMPETITION_FIELDS}, competition_members!inner(user_id, role, is_competitor)` as any,
        )
        .order("end_date", { ascending: false })) as { data: any; error: any };

      if (compError) throw compError;
      
      // Filter to only include finished competitions
      const now = new Date();
      const finished = (competitions || []).filter((comp) => {
        const endExclusive = new Date(comp.end_date);
        endExclusive.setDate(endExclusive.getDate() + 1);
        return now >= endExclusive; // Finished
      });
      
      // Get user's payouts for these competitions
      const finishedIds = finished.map(c => c.id);
      let payoutsMap: Record<string, { status: string; payout_value: number }> = {};
      
      if (finishedIds.length > 0) {
        const { data: payouts, error: payError } = await supabase
          .from("competition_payouts")
          .select("competition_id, status, payout_value")
          .eq("user_id", user?.id)
          .in("competition_id", finishedIds);
        
        if (!payError && payouts) {
          payoutsMap = payouts.reduce((acc, p) => {
            acc[p.competition_id] = { status: p.status, payout_value: p.payout_value };
            return acc;
          }, {} as Record<string, { status: string; payout_value: number }>);
        }
      }
      
      return finished.map(comp => ({
        ...comp,
        payout: payoutsMap[comp.id] || null
      })) as (Competition & { 
        competition_members: { user_id: string; role: string; is_competitor: boolean }[];
        payout: { status: "winner" | "loser" | "no_winner"; payout_value: number } | null;
      })[];
    },
    enabled: !!user,
  });
}

export function useListedCompetitions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["listed-competitions"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_listed_competitions");

      if (error) throw error;
      return data as ListedCompetition[];
    },
    enabled: !!user,
  });
}

export function useCompetition(code: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["competition", code],
    queryFn: async () => {
      // Try to find by code first (uppercase)
      const { data, error } = (await supabase
        .from("competitions")
        .select(COMPETITION_FIELDS as any)
        .eq("code", code.toUpperCase())
        .maybeSingle()) as { data: any; error: any };

      if (error) throw error;
      
      // If not found, return null (page will show "not found")
      return data as Competition | null;
    },
    enabled: !!user && !!code,
  });
}

export function useCompetitionById(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["competition-by-id", id],
    queryFn: async () => {
      // Try to find by ID first
      let { data, error } = (await supabase
        .from("competitions")
        .select(COMPETITION_FIELDS as any)
        .eq("id", id)
        .maybeSingle()) as { data: any; error: any };

      // If not found by ID, try by code (for backward compatibility)
      if (!data && id) {
        const codeResult = (await supabase
          .from("competitions")
          .select(COMPETITION_FIELDS as any)
          .eq("code", id.toUpperCase())
          .maybeSingle()) as { data: any; error: any };
        
        if (!codeResult.error) {
          data = codeResult.data;
        }
      }

      if (error) throw error;
      return data as Competition | null;
    },
    enabled: !!user && !!id,
  });
}

export function useCompetitionMembers(competitionId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["competition-members", competitionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competition_members")
        .select("*")
        .eq("competition_id", competitionId)
        .order("joined_at", { ascending: true });

      if (error) throw error;
      return data as CompetitionMember[];
    },
    enabled: !!user && !!competitionId,
  });
}

export function useCompetitionLeaderboard(competitionId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["competition-leaderboard", competitionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_competition_leaderboard", {
        p_competition_id: competitionId,
      });

      if (error) throw error;
      return data as unknown as LeaderboardData;
    },
    enabled: !!user && !!competitionId,
    retry: false,
  });
}

export function useCreateCompetition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      description?: string;
      goal_type: string;
      goal_value: number;
      start_date: string;
      end_date: string;
      password: string;
      max_members?: number;
      allow_teams?: boolean;
      team_size?: number;
      has_prize: boolean;
      prize_value: number | null;
      host_participates?: boolean;
    }) => {
      const { data, error } = await supabase.rpc("create_competition", {
        p_name: params.name,
        p_description: params.description || null,
        p_goal_type: params.goal_type,
        p_goal_value: params.goal_value,
        p_start_date: params.start_date,
        p_end_date: params.end_date,
        p_password: params.password,
        p_max_members: params.max_members || null,
        p_allow_teams: params.allow_teams || false,
        p_team_size: params.team_size || null,
        p_prize_value: params.prize_value ?? null,
        p_host_participates: params.host_participates ?? true,
      });

      if (error) throw error;
      const created = data as { competition_id: string; code: string };

      // Garantir consistência de has_prize/prize_value no banco
      const { error: updateError } = await supabase
        .from("competitions")
        .update({
          has_prize: params.has_prize,
          prize_value: params.has_prize ? params.prize_value : null,
        })
        .eq("id", created.competition_id);

      if (updateError) throw updateError;

      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competitions-for-tabs"] });
      queryClient.invalidateQueries({ queryKey: ["my-competitions"] });
      queryClient.invalidateQueries({ queryKey: ["listed-competitions"] });
      toast.success("Competição criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao criar competição");
    },
  });
}

export function useJoinCompetition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      code: string;
      password: string;
      pix_key: string;
      pix_key_type?: string;
    }) => {
      console.log("joinCompetition mutation start", params);
      try {
        const { data, error } = await supabase.rpc("join_competition", {
          p_code: params.code.toUpperCase(),
          p_password: params.password,
          p_pix_key: params.pix_key,
          p_pix_key_type: params.pix_key_type || null,
        });

        if (error) {
          console.error("joinCompetition RPC error", error);
          throw error;
        }

        console.log("joinCompetition mutation success", data);
        return data as { competition_id: string; name: string; message: string };
      } catch (err) {
        console.error("joinCompetition mutation failed", err);
        throw err;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["competitions-for-tabs"] });
      queryClient.invalidateQueries({ queryKey: ["my-competitions"] });
      queryClient.invalidateQueries({ queryKey: ["listed-competitions"] });
      queryClient.invalidateQueries({ queryKey: ["finished-competitions"] });
      if (data.message === "already_member") {
        toast.info("Você já participa desta competição (PIX atualizado)");
      } else {
        toast.success(`Você entrou na competição "${data.name}"!`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Código ou senha inválidos");
    },
  });
}

export function useAcceptCompetitionTransparency() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: { competition_id: string }) => {
      if (!user) throw new Error("Usuário não autenticado");
      
      const { error } = await supabase
        .from("competition_members")
        .update({
          transparency_accepted: true,
          transparency_accepted_at: new Date().toISOString(),
          is_competitor: true,
        })
        .eq("competition_id", params.competition_id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["competitions-for-tabs"] });
      queryClient.invalidateQueries({ queryKey: ["my-competitions"] });
      queryClient.invalidateQueries({ queryKey: ["competition", variables.competition_id] });
      queryClient.invalidateQueries({ queryKey: ["competition-leaderboard", variables.competition_id] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao registrar aceite de transparência");
    },
  });
}
export function useCreateTeams() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { competition_id: string; team_count: number }) => {
      const { data, error } = await supabase.rpc("create_competition_teams", {
        p_competition_id: params.competition_id,
        p_team_count: params.team_count,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["competition-leaderboard", variables.competition_id] });
      queryClient.invalidateQueries({ queryKey: ["competition-page", variables.competition_id] });
      toast.success("Times criados e participantes distribuídos!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao criar times");
    },
  });
}

export function useAssignMemberToTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { 
      competition_id: string; 
      team_id: string; 
      user_id: string 
    }) => {
      const { data, error } = await supabase.rpc("assign_member_to_team", {
        p_competition_id: params.competition_id,
        p_team_id: params.team_id,
        p_user_id: params.user_id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["competition-leaderboard", variables.competition_id] });
      queryClient.invalidateQueries({ queryKey: ["competition-page", variables.competition_id] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atribuir membro ao time");
    },
  });
}

export function useUnassignMemberFromTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { 
      competition_id: string; 
      user_id: string 
    }) => {
      const { data, error } = await supabase.rpc("unassign_member_from_team", {
        p_competition_id: params.competition_id,
        p_user_id: params.user_id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["competition-leaderboard", variables.competition_id] });
      queryClient.invalidateQueries({ queryKey: ["competition-page", variables.competition_id] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao remover membro do time");
    },
  });
}

export function useUpdateTeamName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { 
      team_id: string;
      name: string;
      competition_id: string;
    }) => {
      const { data, error } = await supabase.rpc("update_team_name", {
        p_team_id: params.team_id,
        p_name: params.name,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["competition-leaderboard", variables.competition_id] });
      queryClient.invalidateQueries({ queryKey: ["competition-page", variables.competition_id] });
      toast.success("Nome do time atualizado!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar nome do time");
    },
  });
}

export function useLeaveCompetition() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (competitionId: string) => {
      const { error } = await supabase
        .from("competition_members")
        .delete()
        .eq("competition_id", competitionId)
        .eq("user_id", user?.id);

      if (error) throw error;
    },
    onSuccess: (__, competitionId) => {
      queryClient.invalidateQueries({ queryKey: ["my-competitions"] });
      queryClient.invalidateQueries({ queryKey: ["listed-competitions"] });
      queryClient.invalidateQueries({ queryKey: ["competition", competitionId] });
      toast.success("Você saiu da competição");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao sair da competição");
    },
  });
}

// Hook to lazily finalize a competition when needed (idempotent)
export function useFinalizeCompetitionIfNeeded() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (competitionId: string) => {
      const { data, error } = await supabase.rpc("finalize_competition_if_needed", {
        p_competition_id: competitionId,
      });

      if (error) throw error;
      return data as {
        finalized?: boolean;
        already_finalized?: boolean;
        winner_type: "team" | "individual" | "none";
        winner_team_id: string | null;
        winner_user_id: string | null;
        winner_total: number;
        meta_reached: boolean;
        payout_per_winner?: number;
      };
    },
    onSuccess: (_, competitionId) => {
      queryClient.invalidateQueries({ queryKey: ["competition-leaderboard", competitionId] });
      queryClient.invalidateQueries({ queryKey: ["finish-result-popup", competitionId] });
      queryClient.invalidateQueries({ queryKey: ["finished-competitions"] });
    },
  });
}

// Hook to finalize a competition explicitly and get winner
export function useFinalizeCompetition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (competitionId: string) => {
      const { data, error } = await supabase.rpc("finalize_competition", {
        p_competition_id: competitionId,
      });

      if (error) throw error;
      return data as {
        finalized?: boolean;
        already_finalized?: boolean;
        winner_type: "team" | "individual" | "none";
        winner_team_id: string | null;
        winner_user_id: string | null;
        winner_total: number;
        meta_reached: boolean;
        payout_per_winner?: number;
      };
    },
    onSuccess: (_, competitionId) => {
      queryClient.invalidateQueries({ queryKey: ["competition-leaderboard", competitionId] });
      queryClient.invalidateQueries({ queryKey: ["finish-result-popup", competitionId] });
    },
  });
}

// Hook to check if user should see winner popup (old - kept for backwards compatibility)
export function useCheckWinnerPopup(competitionId: string | undefined, isFinished: boolean) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["winner-popup", competitionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("check_competition_winner_popup", {
        p_competition_id: competitionId,
      });

      if (error) throw error;
      return data as {
        show_popup: boolean;
        reason?: string;
        winner_type?: "team" | "individual";
        winner_name?: string;
        winner_score?: number;
      };
    },
    enabled: !!user && !!competitionId && isFinished,
  });
}

// Hook to mark winner popup as shown
export function useMarkWinnerPopupShown() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (competitionId: string) => {
      const { data, error } = await supabase.rpc("mark_winner_popup_shown", {
        p_competition_id: competitionId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, competitionId) => {
      queryClient.invalidateQueries({ queryKey: ["winner-popup", competitionId] });
    },
  });
}

// Hook to check finish result popup (new - with payouts)
export function useCheckFinishResultPopup(competitionId: string | undefined, isFinished: boolean) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["finish-result-popup", competitionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("check_finish_result_popup", {
        p_competition_id: competitionId,
      });

      if (error) throw error;
      return data as {
        show_popup: boolean;
        reason?: string;
        status?: "winner" | "loser" | "no_winner";
        payout_value?: number;
        winner_name?: string;
        winner_type?: "team" | "individual" | "none";
        meta_reached?: boolean;
      };
    },
    enabled: !!user && !!competitionId && isFinished,
  });
}

// Hook to mark finish result popup as shown
export function useMarkFinishResultPopupShown() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (competitionId: string) => {
      const { data, error } = await supabase.rpc("mark_finish_result_popup_shown", {
        p_competition_id: competitionId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, competitionId) => {
      queryClient.invalidateQueries({ queryKey: ["finish-result-popup", competitionId] });
    },
  });
}

// Hook to get user's payouts for history
export function useUserPayouts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-payouts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competition_payouts")
        .select("*")
        .eq("user_id", user?.id);

      if (error) throw error;
      return data as {
        id: string;
        competition_id: string;
        user_id: string;
        team_id: string | null;
        payout_value: number;
        status: "winner" | "loser" | "no_winner";
        created_at: string;
      }[];
    },
    enabled: !!user,
  });
}

// Hook to get member's PIX info for a competition
export function useMemberPix(competitionId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["member-pix", competitionId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competition_members")
        .select("pix_key, pix_key_type")
        .eq("competition_id", competitionId!)
        .eq("user_id", user!.id)
        .single();

      if (error) throw error;
      return data as { pix_key: string | null; pix_key_type: string | null };
    },
    enabled: !!user && !!competitionId,
  });
}

// Hook to update member's PIX info
export function useUpdateMemberPix() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      competition_id,
      pix_key,
      pix_key_type,
    }: {
      competition_id: string;
      pix_key: string;
      pix_key_type: string | null;
    }) => {
      const { error } = await supabase
        .from("competition_members")
        .update({
          pix_key,
          pix_key_type,
          pix_updated_at: new Date().toISOString(),
        })
        .eq("competition_id", competition_id)
        .eq("user_id", user!.id);

      if (error) throw error;
    },
    onSuccess: (_, { competition_id }) => {
      toast.success("Chave PIX atualizada");
      queryClient.invalidateQueries({ queryKey: ["member-pix", competition_id] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar PIX");
    },
  });
}

// Hook to update competition as host
export function useUpdateCompetition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      competition_id: string;
      name?: string;
      description?: string;
      goal_value?: number;
      has_prize?: boolean;
      prize_value?: number | null;
      start_date?: string;
      end_date?: string;
      max_members?: number;
    }) => {
      const { competition_id, has_prize, ...rest } = params;

      const { data, error } = await supabase.rpc("update_competition_as_host", {
        p_competition_id: competition_id,
        p_name: rest.name || null,
        p_description: rest.description || null,
        p_goal_value: rest.goal_value || null,
        p_prize_value: rest.prize_value ?? null,
        p_start_date: rest.start_date || null,
        p_end_date: rest.end_date || null,
        p_max_members: rest.max_members || null,
      });

      if (error) throw error;

      // Garantir consistência de has_prize/prize_value no banco
      if (has_prize !== undefined) {
        const { error: updateError } = await supabase
          .from("competitions")
          .update({
            has_prize,
            prize_value: has_prize ? rest.prize_value ?? null : null,
          })
          .eq("id", competition_id);

        if (updateError) throw updateError;
      }

      return data as {
        id: string;
        code: string;
        name: string;
        description: string | null;
        goal_value: number;
        prize_value: number | null;
        start_date: string;
        end_date: string;
        max_members: number | null;
        allow_teams: boolean;
        host_participates: boolean;
      };
    },
    // Optimistic update para deixar a UI instantânea
    onMutate: async (variables) => {
      const optimisticPrizeValue = variables.has_prize
        ? variables.prize_value ?? null
        : null;

      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["competitions-for-tabs"] }),
        queryClient.cancelQueries({ queryKey: ["my-competitions"] }),
        queryClient.cancelQueries({
          queryKey: ["competition-by-id", variables.competition_id],
        }),
        queryClient.cancelQueries({ queryKey: ["competition-page"] }),
      ]);

      const prevTabs = queryClient.getQueryData<CompetitionForTabs[]>([
        "competitions-for-tabs",
      ]);
      const prevMy = queryClient.getQueryData<any[]>(["my-competitions"]);
      const prevById = queryClient.getQueryData<Competition | null>([
        "competition-by-id",
        variables.competition_id,
      ]);
      const prevPages = queryClient.getQueriesData({ queryKey: ["competition-page"] });

      if (prevTabs) {
        queryClient.setQueryData<CompetitionForTabs[]>(
          ["competitions-for-tabs"],
          prevTabs.map((c) =>
            c.id === variables.competition_id
              ? {
                  ...c,
                  name: variables.name ?? c.name,
                  goal_value: variables.goal_value ?? c.goal_value,
                  prize_value:
                    optimisticPrizeValue !== null
                      ? optimisticPrizeValue
                      : c.prize_value,
                  start_date: variables.start_date ?? c.start_date,
                  end_date: variables.end_date ?? c.end_date,
                }
              : c
          )
        );
      }

      if (prevMy) {
        queryClient.setQueryData(
          ["my-competitions"],
          prevMy.map((c: any) =>
            c.id === variables.competition_id
              ? {
                  ...c,
                  name: variables.name ?? c.name,
                  goal_value: variables.goal_value ?? c.goal_value,
                  prize_value:
                    optimisticPrizeValue !== null
                      ? optimisticPrizeValue
                      : c.prize_value,
                  has_prize:
                    variables.has_prize !== undefined
                      ? variables.has_prize
                      : c.has_prize,
                  start_date: variables.start_date ?? c.start_date,
                  end_date: variables.end_date ?? c.end_date,
                  max_members: variables.max_members ?? c.max_members,
                }
              : c
          )
        );
      }

      if (prevById) {
        queryClient.setQueryData<Competition | null>(
          ["competition-by-id", variables.competition_id],
          {
            ...prevById,
            name: variables.name ?? prevById.name,
            goal_value: variables.goal_value ?? prevById.goal_value,
            prize_value:
              optimisticPrizeValue !== null
                ? optimisticPrizeValue
                : prevById.prize_value,
            has_prize:
              variables.has_prize !== undefined
                ? variables.has_prize
                : prevById.has_prize,
            start_date: variables.start_date ?? prevById.start_date,
            end_date: variables.end_date ?? prevById.end_date,
            max_members: variables.max_members ?? prevById.max_members,
          }
        );
      }

      prevPages.forEach(([key, value]) => {
        const data = value as any;
        if (!data?.competition) return;
        if (data.competition.id !== variables.competition_id) return;

        queryClient.setQueryData(key, {
          ...data,
          competition: {
            ...data.competition,
            name: variables.name ?? data.competition.name,
            goal_value: variables.goal_value ?? data.competition.goal_value,
            prize_value:
              optimisticPrizeValue !== null
                ? optimisticPrizeValue
                : data.competition.prize_value,
            start_date: variables.start_date ?? data.competition.start_date,
            end_date: variables.end_date ?? data.competition.end_date,
            max_members:
              variables.max_members ?? data.competition.max_members,
          },
        });
      });

      return { prevTabs, prevMy, prevById, prevPages };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["competitions-for-tabs"] });
      queryClient.invalidateQueries({ queryKey: ["my-competitions"] });
      queryClient.invalidateQueries({
        queryKey: ["competition-by-id", variables.competition_id],
      });
      queryClient.invalidateQueries({ queryKey: ["competition-page"] });
      queryClient.invalidateQueries({
        queryKey: ["competition-leaderboard", variables.competition_id],
      });
      toast.success("Competição atualizada com sucesso!");
    },
    onError: (error: Error, _variables, context) => {
      if (context?.prevTabs) {
        queryClient.setQueryData(
          ["competitions-for-tabs"],
          context.prevTabs
        );
      }
      if (context?.prevMy) {
        queryClient.setQueryData(["my-competitions"], context.prevMy);
      }
      if (context?.prevById) {
        queryClient.setQueryData(
          ["competition-by-id", context.prevById.id],
          context.prevById
        );
      }
      if (context?.prevPages) {
        context.prevPages.forEach(([key, value]: [unknown, unknown]) => {
          queryClient.setQueryData(key as any, value);
        });
      }
      toast.error(error.message || "Erro ao atualizar competição");
    },
  });
}

// Hook to delete competition as host (soft delete)
export function useDeleteCompetition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (competitionId: string) => {
      const { data, error } = await supabase.rpc("delete_competition_as_host", {
        p_competition_id: competitionId,
      });

      if (error) throw error;
      return data as {
        success: boolean;
        deleted_members: number;
        deleted_teams: number;
        competition_name: string;
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["competitions-for-tabs"] });
      queryClient.invalidateQueries({ queryKey: ["my-competitions"] });
      queryClient.invalidateQueries({ queryKey: ["listed-competitions"] });
      queryClient.invalidateQueries({ queryKey: ["finished-competitions"] });
      toast.success(`Competição "${data.competition_name}" excluída`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao excluir competição");
    },
  });
}
