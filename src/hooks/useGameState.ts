import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { GameState } from "@/types/game";

export function useGameState(roomId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const { data } = await supabase
        .from("game_states")
        .select("*")
        .eq("room_id", roomId)
        .single();
      if (isMounted && data) setGameState(data as GameState);
      if (isMounted) setLoading(false);
    }

    load();

    const channelName = `game:${roomId}:${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_states", filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (isMounted) setGameState(payload.new as GameState);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  async function updateGameState(updates: Partial<Pick<GameState, "provinces" | "current_turn" | "phase">>) {
    if (!gameState) return;
    const { error } = await supabase
      .from("game_states")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("room_id", roomId);
    if (error) console.error("[useGameState] update error:", error);
  }

  return { gameState, loading, updateGameState };
}
