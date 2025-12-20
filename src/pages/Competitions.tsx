import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trophy, Users, Calendar, Target, LogIn } from "lucide-react";
import { useMyCompetitions } from "@/hooks/useCompetitions";
import { format, differenceInDays, isAfter, isBefore, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import JoinCompetitionForm from "@/components/competitions/JoinCompetitionForm";
import CreateCompetitionModal from "@/components/competitions/CreateCompetitionModal";

const goalTypeLabels: Record<string, string> = {
  income_goal: "Meta de Receita",
  expense_limit: "Limite de Gastos",
  saving_goal: "Meta de Economia",
  net_goal: "Meta de Lucro",
};

export default function Competitions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get("code") || "";
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState(initialCode ? "entrar" : "minhas");
  
  const { data: competitions, isLoading } = useMyCompetitions();

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
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Criar Competição
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="minhas" className="gap-2">
            <Trophy className="w-4 h-4" />
            Minhas
          </TabsTrigger>
          <TabsTrigger value="entrar" className="gap-2">
            <LogIn className="w-4 h-4" />
            Entrar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="minhas" className="space-y-4 mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : competitions && competitions.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {competitions.map((competition) => {
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
                        {competition.description || goalTypeLabels[competition.goal_type]}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Target className="w-4 h-4" />
                        <span>
                          {goalTypeLabels[competition.goal_type]}: R${" "}
                          {competition.goal_value.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
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
                  <Button variant="outline" onClick={() => setActiveTab("entrar")}>
                    Entrar com código
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="entrar" className="mt-6">
          <JoinCompetitionForm initialCode={initialCode} />
        </TabsContent>
      </Tabs>

      <CreateCompetitionModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </div>
  );
}
