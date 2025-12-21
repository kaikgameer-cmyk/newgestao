import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trophy, Users, Calendar, Target, LogIn, Gift } from "lucide-react";
import { useMyCompetitions, useListedCompetitions } from "@/hooks/useCompetitions";
import { format, differenceInDays, isAfter, isBefore, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import JoinCompetitionModal from "@/components/competitions/JoinCompetitionModal";
import CreateCompetitionModal from "@/components/competitions/CreateCompetitionModal";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Competitions() {
  const navigate = useNavigate();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [activeTab, setActiveTab] = useState("minhas");
  
  const { data: myCompetitions, isLoading: loadingMine } = useMyCompetitions();
  const { data: listedCompetitions, isLoading: loadingListed } = useListedCompetitions();

  const getStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    if (isBefore(now, start)) {
      return { label: "Aguardando", variant: "secondary" as const };
    }
    if (isAfter(now, end)) {
      return { label: "Finalizada", variant: "outline" as const };
    }
    return { label: "Em andamento", variant: "default" as const };
  };

  const getDaysInfo = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    if (isBefore(now, start)) {
      const daysToStart = differenceInDays(start, now);
      return `Começa em ${daysToStart} dia${daysToStart !== 1 ? 's' : ''}`;
    }
    if (isAfter(now, end)) {
      return "Encerrada";
    }
    const daysLeft = differenceInDays(end, now);
    return `${daysLeft} dia${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}`;
  };

  const handleJoinFromListed = (code: string) => {
    setJoinCode(code);
    setShowJoinModal(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            Competições
          </h1>
          <p className="text-muted-foreground mt-1">
            Desafie amigos e acompanhe seu progresso
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Criar Competição
          </Button>
          <Button variant="outline" onClick={() => setShowJoinModal(true)} className="gap-2">
            <LogIn className="w-4 h-4" />
            Entrar
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="minhas" className="gap-2">
            <Trophy className="w-4 h-4" />
            Minhas
          </TabsTrigger>
          <TabsTrigger value="disponiveis" className="gap-2">
            <Users className="w-4 h-4" />
            Disponíveis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="minhas" className="space-y-4 mt-6">
          {loadingMine ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : myCompetitions && myCompetitions.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myCompetitions.map((competition) => {
                const status = getStatus(competition.start_date, competition.end_date);
                const isHost = competition.competition_members.some(
                  (m) => m.role === "host"
                );

                return (
                  <Card
                    key={competition.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => navigate(`/dashboard/competicoes/${competition.code}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg line-clamp-1">
                          {competition.name}
                        </CardTitle>
                        <div className="flex gap-1">
                          {isHost && (
                            <Badge variant="outline" className="text-primary border-primary">
                              Host
                            </Badge>
                          )}
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {competition.description || "Meta de Receita"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Target className="w-4 h-4" />
                        <span>Meta: {formatCurrency(competition.goal_value)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Gift className="w-4 h-4 text-primary" />
                        <span>Prêmio: {formatCurrency(competition.prize_value)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(parseISO(competition.start_date), "dd/MM", { locale: ptBR })} -{" "}
                          {format(parseISO(competition.end_date), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4" />
                        <span className="text-primary font-medium">
                          {getDaysInfo(competition.start_date, competition.end_date)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Trophy className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma competição ainda</h3>
                <p className="text-muted-foreground mb-4 max-w-sm">
                  Crie uma competição para desafiar amigos ou entre em uma usando o código
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Criar
                  </Button>
                  <Button variant="outline" onClick={() => setShowJoinModal(true)}>
                    Entrar com código
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="disponiveis" className="space-y-4 mt-6">
          {loadingListed ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : listedCompetitions && listedCompetitions.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {listedCompetitions.map((competition) => {
                const status = getStatus(competition.start_date, competition.end_date);

                return (
                  <Card key={competition.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg line-clamp-1">
                          {competition.name}
                        </CardTitle>
                        <div className="flex gap-1">
                          {competition.is_member && (
                            <Badge variant="outline" className="text-green-500 border-green-500">
                              Participando
                            </Badge>
                          )}
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {competition.description || "Meta de Receita"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Target className="w-4 h-4" />
                        <span>Meta: {formatCurrency(competition.goal_value)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Gift className="w-4 h-4 text-primary" />
                        <span>Prêmio: {formatCurrency(competition.prize_value)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(parseISO(competition.start_date), "dd/MM", { locale: ptBR })} -{" "}
                          {format(parseISO(competition.end_date), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>
                            {competition.member_count} participante{competition.member_count !== 1 ? "s" : ""}
                            {competition.max_members && ` / ${competition.max_members}`}
                          </span>
                        </div>
                        {!competition.is_member && (
                          <Button 
                            size="sm" 
                            onClick={() => handleJoinFromListed(competition.code)}
                            className="gap-1"
                          >
                            <LogIn className="w-3 h-3" />
                            Entrar
                          </Button>
                        )}
                        {competition.is_member && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => navigate(`/dashboard/competicoes/${competition.code}`)}
                          >
                            Ver
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma competição disponível</h3>
                <p className="text-muted-foreground mb-4 max-w-sm">
                  Não há competições públicas no momento. Crie a sua ou entre com um código!
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
    </div>
  );
}
