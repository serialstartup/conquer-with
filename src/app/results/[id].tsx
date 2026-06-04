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

    // Her oyuncunun il sayısını hesapla
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

    // Kazananı belirle: en fazla ile sahip olan (beraberde seat 1 kazanır)
    playerResults.sort((a, b) => b.province_count - a.province_count || a.seat - b.seat);
    if (playerResults.length > 0) playerResults[0].is_winner = true;

    // Ana kale düşmüş mü?
    const castleCapture = playerResults.some((p) => {
      const mainState = provinces[String(p.main_province_id)];
      return mainState && mainState.owner_id !== p.player_id && mainState.owner_id !== null;
    });
    setWinReason(castleCapture ? "castle" : "time");

    setResults(playerResults);
    setLoading(false);

    // profiles tablosunu güncelle (games_played++)
    for (const p of playerResults) {
      try {
        await supabase.rpc("increment_games_played", { player_id: p.player_id });
      } catch {
        // RPC mevcut değilse sessizce geç
      }
    }
  }

  const SEAT_COLORS = [
    "bg-blue-600", "bg-red-600", "bg-green-600", "bg-yellow-600",
  ] as const;

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
    <View className="flex-1 bg-slate-900">
      <ScrollView contentContainerClassName="px-6 pt-14 pb-10">
        {/* Başlık */}
        <Text className="text-white text-4xl font-bold text-center mb-1">
          {isIWon ? "Tebrikler!" : "Oyun Bitti"}
        </Text>
        <Text className="text-slate-400 text-center mb-8">
          {winReason === "castle" ? "Ana kale fethedildi" : "Süre doldu"}
        </Text>

        {/* Kazanan */}
        {winner && (
          <View className="bg-yellow-900/40 border border-yellow-600 rounded-2xl p-5 mb-6 items-center">
            <Text className="text-yellow-400 text-sm font-semibold mb-1">Kazanan</Text>
            <Text className="text-white text-2xl font-bold">{winner.username}</Text>
            <Text className="text-yellow-300 text-lg font-semibold mt-1">{winner.province_count} il</Text>
          </View>
        )}

        {/* Sıralama */}
        <Text className="text-slate-400 text-sm font-semibold mb-3 uppercase tracking-wide">Sıralama</Text>
        {results.map((player, index) => {
          const color = SEAT_COLORS[(player.seat - 1) % SEAT_COLORS.length];
          const isMe = player.player_id === user?.id;
          return (
            <View
              key={player.player_id}
              className={`flex-row items-center rounded-xl px-4 py-3 mb-2 ${isMe ? "border border-slate-500" : ""} bg-slate-800`}
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

        {/* Ana menüye dön */}
        <TouchableOpacity
          className="bg-blue-600 rounded-xl py-4 items-center mt-8"
          onPress={() => router.replace("/")}
        >
          <Text className="text-white text-lg font-bold">Ana Menü</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
