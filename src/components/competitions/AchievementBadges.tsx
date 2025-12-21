import { Trophy, Medal, Star, Award, Crown, Flame, Target, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  color: string;
}

interface AchievementBadgesProps {
  wins: number;
  participations: number;
  totalPrizes: number;
  compact?: boolean;
}

export function AchievementBadges({ wins, participations, totalPrizes, compact = false }: AchievementBadgesProps) {
  const achievements: Achievement[] = [
    {
      id: "first_win",
      name: "Primeira Vitória",
      description: "Venceu sua primeira competição",
      icon: <Trophy className="h-4 w-4" />,
      unlocked: wins >= 1,
      color: "text-yellow-500",
    },
    {
      id: "triple_crown",
      name: "Tricampeão",
      description: "Venceu 3 competições",
      icon: <Crown className="h-4 w-4" />,
      unlocked: wins >= 3,
      color: "text-amber-400",
    },
    {
      id: "five_star",
      name: "Cinco Estrelas",
      description: "Venceu 5 competições",
      icon: <Star className="h-4 w-4" />,
      unlocked: wins >= 5,
      color: "text-orange-400",
    },
    {
      id: "champion",
      name: "Campeão",
      description: "Venceu 10 competições",
      icon: <Award className="h-4 w-4" />,
      unlocked: wins >= 10,
      color: "text-purple-500",
    },
    {
      id: "legend",
      name: "Lenda",
      description: "Venceu 25 competições",
      icon: <Flame className="h-4 w-4" />,
      unlocked: wins >= 25,
      color: "text-red-500",
    },
    {
      id: "active_player",
      name: "Jogador Ativo",
      description: "Participou de 5 competições",
      icon: <Target className="h-4 w-4" />,
      unlocked: participations >= 5,
      color: "text-blue-500",
    },
    {
      id: "veteran",
      name: "Veterano",
      description: "Participou de 15 competições",
      icon: <Medal className="h-4 w-4" />,
      unlocked: participations >= 15,
      color: "text-teal-500",
    },
    {
      id: "big_earner",
      name: "Grande Ganhador",
      description: "Acumulou R$ 1.000 em prêmios",
      icon: <Zap className="h-4 w-4" />,
      unlocked: totalPrizes >= 1000,
      color: "text-green-500",
    },
  ];

  const unlockedAchievements = achievements.filter((a) => a.unlocked);

  if (unlockedAchievements.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex gap-0.5">
          {unlockedAchievements.slice(0, 3).map((achievement) => (
            <Tooltip key={achievement.id}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "p-1 rounded-full bg-muted/50",
                    achievement.color
                  )}
                >
                  {achievement.icon}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                <p className="font-semibold">{achievement.name}</p>
                <p className="text-xs text-muted-foreground">{achievement.description}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {unlockedAchievements.length > 3 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-1 rounded-full bg-muted/50 text-muted-foreground text-xs font-medium flex items-center justify-center min-w-[24px]">
                  +{unlockedAchievements.length - 3}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">
                  {unlockedAchievements.slice(3).map((a) => a.name).join(", ")}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-2">
        {achievements.map((achievement) => (
          <Tooltip key={achievement.id}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "p-2 rounded-lg border transition-all",
                  achievement.unlocked
                    ? `${achievement.color} bg-muted/50 border-current/20`
                    : "text-muted-foreground/30 bg-muted/20 border-muted/20 grayscale"
                )}
              >
                {achievement.icon}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px]">
              <p className="font-semibold">{achievement.name}</p>
              <p className="text-xs text-muted-foreground">{achievement.description}</p>
              {!achievement.unlocked && (
                <p className="text-xs text-muted-foreground/70 mt-1 italic">Bloqueada</p>
              )}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
