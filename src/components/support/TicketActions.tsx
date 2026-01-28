import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Archive, MoreVertical, RotateCcw, Trash2, CheckCircle2 } from "lucide-react";

interface TicketActionsProps {
  ticketId: string;
  status: string;
  onArchive: (ticketId: string) => void;
  onDelete: (ticketId: string) => void;
  onReopen: (ticketId: string) => void;
  onResolve: (ticketId: string) => void;
  isDeleting?: boolean;
}

export function TicketActions({
  ticketId,
  status,
  onArchive,
  onDelete,
  onReopen,
  onResolve,
  isDeleting,
}: TicketActionsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isResolved = status === "resolved";
  const isClosed = status === "closed";
  const isOpen = status === "open" || status === "pending";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-popover z-50">
          {isOpen && (
            <DropdownMenuItem onClick={() => onResolve(ticketId)}>
              <CheckCircle2 className="mr-2 h-4 w-4 text-positive" />
              Marcar como resolvido
            </DropdownMenuItem>
          )}
          
          {(isResolved || isClosed) && (
            <DropdownMenuItem onClick={() => onReopen(ticketId)}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reabrir ticket
            </DropdownMenuItem>
          )}
          
          {!isClosed && (
            <DropdownMenuItem onClick={() => onArchive(ticketId)}>
              <Archive className="mr-2 h-4 w-4" />
              Arquivar
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir ticket
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O ticket e todas as mensagens serão permanentemente excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(ticketId);
                setDeleteDialogOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
