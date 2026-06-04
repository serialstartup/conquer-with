-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- questions: herkese okunabilir
CREATE POLICY "questions_select" ON public.questions FOR SELECT USING (true);

-- rooms
CREATE POLICY "rooms_select" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "rooms_insert" ON public.rooms FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "rooms_update" ON public.rooms FOR UPDATE USING (auth.uid() = host_id);

-- room_players
CREATE POLICY "room_players_select" ON public.room_players FOR SELECT USING (true);
CREATE POLICY "room_players_insert" ON public.room_players FOR INSERT WITH CHECK (auth.uid() = player_id);
CREATE POLICY "room_players_delete" ON public.room_players FOR DELETE USING (auth.uid() = player_id);

-- game_states: oda üyeleri
CREATE POLICY "game_states_select" ON public.game_states FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.room_players
    WHERE room_players.room_id = game_states.room_id
    AND room_players.player_id = auth.uid()
  )
);
CREATE POLICY "game_states_insert" ON public.game_states FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rooms
    WHERE rooms.id = room_id
    AND rooms.host_id = auth.uid()
  )
);
CREATE POLICY "game_states_update" ON public.game_states FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.room_players
    WHERE room_players.room_id = game_states.room_id
    AND room_players.player_id = auth.uid()
  )
);

-- game_events: oda üyeleri
CREATE POLICY "game_events_select" ON public.game_events FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.room_players
    WHERE room_players.room_id = game_events.room_id
    AND room_players.player_id = auth.uid()
  )
);
CREATE POLICY "game_events_insert" ON public.game_events FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_players
    WHERE room_players.room_id = game_events.room_id
    AND room_players.player_id = auth.uid()
  )
);
