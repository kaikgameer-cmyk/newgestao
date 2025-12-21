import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trophy, Users, Calendar, Target, LogIn, Gift, Crown, CheckCircle, Bell } from "lucide-react";
import { useCompetitionsForTabs } from "@/hooks/useCompetitions";
import { useUnreadHostNotifications, useMarkNotificationRead, useDismissNotification, HostNotification } from "@/hooks/useNotifications";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import JoinCompetitionModal from "@/components/competitions/JoinCompetitionModal";
import CreateCompetitionModal from "@/components/competitions/CreateCompetitionModal";
import HostPayoutNotification from "@/components/competitions/HostPayoutNotification";
import { getCompetitionStatus, getRemainingTime, getMyCompetitionStatusLabel, getAvailableCompetitionStatusLabel } from "@/lib/competitionUtils";
import { useAuth } from "@/hooks/useAuth";
import { CompetitionSkeletonGrid } from "@/components/competitions/CompetitionCardSkeleton";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useQueryClient } from "@tanstack/react-query";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Competitions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [activeTab, setActiveTab] = useState("disponiveis");
  const [currentNotification, setCurrentNotification] = useState<HostNotification | null>(null);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(() => {
    const stored = sessionStorage.getItem("dismissed_notifications");
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  
  const queryClient = useQueryClient();
  const { data: competitions, isLoading } = useCompetitionsForTabs();
  const { data: unreadNotifications } = useUnreadHostNotifications();
  const markReadMutation = useMarkNotificationRead();
  const dismissMutation = useDismissNotification();

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["competitions-for-tabs"] });
    await queryClient.invalidateQueries({ queryKey: ["unread-host-notifications"] });
  }, [queryClient]);

  const myCompetitions = (competitions || []).filter((comp) => comp.computed_status === "mine");
  const activeListedCompetitions = (competitions || []).filter(
    (comp) => comp.computed_status === "available"
  );
  const finishedCompetitions = (competitions || []).filter(
    (comp) => comp.computed_status === "finished"
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

  const getDaysInfo = (startDate: string, endDate: string) => {
    const status = getCompetitionStatus(startDate, endDate);
    const remaining = getRemainingTime(endDate);
    
    if (status.status === "upcoming") {
      const now = new Date();
      const start = parseISO(startDate);
      const daysToStart = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return `Começa em ${daysToStart} dia${daysToStart !== 1 ? 's' : ''}`;
    }
    if (status.status === "finished") {
      return "Encerrada";
    }
    if (remaining.days > 0) {
      return `${remaining.days}d ${remaining.hours}h restantes`;
    }
    return `${remaining.hours}h restantes`;
  };

  return (
    <PullToRefresh onRefresh={handleRefresh} className="p-4 md:p-6 space-y-6 min-h-[calc(100vh-4rem)]">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Trophy className="w-8 h-8 text-primary" />
              Competições
            </h1>
            {unreadNotifications && unreadNotifications.length > 0 && (
              <div className="relative">
                <Bell className="w-6 h-6 text-yellow-500 animate-pulse" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadNotifications.length}
                </span>
              </div>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Compete com outros motoristas e ganhe prêmios
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2 sm:gap-3">
          <Button onClick={() => setShowCreateModal(true)} className="gap-2 min-h-[44px]">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Criar Competição</span>
            <span className="sm:hidden">Criar</span>
          </Button>
          <Button onClick={() => setShowJoinModal(true)} variant="outline" className="gap-2 min-h-[44px]">
            <LogIn className="w-4 h-4" />
            Entrar
          </Button>
        </div>
      </header>

      <Tabs defaultValue="disponiveis" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="disponiveis">Disponíveis</TabsTrigger>
          <TabsTrigger value="minhas">Minhas</TabsTrigger>
          <TabsTrigger value="finalizadas">Finalizadas</TabsTrigger>
        </TabsList>

        <TabsContent value="minhas" className="space-y-4 mt-4">
          {isLoading ? (
            <CompetitionSkeletonGrid count={3} />
          ) : myCompetitions && myCompetitions.length > 0 ? (
            <div className="space-y-3 animate-fade-in">
              {myCompetitions.map((comp) => {
                const statusInfo = getMyCompetitionStatusLabel(comp.start_date, comp.end_date);
                const memberCount = comp.participants_count;
                const isHost = comp.user_is_host;
                const status = getCompetitionStatus(comp.start_date, comp.end_date);
                
                return (
                  <Card
                    key={comp.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => navigate(`/dashboard/competicoes/${comp.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{comp.name}</CardTitle>
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
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {comp.description && (
                        <p className="text-sm text-muted-foreground">{comp.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-primary" />
                          <span className="text-muted-foreground">Meta:</span>
                          <span className="font-semibold">{formatCurrency(comp.goal_value)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Gift className="w-4 h-4 text-yellow-500" />
                          <span className="text-muted-foreground">Prêmio:</span>
                          <span className="font-semibold text-yellow-500">
                            {formatCurrency(comp.prize_value)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(parseISO(comp.start_date), "dd/MM/yy", { locale: ptBR })} -{" "}
                          {format(parseISO(comp.end_date), "dd/MM/yy", { locale: ptBR })}
                        </span>
                        {status.status === "active" && (
                          <span className="ml-auto text-primary font-medium">
                            {getDaysInfo(comp.start_date, comp.end_date)}
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
                const status = getCompetitionStatus(comp.start_date, comp.end_date);
                const statusInfo = getAvailableCompetitionStatusLabel(
                  comp.start_date,
                  comp.end_date
                );

                return (
                  <Card
                    key={comp.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => navigate(`/dashboard/competicoes/${comp.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{comp.name}</CardTitle>
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
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {comp.description && (
                        <p className="text-sm text-muted-foreground">{comp.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-primary" />
                          <span className="text-muted-foreground">Meta:</span>
                          <span className="font-semibold">{formatCurrency(comp.goal_value)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Gift className="w-4 h-4 text-yellow-500" />
                          <span className="text-muted-foreground">Prêmio:</span>
                          <span className="font-semibold text-yellow-500">
                            {formatCurrency(comp.prize_value)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(parseISO(comp.start_date), "dd/MM/yy", { locale: ptBR })} -{" "}
                          {format(parseISO(comp.end_date), "dd/MM/yy", { locale: ptBR })}
                        </span>
                        {status.status === "active" && (
                          <span className="ml-auto text-primary font-medium">
                            {getDaysInfo(comp.start_date, comp.end_date)}
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
                    className="cursor-pointer hover:opacity-90 transition-opacity border-zinc-700"
                    onClick={() => navigate(`/dashboard/competicoes/${comp.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{comp.name}</CardTitle>
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
                        <Badge variant="outline" className="ml-auto">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Finalizada
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {comp.description && (
                        <p className="text-sm text-muted-foreground">{comp.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-primary" />
                          <span className="text-muted-foreground">Meta:</span>
                          <span className="font-semibold">{formatCurrency(comp.goal_value)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Gift className="w-4 h-4 text-yellow-500" />
                          <span className="text-muted-foreground">Prêmio:</span>
                          <span className="font-semibold text-yellow-500">
                            {formatCurrency(comp.prize_value)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
