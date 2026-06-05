CREATE OR REPLACE FUNCTION increment_games_played(player_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET games_played = COALESCE(games_played, 0) + 1
  WHERE id = player_id;
END;
$$;
