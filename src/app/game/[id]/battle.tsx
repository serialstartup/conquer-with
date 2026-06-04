import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function BattleScreen() {
  const { id, province } = useLocalSearchParams<{ id: string; province: string }>();
  return (
    <View className="flex-1 bg-slate-900 items-center justify-center px-6">
      <Text className="text-white text-2xl font-bold mb-2">Savas!</Text>
      <Text className="text-slate-400">Il: {province} — Yakinda</Text>
    </View>
  );
}
