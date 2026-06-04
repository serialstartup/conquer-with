export type ProvinceState = {
  owner_id: string | null;
  soldiers: number;
  castle_level: number;
};

export type Provinces = Record<string, ProvinceState>; // key: "0"-"80"

export type GamePhase = "setup" | "playing" | "battle" | "finished";

export type RoomStatus = "waiting" | "playing" | "finished";

export type QuestionCategory = "history" | "geography" | "general" | "sports";

export type Question = {
  id: string;
  category: QuestionCategory;
  difficulty: 1 | 2 | 3;
  text: string;
  options: [string, string, string, string];
  correct_index: 0 | 1 | 2 | 3;
};

export type Province = {
  id: number;
  name: string;
  region: string;
  difficulty: 1 | 2 | 3;
};

export type Player = {
  id: string;
  username: string;
  is_guest: boolean;
  seat: number;
  main_province_id: number | null;
};

export type Room = {
  id: string;
  code: string;
  host_id: string;
  status: RoomStatus;
  time_limit_minutes: number;
  max_players: 2 | 3 | 4;
};

export type GameState = {
  id: string;
  room_id: string;
  current_turn: string;
  provinces: Provinces;
  phase: GamePhase;
  started_at: string | null;
  updated_at: string;
};
