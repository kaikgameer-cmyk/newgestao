-- Create daily_goals table for storing user daily earning goals
CREATE TABLE public.daily_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  daily_goal NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.daily_goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for daily_goals
CREATE POLICY "Users can view own daily goals"
ON public.daily_goals
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily goals"
ON public.daily_goals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily goals"
ON public.daily_goals
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily goals"
ON public.daily_goals
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_daily_goals_updated_at
BEFORE UPDATE ON public.daily_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();