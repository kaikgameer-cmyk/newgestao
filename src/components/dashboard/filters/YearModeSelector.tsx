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

interface YearModeSelectorProps {
  startDate: string;
  onNavigate: (direction: "prev" | "next") => void;
  onYearChange: (year: number) => void;
}

export function YearModeSelector({
  startDate,
  onNavigate,
  onYearChange,
}: YearModeSelectorProps) {
  const startDateObj = parseLocalDate(startDate);
  const currentYear = startDateObj.getFullYear();

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

      <Select
        value={currentYear.toString()}
        onValueChange={(value) => onYearChange(parseInt(value))}
      >
        <SelectTrigger className="w-[120px]">
          <CalendarIcon className="mr-2 h-4 w-4" />
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
