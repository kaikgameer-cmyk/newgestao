import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Users, Gift, Calendar, Loader2, CheckCircle, XCircle, Minus } from "lucide-react";
import { useCompetitionHistory } from "@/hooks/useCompetitionHistory";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UserRankingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function UserRankingModal({ open, onOpenChange }: UserRankingModalProps) {
  const { data, isLoading } = useCompetitionHistory();
  
  const stats = data?.stats || { totalWins: 0, totalPrizes: 0, totalParticipations: 0 };
  const history = data?.items || [];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Meu Ranking
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-muted/50">
                <CardContent className="p-3 text-center">
                  <Users className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-2xl font-bold">{stats.totalParticipations}</p>
                  <p className="text-xs text-muted-foreground">Participações</p>
                </CardContent>
              </Card>
              
              <Card className="bg-muted/50 border-primary/30">
                <CardContent className="p-3 text-center">
                  <Trophy className="w-5 h-5 mx-auto text-primary mb-1" />
                  <p className="text-2xl font-bold text-primary">{stats.totalWins}</p>
                  <p className="text-xs text-muted-foreground">Vitórias</p>
                </CardContent>
              </Card>
              
              <Card className="bg-muted/50">
                <CardContent className="p-3 text-center">
                  <Gift className="w-5 h-5 mx-auto text-yellow-500 mb-1" />
                  <p className="text-lg font-bold text-yellow-500">
                    {formatCurrency(stats.totalPrizes)}
                  </p>
                  <p className="text-xs text-muted-foreground">Prêmios</p>
                </CardContent>
              </Card>
            </div>
            
            {/* History List */}
            <div className="flex-1 overflow-hidden">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Histórico de Competições
              </h3>
              
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma participação ainda</p>
                </div>
              ) : (
                <ScrollArea className="h-[280px]">
                  <div className="space-y-2 pr-2">
                    {history.map((item) => (
                      <Card key={item.id} className="bg-card/50">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{item.name}</p>
                                {item.is_winner && (
                                  <Trophy className="w-4 h-4 text-primary flex-shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <Calendar className="w-3 h-3" />
                                <span>
                                  {format(parseISO(item.start_date), "dd/MM/yy", { locale: ptBR })} - {format(parseISO(item.end_date), "dd/MM/yy", { locale: ptBR })}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-1">
                              {item.status === "finished" ? (
                                item.is_winner ? (
                                  <Badge className="bg-primary/20 text-primary border-primary/30">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Venceu
                                  </Badge>
                                ) : item.payout_status === "no_winner" ? (
                                  <Badge variant="outline" className="text-muted-foreground">
                                    <Minus className="w-3 h-3 mr-1" />
                                    Sem vencedor
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Não venceu
                                  </Badge>
                                )
                              ) : (
                                <Badge variant="secondary">
                                  {item.status === "active" ? "Em andamento" : "Aguardando"}
                                </Badge>
                              )}
                              
                              {item.prize_value > 0 && item.is_winner && (
                                <span className="text-xs text-yellow-500 font-medium">
                                  {formatCurrency(item.payout_value || item.prize_value)}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            <span className="text-muted-foreground">
                              Meta: <span className="text-foreground">{formatCurrency(item.goal_value)}</span>
                            </span>
                            <span className="text-muted-foreground">
                              Seu total: <span className="text-foreground font-medium">{formatCurrency(item.user_score)}</span>
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
