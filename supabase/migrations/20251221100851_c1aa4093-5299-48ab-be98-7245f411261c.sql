CREATE OR REPLACE FUNCTION public.finalize_competition_if_needed(p_competition_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_competition record;
  v_result record;
  v_end_exclusive timestamptz;
BEGIN
  -- Ensure competition exists
  SELECT * INTO v_competition
  FROM public.competitions
  WHERE id = p_competition_id;

  IF v_competition IS NULL THEN
    RAISE EXCEPTION 'Competição não encontrada';
  END IF;

  -- If result already exists, return idempotent response
  SELECT * INTO v_result
  FROM public.competition_results
  WHERE competition_id = p_competition_id;

  IF v_result IS NOT NULL THEN
    RETURN jsonb_build_object(
      'already_finalized', true,
      'winner_type', v_result.winner_type,
      'winner_team_id', v_result.winner_team_id,
      'winner_user_id', v_result.winner_user_id,
      'winner_total', v_result.winner_score,
      'meta_reached', v_result.meta_reached
    );
  END IF;

  -- Calculate end time in America/Sao_Paulo timezone (same logic as finalize_competition)
  v_end_exclusive := ((v_competition.end_date + interval '1 day')::date)::timestamptz AT TIME ZONE 'America/Sao_Paulo';

  -- If competition is not yet finished, do nothing (lazy behavior)
  IF now() AT TIME ZONE 'America/Sao_Paulo' < v_end_exclusive THEN
    RETURN jsonb_build_object(
      'already_finalized', false,
      'finalized', false,
      'reason', 'not_finished'
    );
  END IF;

  -- Competition finished and not yet finalized: delegate to finalize_competition
  RETURN public.finalize_competition(p_competition_id);
END;
$function$;