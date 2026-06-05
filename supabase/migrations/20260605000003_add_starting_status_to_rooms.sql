ALTER TABLE public.rooms
  DROP CONSTRAINT rooms_status_check,
  ADD CONSTRAINT rooms_status_check CHECK (status IN ('waiting', 'starting', 'playing', 'finished'));
