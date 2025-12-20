-- 1) Normalizar pagamentos existentes (converter negativos para positivos)
UPDATE public.credit_card_transactions
SET amount = ABS(amount)
WHERE type = 'payment' AND amount < 0;

-- 2) Ajustar a função recalc_invoice para calcular corretamente
CREATE OR REPLACE FUNCTION public.recalc_invoice(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total numeric(12,2);
  v_paid numeric(12,2);
  v_due date;
  v_closing date;
  v_balance numeric(12,2);
  v_status text;
BEGIN
  IF p_invoice_id IS NULL THEN
    RETURN;
  END IF;

  -- Total SEM pagamentos (purchases/fees positivos, refunds negativos)
  SELECT COALESCE(SUM(
    CASE
      WHEN t.type IN ('purchase', 'fee') THEN ABS(t.amount)
      WHEN t.type = 'refund' THEN -ABS(t.amount)
      ELSE 0
    END
  ), 0)::numeric(12,2)
  INTO v_total
  FROM public.credit_card_transactions t
  WHERE t.invoice_id = p_invoice_id;

  -- Pagamentos sempre como valores positivos
  SELECT COALESCE(SUM(ABS(t.amount)), 0)::numeric(12,2)
  INTO v_paid
  FROM public.credit_card_transactions t
  WHERE t.invoice_id = p_invoice_id
    AND t.type = 'payment';

  SELECT due_date, closing_date
  INTO v_due, v_closing
  FROM public.credit_card_invoices
  WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Balance nunca negativo
  v_balance := GREATEST(ROUND(v_total - v_paid, 2), 0);

  -- Determinar status
  IF v_balance <= 0 THEN
    v_status := 'paid';
  ELSIF CURRENT_DATE > v_due THEN
    v_status := 'overdue';
  ELSIF CURRENT_DATE > v_closing THEN
    v_status := 'closed';
  ELSE
    v_status := 'open';
  END IF;

  -- Atualizar a fatura
  UPDATE public.credit_card_invoices
  SET 
    total_amount = ROUND(v_total, 2),
    paid_total = ROUND(v_paid, 2),
    balance = v_balance,
    status = v_status,
    is_paid = (v_balance <= 0),
    paid_at = CASE WHEN v_balance <= 0 AND paid_at IS NULL THEN now() ELSE paid_at END,
    updated_at = now()
  WHERE id = p_invoice_id;
END;
$$;

-- 3) Criar trigger para recalcular após mudanças em transações
CREATE OR REPLACE FUNCTION public.cc_tx_after_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.invoice_id IS NOT NULL THEN
      PERFORM public.recalc_invoice(OLD.invoice_id);
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.invoice_id IS NOT NULL THEN
      PERFORM public.recalc_invoice(NEW.invoice_id);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.invoice_id IS DISTINCT FROM OLD.invoice_id THEN
      IF OLD.invoice_id IS NOT NULL THEN
        PERFORM public.recalc_invoice(OLD.invoice_id);
      END IF;
      IF NEW.invoice_id IS NOT NULL THEN
        PERFORM public.recalc_invoice(NEW.invoice_id);
      END IF;
    ELSE
      IF NEW.invoice_id IS NOT NULL THEN
        PERFORM public.recalc_invoice(NEW.invoice_id);
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_cc_tx_after_change ON public.credit_card_transactions;

CREATE TRIGGER trg_cc_tx_after_change
AFTER INSERT OR UPDATE OR DELETE ON public.credit_card_transactions
FOR EACH ROW EXECUTE FUNCTION public.cc_tx_after_change();

-- 4) Recriar view credit_cards_with_limits com cálculo correto baseado em balance
DROP VIEW IF EXISTS public.credit_cards_with_limits;

CREATE VIEW public.credit_cards_with_limits AS
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
GROUP BY c.id;

-- 5) Recalcular todas as faturas existentes
DO $$
DECLARE
  inv_id uuid;
BEGIN
  FOR inv_id IN SELECT id FROM public.credit_card_invoices LOOP
    PERFORM public.recalc_invoice(inv_id);
  END LOOP;
END;
$$;