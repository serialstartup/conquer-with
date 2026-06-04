-- game_states ve game_events için Realtime aktif et
ALTER TABLE public.game_states REPLICA IDENTITY FULL;
ALTER TABLE public.game_events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_states;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_events;
