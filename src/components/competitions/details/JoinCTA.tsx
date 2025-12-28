import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, Trophy } from "lucide-react";

interface JoinCTAProps {
  isJoinable: boolean;
  participantsCount: number;
  prizeValue: number;
  onJoinClick: () => void;
}

export function JoinCTA({ isJoinable, participantsCount, prizeValue, onJoinClick }: JoinCTAProps) {
  if (!isJoinable) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Trophy className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">Competição Encerrada</h3>
          <p className="text-sm text-muted-foreground">
            Esta competição já foi finalizada e não aceita mais participantes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold mb-2">Entre na Competição!</h3>
        <p className="text-muted-foreground mb-4 max-w-sm">
          Junte-se a {participantsCount} participante{participantsCount !== 1 ? "s" : ""} e 
          concorra ao prêmio de R$ {prizeValue.toLocaleString("pt-BR")}.
        </p>
        <Button 
          size="lg" 
          onClick={() => {
            console.log("enter competition clicked", { participantsCount, prizeValue });
            onJoinClick();
          }}
          className="gap-2"
        >
          <UserPlus className="w-5 h-5" />
          Participar Agora
        </Button>
      </CardContent>
    </Card>
  );
}
