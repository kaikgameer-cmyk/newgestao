-- Fix SECURITY DEFINER view warning by using security_invoker
DROP VIEW IF EXISTS public.whatsapp_connections_safe;

CREATE VIEW public.whatsapp_connections_safe
WITH (security_invoker = on) AS
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