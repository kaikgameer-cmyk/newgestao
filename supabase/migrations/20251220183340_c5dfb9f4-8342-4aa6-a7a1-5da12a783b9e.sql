-- Corrigir trigger BEFORE para não sobrescrever invoice_id de pagamentos
CREATE OR REPLACE FUNCTION public.trigger_cc_transaction_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invoice_id uuid;
  v_has_config boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  -- IMPORTANTE: Não sobrescrever invoice_id se for pagamento (payment deve ir para fatura específica)
  -- Também não sobrescrever se invoice_id já foi definido explicitamente
  IF NEW.type = 'payment' THEN
    -- Pagamentos mantém o invoice_id passado
    RETURN NEW;
  END IF;

  -- Para outros tipos, se invoice_id já está definido, respeitar
  IF NEW.invoice_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Verificar se o cartão tem configuração válida
  SELECT (closing_day IS NOT NULL AND due_day IS NOT NULL) INTO v_has_config
  FROM public.credit_cards
  WHERE id = NEW.credit_card_id;

  IF NOT v_has_config THEN
    -- Cartão sem configuração, não vincular a fatura
    NEW.invoice_id := NULL;
    RETURN NEW;
  END IF;

  -- Resolver fatura apenas para compras/taxas/estornos sem invoice_id
  v_invoice_id := public.resolve_or_create_invoice_for_user(
    NEW.user_id, 
    NEW.credit_card_id, 
    NEW.date
  );

  NEW.invoice_id := v_invoice_id;
  RETURN NEW;
END;
$$;

-- Remover triggers duplicados (manter apenas um de cada tipo)
DROP TRIGGER IF EXISTS trg_cc_transaction_before ON public.credit_card_transactions;
DROP TRIGGER IF EXISTS trg_cc_transaction_after ON public.credit_card_transactions;
DROP TRIGGER IF EXISTS trg_cc_tx_after_change ON public.credit_card_transactions;

-- Recriar trigger BEFORE
CREATE TRIGGER trg_cc_transaction_before
BEFORE INSERT OR UPDATE ON public.credit_card_transactions
FOR EACH ROW EXECUTE FUNCTION public.trigger_cc_transaction_invoice();

-- Recriar trigger AFTER (usar apenas um, o mais completo)
CREATE TRIGGER trg_cc_tx_after_change
AFTER INSERT OR UPDATE OR DELETE ON public.credit_card_transactions
FOR EACH ROW EXECUTE FUNCTION public.cc_tx_after_change();