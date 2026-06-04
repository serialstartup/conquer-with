-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username text NOT NULL,
  is_guest bool DEFAULT true,
  wins int DEFAULT 0,
  games_played int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- questions
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('history', 'geography', 'general', 'sports')),
  difficulty int NOT NULL CHECK (difficulty BETWEEN 1 AND 3),
  text text NOT NULL,
  options jsonb NOT NULL,
  correct_index int NOT NULL CHECK (correct_index BETWEEN 0 AND 3)
);

-- rooms
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  host_id uuid REFERENCES public.profiles,
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  time_limit_minutes int DEFAULT 20,
  max_players int DEFAULT 4 CHECK (max_players BETWEEN 2 AND 4),
  created_at timestamptz DEFAULT now()
);

-- room_players
CREATE TABLE public.room_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.profiles,
  seat int NOT NULL CHECK (seat BETWEEN 1 AND 4),
  main_province_id int CHECK (main_province_id BETWEEN 0 AND 80),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(room_id, player_id),
  UNIQUE(room_id, seat)
);

-- game_states
CREATE TABLE public.game_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms UNIQUE,
  current_turn uuid REFERENCES public.profiles,
  provinces jsonb NOT NULL DEFAULT '{}',
  phase text DEFAULT 'playing' CHECK (phase IN ('setup', 'playing', 'battle', 'finished')),
  started_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- game_events
CREATE TABLE public.game_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
