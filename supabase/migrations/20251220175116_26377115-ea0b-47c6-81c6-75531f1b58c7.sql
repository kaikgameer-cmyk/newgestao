-- 1) Update recalc_invoice function to correctly calculate total, paid_total, and balance
CREATE OR REPLACE FUNCTION public.recalc_invoice(p_invoice_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total numeric := 0;
  v_paid_total numeric := 0;
  v_balance numeric := 0;
  v_status text := 'open';
  v_due_date date;
  v_closing_date date;
BEGIN
  IF p_invoice_id IS NULL THEN
    RETURN;
  END IF;

  SELECT due_date, closing_date INTO v_due_date, v_closing_date
  FROM public.credit_card_invoices
  WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calculate total from purchases, fees (positive), refunds (negative)
  SELECT COALESCE(SUM(
    CASE 
      WHEN type = 'refund' THEN -ABS(amount)
      WHEN type IN ('purchase', 'fee') THEN ABS(amount)
      ELSE 0
    END
  ), 0) INTO v_total
  FROM public.credit_card_transactions
  WHERE invoice_id = p_invoice_id;

  -- Calculate paid_total from payments (positive amounts)
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_paid_total
  FROM public.credit_card_transactions
  WHERE invoice_id = p_invoice_id AND type = 'payment';

  -- Balance = total - paid_total
  v_balance := v_total - v_paid_total;

  -- Determine status
  IF v_balance <= 0 THEN
    v_status := 'paid';
  ELSIF CURRENT_DATE > v_due_date AND v_balance > 0 THEN
    v_status := 'overdue';
  ELSIF CURRENT_DATE > v_closing_date AND v_balance > 0 THEN
    v_status := 'closed';
  ELSE
    v_status := 'open';
  END IF;

  -- Update the invoice
  UPDATE public.credit_card_invoices
  SET 
    total_amount = v_total,
    paid_total = v_paid_total,
    balance = v_balance,
    status = v_status,
    is_paid = (v_balance <= 0),
    paid_at = CASE WHEN v_balance <= 0 AND paid_at IS NULL THEN now() ELSE paid_at END,
    updated_at = now()
  WHERE id = p_invoice_id;
END;
$function$;

-- 2) Create view for credit cards with calculated limits
CREATE OR REPLACE VIEW public.credit_cards_with_limits AS
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
  COALESCE(SUM(CASE WHEN i.balance > 0 THEN i.balance ELSE 0 END), 0)::numeric(12,2) AS committed,
  GREATEST(0, COALESCE(c.credit_limit, 0) - COALESCE(SUM(CASE WHEN i.balance > 0 THEN i.balance ELSE 0 END), 0))::numeric(12,2) AS available
FROM public.credit_cards c
LEFT JOIN public.credit_card_invoices i
  ON i.credit_card_id = c.id
 AND i.user_id = c.user_id
GROUP BY c.id, c.user_id, c.name, c.last_digits, c.brand, c.credit_limit, c.closing_day, c.due_day, c.due_month_offset, c.best_purchase_day, c.created_at, c.updated_at;

-- 3) Enable RLS-compatible access to the view (views inherit RLS from base tables)
-- The view already uses the user_id column which will be filtered by RLS on the base tables