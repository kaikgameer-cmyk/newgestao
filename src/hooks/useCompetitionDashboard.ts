import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { isUUID } from "@/lib/utils";

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
    goal_value: number;
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
      if (!idOrCode) return null;

      const competitionId = await resolveCompetitionId(idOrCode);
      if (!competitionId) return null;

      const { data, error } = await supabase.rpc("get_competition_dashboard", {
        p_competition_id: competitionId,
      });

      if (error) {
        console.error("get_competition_dashboard error:", error);
        throw error;
      }
      
      return data as unknown as CompetitionDashboardData | null;
    },
    enabled: !!user && !!idOrCode,
    staleTime: 30000, // 30s cache
    retry: 1,
  });
}
