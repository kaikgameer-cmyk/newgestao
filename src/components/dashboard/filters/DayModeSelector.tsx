import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { parseLocalDate, formatLocalDate } from "@/lib/dateUtils";

interface DayModeSelectorProps {
  startDate: string;
  endDate: string;
  onDateRangeChange: (start: string, end: string) => void;
}

/**
 * DayModeSelector - Seletor de data com comportamento inteligente:
 * 
 * - Primeiro clique: define start (end fica null aguardando segundo clique)
 * - Segundo clique no MESMO dia: seleciona apenas aquele dia e fecha
 * - Segundo clique em dia DIFERENTE: define range [start, end] e fecha
 * - Clique em dia ANTES do start: faz swap automático
 * - Botão "Limpar": volta para "hoje"
 */
export function DayModeSelector({
  startDate,
  endDate,
  onDateRangeChange,
}: DayModeSelectorProps) {
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  
  // State machine: null = nenhuma seleção, { from, to: undefined } = aguardando segundo clique
  const [pendingRange, setPendingRange] = React.useState<DateRange | undefined>(undefined);
  const [lastClickedDate, setLastClickedDate] = React.useState<Date | null>(null);
  const lastClickTimeRef = React.useRef<number>(0);

  const startDateObj = parseLocalDate(startDate);
  const endDateObj = parseLocalDate(endDate);
  const isSingleDay = startDate === endDate;

  // Reset state when popover opens
  const handleOpenChange = (open: boolean) => {
    setCalendarOpen(open);
    if (open) {
      // Initialize with current selection
      setPendingRange({ from: startDateObj, to: endDateObj });
      setLastClickedDate(null);
      lastClickTimeRef.current = 0;
    } else {
      setPendingRange(undefined);
      setLastClickedDate(null);
    }
  };

  const handleSelect = (range: DateRange | undefined) => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    
    if (!range?.from) {
      // Reset selection
      setPendingRange(undefined);
      setLastClickedDate(null);
      return;
    }

    const clickedDate = range.to || range.from;
    const isDoubleClickSameDay = lastClickedDate && 
      format(lastClickedDate, "yyyy-MM-dd") === format(clickedDate, "yyyy-MM-dd") &&
      timeSinceLastClick < 500;

    // Update refs
    lastClickTimeRef.current = now;
    setLastClickedDate(clickedDate);

    // Case A: Double-click on same day - select single day and close
    if (isDoubleClickSameDay) {
      const dateStr = formatLocalDate(clickedDate);
      onDateRangeChange(dateStr, dateStr);
      setCalendarOpen(false);
      return;
    }

    // Case B: First click OR starting new selection
    if (!pendingRange?.from || (pendingRange.from && pendingRange.to)) {
      // Start new selection
      setPendingRange({ from: range.from, to: undefined });
      return;
    }

    // Case C: Second click - complete range
    if (pendingRange.from && !pendingRange.to && range.to) {
      // Range was completed by react-day-picker
      let finalStart = range.from;
      let finalEnd = range.to;
      
      // Ensure start <= end (swap if needed)
      if (finalStart > finalEnd) {
        [finalStart, finalEnd] = [finalEnd, finalStart];
      }
      
      const startStr = formatLocalDate(finalStart);
      const endStr = formatLocalDate(finalEnd);
      
      onDateRangeChange(startStr, endStr);
      setCalendarOpen(false);
      return;
    }

    // Case D: Click defines the end
    if (pendingRange.from) {
      let finalStart = pendingRange.from;
      let finalEnd = range.from;
      
      // Swap if needed
      if (finalStart > finalEnd) {
        [finalStart, finalEnd] = [finalEnd, finalStart];
      }
      
      const startStr = formatLocalDate(finalStart);
      const endStr = formatLocalDate(finalEnd);
      
      setPendingRange({ from: finalStart, to: finalEnd });
      onDateRangeChange(startStr, endStr);
      setCalendarOpen(false);
    }
  };

  // Handle day click for double-click detection
  const handleDayClick = (day: Date) => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    
    // Detect double-click on same day
    if (lastClickedDate && 
        format(lastClickedDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd") &&
        timeSinceLastClick < 400) {
      // Double-click: select single day and close
      const dateStr = formatLocalDate(day);
      onDateRangeChange(dateStr, dateStr);
      setCalendarOpen(false);
      return;
    }

    lastClickTimeRef.current = now;
    setLastClickedDate(day);
  };

  // Clear filter - reset to today
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = formatLocalDate(new Date());
    onDateRangeChange(today, today);
    setCalendarOpen(false);
  };

  // Display value
  const displayValue = isSingleDay
    ? format(startDateObj, "dd/MM/yyyy", { locale: ptBR })
    : `${format(startDateObj, "dd/MM/yyyy", { locale: ptBR })} – ${format(endDateObj, "dd/MM/yyyy", { locale: ptBR })}`;

  return (
    <Popover open={calendarOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="justify-start text-left font-normal min-w-[180px] sm:min-w-[240px] group"
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate flex-1">{displayValue}</span>
          {!isSingleDay && (
            <X 
              className="ml-1 h-4 w-4 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" 
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
        <div className="p-3 border-b border-border space-y-2">
          <p className="text-sm text-muted-foreground">
            Clique 2x no mesmo dia para selecionar apenas ele.
            <br />
            Ou clique em dois dias diferentes para um intervalo.
          </p>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs"
            onClick={handleClear}
          >
            <X className="w-3 h-3 mr-1" />
            Limpar (voltar para hoje)
          </Button>
        </div>
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={startDateObj}
          selected={pendingRange || { from: startDateObj, to: endDateObj }}
          onSelect={handleSelect}
          onDayClick={handleDayClick}
          numberOfMonths={2}
          locale={ptBR}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
