-- Increase description size and enforce 3000-char limit for competitions
ALTER TABLE public.competitions
  ALTER COLUMN description TYPE text;

-- Drop any existing length check constraint if it exists (best-effort)
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.competitions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%description%char_length%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.competitions DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

-- Create new check constraint for 3000 chars
ALTER TABLE public.competitions
  ADD CONSTRAINT competitions_description_max_3000
  CHECK (description IS NULL OR char_length(description) <= 3000);