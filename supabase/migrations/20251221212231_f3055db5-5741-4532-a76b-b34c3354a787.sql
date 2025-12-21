
CREATE OR REPLACE FUNCTION public.join_competition_with_password(
  p_competition_id uuid,
  p_password text,
  p_pix_key text,
  p_pix_key_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_competition record;
  v_member_id uuid;
  v_now_sp timestamp;
  v_end_exclusive timestamp;
  v_is_finished boolean;
  v_clean_pix_key text;
  v_clean_type text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_competition_id IS NULL THEN
    RAISE EXCEPTION 'Competição inválida';
  END IF;

  IF p_password IS NULL OR length(trim(p_password)) < 1 THEN
    RAISE EXCEPTION 'Senha é obrigatória';
  END IF;

  v_clean_type := lower(trim(coalesce(p_pix_key_type, '')));
  IF v_clean_type NOT IN ('cpf','cnpj','email','phone','random') THEN
    RAISE EXCEPTION 'Tipo de chave PIX inválido';
  END IF;

  v_clean_pix_key := trim(coalesce(p_pix_key, ''));
  IF length(v_clean_pix_key) < 3 OR length(v_clean_pix_key) > 140 THEN
    RAISE EXCEPTION 'Chave PIX inválida';
  END IF;

  -- Get competition and validate password
  SELECT c.*
  INTO v_competition
  FROM public.competitions c
  WHERE c.id = p_competition_id
    AND c.deleted_at IS NULL;

  IF v_competition IS NULL THEN
    RAISE EXCEPTION 'Competição não encontrada';
  END IF;

  -- Validate password against stored bcrypt hash
  IF v_competition.password_hash IS NULL OR extensions.crypt(p_password, v_competition.password_hash) <> v_competition.password_hash THEN
    RAISE EXCEPTION 'Senha incorreta';
  END IF;

  -- Validate competition is not finished (end of day in Sao Paulo)
  v_now_sp := (now() AT TIME ZONE 'America/Sao_Paulo');
  v_end_exclusive := ((v_competition.end_date + INTERVAL '1 day')::timestamp);
  v_is_finished := v_now_sp >= v_end_exclusive;

  IF v_is_finished THEN
    RAISE EXCEPTION 'Competição finalizada: não aceita mais participantes';
  END IF;

  -- Check max members (if defined)
  IF v_competition.max_members IS NOT NULL THEN
    IF (SELECT COUNT(*) FROM public.competition_members cm WHERE cm.competition_id = p_competition_id) >= v_competition.max_members THEN
      RAISE EXCEPTION 'Competição lotada';
    END IF;
  END IF;

  -- Idempotent join: update if exists, else insert
  SELECT cm.id
  INTO v_member_id
  FROM public.competition_members cm
  WHERE cm.competition_id = p_competition_id
    AND cm.user_id = v_user_id
  LIMIT 1;

  IF v_member_id IS NULL THEN
    INSERT INTO public.competition_members (
      competition_id,
      user_id,
      role,
      pix_key,
      pix_key_type,
      pix_updated_at,
      transparency_accepted,
      transparency_accepted_at,
      is_competitor
    ) VALUES (
      p_competition_id,
      v_user_id,
      'member',
      v_clean_pix_key,
      v_clean_type,
      now(),
      true,
      now(),
      true
    )
    RETURNING id INTO v_member_id;

    RETURN jsonb_build_object(
      'competition_id', p_competition_id,
      'membership_id', v_member_id,
      'message', 'joined'
    );
  ELSE
    UPDATE public.competition_members
    SET
      pix_key = v_clean_pix_key,
      pix_key_type = v_clean_type,
      pix_updated_at = now(),
      transparency_accepted = true,
      transparency_accepted_at = COALESCE(transparency_accepted_at, now())
    WHERE id = v_member_id;

    RETURN jsonb_build_object(
      'competition_id', p_competition_id,
      'membership_id', v_member_id,
      'message', 'already_member'
    );
  END IF;
END;
$$;
