import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import type { Province, Provinces } from "@/types/game";

// Every player gets a color based on their seat
const PLAYER_COLORS = [
  "bg-blue-600",
  "bg-red-600",
  "bg-green-600",
  "bg-yellow-600",
] as const;

const PLAYER_BORDER_COLORS = [
  "border-blue-400",
  "border-red-400",
  "border-green-400",
  "border-yellow-400",
] as const;

type PlayerInfo = {
  id: string;
  seat: number;
  main_province_id: number;
};

type Props = {
  provinces: Provinces;
  provinceData: Province[];
  players: PlayerInfo[];
  currentUserId: string;
  currentTurnId: string;
  onProvincePress: (provinceId: number) => void;
  disabled?: boolean;
};

export function ProvinceGrid({
  provinces,
  provinceData,
  players,
  currentUserId,
  currentTurnId,
  onProvincePress,
  disabled = false,
}: Props) {
  const isMyTurn = currentUserId === currentTurnId;

  function getProvinceColor(provinceId: number): string {
    const state = provinces[String(provinceId)];
    if (!state?.owner_id) return "bg-slate-700";
    const player = players.find((p) => p.id === state.owner_id);
    if (!player) return "bg-slate-600";
    return PLAYER_COLORS[(player.seat - 1) % PLAYER_COLORS.length];
  }

  function getMainProvinceMarker(provinceId: number): string | null {
    const player = players.find((p) => p.main_province_id === provinceId);
    if (!player) return null;
    return PLAYER_BORDER_COLORS[(player.seat - 1) % PLAYER_BORDER_COLORS.length];
  }

  function getSoldiers(provinceId: number): number {
    return provinces[String(provinceId)]?.soldiers ?? 0;
  }

  return (
    <ScrollView contentContainerClassName="pb-4">
      <View className="flex-row flex-wrap px-2 gap-1">
        {provinceData.map((province) => {
          const color = getProvinceColor(province.id);
          const mainBorder = getMainProvinceMarker(province.id);
          const soldiers = getSoldiers(province.id);

          return (
            <TouchableOpacity
              key={province.id}
              className={`
                rounded-lg px-2 py-1.5 items-center justify-center
                ${color}
                ${mainBorder ? `border-2 ${mainBorder}` : ""}
                ${isMyTurn && !disabled ? "opacity-100" : "opacity-70"}
              `}
              style={{ width: "31%", minHeight: 52 }}
              onPress={() => !disabled && isMyTurn && onProvincePress(province.id)}
              disabled={disabled || !isMyTurn}
            >
              <Text
                className="text-white text-xs font-semibold text-center leading-tight"
                numberOfLines={2}
              >
                {province.name}
              </Text>
              {soldiers > 0 && (
                <Text className="text-white text-xs opacity-80">⚔ {soldiers}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}
