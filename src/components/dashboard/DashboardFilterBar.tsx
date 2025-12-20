import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DashboardFilterMode, 
  DayPreset,
  DAY_PRESET_OPTIONS,
  useDashboardFilter 
} from "@/hooks/useDashboardFilter";
import { DayModeSelector } from "./filters/DayModeSelector";
import { WeekModeSelector } from "./filters/WeekModeSelector";
import { MonthModeSelector } from "./filters/MonthModeSelector";
import { YearModeSelector } from "./filters/YearModeSelector";

interface DashboardFilterBarProps {
  filter: ReturnType<typeof useDashboardFilter>;
}

const MODE_LABELS: Record<DashboardFilterMode, string> = {
  day: "Diário",
  week: "Semanal",
  month: "Mensal",
  year: "Anual",
};

export function DashboardFilterBar({ filter }: DashboardFilterBarProps) {
  const {
    mode,
    startDate,
    endDate,
    currentDayPreset,
    setMode,
    setDateRange,
    applyDayPreset,
    navigatePeriod,
    setMonth,
    setYear,
  } = filter;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      {/* Mode Selector Tabs */}
      <Tabs 
        value={mode} 
        onValueChange={(v) => setMode(v as DashboardFilterMode)}
        className="w-full sm:w-auto"
      >
        <TabsList className="grid grid-cols-4 w-full sm:w-auto">
          {(["day", "week", "month", "year"] as DashboardFilterMode[]).map((m) => (
            <TabsTrigger key={m} value={m} className="text-xs sm:text-sm">
              {MODE_LABELS[m]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Date Selector based on mode */}
      <div className="flex-1">
        {mode === "day" && (
          <DayModeSelector
            startDate={startDate}
            endDate={endDate}
            currentPreset={currentDayPreset}
            onPresetChange={applyDayPreset}
            onDateRangeChange={setDateRange}
          />
        )}
        {mode === "week" && (
          <WeekModeSelector
            startDate={startDate}
            endDate={endDate}
            onNavigate={navigatePeriod}
            onDateChange={(date) => {
              // When a date is selected, derive the week
              const d = new Date(date + "T12:00:00");
              const dayOfWeek = d.getDay();
              const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
              const monday = new Date(d);
              monday.setDate(d.getDate() + diff);
              const sunday = new Date(monday);
              sunday.setDate(monday.getDate() + 6);
              
              const formatDate = (dt: Date) => {
                const year = dt.getFullYear();
                const month = String(dt.getMonth() + 1).padStart(2, '0');
                const day = String(dt.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
              };
              
              setDateRange(formatDate(monday), formatDate(sunday));
            }}
          />
        )}
        {mode === "month" && (
          <MonthModeSelector
            startDate={startDate}
            onNavigate={navigatePeriod}
            onMonthChange={setMonth}
          />
        )}
        {mode === "year" && (
          <YearModeSelector
            startDate={startDate}
            onNavigate={navigatePeriod}
            onYearChange={setYear}
          />
        )}
      </div>
    </div>
  );
}
