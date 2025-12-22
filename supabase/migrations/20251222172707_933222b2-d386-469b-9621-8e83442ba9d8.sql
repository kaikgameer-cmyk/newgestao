-- Add is_default column to platforms table
ALTER TABLE public.platforms ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- Add is_default column to expense_categories table  
ALTER TABLE public.expense_categories ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- Create function to insert default platforms for new users
CREATE OR REPLACE FUNCTION public.insert_default_platforms_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_platform RECORD;
  v_key TEXT;
  v_counter INTEGER;
BEGIN
  -- Default platforms to insert
  FOR v_platform IN 
    SELECT * FROM (VALUES 
      ('99', '#FFC700'),
      ('Uber', '#000000'),
      ('InDrive', '#2ECC71'),
      ('Particular', '#3498DB'),
      ('Lojinha', '#9B59B6')
    ) AS t(name, color)
  LOOP
    -- Check if platform with same name already exists for user
    IF NOT EXISTS (
      SELECT 1 FROM platforms 
      WHERE user_id = p_user_id 
      AND lower(name) = lower(v_platform.name)
    ) THEN
      -- Generate unique key
      v_key := lower(regexp_replace(v_platform.name, '[^a-zA-Z0-9]', '', 'g'));
      v_counter := 1;
      WHILE EXISTS (SELECT 1 FROM platforms WHERE key = v_key) LOOP
        v_key := lower(regexp_replace(v_platform.name, '[^a-zA-Z0-9]', '', 'g')) || '_' || v_counter::text;
        v_counter := v_counter + 1;
      END LOOP;
      
      -- Insert platform
      INSERT INTO platforms (user_id, key, name, color, is_active, is_default, is_other)
      VALUES (p_user_id, v_key, v_platform.name, v_platform.color, true, true, false);
      
      -- Auto-enable the platform for the user
      INSERT INTO user_platforms (user_id, platform_key, enabled)
      VALUES (p_user_id, v_key, true)
      ON CONFLICT (user_id, platform_key) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- Create function to insert default expense categories for new users
CREATE OR REPLACE FUNCTION public.insert_default_expense_categories_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category RECORD;
  v_key TEXT;
  v_counter INTEGER;
BEGIN
  -- Default expense categories to insert
  FOR v_category IN 
    SELECT * FROM (VALUES 
      ('Combustível', '#E74C3C'),
      ('Elétrico', '#27AE60'),
      ('Manutenção', '#3498DB'),
      ('Lavagem', '#00BCD4'),
      ('Pedágio', '#9C27B0'),
      ('Estacionamento', '#E91E63'),
      ('Alimentação', '#4CAF50')
    ) AS t(name, color)
  LOOP
    -- Check if category with same name already exists for user
    IF NOT EXISTS (
      SELECT 1 FROM expense_categories 
      WHERE user_id = p_user_id 
      AND lower(name) = lower(v_category.name)
    ) THEN
      -- Generate unique key
      v_key := 'default_' || lower(regexp_replace(v_category.name, '[^a-zA-Z0-9]', '', 'g'));
      v_counter := 1;
      WHILE EXISTS (SELECT 1 FROM expense_categories WHERE key = v_key) LOOP
        v_key := 'default_' || lower(regexp_replace(v_category.name, '[^a-zA-Z0-9]', '', 'g')) || '_' || v_counter::text;
        v_counter := v_counter + 1;
      END LOOP;
      
      -- Insert category
      INSERT INTO expense_categories (user_id, key, name, color, is_active, is_system, is_default)
      VALUES (p_user_id, v_key, v_category.name, v_category.color, true, false, true);
      
      -- Auto-enable the category for the user
      INSERT INTO user_expense_categories (user_id, category_key, enabled)
      VALUES (p_user_id, v_key, true)
      ON CONFLICT (user_id, category_key) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- Create trigger function to auto-create defaults when profile is created
CREATE OR REPLACE FUNCTION public.handle_new_profile_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert default platforms
  PERFORM insert_default_platforms_for_user(NEW.user_id);
  
  -- Insert default expense categories
  PERFORM insert_default_expense_categories_for_user(NEW.user_id);
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_profile_created_add_defaults ON public.profiles;

-- Create trigger on profiles table
CREATE TRIGGER on_profile_created_add_defaults
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile_defaults();