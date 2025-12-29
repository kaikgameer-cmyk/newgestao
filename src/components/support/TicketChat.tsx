import { useEffect, useRef, useState } from "react";
import { useTicketMessages, useSendMessage, useMarkTicketRead, useUpdateTicketStatus, useTickets } from "@/hooks/useSupport";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send, Image as ImageIcon, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface TicketChatProps {
  ticketId: string;
  userId: string;
  isAdmin: boolean;
}

export function TicketChat({ ticketId, userId, isAdmin }: TicketChatProps) {
  const { data: messages, isLoading } = useTicketMessages(ticketId);
  const { data: tickets } = useTickets(userId, isAdmin);
  const sendMessage = useSendMessage();
  const markRead = useMarkTicketRead();
  const updateStatus = useUpdateTicketStatus();

  const [messageInput, setMessageInput] = useState("");
  const [attachments, setAttachments] = useState<Array<{ file: File; preview: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ticket = tickets?.find((t) => t.id === ticketId);
  const isClosed = ticket?.status === "resolved" || ticket?.status === "closed";

  // Mark as read when opening
  useEffect(() => {
    if (ticketId) {
      markRead.mutate({ ticketId, userId });
    }
  }, [ticketId, userId]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`support-messages-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          // Refetch messages on new insert
          markRead.mutate({ ticketId, userId });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, userId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!messageInput.trim() && attachments.length === 0) return;
    if (isClosed) {
      toast({
        title: "Ticket finalizado",
        description: "Não é possível enviar mensagens em um ticket fechado.",
        variant: "destructive",
      });
      return;
    }

    let uploadedAttachments: Array<{ path: string; url: string; type: string; size: number; name: string }> = [];

    // Upload attachments
    if (attachments.length > 0) {
      try {
        uploadedAttachments = await Promise.all(
          attachments.map(async (att) => {
            const fileExt = att.file.name.split(".").pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `support/${userId}/${ticketId}/${Date.now()}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from("support-attachments")
              .upload(filePath, att.file, {
                cacheControl: "3600",
                upsert: false,
              });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
              .from("support-attachments")
              .getPublicUrl(filePath);

            return {
              path: filePath,
              url: urlData.publicUrl,
              type: att.file.type,
              size: att.file.size,
              name: att.file.name,
            };
          })
        );
      } catch (error: any) {
        console.error("Error uploading attachments:", error);
        toast({
          title: "Erro ao enviar anexos",
          description: error.message || "Tente novamente.",
          variant: "destructive",
        });
        return;
      }
    }

    sendMessage.mutate(
      {
        ticketId,
        userId,
        role: isAdmin ? "admin" : "user",
        message: messageInput.trim(),
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      },
      {
        onSuccess: () => {
          setMessageInput("");
          setAttachments([]);
        },
      }
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + attachments.length > 3) {
      toast({
        title: "Muitos arquivos",
        description: "Você pode enviar no máximo 3 imagens por mensagem.",
        variant: "destructive",
      });
      return;
    }

    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Arquivo inválido",
          description: `${file.name} não é uma imagem.`,
          variant: "destructive",
        });
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: `${file.name} excede 5MB.`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAttachments((prev) => [
          ...prev,
          { file, preview: e.target?.result as string },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-semibold">
            {ticket?.subject || `Ticket #${ticketId.slice(0, 8)}`}
          </h2>
          {isAdmin && ticket?.profiles && (
            <p className="text-sm text-muted-foreground">
              {ticket.profiles.name || ticket.profiles.email}
            </p>
          )}
        </div>
        {isAdmin && ticket && (
          <Select
            value={ticket.status}
            onValueChange={(value: any) =>
              updateStatus.mutate({ ticketId, status: value })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Aberto</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="resolved">Resolvido</SelectItem>
              <SelectItem value="closed">Fechado</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages?.map((msg) => {
          const isOwn = msg.sender_id === userId;
          const isAdminMsg = msg.sender_role === "admin";

          return (
            <div
              key={msg.id}
              className={cn("flex", isOwn ? "justify-end" : "justify-start")}
            >
              <Card
                className={cn(
                  "max-w-[80%] p-3",
                  isAdminMsg && "bg-primary/10 border-primary/20",
                  isOwn && !isAdminMsg && "bg-accent"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={isAdminMsg ? "default" : "secondary"} className="text-xs">
                    {isAdminMsg ? "Admin" : "Você"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(msg.created_at), "HH:mm - dd/MM", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {msg.attachments.map((att, idx) => (
                      <a
                        key={idx}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={att.url}
                          alt={att.name}
                          className="max-w-full rounded border border-border"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {isClosed ? (
        <div className="p-4 border-t border-border bg-muted/50">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">
              Ticket finalizado. {!isAdmin && "Abra um novo ticket para continuar."}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-4 border-t border-border">
          {attachments.length > 0 && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {attachments.map((att, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={att.preview}
                    alt="preview"
                    className="w-16 h-16 object-cover rounded border border-border"
                  />
                  <button
                    onClick={() => handleRemoveAttachment(idx)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={attachments.length >= 3 || sendMessage.isPending}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1 min-h-[60px] max-h-32 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              onClick={handleSend}
              disabled={
                (!messageInput.trim() && attachments.length === 0) ||
                sendMessage.isPending
              }
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
