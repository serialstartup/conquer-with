import { View, Text } from "react-native";
import type { Provinces } from "@/types/game";

type PlayerInfo = {
  id: string;
  username: string;
  seat: number;
  main_province_id: number;
};

const PLAYER_COLORS = ["bg-blue-800", "bg-red-800", "bg-green-800", "bg-yellow-800"] as const;

type Props = {
  players: PlayerInfo[];
  provinces: Provinces;
  currentTurnId: string;
  currentUserId: string;
};

export function PlayerStatus({ players, provinces, currentTurnId, currentUserId }: Props) {
  function getProvinceCount(playerId: string) {
    return Object.values(provinces).filter((p) => p.owner_id === playerId).length;
  }

  return (
    <View className="flex-row px-3 py-2 gap-2">
      {players.map((player) => {
        const isCurrentTurn = player.id === currentTurnId;
        const isMe = player.id === currentUserId;
        const provinceCount = getProvinceCount(player.id);
        const color = PLAYER_COLORS[(player.seat - 1) % PLAYER_COLORS.length];

        return (
          <View
            key={player.id}
            className={`flex-1 rounded-xl p-2 ${color} ${isCurrentTurn ? "opacity-100 border-2 border-white" : "opacity-60"}`}
          >
            <Text className="text-white text-xs font-bold" numberOfLines={1}>
              {player.username}{isMe ? " (Sen)" : ""}
            </Text>
            <Text className="text-white text-xs opacity-80">{provinceCount} il</Text>
          </View>
        );
      })}
    </View>
  );
}
