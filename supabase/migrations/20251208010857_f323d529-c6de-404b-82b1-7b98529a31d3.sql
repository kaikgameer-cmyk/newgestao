
-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT,
  city TEXT,
  apps_used TEXT[],
  start_week_day TEXT DEFAULT 'monday',
  currency TEXT DEFAULT 'BRL',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create credit_cards table
CREATE TABLE public.credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  last_digits TEXT,
  brand TEXT,
  credit_limit DECIMAL(12,2),
  best_purchase_day INTEGER,
  due_day INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create revenues table
CREATE TABLE public.revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  app TEXT NOT NULL,
  type TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  receive_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method TEXT,
  credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
  vehicle TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create fuel_logs table
CREATE TABLE public.fuel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  station TEXT,
  liters DECIMAL(10,3) NOT NULL,
  total_value DECIMAL(12,2) NOT NULL,
  fuel_type TEXT NOT NULL,
  odometer_km DECIMAL(12,2),
  payment_method TEXT,
  credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Credit cards RLS policies
CREATE POLICY "Users can view own credit cards" ON public.credit_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own credit cards" ON public.credit_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own credit cards" ON public.credit_cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own credit cards" ON public.credit_cards FOR DELETE USING (auth.uid() = user_id);

-- Revenues RLS policies
CREATE POLICY "Users can view own revenues" ON public.revenues FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own revenues" ON public.revenues FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own revenues" ON public.revenues FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own revenues" ON public.revenues FOR DELETE USING (auth.uid() = user_id);

-- Expenses RLS policies
CREATE POLICY "Users can view own expenses" ON public.expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON public.expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON public.expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON public.expenses FOR DELETE USING (auth.uid() = user_id);

-- Fuel logs RLS policies
CREATE POLICY "Users can view own fuel logs" ON public.fuel_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own fuel logs" ON public.fuel_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own fuel logs" ON public.fuel_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own fuel logs" ON public.fuel_logs FOR DELETE USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_credit_cards_updated_at BEFORE UPDATE ON public.credit_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_revenues_updated_at BEFORE UPDATE ON public.revenues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fuel_logs_updated_at BEFORE UPDATE ON public.fuel_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'name');
  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
