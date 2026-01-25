import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface WhatsAppConnection {
  id: string;
  user_id: string;
  status: "disconnected" | "pending" | "connected" | "error";
  waba_id: string | null;
  phone_number_id: string | null;
  business_phone: string | null;
  access_token_masked: string | null;
  verify_token: string;
  whatsapp_enabled: boolean;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export function useWhatsAppConnection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: connection, isLoading } = useQuery({
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

  const createConnection = useMutation({
    mutationFn: async (params: {
      waba_id: string;
      phone_number_id: string;
      access_token: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("whatsapp_connections")
        .upsert({
          user_id: user.id,
          waba_id: params.waba_id,
          phone_number_id: params.phone_number_id,
          access_token_encrypted: params.access_token,
          status: "pending",
        }, { onConflict: "user_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connection"] });
    },
  });

  const testConnection = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("whatsapp-test-connection", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connection"] });
    },
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("whatsapp_connections")
        .update({ 
          status: "disconnected",
          access_token_encrypted: null,
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
    createConnection,
    testConnection,
    disconnect,
    toggleEnabled,
  };
}
