-- Fix bucket: make it public so getPublicUrl works
UPDATE storage.buckets 
SET public = true 
WHERE id = 'support-attachments';

-- Add 'support' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support';