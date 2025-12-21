-- Create a security definer function to check if user is a member of competition
CREATE OR REPLACE FUNCTION public.is_competition_member(p_competition_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.competition_members
    WHERE competition_id = p_competition_id
      AND user_id = p_user_id
  )
$$;

-- Drop the old problematic policy
DROP POLICY IF EXISTS "Members can view other members" ON public.competition_members;

-- Create new policy using the security definer function
CREATE POLICY "Members can view other members" 
ON public.competition_members 
FOR SELECT 
USING (
  public.is_competition_member(competition_id, auth.uid())
);