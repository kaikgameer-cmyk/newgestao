import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CalendarDays, ChevronDown, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrencyBRL } from "@/lib/format";
import type { DailySummary } from "@/hooks/useCompetitionDashboard";

interface DailyFeedSectionProps {
  dailySummary: DailySummary[] | null;
  isMember: boolean;
}

// Platform colors mapping
const platformColors: Record<string, string> = {
  uber: "bg-black",
  "99": "bg-yellow-500",
  indrive: "bg-green-500",
  "99food": "bg-orange-500",
  ifood: "bg-red-500",
  rappi: "bg-orange-600",
  lalamove: "bg-orange-400",
  loggi: "bg-blue-600",
  default: "bg-primary",
};

function getPlatformColor(key: string): string {
  return platformColors[key.toLowerCase()] || platformColors.default;
}

interface DayItemProps {
  day: DailySummary;
}

function DayItem({ day }: DayItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const date = parseISO(day.date);

  // Group amounts by platform
  const platformTotals = day.by_platform.reduce((acc, item) => {
    const key = item.platform;
    if (!acc[key]) {
      acc[key] = { 
        platform: item.platform, 
        platform_label: item.platform_label, 
        amount: 0 
      };
    }
    acc[key].amount += item.amount;
    return acc;
  }, {} as Record<string, { platform: string; platform_label: string; amount: number }>);

  const platforms = Object.values(platformTotals);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-3 h-auto hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
              <span className="text-sm font-bold">{format(date, "dd")}</span>
            </div>
            <div className="text-left">
              <p className="font-medium">
                {format(date, "EEEE", { locale: ptBR })}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(date, "dd 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-primary">
              {formatCurrencyBRL(day.total_value)}
            </span>
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        <div className="ml-13 pl-6 border-l-2 border-muted space-y-2">
          {platforms.map((item) => (
            <div
              key={item.platform}
              className="flex items-center justify-between py-1"
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getPlatformColor(item.platform)}`} />
                <span className="text-sm">{item.platform_label}</span>
              </div>
              <span className="text-sm font-medium">
                {formatCurrencyBRL(item.amount)}
              </span>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function DailyFeedSection({ dailySummary, isMember }: DailyFeedSectionProps) {
  if (!isMember) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Receitas do Período
          </CardTitle>
          <CardDescription>
            Entre na competição para ver o feed de receitas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Participe para ver suas receitas diárias</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5" />
          Suas Receitas no Período
        </CardTitle>
        <CardDescription>
          Feed de receitas diárias durante a competição
        </CardDescription>
      </CardHeader>
      <CardContent>
        {dailySummary && dailySummary.length > 0 ? (
          <div className="divide-y">
            {dailySummary.map((day) => (
              <DayItem key={day.date} day={day} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Ainda sem receitas no período</p>
            <p className="text-sm mt-1">Registre suas corridas para aparecer aqui</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
