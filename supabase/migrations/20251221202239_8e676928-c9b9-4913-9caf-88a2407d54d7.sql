-- Fix infinite recursion between competitions and competition_members RLS policies

-- 1. Create a SECURITY DEFINER function to check if user is member of competition (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_competition_member_internal(_competition_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.competition_members cm
    WHERE cm.competition_id = _competition_id
      AND cm.user_id = _user_id
  );
$$;

-- 2. Drop and recreate the competitions SELECT policy to use the new function
DROP POLICY IF EXISTS "Users can view competitions they created or are members of or l" ON public.competitions;

CREATE POLICY "Users can view accessible competitions"
ON public.competitions
FOR SELECT
USING (
  (created_by = auth.uid())
  OR public.is_competition_member_internal(id, auth.uid())
  OR (is_listed = true)
);

-- 3. Ensure is_competition_host function also uses SECURITY DEFINER properly (already done but making sure)
CREATE OR REPLACE FUNCTION public.is_competition_host(_competition_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.competitions c
    WHERE c.id = _competition_id
      AND c.created_by = _user_id
  );
$$;