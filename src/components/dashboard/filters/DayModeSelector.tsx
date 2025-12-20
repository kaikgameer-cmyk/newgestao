import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DayPreset, DAY_PRESET_OPTIONS } from "@/hooks/useDashboardFilter";
import { parseLocalDate, formatLocalDate } from "@/lib/dateUtils";

interface DayModeSelectorProps {
  startDate: string;
  endDate: string;
  currentPreset: DayPreset;
  onPresetChange: (preset: DayPreset) => void;
  onDateRangeChange: (start: string, end: string) => void;
}

export function DayModeSelector({
  startDate,
  endDate,
  currentPreset,
  onPresetChange,
  onDateRangeChange,
}: DayModeSelectorProps) {
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [tempRange, setTempRange] = React.useState<DateRange | undefined>();

  const startDateObj = parseLocalDate(startDate);
  const endDateObj = parseLocalDate(endDate);
  const isSingleDay = startDate === endDate;

  const currentLabel = DAY_PRESET_OPTIONS.find((o) => o.value === currentPreset)?.label || "Período";

  const handlePresetClick = (preset: DayPreset) => {
    if (preset === "custom") {
      setTempRange({ from: startDateObj, to: endDateObj });
      setCalendarOpen(true);
    } else {
      onPresetChange(preset);
    }
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    setTempRange(range);

    // When both dates are selected, apply and close
    if (range?.from && range?.to) {
      onDateRangeChange(formatLocalDate(range.from), formatLocalDate(range.to));
      setCalendarOpen(false);
    } else if (range?.from && !range?.to) {
      // Single click - could be selecting single day
      // We'll wait for the second click
    }
  };

  const handleCalendarOpenChange = (open: boolean) => {
    setCalendarOpen(open);
    if (!open) {
      // If closing with only start selected, treat as single day
      if (tempRange?.from && !tempRange?.to) {
        const dateStr = formatLocalDate(tempRange.from);
        onDateRangeChange(dateStr, dateStr);
      }
      setTempRange(undefined);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Preset Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 min-w-[130px] justify-between">
            <span className="truncate">{currentLabel}</span>
            <ChevronDown className="w-4 h-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44 bg-popover">
          {DAY_PRESET_OPTIONS.filter((o) => o.value !== "custom").map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handlePresetClick(option.value)}
              className={cn(
                "cursor-pointer",
                currentPreset === option.value && "bg-primary/10 text-primary"
              )}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handlePresetClick("custom")}
            className={cn(
              "cursor-pointer",
              currentPreset === "custom" && "bg-primary/10 text-primary"
            )}
          >
            Personalizado...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Date Display / Picker */}
      <Popover open={calendarOpen} onOpenChange={handleCalendarOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="justify-start text-left font-normal min-w-[180px] sm:min-w-[220px]"
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">
              {isSingleDay ? (
                format(startDateObj, "dd/MM/yyyy", { locale: ptBR })
              ) : (
                <>
                  {format(startDateObj, "dd/MM/yy", { locale: ptBR })} -{" "}
                  {format(endDateObj, "dd/MM/yy", { locale: ptBR })}
                </>
              )}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
          <div className="p-3 border-b border-border">
            <p className="text-sm text-muted-foreground">
              {tempRange?.from && !tempRange?.to
                ? "Selecione a data final (ou clique na mesma data para dia único)"
                : "Selecione uma data ou intervalo"}
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
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
