import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { PieChart, User, Users } from "lucide-react";
import { formatCurrencyBRL } from "@/lib/format";
import type { PlatformBreakdown } from "@/hooks/useCompetitionDashboard";

interface PlatformBreakdownSectionProps {
  platformBreakdown: PlatformBreakdown[] | null;
  userPlatformBreakdown: PlatformBreakdown[] | null;
  isMember: boolean;
  allowTeams: boolean;
  teamId: string | null;
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

function PlatformList({ breakdown }: { breakdown: PlatformBreakdown[] }) {
  if (!breakdown || breakdown.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <PieChart className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p>Nenhuma receita registrada no período</p>
      </div>
    );
  }

  const maxValue = breakdown[0]?.total_value || 1;

  return (
    <div className="space-y-3">
      {breakdown.map((platform) => (
        <div key={platform.platform_key} className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getPlatformColor(platform.platform_key)}`} />
              <span className="font-medium text-sm">{platform.platform_name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{platform.percent}%</span>
              <span className="font-medium">{formatCurrencyBRL(platform.total_value)}</span>
            </div>
          </div>
          <Progress 
            value={(platform.total_value / maxValue) * 100} 
            className="h-2" 
          />
        </div>
      ))}
    </div>
  );
}

export function PlatformBreakdownSection({
  platformBreakdown,
  userPlatformBreakdown,
  isMember,
  allowTeams,
  teamId,
}: PlatformBreakdownSectionProps) {
  const [activeTab, setActiveTab] = useState("competition");

  // If not a member, only show competition total
  if (!isMember) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Receita por Plataforma
          </CardTitle>
          <CardDescription>
            Distribuição das receitas por plataforma no período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlatformList breakdown={platformBreakdown || []} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="w-5 h-5" />
          Receita por Plataforma
        </CardTitle>
        <CardDescription>
          Distribuição das receitas por plataforma no período
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="competition" className="gap-2">
              <Users className="w-4 h-4" />
              Total Competição
            </TabsTrigger>
            <TabsTrigger value="user" className="gap-2">
              <User className="w-4 h-4" />
              Minha Receita
            </TabsTrigger>
          </TabsList>

          <TabsContent value="competition">
            <PlatformList breakdown={platformBreakdown || []} />
          </TabsContent>

          <TabsContent value="user">
            <PlatformList breakdown={userPlatformBreakdown || []} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
