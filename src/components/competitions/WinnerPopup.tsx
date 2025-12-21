import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, PartyPopper } from "lucide-react";

interface WinnerPopupProps {
  open: boolean;
  onClose: () => void;
  winnerType: "team" | "individual";
  winnerName: string;
  winnerScore: number;
}

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function WinnerPopup({ open, onClose, winnerType, winnerName, winnerScore }: WinnerPopupProps) {
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
              <>
                Você venceu a competição!
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <div className="bg-primary/10 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Pontuação Final</p>
            <p className="text-3xl font-bold text-primary">{formatCurrency(winnerScore)}</p>
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
