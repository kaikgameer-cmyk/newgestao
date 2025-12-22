-- Create maintenance history table for tracking completed/renewed maintenance
CREATE TABLE public.maintenance_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_id UUID NOT NULL REFERENCES public.maintenance_records(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  performed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  performed_km INTEGER NOT NULL,
  next_due_km INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own maintenance history"
ON public.maintenance_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own maintenance history"
ON public.maintenance_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own maintenance history"
ON public.maintenance_history
FOR DELETE
USING (auth.uid() = user_id);

-- Add index for better query performance
CREATE INDEX idx_maintenance_history_user_id ON public.maintenance_history(user_id);
CREATE INDEX idx_maintenance_history_maintenance_id ON public.maintenance_history(maintenance_id);