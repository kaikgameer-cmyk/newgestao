import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { getCompetitionStatus, CompetitionStatus } from "@/lib/competitionUtils";

interface CompetitionHistoryItem {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  goal_value: number;
  prize_value: number;
  status: CompetitionStatus;
  role: string;
  is_competitor: boolean;
  user_score: number;
  is_winner: boolean;
  winner_type?: string;
  position?: number;
}

export function useCompetitionHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["competition-history", user?.id],
    queryFn: async (): Promise<CompetitionHistoryItem[]> => {
      if (!user) return [];

      // Get all competitions where user is a member
      const { data: memberships, error: membershipError } = await supabase
        .from("competition_members")
        .select(`
          role,
          is_competitor,
          competition_id,
          competitions (
            id,
            name,
            start_date,
            end_date,
            goal_value,
            prize_value,
            allow_teams
          )
        `)
        .eq("user_id", user.id);

      if (membershipError) throw membershipError;
      if (!memberships || memberships.length === 0) return [];

      // Get competition results for finished competitions
      const competitionIds = memberships.map((m) => m.competition_id);
      const { data: results } = await supabase
        .from("competition_results")
        .select("*")
        .in("competition_id", competitionIds);

      // Get user's income totals for each competition period
      const history: CompetitionHistoryItem[] = [];

      for (const membership of memberships) {
        const comp = membership.competitions as any;
        if (!comp) continue;

        const statusInfo = getCompetitionStatus(comp.start_date, comp.end_date);
        const result = results?.find((r) => r.competition_id === comp.id);

        // Calculate user's score for this competition
        let userScore = 0;
        if (membership.is_competitor) {
          const { data: incomeData } = await supabase
            .from("income_days")
            .select("id")
            .eq("user_id", user.id)
            .gte("date", comp.start_date)
            .lte("date", comp.end_date);

          if (incomeData && incomeData.length > 0) {
            const { data: items } = await supabase
              .from("income_day_items")
              .select("amount")
              .in("income_day_id", incomeData.map((d) => d.id));

            userScore = items?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
          }
        }

        // Check if user is winner
        let isWinner = false;
        if (result) {
          if (result.winner_type === "individual" && result.winner_user_id === user.id) {
            isWinner = true;
          } else if (result.winner_type === "team" && result.winner_team_id) {
            // Check if user is in winning team
            const { data: teamMembership } = await supabase
              .from("competition_team_members")
              .select("id")
              .eq("team_id", result.winner_team_id)
              .eq("user_id", user.id)
              .maybeSingle();
            isWinner = !!teamMembership;
          }
        }

        history.push({
          id: comp.id,
          name: comp.name,
          start_date: comp.start_date,
          end_date: comp.end_date,
          goal_value: comp.goal_value,
          prize_value: comp.prize_value,
          status: statusInfo.status,
          role: membership.role,
          is_competitor: membership.is_competitor,
          user_score: userScore,
          is_winner: isWinner,
          winner_type: result?.winner_type,
        });
      }

      // Sort by end_date descending (most recent first)
      return history.sort((a, b) => 
        new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
      );
    },
    enabled: !!user,
  });
}
