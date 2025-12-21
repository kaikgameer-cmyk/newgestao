-- Phase 2 hardening: remove plaintext password reset tokens
ALTER TABLE public.password_tokens
  ALTER COLUMN token DROP NOT NULL;

UPDATE public.password_tokens
SET token = NULL;
