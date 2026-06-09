import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Share, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

type RoomPlayer = {
  id: string;
  seat: number;
  player_id: string;
  profiles: { username: string } | null;
};

type RoomData = {
  id: string;
  code: string;
  host_id: string;
  status: string;
  max_players: number;
  time_limit_minutes: number;
};

const SEAT_COLORS = ["bg-blue-800", "bg-red-800", "bg-green-800", "bg-yellow-800"] as const;

export default function WaitingRoom() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadRoom();
    loadPlayers();

    const channel = supabase
      .channel(`room:${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${id}` }, () => {
        loadPlayers();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${id}` }, (payload) => {
        const updated = payload.new as RoomData;
        setRoom(updated);
        if (updated.status === "playing") {
          router.replace(`/game/${id}`);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  async function loadRoom() {
    const { data } = await supabase
      .from("rooms")
      .select("id, code, host_id, status, max_players, time_limit_minutes")
      .eq("id", id)
      .single();
    if (data) setRoom(data);
  }

  async function loadPlayers() {
    const { data } = await supabase
      .from("room_players")
      .select("id, seat, player_id, profiles(username)")
      .eq("room_id", id)
      .order("seat");
    if (data) setPlayers(data.map((p) => ({
      id: String(p.id),
      seat: Number(p.seat),
      player_id: String(p.player_id),
      profiles: Array.isArray(p.profiles)
        ? ((p.profiles[0] as { username: string }) ?? null)
        : (p.profiles as { username: string } | null),
    })));
  }

  async function startGame() {
    if (!room || !user || starting) return;
    setStarting(true);
    try {
      const { data: updated, error: updateError } = await supabase
        .from("rooms")
        .update({ status: "starting" })
        .eq("id", room.id)
        .eq("status", "waiting")
        .select("id")
        .maybeSingle();

      if (updateError || !updated) {
        setStarting(false);
        return;
      }

      const { data: freshPlayers } = await supabase
        .from("room_players")
        .select("id, seat, player_id")
        .eq("room_id", room.id)
        .order("seat");

      if (!freshPlayers || freshPlayers.length < 2) {
        await supabase.from("rooms").update({ status: "waiting" }).eq("id", room.id);
        setStarting(false);
        return;
      }

      const availableIds = Array.from({ length: 81 }, (_, i) => i).sort(() => Math.random() - 0.5);

      for (let i = 0; i < freshPlayers.length; i++) {
        await supabase
          .from("room_players")
          .update({ main_province_id: availableIds[i] })
          .eq("id", freshPlayers[i].id);
      }

      const provinces: Record<string, { owner_id: string | null; soldiers: number; castle_level: number }> = {};
      for (let i = 0; i < 81; i++) {
        provinces[String(i)] = { owner_id: null, soldiers: 0, castle_level: 0 };
      }
      for (let i = 0; i < freshPlayers.length; i++) {
        provinces[String(availableIds[i])] = {
          owner_id: freshPlayers[i].player_id,
          soldiers: 3,
          castle_level: 1,
        };
      }

      const { error: gsError } = await supabase.from("game_states").insert({
        room_id: room.id,
        current_turn: freshPlayers[0].player_id,
        provinces,
        phase: "playing",
        started_at: new Date().toISOString(),
      });

      if (gsError) {
        await supabase.from("rooms").update({ status: "playing" }).eq("id", room.id);
        router.replace(`/game/${room.id}`);
        return;
      }

      await supabase.from("rooms").update({ status: "playing" }).eq("id", room.id);
      router.replace(`/game/${room.id}`);
    } catch {
      Alert.alert("Hata", "Oyun başlatılamadı");
      await supabase.from("rooms").update({ status: "waiting" }).eq("id", room.id);
      setStarting(false);
    }
  }

  if (!room) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  const isHost = user?.id === room.host_id;
  const canStart = players.length >= 2 && isHost;

  return (
    <View className="flex-1 flex-row bg-slate-900">
      <View className="border-r border-slate-700 bg-slate-800/40 justify-center px-8" style={{ flex: 2 }}>
        <TouchableOpacity onPress={() => router.back()} className="mb-6">
          <Text className="text-slate-400 text-base">← Geri</Text>
        </TouchableOpacity>
        <Text className="text-amber-400 text-3xl font-bold mb-1">Bekleme Odası</Text>
        <TouchableOpacity
          onPress={() => Share.share({ message: `Bil ve Fethet - Oda kodu: ${room.code}` })}
          className="mt-4"
        >
          <Text className="text-slate-400 text-xs mb-1">Oda Kodu</Text>
          <Text className="text-blue-400 text-2xl font-bold tracking-widest">{room.code}</Text>
          <Text className="text-slate-500 text-xs mt-1">Paylaşmak için dokun</Text>
        </TouchableOpacity>
        <Text className="text-slate-400 text-sm mt-6">
          {players.length} / {room.max_players} oyuncu
        </Text>
      </View>
      <View className="py-6 px-6" style={{ flex: 3 }}>
        <ScrollView className="flex-1 mb-4">
          {players.map((p) => {
            const seatColor = SEAT_COLORS[(p.seat - 1) % SEAT_COLORS.length];
            return (
              <View key={p.id} className="flex-row items-center bg-slate-800 rounded-xl px-4 py-3 mb-2">
                <View className={`w-8 h-8 rounded-full ${seatColor} items-center justify-center mr-3`}>
                  <Text className="text-white font-bold">{p.seat}</Text>
                </View>
                <Text className="text-white font-semibold flex-1">
                  {p.profiles?.username ?? "Bağlanıyor..."}
                </Text>
                {p.player_id === room.host_id && (
                  <Text className="text-yellow-400 text-xs">Host</Text>
                )}
              </View>
            );
          })}
        </ScrollView>
        {!isHost && (
          <Text className="text-slate-500 text-center mb-3">Host oyunu başlatmasını bekle...</Text>
        )}
        {isHost && (
          <TouchableOpacity
            className={`rounded-xl py-4 items-center ${canStart ? "bg-amber-700" : "bg-slate-700"}`}
            onPress={startGame}
            disabled={!canStart || starting}
          >
            {starting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className={`text-lg font-bold ${canStart ? "text-white" : "text-slate-500"}`}>
                {players.length < 2 ? "En az 2 oyuncu gerekli" : "Oyunu Başlat"}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
