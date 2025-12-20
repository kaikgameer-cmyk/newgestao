-- Create function to update fuel expense atomically
CREATE OR REPLACE FUNCTION public.update_fuel_expense(
  p_expense_id uuid,
  p_date date,
  p_liters numeric,
  p_total_value numeric,
  p_fuel_type text,
  p_station text DEFAULT NULL,
  p_odometer_km numeric DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_credit_card_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_fuel_log_id uuid;
BEGIN
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the fuel_log_id and verify ownership
  SELECT fuel_log_id INTO v_fuel_log_id
  FROM public.expenses
  WHERE id = p_expense_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense not found or not owned by user';
  END IF;

  -- Update fuel log if linked
  IF v_fuel_log_id IS NOT NULL THEN
    UPDATE public.fuel_logs
    SET
      date = p_date,
      liters = ROUND(p_liters::numeric, 2),
      total_value = ROUND(p_total_value::numeric, 2),
      fuel_type = p_fuel_type,
      station = p_station,
      odometer_km = p_odometer_km,
      payment_method = p_payment_method,
      credit_card_id = p_credit_card_id,
      updated_at = now()
    WHERE id = v_fuel_log_id AND user_id = v_user_id;
  END IF;

  -- Update expense
  UPDATE public.expenses
  SET
    date = p_date,
    amount = ROUND(p_total_value::numeric, 2),
    payment_method = p_payment_method,
    credit_card_id = p_credit_card_id,
    notes = p_notes,
    updated_at = now()
  WHERE id = p_expense_id AND user_id = v_user_id;

  RETURN true;
END;
$$;