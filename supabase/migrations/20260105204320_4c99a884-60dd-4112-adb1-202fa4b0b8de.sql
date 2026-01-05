-- Extend app_role enum with new roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'kiwify';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'affiliate';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'creuzin_team';

-- Create role_audit_log table for tracking role changes
CREATE TABLE public.role_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('add', 'remove')),
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on role_audit_log
ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can see audit log
CREATE POLICY "Admins can view all audit logs"
ON public.role_audit_log FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert audit logs
CREATE POLICY "Admins can insert audit logs"
ON public.role_audit_log FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  message TEXT NOT NULL CHECK (char_length(message) <= 3000),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  target_mode TEXT NOT NULL DEFAULT 'all' CHECK (target_mode IN ('all', 'users')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS on announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Admins can do everything with announcements
CREATE POLICY "Admins can manage announcements"
ON public.announcements FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can see active announcements (but only those targeted to them, handled at app level)
CREATE POLICY "Users can view active announcements"
ON public.announcements FOR SELECT
TO authenticated
USING (status = 'active');

-- Create announcement_targets table (for specific user targeting)
CREATE TABLE public.announcement_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Enable RLS on announcement_targets
ALTER TABLE public.announcement_targets ENABLE ROW LEVEL SECURITY;

-- Admins can manage targets
CREATE POLICY "Admins can manage announcement targets"
ON public.announcement_targets FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can only see their own targets
CREATE POLICY "Users can view their own targets"
ON public.announcement_targets FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create announcement_ack table (for tracking who clicked OK)
CREATE TABLE public.announcement_ack (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Enable RLS on announcement_ack
ALTER TABLE public.announcement_ack ENABLE ROW LEVEL SECURITY;

-- Admins can see all acks
CREATE POLICY "Admins can view all acks"
ON public.announcement_ack FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Users can insert their own ack
CREATE POLICY "Users can insert their own ack"
ON public.announcement_ack FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can see their own acks
CREATE POLICY "Users can view their own acks"
ON public.announcement_ack FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Enable realtime for announcements (for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_ack;

-- Create index for faster queries
CREATE INDEX idx_announcements_status ON public.announcements(status);
CREATE INDEX idx_announcement_targets_user ON public.announcement_targets(user_id);
CREATE INDEX idx_announcement_ack_user ON public.announcement_ack(user_id);
CREATE INDEX idx_role_audit_log_target ON public.role_audit_log(target_user_id);

-- Update RLS policy for user_roles to allow admins to add any role
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));