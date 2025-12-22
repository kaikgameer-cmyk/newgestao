import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Medal, Award, Users, Crown, Loader2, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { useGlobalRanking, RankingPeriod } from "@/hooks/useGlobalRanking";
import { useAuth } from "@/hooks/useAuth";
import { UserAvatar } from "@/components/user/UserAvatar";
import { AchievementBadges } from "@/components/competitions/AchievementBadges";
import { cn } from "@/lib/utils";

interface GlobalRankingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const getAvatarUrl = (path: string | null) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
};

const getPositionIcon = (position: number) => {
  switch (position) {
    case 1:
      return <Trophy className="w-6 h-6 text-primary" />;
    case 2:
      return <Medal className="w-6 h-6 text-muted-foreground" />;
    case 3:
      return <Award className="w-6 h-6 text-amber-500" />;
    default:
      return (
        <span className="w-6 h-6 flex items-center justify-center text-xs font-bold text-muted-foreground">
          {position}
        </span>
      );
  }
};

const getPositionStyle = (position: number) => {
  switch (position) {
    case 1:
      return "bg-primary/10 border-primary/40";
    case 2:
      return "bg-muted/60 border-border/60";
    case 3:
      return "bg-amber-500/10 border-amber-500/40";
    default:
      return "bg-card border-border";
  }
};

const SORT_OPTIONS = [
  { value: "wins", label: "Vitórias" },
  { value: "prizes", label: "Prêmios" },
  { value: "participations", label: "Participações" },
  { value: "name", label: "Nome" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["value"];

export function GlobalRankingModal({ open, onOpenChange }: GlobalRankingModalProps) {
  const [period, setPeriod] = useState<RankingPeriod>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("wins");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useGlobalRanking(period);
  const ranking = data?.entries || [];
  const totals = data?.totals;
  const { user } = useAuth();

  const filteredAndSorted = useMemo(() => {
    let list = ranking;

    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter((entry) => entry.display_name.toLowerCase().includes(term));
    }

    const sorted = [...list].sort((a, b) => {
      if (sortKey === "wins") {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.total_prizes !== a.total_prizes) return b.total_prizes - a.total_prizes;
        if (b.participations !== a.participations) return b.participations - a.participations;
        return a.display_name.localeCompare(b.display_name);
      }

      if (sortKey === "prizes") {
        if (b.total_prizes !== a.total_prizes) return b.total_prizes - a.total_prizes;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.display_name.localeCompare(b.display_name);
      }

      if (sortKey === "participations") {
        if (b.participations !== a.participations) return b.participations - a.participations;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.display_name.localeCompare(b.display_name);
      }

      return a.display_name.localeCompare(b.display_name);
    });

    return sorted.slice(0, 50); // limitar top 50 para performance
  }, [ranking, search, sortKey]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredAndSorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handlePeriodChange = (value: string) => {
    setPeriod(value as RankingPeriod);
    setPage(1);
  };

  const handleSortChange = (value: SortKey) => {
    setSortKey(value);
    setPage(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            Ranking Global
          </DialogTitle>
          <DialogDescription>
            Classificação geral de desempenho nas competições da plataforma
          </DialogDescription>
        </DialogHeader>

        {/* Períodos */}
        <Tabs
          value={period}
          onValueChange={handlePeriodChange}
          className="w-full mt-2 mb-2"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">Geral</TabsTrigger>
            <TabsTrigger value="last_30_days">Últimos 30 dias</TabsTrigger>
            <TabsTrigger value="this_month">Este mês</TabsTrigger>
            <TabsTrigger value="this_year">Este ano</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <Card variant="elevated">
            <CardContent className="pt-4 pb-3 text-center space-y-1">
              <Users className="w-5 h-5 mx-auto text-primary" />
              <div className="text-xl font-bold">{totals?.totalCompetitors ?? 0}</div>
              <div className="text-xs text-muted-foreground">Usuários ranqueados</div>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="pt-4 pb-3 text-center space-y-1">
              <Trophy className="w-5 h-5 mx-auto text-amber-400" />
              <div className="text-xl font-bold">{totals?.totalCompetitionsFinished ?? 0}</div>
              <div className="text-xs text-muted-foreground">Competições finalizadas</div>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="pt-4 pb-3 text-center space-y-1">
              <span className="text-lg">💰</span>
              <div className="text-lg font-bold text-primary">
                {formatCurrency(totals?.totalPrizes ?? 0)}
              </div>
              <div className="text-xs text-muted-foreground">Prêmios pagos</div>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="pt-4 pb-3 text-center space-y-1">
              <Medal className="w-5 h-5 mx-auto text-muted-foreground" />
              <div className="text-xl font-bold">{totals?.totalWins ?? 0}</div>
              <div className="text-xs text-muted-foreground">Vitórias registradas</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-3 mb-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome"
              className="pl-8"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="w-full md:w-48">
            <Select value={sortKey} onValueChange={(v) => handleSortChange(v as SortKey)}>
              <SelectTrigger>
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 min-h-0 border rounded-xl border-border/60 bg-card/60">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-center px-4">
              <Trophy className="w-10 h-10 mb-3 opacity-60" />
              <p className="font-medium">Nenhum ranking disponível</p>
              <p className="text-sm">As competições finalizadas aparecerão aqui.</p>
            </div>
          ) : (
            <ScrollArea className="h-[320px]">
              <div className="space-y-2 p-3">
                <div className="hidden md:grid grid-cols-12 gap-4 px-3 py-1 text-[11px] font-medium text-muted-foreground uppercase">
                  <div className="col-span-1">#</div>
                  <div className="col-span-4">Usuário</div>
                  <div className="col-span-2 text-center">Vitórias</div>
                  <div className="col-span-2 text-center">Participações</div>
                  <div className="col-span-3 text-right">Prêmios</div>
                </div>

                {pageItems.map((entry, index) => {
                  const absoluteIndex = (currentPage - 1) * pageSize + index;
                  const position = absoluteIndex + 1;
                  const isCurrentUser = entry.user_id === user?.id;

                  return (
                    <div
                      key={entry.user_id}
                      className={cn(
                        "grid grid-cols-12 gap-3 items-center px-3 py-2 rounded-lg border text-sm",
                        getPositionStyle(position),
                        isCurrentUser && "ring-1 ring-primary shadow-sm"
                      )}
                    >
                      <div className="col-span-2 md:col-span-1 flex items-center justify-center">
                        {getPositionIcon(position)}
                      </div>

                      <div className="col-span-10 md:col-span-4 flex items-center gap-3 min-w-0">
                        <UserAvatar
                          avatarUrl={getAvatarUrl(entry.avatar_url)}
                          firstName={entry.display_name.split(" ")[0]}
                          lastName={entry.display_name.split(" ")[1]}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-sm font-medium truncate">
                            <span className="truncate">{entry.display_name}</span>
                            {isCurrentUser && (
                              <span className="text-[11px] text-primary">(você)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <AchievementBadges
                              wins={entry.wins}
                              participations={entry.participations}
                              totalPrizes={entry.total_prizes}
                              compact
                            />
                          </div>
                          <div className="md:hidden text-[11px] text-muted-foreground mt-0.5">
                            {entry.wins} vitórias • {formatCurrency(entry.total_prizes)}
                          </div>
                        </div>
                      </div>

                      <div className="hidden md:flex col-span-2 items-center justify-center gap-1">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span className="font-semibold">{entry.wins}</span>
                      </div>

                      <div className="hidden md:block col-span-2 text-center text-muted-foreground">
                        {entry.participations}
                      </div>

                      <div className="hidden md:block col-span-3 text-right font-semibold text-primary">
                        {formatCurrency(entry.total_prizes)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Paginação simples */}
        {filteredAndSorted.length > pageSize && (
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>
              Mostrando {pageItems.length} de {filteredAndSorted.length} competidores (top 50)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-2 py-1 rounded border border-border disabled:opacity-40"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <span>
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                className="px-2 py-1 rounded border border-border disabled:opacity-40"
                disabled={currentPage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
