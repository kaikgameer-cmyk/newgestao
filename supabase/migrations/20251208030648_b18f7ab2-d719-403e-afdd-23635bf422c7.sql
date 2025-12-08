-- Create table to track paid credit card bills
CREATE TABLE public.paid_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  credit_card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- Format: YYYY-MM
  paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(credit_card_id, month_year)
);

-- Enable RLS
ALTER TABLE public.paid_bills ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own paid bills"
  ON public.paid_bills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own paid bills"
  ON public.paid_bills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own paid bills"
  ON public.paid_bills FOR DELETE
  USING (auth.uid() = user_id);