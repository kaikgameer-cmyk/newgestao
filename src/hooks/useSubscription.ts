import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Subscription {
  id: string;
  user_id: string;
  kiwify_subscription_id: string;
  kiwify_product_id: string;
  plan_name: string;
  billing_interval: "month" | "quarter" | "year";
  status: "active" | "past_due" | "canceled";
  current_period_end: string;
  last_event: string | null;
  created_at: string;
  updated_at: string;
}

// Kiwify checkout links
export const KIWIFY_CHECKOUT_MENSAL = "https://pay.kiwify.com.br/YLOKFH1";
export const KIWIFY_CHECKOUT_TRIMESTRAL = "https://pay.kiwify.com.br/LPmRPJG";
export const KIWIFY_CHECKOUT_ANUAL = "https://pay.kiwify.com.br/vQFj0v8";

export function useSubscription() {
  const { user } = useAuth();

  const { data: subscription, isLoading, error, refetch } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching subscription:", error);
        throw error;
      }

      return data as Subscription | null;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Check if subscription is active
  const isActive = (): boolean => {
    if (!subscription) return false;
    if (subscription.status !== "active") return false;
    
    const periodEnd = new Date(subscription.current_period_end);
    const now = new Date();
    
    return periodEnd > now;
  };

  // Check if subscription is past due (grace period)
  const isPastDue = (): boolean => {
    return subscription?.status === "past_due";
  };

  // Check if subscription is canceled
  const isCanceled = (): boolean => {
    return subscription?.status === "canceled";
  };

  // Get days remaining in subscription
  const getDaysRemaining = (): number => {
    if (!subscription) return 0;
    
    const periodEnd = new Date(subscription.current_period_end);
    const now = new Date();
    const diffTime = periodEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  return {
    subscription,
    isLoading,
    error,
    refetch,
    isActive: isActive(),
    isPastDue: isPastDue(),
    isCanceled: isCanceled(),
    daysRemaining: getDaysRemaining(),
    hasSubscription: !!subscription,
  };
}
