import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface RankingEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  wins: number;
  total_prizes: number;
  participations: number;
}

export function useGlobalRanking() {
  return useQuery({
    queryKey: ["global-ranking"],
    queryFn: async (): Promise<RankingEntry[]> => {
      // Get all competition results
      const { data: results, error: resultsError } = await supabase
        .from("competition_results")
        .select(`
          competition_id,
          winner_type,
          winner_user_id,
          winner_team_id,
          winner_score,
          competitions (
            prize_value
          )
        `);

      if (resultsError) throw resultsError;

      // Get all team members for team wins
      const teamWinnerIds = results
        ?.filter((r) => r.winner_type === "team" && r.winner_team_id)
        .map((r) => r.winner_team_id) || [];

      let teamMembers: { team_id: string; user_id: string }[] = [];
      if (teamWinnerIds.length > 0) {
        const { data: members } = await supabase
          .from("competition_team_members")
          .select("team_id, user_id")
          .in("team_id", teamWinnerIds);
        teamMembers = members || [];
      }

      // Get all competition memberships for participation count
      const { data: allMemberships } = await supabase
        .from("competition_members")
        .select("user_id, is_competitor")
        .eq("is_competitor", true);

      // Aggregate wins and prizes per user
      const userStats: Record<string, { wins: number; prizes: number; participations: number }> = {};

      // Count participations
      allMemberships?.forEach((m) => {
        if (!userStats[m.user_id]) {
          userStats[m.user_id] = { wins: 0, prizes: 0, participations: 0 };
        }
        userStats[m.user_id].participations++;
      });

      // Count wins
      results?.forEach((result) => {
        const prize = (result.competitions as any)?.prize_value || 0;

        if (result.winner_type === "individual" && result.winner_user_id) {
          if (!userStats[result.winner_user_id]) {
            userStats[result.winner_user_id] = { wins: 0, prizes: 0, participations: 0 };
          }
          userStats[result.winner_user_id].wins++;
          userStats[result.winner_user_id].prizes += prize;
        } else if (result.winner_type === "team" && result.winner_team_id) {
          // Find team members and split prize
          const members = teamMembers.filter((m) => m.team_id === result.winner_team_id);
          const prizePerMember = members.length > 0 ? prize / members.length : 0;
          
          members.forEach((member) => {
            if (!userStats[member.user_id]) {
              userStats[member.user_id] = { wins: 0, prizes: 0, participations: 0 };
            }
            userStats[member.user_id].wins++;
            userStats[member.user_id].prizes += prizePerMember;
          });
        }
      });

      // Get user IDs that have at least one win or participation
      const userIds = Object.keys(userStats).filter(
        (id) => userStats[id].wins > 0 || userStats[id].participations > 0
      );

      if (userIds.length === 0) return [];

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, name, avatar_url")
        .in("user_id", userIds);

      // Build ranking entries
      const ranking: RankingEntry[] = userIds.map((userId) => {
        const profile = profiles?.find((p) => p.user_id === userId);
        const displayName = profile?.first_name && profile?.last_name
          ? `${profile.first_name} ${profile.last_name}`
          : profile?.name || "Usuário";

        return {
          user_id: userId,
          display_name: displayName,
          avatar_url: profile?.avatar_url || null,
          wins: userStats[userId].wins,
          total_prizes: userStats[userId].prizes,
          participations: userStats[userId].participations,
        };
      });

      // Sort by wins (desc), then by prizes (desc)
      return ranking.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.total_prizes - a.total_prizes;
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
