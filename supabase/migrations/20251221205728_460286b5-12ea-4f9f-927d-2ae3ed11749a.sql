-- Create comprehensive RPC for competition dashboard
-- Returns all data in a single call for optimal performance

CREATE OR REPLACE FUNCTION public.get_competition_dashboard(p_competition_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_competition record;
  v_is_host boolean := false;
  v_is_member boolean := false;
  v_member_team_id uuid := null;
  v_start_date date;
  v_end_date date;
  v_total_competition numeric := 0;
  v_total_user numeric := 0;
  v_total_user_team numeric := 0;
  v_result jsonb;
  v_ranking jsonb := '[]'::jsonb;
  v_team_ranking jsonb := '[]'::jsonb;
  v_platform_breakdown jsonb := '[]'::jsonb;
  v_user_platform_breakdown jsonb := '[]'::jsonb;
  v_daily_summary jsonb := '[]'::jsonb;
  v_participants_count int := 0;
  v_meta_reached boolean := false;
  v_winner_user_id uuid := null;
  v_winner_team_id uuid := null;
  v_winner_name text := null;
  v_winner_score numeric := 0;
BEGIN
  -- Get competition details
  SELECT * INTO v_competition
  FROM competitions c
  WHERE c.id = p_competition_id
    AND c.deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_start_date := v_competition.start_date;
  v_end_date := v_competition.end_date;

  -- Check if user is host
  v_is_host := (v_competition.created_by = v_user_id);

  -- Check if user is member
  SELECT EXISTS (
    SELECT 1 FROM competition_members cm
    WHERE cm.competition_id = p_competition_id
      AND cm.user_id = v_user_id
  ) INTO v_is_member;

  -- Get user's team if applicable
  IF v_is_member AND v_competition.allow_teams THEN
    SELECT ctm.team_id INTO v_member_team_id
    FROM competition_team_members ctm
    WHERE ctm.user_id = v_user_id
      AND ctm.team_id IN (
        SELECT ct.id FROM competition_teams ct WHERE ct.competition_id = p_competition_id
      );
  END IF;

  -- Count participants
  SELECT COUNT(*) INTO v_participants_count
  FROM competition_members cm
  WHERE cm.competition_id = p_competition_id
    AND cm.is_competitor = true;

  -- Check for existing results
  SELECT cr.meta_reached, cr.winner_user_id, cr.winner_team_id, cr.winner_score
  INTO v_meta_reached, v_winner_user_id, v_winner_team_id, v_winner_score
  FROM competition_results cr
  WHERE cr.competition_id = p_competition_id;

  -- Calculate totals from income_day_items for all members
  SELECT COALESCE(SUM(idi.amount), 0) INTO v_total_competition
  FROM income_day_items idi
  JOIN income_days id ON id.id = idi.income_day_id
  JOIN competition_members cm ON cm.user_id = id.user_id
  WHERE cm.competition_id = p_competition_id
    AND cm.is_competitor = true
    AND id.date >= v_start_date
    AND id.date <= v_end_date;

  -- Calculate user's total if member
  IF v_is_member THEN
    SELECT COALESCE(SUM(idi.amount), 0) INTO v_total_user
    FROM income_day_items idi
    JOIN income_days id ON id.id = idi.income_day_id
    WHERE id.user_id = v_user_id
      AND id.date >= v_start_date
      AND id.date <= v_end_date;
  END IF;

  -- Calculate team total if applicable
  IF v_member_team_id IS NOT NULL THEN
    SELECT COALESCE(SUM(idi.amount), 0) INTO v_total_user_team
    FROM income_day_items idi
    JOIN income_days id ON id.id = idi.income_day_id
    JOIN competition_team_members ctm ON ctm.user_id = id.user_id
    WHERE ctm.team_id = v_member_team_id
      AND id.date >= v_start_date
      AND id.date <= v_end_date;
  END IF;

  -- Build individual ranking
  SELECT jsonb_agg(r ORDER BY r.total_income DESC) INTO v_ranking
  FROM (
    SELECT
      cm.user_id,
      COALESCE(p.name, p.first_name, 'Participante') as display_name,
      cm.role,
      cm.is_competitor,
      COALESCE(SUM(idi.amount), 0) as total_income,
      CASE WHEN v_competition.goal_value > 0 
        THEN ROUND((COALESCE(SUM(idi.amount), 0) / v_competition.goal_value) * 100, 1)
        ELSE 0 
      END as progress
    FROM competition_members cm
    LEFT JOIN profiles p ON p.user_id = cm.user_id
    LEFT JOIN income_days id ON id.user_id = cm.user_id
      AND id.date >= v_start_date
      AND id.date <= v_end_date
    LEFT JOIN income_day_items idi ON idi.income_day_id = id.id
    WHERE cm.competition_id = p_competition_id
      AND cm.is_competitor = true
    GROUP BY cm.user_id, p.name, p.first_name, cm.role, cm.is_competitor
  ) r;

  -- Build team ranking if teams enabled
  IF v_competition.allow_teams THEN
    SELECT jsonb_agg(t ORDER BY t.team_score DESC) INTO v_team_ranking
    FROM (
      SELECT
        ct.id as team_id,
        ct.name as team_name,
        COALESCE(SUM(idi.amount), 0) as team_score,
        jsonb_agg(
          jsonb_build_object(
            'user_id', ctm.user_id,
            'display_name', COALESCE(p.name, p.first_name, 'Membro')
          )
        ) as members
      FROM competition_teams ct
      LEFT JOIN competition_team_members ctm ON ctm.team_id = ct.id
      LEFT JOIN profiles p ON p.user_id = ctm.user_id
      LEFT JOIN income_days id ON id.user_id = ctm.user_id
        AND id.date >= v_start_date
        AND id.date <= v_end_date
      LEFT JOIN income_day_items idi ON idi.income_day_id = id.id
      WHERE ct.competition_id = p_competition_id
      GROUP BY ct.id, ct.name
    ) t;
  END IF;

  -- Build platform breakdown (total competition)
  SELECT jsonb_agg(pb ORDER BY pb.total_value DESC) INTO v_platform_breakdown
  FROM (
    SELECT
      idi.platform as platform_key,
      COALESCE(idi.platform_label, idi.platform) as platform_name,
      COALESCE(SUM(idi.amount), 0) as total_value,
      CASE WHEN v_total_competition > 0 
        THEN ROUND((COALESCE(SUM(idi.amount), 0) / v_total_competition) * 100, 1)
        ELSE 0 
      END as percent
    FROM income_day_items idi
    JOIN income_days id ON id.id = idi.income_day_id
    JOIN competition_members cm ON cm.user_id = id.user_id
    WHERE cm.competition_id = p_competition_id
      AND cm.is_competitor = true
      AND id.date >= v_start_date
      AND id.date <= v_end_date
    GROUP BY idi.platform, idi.platform_label
  ) pb;

  -- Build user's platform breakdown if member
  IF v_is_member THEN
    SELECT jsonb_agg(upb ORDER BY upb.total_value DESC) INTO v_user_platform_breakdown
    FROM (
      SELECT
        idi.platform as platform_key,
        COALESCE(idi.platform_label, idi.platform) as platform_name,
        COALESCE(SUM(idi.amount), 0) as total_value,
        CASE WHEN v_total_user > 0 
          THEN ROUND((COALESCE(SUM(idi.amount), 0) / v_total_user) * 100, 1)
          ELSE 0 
        END as percent
      FROM income_day_items idi
      JOIN income_days id ON id.id = idi.income_day_id
      WHERE id.user_id = v_user_id
        AND id.date >= v_start_date
        AND id.date <= v_end_date
      GROUP BY idi.platform, idi.platform_label
    ) upb;
  END IF;

  -- Build daily summary (for members only)
  IF v_is_member THEN
    SELECT jsonb_agg(ds ORDER BY ds.date DESC) INTO v_daily_summary
    FROM (
      SELECT
        id.date::text as date,
        COALESCE(SUM(idi.amount), 0) as total_value,
        jsonb_agg(
          jsonb_build_object(
            'platform', idi.platform,
            'platform_label', COALESCE(idi.platform_label, idi.platform),
            'amount', idi.amount
          )
        ) as by_platform
      FROM income_days id
      JOIN income_day_items idi ON idi.income_day_id = id.id
      WHERE id.user_id = v_user_id
        AND id.date >= v_start_date
        AND id.date <= v_end_date
      GROUP BY id.date
    ) ds;
  END IF;

  -- Get winner name if exists
  IF v_winner_user_id IS NOT NULL THEN
    SELECT COALESCE(p.name, p.first_name, 'Vencedor') INTO v_winner_name
    FROM profiles p WHERE p.user_id = v_winner_user_id;
  ELSIF v_winner_team_id IS NOT NULL THEN
    SELECT ct.name INTO v_winner_name
    FROM competition_teams ct WHERE ct.id = v_winner_team_id;
  END IF;

  -- Build result
  v_result := jsonb_build_object(
    'competition', jsonb_build_object(
      'id', v_competition.id,
      'code', v_competition.code,
      'name', v_competition.name,
      'description', v_competition.description,
      'goal_type', v_competition.goal_type,
      'goal_value', v_competition.goal_value,
      'prize_value', v_competition.prize_value,
      'start_date', v_competition.start_date,
      'end_date', v_competition.end_date,
      'max_members', v_competition.max_members,
      'allow_teams', v_competition.allow_teams,
      'team_size', v_competition.team_size,
      'host_user_id', v_competition.created_by,
      'host_participates', v_competition.host_participates
    ),
    'viewer', jsonb_build_object(
      'is_host', v_is_host,
      'is_member', v_is_member,
      'team_id', v_member_team_id
    ),
    'totals', jsonb_build_object(
      'total_competition', v_total_competition,
      'total_user', v_total_user,
      'total_user_team', v_total_user_team,
      'goal_value', v_competition.goal_value,
      'progress_percent', CASE WHEN v_competition.goal_value > 0 
        THEN ROUND((v_total_competition / v_competition.goal_value) * 100, 1)
        ELSE 0 
      END,
      'remaining', GREATEST(v_competition.goal_value - v_total_competition, 0)
    ),
    'result', CASE WHEN v_winner_user_id IS NOT NULL OR v_winner_team_id IS NOT NULL THEN
      jsonb_build_object(
        'meta_reached', v_meta_reached,
        'winner_user_id', v_winner_user_id,
        'winner_team_id', v_winner_team_id,
        'winner_name', v_winner_name,
        'winner_score', v_winner_score
      )
    ELSE NULL END,
    'ranking', CASE WHEN v_is_member OR v_is_host THEN v_ranking ELSE NULL END,
    'team_ranking', CASE WHEN (v_is_member OR v_is_host) AND v_competition.allow_teams THEN v_team_ranking ELSE NULL END,
    'platform_breakdown', CASE WHEN v_is_member OR v_is_host THEN v_platform_breakdown ELSE NULL END,
    'user_platform_breakdown', CASE WHEN v_is_member THEN v_user_platform_breakdown ELSE NULL END,
    'daily_summary', CASE WHEN v_is_member THEN v_daily_summary ELSE NULL END,
    'participants_count', v_participants_count,
    'flags', jsonb_build_object(
      'is_started', (CURRENT_DATE >= v_start_date),
      'is_finalized', (CURRENT_DATE > v_end_date),
      'is_joinable', (CURRENT_DATE <= v_end_date)
    )
  );

  RETURN v_result;
END;
$$;