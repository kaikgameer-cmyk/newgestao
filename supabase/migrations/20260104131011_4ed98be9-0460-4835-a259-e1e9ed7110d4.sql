-- Add target_user_ids column to feedback_campaigns for targeted campaigns
ALTER TABLE public.feedback_campaigns 
ADD COLUMN target_user_ids uuid[] DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.feedback_campaigns.target_user_ids IS 'When NULL, campaign is for all users. When set, only these user_ids will see the campaign.';

-- Insert a test campaign targeted only at the specified user
INSERT INTO public.feedback_campaigns (
  created_by,
  title,
  subtitle,
  is_active,
  starts_at,
  target_user_ids
) VALUES (
  'ec81b585-4297-4ed8-bc80-48e9c1286259',
  'O que está achando do nosso sistema?',
  'Conte pra gente o que podemos melhorar',
  true,
  now(),
  ARRAY['ec81b585-4297-4ed8-bc80-48e9c1286259']::uuid[]
);