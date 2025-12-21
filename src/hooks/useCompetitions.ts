import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Competition {
  id: string;
  code: string;
  name: string;
  description: string | null;
  goal_type: 'income_goal';
  goal_value: number;
  prize_value: number;
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

export interface CompetitionMember {
  id: string;
  user_id: string;
  role: 'host' | 'member';
  joined_at: string;
  display_name?: string;
  is_competitor: boolean;
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

export function useMyCompetitions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-competitions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitions")
        .select(`
          *,
          competition_members!inner(user_id, role, is_competitor)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return (data || []) as (Competition & { 
        competition_members: { user_id: string; role: string; is_competitor: boolean }[] 
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
      const { data, error } = await supabase
        .from("competitions")
        .select("*")
        .eq("code", code.toUpperCase())
        .single();

      if (error) throw error;
      return data as Competition;
    },
    enabled: !!user && !!code,
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
      prize_value: number;
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
        p_prize_value: params.prize_value,
        p_host_participates: params.host_participates ?? true,
      });

      if (error) throw error;
      return data as { competition_id: string; code: string };
    },
    onSuccess: () => {
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
    mutationFn: async (params: { code: string; password: string }) => {
      const { data, error } = await supabase.rpc("join_competition", {
        p_code: params.code.toUpperCase(),
        p_password: params.password,
      });

      if (error) throw error;
      return data as { competition_id: string; name: string; message: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-competitions"] });
      queryClient.invalidateQueries({ queryKey: ["listed-competitions"] });
      if (data.message === "already_member") {
        toast.info("Você já participa desta competição");
      } else {
        toast.success(`Você entrou na competição "${data.name}"!`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Código ou senha inválidos");
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-competitions"] });
      queryClient.invalidateQueries({ queryKey: ["listed-competitions"] });
      toast.success("Você saiu da competição");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao sair da competição");
    },
  });
}
