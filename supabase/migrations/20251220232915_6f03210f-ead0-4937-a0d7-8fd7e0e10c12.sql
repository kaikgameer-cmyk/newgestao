-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to generate unique competition code
CREATE OR REPLACE FUNCTION public.generate_competition_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Competitions table
CREATE TABLE public.competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  created_by uuid NOT NULL,
  name text NOT NULL,
  description text,
  goal_type text NOT NULL CHECK (goal_type IN ('income_goal', 'expense_limit', 'saving_goal', 'net_goal')),
  goal_value numeric(12,2) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  password_hash text NOT NULL,
  max_members integer,
  allow_teams boolean DEFAULT false,
  team_size integer,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_dates CHECK (end_date >= start_date),
  CONSTRAINT valid_team_size CHECK (team_size IS NULL OR team_size > 0)
);

-- Competition members table
CREATE TABLE public.competition_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('host', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE (competition_id, user_id)
);

-- Competition teams table
CREATE TABLE public.competition_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Competition team members table
CREATE TABLE public.competition_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.competition_teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  UNIQUE (team_id, user_id)
);

-- Indexes
CREATE INDEX idx_competitions_code ON public.competitions(code);
CREATE INDEX idx_competition_members_competition ON public.competition_members(competition_id);
CREATE INDEX idx_competition_members_user ON public.competition_members(user_id);
CREATE INDEX idx_competition_teams_competition ON public.competition_teams(competition_id);
CREATE INDEX idx_competition_team_members_team ON public.competition_team_members(team_id);

-- Enable RLS
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for competitions
CREATE POLICY "Users can view competitions they created or are members of"
ON public.competitions FOR SELECT
USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.competition_members
    WHERE competition_id = competitions.id AND user_id = auth.uid()
  ) OR
  is_public = true
);

CREATE POLICY "Users can create competitions"
ON public.competitions FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Only host can update competition"
ON public.competitions FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Only host can delete competition"
ON public.competitions FOR DELETE
USING (created_by = auth.uid());

-- RLS Policies for competition_members
CREATE POLICY "Members can view other members"
ON public.competition_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.competition_members cm
    WHERE cm.competition_id = competition_members.competition_id
    AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Members can leave competition"
ON public.competition_members FOR DELETE
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.competitions c
    WHERE c.id = competition_members.competition_id
    AND c.created_by = auth.uid()
  )
);

-- RLS Policies for competition_teams
CREATE POLICY "Members can view teams"
ON public.competition_teams FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.competition_members cm
    WHERE cm.competition_id = competition_teams.competition_id
    AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Only host can manage teams"
ON public.competition_teams FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.competitions c
    WHERE c.id = competition_teams.competition_id
    AND c.created_by = auth.uid()
  )
);

-- RLS Policies for competition_team_members
CREATE POLICY "Members can view team members"
ON public.competition_team_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.competition_teams ct
    JOIN public.competition_members cm ON cm.competition_id = ct.competition_id
    WHERE ct.id = competition_team_members.team_id
    AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Only host can manage team members"
ON public.competition_team_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.competition_teams ct
    JOIN public.competitions c ON c.id = ct.competition_id
    WHERE ct.id = competition_team_members.team_id
    AND c.created_by = auth.uid()
  )
);

-- RPC: Create competition with password hash
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
  p_team_size integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_code text;
  v_competition_id uuid;
  v_attempts integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Generate unique code
  LOOP
    v_code := generate_competition_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM competitions WHERE code = v_code);
    v_attempts := v_attempts + 1;
    IF v_attempts > 100 THEN
      RAISE EXCEPTION 'Could not generate unique code';
    END IF;
  END LOOP;

  -- Insert competition
  INSERT INTO competitions (
    code, created_by, name, description, goal_type, goal_value,
    start_date, end_date, password_hash, max_members, allow_teams, team_size
  ) VALUES (
    v_code, v_user_id, p_name, p_description, p_goal_type, p_goal_value,
    p_start_date, p_end_date, crypt(p_password, gen_salt('bf')),
    p_max_members, p_allow_teams, p_team_size
  )
  RETURNING id INTO v_competition_id;

  -- Add creator as host
  INSERT INTO competition_members (competition_id, user_id, role)
  VALUES (v_competition_id, v_user_id, 'host');

  RETURN jsonb_build_object(
    'competition_id', v_competition_id,
    'code', v_code
  );
END;
$$;

-- RPC: Join competition with password validation
CREATE OR REPLACE FUNCTION public.join_competition(
  p_code text,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  FROM competitions
  WHERE code = UPPER(p_code)
  AND password_hash = crypt(p_password, password_hash);

  IF v_competition IS NULL THEN
    RAISE EXCEPTION 'Código ou senha inválidos';
  END IF;

  -- Check if already member
  IF EXISTS (
    SELECT 1 FROM competition_members
    WHERE competition_id = v_competition.id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object(
      'competition_id', v_competition.id,
      'message', 'already_member'
    );
  END IF;

  -- Check max members
  IF v_competition.max_members IS NOT NULL THEN
    SELECT COUNT(*) INTO v_member_count
    FROM competition_members
    WHERE competition_id = v_competition.id;

    IF v_member_count >= v_competition.max_members THEN
      RAISE EXCEPTION 'Competição lotada';
    END IF;
  END IF;

  -- Add member
  INSERT INTO competition_members (competition_id, user_id, role)
  VALUES (v_competition.id, v_user_id, 'member');

  RETURN jsonb_build_object(
    'competition_id', v_competition.id,
    'name', v_competition.name,
    'message', 'joined'
  );
END;
$$;

-- RPC: Create and distribute teams
CREATE OR REPLACE FUNCTION public.create_competition_teams(
  p_competition_id uuid,
  p_team_count integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_competition record;
  v_members uuid[];
  v_team_id uuid;
  v_member_idx integer := 1;
  v_team_idx integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify host
  SELECT id, allow_teams INTO v_competition
  FROM competitions
  WHERE id = p_competition_id AND created_by = v_user_id;

  IF v_competition IS NULL THEN
    RAISE EXCEPTION 'Competição não encontrada ou sem permissão';
  END IF;

  IF NOT v_competition.allow_teams THEN
    RAISE EXCEPTION 'Times não habilitados';
  END IF;

  -- Delete existing teams
  DELETE FROM competition_teams WHERE competition_id = p_competition_id;

  -- Get members shuffled
  SELECT array_agg(user_id ORDER BY md5(user_id::text || p_competition_id::text))
  INTO v_members
  FROM competition_members
  WHERE competition_id = p_competition_id;

  -- Create teams and distribute
  FOR v_team_idx IN 1..p_team_count LOOP
    INSERT INTO competition_teams (competition_id, name)
    VALUES (p_competition_id, 'Time ' || v_team_idx)
    RETURNING id INTO v_team_id;

    -- Distribute members to this team
    WHILE v_member_idx <= array_length(v_members, 1) LOOP
      IF ((v_member_idx - 1) % p_team_count) + 1 = v_team_idx THEN
        INSERT INTO competition_team_members (team_id, user_id)
        VALUES (v_team_id, v_members[v_member_idx]);
      END IF;
      v_member_idx := v_member_idx + 1;
    END LOOP;
    v_member_idx := 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'teams_created', p_team_count);
END;
$$;

-- RPC: Get competition leaderboard
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

  -- Build leaderboard with financial data
  SELECT jsonb_build_object(
    'competition', jsonb_build_object(
      'id', v_competition.id,
      'name', v_competition.name,
      'goal_type', v_competition.goal_type,
      'goal_value', v_competition.goal_value,
      'start_date', v_competition.start_date,
      'end_date', v_competition.end_date
    ),
    'members', (
      SELECT jsonb_agg(member_data ORDER BY score DESC)
      FROM (
        SELECT 
          cm.user_id,
          COALESCE(p.name, 'Usuário') as display_name,
          cm.role,
          COALESCE(income.total, 0) as total_income,
          COALESCE(expense.total, 0) as total_expense,
          COALESCE(income.total, 0) - COALESCE(expense.total, 0) as net,
          CASE v_competition.goal_type
            WHEN 'income_goal' THEN COALESCE(income.total, 0)
            WHEN 'expense_limit' THEN -COALESCE(expense.total, 0)
            WHEN 'saving_goal' THEN COALESCE(income.total, 0) - COALESCE(expense.total, 0)
            WHEN 'net_goal' THEN COALESCE(income.total, 0) - COALESCE(expense.total, 0)
            ELSE 0
          END as score,
          CASE 
            WHEN v_competition.goal_value > 0 THEN
              ROUND(
                CASE v_competition.goal_type
                  WHEN 'income_goal' THEN COALESCE(income.total, 0) / v_competition.goal_value * 100
                  WHEN 'expense_limit' THEN (1 - COALESCE(expense.total, 0) / v_competition.goal_value) * 100
                  ELSE (COALESCE(income.total, 0) - COALESCE(expense.total, 0)) / v_competition.goal_value * 100
                END, 1
              )
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
        LEFT JOIN LATERAL (
          SELECT SUM(amount) as total
          FROM expenses e
          WHERE e.user_id = cm.user_id
          AND e.date >= v_competition.start_date
          AND e.date <= v_competition.end_date
        ) expense ON true
        WHERE cm.competition_id = p_competition_id
      ) member_data
    ),
    'teams', (
      SELECT jsonb_agg(team_data ORDER BY team_score DESC)
      FROM (
        SELECT 
          ct.id as team_id,
          ct.name as team_name,
          COALESCE(SUM(
            CASE v_competition.goal_type
              WHEN 'income_goal' THEN COALESCE(income.total, 0)
              WHEN 'expense_limit' THEN -COALESCE(expense.total, 0)
              ELSE COALESCE(income.total, 0) - COALESCE(expense.total, 0)
            END
          ), 0) as team_score,
          jsonb_agg(jsonb_build_object(
            'user_id', ctm.user_id,
            'display_name', COALESCE(p.name, 'Usuário')
          )) as members
        FROM competition_teams ct
        LEFT JOIN competition_team_members ctm ON ctm.team_id = ct.id
        LEFT JOIN profiles p ON p.user_id = ctm.user_id
        LEFT JOIN LATERAL (
          SELECT SUM(idi.amount) as total
          FROM income_days id
          JOIN income_day_items idi ON idi.income_day_id = id.id
          WHERE id.user_id = ctm.user_id
          AND id.date >= v_competition.start_date
          AND id.date <= v_competition.end_date
        ) income ON true
        LEFT JOIN LATERAL (
          SELECT SUM(amount) as total
          FROM expenses e
          WHERE e.user_id = ctm.user_id
          AND e.date >= v_competition.start_date
          AND e.date <= v_competition.end_date
        ) expense ON true
        WHERE ct.competition_id = p_competition_id
        GROUP BY ct.id, ct.name
      ) team_data
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_competitions_updated_at
BEFORE UPDATE ON public.competitions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();