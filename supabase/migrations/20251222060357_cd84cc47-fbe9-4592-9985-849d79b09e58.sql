-- Update check constraint on password_tokens to allow 'set_password' type
ALTER TABLE public.password_tokens 
DROP CONSTRAINT IF EXISTS password_tokens_type_check;

ALTER TABLE public.password_tokens 
ADD CONSTRAINT password_tokens_type_check 
CHECK (type = ANY (ARRAY['signup'::text, 'reset'::text, 'set_password'::text]));