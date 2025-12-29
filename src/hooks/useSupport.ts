import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string | null;
  status: "open" | "pending" | "resolved" | "closed";
  priority: "low" | "normal" | "high";
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  last_message_at: string;
  created_by_role: string;
  profiles?: {
    name: string | null;
    email: string | null;
  };
  unread_count?: number;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: "user" | "admin" | "support";
  message: string;
  attachments: Array<{
    path: string;
    url: string;
    type: string;
    size: number;
    name: string;
  }> | null;
  created_at: string;
}

export function useTickets(userId: string, isAdmin: boolean) {
  return useQuery({
    queryKey: ["support-tickets", userId, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from("support_tickets")
        .select(`
          *,
          profiles:user_id (name, email)
        `)
        .order("last_message_at", { ascending: false });

      if (!isAdmin) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get unread counts
      const ticketsWithUnread = await Promise.all(
        (data || []).map(async (ticket) => {
          const { data: readData } = await supabase
            .from("support_reads")
            .select("last_read_at")
            .eq("ticket_id", ticket.id)
            .eq("user_id", userId)
            .maybeSingle();

          const { count } = await supabase
            .from("support_messages")
            .select("*", { count: "exact", head: true })
            .eq("ticket_id", ticket.id)
            .gt(
              "created_at",
              readData?.last_read_at || new Date(0).toISOString()
            );

          return {
            ...ticket,
            unread_count: count || 0,
          };
        })
      );

      return ticketsWithUnread as SupportTicket[];
    },
    refetchInterval: 30000, // refetch every 30s
  });
}

export function useTicketMessages(ticketId: string | null) {
  return useQuery({
    queryKey: ["support-messages", ticketId],
    queryFn: async () => {
      if (!ticketId) return [];

      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return data as SupportMessage[];
    },
    enabled: !!ticketId,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      subject,
      message,
      attachments,
    }: {
      userId: string;
      subject?: string;
      message: string;
      attachments?: Array<{ path: string; url: string; type: string; size: number; name: string }>;
    }) => {
      // Create ticket
      const { data: ticket, error: ticketError } = await supabase
        .from("support_tickets")
        .insert({
          user_id: userId,
          subject: subject || null,
          status: "open",
          priority: "normal",
          created_by_role: "user",
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Create first message
      const { data: msg, error: msgError } = await supabase
        .from("support_messages")
        .insert({
          ticket_id: ticket.id,
          sender_id: userId,
          sender_role: "user",
          message,
          attachments: attachments || null,
        })
        .select()
        .single();

      if (msgError) throw msgError;

      return { ticket, message: msg };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      toast({
        title: "Ticket criado",
        description: "Seu ticket foi criado com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error("Error creating ticket:", error);
      toast({
        title: "Erro ao criar ticket",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      userId,
      role,
      message,
      attachments,
    }: {
      ticketId: string;
      userId: string;
      role: "user" | "admin" | "support";
      message: string;
      attachments?: Array<{ path: string; url: string; type: string; size: number; name: string }>;
    }) => {
      const { data, error } = await supabase
        .from("support_messages")
        .insert({
          ticket_id: ticketId,
          sender_id: userId,
          sender_role: role,
          message,
          attachments: attachments || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["support-messages", variables.ticketId],
      });
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
    onError: (error: any) => {
      console.error("Error sending message:", error);
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      status,
    }: {
      ticketId: string;
      status: "open" | "pending" | "resolved" | "closed";
    }) => {
      const updateData: any = { status };
      if (status === "resolved" || status === "closed") {
        updateData.resolved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("support_tickets")
        .update(updateData)
        .eq("id", ticketId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      toast({
        title: "Status atualizado",
        description: "O status do ticket foi atualizado.",
      });
    },
    onError: (error: any) => {
      console.error("Error updating ticket status:", error);
      toast({
        title: "Erro ao atualizar status",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });
}

export function useMarkTicketRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, userId }: { ticketId: string; userId: string }) => {
      const { error } = await supabase.from("support_reads").upsert(
        {
          ticket_id: ticketId,
          user_id: userId,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: "ticket_id,user_id" }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });
}
