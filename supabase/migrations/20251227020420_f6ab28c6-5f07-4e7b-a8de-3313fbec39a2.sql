-- 1) Complete cleanup of user-owned expense categories that duplicate system defaults
-- These have user_id != NULL regardless of is_system flag

-- First remap all expenses references to canonical system keys
UPDATE public.expenses e
SET category = 'combustivel'
FROM public.expense_categories dup
WHERE e.category = dup."key"
  AND dup.user_id IS NOT NULL
  AND lower(trim(dup.name)) = 'combustível';

UPDATE public.expenses e
SET category = 'eletrico'
FROM public.expense_categories dup
WHERE e.category = dup."key"
  AND dup.user_id IS NOT NULL
  AND lower(trim(dup.name)) = 'elétrico';

UPDATE public.expenses e
SET category = 'manutencao'
FROM public.expense_categories dup
WHERE e.category = dup."key"
  AND dup.user_id IS NOT NULL
  AND lower(trim(dup.name)) = 'manutenção';

UPDATE public.expenses e
SET category = 'lavagem'
FROM public.expense_categories dup
WHERE e.category = dup."key"
  AND dup.user_id IS NOT NULL
  AND lower(trim(dup.name)) = 'lavagem';

UPDATE public.expenses e
SET category = 'pedagio'
FROM public.expense_categories dup
WHERE e.category = dup."key"
  AND dup.user_id IS NOT NULL
  AND lower(trim(dup.name)) = 'pedágio';

UPDATE public.expenses e
SET category = 'estacionamento'
FROM public.expense_categories dup
WHERE e.category = dup."key"
  AND dup.user_id IS NOT NULL
  AND lower(trim(dup.name)) = 'estacionamento';

UPDATE public.expenses e
SET category = 'alimentacao'
FROM public.expense_categories dup
WHERE e.category = dup."key"
  AND dup.user_id IS NOT NULL
  AND lower(trim(dup.name)) = 'alimentação';

-- Remap credit_card_transactions references
UPDATE public.credit_card_transactions cct
SET category = 'combustivel'
FROM public.expense_categories dup
WHERE cct.category = dup."key"
  AND dup.user_id IS NOT NULL
  AND lower(trim(dup.name)) = 'combustível';

UPDATE public.credit_card_transactions cct
SET category = 'eletrico'
FROM public.expense_categories dup
WHERE cct.category = dup."key"
  AND dup.user_id IS NOT NULL
  AND lower(trim(dup.name)) = 'elétrico';

UPDATE public.credit_card_transactions cct
SET category = 'manutencao'
FROM public.expense_categories dup
WHERE cct.category = dup."key"
  AND dup.user_id IS NOT NULL
  AND lower(trim(dup.name)) = 'manutenção';

UPDATE public.credit_card_transactions cct
SET category = 'lavagem'
FROM public.expense_categories dup
WHERE cct.category = dup."key"
  AND dup.user_id IS NOT NULL
  AND lower(trim(dup.name)) = 'lavagem';

UPDATE public.credit_card_transactions cct
SET category = 'pedagio'
FROM public.expense_categories dup
WHERE cct.category = dup."key"
  AND dup.user_id IS NOT NULL
  AND lower(trim(dup.name)) = 'pedágio';

UPDATE public.credit_card_transactions cct
SET category = 'estacionamento'
FROM public.expense_categories dup
WHERE cct.category = dup."key"
  AND dup.user_id IS NOT NULL
  AND lower(trim(dup.name)) = 'estacionamento';

UPDATE public.credit_card_transactions cct
SET category = 'alimentacao'
FROM public.expense_categories dup
WHERE cct.category = dup."key"
  AND dup.user_id IS NOT NULL
  AND lower(trim(dup.name)) = 'alimentação';

-- Delete user_expense_categories rows pointing to duplicate categories
DELETE FROM public.user_expense_categories uec
USING public.expense_categories dup
WHERE uec.category_key = dup."key"
  AND dup.user_id IS NOT NULL
  AND lower(trim(dup.name)) IN ('combustível','elétrico','manutenção','lavagem','pedágio','estacionamento','alimentação');

-- Delete ALL user-owned expense categories that duplicate system defaults (regardless of is_system/is_default flags)
DELETE FROM public.expense_categories
WHERE user_id IS NOT NULL
  AND lower(trim(name)) IN ('combustível','elétrico','manutenção','lavagem','pedágio','estacionamento','alimentação');

-- 2) Ensure system expense categories use consistent keys
UPDATE public.expense_categories
SET is_default = true
WHERE user_id IS NULL AND is_system = true;

-- 3) Create unique indexes to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS expense_categories_system_name_norm_idx
  ON public.expense_categories ((lower(trim(name))))
  WHERE user_id IS NULL AND is_system = true;

CREATE UNIQUE INDEX IF NOT EXISTS expense_categories_user_name_norm_idx
  ON public.expense_categories (user_id, (lower(trim(name))))
  WHERE user_id IS NOT NULL;

-- 4) Redefine helper functions to only create user preference rows (no duplicate data)
CREATE OR REPLACE FUNCTION public.insert_default_platforms_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_platforms (user_id, platform_key, enabled)
  SELECT p_user_id, p.key, true
  FROM public.platforms p
  WHERE p.user_id IS NULL AND p.is_active = true
  ON CONFLICT (user_id, platform_key) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_default_expense_categories_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_expense_categories (user_id, category_key, enabled)
  SELECT p_user_id, c.key, true
  FROM public.expense_categories c
  WHERE c.user_id IS NULL AND c.is_active = true AND c.is_system = true
  ON CONFLICT (user_id, category_key) DO NOTHING;
END;
$$;