import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
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

export function DayModeSelector({
  startDate,
  endDate,
  onDateRangeChange,
}: DayModeSelectorProps) {
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [tempRange, setTempRange] = React.useState<DateRange | undefined>();
  const [clickCount, setClickCount] = React.useState(0);

  const startDateObj = parseLocalDate(startDate);
  const endDateObj = parseLocalDate(endDate);
  const isSingleDay = startDate === endDate;

  const handleRangeSelect = (range: DateRange | undefined) => {
    if (!range?.from) {
      setTempRange(undefined);
      setClickCount(0);
      return;
    }

    const newClickCount = clickCount + 1;
    setClickCount(newClickCount);

    if (newClickCount === 1) {
      // First click - set single day and close immediately
      const dateStr = formatLocalDate(range.from);
      setTempRange({ from: range.from, to: range.from });
      onDateRangeChange(dateStr, dateStr);
      // Fechar automaticamente após selecionar um dia (modo rápido)
      setCalendarOpen(false);
      setClickCount(0);
    } else if (newClickCount === 2 && range.to) {
      // Second click on different day - set range
      const start = range.from < range.to ? range.from : range.to;
      const end = range.from < range.to ? range.to : range.from;
      setTempRange({ from: start, to: end });
      onDateRangeChange(formatLocalDate(start), formatLocalDate(end));
      setCalendarOpen(false);
      setClickCount(0);
    } else if (newClickCount === 2 && !range.to) {
      // Second click on same day - keep as single day
      const dateStr = formatLocalDate(range.from);
      setTempRange({ from: range.from, to: range.from });
      onDateRangeChange(dateStr, dateStr);
      setCalendarOpen(false);
      setClickCount(0);
    }
  };

  const handleCalendarOpenChange = (open: boolean) => {
    setCalendarOpen(open);
    if (open) {
      setTempRange({ from: startDateObj, to: endDateObj });
      setClickCount(0);
    } else {
      setTempRange(undefined);
      setClickCount(0);
    }
  };

  return (
    <Popover open={calendarOpen} onOpenChange={handleCalendarOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="justify-start text-left font-normal min-w-[180px] sm:min-w-[240px]"
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">
            {isSingleDay ? (
              format(startDateObj, "dd/MM/yyyy", { locale: ptBR })
            ) : (
              <>
                {format(startDateObj, "dd/MM/yyyy", { locale: ptBR })} – {format(endDateObj, "dd/MM/yyyy", { locale: ptBR })}
              </>
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
        <div className="p-3 border-b border-border">
          <p className="text-sm text-muted-foreground">
            Clique em um dia para ver o dia. Clique em outro dia para formar um intervalo.
          </p>
        </div>
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={startDateObj}
          selected={tempRange || { from: startDateObj, to: endDateObj }}
          onSelect={handleRangeSelect}
          numberOfMonths={2}
          locale={ptBR}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
