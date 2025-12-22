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

export type RankingPeriod = "all" | "last_30_days" | "this_month" | "this_year";

interface GlobalRankingTotals {
  totalWins: number;
  totalPrizes: number;
  totalParticipations: number;
  totalCompetitors: number;
  totalCompetitionsFinished: number;
  uniqueWinners: number;
}

export interface GlobalRankingData {
  entries: RankingEntry[];
  totals: GlobalRankingTotals;
}

function getPeriodRange(period: RankingPeriod): { startDate: string | null; endDate: string | null } {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);

  if (period === "last_30_days") {
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 30);
    return { startDate: startDate.toISOString().slice(0, 10), endDate: end };
  }

  if (period === "this_month") {
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: startDate.toISOString().slice(0, 10), endDate: end };
  }

  if (period === "this_year") {
    const startDate = new Date(now.getFullYear(), 0, 1);
    return { startDate: startDate.toISOString().slice(0, 10), endDate: end };
  }

  return { startDate: null, endDate: null };
}

export function useGlobalRanking(period: RankingPeriod = "all") {
  return useQuery<GlobalRankingData>({
    queryKey: ["global-ranking", period],
    queryFn: async () => {
      const { startDate, endDate } = getPeriodRange(period);

      // Get all competition results (only finalized competitions)
      let resultsQuery = supabase
        .from("competition_results")
        .select(
          `
          competition_id,
          winner_type,
          winner_user_id,
          winner_team_id,
          winner_score,
          meta_reached,
          competitions (
            end_date,
            prize_value
          )
        `
        );

      if (startDate && endDate) {
        resultsQuery = resultsQuery
          .gte("competitions.end_date", startDate)
          .lte("competitions.end_date", endDate);
      }

      const { data: results, error: resultsError } = await resultsQuery;
      if (resultsError) throw resultsError;

      // Get all competition memberships for participation count (only competitors in competitions within range)
      let membersQuery = supabase
        .from("competition_members")
        .select("user_id, is_competitor, competitions!inner(end_date)")
        .eq("is_competitor", true);

      if (startDate && endDate) {
        membersQuery = membersQuery
          .gte("competitions.end_date", startDate)
          .lte("competitions.end_date", endDate);
      }

      const { data: allMemberships } = await membersQuery;

      // Get all team members for team wins
      const teamWinnerIds =
        results
          ?.filter((r: any) => r.winner_type === "team" && r.winner_team_id)
          .map((r: any) => r.winner_team_id) || [];

      let teamMembers: { team_id: string; user_id: string }[] = [];
      if (teamWinnerIds.length > 0) {
        const { data: members } = await supabase
          .from("competition_team_members")
          .select("team_id, user_id")
          .in("team_id", teamWinnerIds as string[]);
        teamMembers = members || [];
      }

      // Aggregate wins and prizes per user
      const userStats: Record<string, { wins: number; prizes: number; participations: number }> = {};

      // Count participations
      allMemberships?.forEach((m: any) => {
        if (!userStats[m.user_id]) {
          userStats[m.user_id] = { wins: 0, prizes: 0, participations: 0 };
        }
        userStats[m.user_id].participations++;
      });

      // Count wins
      results?.forEach((result: any) => {
        const comp = result.competitions as any;
        const prize = comp?.prize_value || 0;

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

      if (userIds.length === 0) {
        return {
          entries: [],
          totals: {
            totalWins: 0,
            totalPrizes: 0,
            totalParticipations: 0,
            totalCompetitors: 0,
            totalCompetitionsFinished: 0,
            uniqueWinners: 0,
          },
        };
      }

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, name, avatar_url")
        .in("user_id", userIds);

      // Build ranking entries
      const ranking: RankingEntry[] = userIds.map((userId) => {
        const profile = profiles?.find((p: any) => p.user_id === userId);
        const displayName =
          profile?.first_name && profile?.last_name
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
      const sorted = ranking.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.total_prizes - a.total_prizes;
      });

      const totals: GlobalRankingTotals = sorted.reduce(
        (acc, entry) => ({
          totalWins: acc.totalWins + entry.wins,
          totalPrizes: acc.totalPrizes + entry.total_prizes,
          totalParticipations: acc.totalParticipations + entry.participations,
          totalCompetitors: sorted.length,
          totalCompetitionsFinished: new Set((results || []).map((r: any) => r.competition_id)).size,
          uniqueWinners: sorted.filter((r) => r.wins > 0).length,
        }),
        {
          totalWins: 0,
          totalPrizes: 0,
          totalParticipations: 0,
          totalCompetitors: sorted.length,
          totalCompetitionsFinished: new Set((results || []).map((r: any) => r.competition_id)).size,
          uniqueWinners: sorted.filter((r) => r.wins > 0).length,
        }
      );

      return {
        entries: sorted,
        totals,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
