-- Drop the existing view and recreate with SECURITY INVOKER
DROP VIEW IF EXISTS public.credit_cards_with_limits;

-- Recreate the view with SECURITY INVOKER (default behavior, but explicit for clarity)
CREATE VIEW public.credit_cards_with_limits
WITH (security_invoker = true)
AS
SELECT 
  c.id,
  c.user_id,
  c.name,
  c.last_digits,
  c.brand,
  c.credit_limit,
  c.closing_day,
  c.due_day,
  c.due_month_offset,
  c.best_purchase_day,
  c.created_at,
  c.updated_at,
  COALESCE(SUM(
    CASE
      WHEN i.balance > 0::numeric THEN i.balance
      ELSE 0::numeric
    END
  ), 0::numeric)::numeric(12,2) AS committed,
  GREATEST(0::numeric, 
    COALESCE(c.credit_limit, 0::numeric) - 
    COALESCE(SUM(
      CASE
        WHEN i.balance > 0::numeric THEN i.balance
        ELSE 0::numeric
      END
    ), 0::numeric)
  )::numeric(12,2) AS available
FROM credit_cards c
LEFT JOIN credit_card_invoices i 
  ON i.credit_card_id = c.id 
  AND i.user_id = c.user_id
GROUP BY c.id;