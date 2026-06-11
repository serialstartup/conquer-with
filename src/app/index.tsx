import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { TurkeyMapBackground } from "@/components/TurkeyMapBackground";

export default function HomeScreen() {
  const { user, profile, loading, setUsername } = useAuth();
  const [usernameInput, setUsernameInput] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  if (!profile?.username) {
    return (
      <View className="flex-1">
        <TurkeyMapBackground />
        <View className="absolute inset-0 bg-slate-900/75" />
        <View className="flex-1 flex-row">
          <View className="justify-center px-8" style={{ flex: 2 }}>
            <Text className="text-amber-400 text-4xl font-bold mb-2 tracking-wide">⚔ Bil ve Fethet</Text>
            <Text className="text-slate-300 text-sm">Topraklarını genişlet, bilginle fethet</Text>
          </View>
          <View className="justify-center px-8" style={{ flex: 3 }}>
            <View className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-6">
              <Text className="text-amber-400 text-base font-semibold mb-3">Kullanıcı Adın</Text>
              <TextInput
                className="bg-slate-900/80 text-white text-lg rounded-xl px-4 py-3 mb-4"
                placeholder="Kullanıcı adı gir..."
                placeholderTextColor="#64748b"
                value={usernameInput}
                onChangeText={setUsernameInput}
                maxLength={20}
                autoCapitalize="none"
              />
              <TouchableOpacity
                className="bg-amber-700 rounded-xl py-4 items-center"
                onPress={async () => {
                  if (!usernameInput.trim()) return;
                  setSaving(true);
                  try {
                    await setUsername(usernameInput.trim());
                  } catch {
                    // Hata olursa saving false'a döner
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving || !usernameInput.trim()}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-white text-lg font-bold">Devam Et</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <TurkeyMapBackground />
      <View className="absolute inset-0 bg-slate-900/75" />
      <View className="flex-1 flex-row">
        <View className="justify-center px-8" style={{ flex: 2 }}>
          <Text className="text-amber-400 text-4xl font-bold mb-2 tracking-wide">⚔ Bil ve Fethet</Text>
          <Text className="text-slate-300 text-sm mb-4">Topraklarını genişlet, bilginle fethet</Text>
          <Text className="text-slate-400 text-xs">{profile.username} · Misafir</Text>
        </View>
        <View className="justify-center px-8" style={{ flex: 3 }}>
          <View className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-6 gap-3">
            <TouchableOpacity
              className="bg-amber-700 rounded-xl py-4 items-center"
              onPress={() => router.push("/lobby/create")}
            >
              <Text className="text-white text-lg font-bold">Oda Oluştur</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-slate-700 rounded-xl py-4 items-center"
              onPress={() => router.push("/lobby/join")}
            >
              <Text className="text-white text-lg font-semibold">Odaya Katıl</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
