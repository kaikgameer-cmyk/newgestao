-- ============================================================
-- TRIGGERS para sincronizar expenses/fuel_logs -> credit_card_transactions
-- ============================================================

-- 1) Trigger para sincronizar expenses com cartão para credit_card_transactions
CREATE OR REPLACE FUNCTION public.sync_expense_to_cc_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card_has_config boolean;
BEGIN
  -- Verificar se é despesa de cartão e não é combustível (combustível tem seu próprio trigger via fuel_logs)
  IF TG_OP = 'DELETE' THEN
    -- Remover transação correspondente
    DELETE FROM public.credit_card_transactions 
    WHERE source_expense_id = OLD.id;
    RETURN OLD;
  END IF;

  -- Para INSERT/UPDATE, verificar se é despesa de cartão
  IF NEW.credit_card_id IS NULL OR NEW.fuel_log_id IS NOT NULL THEN
    -- Não é despesa de cartão ou é combustível (tratado separadamente)
    -- Remover transação se existia antes
    IF TG_OP = 'UPDATE' AND OLD.credit_card_id IS NOT NULL AND OLD.fuel_log_id IS NULL THEN
      DELETE FROM public.credit_card_transactions WHERE source_expense_id = OLD.id;
    END IF;
    RETURN NEW;
  END IF;

  -- Verificar se o cartão tem configuração válida
  SELECT (closing_day IS NOT NULL AND due_day IS NOT NULL) INTO v_card_has_config
  FROM public.credit_cards
  WHERE id = NEW.credit_card_id;

  IF NOT v_card_has_config THEN
    -- Cartão sem configuração, não criar transação
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.credit_card_transactions (
      user_id, credit_card_id, date, amount, description, category, type,
      source_expense_id, current_installment, total_installments
    ) VALUES (
      NEW.user_id, NEW.credit_card_id, NEW.date, 
      ROUND(NEW.amount::numeric, 2),
      COALESCE(NEW.notes, NEW.category),
      NEW.category,
      'purchase',
      NEW.id,
      COALESCE(NEW.current_installment, 1),
      COALESCE(NEW.total_installments, 1)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Atualizar ou criar transação
    INSERT INTO public.credit_card_transactions (
      user_id, credit_card_id, date, amount, description, category, type,
      source_expense_id, current_installment, total_installments
    ) VALUES (
      NEW.user_id, NEW.credit_card_id, NEW.date, 
      ROUND(NEW.amount::numeric, 2),
      COALESCE(NEW.notes, NEW.category),
      NEW.category,
      'purchase',
      NEW.id,
      COALESCE(NEW.current_installment, 1),
      COALESCE(NEW.total_installments, 1)
    )
    ON CONFLICT (source_expense_id) 
    WHERE source_expense_id IS NOT NULL
    DO UPDATE SET
      credit_card_id = EXCLUDED.credit_card_id,
      date = EXCLUDED.date,
      amount = EXCLUDED.amount,
      description = EXCLUDED.description,
      category = EXCLUDED.category,
      current_installment = EXCLUDED.current_installment,
      total_installments = EXCLUDED.total_installments,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

-- Criar índice único parcial para source_expense_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_cc_transactions_source_expense 
ON public.credit_card_transactions(source_expense_id) 
WHERE source_expense_id IS NOT NULL;

-- Trigger em expenses
DROP TRIGGER IF EXISTS trg_sync_expense_to_cc ON public.expenses;
CREATE TRIGGER trg_sync_expense_to_cc
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_expense_to_cc_transaction();

-- 2) Trigger para sincronizar fuel_logs com cartão para credit_card_transactions
CREATE OR REPLACE FUNCTION public.sync_fuel_log_to_cc_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card_has_config boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.credit_card_transactions 
    WHERE source_fuel_log_id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.credit_card_id IS NULL THEN
    IF TG_OP = 'UPDATE' AND OLD.credit_card_id IS NOT NULL THEN
      DELETE FROM public.credit_card_transactions WHERE source_fuel_log_id = OLD.id;
    END IF;
    RETURN NEW;
  END IF;

  -- Verificar se o cartão tem configuração válida
  SELECT (closing_day IS NOT NULL AND due_day IS NOT NULL) INTO v_card_has_config
  FROM public.credit_cards
  WHERE id = NEW.credit_card_id;

  IF NOT v_card_has_config THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.credit_card_transactions (
      user_id, credit_card_id, date, amount, description, category, type,
      source_fuel_log_id
    ) VALUES (
      NEW.user_id, NEW.credit_card_id, NEW.date, 
      ROUND(NEW.total_value::numeric, 2),
      COALESCE(NEW.station, 'Combustível') || ' - ' || NEW.fuel_type,
      'combustivel',
      'purchase',
      NEW.id
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.credit_card_transactions (
      user_id, credit_card_id, date, amount, description, category, type,
      source_fuel_log_id
    ) VALUES (
      NEW.user_id, NEW.credit_card_id, NEW.date, 
      ROUND(NEW.total_value::numeric, 2),
      COALESCE(NEW.station, 'Combustível') || ' - ' || NEW.fuel_type,
      'combustivel',
      'purchase',
      NEW.id
    )
    ON CONFLICT (source_fuel_log_id) 
    WHERE source_fuel_log_id IS NOT NULL
    DO UPDATE SET
      credit_card_id = EXCLUDED.credit_card_id,
      date = EXCLUDED.date,
      amount = EXCLUDED.amount,
      description = EXCLUDED.description,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

-- Criar índice único parcial para source_fuel_log_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_cc_transactions_source_fuel_log 
ON public.credit_card_transactions(source_fuel_log_id) 
WHERE source_fuel_log_id IS NOT NULL;

-- Trigger em fuel_logs
DROP TRIGGER IF EXISTS trg_sync_fuel_log_to_cc ON public.fuel_logs;
CREATE TRIGGER trg_sync_fuel_log_to_cc
  AFTER INSERT OR UPDATE OR DELETE ON public.fuel_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_fuel_log_to_cc_transaction();