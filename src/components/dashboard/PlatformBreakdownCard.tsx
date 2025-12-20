import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Inbox } from "lucide-react";

interface PlatformData {
  name: string;
  count: number;
  total: number;
}

interface PlatformBreakdownCardProps {
  revenues: Array<{ app: string; amount: number }>;
}

// Known platforms with their colors
const KNOWN_PLATFORMS = ["uber", "99", "indrive", "99pop", "uber eats", "ifood", "rappi"];

export function PlatformBreakdownCard({ revenues }: PlatformBreakdownCardProps) {
  // Group by platform
  const platformData = revenues.reduce((acc, r) => {
    const platform = r.app || "Outros";
    if (!acc[platform]) {
      acc[platform] = { count: 0, total: 0 };
    }
    acc[platform].count += 1;
    acc[platform].total += Number(r.amount);
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  const platforms: PlatformData[] = Object.entries(platformData)
    .map(([name, data]) => ({
      name,
      count: data.count,
      total: data.total,
    }))
    .sort((a, b) => b.total - a.total);

  const totalRevenue = platforms.reduce((sum, p) => sum + p.total, 0);

  // Color mapping for common platforms
  const platformColors: Record<string, string> = {
    uber: "bg-[#000000]",
    "99": "bg-[#FFB800]",
    indrive: "bg-[#2DCC70]",
    "99pop": "bg-[#FFB800]",
    "uber eats": "bg-[#06C167]",
    ifood: "bg-[#EA1D2C]",
    rappi: "bg-[#FF441F]",
  };

  const getColorForPlatform = (name: string): string => {
    const normalized = name.toLowerCase();
    return platformColors[normalized] || "bg-primary";
  };

  // Build list of all platforms (known + any extras that have data)
  const allPlatformNames = [...new Set([...KNOWN_PLATFORMS.slice(0, 4), ...platforms.map(p => p.name.toLowerCase())])];

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
              {platforms.map((platform) => {
                const percentage = totalRevenue > 0 ? (platform.total / totalRevenue) * 100 : 0;
                return (
                  <div
                    key={platform.name}
                    className="p-3 rounded-lg bg-secondary/30 border border-border space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${getColorForPlatform(platform.name)}`} />
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
