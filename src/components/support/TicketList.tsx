import { useTickets } from "@/hooks/useSupport";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, TicketIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketListProps {
  userId: string;
  isAdmin: boolean;
  onSelectTicket: (ticketId: string) => void;
  selectedTicketId: string | null;
}

export function TicketList({
  userId,
  isAdmin,
  onSelectTicket,
  selectedTicketId,
}: TicketListProps) {
  const { data: tickets, isLoading } = useTickets(userId, isAdmin);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <TicketIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-muted-foreground">
          {isAdmin ? "Nenhum ticket aberto no momento" : "Você ainda não abriu nenhum ticket"}
        </p>
        {!isAdmin && (
          <p className="text-sm text-muted-foreground mt-2">
            Clique em "Novo Ticket" para começar
          </p>
        )}
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      open: { variant: "default", label: "Aberto" },
      pending: { variant: "secondary", label: "Pendente" },
      resolved: { variant: "outline", label: "Resolvido" },
      closed: { variant: "outline", label: "Fechado" },
    };
    return variants[status] || variants.open;
  };

  return (
    <div className="flex-1 overflow-auto p-4 space-y-2">
      {tickets.map((ticket) => {
        const statusInfo = getStatusBadge(ticket.status);
        const isSelected = ticket.id === selectedTicketId;

        return (
          <Card
            key={ticket.id}
            className={cn(
              "p-4 cursor-pointer hover:bg-accent/50 transition-colors",
              isSelected && "bg-accent border-primary"
            )}
            onClick={() => onSelectTicket(ticket.id)}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">
                  {ticket.subject || `Ticket #${ticket.id.slice(0, 8)}`}
                </h3>
                {isAdmin && ticket.profiles && (
                  <p className="text-xs text-muted-foreground truncate">
                    {ticket.profiles.name || ticket.profiles.email || "Usuário"}
                  </p>
                )}
              </div>
              <Badge variant={statusInfo.variant as any} className="shrink-0">
                {statusInfo.label}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {formatDistanceToNow(new Date(ticket.last_message_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
              {ticket.unread_count && ticket.unread_count > 0 ? (
                <Badge variant="destructive" className="h-5 min-w-5 px-1.5">
                  {ticket.unread_count}
                </Badge>
              ) : null}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
