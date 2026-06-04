import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useRoom } from "@/hooks/useRoom";

export default function CreateRoom() {
  const { createRoom, loading, error } = useRoom();
  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(4);
  const router = useRouter();

  async function handleCreate() {
    const roomId = await createRoom(20, maxPlayers);
    if (roomId) router.replace(`/room/${roomId}`);
  }

  return (
    <View className="flex-1 bg-slate-900 px-8 pt-16">
      <TouchableOpacity onPress={() => router.back()} className="mb-8">
        <Text className="text-slate-400 text-base">← Geri</Text>
      </TouchableOpacity>

      <Text className="text-white text-3xl font-bold mb-2">Oda Oluştur</Text>
      <Text className="text-slate-400 mb-10">Arkadaşlarını davet et</Text>

      <Text className="text-white font-semibold mb-3">Oyuncu Sayısı</Text>
      <View className="flex-row gap-3 mb-10">
        {([2, 3, 4] as const).map((n) => (
          <TouchableOpacity
            key={n}
            className={`flex-1 py-3 rounded-xl items-center ${maxPlayers === n ? "bg-blue-600" : "bg-slate-700"}`}
            onPress={() => setMaxPlayers(n)}
          >
            <Text className="text-white font-bold text-lg">{n}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error && <Text className="text-red-400 mb-4 text-center">{error}</Text>}

      <TouchableOpacity
        className="bg-blue-600 rounded-xl py-4 items-center"
        onPress={handleCreate}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-lg font-bold">Oda Oluştur</Text>}
      </TouchableOpacity>
    </View>
  );
}
