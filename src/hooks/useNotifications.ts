import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Winner {
  user_id: string;
  name: string;
  whatsapp: string | null;
  pix_key: string | null;
  payout_value: number;
}

interface HostNotificationPayload {
  competition_code: string;
  competition_name: string;
  prize_value: number;
  goal_value: number;
  winner_team_name?: string;
  winners?: Winner[];
  message: string;
}

export interface HostNotification {
  id: string;
  user_id: string;
  type: "competition_host_payout" | "competition_host_no_winner";
  competition_id: string;
  payload: HostNotificationPayload;
  created_at: string;
  read_at: string | null;
}

export function useUnreadHostNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unread-host-notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user?.id)
        .in("type", ["competition_host_payout", "competition_host_no_winner"])
        .is("read_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return (data || []).map((n) => ({
        ...n,
        payload: n.payload as unknown as HostNotificationPayload,
      })) as HostNotification[];
    },
    enabled: !!user,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unread-host-notifications"] });
    },
  });
}