-- Migrar dados de revenues para income_days + income_day_items
-- Primeiro, criar income_days agrupando por user_id e date
INSERT INTO public.income_days (user_id, date, km_rodados, hours_minutes, notes)
SELECT 
  user_id,
  date,
  COALESCE(SUM(km_rodados), 0)::integer as km_rodados,
  COALESCE(SUM(worked_minutes), 0)::integer as hours_minutes,
  NULL as notes
FROM public.revenues
WHERE date IS NOT NULL
GROUP BY user_id, date
ON CONFLICT DO NOTHING;

-- Depois, criar income_day_items para cada revenue
INSERT INTO public.income_day_items (
  income_day_id,
  user_id,
  platform,
  platform_label,
  amount,
  trips,
  payment_method,
  notes
)
SELECT 
  d.id as income_day_id,
  r.user_id,
  CASE 
    WHEN r.app IN ('uber', '99', 'indrive', 'lalamove', 'cabify', 'blablacar') THEN r.app
    ELSE 'other'
  END as platform,
  CASE 
    WHEN r.app NOT IN ('uber', '99', 'indrive', 'lalamove', 'cabify', 'blablacar') THEN r.app
    ELSE NULL
  END as platform_label,
  r.amount,
  COALESCE(r.trips_count, 0) as trips,
  r.receive_method as payment_method,
  r.notes
FROM public.revenues r
JOIN public.income_days d ON d.user_id = r.user_id AND d.date = r.date
WHERE r.date IS NOT NULL;