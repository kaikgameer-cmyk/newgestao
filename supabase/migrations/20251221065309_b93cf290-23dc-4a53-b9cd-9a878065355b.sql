-- Create RPC to update team name (host only)
CREATE OR REPLACE FUNCTION public.update_team_name(p_team_id uuid, p_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_host_id uuid := auth.uid();
  v_competition_id uuid;
  v_is_host boolean;
BEGIN
  IF v_host_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate name
  IF p_name IS NULL OR length(trim(p_name)) < 2 THEN
    RAISE EXCEPTION 'Nome do time deve ter pelo menos 2 caracteres';
  END IF;

  -- Get competition_id from team
  SELECT competition_id INTO v_competition_id
  FROM competition_teams
  WHERE id = p_team_id;

  IF v_competition_id IS NULL THEN
    RAISE EXCEPTION 'Time não encontrado';
  END IF;

  -- Verify host
  SELECT (created_by = v_host_id) INTO v_is_host
  FROM competitions
  WHERE id = v_competition_id;

  IF NOT v_is_host THEN
    RAISE EXCEPTION 'Apenas o host pode renomear times';
  END IF;

  -- Check for duplicate name in same competition
  IF EXISTS (
    SELECT 1 FROM competition_teams 
    WHERE competition_id = v_competition_id 
    AND id != p_team_id 
    AND lower(trim(name)) = lower(trim(p_name))
  ) THEN
    RAISE EXCEPTION 'Já existe um time com este nome';
  END IF;

  -- Update team name
  UPDATE competition_teams
  SET name = trim(p_name)
  WHERE id = p_team_id;

  RETURN jsonb_build_object('success', true);
END;
$$;