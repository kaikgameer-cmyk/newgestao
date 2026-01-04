-- ==============================================
-- SISTEMA DE AVALIAÇÃO COM CAMPANHAS
-- ==============================================

-- Tabela de campanhas de feedback
CREATE TABLE public.feedback_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'O que está achando do nosso sistema?',
  subtitle TEXT NOT NULL DEFAULT 'Conte pra gente o que podemos melhorar',
  is_active BOOLEAN NOT NULL DEFAULT false,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de respostas de feedback
CREATE TABLE public.feedback_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.feedback_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stars SMALLINT NULL CHECK (stars >= 1 AND stars <= 5),
  comment TEXT NULL,
  status TEXT NOT NULL CHECK (status IN ('submitted', 'dismissed')) DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  meta JSONB NULL,
  UNIQUE(campaign_id, user_id)
);

-- Habilitar RLS
ALTER TABLE public.feedback_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS PARA CAMPANHAS

-- Admin pode criar, ler, atualizar campanhas
CREATE POLICY "Admins can manage campaigns"
  ON public.feedback_campaigns
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Usuários podem ver apenas campanhas ativas (campos limitados via código)
CREATE POLICY "Users can view active campaigns"
  ON public.feedback_campaigns
  FOR SELECT
  USING (is_active = true AND (ends_at IS NULL OR ends_at > now()));

-- POLÍTICAS PARA RESPOSTAS

-- Usuários podem inserir apenas sua própria resposta
CREATE POLICY "Users can insert own response"
  ON public.feedback_responses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem ver apenas suas próprias respostas
CREATE POLICY "Users can view own responses"
  ON public.feedback_responses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins podem ver todas as respostas
CREATE POLICY "Admins can view all responses"
  ON public.feedback_responses
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Índices para performance
CREATE INDEX idx_feedback_campaigns_active ON public.feedback_campaigns(is_active) WHERE is_active = true;
CREATE INDEX idx_feedback_responses_campaign ON public.feedback_responses(campaign_id);
CREATE INDEX idx_feedback_responses_user ON public.feedback_responses(user_id);
CREATE INDEX idx_feedback_responses_status ON public.feedback_responses(status);

-- Trigger para atualizar updated_at nas campanhas
CREATE TRIGGER update_feedback_campaigns_updated_at
  BEFORE UPDATE ON public.feedback_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime para respostas
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback_responses;