-- Create table for pairing tokens
CREATE TABLE public.whatsapp_pairing_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_pairing_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for pairing tokens
CREATE POLICY "Users can view own pairing tokens"
ON public.whatsapp_pairing_tokens
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pairing tokens"
ON public.whatsapp_pairing_tokens
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all pairing tokens"
ON public.whatsapp_pairing_tokens
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Add new columns to whatsapp_connections for SaaS mode
ALTER TABLE public.whatsapp_connections
ADD COLUMN IF NOT EXISTS wa_phone text,
ADD COLUMN IF NOT EXISTS wa_contact_id text,
ADD COLUMN IF NOT EXISTS connected_at timestamptz,
ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Create index for faster phone lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_wa_phone 
ON public.whatsapp_connections(wa_phone) 
WHERE wa_phone IS NOT NULL;

-- Create index for faster code lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_pairing_tokens_code 
ON public.whatsapp_pairing_tokens(code) 
WHERE used_at IS NULL;