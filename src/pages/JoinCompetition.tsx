import { useSearchParams } from "react-router-dom";
import JoinCompetitionForm from "@/components/competitions/JoinCompetitionForm";
import { Trophy } from "lucide-react";

export default function JoinCompetition() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code") || "";

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary" />
          Entrar em Competição
        </h1>
        <p className="text-muted-foreground mt-1">
          Digite o código e senha para participar
        </p>
      </div>

      <JoinCompetitionForm initialCode={code} />
    </div>
  );
}
