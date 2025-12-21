-- Create competition_results table to store final results
CREATE TABLE IF NOT EXISTS public.competition_results (
  competition_id uuid PRIMARY KEY REFERENCES public.competitions(id) ON DELETE CASCADE,
  finished_at timestamptz NOT NULL DEFAULT now(),
  winner_type text NOT NULL CHECK (winner_type IN ('team', 'individual')),
  winner_team_id uuid REFERENCES public.competition_teams(id) ON DELETE SET NULL,
  winner_user_id uuid,
  winner_score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.competition_results ENABLE ROW LEVEL SECURITY;

-- RLS: Members of the competition can view results
CREATE POLICY "Members can view competition results"
ON public.competition_results
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.competition_members cm
    WHERE cm.competition_id = competition_results.competition_id
    AND cm.user_id = auth.uid()
  )
);

-- Create competition_user_popups table to track shown popups
CREATE TABLE IF NOT EXISTS public.competition_user_popups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  popup_type text NOT NULL DEFAULT 'winner_congrats',
  shown_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competition_id, user_id, popup_type)
);

-- Enable RLS
ALTER TABLE public.competition_user_popups ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view/insert their own popup records
CREATE POLICY "Users can view own popup records"
ON public.competition_user_popups
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own popup records"
ON public.competition_user_popups
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Create function to calculate and store competition winner
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
  v_winner_score numeric;
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
    -- Return existing result
    SELECT jsonb_build_object(
      'already_finalized', true,
      'winner_type', cr.winner_type,
      'winner_team_id', cr.winner_team_id,
      'winner_user_id', cr.winner_user_id,
      'winner_score', cr.winner_score
    ) INTO v_winner_score
    FROM public.competition_results cr
    WHERE cr.competition_id = p_competition_id;
    
    RETURN (SELECT jsonb_build_object(
      'already_finalized', true,
      'winner_type', cr.winner_type,
      'winner_team_id', cr.winner_team_id,
      'winner_user_id', cr.winner_user_id,
      'winner_score', cr.winner_score
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
    v_winner_type := 'team';
    
    SELECT ct.id, COALESCE(SUM(idi.amount), 0) as total_score
    INTO v_winner_team_id, v_winner_score
    FROM public.competition_teams ct
    LEFT JOIN public.competition_team_members ctm ON ctm.team_id = ct.id
    LEFT JOIN public.competition_members cm ON cm.user_id = ctm.user_id AND cm.competition_id = ct.competition_id
    LEFT JOIN public.income_days id ON id.user_id = ctm.user_id 
      AND id.date >= v_competition.start_date 
      AND id.date <= v_competition.end_date
    LEFT JOIN public.income_day_items idi ON idi.income_day_id = id.id
    WHERE ct.competition_id = p_competition_id
      AND (cm.is_competitor = true OR cm.is_competitor IS NULL)
    GROUP BY ct.id
    ORDER BY total_score DESC
    LIMIT 1;
  ELSE
    -- Individual mode: find winning user
    v_winner_type := 'individual';
    
    SELECT cm.user_id, COALESCE(SUM(idi.amount), 0) as total_score
    INTO v_winner_user_id, v_winner_score
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
  END IF;

  -- Store result
  INSERT INTO public.competition_results (
    competition_id, winner_type, winner_team_id, winner_user_id, winner_score
  ) VALUES (
    p_competition_id, v_winner_type, v_winner_team_id, v_winner_user_id, COALESCE(v_winner_score, 0)
  );

  RETURN jsonb_build_object(
    'finalized', true,
    'winner_type', v_winner_type,
    'winner_team_id', v_winner_team_id,
    'winner_user_id', v_winner_user_id,
    'winner_score', v_winner_score
  );
END;
$$;

-- Create function to check if user is a winner and should see popup
CREATE OR REPLACE FUNCTION public.check_competition_winner_popup(p_competition_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_result record;
  v_is_winner boolean := false;
  v_already_shown boolean := false;
  v_winner_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Check if result exists
  SELECT * INTO v_result
  FROM public.competition_results
  WHERE competition_id = p_competition_id;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('show_popup', false, 'reason', 'no_result');
  END IF;

  -- Check if already shown
  SELECT EXISTS (
    SELECT 1 FROM public.competition_user_popups
    WHERE competition_id = p_competition_id
    AND user_id = v_user_id
    AND popup_type = 'winner_congrats'
  ) INTO v_already_shown;

  IF v_already_shown THEN
    RETURN jsonb_build_object('show_popup', false, 'reason', 'already_shown');
  END IF;

  -- Check if user is a winner
  IF v_result.winner_type = 'team' AND v_result.winner_team_id IS NOT NULL THEN
    -- Check if user is in winning team
    SELECT EXISTS (
      SELECT 1 FROM public.competition_team_members ctm
      WHERE ctm.team_id = v_result.winner_team_id
      AND ctm.user_id = v_user_id
    ) INTO v_is_winner;
    
    -- Get team name
    SELECT name INTO v_winner_name
    FROM public.competition_teams
    WHERE id = v_result.winner_team_id;
  ELSE
    -- Check if user is the individual winner
    v_is_winner := (v_result.winner_user_id = v_user_id);
    
    IF v_is_winner THEN
      SELECT COALESCE(p.name, 'Você') INTO v_winner_name
      FROM public.profiles p
      WHERE p.user_id = v_user_id;
    END IF;
  END IF;

  IF v_is_winner THEN
    RETURN jsonb_build_object(
      'show_popup', true,
      'winner_type', v_result.winner_type,
      'winner_name', v_winner_name,
      'winner_score', v_result.winner_score
    );
  END IF;

  RETURN jsonb_build_object('show_popup', false, 'reason', 'not_winner');
END;
$$;

-- Create function to mark popup as shown
CREATE OR REPLACE FUNCTION public.mark_winner_popup_shown(p_competition_id uuid)
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
  VALUES (p_competition_id, v_user_id, 'winner_congrats')
  ON CONFLICT (competition_id, user_id, popup_type) DO NOTHING;

  RETURN true;
END;
$$;