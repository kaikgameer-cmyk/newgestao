import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Plus, Trophy, Users, Calendar, Target, LogIn, Gift, Crown, CheckCircle, Bell, Medal, Trash2 } from "lucide-react";
import { useCompetitionsForTabs } from "@/hooks/useCompetitions";
import { useUnreadHostNotifications, useMarkNotificationRead, useDismissNotification, HostNotification } from "@/hooks/useNotifications";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import JoinCompetitionModal from "@/components/competitions/JoinCompetitionModal";
import CreateCompetitionModal from "@/components/competitions/CreateCompetitionModal";
import HostPayoutNotification from "@/components/competitions/HostPayoutNotification";
import { GlobalRankingModal } from "@/components/competitions/GlobalRankingModal";
import { getRemainingTime, getTimeUntilStart } from "@/lib/competitionUtils";
import { useAuth } from "@/hooks/useAuth";
import { CompetitionSkeletonGrid } from "@/components/competitions/CompetitionCardSkeleton";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useQueryClient } from "@tanstack/react-query";
import { DeleteCompetitionDialog } from "@/components/competitions/DeleteCompetitionDialog";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Competitions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [activeTab, setActiveTab] = useState("disponiveis");
  const [currentNotification, setCurrentNotification] = useState<HostNotification | null>(null);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(() => {
    const stored = sessionStorage.getItem("dismissed_notifications");
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const [deleteModalCompetition, setDeleteModalCompetition] = useState<{
    id: string;
    name: string;
  } | null>(null);
  
  const queryClient = useQueryClient();
  const { data: competitions, isLoading } = useCompetitionsForTabs();
  const { data: unreadNotifications } = useUnreadHostNotifications();
  const markReadMutation = useMarkNotificationRead();
  const dismissMutation = useDismissNotification();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["competitions-for-tabs"] });
    await queryClient.invalidateQueries({ queryKey: ["unread-host-notifications"] });
  };

  // Competições ativas do usuário (excluindo finalizadas)
  const myCompetitions = useMemo(() => 
    (competitions || []).filter((comp) => comp.computed_status === "mine" && comp.computed_label !== "Finalizada"),
    [competitions]
  );
  
  // Competições disponíveis para entrar
  const activeListedCompetitions = useMemo(() =>
    (competitions || []).filter((comp) => comp.computed_status === "available"),
    [competitions]
  );
  
  // Todas as competições finalizadas (tanto as que era membro quanto as públicas)
  const finishedCompetitions = useMemo(() =>
    (competitions || []).filter((comp) => comp.computed_status === "finished" || comp.computed_label === "Finalizada"),
    [competitions]
  );

  // Show first unread notification automatically (with session guard)
  useEffect(() => {
    if (unreadNotifications && unreadNotifications.length > 0 && !currentNotification) {
      const nextNotification = unreadNotifications.find((n) => !dismissedNotifications.has(n.id));
      if (nextNotification) {
        setCurrentNotification(nextNotification);
      }
    }
  }, [unreadNotifications, currentNotification, dismissedNotifications]);

  // Removed automatic finalization loop here to avoid heavy RPC calls on page load.
  // Finalization remains handled when opening the competition details page.

  const handleDismissNotification = (id: string) => {
    dismissMutation.mutate(id);
    const newSet = new Set(dismissedNotifications);
    newSet.add(id);
    setDismissedNotifications(newSet);
    sessionStorage.setItem("dismissed_notifications", JSON.stringify(Array.from(newSet)));
    setCurrentNotification(null);
  };

  const handleMarkReadNotification = (id: string) => {
    markReadMutation.mutate(id);
    const newSet = new Set(dismissedNotifications);
    newSet.add(id);
    setDismissedNotifications(newSet);
    sessionStorage.setItem("dismissed_notifications", JSON.stringify(Array.from(newSet)));
    setCurrentNotification(null);
  };

  // Use computed_label from backend when available, fallback to local calculation
  const getDaysInfo = (comp: typeof competitions[0]) => {
    // If it's finished, show "Encerrada"
    if (comp.computed_status === "finished" || comp.computed_label === "Finalizada") {
      return "Encerrada";
    }
    
    // For running competitions, calculate remaining time
    if (comp.computed_label === "Em andamento") {
      const remaining = getRemainingTime(comp.end_date);
      if (remaining.days > 0) {
        return `${remaining.days}d ${remaining.hours}h restantes`;
      }
      return `${remaining.hours}h restantes`;
    }
    
    // For future competitions (Participe agora / Aguardando início)
    if (comp.computed_label === "Aguardando início" || comp.computed_label === "Participe agora") {
      const untilStart = getTimeUntilStart(comp.start_date);
      if (!untilStart.started) {
        return `Começa em ${untilStart.formattedDate}`;
      }
    }
    
    return "";
  };

  return (
    <PullToRefresh onRefresh={handleRefresh} className="min-h-[calc(100vh-4rem)]">
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto w-full">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 break-words">
                <Trophy className="w-8 h-8 text-primary shrink-0" />
                <span>Competições</span>
              </h1>
              {unreadNotifications && unreadNotifications.length > 0 && (
                <div className="relative shrink-0">
                  <Bell className="w-6 h-6 text-yellow-500 animate-pulse" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadNotifications.length}
                  </span>
                </div>
              )}
            </div>
            <p className="text-muted-foreground text-sm break-words">
              Compete com outros motoristas e ganhe prêmios
            </p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap justify-end gap-2 sm:gap-3 w-full md:w-auto">
            <Button onClick={() => setShowRankingModal(true)} variant="outline" className="gap-2 min-h-[44px] w-full sm:w-auto">
              <Medal className="w-4 h-4" />
              <span className="hidden sm:inline">Ranking</span>
              <span className="sm:hidden">Ranking</span>
            </Button>
            <Button onClick={() => setShowCreateModal(true)} className="gap-2 min-h-[44px] w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Criar Competição</span>
              <span className="sm:hidden">Criar</span>
            </Button>
            <Button onClick={() => setShowJoinModal(true)} variant="outline" className="gap-2 min-h-[44px] w-full sm:w-auto">
              <LogIn className="w-4 h-4" />
              Entrar
            </Button>
          </div>
        </header>

        <Tabs defaultValue="disponiveis" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full overflow-x-auto rounded-lg border border-border/40 bg-muted/40">
            <TabsTrigger value="disponiveis" className="flex-1 whitespace-nowrap text-sm">
              Disponíveis
            </TabsTrigger>
            <TabsTrigger value="minhas" className="flex-1 whitespace-nowrap text-sm">
              Minhas
            </TabsTrigger>
            <TabsTrigger value="finalizadas" className="flex-1 whitespace-nowrap text-sm">
              Finalizadas
            </TabsTrigger>
          </TabsList>

        <TabsContent value="minhas" className="space-y-4 mt-4">
          {isLoading ? (
            <CompetitionSkeletonGrid count={3} />
          ) : myCompetitions && myCompetitions.length > 0 ? (
            <div className="space-y-3 animate-fade-in">
              {myCompetitions.map((comp) => {
                const memberCount = comp.participants_count;
                const isHost = comp.user_is_host;
                
                return (
                  <Card
                    key={comp.id}
                    className="w-full cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => navigate(`/dashboard/competicoes/${comp.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg break-words">{comp.name}</CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" />
                            {memberCount} participante{memberCount !== 1 ? 's' : ''}
                            {isHost && (
                              <Badge variant="outline" className="text-xs">
                                <Crown className="w-3 h-3 mr-1" />
                                Host
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={comp.computed_label === "Finalizada" ? "outline" : comp.computed_label === "Aguardando início" ? "secondary" : "default"}>
                              {comp.computed_label}
                            </Badge>
                            {(isHost || isAdmin) && (
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteModalCompetition({ id: comp.id, name: comp.name });
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          {comp.meta_reached && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Meta atingida
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {comp.description && (
                        <MarkdownRenderer content={comp.description} className="text-sm text-muted-foreground line-clamp-2" />
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-primary" />
                          <span className="text-muted-foreground">Meta:</span>
                          <span className="font-semibold">{formatCurrency(comp.goal_value)}</span>
                        </div>
                        {comp.prize_value > 0 && (
                          <div className="flex items-center gap-2">
                            <Gift className="w-4 h-4 text-yellow-500" />
                            <span className="text-muted-foreground">Prêmio:</span>
                            <span className="font-semibold text-yellow-500">
                              {formatCurrency(comp.prize_value)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(parseISO(comp.start_date), "dd/MM/yy", { locale: ptBR })} -{" "}
                          {format(parseISO(comp.end_date), "dd/MM/yy", { locale: ptBR })}
                        </span>
                        {comp.computed_label === "Em andamento" && (
                          <span className="ml-auto text-primary font-medium">
                            {getDaysInfo(comp)}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="animate-fade-in">
              <CardContent className="pt-6 text-center space-y-4">
                <Trophy className="w-16 h-16 text-muted-foreground mx-auto" />
                <div>
                  <p className="font-medium">Você ainda não está em nenhuma competição</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Crie uma nova ou entre em uma existente
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="disponiveis" className="space-y-4 mt-4">
          {isLoading ? (
            <CompetitionSkeletonGrid count={4} />
          ) : activeListedCompetitions && activeListedCompetitions.length > 0 ? (
            <div className="space-y-3 animate-fade-in">
              {activeListedCompetitions.map((comp) => {

                return (
                  <Card
                    key={comp.id}
                    className="w-full cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => navigate(`/dashboard/competicoes/${comp.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg break-words">{comp.name}</CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" />
                            {comp.participants_count} participante
                            {comp.participants_count !== 1 ? "s" : ""}
                            {comp.allow_teams && (
                              <Badge variant="outline" className="text-xs">
                                Times
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant={comp.computed_label === "Participe agora" ? "secondary" : "default"}>
                            {comp.computed_label}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {comp.description && (
                        <MarkdownRenderer content={comp.description} className="text-sm text-muted-foreground line-clamp-2" />
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-primary" />
                          <span className="text-muted-foreground">Meta:</span>
                          <span className="font-semibold">{formatCurrency(comp.goal_value)}</span>
                        </div>
                        {comp.prize_value > 0 && (
                          <div className="flex items-center gap-2">
                            <Gift className="w-4 h-4 text-yellow-500" />
                            <span className="text-muted-foreground">Prêmio:</span>
                            <span className="font-semibold text-yellow-500">
                              {formatCurrency(comp.prize_value)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(parseISO(comp.start_date), "dd/MM/yy", { locale: ptBR })} -{" "}
                          {format(parseISO(comp.end_date), "dd/MM/yy", { locale: ptBR })}
                        </span>
                        {(comp.computed_label === "Em andamento" || comp.computed_label === "Participe agora") && (
                          <span className="ml-auto text-primary font-medium text-xs">
                            {getDaysInfo(comp)}
                          </span>
                        )}
                      </div>
                      <Button 
                        className="w-full gap-2 mt-2" 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/competicoes/${comp.id}`);
                        }}
                      >
                        <LogIn className="w-4 h-4" />
                        Entrar na Competição
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="animate-fade-in">
              <CardContent className="pt-6 text-center space-y-4">
                <Trophy className="w-16 h-16 text-muted-foreground mx-auto" />
                <div>
                  <p className="font-medium">Nenhuma competição disponível no momento</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Crie uma nova competição para começar
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="finalizadas" className="space-y-4 mt-4">
          {isLoading ? (
            <CompetitionSkeletonGrid count={3} />
          ) : finishedCompetitions && finishedCompetitions.length > 0 ? (
            <div className="space-y-3 animate-fade-in">
              {finishedCompetitions.map((comp) => {
                const memberCount = comp.participants_count;
                const isHost = comp.user_is_host;

                return (
                  <Card
                    key={comp.id}
                    className="w-full cursor-pointer hover:opacity-90 transition-opacity border-zinc-700"
                    onClick={() => navigate(`/dashboard/competicoes/${comp.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg break-words">{comp.name}</CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" />
                            {memberCount} participante{memberCount !== 1 ? "s" : ""}
                            {isHost && (
                              <Badge variant="outline" className="text-xs">
                                <Crown className="w-3 h-3 mr-1" />
                                Host
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="ml-auto">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Finalizada
                            </Badge>
                            {(isHost || isAdmin) && (
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteModalCompetition({ id: comp.id, name: comp.name });
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          {comp.meta_reached && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                              <Target className="w-3 h-3 mr-1" />
                              Meta atingida
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {comp.description && (
                        <MarkdownRenderer content={comp.description} className="text-sm text-muted-foreground line-clamp-2" />
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-primary" />
                          <span className="text-muted-foreground">Meta:</span>
                          <span className="font-semibold">{formatCurrency(comp.goal_value)}</span>
                        </div>
                        {comp.prize_value > 0 && (
                          <div className="flex items-center gap-2">
                            <Gift className="w-4 h-4 text-yellow-500" />
                            <span className="text-muted-foreground">Prêmio:</span>
                            <span className="font-semibold text-yellow-500">
                              {formatCurrency(comp.prize_value)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(parseISO(comp.start_date), "dd/MM/yy", { locale: ptBR })} -{" "}
                          {format(parseISO(comp.end_date), "dd/MM/yy", { locale: ptBR })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="animate-fade-in">
              <CardContent className="pt-6 text-center space-y-4">
                <Trophy className="w-16 h-16 text-muted-foreground mx-auto" />
                <p className="font-medium">Nenhuma competição finalizada ainda</p>
                <p className="text-sm text-muted-foreground">
                  Suas competições finalizadas aparecerão aqui com o resultado
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <CreateCompetitionModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
      
      <JoinCompetitionModal
        open={showJoinModal}
        onOpenChange={setShowJoinModal}
        initialCode={joinCode}
      />

      <GlobalRankingModal
        open={showRankingModal}
        onOpenChange={setShowRankingModal}
      />

      {deleteModalCompetition && (
        <DeleteCompetitionDialog
          open={!!deleteModalCompetition}
          onOpenChange={(open) => {
            if (!open) setDeleteModalCompetition(null);
          }}
          competitionId={deleteModalCompetition.id}
          competitionName={deleteModalCompetition.name}
        />
      )}

      {currentNotification && (
        <HostPayoutNotification
          notification={currentNotification}
          onMarkRead={handleMarkReadNotification}
          onClose={() => handleDismissNotification(currentNotification.id)}
        />
      )}
    </PullToRefresh>
  );
}
