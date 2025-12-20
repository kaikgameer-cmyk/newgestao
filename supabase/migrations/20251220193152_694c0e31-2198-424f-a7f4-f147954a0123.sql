-- Table for daily KM control
CREATE TABLE public.daily_km_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL,
  start_km numeric(10,1) NOT NULL,
  end_km numeric(10,1) NOT NULL,
  km_driven numeric(10,1) GENERATED ALWAYS AS (end_km - start_km) STORED,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT daily_km_logs_positive_km CHECK (end_km >= start_km),
  CONSTRAINT daily_km_logs_unique_date UNIQUE (user_id, date)
);

-- Table for work sessions (time tracking)
CREATE TABLE public.work_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL, -- The date the session is associated with (chosen by user on finish)
  started_at timestamp with time zone NOT NULL,
  ended_at timestamp with time zone,
  total_worked_seconds integer NOT NULL DEFAULT 0, -- Accumulated worked time excluding pauses
  total_paused_seconds integer NOT NULL DEFAULT 0, -- Total paused time
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'paused', 'finished')),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table for pause intervals within a session
CREATE TABLE public.work_session_pauses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.work_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  paused_at timestamp with time zone NOT NULL,
  resumed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.daily_km_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_session_pauses ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_km_logs
CREATE POLICY "Users can view own km logs"
  ON public.daily_km_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own km logs"
  ON public.daily_km_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own km logs"
  ON public.daily_km_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own km logs"
  ON public.daily_km_logs FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for work_sessions
CREATE POLICY "Users can view own work sessions"
  ON public.work_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own work sessions"
  ON public.work_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own work sessions"
  ON public.work_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own work sessions"
  ON public.work_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for work_session_pauses
CREATE POLICY "Users can view own pauses"
  ON public.work_session_pauses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pauses"
  ON public.work_session_pauses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pauses"
  ON public.work_session_pauses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pauses"
  ON public.work_session_pauses FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_daily_km_logs_updated_at
  BEFORE UPDATE ON public.daily_km_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_work_sessions_updated_at
  BEFORE UPDATE ON public.work_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();