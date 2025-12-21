import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Inbox } from "lucide-react";
import { usePlatforms } from "@/hooks/usePlatforms";

interface PlatformData {
  name: string;
  total: number;
}

interface PlatformBreakdownCardProps {
  revenues: Array<{ app: string; amount: number }>;
}

export function PlatformBreakdownCard({ revenues }: PlatformBreakdownCardProps) {
  const { platforms } = usePlatforms();

  // Group by platform label coming from revenues
  const platformData = revenues.reduce((acc, r) => {
    const platformName = r.app || "Outros";
    if (!acc[platformName]) {
      acc[platformName] = { total: 0 };
    }
    acc[platformName].total += Number(r.amount);
    return acc;
  }, {} as Record<string, { total: number }>);

  const platformsList: PlatformData[] = Object.entries(platformData)
    .map(([name, data]) => ({
      name,
      total: data.total,
    }))
    .sort((a, b) => b.total - a.total);

  const totalRevenue = platformsList.reduce((sum, p) => sum + p.total, 0);

  const getColorForPlatform = (name: string): string => {
    const normalized = name.toLowerCase();

    // Tenta casar primeiro com o slug (key)
    const byKey = platforms.find((p) => p.key.toLowerCase() === normalized);
    if (byKey?.color) return byKey.color;

    // Depois tenta pelo nome amigável salvo
    const byName = platforms.find((p) => p.name.toLowerCase() === normalized);
    if (byName?.color) return byName.color;

    // Fallback para dados antigos
    return "#FFC700";
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
            <p className="text-sm text-muted-foreground">
              Nenhuma receita neste dia
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Platform cards in a grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {platformsList.map((platform) => {
                const percentage = totalRevenue > 0 ? (platform.total / totalRevenue) * 100 : 0;
                return (
                  <div
                    key={platform.name}
                    className="p-3 rounded-lg bg-secondary/30 border border-border space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: getColorForPlatform(platform.name) }}
                      />
                      <span className="font-medium capitalize text-sm truncate">{platform.name}</span>
                    </div>
                    <p className="text-lg font-bold">
                      R$ {platform.total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {percentage.toFixed(0)}% do total
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div className="pt-3 border-t border-border flex justify-between items-center">
              <span className="text-sm font-medium">Total do dia</span>
              <span className="font-bold text-lg text-primary">
                R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
