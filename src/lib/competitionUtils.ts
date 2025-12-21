import { parseISO, addDays, isBefore, isAfter } from "date-fns";

// Timezone: America/Sao_Paulo
// Competition is active until 23:59:59 of end_date

export type CompetitionStatus = "upcoming" | "active" | "finished";

export interface CompetitionStatusInfo {
  status: CompetitionStatus;
  label: string;
  variant: "secondary" | "default" | "outline";
}

/**
 * Calculate competition status based on start_date and end_date
 * The competition is active until 23:59:59 of end_date (i.e., until 00:00:00 of end_date + 1)
 */
export function getCompetitionStatus(startDate: string, endDate: string): CompetitionStatusInfo {
  const now = new Date();
  const start = parseISO(startDate);
  // End exclusive = midnight of the day after end_date
  const endExclusive = addDays(parseISO(endDate), 1);
  
  if (isBefore(now, start)) {
    return {
      status: "upcoming",
      label: "Em breve",
      variant: "secondary",
    };
  }
  
  if (isAfter(now, endExclusive) || now >= endExclusive) {
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
 */
export function isCompetitionFinished(endDate: string): boolean {
  const now = new Date();
  const endExclusive = addDays(parseISO(endDate), 1);
  return now >= endExclusive;
}

/**
 * Get remaining time for active competition
 */
export function getRemainingTime(endDate: string): { days: number; hours: number; finished: boolean } {
  const now = new Date();
  const endExclusive = addDays(parseISO(endDate), 1);
  
  if (now >= endExclusive) {
    return { days: 0, hours: 0, finished: true };
  }
  
  const diffMs = endExclusive.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffHours / 24);
  const hours = diffHours % 24;
  
  return { days, hours, finished: false };
}
