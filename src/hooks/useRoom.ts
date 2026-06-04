import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function useRoom() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createRoom(timeLimitMinutes = 20, maxPlayers: 2 | 3 | 4 = 4): Promise<string | null> {
    if (!user || !profile) return null;
    setLoading(true);
    setError(null);
    try {
      const code = generateRoomCode();
      const { data, error } = await supabase
        .from("rooms")
        .insert({ code, host_id: user.id, time_limit_minutes: timeLimitMinutes, max_players: maxPlayers })
        .select("id")
        .single();
      if (error) throw error;

      // host da room_players'a eklenir (seat 1)
      await supabase
        .from("room_players")
        .insert({ room_id: data.id, player_id: user.id, seat: 1 });

      return data.id;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Oda oluşturulamadı");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function joinRoom(code: string): Promise<string | null> {
    if (!user || !profile) return null;
    setLoading(true);
    setError(null);
    try {
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select("id, status, max_players")
        .eq("code", code.toUpperCase())
        .eq("status", "waiting")
        .single();

      if (roomError || !room) throw new Error("Oda bulunamadı veya oyun başladı");

      // Mevcut oyuncu sayısını kontrol et
      const { count } = await supabase
        .from("room_players")
        .select("*", { count: "exact", head: true })
        .eq("room_id", room.id);

      if ((count ?? 0) >= room.max_players) throw new Error("Oda dolu");

      // Zaten katılmış mı?
      const { data: existing } = await supabase
        .from("room_players")
        .select("id")
        .eq("room_id", room.id)
        .eq("player_id", user.id)
        .maybeSingle();

      if (existing) return room.id;

      const seat = (count ?? 0) + 1;
      const { error: insertError } = await supabase
        .from("room_players")
        .insert({ room_id: room.id, player_id: user.id, seat });

      if (insertError) throw insertError;
      return room.id;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Odaya katılınamadı");
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { createRoom, joinRoom, loading, error };
}
