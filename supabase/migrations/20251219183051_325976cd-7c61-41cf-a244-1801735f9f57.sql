-- Create maintenance_records table
CREATE TABLE public.maintenance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  current_km INTEGER NOT NULL CHECK (current_km >= 0),
  next_km INTEGER NOT NULL,
  date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT next_km_greater_than_current CHECK (next_km > current_km)
);

-- Create indexes for faster queries
CREATE INDEX idx_maintenance_records_user_id ON public.maintenance_records(user_id);
CREATE INDEX idx_maintenance_records_next_km ON public.maintenance_records(next_km);
CREATE INDEX idx_maintenance_records_is_active ON public.maintenance_records(is_active);

-- Enable RLS
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own maintenance records"
  ON public.maintenance_records
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own maintenance records"
  ON public.maintenance_records
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own maintenance records"
  ON public.maintenance_records
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own maintenance records"
  ON public.maintenance_records
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_maintenance_records_updated_at
  BEFORE UPDATE ON public.maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();