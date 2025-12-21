-- Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS whatsapp text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Add CHECK constraint for onboarding completion
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_onboarding_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_onboarding_check CHECK (
  onboarding_completed = false OR (
    first_name IS NOT NULL AND first_name <> '' AND
    last_name IS NOT NULL AND last_name <> '' AND
    whatsapp IS NOT NULL AND whatsapp <> '' AND
    email IS NOT NULL AND email <> '' AND
    city IS NOT NULL AND city <> ''
  )
);

-- Update handle_new_user trigger to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, onboarding_completed)
  VALUES (NEW.id, NEW.email, false)
  ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

-- Backfill existing users who don't have a profile
INSERT INTO public.profiles (user_id, email, onboarding_completed)
SELECT u.id, u.email, false
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Update existing profiles to have email from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id AND (p.email IS NULL OR p.email = '');

-- Ensure all existing users have user_platforms entries (with enabled=false for selection)
INSERT INTO public.user_platforms (user_id, platform_key, enabled)
SELECT u.id, pl.key, false
FROM auth.users u
CROSS JOIN public.platforms pl
LEFT JOIN public.user_platforms up ON up.user_id = u.id AND up.platform_key = pl.key
WHERE up.id IS NULL AND pl.is_active = true AND pl.user_id IS NULL
ON CONFLICT (user_id, platform_key) DO NOTHING;