import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Target, Gift, Calendar, Copy, Check, Clock, Users } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { getRemainingTime, getCompetitionStatus } from "@/lib/competitionUtils";
import { formatCurrencyBRL } from "@/lib/format";

interface StatsCardsProps {
  goalValue: number;
  prizeValue: number;
  startDate: string;
  endDate: string;
  code: string;
  participantsCount: number;
  maxMembers: number | null;
  isFinished: boolean;
}

export function StatsCards({
  goalValue,
  prizeValue,
  startDate,
  endDate,
  code,
  participantsCount,
  maxMembers,
  isFinished,
}: StatsCardsProps) {
  const [copied, setCopied] = useState(false);
  
  const now = new Date();
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const status = getCompetitionStatus(startDate, endDate);
  const remaining = getRemainingTime(endDate);

  const totalDays = differenceInDays(end, start) + 1;
  const elapsedDays = Math.max(0, Math.min(differenceInDays(now, start) + 1, totalDays));
  const progressPercent = isFinished ? 100 : (elapsedDays / totalDays) * 100;

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Meta de Receita</CardDescription>
          <CardTitle className="text-xl flex items-center gap-2">
            <Target className="w-5 h-5 text-muted-foreground" />
            {formatCurrencyBRL(goalValue)}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Prêmio</CardDescription>
          <CardTitle className="text-xl flex items-center gap-2 text-primary">
            <Gift className="w-5 h-5" />
            {formatCurrencyBRL(prizeValue)}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Período</CardDescription>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            {format(start, "dd/MM", { locale: ptBR })} - {format(end, "dd/MM/yy", { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={progressPercent} className="h-2" />
          {isFinished ? (
            <p className="text-xs text-muted-foreground">Competição encerrada</p>
          ) : status.status === "active" ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>
                {remaining.days > 0 
                  ? `${remaining.days}d ${remaining.hours}h restantes`
                  : `${remaining.hours}h restantes`
                }
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Começa em {format(start, "dd/MM", { locale: ptBR })}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            {participantsCount}{maxMembers ? `/${maxMembers}` : ""} participantes
          </CardDescription>
          <CardTitle className="text-lg font-mono tracking-wider">
            {code}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyCode}
            className="gap-1"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            Copiar Código
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
