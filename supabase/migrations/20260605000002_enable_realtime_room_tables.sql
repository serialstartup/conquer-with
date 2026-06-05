ALTER TABLE public.room_players REPLICA IDENTITY FULL;
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
