-- Allow admins to manage all subscriptions
CREATE POLICY "Admins can manage subscriptions" 
ON public.subscriptions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));