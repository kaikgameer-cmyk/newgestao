import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Copy, Check, Phone, Key, User, DollarSign, X } from "lucide-react";
import { toast } from "sonner";

interface Winner {
  user_id: string;
  name: string;
  whatsapp: string | null;
  pix_key: string | null;
  payout_value: number;
}

interface HostNotification {
  id: string;
  type: "competition_host_payout" | "competition_host_no_winner";
  competition_id: string;
  payload: {
    competition_code: string;
    competition_name: string;
    prize_value: number;
    goal_value: number;
    winner_team_name?: string;
    winners?: Winner[];
    message: string;
  };
}

interface HostPayoutNotificationProps {
  notification: HostNotification;
  onMarkRead: (notificationId: string) => void;
  onClose: () => void;
}

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function HostPayoutNotification({
  notification,
  onMarkRead,
  onClose,
}: HostPayoutNotificationProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { payload, type } = notification;
  const isNoWinner = type === "competition_host_no_winner";

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    toast.success("Copiado!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAllWinners = () => {
    if (!payload.winners?.length) return;
    
    const text = payload.winners.map((w) => 
      `${w.name}\nWhatsApp: ${w.whatsapp || "Não informado"}\nPIX: ${w.pix_key || "Não informado"}\nValor: ${formatCurrency(w.payout_value)}`
    ).join("\n\n---\n\n");

    navigator.clipboard.writeText(text);
    toast.success("Lista de vencedores copiada!");
  };

  const handleMarkRead = () => {
    onMarkRead(notification.id);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className={`w-5 h-5 ${isNoWinner ? "text-muted-foreground" : "text-yellow-500"}`} />
            {isNoWinner ? "Competição Finalizada" : "Competição Finalizada - Pagamento"}
          </DialogTitle>
          <DialogDescription>
            {payload.competition_name} ({payload.competition_code})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isNoWinner ? (
            <Card className="border-zinc-700">
              <CardContent className="pt-6 text-center">
                <X className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Sem vencedor</p>
                <p className="text-muted-foreground">
                  A meta de {formatCurrency(payload.goal_value)} não foi atingida.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Prêmio total:</span>
                <Badge variant="outline" className="text-primary">
                  {formatCurrency(payload.prize_value)}
                </Badge>
              </div>

              {payload.winner_team_name && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Time vencedor:</span>
                  <Badge variant="default">{payload.winner_team_name}</Badge>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Vencedores ({payload.winners?.length || 0})</h4>
                  {payload.winners && payload.winners.length > 0 && (
                    <Button size="sm" variant="outline" onClick={copyAllWinners}>
                      <Copy className="w-3 h-3 mr-1" />
                      Copiar lista
                    </Button>
                  )}
                </div>

                {payload.winners?.map((winner, index) => (
                  <Card key={winner.user_id} className="border-green-400/30 bg-green-400/5">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{winner.name}</span>
                        <Badge className="ml-auto bg-green-600">
                          {formatCurrency(winner.payout_value)}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="flex-1">
                          {winner.whatsapp || "WhatsApp não informado"}
                        </span>
                        {winner.whatsapp && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => copyToClipboard(winner.whatsapp!, `whatsapp-${index}`)}
                          >
                            {copiedField === `whatsapp-${index}` ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Key className="w-4 h-4 text-muted-foreground" />
                        <span className="flex-1 font-mono text-xs break-all">
                          {winner.pix_key || "PIX não informado"}
                        </span>
                        {winner.pix_key && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => copyToClipboard(winner.pix_key!, `pix-${index}`)}
                          >
                            {copiedField === `pix-${index}` ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <p className="text-sm text-muted-foreground text-center">
                {payload.message}
              </p>
            </>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleMarkRead} className="w-full">
            <Check className="w-4 h-4 mr-2" />
            Marcar como lido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}