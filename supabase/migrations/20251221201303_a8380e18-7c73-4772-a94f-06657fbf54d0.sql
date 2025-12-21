-- Drop and recreate get_competitions_for_tabs with correct timezone logic
DROP FUNCTION IF EXISTS public.get_competitions_for_tabs();

CREATE OR REPLACE FUNCTION public.get_competitions_for_tabs()
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  start_date date,
  end_date date,
  prize_value numeric,
  goal_value numeric,
  allow_teams boolean,
  host_user_id uuid,
  participants_count bigint,
  user_is_member boolean,
  user_is_host boolean,
  computed_status text,
  computed_label text,
  meta_reached boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  local_now timestamp;
  current_user_id uuid;
BEGIN
  -- Get the current user ID
  current_user_id := auth.uid();
  
  -- Get current time in America/Sao_Paulo timezone
  local_now := (now() AT TIME ZONE 'America/Sao_Paulo');
  
  RETURN QUERY
  WITH competition_data AS (
    SELECT 
      c.id,
      c.name,
      c.description,
      c.start_date,
      c.end_date,
      c.prize_value,
      c.goal_value,
      c.allow_teams,
      c.created_by AS host_user_id,
      c.is_listed,
      c.max_members,
      -- Count participants
      (SELECT COUNT(*) FROM competition_members cm WHERE cm.competition_id = c.id) AS participants_count,
      -- Check if current user is a member
      EXISTS (
        SELECT 1 FROM competition_members cm 
        WHERE cm.competition_id = c.id AND cm.user_id = current_user_id
      ) AS user_is_member,
      -- Check if current user is the host
      (c.created_by = current_user_id) AS user_is_host,
      -- Check if competition has result record
      (SELECT cr.meta_reached FROM competition_results cr WHERE cr.competition_id = c.id) AS result_meta_reached,
      (SELECT cr.finished_at FROM competition_results cr WHERE cr.competition_id = c.id) AS finished_at,
      -- Compute status based on dates with Sao Paulo timezone
      -- end_exclusive = 00:00:00 of (end_date + 1) in Sao Paulo
      -- Competition is finished when local_now >= end_exclusive OR finished_at is not null
      CASE
        WHEN EXISTS (SELECT 1 FROM competition_results cr WHERE cr.competition_id = c.id) THEN 'finished'
        WHEN local_now >= ((c.end_date + INTERVAL '1 day')::timestamp) THEN 'finished'
        WHEN local_now < (c.start_date::timestamp) THEN 'future'
        ELSE 'running'
      END AS date_status
    FROM competitions c
    WHERE 
      -- User can see: competitions they created, competitions they're member of, or listed competitions
      c.created_by = current_user_id
      OR EXISTS (SELECT 1 FROM competition_members cm WHERE cm.competition_id = c.id AND cm.user_id = current_user_id)
      OR c.is_listed = true
  )
  SELECT 
    cd.id,
    cd.name,
    cd.description,
    cd.start_date,
    cd.end_date,
    cd.prize_value,
    cd.goal_value,
    cd.allow_teams,
    cd.host_user_id,
    cd.participants_count,
    cd.user_is_member,
    cd.user_is_host,
    -- Compute the tab status
    CASE
      WHEN cd.date_status = 'finished' THEN 'finished'
      WHEN cd.user_is_member OR cd.user_is_host THEN 'mine'
      WHEN cd.is_listed = true 
           AND cd.date_status != 'finished'
           AND (cd.max_members IS NULL OR cd.participants_count < cd.max_members) THEN 'available'
      ELSE 'mine' -- Fallback for edge cases
    END AS computed_status,
    -- Compute the display label
    CASE
      WHEN cd.date_status = 'finished' THEN 'Finalizada'
      WHEN cd.date_status = 'future' AND (cd.user_is_member OR cd.user_is_host) THEN 'Aguardando início'
      WHEN cd.date_status = 'future' THEN 'Participe agora'
      WHEN cd.date_status = 'running' THEN 'Em andamento'
      ELSE 'Finalizada'
    END AS computed_label,
    COALESCE(cd.result_meta_reached, false) AS meta_reached
  FROM competition_data cd
  ORDER BY 
    CASE 
      WHEN cd.date_status = 'running' THEN 1
      WHEN cd.date_status = 'future' THEN 2
      ELSE 3
    END,
    cd.end_date DESC;
END;
$$;