-- Schema change only: add has_prize and relax prize_value nullability with a safe constraint
ALTER TABLE public.competitions
ADD COLUMN IF NOT EXISTS has_prize boolean NOT NULL DEFAULT false;

-- Allow NULL in prize_value to support competitions without prize
ALTER TABLE public.competitions
ALTER COLUMN prize_value DROP NOT NULL;

-- Drop previous prize-related constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'competitions_prize_consistency_check'
  ) THEN
    ALTER TABLE public.competitions
    DROP CONSTRAINT competitions_prize_consistency_check;
  END IF;
END $$;

-- New consistency constraint:
-- If has_prize = true  -> prize_value IS NOT NULL AND > 0
-- If has_prize = false -> no restriction on prize_value at DB level (handled by app logic)
ALTER TABLE public.competitions
ADD CONSTRAINT competitions_prize_consistency_check
CHECK (
  (has_prize = true  AND prize_value IS NOT NULL AND prize_value > 0) OR
  (has_prize = false)
);
