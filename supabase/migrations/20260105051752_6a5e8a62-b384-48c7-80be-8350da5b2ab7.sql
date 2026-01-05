-- Migrar fuel_logs antigos que não têm expense vinculado
-- Criar expenses para cada fuel_log órfão (sem expense_id)

INSERT INTO expenses (user_id, date, amount, category, fuel_log_id, payment_method, notes)
SELECT 
  fl.user_id,
  fl.date,
  fl.total_value,
  CASE 
    WHEN fl.fuel_type IN ('ac_lento', 'ac_semi', 'dc_rapido', 'residencial') THEN 'eletrico'
    ELSE 'combustivel'
  END as category,
  fl.id as fuel_log_id,
  fl.payment_method,
  CASE 
    WHEN fl.station IS NOT NULL THEN fl.station
    ELSE NULL
  END as notes
FROM fuel_logs fl
LEFT JOIN expenses e ON e.fuel_log_id = fl.id
WHERE e.id IS NULL;