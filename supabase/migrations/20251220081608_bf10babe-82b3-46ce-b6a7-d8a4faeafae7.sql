-- 1) Unique index para evitar duplicação (1 expense por fuel_log)
CREATE UNIQUE INDEX IF NOT EXISTS ux_expenses_fuel_log_id
ON public.expenses (fuel_log_id)
WHERE fuel_log_id IS NOT NULL;

-- 2) Backfill: vincular expenses existentes de combustível aos fuel_logs por correspondência
UPDATE public.expenses e
SET fuel_log_id = f.id
FROM public.fuel_logs f
WHERE
  e.fuel_log_id IS NULL
  AND e.user_id = f.user_id
  AND e.category = 'combustivel'
  AND e.date = f.date
  AND ROUND(e.amount, 2) = ROUND(f.total_value, 2);

-- 3) Inserir expenses faltantes para fuel_logs órfãos
INSERT INTO public.expenses (
  user_id,
  date,
  amount,
  category,
  payment_method,
  credit_card_id,
  notes,
  fuel_log_id
)
SELECT
  f.user_id,
  f.date,
  ROUND(f.total_value, 2),
  'combustivel',
  f.payment_method,
  f.credit_card_id,
  NULL,
  f.id
FROM public.fuel_logs f
WHERE NOT EXISTS (
  SELECT 1
  FROM public.expenses ex
  WHERE ex.fuel_log_id = f.id
);