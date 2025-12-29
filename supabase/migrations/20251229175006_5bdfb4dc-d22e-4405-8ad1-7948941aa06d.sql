-- Create helper function to check if user has support access (admin OR support)
CREATE OR REPLACE FUNCTION public.has_support_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'support')
  )
$$;

-- Update RLS policies for support_tickets to include support role

-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can view all support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can update support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can insert support tickets" ON public.support_tickets;

-- Recreate with support access
CREATE POLICY "Support staff can view all tickets"
ON public.support_tickets
FOR SELECT
USING (has_support_access(auth.uid()));

CREATE POLICY "Support staff can update tickets"
ON public.support_tickets
FOR UPDATE
USING (has_support_access(auth.uid()))
WITH CHECK (has_support_access(auth.uid()));

CREATE POLICY "Support staff can insert tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (has_support_access(auth.uid()));

-- Update RLS policies for support_messages to include support role

-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can view all support messages" ON public.support_messages;
DROP POLICY IF EXISTS "Admins can insert support messages" ON public.support_messages;

-- Recreate with support access
CREATE POLICY "Support staff can view all messages"
ON public.support_messages
FOR SELECT
USING (has_support_access(auth.uid()));

CREATE POLICY "Support staff can insert messages"
ON public.support_messages
FOR INSERT
WITH CHECK (
  has_support_access(auth.uid()) 
  AND sender_id = auth.uid() 
  AND sender_role IN ('admin', 'support')
  AND EXISTS (
    SELECT 1 FROM support_tickets t
    WHERE t.id = support_messages.ticket_id
    AND t.status NOT IN ('closed')
  )
);

-- Update storage policies for support-attachments bucket

-- Drop existing policies if any (use IF EXISTS to be safe)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow support access to read" ON storage.objects;

-- Allow authenticated users to upload to support-attachments
CREATE POLICY "Authenticated users can upload support attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'support-attachments');

-- Allow public read since bucket is public
CREATE POLICY "Anyone can read support attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'support-attachments');