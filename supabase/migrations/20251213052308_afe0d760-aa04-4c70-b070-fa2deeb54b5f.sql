-- Add missing UPDATE policy for paid_bills table
CREATE POLICY "Users can update own paid bills" 
  ON public.paid_bills 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);