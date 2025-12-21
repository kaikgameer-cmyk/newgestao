-- Increase bcrypt work factor for competition passwords
CREATE OR REPLACE FUNCTION public.create_competition(
  p_name text,
  p_description text,
  p_goal_type text,
  p_goal_value numeric,
  p_start_date date,
  p_end_date date,
  p_password text,
  p_max_members integer DEFAULT NULL::integer,
  p_allow_teams boolean DEFAULT false,
  p_team_size integer DEFAULT NULL::integer,
  p_prize_value numeric DEFAULT NULL::numeric,
  p_host_participates boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
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
    extensions.crypt(p_password, extensions.gen_salt('bf', 12)),
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
$function$;