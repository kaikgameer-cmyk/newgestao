import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { isUUID } from "@/lib/utils";
import { isCompetitionPlatformAllowed } from "@/lib/competitionUtils";

// Types for the competition dashboard RPC response
export interface CompetitionDashboardData {
  competition: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    goal_type: string;
    goal_value: number;
    prize_value: number;
    start_date: string;
    end_date: string;
    max_members: number | null;
    allow_teams: boolean;
    team_size: number | null;
    host_user_id: string;
    host_participates: boolean;
  };
  viewer: {
    is_host: boolean;
    is_member: boolean;
    team_id: string | null;
  };
  totals: {
    total_competition: number;
    total_user: number;
    total_user_team: number;
    // Meta individual definida pelo host (por participante)
    goal_value: number;
    // Meta total dinâmica (meta individual × participantes ativos)
    total_goal_value: number;
    progress_percent: number;
    remaining: number;
  };
  result: {
    meta_reached: boolean;
    winner_user_id: string | null;
    winner_team_id: string | null;
    winner_name: string | null;
    winner_score: number;
  } | null;
  ranking: RankingMember[] | null;
  team_ranking: TeamRanking[] | null;
  platform_breakdown: PlatformBreakdown[] | null;
  user_platform_breakdown: PlatformBreakdown[] | null;
  daily_summary: DailySummary[] | null;
  participants_count: number;
  flags: {
    is_started: boolean;
    is_finalized: boolean;
    is_joinable: boolean;
  };
}

export interface RankingMember {
  user_id: string;
  display_name: string;
  role: string;
  is_competitor: boolean;
  total_income: number;
  progress: number;
}

export interface TeamRanking {
  team_id: string;
  team_name: string;
  team_score: number;
  members: { user_id: string; display_name: string }[];
}

export interface PlatformBreakdown {
  platform_key: string;
  platform_name: string;
  total_value: number;
  percent: number;
}

export interface DailySummary {
  date: string;
  total_value: number;
  by_platform: {
    platform: string;
    platform_label: string;
    amount: number;
  }[];
}

// Resolve ID from code if needed
async function resolveCompetitionId(idOrCode: string): Promise<string | null> {
  if (isUUID(idOrCode)) {
    return idOrCode;
  }
  
  // Fallback: resolve code to ID
  const { data, error } = await supabase.rpc("get_competition_id_by_code", {
    p_code: idOrCode,
  });
  
  if (error || !data) return null;
  return data as string;
}

// Main hook for competition dashboard - single RPC call
export function useCompetitionDashboard(idOrCode: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["competition-dashboard", idOrCode],
    queryFn: async (): Promise<CompetitionDashboardData | null> => {
      console.log("[useCompetitionDashboard] Starting query", { idOrCode, userId: user?.id });

      if (!idOrCode) {
        console.warn("[useCompetitionDashboard] No id/code provided");
        return null;
      }

      const competitionId = await resolveCompetitionId(idOrCode);
      console.log("[useCompetitionDashboard] Resolved ID", { idOrCode, competitionId });

      if (!competitionId) {
        console.warn("[useCompetitionDashboard] Could not resolve competition ID");
        return null;
      }

      const { data, error } = await supabase.rpc("get_competition_dashboard", {
        p_competition_id: competitionId,
      });

      console.log("[useCompetitionDashboard] RPC response", { 
        data: !!data, 
        error,
        errorCode: error?.code,
        errorMessage: error?.message,
        errorDetails: error?.details 
      });

      if (error) {
        console.error("[useCompetitionDashboard] RPC error", error);
        throw error;
      }

      const raw = data as unknown as CompetitionDashboardData | null;
      if (!raw) return null;

      // Filter revenues to only allowed platforms (99, Uber, InDrive) for all
      // competition-related aggregates used in the UI.
      const filterAndRecalcPlatformBreakdown = (
        items: PlatformBreakdown[] | null,
      ): PlatformBreakdown[] | null => {
        if (!items) return null;
        const filtered = items.filter((item) =>
          isCompetitionPlatformAllowed(item.platform_name || item.platform_key),
        );
        const total = filtered.reduce((sum, item) => sum + item.total_value, 0);
        return filtered.map((item) => ({
          ...item,
          percent: total > 0 ? Number(((item.total_value / total) * 100).toFixed(1)) : 0,
        }));
      };

      const filteredPlatformBreakdown = filterAndRecalcPlatformBreakdown(
        raw.platform_breakdown,
      );
      const filteredUserPlatformBreakdown = filterAndRecalcPlatformBreakdown(
        raw.user_platform_breakdown,
      );

      const filteredDailySummary: DailySummary[] | null = raw.daily_summary
        ? raw.daily_summary
            .map((day) => {
              const allowedItems = day.by_platform.filter((item) =>
                isCompetitionPlatformAllowed(item.platform_label || item.platform),
              );
              const total = allowedItems.reduce((sum, item) => sum + item.amount, 0);
              return {
                ...day,
                by_platform: allowedItems,
                total_value: total,
              };
            })
            .filter((day) => day.total_value > 0)
        : null;

      const totalCompetition = filteredPlatformBreakdown
        ? filteredPlatformBreakdown.reduce((sum, item) => sum + item.total_value, 0)
        : raw.totals.total_competition;

      const totalUser = filteredUserPlatformBreakdown
        ? filteredUserPlatformBreakdown.reduce((sum, item) => sum + item.total_value, 0)
        : raw.totals.total_user;

      // Meta individual é o valor definido pelo host na competição
      const individualGoal = raw.competition.goal_value;
      // Meta total dinâmica: meta individual × participantes ativos
      const totalGoal = individualGoal * (raw.participants_count || 0);

      const progressPercent = totalGoal > 0 ? (totalCompetition / totalGoal) * 100 : 0;
      const remaining = Math.max(totalGoal - totalCompetition, 0);

      return {
        ...raw,
        platform_breakdown: filteredPlatformBreakdown,
        user_platform_breakdown: filteredUserPlatformBreakdown,
        daily_summary: filteredDailySummary,
        totals: {
          ...raw.totals,
          total_competition: totalCompetition,
          total_user: totalUser,
          goal_value: individualGoal,
          total_goal_value: totalGoal,
          progress_percent: progressPercent,
          remaining,
        },
      };
    },
    enabled: !!user && !!idOrCode,
    staleTime: 30000, // 30s cache
    retry: 1,
  });
}
