-- ============================================================
-- COMPETIÇÕES — AJUSTES: RECEITA-ONLY + PRÊMIO + HOST PARTICIPA + DISPONÍVEIS
-- ============================================================

-- 1) Adicionar colunas em competitions
ALTER TABLE public.competitions 
  ADD COLUMN IF NOT EXISTS prize_value numeric(12,2),
  ADD COLUMN IF NOT EXISTS host_participates boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_listed boolean NOT NULL DEFAULT true;

-- Preencher prize_value existente com goal_value (para não quebrar dados antigos)
UPDATE public.competitions SET prize_value = goal_value WHERE prize_value IS NULL;

-- Tornar prize_value NOT NULL após preencher
ALTER TABLE public.competitions ALTER COLUMN prize_value SET NOT NULL;

-- 2) Adicionar is_competitor em competition_members
ALTER TABLE public.competition_members 
  ADD COLUMN IF NOT EXISTS is_competitor boolean NOT NULL DEFAULT true;

-- 3) Atualizar RLS de competitions para permitir listar is_listed=true
DROP POLICY IF EXISTS "Users can view competitions they created or are members of" ON public.competitions;

CREATE POLICY "Users can view competitions they created or are members of or listed" 
ON public.competitions 
FOR SELECT 
USING (
  (created_by = auth.uid()) OR 
  (EXISTS (
    SELECT 1 FROM public.competition_members
    WHERE competition_members.competition_id = competitions.id 
    AND competition_members.user_id = auth.uid()
  )) OR 
  (is_listed = true)
);

-- 4) Atualizar função create_competition para incluir novos parâmetros
CREATE OR REPLACE FUNCTION public.create_competition(
  p_name text,
  p_description text,
  p_goal_type text,
  p_goal_value numeric,
  p_start_date date,
  p_end_date date,
  p_password text,
  p_max_members integer DEFAULT NULL,
  p_allow_teams boolean DEFAULT false,
  p_team_size integer DEFAULT NULL,
  p_prize_value numeric DEFAULT NULL,
  p_host_participates boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_code text;
  v_competition_id uuid;
  v_attempts integer := 0;
  v_prize numeric;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- prize_value obrigatório e > 0
  v_prize := COALESCE(p_prize_value, p_goal_value);
  IF v_prize IS NULL OR v_prize <= 0 THEN
    RAISE EXCEPTION 'Valor do prêmio é obrigatório e deve ser maior que zero';
  END IF;

  -- Generate unique code
  LOOP
    v_code := public.generate_competition_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.competitions WHERE code = v_code);
    v_attempts := v_attempts + 1;
    IF v_attempts > 100 THEN
      RAISE EXCEPTION 'Could not generate unique code';
    END IF;
  END LOOP;

  -- Insert competition (sempre income_goal)
  INSERT INTO public.competitions (
    code, created_by, name, description, goal_type, goal_value,
    start_date, end_date, password_hash, max_members, allow_teams, team_size,
    prize_value, host_participates, is_listed
  ) VALUES (
    v_code, v_user_id, p_name, p_description, 'income_goal', p_goal_value,
    p_start_date, p_end_date,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    p_max_members, p_allow_teams, p_team_size,
    v_prize, p_host_participates, true
  )
  RETURNING id INTO v_competition_id;

  -- Add creator as host, is_competitor based on host_participates
  INSERT INTO public.competition_members (competition_id, user_id, role, is_competitor)
  VALUES (v_competition_id, v_user_id, 'host', p_host_participates);

  RETURN jsonb_build_object(
    'competition_id', v_competition_id,
    'code', v_code
  );
END;
$$;

-- 5) Atualizar join_competition para sempre is_competitor=true
CREATE OR REPLACE FUNCTION public.join_competition(p_code text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_competition record;
  v_member_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find competition and validate password
  SELECT id, max_members, password_hash, name
  INTO v_competition
  FROM public.competitions
  WHERE code = UPPER(p_code)
  AND password_hash = extensions.crypt(p_password, password_hash);

  IF v_competition IS NULL THEN
    RAISE EXCEPTION 'Código ou senha inválidos';
  END IF;

  -- Check if already member
  IF EXISTS (
    SELECT 1 FROM public.competition_members
    WHERE competition_id = v_competition.id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object(
      'competition_id', v_competition.id,
      'name', v_competition.name,
      'message', 'already_member'
    );
  END IF;

  -- Check max members
  IF v_competition.max_members IS NOT NULL THEN
    SELECT COUNT(*) INTO v_member_count
    FROM public.competition_members
    WHERE competition_id = v_competition.id;

    IF v_member_count >= v_competition.max_members THEN
      RAISE EXCEPTION 'Competição lotada';
    END IF;
  END IF;

  -- Add member with is_competitor=true
  INSERT INTO public.competition_members (competition_id, user_id, role, is_competitor)
  VALUES (v_competition.id, v_user_id, 'member', true);

  RETURN jsonb_build_object(
    'competition_id', v_competition.id,
    'name', v_competition.name,
    'message', 'joined'
  );
END;
$$;

-- 6) Atualizar leaderboard para filtrar is_competitor=true e só receita
CREATE OR REPLACE FUNCTION public.get_competition_leaderboard(p_competition_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_competition record;
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get competition details
  SELECT c.*, 
    EXISTS (
      SELECT 1 FROM competition_members cm
      WHERE cm.competition_id = c.id AND cm.user_id = v_user_id
    ) as is_member
  INTO v_competition
  FROM competitions c
  WHERE c.id = p_competition_id;

  IF v_competition IS NULL OR NOT v_competition.is_member THEN
    RAISE EXCEPTION 'Sem acesso a esta competição';
  END IF;

  -- Build leaderboard with ONLY income data (no expenses)
  SELECT jsonb_build_object(
    'competition', jsonb_build_object(
      'id', v_competition.id,
      'name', v_competition.name,
      'goal_type', v_competition.goal_type,
      'goal_value', v_competition.goal_value,
      'prize_value', v_competition.prize_value,
      'start_date', v_competition.start_date,
      'end_date', v_competition.end_date,
      'host_participates', v_competition.host_participates
    ),
    'members', (
      SELECT jsonb_agg(member_data ORDER BY score DESC)
      FROM (
        SELECT 
          cm.user_id,
          COALESCE(p.name, 'Usuário') as display_name,
          cm.role,
          cm.is_competitor,
          COALESCE(income.total, 0) as total_income,
          COALESCE(income.total, 0) as score,
          CASE 
            WHEN v_competition.goal_value > 0 THEN
              ROUND(COALESCE(income.total, 0) / v_competition.goal_value * 100, 1)
            ELSE 0
          END as progress
        FROM competition_members cm
        LEFT JOIN profiles p ON p.user_id = cm.user_id
        LEFT JOIN LATERAL (
          SELECT SUM(idi.amount) as total
          FROM income_days id
          JOIN income_day_items idi ON idi.income_day_id = id.id
          WHERE id.user_id = cm.user_id
          AND id.date >= v_competition.start_date
          AND id.date <= v_competition.end_date
        ) income ON true
        WHERE cm.competition_id = p_competition_id
          AND cm.is_competitor = true
      ) member_data
    ),
    'all_members', (
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', cm.user_id,
        'display_name', COALESCE(p.name, 'Usuário'),
        'role', cm.role,
        'is_competitor', cm.is_competitor
      ))
      FROM competition_members cm
      LEFT JOIN profiles p ON p.user_id = cm.user_id
      WHERE cm.competition_id = p_competition_id
    ),
    'teams', (
      SELECT jsonb_agg(team_data ORDER BY team_score DESC)
      FROM (
        SELECT 
          ct.id as team_id,
          ct.name as team_name,
          COALESCE(SUM(COALESCE(income.total, 0)), 0) as team_score,
          jsonb_agg(jsonb_build_object(
            'user_id', ctm.user_id,
            'display_name', COALESCE(p.name, 'Usuário')
          )) as members
        FROM competition_teams ct
        LEFT JOIN competition_team_members ctm ON ctm.team_id = ct.id
        LEFT JOIN profiles p ON p.user_id = ctm.user_id
        LEFT JOIN competition_members cm ON cm.competition_id = ct.competition_id AND cm.user_id = ctm.user_id
        LEFT JOIN LATERAL (
          SELECT SUM(idi.amount) as total
          FROM income_days id
          JOIN income_day_items idi ON idi.income_day_id = id.id
          WHERE id.user_id = ctm.user_id
          AND id.date >= v_competition.start_date
          AND id.date <= v_competition.end_date
        ) income ON true
        WHERE ct.competition_id = p_competition_id
          AND (cm.is_competitor = true OR cm.is_competitor IS NULL)
        GROUP BY ct.id, ct.name
      ) team_data
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 7) Criar RPC para atribuir membro a time manualmente
CREATE OR REPLACE FUNCTION public.assign_member_to_team(
  p_competition_id uuid,
  p_team_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host_id uuid := auth.uid();
  v_is_host boolean;
BEGIN
  IF v_host_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verificar se é host
  SELECT (created_by = v_host_id) INTO v_is_host
  FROM competitions
  WHERE id = p_competition_id;

  IF NOT v_is_host THEN
    RAISE EXCEPTION 'Apenas o host pode gerenciar times';
  END IF;

  -- Verificar se o time pertence à competição
  IF NOT EXISTS (SELECT 1 FROM competition_teams WHERE id = p_team_id AND competition_id = p_competition_id) THEN
    RAISE EXCEPTION 'Time não encontrado nesta competição';
  END IF;

  -- Verificar se usuário é membro da competição
  IF NOT EXISTS (SELECT 1 FROM competition_members WHERE competition_id = p_competition_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'Usuário não é membro desta competição';
  END IF;

  -- Remover de outros times desta competição
  DELETE FROM competition_team_members
  WHERE user_id = p_user_id
  AND team_id IN (SELECT id FROM competition_teams WHERE competition_id = p_competition_id);

  -- Adicionar ao novo time
  INSERT INTO competition_team_members (team_id, user_id)
  VALUES (p_team_id, p_user_id)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 8) Criar RPC para remover membro de time
CREATE OR REPLACE FUNCTION public.unassign_member_from_team(
  p_competition_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host_id uuid := auth.uid();
  v_is_host boolean;
BEGIN
  IF v_host_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verificar se é host
  SELECT (created_by = v_host_id) INTO v_is_host
  FROM competitions
  WHERE id = p_competition_id;

  IF NOT v_is_host THEN
    RAISE EXCEPTION 'Apenas o host pode gerenciar times';
  END IF;

  -- Remover de todos os times desta competição
  DELETE FROM competition_team_members
  WHERE user_id = p_user_id
  AND team_id IN (SELECT id FROM competition_teams WHERE competition_id = p_competition_id);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 9) Criar função para buscar competições disponíveis (listadas)
CREATE OR REPLACE FUNCTION public.get_listed_competitions()
RETURNS TABLE (
  id uuid,
  code text,
  name text,
  description text,
  goal_value numeric,
  prize_value numeric,
  start_date date,
  end_date date,
  max_members integer,
  allow_teams boolean,
  member_count bigint,
  is_member boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.code,
    c.name,
    c.description,
    c.goal_value,
    c.prize_value,
    c.start_date,
    c.end_date,
    c.max_members,
    c.allow_teams,
    (SELECT COUNT(*) FROM competition_members cm WHERE cm.competition_id = c.id) as member_count,
    EXISTS (SELECT 1 FROM competition_members cm WHERE cm.competition_id = c.id AND cm.user_id = auth.uid()) as is_member
  FROM competitions c
  WHERE c.is_listed = true
  ORDER BY c.created_at DESC;
$$;