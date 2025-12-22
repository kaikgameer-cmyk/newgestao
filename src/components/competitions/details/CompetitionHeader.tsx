import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import {
  ArrowLeft,
  Crown,
  Pencil,
  Trash2,
  Users,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCompetitionStatus } from "@/lib/competitionUtils";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CompetitionHeaderProps {
  competitionId: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  isHost: boolean;
  isMember: boolean;
  isFinished: boolean;
  allowTeams: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onManageTeams: () => void;
}

export function CompetitionHeader({
  competitionId,
  name,
  description,
  startDate,
  endDate,
  isHost,
  isMember,
  isFinished,
  allowTeams,
  onEdit,
  onDelete,
  onManageTeams,
}: CompetitionHeaderProps) {
  const navigate = useNavigate();
  const status = getCompetitionStatus(startDate, endDate);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  useEffect(() => {
    if (!description) return;
    if (typeof window === "undefined") return;
    const storageKey = `competition:${competitionId}:descExpanded`;
    const saved = window.localStorage.getItem(storageKey);
    setIsDescriptionExpanded(saved === "true");
  }, [competitionId, description]);

  const toggleDescription = () => {
    setIsDescriptionExpanded((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        const storageKey = `competition:${competitionId}:descExpanded`;
        window.localStorage.setItem(storageKey, String(next));
      }
      return next;
    });
  };

  return (
    <div className="flex items-start gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate("/dashboard/competicoes")}
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>
      
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold">{name}</h1>
          {isHost && (
            <Badge variant="outline" className="text-primary border-primary">
              <Crown className="w-3 h-3 mr-1" />
              Host
            </Badge>
          )}
          {isMember && !isHost && (
            <Badge variant="secondary" className="text-xs">
              <UserPlus className="w-3 h-3 mr-1" />
              Participando
            </Badge>
          )}
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        {description && (
          <section className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Sobre o desafio
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleDescription}
                className="h-7 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground gap-1"
              >
                <span>{isDescriptionExpanded ? "Recolher" : "Ver descrição completa"}</span>
                {isDescriptionExpanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </Button>
            </div>
            <div
              className={cn(
                "text-sm text-muted-foreground transition-all duration-300 overflow-hidden",
                isDescriptionExpanded ? "max-h-[480px]" : "max-h-16",
              )}
            >
              <MarkdownRenderer
                content={description}
                className={cn(
                  "prose prose-invert prose-sm max-w-none",
                  !isDescriptionExpanded && "line-clamp-3",
                )}
              />
            </div>
          </section>
        )}

        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Info className="w-3 h-3 text-primary" />
          <span>
            Nesta competição contam apenas receitas das plataformas 99, Uber e InDrive.
          </span>
        </div>
      </div>
      
      {/* Host Actions */}
      {isHost && !isFinished && (
        <div className="flex items-center gap-2">
          {allowTeams && (
            <Button
              variant="outline"
              size="sm"
              onClick={onManageTeams}
              title="Gerenciar Times"
            >
              <Users className="w-4 h-4 mr-1" />
              Times
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={onEdit}
            title="Editar Competição"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onDelete}
            title="Excluir Competição"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
