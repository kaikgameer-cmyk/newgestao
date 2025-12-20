import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car } from "lucide-react";

interface PlatformData {
  name: string;
  count: number;
  total: number;
}

interface PlatformBreakdownCardProps {
  revenues: Array<{ app: string; amount: number }>;
}

export function PlatformBreakdownCard({ revenues }: PlatformBreakdownCardProps) {
  if (revenues.length === 0) {
    return null;
  }

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

  return (
    <Card variant="elevated">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Car className="w-4 h-4 text-primary" />
          Receita por Plataforma
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {platforms.map((platform) => {
          const percentage = totalRevenue > 0 ? (platform.total / totalRevenue) * 100 : 0;
          return (
            <div key={platform.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${getColorForPlatform(platform.name)}`} />
                  <span className="font-medium capitalize">{platform.name}</span>
                  <span className="text-muted-foreground text-xs">
                    ({platform.count} {platform.count === 1 ? "corrida" : "corridas"})
                  </span>
                </div>
                <span className="font-bold">
                  R$ {platform.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${getColorForPlatform(platform.name)}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}

        <div className="pt-3 mt-3 border-t border-border flex justify-between">
          <span className="text-sm font-medium">Total</span>
          <span className="font-bold text-primary">
            R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
