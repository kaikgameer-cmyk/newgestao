-- Add icon column to platforms table
ALTER TABLE public.platforms ADD COLUMN IF NOT EXISTS icon text;

-- Update system platforms with appropriate icons
UPDATE public.platforms SET icon = 'car' WHERE key = '99' AND user_id IS NULL;
UPDATE public.platforms SET icon = 'car' WHERE key = 'uber' AND user_id IS NULL;
UPDATE public.platforms SET icon = 'car' WHERE key = 'indrive' AND user_id IS NULL;
UPDATE public.platforms SET icon = 'bike' WHERE key = 'ifood' AND user_id IS NULL;
UPDATE public.platforms SET icon = 'package' WHERE key = 'rappi' AND user_id IS NULL;
UPDATE public.platforms SET icon = 'truck' WHERE key = 'lalamove' AND user_id IS NULL;
UPDATE public.platforms SET icon = 'shopping-bag' WHERE key = 'mercado-livre' AND user_id IS NULL;
UPDATE public.platforms SET icon = 'box' WHERE key = 'loggi' AND user_id IS NULL;
UPDATE public.platforms SET icon = 'circle-dot' WHERE key = 'outros' AND user_id IS NULL;