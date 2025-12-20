import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseLocalDate } from "@/lib/dateUtils";

interface MonthModeSelectorProps {
  startDate: string;
  onNavigate: (direction: "prev" | "next") => void;
  onMonthChange: (year: number, month: number) => void;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function MonthModeSelector({
  startDate,
  onNavigate,
  onMonthChange,
}: MonthModeSelectorProps) {
  const startDateObj = parseLocalDate(startDate);
  const currentYear = startDateObj.getFullYear();
  const currentMonth = startDateObj.getMonth();

  // Generate years from 2020 to current year + 1
  const currentYearNum = new Date().getFullYear();
  const years = Array.from({ length: currentYearNum - 2019 }, (_, i) => 2020 + i);
  if (!years.includes(currentYearNum + 1)) {
    years.push(currentYearNum + 1);
  }

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

      <div className="flex items-center gap-2">
        <Select
          value={currentMonth.toString()}
          onValueChange={(value) => onMonthChange(currentYear, parseInt(value))}
        >
          <SelectTrigger className="w-[130px]">
            <CalendarIcon className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((month, index) => (
              <SelectItem key={index} value={index.toString()}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentYear.toString()}
          onValueChange={(value) => onMonthChange(parseInt(value), currentMonth)}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
