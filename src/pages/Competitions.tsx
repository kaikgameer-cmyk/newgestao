import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trophy, Users, Calendar, Target, LogIn, Gift, Crown, CheckCircle, Bell } from "lucide-react";
import { useMyCompetitions, useListedCompetitions, useFinishedCompetitions, useFinalizeCompetitionIfNeeded } from "@/hooks/useCompetitions";
import { useUnreadHostNotifications, useMarkNotificationRead, useDismissNotification, HostNotification } from "@/hooks/useNotifications";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import JoinCompetitionModal from "@/components/competitions/JoinCompetitionModal";
import CreateCompetitionModal from "@/components/competitions/CreateCompetitionModal";
import HostPayoutNotification from "@/components/competitions/HostPayoutNotification";
import { getCompetitionStatus, getRemainingTime, getMyCompetitionStatusLabel, getAvailableCompetitionStatusLabel } from "@/lib/competitionUtils";
import { useAuth } from "@/hooks/useAuth";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Competitions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [activeTab, setActiveTab] = useState("minhas");
  const [currentNotification, setCurrentNotification] = useState<HostNotification | null>(null);
  const [finalizedIds, setFinalizedIds] = useState<string[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(() => {
    const stored = sessionStorage.getItem("dismissed_notifications");
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  
  const { data: myCompetitions, isLoading: loadingMine } = useMyCompetitions();
  const { data: listedCompetitions, isLoading: loadingListed } = useListedCompetitions();
  const { data: finishedCompetitions, isLoading: loadingFinished } = useFinishedCompetitions();
  const { data: unreadNotifications } = useUnreadHostNotifications();
  const markReadMutation = useMarkNotificationRead();
  const dismissMutation = useDismissNotification();
  const finalizeIfNeeded = useFinalizeCompetitionIfNeeded();

  // Show first unread notification automatically (with session guard)
  useEffect(() => {
    if (unreadNotifications && unreadNotifications.length > 0 && !currentNotification) {
      const nextNotification = unreadNotifications.find((n) => !dismissedNotifications.has(n.id));
      if (nextNotification) {
        setCurrentNotification(nextNotification);
      }
    }
  }, [unreadNotifications, currentNotification, dismissedNotifications]);

  // Lazily finalize finished competitions when this page is opened
  useEffect(() => {
    if (!finishedCompetitions || finishedCompetitions.length === 0) return;

    finishedCompetitions.forEach((competition) => {
      if (!finalizedIds.includes(competition.id)) {
        finalizeIfNeeded.mutate(competition.id);
        setFinalizedIds((prev) => [...prev, competition.id]);
      }
    });
  }, [finishedCompetitions, finalizeIfNeeded, finalizedIds]);

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

  // Filter listed to only show non-finished
  const activeListedCompetitions = listedCompetitions?.filter((comp) => {
    const now = new Date();
    const endExclusive = new Date(comp.end_date);
    endExclusive.setDate(endExclusive.getDate() + 1);
    return now < endExclusive;
  });

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

  const handleJoinFromListed = (code: string) => {
    setJoinCode(code);
    setShowJoinModal(true);
  };

  const getFinishedCardStyles = (payout: { status: string; payout_value: number } | null) => {
    if (!payout) return "border-zinc-800";
    
    switch (payout.status) {
      case "winner":
        return "border-green-400/60 shadow-[0_0_0_1px_rgba(74,222,128,0.30),0_0_18px_rgba(74,222,128,0.15)]";
      case "loser":
        return "border-red-400/60 shadow-[0_0_0_1px_rgba(248,113,113,0.30),0_0_18px_rgba(248,113,113,0.15)]";
      case "no_winner":
      default:
        return "border-zinc-700";
    }
  };

  const getFinishedBadge = (payout: { status: string; payout_value: number } | null) => {
    if (!payout) return null;
    
    switch (payout.status) {
      case "winner":
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <Trophy className="w-3 h-3 mr-1" />
            Vencedor - {formatCurrency(payout.payout_value)}
          </Badge>
        );
      case "loser":
        return <Badge variant="secondary">Não foi dessa vez</Badge>;
      case "no_winner":
        return <Badge variant="outline">Sem vencedor</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Trophy className="w-8 h-8 text-primary" />
            Competições
          </h1>
          <p className="text-muted-foreground mt-1">
            Compete com outros motoristas e ganhe prêmios
          </p>
        </div>
        {unreadNotifications && unreadNotifications.length > 0 && (
          <div className="relative">
            <Bell className="w-6 h-6 text-yellow-500 animate-pulse" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadNotifications.length}
            </span>
          </div>
        )}
      </div>

      <Tabs defaultValue="minhas" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="minhas">Minhas</TabsTrigger>
          <TabsTrigger value="disponiveis">Disponíveis</TabsTrigger>
          <TabsTrigger value="finalizadas">Finalizadas</TabsTrigger>
        </TabsList>

        <TabsContent value="minhas" className="space-y-4 mt-4">
          <div className="flex gap-3">
            <Button onClick={() => setShowCreateModal(true)} className="gap-2 flex-1">
              <Plus className="w-4 h-4" />
              Criar Competição
            </Button>
            <Button onClick={() => setShowJoinModal(true)} variant="outline" className="gap-2 flex-1">
              <LogIn className="w-4 h-4" />
              Entrar
            </Button>
          </div>

          {loadingMine ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </CardContent>
            </Card>
          ) : myCompetitions && myCompetitions.length > 0 ? (
            <div className="space-y-3">
              {myCompetitions.map((comp) => {
                const statusInfo = getMyCompetitionStatusLabel(comp.start_date, comp.end_date);
                const memberCount = comp.competition_members?.length ?? 0;
                const myMember = comp.competition_members.find((m) => m.user_id === user?.id);
                const isHost = myMember?.role === "host";
                const status = getCompetitionStatus(comp.start_date, comp.end_date);
                
                return (
                  <Card
                    key={comp.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => navigate(`/dashboard/competicoes/${comp.code}`)}
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
            <Card>
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
          {loadingListed ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </CardContent>
            </Card>
          ) : activeListedCompetitions && activeListedCompetitions.length > 0 ? (
            <div className="space-y-3">
              {activeListedCompetitions.map((comp) => {
                const status = getCompetitionStatus(comp.start_date, comp.end_date);
                const statusInfo = getAvailableCompetitionStatusLabel(
                  comp.start_date,
                  comp.end_date
                );
                const isFull = comp.max_members && comp.member_count >= comp.max_members;

                return (
                  <Card
                    key={comp.id}
                    className={`cursor-pointer hover:border-primary/50 transition-colors ${
                      comp.is_member ? "border-primary/30" : ""
                    }`}
                    onClick={() =>
                      comp.is_member
                        ? navigate(`/dashboard/competicoes/${comp.code}`)
                        : handleJoinFromListed(comp.code)
                    }
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{comp.name}</CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" />
                            {comp.member_count}
                            {comp.max_members ? ` / ${comp.max_members}` : ""} participante
                            {comp.member_count !== 1 ? "s" : ""}
                            {comp.allow_teams && (
                              <Badge variant="outline" className="text-xs">
                                Times
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                          {isFull && <Badge variant="destructive">Lotada</Badge>}
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
            <Card>
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
          {loadingFinished ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </CardContent>
            </Card>
          ) : finishedCompetitions && finishedCompetitions.length > 0 ? (
            <div className="space-y-3">
              {finishedCompetitions.map((comp) => {
                const borderStyle = getFinishedCardStyles(comp.payout);
                const badge = getFinishedBadge(comp.payout);
                const memberCount = comp.competition_members?.length ?? 0;
                const myMember = comp.competition_members.find((m) => m.user_id === user?.id);
                const isHost = myMember?.role === "host";

                return (
                  <Card
                    key={comp.id}
                    className={`cursor-pointer hover:opacity-90 transition-opacity ${borderStyle}`}
                    onClick={() => navigate(`/dashboard/competicoes/${comp.code}`)}
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
                        {badge}
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
                        <Badge variant="outline" className="ml-auto">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Finalizada
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
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
    </div>
  );
}
