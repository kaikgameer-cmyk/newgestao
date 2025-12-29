import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import { TicketList } from "@/components/support/TicketList";
import { TicketChat } from "@/components/support/TicketChat";
import { NewTicketModal } from "@/components/support/NewTicketModal";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Support() {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const isMobile = useIsMobile();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);

  if (!user) return null;

  const handleBackToList = () => {
    setSelectedTicketId(null);
  };

  const handleTicketCreated = (ticketId: string) => {
    setShowNewTicketModal(false);
    setSelectedTicketId(ticketId);
  };

  // Mobile: show either list or chat
  if (isMobile) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-background">
        {!selectedTicketId ? (
          <>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h1 className="text-2xl font-bold">Suporte</h1>
              <Button onClick={() => setShowNewTicketModal(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Novo Ticket
              </Button>
            </div>
            <div className="flex-1 overflow-auto">
              <TicketList
                userId={user.id}
                isAdmin={isAdmin}
                onSelectTicket={setSelectedTicketId}
                selectedTicketId={selectedTicketId}
              />
            </div>
          </>
        ) : (
          <>
            <div className="p-4 border-b border-border flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold">Ticket</h2>
            </div>
            <div className="flex-1 overflow-hidden">
              <TicketChat
                ticketId={selectedTicketId}
                userId={user.id}
                isAdmin={isAdmin}
              />
            </div>
          </>
        )}

        <NewTicketModal
          open={showNewTicketModal}
          onOpenChange={setShowNewTicketModal}
          onTicketCreated={handleTicketCreated}
          userId={user.id}
        />
      </div>
    );
  }

  // Desktop: split view
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-background">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <h1 className="text-3xl font-bold">Suporte</h1>
        <Button onClick={() => setShowNewTicketModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Ticket
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: ticket list */}
        <div className="w-96 border-r border-border flex flex-col">
          <TicketList
            userId={user.id}
            isAdmin={isAdmin}
            onSelectTicket={setSelectedTicketId}
            selectedTicketId={selectedTicketId}
          />
        </div>

        {/* Right: chat */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedTicketId ? (
            <TicketChat
              ticketId={selectedTicketId}
              userId={user.id}
              isAdmin={isAdmin}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <p className="text-lg">Selecione um ticket para visualizar</p>
                <p className="text-sm">Ou crie um novo ticket para começar</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <NewTicketModal
        open={showNewTicketModal}
        onOpenChange={setShowNewTicketModal}
        onTicketCreated={handleTicketCreated}
        userId={user.id}
      />
    </div>
  );
}
