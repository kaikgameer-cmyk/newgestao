-- Catálogo de plataformas
CREATE TABLE public.platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  is_other boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Seed inicial
INSERT INTO public.platforms (key, name, is_other) VALUES
  ('uber', 'Uber', false),
  ('99', '99', false),
  ('indrive', 'InDrive', false),
  ('other', 'Outro', true);

-- Preferências de plataforma do usuário
CREATE TABLE public.user_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform_key text NOT NULL REFERENCES public.platforms(key) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform_key)
);

-- RLS para platforms (leitura pública)
ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active platforms"
  ON public.platforms FOR SELECT
  USING (is_active = true);

-- RLS para user_platforms
ALTER TABLE public.user_platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own platform preferences"
  ON public.user_platforms FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own platform preferences"
  ON public.user_platforms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own platform preferences"
  ON public.user_platforms FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own platform preferences"
  ON public.user_platforms FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_user_platforms_updated_at
  BEFORE UPDATE ON public.user_platforms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função RPC para buscar faturamento por plataforma no período
CREATE OR REPLACE FUNCTION public.get_revenue_by_platform(
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  platform_key text,
  platform_name text,
  platform_label text,
  total_amount numeric,
  total_trips integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    COALESCE(i.platform, 'other') as platform_key,
    COALESCE(p.name, 'Outro') as platform_name,
    i.platform_label,
    SUM(i.amount)::numeric as total_amount,
    SUM(i.trips)::integer as total_trips
  FROM public.income_day_items i
  JOIN public.income_days d ON d.id = i.income_day_id
  LEFT JOIN public.platforms p ON p.key = i.platform
  WHERE d.user_id = auth.uid()
    AND d.date >= p_start_date
    AND d.date <= p_end_date
  GROUP BY COALESCE(i.platform, 'other'), COALESCE(p.name, 'Outro'), i.platform_label
  HAVING SUM(i.amount) > 0
  ORDER BY SUM(i.amount) DESC;
$$;