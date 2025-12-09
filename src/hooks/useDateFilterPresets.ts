import { useMemo } from "react";
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";
import { formatLocalDate } from "@/lib/dateUtils";

/**
 * Presets de filtro de data disponíveis
 * - today: Apenas hoje
 * - yesterday: Apenas ontem
 * - last7days: Últimos 7 dias (incluindo hoje)
 * - last30days: Últimos 30 dias (incluindo hoje)
 * - thisMonth: Mês atual completo
 * - custom: Intervalo customizado
 */
export type DatePreset = "today" | "yesterday" | "last7days" | "last30days" | "thisMonth" | "custom";

export interface DatePresetOption {
  value: DatePreset;
  label: string;
}

export const DATE_PRESET_OPTIONS: DatePresetOption[] = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "last7days", label: "Últimos 7 dias" },
  { value: "last30days", label: "Últimos 30 dias" },
  { value: "thisMonth", label: "Este mês" },
  { value: "custom", label: "Personalizado" },
];

/**
 * Calcula o DateRange baseado no preset selecionado
 * Usa a data atual como referência
 */
export function getDateRangeFromPreset(preset: DatePreset): DateRange {
  const now = new Date();
  
  switch (preset) {
    case "today":
      return {
        from: startOfDay(now),
        to: endOfDay(now),
      };
    case "yesterday":
      const yesterday = subDays(now, 1);
      return {
        from: startOfDay(yesterday),
        to: endOfDay(yesterday),
      };
    case "last7days":
      return {
        from: startOfDay(subDays(now, 6)), // 6 dias atrás + hoje = 7 dias
        to: endOfDay(now),
      };
    case "last30days":
      return {
        from: startOfDay(subDays(now, 29)), // 29 dias atrás + hoje = 30 dias
        to: endOfDay(now),
      };
    case "thisMonth":
      return {
        from: startOfMonth(now),
        to: endOfMonth(now),
      };
    case "custom":
    default:
      // Default to current month
      return {
        from: startOfMonth(now),
        to: endOfMonth(now),
      };
  }
}

/**
 * Hook que fornece utilities para filtros de data
 * Centraliza a lógica de cálculo para evitar duplicação
 */
export function useDateFilterPresets(preset: DatePreset, customRange?: DateRange) {
  const dateRange = useMemo(() => {
    if (preset === "custom" && customRange?.from) {
      return customRange;
    }
    return getDateRangeFromPreset(preset);
  }, [preset, customRange]);

  // Formata as datas para queries do Supabase (yyyy-MM-dd)
  const formattedRange = useMemo(() => {
    return {
      from: dateRange.from ? formatLocalDate(dateRange.from) : "",
      to: dateRange.to ? formatLocalDate(dateRange.to) : "",
    };
  }, [dateRange]);

  return {
    dateRange,
    formattedRange,
    presetOptions: DATE_PRESET_OPTIONS,
  };
}
