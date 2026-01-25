-- ============================================
-- WhatsApp Bot Integration - Database Schema
-- ============================================

-- Feature flag for WhatsApp (global settings table if not exists)
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default whatsapp_enabled flag (OFF by default)
INSERT INTO public.feature_flags (key, enabled)
VALUES ('whatsapp_enabled', false)
ON CONFLICT (key) DO NOTHING;

-- Enable RLS on feature_flags
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Only admins can manage feature flags
CREATE POLICY "Admins can manage feature flags"
ON public.feature_flags FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Anyone authenticated can read feature flags
CREATE POLICY "Authenticated users can read feature flags"
ON public.feature_flags FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- 1) whatsapp_connections
-- ============================================
CREATE TABLE public.whatsapp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'pending', 'connected', 'error')),
  waba_id text,
  phone_number_id text,
  business_phone text,
  access_token_encrypted text, -- Store encrypted, never expose
  verify_token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  whatsapp_enabled boolean NOT NULL DEFAULT true, -- Per-user feature flag
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for quick lookup by phone_number_id (webhook routing)
CREATE INDEX idx_whatsapp_connections_phone_number_id ON public.whatsapp_connections(phone_number_id);

-- Enable RLS
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;

-- Users can only see/manage their own connection
CREATE POLICY "Users can view own whatsapp connection"
ON public.whatsapp_connections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own whatsapp connection"
ON public.whatsapp_connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own whatsapp connection"
ON public.whatsapp_connections FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own whatsapp connection"
ON public.whatsapp_connections FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all connections
CREATE POLICY "Admins can view all whatsapp connections"
ON public.whatsapp_connections FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 2) whatsapp_inbound_messages
-- ============================================
CREATE TABLE public.whatsapp_inbound_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.whatsapp_connections(id) ON DELETE SET NULL,
  phone_number_id text NOT NULL,
  from_number text NOT NULL,
  message_id text NOT NULL UNIQUE, -- Meta's message ID for deduplication
  message_type text NOT NULL DEFAULT 'text',
  body_text text,
  raw_payload jsonb,
  processed boolean NOT NULL DEFAULT false,
  received_at timestamptz NOT NULL DEFAULT now()
);

-- Index for deduplication and lookups
CREATE INDEX idx_whatsapp_inbound_message_id ON public.whatsapp_inbound_messages(message_id);
CREATE INDEX idx_whatsapp_inbound_user_id ON public.whatsapp_inbound_messages(user_id);
CREATE INDEX idx_whatsapp_inbound_from_number ON public.whatsapp_inbound_messages(from_number);

-- Enable RLS
ALTER TABLE public.whatsapp_inbound_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own messages
CREATE POLICY "Users can view own inbound messages"
ON public.whatsapp_inbound_messages FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all inbound messages"
ON public.whatsapp_inbound_messages FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 3) whatsapp_drafts
-- ============================================
CREATE TABLE public.whatsapp_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inbound_message_id uuid REFERENCES public.whatsapp_inbound_messages(id) ON DELETE SET NULL,
  from_number text NOT NULL,
  message_id text NOT NULL UNIQUE, -- Link to inbound message_id for deduplication
  draft_type text NOT NULL CHECK (draft_type IN ('receita', 'despesa', 'combustivel', 'eletrico')),
  draft_payload jsonb NOT NULL, -- Normalized transaction structure
  status text NOT NULL DEFAULT 'awaiting_confirmation' CHECK (status IN ('awaiting_confirmation', 'confirmed', 'canceled', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  confirmed_at timestamptz
);

-- Indexes
CREATE INDEX idx_whatsapp_drafts_user_id ON public.whatsapp_drafts(user_id);
CREATE INDEX idx_whatsapp_drafts_status ON public.whatsapp_drafts(status);
CREATE INDEX idx_whatsapp_drafts_from_number ON public.whatsapp_drafts(from_number);
CREATE INDEX idx_whatsapp_drafts_message_id ON public.whatsapp_drafts(message_id);

-- Enable RLS
ALTER TABLE public.whatsapp_drafts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own drafts
CREATE POLICY "Users can view own drafts"
ON public.whatsapp_drafts FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all drafts"
ON public.whatsapp_drafts FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 4) whatsapp_outbound_messages (audit log)
-- ============================================
CREATE TABLE public.whatsapp_outbound_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.whatsapp_connections(id) ON DELETE SET NULL,
  to_number text NOT NULL,
  related_inbound_id uuid REFERENCES public.whatsapp_inbound_messages(id) ON DELETE SET NULL,
  body_text text NOT NULL,
  meta_message_id text, -- Message ID returned by Meta API
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  error_message text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_whatsapp_outbound_user_id ON public.whatsapp_outbound_messages(user_id);
CREATE INDEX idx_whatsapp_outbound_status ON public.whatsapp_outbound_messages(status);

-- Enable RLS
ALTER TABLE public.whatsapp_outbound_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own outbound messages
CREATE POLICY "Users can view own outbound messages"
ON public.whatsapp_outbound_messages FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all outbound messages"
ON public.whatsapp_outbound_messages FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 5) Add source tracking to income_days for deduplication
-- ============================================
ALTER TABLE public.income_days 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'app',
ADD COLUMN IF NOT EXISTS external_id text;

-- Index for external_id lookups (deduplication)
CREATE INDEX IF NOT EXISTS idx_income_days_external_id ON public.income_days(external_id) WHERE external_id IS NOT NULL;

-- ============================================
-- 6) Add source tracking to expenses for deduplication
-- ============================================
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS source text DEFAULT 'app',
ADD COLUMN IF NOT EXISTS external_id text;

-- Index for external_id lookups (deduplication)
CREATE INDEX IF NOT EXISTS idx_expenses_external_id ON public.expenses(external_id) WHERE external_id IS NOT NULL;

-- ============================================
-- 7) Add source tracking to fuel_logs for deduplication
-- ============================================
ALTER TABLE public.fuel_logs
ADD COLUMN IF NOT EXISTS source text DEFAULT 'app',
ADD COLUMN IF NOT EXISTS external_id text;

-- Index for external_id lookups (deduplication)
CREATE INDEX IF NOT EXISTS idx_fuel_logs_external_id ON public.fuel_logs(external_id) WHERE external_id IS NOT NULL;

-- ============================================
-- 8) Secure view for whatsapp_connections (masks token)
-- ============================================
CREATE OR REPLACE VIEW public.whatsapp_connections_safe AS
SELECT 
  id,
  user_id,
  status,
  waba_id,
  phone_number_id,
  business_phone,
  CASE 
    WHEN access_token_encrypted IS NOT NULL AND length(access_token_encrypted) > 8 
    THEN '••••••••' || right(access_token_encrypted, 4)
    ELSE NULL
  END AS access_token_masked,
  verify_token,
  whatsapp_enabled,
  last_error,
  created_at,
  updated_at
FROM public.whatsapp_connections;

-- Grant access to the view
GRANT SELECT ON public.whatsapp_connections_safe TO authenticated;

-- ============================================
-- 9) Function to get connection by phone_number_id (for webhook)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_whatsapp_connection_by_phone(p_phone_number_id text)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  access_token_encrypted text,
  verify_token text,
  whatsapp_enabled boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    user_id,
    access_token_encrypted,
    verify_token,
    whatsapp_enabled
  FROM public.whatsapp_connections
  WHERE phone_number_id = p_phone_number_id
    AND status = 'connected'
  LIMIT 1;
$$;

-- ============================================
-- 10) Function to check if WhatsApp feature is enabled globally
-- ============================================
CREATE OR REPLACE FUNCTION public.is_whatsapp_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT enabled FROM public.feature_flags WHERE key = 'whatsapp_enabled'),
    false
  );
$$;