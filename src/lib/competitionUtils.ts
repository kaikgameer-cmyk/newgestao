import { parseISO, addDays, isBefore } from "date-fns";

// Timezone: America/Sao_Paulo
// Competition is active until 23:59:59 of end_date in Sao Paulo timezone
// NOTE: For the Competitions page, status calculation is done in the backend RPC for consistency
// This file provides helper functions for remaining time calculations and legacy status checks

export type CompetitionStatus = "upcoming" | "active" | "finished";

export interface CompetitionStatusInfo {
  status: CompetitionStatus;
  label: string;
  variant: "secondary" | "default" | "outline";
}

/**
 * Get the end exclusive timestamp for a competition in Sao Paulo timezone
 * Competition ends at 00:00:00 of end_date + 1 in America/Sao_Paulo
 * Sao Paulo is UTC-3 (Brazil no longer uses DST since 2019)
 */
function getEndExclusiveInSaoPaulo(endDate: string): Date {
  const endDateParsed = parseISO(endDate);
  const nextDay = addDays(endDateParsed, 1);
  const year = nextDay.getFullYear();
  const month = nextDay.getMonth();
  const day = nextDay.getDate();
  
  // Create a date string for midnight in Sao Paulo (UTC-3)
  const midnightSaoPauloStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00-03:00`;
  return new Date(midnightSaoPauloStr);
}

/**
 * Get start timestamp for a competition in Sao Paulo timezone
 */
function getStartInSaoPaulo(startDate: string): Date {
  const startDateParsed = parseISO(startDate);
  const year = startDateParsed.getFullYear();
  const month = startDateParsed.getMonth();
  const day = startDateParsed.getDate();
  
  const midnightSaoPauloStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00-03:00`;
  return new Date(midnightSaoPauloStr);
}

/**
 * Calculate competition status based on start_date and end_date
 * The competition is active until 23:59:59 of end_date in America/Sao_Paulo timezone
 * NOTE: For the main Competitions page, use the computed_status from the RPC instead
 */
export function getCompetitionStatus(startDate: string, endDate: string): CompetitionStatusInfo {
  const now = new Date();
  const startExclusive = getStartInSaoPaulo(startDate);
  const endExclusive = getEndExclusiveInSaoPaulo(endDate);
  
  if (isBefore(now, startExclusive)) {
    return {
      status: "upcoming",
      label: "Em breve",
      variant: "secondary",
    };
  }
  
  if (now >= endExclusive) {
    return {
      status: "finished",
      label: "Finalizada",
      variant: "outline",
    };
  }
  
  return {
    status: "active",
    label: "Em andamento",
    variant: "default",
  };
}

/**
 * Check if competition has finished (for triggering finalization)
 * Uses Sao Paulo timezone for accurate comparison
 */
export function isCompetitionFinished(endDate: string): boolean {
  const now = new Date();
  const endExclusive = getEndExclusiveInSaoPaulo(endDate);
  return now >= endExclusive;
}

/**
 * Get remaining time for active competition
 * Uses Sao Paulo timezone for accurate end time
 */
export function getRemainingTime(endDate: string): { days: number; hours: number; finished: boolean } {
  const now = new Date();
  const endExclusive = getEndExclusiveInSaoPaulo(endDate);
  
  if (now >= endExclusive) {
    return { days: 0, hours: 0, finished: true };
  }
  
  const diffMs = endExclusive.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffHours / 24);
  const hours = diffHours % 24;
  
  return { days, hours, finished: false };
}
