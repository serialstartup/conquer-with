CREATE POLICY "room_players_update" ON public.room_players FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.rooms
    WHERE rooms.id = room_players.room_id
    AND rooms.host_id = auth.uid()
  )
);
