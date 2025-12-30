import { useEffect, useRef, useState } from "react";
import { useTicketMessages, useSendMessage, useMarkTicketRead, useUpdateTicketStatus, useTickets, SupportMessage } from "@/hooks/useSupport";
import { useSupportRole } from "@/hooks/useSupportAccess";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send, Image as ImageIcon, Loader2, AlertCircle, User, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";
import { SupportAttachmentPreview } from "./SupportAttachmentPreview";
import { toast } from "@/hooks/use-toast";

interface TicketChatProps {
  ticketId: string;
  userId: string;
  isAdmin: boolean;
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

function getSenderDisplayName(msg: SupportMessage, isCurrentUser: boolean): string {
  if (isCurrentUser) return "Você";
  
  if (msg.sender_role === "admin" || msg.sender_role === "support") {
    const roleName = msg.sender_role === "admin" ? "Admin" : "Suporte";
    if (msg.sender_profile?.first_name) {
      return `${roleName} · ${msg.sender_profile.first_name}`;
    }
    if (msg.sender_profile?.name) {
      return `${roleName} · ${msg.sender_profile.name.split(" ")[0]}`;
    }
    return roleName;
  }
  
  if (msg.sender_profile?.first_name && msg.sender_profile?.last_name) {
    return `${msg.sender_profile.first_name} ${msg.sender_profile.last_name}`;
  }
  if (msg.sender_profile?.name) {
    return msg.sender_profile.name;
  }
  return "Usuário";
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

export function TicketChat({ ticketId, userId, isAdmin }: TicketChatProps) {
  const queryClient = useQueryClient();
  const { role: userRole } = useSupportRole();
  const { data: messages, isLoading } = useTicketMessages(ticketId);
  const { data: tickets } = useTickets(userId, isAdmin);
  const sendMessage = useSendMessage();
  const markRead = useMarkTicketRead();
  const updateStatus = useUpdateTicketStatus();

  const [messageInput, setMessageInput] = useState("");
  const [attachments, setAttachments] = useState<Array<{ file: File; preview: string }>>([]);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ticket = tickets?.find((t) => t.id === ticketId);
  const isClosed = ticket?.status === "resolved" || ticket?.status === "closed";
  const statusConfig = getStatusConfig(ticket?.status || "open");

  // Ticket owner info
  const ticketOwnerName = ticket?.profiles?.first_name && ticket?.profiles?.last_name
    ? `${ticket.profiles.first_name} ${ticket.profiles.last_name}`
    : ticket?.profiles?.name || ticket?.profiles?.email || "Usuário";
  const ticketOwnerInitials = getInitials(
    ticket?.profiles?.name,
    ticket?.profiles?.first_name,
    ticket?.profiles?.last_name
  );

  // Mark as read when opening
  useEffect(() => {
    if (ticketId) {
      markRead.mutate({ ticketId, userId });
    }
  }, [ticketId, userId]);

  // Realtime subscription for new messages
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
          // Refetch messages when new one arrives
          queryClient.invalidateQueries({ queryKey: ["support-messages", ticketId] });
          queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
          markRead.mutate({ ticketId, userId });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, userId, queryClient]);

  // Smart scroll - only auto-scroll if user is at bottom
  useEffect(() => {
    if (!isUserScrolling && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isUserScrolling]);

  // Detect if user is scrolling up
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setIsUserScrolling(!isAtBottom);
  };

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

    // Reset scroll behavior before sending
    setIsUserScrolling(false);

    sendMessage.mutate(
      {
        ticketId,
        userId,
        role: userRole,
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
      {/* Professional Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Avatar do usuário que abriu o ticket (visível apenas para staff) */}
            {isAdmin && (
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={ticket?.profiles?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {ticketOwnerInitials}
                </AvatarFallback>
              </Avatar>
            )}
            
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-base truncate">
                {ticket?.subject || `Ticket #${ticketId.slice(0, 8)}`}
              </h2>
              
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {isAdmin ? (
                  <span className="text-sm text-muted-foreground">
                    <User className="h-3 w-3 inline mr-1" />
                    {ticketOwnerName}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Headphones className="h-3 w-3" />
                    Conversando com Suporte
                  </span>
                )}
                
                {/* Status indicator */}
                <div className="flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", statusConfig.color)} />
                  <span className="text-xs text-muted-foreground">{statusConfig.label}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Status changer for staff */}
          {isAdmin && ticket && (
            <Select
              value={ticket.status}
              onValueChange={(value: any) =>
                updateStatus.mutate({ ticketId, status: value })
              }
            >
              <SelectTrigger className="w-32 h-9">
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
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto p-4 space-y-4"
      >
        {messages?.map((msg) => {
          const isOwn = msg.sender_id === userId;
          const isStaffMsg = msg.sender_role === "admin" || msg.sender_role === "support";
          const senderName = getSenderDisplayName(msg, isOwn);
          const senderInitials = getInitials(
            msg.sender_profile?.name,
            msg.sender_profile?.first_name,
            msg.sender_profile?.last_name
          );

          return (
            <div
              key={msg.id}
              className={cn("flex gap-2", isOwn ? "justify-end" : "justify-start")}
            >
              {/* Avatar for other person's messages */}
              {!isOwn && (
                <Avatar className="h-8 w-8 shrink-0 mt-1">
                  <AvatarImage src={msg.sender_profile?.avatar_url || undefined} />
                  <AvatarFallback className={cn(
                    "text-xs",
                    isStaffMsg ? "bg-primary/20 text-primary" : "bg-muted"
                  )}>
                    {isStaffMsg ? (msg.sender_role === "admin" ? "AD" : "SP") : senderInitials}
                  </AvatarFallback>
                </Avatar>
              )}
              
              <Card
                className={cn(
                  "max-w-[75%] sm:max-w-[70%] p-3",
                  isStaffMsg && !isOwn && "bg-primary/10 border-primary/20",
                  isOwn && "bg-accent"
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={cn(
                    "text-xs font-medium",
                    isStaffMsg ? "text-primary" : "text-muted-foreground"
                  )}>
                    {senderName}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                  </span>
                </div>
                
                {msg.message && (
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                )}
                
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className={cn("flex flex-wrap gap-2", msg.message && "mt-2")}>
                    {msg.attachments.map((att, idx) => (
                      <SupportAttachmentPreview key={idx} attachment={att} />
                    ))}
                  </div>
                )}
                
                {/* Date shown on first message or new day */}
                <div className="text-[10px] text-muted-foreground mt-1 text-right">
                  {format(new Date(msg.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </div>
              </Card>
              
              {/* Avatar for own messages */}
              {isOwn && (
                <Avatar className="h-8 w-8 shrink-0 mt-1">
                  <AvatarImage src={msg.sender_profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-muted">
                    {senderInitials}
                  </AvatarFallback>
                </Avatar>
              )}
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
        <div className="p-3 sm:p-4 border-t border-border bg-card">
          {attachments.length > 0 && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {attachments.map((att, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={att.preview}
                    alt="preview"
                    className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded border border-border"
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
              className="shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={attachments.length >= 3 || sendMessage.isPending}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1 min-h-[50px] sm:min-h-[60px] max-h-32 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              onClick={handleSend}
              className="shrink-0"
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
