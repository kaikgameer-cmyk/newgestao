-- Add new columns to competition_results (skip winner_total since it already exists)
ALTER TABLE public.competition_results 
ADD COLUMN IF NOT EXISTS goal_value numeric(12,2),
ADD COLUMN IF NOT EXISTS prize_value numeric(12,2),
ADD COLUMN IF NOT EXISTS meta_reached boolean NOT NULL DEFAULT false;

-- Create competition_payouts table
CREATE TABLE IF NOT EXISTS public.competition_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  team_id uuid REFERENCES public.competition_teams(id) ON DELETE SET NULL,
  payout_value numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('winner', 'loser', 'no_winner')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competition_id, user_id)
);

-- Enable RLS
ALTER TABLE public.competition_payouts ENABLE ROW LEVEL SECURITY;

-- RLS policies for competition_payouts
DROP POLICY IF EXISTS "Users can view own payouts" ON public.competition_payouts;
CREATE POLICY "Users can view own payouts"
ON public.competition_payouts
FOR SELECT
USING (user_id = auth.uid());

-- Drop existing finalize function to recreate with new logic
DROP FUNCTION IF EXISTS public.finalize_competition(uuid);

-- Create improved finalize_competition function
CREATE OR REPLACE FUNCTION public.finalize_competition(p_competition_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_competition record;
  v_winner_type text;
  v_winner_team_id uuid;
  v_winner_user_id uuid;
  v_winner_total numeric(12,2);
  v_meta_reached boolean := false;
  v_payout_per_winner numeric(12,2) := 0;
  v_winner_count int := 0;
  v_end_exclusive timestamptz;
BEGIN
  -- Get competition
  SELECT * INTO v_competition
  FROM public.competitions
  WHERE id = p_competition_id;

  IF v_competition IS NULL THEN
    RAISE EXCEPTION 'Competição não encontrada';
  END IF;

  -- Check if already finalized
  IF EXISTS (SELECT 1 FROM public.competition_results WHERE competition_id = p_competition_id) THEN
    RETURN (SELECT jsonb_build_object(
      'already_finalized', true,
      'winner_type', cr.winner_type,
      'winner_team_id', cr.winner_team_id,
      'winner_user_id', cr.winner_user_id,
      'winner_total', cr.winner_total,
      'meta_reached', cr.meta_reached
    ) FROM public.competition_results cr WHERE cr.competition_id = p_competition_id);
  END IF;

  -- Calculate end time (exclusive - midnight of next day in São Paulo timezone)
  v_end_exclusive := ((v_competition.end_date + interval '1 day')::date)::timestamptz AT TIME ZONE 'America/Sao_Paulo';
  
  -- Check if competition has actually ended
  IF now() AT TIME ZONE 'America/Sao_Paulo' < v_end_exclusive THEN
    RAISE EXCEPTION 'Competição ainda não finalizou';
  END IF;

  -- Determine winner based on team mode
  IF v_competition.allow_teams AND EXISTS (SELECT 1 FROM public.competition_teams WHERE competition_id = p_competition_id) THEN
    -- Team mode: find winning team
    SELECT ct.id, COALESCE(SUM(idi.amount), 0)::numeric(12,2) as total_score
    INTO v_winner_team_id, v_winner_total
    FROM public.competition_teams ct
    LEFT JOIN public.competition_team_members ctm ON ctm.team_id = ct.id
    LEFT JOIN public.competition_members cm ON cm.user_id = ctm.user_id AND cm.competition_id = ct.competition_id
    LEFT JOIN public.income_days id ON id.user_id = ctm.user_id 
      AND id.date >= v_competition.start_date 
      AND id.date <= v_competition.end_date
    LEFT JOIN public.income_day_items idi ON idi.income_day_id = id.id
    WHERE ct.competition_id = p_competition_id
      AND cm.is_competitor = true
    GROUP BY ct.id
    ORDER BY total_score DESC
    LIMIT 1;

    -- Check if meta was reached
    v_meta_reached := COALESCE(v_winner_total, 0) >= v_competition.goal_value;
    
    IF v_meta_reached AND v_winner_team_id IS NOT NULL THEN
      v_winner_type := 'team';
      -- Count winners (competitors in winning team)
      SELECT COUNT(*) INTO v_winner_count
      FROM public.competition_team_members ctm
      JOIN public.competition_members cm ON cm.user_id = ctm.user_id AND cm.competition_id = p_competition_id
      WHERE ctm.team_id = v_winner_team_id AND cm.is_competitor = true;
      
      IF v_winner_count > 0 THEN
        v_payout_per_winner := ROUND(v_competition.prize_value / v_winner_count, 2);
      END IF;
    ELSE
      v_winner_type := 'none';
      v_winner_team_id := NULL;
    END IF;
  ELSE
    -- Individual mode: find winning user
    SELECT cm.user_id, COALESCE(SUM(idi.amount), 0)::numeric(12,2) as total_score
    INTO v_winner_user_id, v_winner_total
    FROM public.competition_members cm
    LEFT JOIN public.income_days id ON id.user_id = cm.user_id 
      AND id.date >= v_competition.start_date 
      AND id.date <= v_competition.end_date
    LEFT JOIN public.income_day_items idi ON idi.income_day_id = id.id
    WHERE cm.competition_id = p_competition_id
      AND cm.is_competitor = true
    GROUP BY cm.user_id
    ORDER BY total_score DESC
    LIMIT 1;

    -- Check if meta was reached
    v_meta_reached := COALESCE(v_winner_total, 0) >= v_competition.goal_value;
    
    IF v_meta_reached AND v_winner_user_id IS NOT NULL THEN
      v_winner_type := 'individual';
      v_payout_per_winner := v_competition.prize_value;
      v_winner_count := 1;
    ELSE
      v_winner_type := 'none';
      v_winner_user_id := NULL;
    END IF;
  END IF;

  -- Store result
  INSERT INTO public.competition_results (
    competition_id, winner_type, winner_team_id, winner_user_id, winner_total,
    goal_value, prize_value, meta_reached
  ) VALUES (
    p_competition_id, v_winner_type, v_winner_team_id, v_winner_user_id, COALESCE(v_winner_total, 0),
    v_competition.goal_value, v_competition.prize_value, v_meta_reached
  );

  -- Create payouts for all members
  IF v_winner_type = 'team' AND v_meta_reached THEN
    -- Winners: members of winning team who are competitors
    INSERT INTO public.competition_payouts (competition_id, user_id, team_id, payout_value, status)
    SELECT 
      p_competition_id,
      ctm.user_id,
      v_winner_team_id,
      v_payout_per_winner,
      'winner'
    FROM public.competition_team_members ctm
    JOIN public.competition_members cm ON cm.user_id = ctm.user_id AND cm.competition_id = p_competition_id
    WHERE ctm.team_id = v_winner_team_id AND cm.is_competitor = true
    ON CONFLICT (competition_id, user_id) DO NOTHING;

    -- Losers: all other competitors
    INSERT INTO public.competition_payouts (competition_id, user_id, team_id, payout_value, status)
    SELECT 
      p_competition_id,
      cm.user_id,
      ctm.team_id,
      0,
      'loser'
    FROM public.competition_members cm
    LEFT JOIN public.competition_team_members ctm ON ctm.user_id = cm.user_id 
      AND ctm.team_id IN (SELECT id FROM public.competition_teams WHERE competition_id = p_competition_id)
    WHERE cm.competition_id = p_competition_id
      AND cm.is_competitor = true
      AND NOT EXISTS (
        SELECT 1 FROM public.competition_payouts cp 
        WHERE cp.competition_id = p_competition_id AND cp.user_id = cm.user_id
      )
    ON CONFLICT (competition_id, user_id) DO NOTHING;

  ELSIF v_winner_type = 'individual' AND v_meta_reached THEN
    -- Winner
    INSERT INTO public.competition_payouts (competition_id, user_id, payout_value, status)
    VALUES (p_competition_id, v_winner_user_id, v_payout_per_winner, 'winner')
    ON CONFLICT (competition_id, user_id) DO NOTHING;

    -- Losers
    INSERT INTO public.competition_payouts (competition_id, user_id, payout_value, status)
    SELECT p_competition_id, cm.user_id, 0, 'loser'
    FROM public.competition_members cm
    WHERE cm.competition_id = p_competition_id
      AND cm.is_competitor = true
      AND cm.user_id != v_winner_user_id
    ON CONFLICT (competition_id, user_id) DO NOTHING;

  ELSE
    -- No winner - everyone gets no_winner status
    INSERT INTO public.competition_payouts (competition_id, user_id, payout_value, status)
    SELECT p_competition_id, cm.user_id, 0, 'no_winner'
    FROM public.competition_members cm
    WHERE cm.competition_id = p_competition_id
      AND cm.is_competitor = true
    ON CONFLICT (competition_id, user_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'finalized', true,
    'winner_type', v_winner_type,
    'winner_team_id', v_winner_team_id,
    'winner_user_id', v_winner_user_id,
    'winner_total', v_winner_total,
    'meta_reached', v_meta_reached,
    'payout_per_winner', v_payout_per_winner
  );
END;
$$;

-- Create function to check finish result popup
CREATE OR REPLACE FUNCTION public.check_finish_result_popup(p_competition_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_payout record;
  v_already_shown boolean := false;
  v_winner_name text;
  v_result record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Check if payout exists for this user
  SELECT * INTO v_payout
  FROM public.competition_payouts
  WHERE competition_id = p_competition_id AND user_id = v_user_id;

  IF v_payout IS NULL THEN
    RETURN jsonb_build_object('show_popup', false, 'reason', 'no_payout');
  END IF;

  -- Check if already shown
  SELECT EXISTS (
    SELECT 1 FROM public.competition_user_popups
    WHERE competition_id = p_competition_id
    AND user_id = v_user_id
    AND popup_type = 'finish_result'
  ) INTO v_already_shown;

  IF v_already_shown THEN
    RETURN jsonb_build_object('show_popup', false, 'reason', 'already_shown');
  END IF;

  -- Get winner name for context
  SELECT * INTO v_result
  FROM public.competition_results
  WHERE competition_id = p_competition_id;

  IF v_result.winner_type = 'team' AND v_result.winner_team_id IS NOT NULL THEN
    SELECT name INTO v_winner_name
    FROM public.competition_teams
    WHERE id = v_result.winner_team_id;
  ELSIF v_result.winner_type = 'individual' AND v_result.winner_user_id IS NOT NULL THEN
    SELECT COALESCE(p.name, 'Usuário') INTO v_winner_name
    FROM public.profiles p
    WHERE p.user_id = v_result.winner_user_id;
  END IF;

  RETURN jsonb_build_object(
    'show_popup', true,
    'status', v_payout.status,
    'payout_value', v_payout.payout_value,
    'winner_name', v_winner_name,
    'winner_type', v_result.winner_type,
    'meta_reached', v_result.meta_reached
  );
END;
$$;

-- Function to mark finish result popup as shown
CREATE OR REPLACE FUNCTION public.mark_finish_result_popup_shown(p_competition_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  INSERT INTO public.competition_user_popups (competition_id, user_id, popup_type)
  VALUES (p_competition_id, v_user_id, 'finish_result')
  ON CONFLICT DO NOTHING;

  RETURN true;
END;
$$;