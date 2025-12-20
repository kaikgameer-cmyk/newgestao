import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Trophy,
  Users,
  Calendar,
  Target,
  Copy,
  Check,
  Link2,
  ArrowLeft,
  Crown,
  Medal,
  Settings,
  LogOut,
  Loader2,
} from "lucide-react";
import {
  useCompetition,
  useCompetitionLeaderboard,
  useLeaveCompetition,
  useCreateTeams,
} from "@/hooks/useCompetitions";
import { useAuth } from "@/hooks/useAuth";
import { format, differenceInDays, isAfter, isBefore, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const goalTypeLabels: Record<string, string> = {
  income_goal: "Meta de Receita",
  expense_limit: "Limite de Gastos",
  saving_goal: "Meta de Economia",
  net_goal: "Meta de Lucro",
};

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CompetitionDetails() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [teamCount, setTeamCount] = useState(2);

  const { data: competition, isLoading: competitionLoading } = useCompetition(code || "");
  const { data: leaderboard, isLoading: leaderboardLoading } = useCompetitionLeaderboard(
    competition?.id
  );
  
  const leaveMutation = useLeaveCompetition();
  const createTeamsMutation = useCreateTeams();

  if (competitionLoading || leaderboardLoading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!competition || !leaderboard) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Trophy className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Competição não encontrada</h3>
            <Button onClick={() => navigate("/dashboard/competicoes")}>
              Voltar para Competições
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isHost = competition.created_by === user?.id;
  const now = new Date();
  const start = parseISO(competition.start_date);
  const end = parseISO(competition.end_date);
  
  const getStatus = () => {
    if (isBefore(now, start)) return { label: "Aguardando", variant: "secondary" as const };
    if (isAfter(now, end)) return { label: "Finalizada", variant: "outline" as const };
    return { label: "Em andamento", variant: "default" as const };
  };

  const status = getStatus();
  const totalDays = differenceInDays(end, start) + 1;
  const elapsedDays = Math.max(0, Math.min(differenceInDays(now, start) + 1, totalDays));
  const progressPercent = (elapsedDays / totalDays) * 100;

  const handleCopy = async (type: "code" | "link") => {
    const textToCopy =
      type === "code"
        ? competition.code
        : `${window.location.origin}/dashboard/competicoes/entrar?code=${competition.code}`;

    await navigator.clipboard.writeText(textToCopy);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleLeave = async () => {
    await leaveMutation.mutateAsync(competition.id);
    navigate("/dashboard/competicoes");
  };

  const handleCreateTeams = async () => {
    await createTeamsMutation.mutateAsync({
      competition_id: competition.id,
      team_count: teamCount,
    });
    setShowTeamsModal(false);
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-medium">{index + 1}</span>;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard/competicoes")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{competition.name}</h1>
            {isHost && (
              <Badge variant="outline" className="text-primary border-primary">
                <Crown className="w-3 h-3 mr-1" />
                Host
              </Badge>
            )}
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          {competition.description && (
            <p className="text-muted-foreground mt-1">{competition.description}</p>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Meta</CardDescription>
            <CardTitle className="text-xl">
              {formatCurrency(competition.goal_value)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">{goalTypeLabels[competition.goal_type]}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Período</CardDescription>
            <CardTitle className="text-lg">
              {format(start, "dd/MM", { locale: ptBR })} - {format(end, "dd/MM/yy", { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Dia {elapsedDays} de {totalDays}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Participantes</CardDescription>
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="w-5 h-5" />
              {leaderboard.members?.length || 0}
              {competition.max_members && (
                <span className="text-muted-foreground font-normal text-sm">
                  / {competition.max_members}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {competition.allow_teams && (
              <Badge variant="outline">
                {leaderboard.teams?.length || 0} times
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Compartilhar</CardDescription>
            <CardTitle className="text-lg font-mono tracking-wider">
              {competition.code}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy("code")}
              className="gap-1"
            >
              {copied === "code" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              Código
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy("link")}
              className="gap-1"
            >
              {copied === "link" ? <Check className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
              Link
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Host Actions */}
      {isHost && competition.allow_teams && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Gerenciar Competição
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowTeamsModal(true)} variant="outline">
              Criar / Redistribuir Times
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard Tabs */}
      <Tabs defaultValue="individual">
        <TabsList>
          <TabsTrigger value="individual" className="gap-2">
            <Trophy className="w-4 h-4" />
            Ranking Individual
          </TabsTrigger>
          {leaderboard.teams && leaderboard.teams.length > 0 && (
            <TabsTrigger value="teams" className="gap-2">
              <Users className="w-4 h-4" />
              Ranking por Times
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="individual" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ranking Individual</CardTitle>
              <CardDescription>
                Classificação baseada em {goalTypeLabels[competition.goal_type].toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboard.members && leaderboard.members.length > 0 ? (
                <div className="space-y-3">
                  {leaderboard.members.map((member, index) => (
                    <div
                      key={member.user_id}
                      className={`flex items-center gap-4 p-3 rounded-lg ${
                        member.user_id === user?.id
                          ? "bg-primary/10 border border-primary/30"
                          : "bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-center w-8">
                        {getRankIcon(index)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {member.display_name}
                          {member.role === "host" && (
                            <Crown className="w-3 h-3 inline ml-1 text-primary" />
                          )}
                        </p>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>Receita: {formatCurrency(member.total_income)}</span>
                          <span>Despesa: {formatCurrency(member.total_expense)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatCurrency(member.score)}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.progress > 0 ? `${member.progress}% da meta` : "—"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum dado de ranking ainda
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {leaderboard.teams && leaderboard.teams.length > 0 && (
          <TabsContent value="teams" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Ranking por Times</CardTitle>
                <CardDescription>Soma dos scores dos membros</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leaderboard.teams.map((team, index) => (
                    <div
                      key={team.team_id}
                      className="p-4 rounded-lg bg-muted/50 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getRankIcon(index)}
                          <span className="font-bold text-lg">{team.team_name}</span>
                        </div>
                        <span className="font-bold text-xl text-primary">
                          {formatCurrency(team.team_score)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {team.members
                          .filter((m) => m.user_id)
                          .map((member) => (
                            <Badge
                              key={member.user_id}
                              variant={member.user_id === user?.id ? "default" : "secondary"}
                            >
                              {member.display_name}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Leave Competition */}
      {!isHost && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2">
              <LogOut className="w-4 h-4" />
              Sair da Competição
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sair da Competição?</AlertDialogTitle>
              <AlertDialogDescription>
                Você perderá seu ranking e progresso. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleLeave} className="bg-destructive">
                {leaveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Sair"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Create Teams Modal */}
      <Dialog open={showTeamsModal} onOpenChange={setShowTeamsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Times</DialogTitle>
            <DialogDescription>
              Os participantes serão distribuídos automaticamente
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="teamCount">Quantidade de Times</Label>
            <Input
              id="teamCount"
              type="number"
              min={2}
              max={Math.ceil((leaderboard.members?.length || 2) / 2)}
              value={teamCount}
              onChange={(e) => setTeamCount(Number(e.target.value))}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {leaderboard.members?.length || 0} participantes serão divididos em {teamCount} times
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTeamsModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTeams} disabled={createTeamsMutation.isPending}>
              {createTeamsMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Criar Times"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
