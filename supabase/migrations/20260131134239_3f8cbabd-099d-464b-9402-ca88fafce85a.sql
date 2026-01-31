-- Fix the INSERT policy to be more restrictive
DROP POLICY IF EXISTS "Service role can insert security logs" ON public.security_audit_logs;

CREATE POLICY "Service role can insert security logs"
ON public.security_audit_logs
FOR INSERT
WITH CHECK (((current_setting('request.jwt.claims'::text, true))::json ->> 'role'::text) = 'service_role');