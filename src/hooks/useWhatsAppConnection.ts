import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface WhatsAppConnection {
  id: string;
  user_id: string;
  status: "disconnected" | "pending" | "connected" | "error";
  wa_phone: string | null;
  wa_contact_id: string | null;
  waba_id: string | null;
  phone_number_id: string | null;
  business_phone: string | null;
  access_token_masked: string | null;
  verify_token: string;
  whatsapp_enabled: boolean;
  last_error: string | null;
  connected_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PairingCodeResponse {
  code: string;
  expires_at: string;
  wa_link: string;
  bot_phone: string;
}

export function useWhatsAppConnection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: connection, isLoading, refetch } = useQuery({
    queryKey: ["whatsapp-connection", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("whatsapp_connections_safe")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as WhatsAppConnection | null;
    },
    enabled: !!user,
  });

  const createPairingCode = useMutation({
    mutationFn: async (): Promise<PairingCodeResponse> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("create-pairing-code", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to create pairing code");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data as PairingCodeResponse;
    },
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("whatsapp_connections")
        .update({ 
          status: "disconnected",
          wa_phone: null,
          wa_contact_id: null,
          whatsapp_enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connection"] });
    },
  });

  const toggleEnabled = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("whatsapp_connections")
        .update({ 
          whatsapp_enabled: enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connection"] });
    },
  });

  return {
    connection,
    isLoading,
    refetch,
    createPairingCode,
    disconnect,
    toggleEnabled,
  };
}
