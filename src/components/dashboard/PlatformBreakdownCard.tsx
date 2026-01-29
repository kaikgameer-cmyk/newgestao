import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Inbox } from "lucide-react";
import { usePlatforms } from "@/hooks/usePlatforms";
import { formatCurrencyBRL, formatPercent, roundCurrency } from "@/lib/format";

interface PlatformData {
  name: string;
  total: number;
  trips: number;
}

interface PlatformBreakdownCardProps {
  revenues: Array<{ app: string; amount: number; trips?: number }>;
}

export function PlatformBreakdownCard({ revenues }: PlatformBreakdownCardProps) {
  const { platforms } = usePlatforms();

  const platformData = revenues.reduce((acc, r) => {
    const platformName = r.app || "Outros";
    if (!acc[platformName]) {
      acc[platformName] = { total: 0, trips: 0 };
    }
    acc[platformName].total += Number(r.amount);
    acc[platformName].trips += r.trips || 0;
    return acc;
  }, {} as Record<string, { total: number; trips: number }>);

  const platformsList: PlatformData[] = Object.entries(platformData)
    .map(([name, data]) => ({
      name,
      total: data.total,
      trips: data.trips,
    }))
    .sort((a, b) => b.total - a.total);
  
  const totalTrips = platformsList.reduce((sum, p) => sum + p.trips, 0);

  const totalRevenue = platformsList.reduce((sum, p) => sum + p.total, 0);

  const getPlatformInfo = (name: string) => {
    const normalized = name.toLowerCase();

    const byKey = platforms.find((p) => p.key.toLowerCase() === normalized);
    if (byKey) return { color: byKey.color, key: byKey.key };

    const byName = platforms.find((p) => p.name.toLowerCase() === normalized);
    if (byName) return { color: byName.color, key: byName.key };

    return { color: "#2563eb", key: name };
  };

  return (
    <Card variant="elevated">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Car className="w-4 h-4 text-primary" />
          Receita por Plataforma
        </CardTitle>
      </CardHeader>
      <CardContent>
        {revenues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
              <Inbox className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhuma receita neste dia</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {platformsList.map((platform) => {
                const percentage = totalRevenue > 0 ? (platform.total / totalRevenue) * 100 : 0;
                const platformInfo = getPlatformInfo(platform.name);
                return (
                  <div
                    key={platform.name}
                    className="p-3 rounded-lg bg-secondary/30 border border-border space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full border border-border"
                        style={{ backgroundColor: platformInfo.color }}
                      />
                      <span className="font-medium capitalize text-sm break-words">
                        {platform.name}
                      </span>
                    </div>
                    <p className="text-lg font-bold">
                      {formatCurrencyBRL(platform.total)}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Car className="w-3 h-3" />
                        {platform.trips > 0 ? platform.trips : "—"}
                      </span>
                      <span>{formatPercent(percentage, 0)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-border flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Total do dia</span>
                {totalTrips > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Car className="w-3 h-3" />
                    {totalTrips} corrida{totalTrips !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <span className="font-bold text-lg text-primary">
                {formatCurrencyBRL(totalRevenue)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
