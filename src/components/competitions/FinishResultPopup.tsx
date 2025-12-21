import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, PartyPopper, Heart, XCircle } from "lucide-react";

export type FinishStatus = "winner" | "loser" | "no_winner";

interface FinishResultPopupProps {
  open: boolean;
  onClose: () => void;
  status: FinishStatus;
  payoutValue: number;
  winnerName?: string;
  winnerType?: "team" | "individual" | "none";
}

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function FinishResultPopup({ 
  open, 
  onClose, 
  status, 
  payoutValue, 
  winnerName,
  winnerType 
}: FinishResultPopupProps) {
  
  if (status === "winner") {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-primary" />
            </div>
            <DialogTitle className="text-2xl flex items-center justify-center gap-2">
              <PartyPopper className="w-6 h-6 text-primary" />
              Parabéns!
              <PartyPopper className="w-6 h-6 text-primary" />
            </DialogTitle>
            <DialogDescription className="text-base mt-4">
              {winnerType === "team" ? (
                <>
                  Seu time <span className="font-bold text-foreground">{winnerName}</span> venceu a competição!
                </>
              ) : (
                <>Você venceu a competição!</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-4">
            <div className="bg-primary/10 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Você vai receber</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(payoutValue)}</p>
            </div>

            <p className="text-sm text-muted-foreground">
              O host da competição vai entrar em contato para entregar o prêmio.
            </p>
          </div>

          <Button onClick={onClose} variant="hero" className="w-full" size="lg">
            Entendi
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  if (status === "loser") {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <Heart className="w-10 h-10 text-muted-foreground" />
            </div>
            <DialogTitle className="text-2xl flex items-center justify-center gap-2">
              💪 Boa tentativa!
            </DialogTitle>
            <DialogDescription className="text-base mt-4">
              Não foi dessa vez, mas continua firme!
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-4">
            <p className="text-muted-foreground">
              Participe de outras competições e tente de novo — você está evoluindo.
            </p>
          </div>

          <Button onClick={onClose} variant="outline" className="w-full" size="lg">
            Entendi
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  // no_winner
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <XCircle className="w-10 h-10 text-muted-foreground" />
          </div>
          <DialogTitle className="text-2xl">
            Competição finalizada
          </DialogTitle>
          <DialogDescription className="text-base mt-4">
            A meta não foi atingida, então não houve vencedor desta vez.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <p className="text-muted-foreground">
            Participe das próximas e vamos pra cima!
          </p>
        </div>

        <Button onClick={onClose} variant="outline" className="w-full" size="lg">
          Entendi
        </Button>
      </DialogContent>
    </Dialog>
  );
}