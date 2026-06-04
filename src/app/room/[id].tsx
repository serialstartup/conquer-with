import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Share } from "react-native";
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

    // Realtime: yeni oyuncu katılınca güncelle
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
    if (data) setPlayers(data as unknown as RoomPlayer[]);
  }

  async function startGame() {
    if (!room || !user) return;
    setStarting(true);
    try {
      // Her oyuncuya rastgele benzersiz başlangıç ili ata
      const totalProvinces = 81;
      const availableIds = Array.from({ length: totalProvinces }, (_, i) => i);
      const shuffled = availableIds.sort(() => Math.random() - 0.5);

      // room_players'a main_province_id ata
      for (let i = 0; i < players.length; i++) {
        await supabase
          .from("room_players")
          .update({ main_province_id: shuffled[i] })
          .eq("id", players[i].id);
      }

      // Başlangıç provinces state'i oluştur (81 il, sadece ana kaleler dolu)
      const provinces: Record<string, { owner_id: string | null; soldiers: number; castle_level: number }> = {};
      for (let i = 0; i < totalProvinces; i++) {
        provinces[String(i)] = { owner_id: null, soldiers: 0, castle_level: 0 };
      }
      for (let i = 0; i < players.length; i++) {
        const provinceId = String(shuffled[i]);
        provinces[provinceId] = { owner_id: players[i].player_id, soldiers: 3, castle_level: 1 };
      }

      // game_states oluştur
      await supabase.from("game_states").insert({
        room_id: room.id,
        current_turn: players[0].player_id,
        provinces,
        phase: "playing",
        started_at: new Date().toISOString(),
      });

      // Odayı 'playing' yap
      await supabase.from("rooms").update({ status: "playing" }).eq("id", room.id);
    } catch (e) {
      Alert.alert("Hata", "Oyun başlatılamadı");
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
    <View className="flex-1 bg-slate-900 px-6 pt-16">
      <Text className="text-white text-3xl font-bold mb-1">Bekleme Odası</Text>

      <TouchableOpacity
        onPress={() => Share.share({ message: `Bil ve Fethet - Oda kodu: ${room.code}` })}
        className="flex-row items-center mb-8 mt-2"
      >
        <Text className="text-slate-400 mr-2">Oda Kodu:</Text>
        <Text className="text-blue-400 text-2xl font-bold tracking-widest">{room.code}</Text>
        <Text className="text-slate-500 ml-2 text-sm">Paylaş</Text>
      </TouchableOpacity>

      <Text className="text-slate-400 text-sm mb-3">
        {players.length} / {room.max_players} oyuncu
      </Text>

      {players.map((p) => (
        <View key={p.id} className="flex-row items-center bg-slate-800 rounded-xl px-4 py-3 mb-2">
          <View className="w-8 h-8 rounded-full bg-blue-600 items-center justify-center mr-3">
            <Text className="text-white font-bold">{p.seat}</Text>
          </View>
          <Text className="text-white font-semibold flex-1">
            {p.profiles?.username ?? "Bağlanıyor..."}
          </Text>
          {p.player_id === room.host_id && (
            <Text className="text-yellow-400 text-xs">Host</Text>
          )}
        </View>
      ))}

      <View className="flex-1" />

      {!isHost && (
        <Text className="text-slate-500 text-center mb-4">Host oyunu başlatmasını bekle...</Text>
      )}

      {isHost && (
        <TouchableOpacity
          className={`rounded-xl py-4 items-center mb-8 ${canStart ? "bg-blue-600" : "bg-slate-700"}`}
          onPress={startGame}
          disabled={!canStart || starting}
        >
          {starting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className={`text-lg font-bold ${canStart ? "text-white" : "text-slate-500"}`}>
              {players.length < 2 ? `En az 2 oyuncu gerekli` : "Oyunu Başlat"}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
