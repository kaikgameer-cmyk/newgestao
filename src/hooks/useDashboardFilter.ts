import { useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addYears,
  subYears,
} from "date-fns";
import { formatLocalDate, parseLocalDate } from "@/lib/dateUtils";

// Modes for the dashboard filter
export type DashboardFilterMode = "day" | "week" | "month" | "year";

// Schema for URL validation
const dashboardFilterSchema = z.object({
  mode: z.enum(["day", "week", "month", "year"]).catch("day"),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).catch(formatLocalDate(new Date())),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).catch(formatLocalDate(new Date())),
});

// Quick preset types for day mode
export type DayPreset = "today" | "yesterday" | "last3" | "last7" | "last30" | "custom";

export interface DayPresetOption {
  value: DayPreset;
  label: string;
}

export const DAY_PRESET_OPTIONS: DayPresetOption[] = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "last3", label: "Últimos 3 dias" },
  { value: "last7", label: "Últimos 7 dias" },
  { value: "last30", label: "Últimos 30 dias" },
  { value: "custom", label: "Personalizado" },
];

function getTodayString(): string {
  return formatLocalDate(new Date());
}

function getDefaultRange(mode: DashboardFilterMode): { start: string; end: string } {
  const today = new Date();
  
  switch (mode) {
    case "day":
      const todayStr = formatLocalDate(today);
      return { start: todayStr, end: todayStr };
    
    case "week":
      // Week starts on Monday - default to PREVIOUS week (not current)
      const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
      const prevWeekStart = subDays(currentWeekStart, 7);
      const prevWeekEnd = subDays(currentWeekStart, 1); // Day before current week starts
      return { 
        start: formatLocalDate(prevWeekStart), 
        end: formatLocalDate(prevWeekEnd) 
      };
    
    case "month":
      return { 
        start: formatLocalDate(startOfMonth(today)), 
        end: formatLocalDate(endOfMonth(today)) 
      };
    
    case "year":
      return { 
        start: formatLocalDate(startOfYear(today)), 
        end: formatLocalDate(endOfYear(today)) 
      };
  }
}

/**
 * Hook to manage dashboard filter state with URL persistence
 * Works with date strings (YYYY-MM-DD) to avoid timezone issues
 */
export function useDashboardFilter() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse and validate URL params
  const { mode, startDate, endDate } = useMemo(() => {
    const rawMode = searchParams.get("mode") || "day";
    const rawStart = searchParams.get("start") || "";
    const rawEnd = searchParams.get("end") || "";

    // Validate with Zod
    const parsed = dashboardFilterSchema.safeParse({
      mode: rawMode,
      start: rawStart,
      end: rawEnd,
    });

    if (parsed.success) {
      // Validate start <= end
      if (parsed.data.start > parsed.data.end) {
        const defaults = getDefaultRange(parsed.data.mode as DashboardFilterMode);
        return {
          mode: parsed.data.mode as DashboardFilterMode,
          startDate: defaults.start,
          endDate: defaults.end,
        };
      }
      return {
        mode: parsed.data.mode as DashboardFilterMode,
        startDate: parsed.data.start,
        endDate: parsed.data.end,
      };
    }

    // Invalid params, use defaults
    const defaults = getDefaultRange("day");
    return {
      mode: "day" as DashboardFilterMode,
      startDate: defaults.start,
      endDate: defaults.end,
    };
  }, [searchParams]);

  // Update URL params
  const updateFilter = useCallback(
    (newMode: DashboardFilterMode, newStart: string, newEnd: string) => {
      setSearchParams(
        (prev) => {
          prev.set("mode", newMode);
          prev.set("start", newStart);
          prev.set("end", newEnd);
          return prev;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Change mode and set appropriate defaults
  const setMode = useCallback(
    (newMode: DashboardFilterMode) => {
      const defaults = getDefaultRange(newMode);
      updateFilter(newMode, defaults.start, defaults.end);
    },
    [updateFilter]
  );

  // Set date range (for day mode or custom selection)
  const setDateRange = useCallback(
    (start: string, end: string) => {
      updateFilter(mode, start, end);
    },
    [mode, updateFilter]
  );

  // Apply a day preset
  const applyDayPreset = useCallback(
    (preset: DayPreset) => {
      const today = new Date();
      let start: string;
      let end: string;

      switch (preset) {
        case "today":
          start = end = formatLocalDate(today);
          break;
        case "yesterday":
          const yesterday = subDays(today, 1);
          start = end = formatLocalDate(yesterday);
          break;
        case "last3":
          start = formatLocalDate(subDays(today, 2));
          end = formatLocalDate(today);
          break;
        case "last7":
          start = formatLocalDate(subDays(today, 6));
          end = formatLocalDate(today);
          break;
        case "last30":
          start = formatLocalDate(subDays(today, 29));
          end = formatLocalDate(today);
          break;
        default:
          return; // custom - do nothing, user picks
      }

      updateFilter("day", start, end);
    },
    [updateFilter]
  );

  // Navigate to previous/next period
  const navigatePeriod = useCallback(
    (direction: "prev" | "next") => {
      const startDateObj = parseLocalDate(startDate);
      const delta = direction === "next" ? 1 : -1;

      let newStart: Date;
      let newEnd: Date;

      switch (mode) {
        case "week":
          const weekFn = direction === "next" ? addWeeks : subWeeks;
          newStart = weekFn(startDateObj, 1);
          newEnd = endOfWeek(newStart, { weekStartsOn: 1 });
          newStart = startOfWeek(newStart, { weekStartsOn: 1 });
          break;

        case "month":
          const monthFn = direction === "next" ? addMonths : subMonths;
          newStart = monthFn(startDateObj, 1);
          newEnd = endOfMonth(newStart);
          newStart = startOfMonth(newStart);
          break;

        case "year":
          const yearFn = direction === "next" ? addYears : subYears;
          newStart = yearFn(startDateObj, 1);
          newEnd = endOfYear(newStart);
          newStart = startOfYear(newStart);
          break;

        default:
          return;
      }

      updateFilter(mode, formatLocalDate(newStart), formatLocalDate(newEnd));
    },
    [mode, startDate, updateFilter]
  );

  // Set month (for month mode)
  const setMonth = useCallback(
    (year: number, month: number) => {
      const date = new Date(year, month, 1);
      const start = formatLocalDate(startOfMonth(date));
      const end = formatLocalDate(endOfMonth(date));
      updateFilter("month", start, end);
    },
    [updateFilter]
  );

  // Set year (for year mode)
  const setYear = useCallback(
    (year: number) => {
      const date = new Date(year, 0, 1);
      const start = formatLocalDate(startOfYear(date));
      const end = formatLocalDate(endOfYear(date));
      updateFilter("year", start, end);
    },
    [updateFilter]
  );

  // Determine current preset for day mode
  const currentDayPreset = useMemo((): DayPreset => {
    if (mode !== "day") return "custom";
    
    const today = formatLocalDate(new Date());
    const yesterday = formatLocalDate(subDays(new Date(), 1));
    const last3Start = formatLocalDate(subDays(new Date(), 2));
    const last7Start = formatLocalDate(subDays(new Date(), 6));
    const last30Start = formatLocalDate(subDays(new Date(), 29));

    if (startDate === today && endDate === today) return "today";
    if (startDate === yesterday && endDate === yesterday) return "yesterday";
    if (startDate === last3Start && endDate === today) return "last3";
    if (startDate === last7Start && endDate === today) return "last7";
    if (startDate === last30Start && endDate === today) return "last30";
    
    return "custom";
  }, [mode, startDate, endDate]);

  // Check if it's a single day selection
  const isSingleDay = startDate === endDate;

  return {
    mode,
    startDate,
    endDate,
    isSingleDay,
    currentDayPreset,
    setMode,
    setDateRange,
    applyDayPreset,
    navigatePeriod,
    setMonth,
    setYear,
  };
}
