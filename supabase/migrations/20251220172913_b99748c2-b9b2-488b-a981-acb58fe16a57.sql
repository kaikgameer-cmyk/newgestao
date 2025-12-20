-- Fix trigger function to properly recalculate invoice on DELETE and UPDATE
CREATE OR REPLACE FUNCTION public.trigger_cc_transaction_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- DELETE: recalculate the old invoice
  IF TG_OP = 'DELETE' THEN
    IF OLD.invoice_id IS NOT NULL THEN
      PERFORM public.recalc_invoice(OLD.invoice_id);
    END IF;
    RETURN OLD;
  END IF;

  -- INSERT: recalculate the new invoice
  IF TG_OP = 'INSERT' THEN
    IF NEW.invoice_id IS NOT NULL THEN
      PERFORM public.recalc_invoice(NEW.invoice_id);
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: if invoice_id changed, recalculate both old and new
  IF TG_OP = 'UPDATE' THEN
    IF NEW.invoice_id IS DISTINCT FROM OLD.invoice_id THEN
      -- Recalculate old invoice if it existed
      IF OLD.invoice_id IS NOT NULL THEN
        PERFORM public.recalc_invoice(OLD.invoice_id);
      END IF;
      -- Recalculate new invoice if it exists
      IF NEW.invoice_id IS NOT NULL THEN
        PERFORM public.recalc_invoice(NEW.invoice_id);
      END IF;
    ELSE
      -- Same invoice, just recalculate it
      IF NEW.invoice_id IS NOT NULL THEN
        PERFORM public.recalc_invoice(NEW.invoice_id);
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;