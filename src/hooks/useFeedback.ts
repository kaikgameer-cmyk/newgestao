import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

interface FeedbackCampaign {
  id: string;
  created_by: string;
  title: string;
  subtitle: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  target_user_ids: string[] | null;
}

interface FeedbackResponse {
  id: string;
  campaign_id: string;
  user_id: string;
  stars: number | null;
  comment: string | null;
  status: 'submitted' | 'dismissed';
  submitted_at: string;
  meta: Record<string, unknown> | null;
  profiles?: {
    name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

interface CampaignStats {
  total: number;
  submitted: number;
  dismissed: number;
  pending: number;
  avgStars: number;
  starDistribution: Record<number, number>;
}

export function useFeedback() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar campanha ativa para o usuário (considerando targeting)
  const { data: activeCampaign, isLoading: isLoadingCampaign } = useQuery({
    queryKey: ["active-feedback-campaign", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("feedback_campaigns")
        .select("*")
        .eq("is_active", true)
        .or("ends_at.is.null,ends_at.gt.now()")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Filtrar campanhas que são para todos (target_user_ids = null) 
      // ou que incluem o usuário atual
      const campaigns = (data as FeedbackCampaign[]) || [];
      const targetedCampaign = campaigns.find((c) => 
        c.target_user_ids === null || c.target_user_ids.includes(user.id)
      );
      
      return targetedCampaign || null;
    },
    enabled: !!user,
  });

  // Verificar se o usuário já respondeu a campanha ativa
  const { data: userResponse, isLoading: isLoadingResponse } = useQuery({
    queryKey: ["user-feedback-response", activeCampaign?.id, user?.id],
    queryFn: async () => {
      if (!activeCampaign || !user) return null;

      const { data, error } = await supabase
        .from("feedback_responses")
        .select("*")
        .eq("campaign_id", activeCampaign.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as FeedbackResponse | null;
    },
    enabled: !!activeCampaign && !!user,
  });

  // Enviar resposta
  const submitResponse = useMutation({
    mutationFn: async ({ stars, comment }: { stars: number; comment?: string }) => {
      if (!activeCampaign || !user) throw new Error("Campanha ou usuário não encontrado");

      const { error } = await supabase.from("feedback_responses").insert({
        campaign_id: activeCampaign.id,
        user_id: user.id,
        stars,
        comment: comment || null,
        status: "submitted",
        meta: {
          userAgent: navigator.userAgent,
          route: window.location.pathname,
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-feedback-response"] });
      queryClient.invalidateQueries({ queryKey: ["feedback-responses"] });
    },
  });

  // Dispensar (fechar sem responder)
  const dismissResponse = useMutation({
    mutationFn: async () => {
      if (!activeCampaign || !user) throw new Error("Campanha ou usuário não encontrado");

      const { error } = await supabase.from("feedback_responses").insert({
        campaign_id: activeCampaign.id,
        user_id: user.id,
        stars: null,
        comment: null,
        status: "dismissed",
        meta: {
          userAgent: navigator.userAgent,
          route: window.location.pathname,
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-feedback-response"] });
      queryClient.invalidateQueries({ queryKey: ["feedback-responses"] });
    },
  });

  // Determinar se deve mostrar o modal (lógica básica, useFeedbackPrompt faz a lógica completa)
  const shouldShowModal = activeCampaign && !userResponse;

  return {
    activeCampaign,
    userResponse,
    shouldShowModal,
    isLoadingCampaign,
    isLoadingResponse,
    submitResponse,
    dismissResponse,
  };
}

// Hook para o Admin gerenciar campanhas
export function useFeedbackAdmin() {
  const queryClient = useQueryClient();

  // Buscar todas as campanhas
  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery({
    queryKey: ["feedback-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as FeedbackCampaign[];
    },
  });

  // Buscar respostas da campanha ativa
  const activeCampaign = campaigns.find((c) => c.is_active);

  const { data: responses = [], isLoading: loadingResponses } = useQuery({
    queryKey: ["feedback-responses", activeCampaign?.id],
    queryFn: async () => {
      if (!activeCampaign) return [];

      // Buscar respostas
      const { data: responsesData, error: responsesError } = await supabase
        .from("feedback_responses")
        .select("*")
        .eq("campaign_id", activeCampaign.id)
        .order("submitted_at", { ascending: false });

      if (responsesError) throw responsesError;
      if (!responsesData || responsesData.length === 0) return [];

      // Buscar perfis dos usuários que responderam
      const userIds = responsesData.map((r) => r.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, name, first_name, last_name, email")
        .in("user_id", userIds);

      // Combinar respostas com perfis
      return responsesData.map((r) => ({
        ...r,
        status: r.status as 'submitted' | 'dismissed',
        profiles: profilesData?.find((p) => p.user_id === r.user_id) || null,
      })) as FeedbackResponse[];
    },
    enabled: !!activeCampaign,
  });

  // Realtime para respostas
  useEffect(() => {
    if (!activeCampaign) return;

    const channel = supabase
      .channel("feedback-responses-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "feedback_responses",
          filter: `campaign_id=eq.${activeCampaign.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["feedback-responses"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCampaign?.id, queryClient]);

  // Calcular estatísticas
  const stats: CampaignStats = {
    total: responses.length,
    submitted: responses.filter((r) => r.status === "submitted").length,
    dismissed: responses.filter((r) => r.status === "dismissed").length,
    pending: 0, // Calculado no contexto total de usuários
    avgStars: 0,
    starDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };

  const submittedWithStars = responses.filter((r) => r.status === "submitted" && r.stars);
  if (submittedWithStars.length > 0) {
    stats.avgStars =
      submittedWithStars.reduce((sum, r) => sum + (r.stars || 0), 0) / submittedWithStars.length;
  }

  submittedWithStars.forEach((r) => {
    if (r.stars) {
      stats.starDistribution[r.stars] = (stats.starDistribution[r.stars] || 0) + 1;
    }
  });

  // Criar nova campanha (ativa = desativa outras automaticamente)
  const createCampaign = useMutation({
    mutationFn: async (params: { title?: string; subtitle?: string }) => {
      // Desativar campanhas existentes
      await supabase
        .from("feedback_campaigns")
        .update({ is_active: false })
        .eq("is_active", true);

      // Criar nova campanha ativa
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase.from("feedback_campaigns").insert({
        created_by: user.id,
        title: params.title || "O que está achando do nosso sistema?",
        subtitle: params.subtitle || "Conte pra gente o que podemos melhorar",
        is_active: true,
        starts_at: new Date().toISOString(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["active-feedback-campaign"] });
    },
  });

  // Encerrar campanha
  const endCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from("feedback_campaigns")
        .update({ is_active: false, ends_at: new Date().toISOString() })
        .eq("id", campaignId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["active-feedback-campaign"] });
    },
  });

  return {
    campaigns,
    activeCampaign,
    responses,
    stats,
    loadingCampaigns,
    loadingResponses,
    createCampaign,
    endCampaign,
  };
}
