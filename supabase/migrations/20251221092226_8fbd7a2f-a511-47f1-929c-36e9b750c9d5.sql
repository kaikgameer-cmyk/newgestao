-- Evitar nomes duplicados de plataformas por usuário
CREATE UNIQUE INDEX IF NOT EXISTS platforms_user_name_unique
ON public.platforms (user_id, lower(name));