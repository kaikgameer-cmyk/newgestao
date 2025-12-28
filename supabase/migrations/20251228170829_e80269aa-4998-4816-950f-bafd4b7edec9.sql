-- Allow authenticated users to insert their own competition membership rows
CREATE POLICY "Users can join competitions as members"
ON public.competition_members
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);