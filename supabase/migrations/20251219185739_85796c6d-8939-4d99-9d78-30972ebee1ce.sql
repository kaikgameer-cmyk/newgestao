-- Add fuel_log_id column to expenses table to link fuel expenses
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS fuel_log_id uuid REFERENCES public.fuel_logs(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_expenses_fuel_log_id ON public.expenses(fuel_log_id);

-- Create atomic function to create fuel log + expense together
CREATE OR REPLACE FUNCTION public.create_fuel_expense(
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
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_fuel_log_id uuid;
  v_expense_id uuid;
BEGIN
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert fuel log
  INSERT INTO public.fuel_logs (
    user_id, date, liters, total_value, fuel_type, 
    station, odometer_km, payment_method, credit_card_id
  ) VALUES (
    v_user_id, p_date, ROUND(p_liters::numeric, 2), ROUND(p_total_value::numeric, 2), p_fuel_type,
    p_station, p_odometer_km, p_payment_method, p_credit_card_id
  )
  RETURNING id INTO v_fuel_log_id;

  -- Insert expense linked to fuel log
  INSERT INTO public.expenses (
    user_id, date, amount, category, payment_method, 
    credit_card_id, notes, fuel_log_id
  ) VALUES (
    v_user_id, p_date, ROUND(p_total_value::numeric, 2), 'combustivel', p_payment_method,
    p_credit_card_id, p_notes, v_fuel_log_id
  )
  RETURNING id INTO v_expense_id;

  RETURN jsonb_build_object(
    'fuel_log_id', v_fuel_log_id,
    'expense_id', v_expense_id
  );
END;
$$;

-- Create function to delete fuel expense atomically
CREATE OR REPLACE FUNCTION public.delete_fuel_expense(p_expense_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_fuel_log_id uuid;
BEGIN
  -- Get the fuel_log_id and verify ownership
  SELECT fuel_log_id INTO v_fuel_log_id
  FROM public.expenses
  WHERE id = p_expense_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense not found or not owned by user';
  END IF;

  -- Delete expense first
  DELETE FROM public.expenses WHERE id = p_expense_id AND user_id = v_user_id;

  -- Delete fuel log if linked
  IF v_fuel_log_id IS NOT NULL THEN
    DELETE FROM public.fuel_logs WHERE id = v_fuel_log_id AND user_id = v_user_id;
  END IF;

  RETURN true;
END;
$$;