import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { Provinces } from "@/types/game";

type PlayerResult = {
  player_id: string;
  username: string;
  seat: number;
  main_province_id: number;
  province_count: number;
  is_winner: boolean;
};

const SEAT_COLORS = [
  "bg-blue-600", "bg-red-600", "bg-green-600", "bg-yellow-600",
] as const;

export default function ResultsScreen() {
  const { id: roomId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [winReason, setWinReason] = useState<"castle" | "time">("time");

  useEffect(() => {
    loadResults();
  }, [roomId]);

  async function loadResults() {
    const [{ data: gamePlayers }, { data: gameState }] = await Promise.all([
      supabase
        .from("room_players")
        .select("player_id, seat, main_province_id, profiles(username)")
        .eq("room_id", roomId)
        .order("seat"),
      supabase
        .from("game_states")
        .select("provinces")
        .eq("room_id", roomId)
        .single(),
    ]);

    if (!gamePlayers || !gameState) { setLoading(false); return; }

    const provinces = gameState.provinces as Provinces;

    const playerResults: PlayerResult[] = (gamePlayers as unknown as Array<{
      player_id: string;
      seat: number;
      main_province_id: number;
      profiles: { username: string } | null;
    }>).map((p) => {
      const provinceCount = Object.values(provinces).filter(
        (prov) => prov.owner_id === p.player_id
      ).length;
      return {
        player_id: p.player_id,
        username: p.profiles?.username ?? "?",
        seat: p.seat,
        main_province_id: p.main_province_id,
        province_count: provinceCount,
        is_winner: false,
      };
    });

    playerResults.sort((a, b) => b.province_count - a.province_count || a.seat - b.seat);
    if (playerResults.length > 0) playerResults[0].is_winner = true;

    const castleCapture = playerResults.some((p) => {
      const mainState = provinces[String(p.main_province_id)];
      return mainState && mainState.owner_id !== p.player_id && mainState.owner_id !== null;
    });
    setWinReason(castleCapture ? "castle" : "time");

    setResults(playerResults);
    setLoading(false);

    for (const p of playerResults) {
      try {
        await supabase.rpc("increment_games_played", { player_id: p.player_id });
      } catch {
        // RPC mevcut değilse sessizce geç
      }
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  const winner = results[0];
  const isIWon = winner?.player_id === user?.id;

  return (
    <View className="flex-1 flex-row bg-slate-900">
      <View className="border-r border-slate-700 bg-slate-800/40 justify-center px-8" style={{ flex: 5 }}>
        <Text className="text-amber-400 text-xl font-bold tracking-widest uppercase mb-1">
          {isIWon ? "Tebrikler!" : "Oyun Bitti"}
        </Text>
        <Text className="text-slate-400 text-sm mb-6">
          {winReason === "castle" ? "Ana kale fethedildi" : "Süre doldu"}
        </Text>
        {winner && (
          <View className="bg-yellow-900/40 border border-yellow-600 rounded-2xl p-5 items-center">
            <Text className="text-yellow-400 text-sm font-semibold mb-1">Kazanan</Text>
            <Text className="text-white text-2xl font-bold">{winner.username}</Text>
            <Text className="text-yellow-300 text-lg font-semibold mt-1">{winner.province_count} il</Text>
          </View>
        )}
      </View>
      <View className="py-6 px-6" style={{ flex: 5 }}>
        <Text className="text-slate-400 text-sm font-semibold mb-3 uppercase tracking-wide">Sıralama</Text>
        <ScrollView className="flex-1 mb-4">
          {results.map((player, index) => {
            const color = SEAT_COLORS[(player.seat - 1) % SEAT_COLORS.length];
            const isMe = player.player_id === user?.id;
            return (
              <View
                key={player.player_id}
                className={`flex-row items-center rounded-xl px-4 py-3 mb-2 bg-slate-800 ${isMe ? "border border-slate-500" : ""}`}
              >
                <View className={`w-8 h-8 rounded-full ${color} items-center justify-center mr-3`}>
                  <Text className="text-white font-bold text-sm">{index + 1}</Text>
                </View>
                <Text className="text-white font-semibold flex-1">
                  {player.username}{isMe ? " (Sen)" : ""}
                </Text>
                <Text className="text-slate-300 font-bold">{player.province_count} il</Text>
              </View>
            );
          })}
        </ScrollView>
        <TouchableOpacity
          className="bg-slate-700 rounded-xl py-3 items-center"
          onPress={() => router.replace("/")}
        >
          <Text className="text-white text-lg font-bold">Ana Menüye Dön</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
