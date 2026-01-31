-- Security Audit Logs Table
CREATE TABLE public.security_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid NULL,
  actor_role text NULL,
  ip_address text NULL,
  user_agent text NULL,
  action text NOT NULL,
  entity_type text NULL,
  entity_id text NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warn', 'error', 'critical'))
);

-- Index for efficient querying
CREATE INDEX idx_security_audit_logs_created_at ON public.security_audit_logs(created_at DESC);
CREATE INDEX idx_security_audit_logs_action ON public.security_audit_logs(action);
CREATE INDEX idx_security_audit_logs_actor ON public.security_audit_logs(actor_user_id);
CREATE INDEX idx_security_audit_logs_severity ON public.security_audit_logs(severity);

-- Enable RLS
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view all security logs"
ON public.security_audit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert logs (for edge functions)
CREATE POLICY "Service role can insert security logs"
ON public.security_audit_logs
FOR INSERT
WITH CHECK (true);

-- No one can update or delete logs (immutable audit trail)
CREATE POLICY "No updates to security logs"
ON public.security_audit_logs
FOR UPDATE
USING (false);

CREATE POLICY "No deletes from security logs"
ON public.security_audit_logs
FOR DELETE
USING (false);

-- Function to log security events (to be called from edge functions or triggers)
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action text,
  p_actor_user_id uuid DEFAULT NULL,
  p_actor_role text DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_severity text DEFAULT 'info'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.security_audit_logs (
    action,
    actor_user_id,
    actor_role,
    ip_address,
    user_agent,
    entity_type,
    entity_id,
    metadata,
    severity
  ) VALUES (
    p_action,
    p_actor_user_id,
    p_actor_role,
    p_ip_address,
    p_user_agent,
    p_entity_type,
    p_entity_id,
    p_metadata,
    p_severity
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Grant execute to authenticated users (function has SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION public.log_security_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_event TO service_role;

-- Rate limiting table for tracking attempts
CREATE TABLE public.rate_limit_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL,
  attempts integer NOT NULL DEFAULT 1,
  first_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz NULL,
  UNIQUE(key)
);

-- Index for cleanup
CREATE INDEX idx_rate_limit_attempts_key ON public.rate_limit_attempts(key);
CREATE INDEX idx_rate_limit_attempts_blocked ON public.rate_limit_attempts(blocked_until) WHERE blocked_until IS NOT NULL;

-- Enable RLS on rate_limit_attempts
ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can access rate limits
CREATE POLICY "Service role manages rate limits"
ON public.rate_limit_attempts
FOR ALL
USING (((current_setting('request.jwt.claims'::text, true))::json ->> 'role'::text) = 'service_role');

-- Function to check rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_max_attempts integer DEFAULT 5,
  p_window_minutes integer DEFAULT 15,
  p_block_minutes integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record rate_limit_attempts%ROWTYPE;
  v_window_start timestamptz;
  v_now timestamptz := now();
BEGIN
  v_window_start := v_now - (p_window_minutes || ' minutes')::interval;
  
  -- Get or create record
  SELECT * INTO v_record
  FROM public.rate_limit_attempts
  WHERE key = p_key
  FOR UPDATE;
  
  IF NOT FOUND THEN
    -- First attempt
    INSERT INTO public.rate_limit_attempts (key, attempts, first_attempt_at, last_attempt_at)
    VALUES (p_key, 1, v_now, v_now);
    RETURN jsonb_build_object('allowed', true, 'remaining', p_max_attempts - 1, 'blocked', false);
  END IF;
  
  -- Check if blocked
  IF v_record.blocked_until IS NOT NULL AND v_record.blocked_until > v_now THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'blocked', true,
      'blocked_until', v_record.blocked_until,
      'retry_after_seconds', EXTRACT(EPOCH FROM (v_record.blocked_until - v_now))::integer
    );
  END IF;
  
  -- Check if window expired (reset)
  IF v_record.first_attempt_at < v_window_start THEN
    UPDATE public.rate_limit_attempts
    SET attempts = 1, first_attempt_at = v_now, last_attempt_at = v_now, blocked_until = NULL
    WHERE key = p_key;
    RETURN jsonb_build_object('allowed', true, 'remaining', p_max_attempts - 1, 'blocked', false);
  END IF;
  
  -- Increment attempt
  v_record.attempts := v_record.attempts + 1;
  
  IF v_record.attempts > p_max_attempts THEN
    -- Block the key
    UPDATE public.rate_limit_attempts
    SET 
      attempts = v_record.attempts,
      last_attempt_at = v_now,
      blocked_until = v_now + (p_block_minutes || ' minutes')::interval
    WHERE key = p_key;
    
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'blocked', true,
      'blocked_until', v_now + (p_block_minutes || ' minutes')::interval,
      'retry_after_seconds', p_block_minutes * 60
    );
  END IF;
  
  -- Update attempt count
  UPDATE public.rate_limit_attempts
  SET attempts = v_record.attempts, last_attempt_at = v_now
  WHERE key = p_key;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', p_max_attempts - v_record.attempts,
    'blocked', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit TO service_role;

-- Cleanup function for old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.rate_limit_attempts
  WHERE last_attempt_at < now() - interval '1 day'
    AND (blocked_until IS NULL OR blocked_until < now());
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;