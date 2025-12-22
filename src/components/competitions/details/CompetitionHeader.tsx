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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCompetitionStatus } from "@/lib/competitionUtils";

interface CompetitionHeaderProps {
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

  return (
    <div className="flex items-start gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate("/dashboard/competicoes")}
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>
      
      <div className="flex-1 space-y-2">
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
          <MarkdownRenderer content={description} className="text-muted-foreground text-sm" />
        )}
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
