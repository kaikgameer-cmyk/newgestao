import { useState, useMemo } from "react";
import { useTickets } from "@/hooks/useSupport";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, TicketIcon, ArrowUp, ArrowDown, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type StatusFilter = "all" | "open" | "pending" | "resolved";
type SortOrder = "newest" | "oldest";

interface TicketListProps {
  userId: string;
  isAdmin: boolean;
  onSelectTicket: (ticketId: string) => void;
  selectedTicketId: string | null;
}

function getInitials(name: string | null | undefined, firstName?: string | null, lastName?: string | null): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (name) {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return "U";
}

function getStatusConfig(status: string) {
  const configs: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; color: string }> = {
    open: { label: "Aberto", variant: "default", color: "bg-green-500" },
    pending: { label: "Pendente", variant: "secondary", color: "bg-yellow-500" },
    resolved: { label: "Resolvido", variant: "outline", color: "bg-blue-500" },
    closed: { label: "Fechado", variant: "outline", color: "bg-muted-foreground" },
  };
  return configs[status] || configs.open;
}

export function TicketList({
  userId,
  isAdmin,
  onSelectTicket,
  selectedTicketId,
}: TicketListProps) {
  const { data: tickets, isLoading } = useTickets(userId, isAdmin);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    let result = statusFilter === "all" 
      ? [...tickets] 
      : tickets.filter((ticket) => ticket.status === statusFilter);
    
    result.sort((a, b) => {
      const dateA = new Date(a.last_message_at).getTime();
      const dateB = new Date(b.last_message_at).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
    
    return result;
  }, [tickets, statusFilter, sortOrder]);

  const statusCounts = useMemo(() => {
    if (!tickets) return { all: 0, open: 0, pending: 0, resolved: 0 };
    return {
      all: tickets.length,
      open: tickets.filter(t => t.status === "open").length,
      pending: tickets.filter(t => t.status === "pending").length,
      resolved: tickets.filter(t => t.status === "resolved" || t.status === "closed").length,
    };
  }, [tickets]);

  const statusFilters: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "open", label: "Abertos" },
    { value: "pending", label: "Pendentes" },
    { value: "resolved", label: "Resolvidos" },
  ];

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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Status Filters & Sort */}
      <div className="p-3 border-b border-border space-y-2">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)} className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-9">
            {statusFilters.map((filter) => (
              <TabsTrigger 
                key={filter.value} 
                value={filter.value}
                className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {filter.label}
                {statusCounts[filter.value] > 0 && (
                  <span className="text-[10px] opacity-70">
                    ({statusCounts[filter.value]})
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        
        <button
          onClick={() => setSortOrder(prev => prev === "newest" ? "oldest" : "newest")}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          {sortOrder === "newest" ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUp className="h-3 w-3" />
          )}
          {sortOrder === "newest" ? "Mais recentes primeiro" : "Mais antigos primeiro"}
        </button>
      </div>

      {/* Ticket List */}
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <TicketIcon className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhum ticket {statusFilter !== "all" ? `com status "${statusFilters.find(f => f.value === statusFilter)?.label}"` : "encontrado"}
            </p>
          </div>
        ) : (
          filteredTickets.map((ticket) => {
            const statusInfo = getStatusConfig(ticket.status);
            const isSelected = ticket.id === selectedTicketId;
            const authorName = ticket.profiles?.first_name && ticket.profiles?.last_name
              ? `${ticket.profiles.first_name} ${ticket.profiles.last_name}`
              : ticket.profiles?.name || ticket.profiles?.email || "Usuário";
            const authorInitials = getInitials(
              ticket.profiles?.name,
              ticket.profiles?.first_name,
              ticket.profiles?.last_name
            );

            return (
              <Card
                key={ticket.id}
                className={cn(
                  "p-3 cursor-pointer hover:bg-accent/50 transition-colors",
                  isSelected && "bg-accent border-primary ring-1 ring-primary/20"
                )}
                onClick={() => onSelectTicket(ticket.id)}
              >
                <div className="flex gap-3">
                  {/* Avatar do autor (visível apenas para admin) */}
                  {isAdmin && (
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={ticket.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {authorInitials}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    {/* Header: título + badge */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-sm truncate flex-1">
                        {ticket.subject || `Ticket #${ticket.id.slice(0, 8)}`}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn("h-2 w-2 rounded-full", statusInfo.color)} />
                        <span className="text-[10px] text-muted-foreground">{statusInfo.label}</span>
                      </div>
                    </div>
                    
                    {/* Author name (for admin) */}
                    {isAdmin && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                        <User className="h-3 w-3" />
                        {authorName}
                      </p>
                    )}
                    
                    {/* Preview da última mensagem */}
                    {ticket.last_message_preview && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5">
                        {ticket.last_message_preview}
                      </p>
                    )}
                    
                    {/* Footer: tempo + unread */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {formatDistanceToNow(new Date(ticket.last_message_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                      {ticket.unread_count && ticket.unread_count > 0 ? (
                        <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-[10px]">
                          {ticket.unread_count > 9 ? "9+" : ticket.unread_count}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
