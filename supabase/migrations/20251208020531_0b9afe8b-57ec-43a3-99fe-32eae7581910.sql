-- Add installments field to expenses table for credit card purchases
ALTER TABLE public.expenses 
ADD COLUMN installments integer DEFAULT 1;

-- Add current_installment field to track which installment this is
ALTER TABLE public.expenses 
ADD COLUMN current_installment integer DEFAULT 1;

-- Add total_installments to know the total when viewing individual installment records
ALTER TABLE public.expenses 
ADD COLUMN total_installments integer DEFAULT 1;