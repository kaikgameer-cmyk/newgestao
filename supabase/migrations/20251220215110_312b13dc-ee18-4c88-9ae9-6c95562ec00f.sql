-- 1. Adicionar coluna user_id à tabela platforms (null = plataforma do sistema)
ALTER TABLE public.platforms ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Atualizar RLS para platforms: permitir leitura de plataformas do sistema E plataformas do próprio usuário
DROP POLICY IF EXISTS "Anyone can read active platforms" ON public.platforms;

CREATE POLICY "Users can read system platforms and own platforms"
ON public.platforms
FOR SELECT
USING (
  (user_id IS NULL AND is_active = true) OR 
  user_id = auth.uid()
);

CREATE POLICY "Users can insert own platforms"
ON public.platforms
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own platforms"
ON public.platforms
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own platforms"
ON public.platforms
FOR DELETE
USING (user_id = auth.uid());

-- 3. Migrar dados de "other" para "uber" em income_day_items
UPDATE public.income_day_items
SET platform = 'uber', platform_label = NULL
WHERE platform = 'other';

-- 4. Desativar a plataforma "Outro" do sistema
UPDATE public.platforms
SET is_active = false
WHERE key = 'other' AND user_id IS NULL;

-- 5. Adicionar constraint unique para evitar plataformas duplicadas do usuário
CREATE UNIQUE INDEX IF NOT EXISTS platforms_user_key_unique 
ON public.platforms (user_id, LOWER(name)) 
WHERE user_id IS NOT NULL;

-- 6. Adicionar coluna trips a income_days (total do dia) se não existir
-- (já existe no schema atual, mas garantindo)

-- 7. Atualizar income_day_items para não precisar de trips (será no income_days)
-- Primeiro, mover trips para o income_days se necessário
UPDATE public.income_days d
SET hours_minutes = COALESCE(d.hours_minutes, 0)
WHERE d.hours_minutes IS NULL;

-- 8. Adicionar coluna trips em income_days se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'income_days' 
    AND column_name = 'trips'
  ) THEN
    ALTER TABLE public.income_days ADD COLUMN trips integer NOT NULL DEFAULT 0;
  END IF;
END $$;