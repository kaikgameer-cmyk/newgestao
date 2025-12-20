-- Create daily_work_summary table to store KM rodados and hours worked per day
CREATE TABLE IF NOT EXISTS public.daily_work_summary (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL,
  km_rodados integer NULL,
  worked_minutes integer NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT daily_work_summary_user_date_unique UNIQUE (user_id, date)
);

-- Enable RLS
ALTER TABLE public.daily_work_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own work summary"
ON public.daily_work_summary
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own work summary"
ON public.daily_work_summary
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own work summary"
ON public.daily_work_summary
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own work summary"
ON public.daily_work_summary
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_daily_work_summary_updated_at
BEFORE UPDATE ON public.daily_work_summary
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();