import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useRoom } from "@/hooks/useRoom";

export default function JoinRoom() {
  const { joinRoom, loading, error } = useRoom();
  const [code, setCode] = useState("");
  const router = useRouter();

  async function handleJoin() {
    if (code.trim().length !== 6) return;
    const roomId = await joinRoom(code.trim());
    if (roomId) router.replace(`/room/${roomId}`);
  }

  return (
    <View className="flex-1 flex-row bg-slate-900">
      <View className="border-r border-slate-700 bg-slate-800/40 justify-center px-8" style={{ flex: 2 }}>
        <TouchableOpacity onPress={() => router.back()} className="mb-6">
          <Text className="text-slate-400 text-base">← Geri</Text>
        </TouchableOpacity>
        <Text className="text-amber-400 text-3xl font-bold mb-2">Odaya Katıl</Text>
        <Text className="text-slate-400 text-sm">6 haneli oda kodunu gir</Text>
      </View>
      <View className="justify-center px-8" style={{ flex: 3 }}>
        <TextInput
          className="bg-slate-800 text-white text-2xl font-bold rounded-xl px-4 py-4 mb-6 text-center tracking-widest"
          placeholder="XXXXXX"
          placeholderTextColor="#475569"
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        {error && <Text className="text-red-400 mb-4 text-center">{error}</Text>}
        <TouchableOpacity
          className="bg-amber-700 rounded-xl py-4 items-center"
          onPress={handleJoin}
          disabled={loading || code.trim().length !== 6}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-lg font-bold">Katıl</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
