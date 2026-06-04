import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";

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
      <View className="flex-1 items-center justify-center bg-slate-900 px-8">
        <Text className="text-white text-3xl font-bold mb-2">Bil ve Fethet</Text>
        <Text className="text-slate-400 text-base mb-10">Topraklarını genişlet, bilginle fethet</Text>
        <Text className="text-white text-lg font-semibold mb-3">Kullanıcı adın nedir?</Text>
        <TextInput
          className="w-full bg-slate-800 text-white text-lg rounded-xl px-4 py-3 mb-4"
          placeholder="Kullanıcı adı gir..."
          placeholderTextColor="#64748b"
          value={usernameInput}
          onChangeText={setUsernameInput}
          maxLength={20}
          autoCapitalize="none"
        />
        <TouchableOpacity
          className="w-full bg-blue-600 rounded-xl py-4 items-center"
          onPress={async () => {
            if (!usernameInput.trim()) return;
            setSaving(true);
            await setUsername(usernameInput.trim());
            setSaving(false);
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
    );
  }

  return (
    <View className="flex-1 bg-slate-900 px-8">
      <View className="flex-1 items-center justify-center">
        <Text className="text-white text-4xl font-bold mb-2">Bil ve Fethet</Text>
        <Text className="text-slate-400 text-base mb-12">Hoş geldin, {profile.username}!</Text>

        <TouchableOpacity
          className="w-full bg-blue-600 rounded-xl py-4 items-center mb-4"
          onPress={() => router.push("/lobby/create")}
        >
          <Text className="text-white text-lg font-bold">Oda Oluştur</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="w-full bg-slate-700 rounded-xl py-4 items-center"
          onPress={() => router.push("/lobby/join")}
        >
          <Text className="text-white text-lg font-semibold">Odaya Katıl</Text>
        </TouchableOpacity>
      </View>

      <View className="pb-8 items-center">
        <Text className="text-slate-600 text-sm">{profile.username} · Misafir</Text>
      </View>
    </View>
  );
}
