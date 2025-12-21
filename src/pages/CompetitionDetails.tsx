import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Trophy,
  Users,
  LogOut,
  Loader2,
  UserMinus,
  Pencil,
  Check,
} from "lucide-react";
import {
  useLeaveCompetition,
  useCreateTeams,
  useAssignMemberToTeam,
  useUnassignMemberFromTeam,
  useUpdateTeamName,
  useCheckFinishResultPopup,
  useMarkFinishResultPopupShown,
} from "@/hooks/useCompetitions";
import { useFinalizeOnce } from "@/hooks/useCompetitionPage";
import { useCompetitionDashboard } from "@/hooks/useCompetitionDashboard";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { isUUID } from "@/lib/utils";

import { FinishResultPopup, FinishStatus } from "@/components/competitions/FinishResultPopup";
import { CompetitionDetailsSkeleton } from "@/components/competitions/CompetitionDetailsSkeleton";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { EditCompetitionModal } from "@/components/competitions/EditCompetitionModal";
import { DeleteCompetitionDialog } from "@/components/competitions/DeleteCompetitionDialog";

import {
  CompetitionHeader,
  StatsCards,
  ProgressSection,
  RankingSection,
  PlatformBreakdownSection,
  DailyFeedSection,
  JoinCTA,
} from "@/components/competitions/details";

export default function CompetitionDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Use ref to ensure finalization runs only ONCE per mount
  const finalizeAttemptedRef = useRef(false);

  // Single RPC call for all page data
  const { data: dashboardData, isLoading, error } = useCompetitionDashboard(id);
  const finalizeMutation = useFinalizeOnce();

  const competition = dashboardData?.competition;
  const viewer = dashboardData?.viewer;
  const totals = dashboardData?.totals;
  const flags = dashboardData?.flags;
  const isHost = viewer?.is_host ?? false;
  const isMember = viewer?.is_member ?? false;

  // Redirect if URL uses code instead of UUID
  useEffect(() => {
    if (id && competition?.id && !isUUID(id)) {
      navigate(`/dashboard/competicoes/${competition.id}`, { replace: true });
    }
  }, [id, competition?.id, navigate]);

  // Finalize competition ONCE when page loads and competition is finished
  useEffect(() => {
    if (
      competition?.id &&
      flags?.is_finalized &&
      !finalizeAttemptedRef.current &&
      !finalizeMutation.isPending
    ) {
      finalizeAttemptedRef.current = true;
      finalizeMutation.mutate(competition.id);
    }
  }, [competition?.id, flags?.is_finalized, finalizeMutation]);

  // Check for finish result popup
  const { data: popupCheck } = useCheckFinishResultPopup(
    competition?.id,
    flags?.is_finalized ?? false
  );
  const markFinishPopupShownMutation = useMarkFinishResultPopupShown();

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

  // Mutations
  const leaveMutation = useLeaveCompetition();
  const createTeamsMutation = useCreateTeams();
  const assignMutation = useAssignMemberToTeam();
  const unassignMutation = useUnassignMemberFromTeam();
  const updateTeamNameMutation = useUpdateTeamName();

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["competition-dashboard", id] });
  }, [queryClient, id]);

  // Loading state
  if (isLoading) {
    return <CompetitionDetailsSkeleton />;
  }

  // Not found state
  if (!competition || error) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Trophy className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Competição não encontrada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              A competição pode ter sido excluída ou você não tem permissão para visualizá-la.
            </p>
            <Button onClick={() => navigate("/dashboard/competicoes")}>
              Voltar para Competições
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isFinished = flags?.is_finalized ?? false;

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
    if (editingTeamName.trim().length < 2) return;
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

  // Get members without a team for manual assignment
  const getMembersWithoutTeam = () => {
    if (!dashboardData?.ranking || !dashboardData?.team_ranking) {
      return dashboardData?.ranking || [];
    }

    const membersInTeams = new Set<string>();
    dashboardData.team_ranking.forEach((team) => {
      team.members.forEach((m) => membersInTeams.add(m.user_id));
    });

    return dashboardData.ranking.filter(
      (m) => !membersInTeams.has(m.user_id) && m.is_competitor
    );
  };

  const handleManageTeams = () => {
    if (!dashboardData?.team_ranking || dashboardData.team_ranking.length === 0) {
      setShowTeamsModal(true);
    } else {
      setShowManageTeamsModal(true);
    }
  };

  return (
    <PullToRefresh onRefresh={handleRefresh} className="h-full">
      <div className="p-4 md:p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <CompetitionHeader
          name={competition.name}
          description={competition.description}
          startDate={competition.start_date}
          endDate={competition.end_date}
          isHost={isHost}
          isMember={isMember}
          isFinished={isFinished}
          allowTeams={competition.allow_teams}
          onEdit={() => setShowEditModal(true)}
          onDelete={() => setShowDeleteDialog(true)}
          onManageTeams={handleManageTeams}
        />

        {/* Stats Cards */}
        <StatsCards
          goalValue={competition.goal_value}
          prizeValue={competition.prize_value}
          startDate={competition.start_date}
          endDate={competition.end_date}
          code={competition.code}
          participantsCount={dashboardData.participants_count}
          maxMembers={competition.max_members}
          isFinished={isFinished}
        />

        {/* Join CTA for non-members */}
        {!isMember && !isHost && (
          <JoinCTA
            code={competition.code}
            isJoinable={flags?.is_joinable ?? false}
            participantsCount={dashboardData.participants_count}
            prizeValue={competition.prize_value}
          />
        )}

        {/* Progress Section - always visible for public info */}
        {totals && (
          <ProgressSection
            totalCompetition={totals.total_competition}
            totalUser={totals.total_user}
            totalUserTeam={totals.total_user_team}
            goalValue={totals.goal_value}
            progressPercent={totals.progress_percent}
            remaining={totals.remaining}
            isMember={isMember}
            allowTeams={competition.allow_teams}
            teamId={viewer?.team_id ?? null}
            result={dashboardData.result}
          />
        )}

        {/* Ranking Section - only for members/host */}
        {(isMember || isHost) && dashboardData.ranking && (
          <RankingSection
            ranking={dashboardData.ranking}
            teamRanking={dashboardData.team_ranking}
            allowTeams={competition.allow_teams}
            currentUserId={user?.id}
            goalValue={competition.goal_value}
          />
        )}

        {/* Platform Breakdown */}
        {(isMember || isHost) && (
          <PlatformBreakdownSection
            platformBreakdown={dashboardData.platform_breakdown}
            userPlatformBreakdown={dashboardData.user_platform_breakdown}
            isMember={isMember}
            allowTeams={competition.allow_teams}
            teamId={viewer?.team_id ?? null}
          />
        )}

        {/* Daily Feed - only for members */}
        {isMember && (
          <DailyFeedSection
            dailySummary={dashboardData.daily_summary}
            isMember={isMember}
          />
        )}

        {/* Leave Competition */}
        {!isHost && isMember && (
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
                max={Math.ceil((dashboardData?.ranking?.length || 2) / 2)}
                value={teamCount}
                onChange={(e) => setTeamCount(Number(e.target.value))}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {dashboardData?.ranking?.length || 0} competidores serão divididos em {teamCount} times
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
                      <div
                        key={member.user_id}
                        className="flex items-center gap-2 p-2 bg-muted rounded-lg"
                      >
                        <span className="text-sm">{member.display_name}</span>
                        {dashboardData?.team_ranking && dashboardData.team_ranking.length > 0 && (
                          <Select
                            onValueChange={(teamId) => handleAssignToTeam(member.user_id, teamId)}
                          >
                            <SelectTrigger className="w-[140px] h-8">
                              <SelectValue placeholder="Mover para..." />
                            </SelectTrigger>
                            <SelectContent>
                              {dashboardData.team_ranking.map((team) => (
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
                    <p className="text-sm text-muted-foreground">
                      Todos os membros estão em times
                    </p>
                  )}
                </div>
              </div>

              {/* Teams */}
              {dashboardData?.team_ranking &&
                dashboardData.team_ranking.map((team) => (
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
                              if (e.key === "Enter") handleSaveTeamName(team.team_id);
                              if (e.key === "Escape") handleCancelEditTeamName();
                            }}
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSaveTeamName(team.team_id)}
                            disabled={
                              editingTeamName.trim().length < 2 ||
                              updateTeamNameMutation.isPending
                            }
                          >
                            {updateTeamNameMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={handleCancelEditTeamName}>
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <h4 className="font-medium flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {team.team_name} ({team.members.filter((m) => m.user_id).length})
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() =>
                              handleStartEditTeamName(team.team_id, team.team_name)
                            }
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                        </h4>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {team.members
                        .filter((m) => m.user_id)
                        .map((member) => (
                          <div
                            key={member.user_id}
                            className="flex items-center gap-2 p-2 bg-muted rounded-lg"
                          >
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

              {(!dashboardData?.team_ranking || dashboardData.team_ranking.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhum time criado ainda.</p>
                  <p className="text-sm mt-1">
                    Use "Auto Dividir Times" para criar os times primeiro.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => setShowManageTeamsModal(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

        {/* Edit Competition Modal */}
        {competition && (
          <EditCompetitionModal
            open={showEditModal}
            onOpenChange={setShowEditModal}
            competition={{
              id: competition.id,
              name: competition.name,
              description: competition.description,
              goal_value: competition.goal_value,
              prize_value: competition.prize_value,
              start_date: competition.start_date,
              end_date: competition.end_date,
              max_members: competition.max_members,
            }}
          />
        )}

        {/* Delete Competition Dialog */}
        {competition && (
          <DeleteCompetitionDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            competitionId={competition.id}
            competitionName={competition.name}
          />
        )}
      </div>
    </PullToRefresh>
  );
}
