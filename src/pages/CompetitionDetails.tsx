import { useState, useEffect } from "react";
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
  ArrowLeft,
  Crown,
  Medal,
  Settings,
  LogOut,
  Loader2,
  Gift,
  UserMinus,
  UserPlus,
  Pencil,
  Clock,
} from "lucide-react";
import {
  useCompetition,
  useCompetitionLeaderboard,
  useLeaveCompetition,
  useCreateTeams,
  useAssignMemberToTeam,
  useUnassignMemberFromTeam,
  useUpdateTeamName,
  useFinalizeCompetition,
  useCheckFinishResultPopup,
  useMarkFinishResultPopupShown,
  type LeaderboardTeam,
  type AllMember,
} from "@/hooks/useCompetitions";
import { useAuth } from "@/hooks/useAuth";
import { format, differenceInDays, parseISO, addDays } from "date-fns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCompetitionStatus, getRemainingTime, isCompetitionFinished } from "@/lib/competitionUtils";
import { FinishResultPopup, FinishStatus } from "@/components/competitions/FinishResultPopup";
import { DailyScoresPanel } from "@/components/competitions/DailyScoresPanel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CompetitionDetails() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [copied, setCopied] = useState(false);
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [showManageTeamsModal, setShowManageTeamsModal] = useState(false);
  const [teamCount, setTeamCount] = useState(2);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState("");
  const [showFinishPopup, setShowFinishPopup] = useState(false);
  const [finishInfo, setFinishInfo] = useState<{
    status: FinishStatus;
    payoutValue: number;
    winnerName?: string;
    winnerType?: "team" | "individual" | "none";
  } | null>(null);
  const [showTransparencyDialog, setShowTransparencyDialog] = useState(false);
  const [transparencyChecked, setTransparencyChecked] = useState(false);

  const { data: competition, isLoading: competitionLoading } = useCompetition(code || "");
  const { data: leaderboard, isLoading: leaderboardLoading } = useCompetitionLeaderboard(
    competition?.id
  );
  const { data: members } = useCompetitionMembers(competition?.id);

  // Check if competition is finished before using hooks
  const competitionFinished = competition ? isCompetitionFinished(competition.end_date) : false;
  
  const leaveMutation = useLeaveCompetition();
  const createTeamsMutation = useCreateTeams();
  const assignMutation = useAssignMemberToTeam();
  const unassignMutation = useUnassignMemberFromTeam();
  const updateTeamNameMutation = useUpdateTeamName();
  const finalizeMutation = useFinalizeCompetition();
  const markFinishPopupShownMutation = useMarkFinishResultPopupShown();
  const acceptTransparencyMutation = useAcceptCompetitionTransparency();

  // Check for finish result popup
  const { data: popupCheck } = useCheckFinishResultPopup(competition?.id, competitionFinished);

  // Effect to finalize competition and show winner popup
  useEffect(() => {
    if (competitionFinished && competition?.id && !finalizeMutation.isPending) {
      // Try to finalize (idempotent)
      finalizeMutation.mutate(competition.id);
    }
  }, [competitionFinished, competition?.id]);

  // Effect to show finish result popup when check returns
  useEffect(() => {
    if (popupCheck?.show_popup && popupCheck.status) {
      setFinishInfo({
        status: popupCheck.status,
        payoutValue: popupCheck.payout_value || 0,
        winnerName: popupCheck.winner_name,
        winnerType: popupCheck.winner_type,
      });
      setShowFinishPopup(true);
    }
  }, [popupCheck]);

  const handleCloseFinishPopup = async () => {
    setShowFinishPopup(false);
    if (competition?.id) {
      await markFinishPopupShownMutation.mutateAsync(competition.id);
    }
  };

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
  const endExclusive = addDays(end, 1);
  
  // Use the utility for correct status calculation
  const status = getCompetitionStatus(competition.start_date, competition.end_date);
  const isFinished = isCompetitionFinished(competition.end_date);
  const remaining = getRemainingTime(competition.end_date);

  const totalDays = differenceInDays(end, start) + 1;
  const elapsedDays = Math.max(0, Math.min(differenceInDays(now, start) + 1, totalDays));
  const progressPercent = isFinished ? 100 : (elapsedDays / totalDays) * 100;

  const currentMember = members?.find((m) => m.user_id === user?.id);
  const needsTransparency = !!currentMember && !currentMember.transparency_accepted;

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(competition.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const handleAssignToTeam = async (userId: string, teamId: string) => {
    await assignMutation.mutateAsync({
      competition_id: competition.id,
      team_id: teamId,
      user_id: userId,
    });
  };

  const handleUnassignFromTeam = async (userId: string) => {
    await unassignMutation.mutateAsync({
      competition_id: competition.id,
      user_id: userId,
    });
  };

  const handleStartEditTeamName = (teamId: string, currentName: string) => {
    setEditingTeamId(teamId);
    setEditingTeamName(currentName);
  };

  const handleSaveTeamName = async (teamId: string) => {
    if (editingTeamName.trim().length < 2) {
      return;
    }
    await updateTeamNameMutation.mutateAsync({
      team_id: teamId,
      name: editingTeamName,
      competition_id: competition.id,
    });
    setEditingTeamId(null);
    setEditingTeamName("");
  };

  const handleCancelEditTeamName = () => {
    setEditingTeamId(null);
    setEditingTeamName("");
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-medium">{index + 1}</span>;
  };

  // Get members without a team for manual assignment
  const getMembersWithoutTeam = (): AllMember[] => {
    if (!leaderboard.all_members || !leaderboard.teams) return leaderboard.all_members || [];
    
    const membersInTeams = new Set<string>();
    leaderboard.teams.forEach(team => {
      team.members.forEach(m => membersInTeams.add(m.user_id));
    });
    
    return leaderboard.all_members.filter(m => !membersInTeams.has(m.user_id) && m.is_competitor);
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
        <div className="flex-1 space-y-2">
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
            <p className="text-muted-foreground">{competition.description}</p>
          )}
          {!isHost && needsTransparency && (
            <Alert className="mt-2">
              <AlertTitle>Compromisso de transparência pendente</AlertTitle>
              <AlertDescription className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <span className="text-sm">
                  Para competir de verdade, você precisa aceitar o compromisso de lançar seus
                  resultados com honestidade e transparência.
                </span>
                <Button
                  size="sm"
                  onClick={() => {
                    setTransparencyChecked(false);
                    setShowTransparencyDialog(true);
                  }}
                >
                  Ler e aceitar compromisso
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Meta de Receita</CardDescription>
            <CardTitle className="text-xl flex items-center gap-2">
              <Target className="w-5 h-5 text-muted-foreground" />
              {formatCurrency(competition.goal_value)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Prêmio</CardDescription>
            <CardTitle className="text-xl flex items-center gap-2 text-primary">
              <Gift className="w-5 h-5" />
              {formatCurrency(leaderboard.competition.prize_value || competition.prize_value)}
            </CardTitle>
          </CardHeader>
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
                Dia {elapsedDays} de {totalDays}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Código</CardDescription>
            <CardTitle className="text-lg font-mono tracking-wider">
              {competition.code}
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
            <p className="text-xs text-muted-foreground mt-2">
              Envie o código + senha para convidar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Host Actions */}
      {isHost && competition.allow_teams && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Gerenciar Times
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button onClick={() => setShowTeamsModal(true)} variant="outline">
              Auto Dividir Times
            </Button>
            <Button onClick={() => setShowManageTeamsModal(true)} variant="outline">
              Gerenciar Manualmente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard Tabs */}
      <Tabs defaultValue={leaderboard.teams && leaderboard.teams.length > 0 ? "teams" : "individual"}>
        <TabsList>
          {leaderboard.teams && leaderboard.teams.length > 0 && (
            <TabsTrigger value="teams" className="gap-2">
              <Users className="w-4 h-4" />
              Ranking por Times
            </TabsTrigger>
          )}
          <TabsTrigger value="individual" className="gap-2">
            <Trophy className="w-4 h-4" />
            Ranking Individual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ranking Individual</CardTitle>
              <CardDescription>
                Classificação baseada em receita acumulada
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
                        <p className="text-xs text-muted-foreground">
                          Receita: {formatCurrency(member.total_income)}
                        </p>
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
                <CardDescription>Soma da receita dos membros</CardDescription>
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

      {/* Daily Scores Panel - only show for active or finished competitions */}
      {(status.status === "active" || isFinished) && (() => {
        // Find user's team and count members - only if user is a competitor in a team
        let teamMemberCount = 1;
        
        // Check if user is a competitor
        const userMember = leaderboard.all_members?.find(m => m.user_id === user?.id);
        const isCompetitor = userMember?.is_competitor ?? true;
        
        if (isCompetitor && competition.allow_teams && leaderboard.teams) {
          const userTeam = leaderboard.teams.find(team => 
            team.members.some(m => m.user_id === user?.id)
          );
          if (userTeam) {
            // Only count members that actually exist (have user_id)
            const actualMemberCount = userTeam.members.filter(m => m.user_id).length;
            if (actualMemberCount > 1) {
              teamMemberCount = actualMemberCount;
            }
          }
        }
        
        return (
          <DailyScoresPanel
            startDate={competition.start_date}
            endDate={competition.end_date}
            goalValue={competition.goal_value}
            teamMemberCount={teamMemberCount}
          />
        );
      })()}

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

      {/* Auto Create Teams Modal */}
      <Dialog open={showTeamsModal} onOpenChange={setShowTeamsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Times Automaticamente</DialogTitle>
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
              {leaderboard.members?.length || 0} competidores serão divididos em {teamCount} times
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

      {/* Manual Team Management Modal */}
      <Dialog open={showManageTeamsModal} onOpenChange={setShowManageTeamsModal}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Times Manualmente</DialogTitle>
            <DialogDescription>
              Atribua participantes aos times individualmente
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Members without team */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <UserMinus className="w-4 h-4" />
                Sem Time ({getMembersWithoutTeam().length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {getMembersWithoutTeam().length > 0 ? (
                  getMembersWithoutTeam().map((member) => (
                    <div key={member.user_id} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                      <span className="text-sm">{member.display_name}</span>
                      {leaderboard.teams && leaderboard.teams.length > 0 && (
                        <Select
                          onValueChange={(teamId) => handleAssignToTeam(member.user_id, teamId)}
                        >
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue placeholder="Mover para..." />
                          </SelectTrigger>
                          <SelectContent>
                            {leaderboard.teams.map((team) => (
                              <SelectItem key={team.team_id} value={team.team_id}>
                                {team.team_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Todos os membros estão em times</p>
                )}
              </div>
            </div>

            {/* Teams */}
            {leaderboard.teams && leaderboard.teams.map((team) => (
              <div key={team.team_id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  {editingTeamId === team.team_id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editingTeamName}
                        onChange={(e) => setEditingTeamName(e.target.value)}
                        className="h-8 max-w-[200px]"
                        placeholder="Nome do time"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveTeamName(team.team_id);
                          if (e.key === 'Escape') handleCancelEditTeamName();
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveTeamName(team.team_id)}
                        disabled={editingTeamName.trim().length < 2 || updateTeamNameMutation.isPending}
                      >
                        {updateTeamNameMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEditTeamName}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <h4 className="font-medium flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {team.team_name} ({team.members.filter(m => m.user_id).length})
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleStartEditTeamName(team.team_id, team.team_name)}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </h4>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {team.members.filter(m => m.user_id).map((member) => (
                    <div key={member.user_id} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                      <span className="text-sm">{member.display_name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleUnassignFromTeam(member.user_id)}
                      >
                        <UserMinus className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {(!leaderboard.teams || leaderboard.teams.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum time criado ainda.</p>
                <p className="text-sm mt-1">Use "Auto Dividir Times" para criar os times primeiro.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowManageTeamsModal(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transparência: reabrir termo para membros antigos */}
      {!isHost && needsTransparency && (
        <Dialog open={showTransparencyDialog} onOpenChange={setShowTransparencyDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Compromisso de Transparência</DialogTitle>
              <DialogDescription>
                Antes de competir, confirme seu compromisso de lançar apenas valores reais.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Esta competição é baseada nos lançamentos de receita feitos por você. Para manter
                tudo justo, lance apenas valores reais e seja 100% transparente. Não tente
                manipular resultados — o objetivo aqui é evolução, disciplina e competição
                saudável. Ao participar, você concorda em respeitar as regras e os outros
                participantes.
              </p>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="transparency-accept"
                  checked={transparencyChecked}
                  onCheckedChange={(checked) => setTransparencyChecked(!!checked)}
                />
                <label
                  htmlFor="transparency-accept"
                  className="text-sm leading-snug cursor-pointer select-none"
                >
                  Eu concordo e me comprometo a lançar meus resultados com total honestidade e
                  transparência.
                </label>
              </div>
            </div>
            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowTransparencyDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={!transparencyChecked || acceptTransparencyMutation.isPending}
                onClick={async () => {
                  await acceptTransparencyMutation.mutateAsync(competition.id);
                  setShowTransparencyDialog(false);
                }}
              >
                {acceptTransparencyMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Confirmar e continuar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Finish Result Popup */}
      {finishInfo && (
        <FinishResultPopup
          open={showFinishPopup}
          onClose={handleCloseFinishPopup}
          status={finishInfo.status}
          payoutValue={finishInfo.payoutValue}
          winnerName={finishInfo.winnerName}
          winnerType={finishInfo.winnerType}
        />
      )}
    </div>
  );
}
