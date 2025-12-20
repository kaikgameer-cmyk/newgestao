import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { parseLocalDate, formatLocalDate } from "@/lib/dateUtils";
import { useState } from "react";

interface WeekModeSelectorProps {
  startDate: string;
  endDate: string;
  onNavigate: (direction: "prev" | "next") => void;
  onDateChange: (date: string) => void;
}

export function WeekModeSelector({
  startDate,
  endDate,
  onNavigate,
  onDateChange,
}: WeekModeSelectorProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const startDateObj = parseLocalDate(startDate);
  const endDateObj = parseLocalDate(endDate);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onDateChange(formatLocalDate(date));
      setCalendarOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onNavigate("prev")}
        className="h-9 w-9"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="justify-center text-center font-normal min-w-[200px] sm:min-w-[240px]"
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span>
              {format(startDateObj, "dd/MM", { locale: ptBR })} -{" "}
              {format(endDateObj, "dd/MM/yyyy", { locale: ptBR })}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center" sideOffset={4}>
          <div className="p-3 border-b border-border">
            <p className="text-sm text-muted-foreground">
              Selecione qualquer dia para ir à semana correspondente
            </p>
          </div>
          <Calendar
            initialFocus
            mode="single"
            defaultMonth={startDateObj}
            selected={startDateObj}
            onSelect={handleDateSelect}
            locale={ptBR}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon"
        onClick={() => onNavigate("next")}
        className="h-9 w-9"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
