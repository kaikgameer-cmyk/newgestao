-- Allow authenticated users to select competitions (including private ones) while keeping existing behavior
DROP POLICY IF EXISTS "Users can view accessible competitions" ON public.competitions;

CREATE POLICY "Users can view accessible competitions"
ON public.competitions
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND (
    created_by = auth.uid()
    OR is_competition_member_internal(id, auth.uid())
    OR is_listed = true
    OR auth.role() = 'authenticated'
  )
);

-- Ensure participants table has proper RLS and uniqueness constraint
-- Table name in schema is competition_members (acts as participants)

-- Unique constraint to avoid duplicate participation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.competition_members'::regclass
      AND conname = 'competition_members_competition_id_user_id_key'
  ) THEN
    ALTER TABLE public.competition_members
      ADD CONSTRAINT competition_members_competition_id_user_id_key
      UNIQUE (competition_id, user_id);
  END IF;
END $$;

-- RLS for competition_members already largely correct per schema; keep as-is.
