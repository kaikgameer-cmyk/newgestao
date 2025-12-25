import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Inbox } from "lucide-react";
import { PlatformRevenue } from "@/hooks/useRevenueByPlatform";
import { usePlatforms } from "@/hooks/usePlatforms";

interface PeriodPlatformBreakdownCardProps {
  platformRevenues: PlatformRevenue[];
  totalRevenue: number;
  isLoading?: boolean;
}

export function PeriodPlatformBreakdownCard({
  platformRevenues,
  totalRevenue,
  isLoading,
}: PeriodPlatformBreakdownCardProps) {
  const { platforms } = usePlatforms();

  const getPlatformInfo = (key: string) => {
    const platform = platforms.find((p) => p.key === key);
    return {
      color: platform?.color || "#2563eb",
      key: platform?.key || key,
    };
  };

  const getDisplayName = (revenue: PlatformRevenue): string => {
    if (revenue.platform_key === "other" && revenue.platform_label) {
      return revenue.platform_label;
    }
    return revenue.platform_name;
  };

  if (isLoading) {
    return (
      <Card variant="elevated" className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="w-4 h-4 text-primary" />
            Faturamento por Plataforma
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Car className="w-4 h-4 text-primary" />
          Faturamento por Plataforma
        </CardTitle>
      </CardHeader>
      <CardContent>
        {platformRevenues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
              <Inbox className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Sem receitas no período</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              {platformRevenues.map((revenue, index) => {
                const percentage = totalRevenue > 0 ? (revenue.total_amount / totalRevenue) * 100 : 0;
                const platformInfo = getPlatformInfo(revenue.platform_key);
                return (
                  <div
                    key={`${revenue.platform_key}-${revenue.platform_label || index}`}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30 border border-border"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="inline-block h-3 w-3 rounded-full border border-border"
                        style={{ backgroundColor: platformInfo.color }}
                      />
                      <span className="font-medium text-sm break-words">
                        {getDisplayName(revenue)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">
                        R$ {revenue.total_amount.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {percentage.toFixed(0)}% • {revenue.total_trips} viagens
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-border flex justify-between items-center">
              <span className="text-sm font-medium">Total do período</span>
              <span className="font-bold text-lg text-primary">
                R$ {totalRevenue.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
