-- Drop and recreate the function to include user_rank
DROP FUNCTION IF EXISTS get_competitions_for_tabs();

CREATE OR REPLACE FUNCTION get_competitions_for_tabs()
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  goal_value numeric,
  prize_value numeric,
  start_date date,
  end_date date,
  allow_teams boolean,
  participants_count bigint,
  user_is_member boolean,
  user_is_host boolean,
  host_user_id uuid,
  computed_status text,
  computed_label text,
  meta_reached boolean,
  user_rank bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_now date := current_date;
BEGIN
  RETURN QUERY
  WITH competition_data AS (
    SELECT
      c.id,
      c.name,
      c.description,
      c.goal_value,
      c.prize_value,
      c.start_date,
      c.end_date,
      c.allow_teams,
      c.created_by,
      c.is_listed,
      c.deleted_at,
      (SELECT COUNT(*) FROM competition_members cm WHERE cm.competition_id = c.id AND cm.is_competitor = true) AS participants_count,
      EXISTS(SELECT 1 FROM competition_members cm WHERE cm.competition_id = c.id AND cm.user_id = v_user_id) AS user_is_member,
      (c.created_by = v_user_id) AS user_is_host,
      cr.meta_reached
    FROM competitions c
    LEFT JOIN competition_results cr ON cr.competition_id = c.id
    WHERE c.deleted_at IS NULL
      AND (
        c.created_by = v_user_id
        OR EXISTS(SELECT 1 FROM competition_members cm WHERE cm.competition_id = c.id AND cm.user_id = v_user_id)
        OR c.is_listed = true
      )
  ),
  user_rankings AS (
    -- Calculate user rank for competitions they are a member of
    SELECT 
      cd.id AS competition_id,
      (
        SELECT ranked.rank
        FROM (
          SELECT 
            cm2.user_id,
            ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(idi.amount), 0) DESC) as rank
          FROM competition_members cm2
          LEFT JOIN income_day_items idi ON idi.user_id = cm2.user_id
            AND idi.created_at::date >= cd.start_date
            AND idi.created_at::date <= cd.end_date
          WHERE cm2.competition_id = cd.id
            AND cm2.is_competitor = true
          GROUP BY cm2.user_id
        ) ranked
        WHERE ranked.user_id = v_user_id
      ) AS user_rank
    FROM competition_data cd
    WHERE cd.user_is_member = true
  )
  SELECT
    cd.id,
    cd.name,
    cd.description,
    cd.goal_value,
    cd.prize_value,
    cd.start_date,
    cd.end_date,
    cd.allow_teams,
    cd.participants_count,
    cd.user_is_member,
    cd.user_is_host,
    cd.created_by AS host_user_id,
    CASE
      WHEN cd.user_is_member THEN 'mine'
      WHEN cd.end_date < v_now THEN 'finished'
      ELSE 'available'
    END AS computed_status,
    CASE
      WHEN cd.end_date < v_now THEN 'Finalizada'
      WHEN cd.start_date > v_now THEN 
        CASE WHEN cd.user_is_member THEN 'Aguardando início' ELSE 'Participe agora' END
      ELSE 'Em andamento'
    END AS computed_label,
    COALESCE(cd.meta_reached, false) AS meta_reached,
    ur.user_rank
  FROM competition_data cd
  LEFT JOIN user_rankings ur ON ur.competition_id = cd.id
  ORDER BY 
    CASE 
      WHEN cd.user_is_member THEN 0
      WHEN cd.end_date < v_now THEN 2
      ELSE 1
    END,
    cd.start_date DESC;
END;
$$;