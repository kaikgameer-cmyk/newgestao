-- Update whatsapp_connections_safe view to include new SaaS columns
DROP VIEW IF EXISTS public.whatsapp_connections_safe;

CREATE VIEW public.whatsapp_connections_safe AS
SELECT
  id,
  user_id,
  status,
  waba_id,
  phone_number_id,
  business_phone,
  wa_phone,
  wa_contact_id,
  connected_at,
  last_seen_at,
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