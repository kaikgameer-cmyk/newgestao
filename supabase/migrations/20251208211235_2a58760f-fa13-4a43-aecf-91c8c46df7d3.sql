-- Create enum for subscription status
CREATE TYPE public.subscription_status AS ENUM ('active', 'past_due', 'canceled');

-- Create enum for billing interval
CREATE TYPE public.billing_interval AS ENUM ('month', 'quarter', 'year');

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kiwify_subscription_id TEXT NOT NULL UNIQUE,
  kiwify_product_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  billing_interval billing_interval NOT NULL DEFAULT 'month',
  status subscription_status NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  last_event TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
ON public.subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Only service role can insert/update (via webhook)
CREATE POLICY "Service role can manage subscriptions"
ON public.subscriptions
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_kiwify_subscription_id ON public.subscriptions(kiwify_subscription_id);