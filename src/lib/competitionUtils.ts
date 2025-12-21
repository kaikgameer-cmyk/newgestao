import { parseISO, addDays, isBefore } from "date-fns";
import { toZonedTime } from "date-fns-tz";

// Timezone: America/Sao_Paulo
// Competition is active until 23:59:59 of end_date in Sao Paulo timezone

const SAO_PAULO_TZ = "America/Sao_Paulo";

export type CompetitionStatus = "upcoming" | "active" | "finished";

export interface CompetitionStatusInfo {
  status: CompetitionStatus;
  label: string;
  variant: "secondary" | "default" | "outline";
}

/**
 * Get the end exclusive timestamp for a competition in Sao Paulo timezone
 * Competition ends at 00:00:00 of end_date + 1 in America/Sao_Paulo
 */
function getEndExclusiveInSaoPaulo(endDate: string): Date {
  // Parse the end_date as a date string (YYYY-MM-DD)
  const endDateParsed = parseISO(endDate);
  // Add 1 day to get the exclusive end (00:00 of next day)
  const nextDay = addDays(endDateParsed, 1);
  // Create a date at midnight in Sao Paulo timezone
  // We need to create the timestamp that represents 00:00 in Sao Paulo
  const year = nextDay.getFullYear();
  const month = nextDay.getMonth();
  const day = nextDay.getDate();
  
  // Create a date string for midnight in Sao Paulo and convert it
  const midnightSaoPauloStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`;
  
  // Parse as if it's Sao Paulo time (add 3 hours offset for UTC, or use proper conversion)
  // Sao Paulo is UTC-3 (standard) or UTC-2 (daylight saving, but Brazil doesn't use DST since 2019)
  // To be safe, we compare the current time in Sao Paulo timezone
  return new Date(midnightSaoPauloStr + "-03:00");
}

/**
 * Get current time in Sao Paulo timezone for comparison
 */
function getNowInSaoPaulo(): Date {
  return toZonedTime(new Date(), SAO_PAULO_TZ);
}

/**
 * Calculate competition status based on start_date and end_date
 * The competition is active until 23:59:59 of end_date in America/Sao_Paulo timezone
 */
export function getCompetitionStatus(startDate: string, endDate: string): CompetitionStatusInfo {
  const now = new Date();
  const nowSaoPaulo = getNowInSaoPaulo();
  
  // Parse dates - these are DATE only (YYYY-MM-DD), treat as Sao Paulo dates
  const startDateParsed = parseISO(startDate);
  const startYear = startDateParsed.getFullYear();
  const startMonth = startDateParsed.getMonth();
  const startDay = startDateParsed.getDate();
  
  // Start time is 00:00 of start_date in Sao Paulo
  const startSaoPauloStr = `${startYear}-${String(startMonth + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}T00:00:00-03:00`;
  const startExclusive = new Date(startSaoPauloStr);
  
  // End exclusive is 00:00 of end_date + 1 in Sao Paulo
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
 * Get status label for "Minhas" tab (user's competitions)
 */
export function getMyCompetitionStatusLabel(startDate: string, endDate: string): { label: string; variant: "secondary" | "default" | "outline" } {
  const status = getCompetitionStatus(startDate, endDate);
  
  if (status.status === "upcoming") {
    return { label: "Aguardando início", variant: "secondary" };
  }
  if (status.status === "active") {
    return { label: "Em andamento", variant: "default" };
  }
  return { label: "Finalizada", variant: "outline" };
}

/**
 * Get status label for "Disponíveis" tab (listed competitions)
 */
export function getAvailableCompetitionStatusLabel(startDate: string, endDate: string): { label: string; variant: "secondary" | "default" | "outline" } {
  const status = getCompetitionStatus(startDate, endDate);
  
  if (status.status === "upcoming") {
    return { label: "Participe agora", variant: "secondary" };
  }
  if (status.status === "active") {
    return { label: "Em andamento", variant: "default" };
  }
  return { label: "Finalizada", variant: "outline" };
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
