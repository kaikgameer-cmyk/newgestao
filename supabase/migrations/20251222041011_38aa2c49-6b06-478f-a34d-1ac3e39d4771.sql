-- Tabela para logar webhooks recebidos (auditoria e idempotência)
CREATE TABLE public.webhook_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL DEFAULT 'kiwify',
  order_id text NOT NULL,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'received',
  payload jsonb NOT NULL DEFAULT '{}',
  response jsonb,
  processed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índice único para evitar processamento duplicado do mesmo order_id + event_type
CREATE UNIQUE INDEX idx_webhook_logs_order_event ON public.webhook_logs (source, order_id, event_type);

-- Índice para consultas rápidas
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs (created_at DESC);
CREATE INDEX idx_webhook_logs_source_status ON public.webhook_logs (source, status);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Apenas service_role pode ler/escrever (backend)
CREATE POLICY "Only service role can manage webhook logs"
ON public.webhook_logs
FOR ALL
USING ((auth.jwt() ->> 'role') = 'service_role')
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- Admin pode visualizar para debugging
CREATE POLICY "Admins can view webhook logs"
ON public.webhook_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));