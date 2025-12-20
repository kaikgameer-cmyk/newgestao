-- Tabela pai: 1 registro por usuário/dia
CREATE TABLE public.income_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  km_rodados integer NOT NULL DEFAULT 0,
  hours_minutes integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

-- Tabela filha: itens por plataforma
CREATE TABLE public.income_day_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  income_day_id uuid NOT NULL REFERENCES public.income_days(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  platform text NOT NULL,
  platform_label text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  trips integer NOT NULL DEFAULT 0,
  payment_method text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.income_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_day_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for income_days
CREATE POLICY "Users can view own income days"
ON public.income_days FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own income days"
ON public.income_days FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own income days"
ON public.income_days FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own income days"
ON public.income_days FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for income_day_items
CREATE POLICY "Users can view own income day items"
ON public.income_day_items FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own income day items"
ON public.income_day_items FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own income day items"
ON public.income_day_items FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own income day items"
ON public.income_day_items FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_income_days_updated_at
BEFORE UPDATE ON public.income_days
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_income_day_items_updated_at
BEFORE UPDATE ON public.income_day_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();