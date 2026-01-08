-- =====================================================
-- SECURITY FIX: Competition Password Hash Exposure
-- =====================================================
-- Remove overly broad RLS policy and prevent direct access to password_hash

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view accessible competitions" ON public.competitions;

-- Create fixed policy WITHOUT the 'auth.role() = authenticated' bypass
CREATE POLICY "Users can view accessible competitions"
ON public.competitions
FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND (
    created_by = auth.uid()
    OR is_competition_member_internal(id, auth.uid())
    OR is_listed = true
  )
);

-- Revoke direct SELECT on password_hash column from authenticated users
-- Password validation stays only in SECURITY DEFINER functions
REVOKE SELECT (password_hash) ON public.competitions FROM authenticated;
REVOKE SELECT (password_hash) ON public.competitions FROM anon;

-- =====================================================
-- SECURITY FIX: Support Attachments Public Exposure
-- =====================================================
-- Make bucket private and restrict access to ticket owners and support staff

-- Make the bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'support-attachments';

-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Anyone can read support attachments" ON storage.objects;

-- Create proper restrictive policy for reading support attachments
-- Only ticket owners and support staff can read
CREATE POLICY "Users and support staff can read support attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND (
    -- User owns the attachment (user_id is the 2nd folder segment: support/{user_id}/...)
    auth.uid()::text = (storage.foldername(name))[2]
    -- OR user has support/admin role
    OR has_support_access(auth.uid())
  )
);

-- Add file size limit and MIME type restrictions for additional security
UPDATE storage.buckets
SET 
  file_size_limit = 5242880,  -- 5MB (matches client validation)
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp'
  ]
WHERE id = 'support-attachments';