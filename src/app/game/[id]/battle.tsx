import { useEffect, useState, useCallback } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useGameState } from "@/hooks/useGameState";
import { QuestionCard } from "@/components/QuestionCard";
import questions from "@/data/questions.json";
import provinces from "@/data/provinces.json";
import type { Question, Province } from "@/types/game";

const allQuestions = questions as Question[];
const provinceData = provinces as Province[];

type BattlePhase = "attacker_turn" | "defender_turn" | "finished";

type BattleState = {
  attackerId: string;
  defenderId: string;
  provinceId: number;
  attackerSoldiers: number; // saldıran başlangıçta 3 hakkı var
  defenderSoldiers: number; // savunanın mevcut askerleri
  phase: BattlePhase;
  winnerId: string | null;
};

type RoomPlayer = {
  player_id: string;
  seat: number;
  main_province_id: number;
  profiles: { username: string } | null;
};

export default function BattleScreen() {
  const { id: roomId, province: provinceParam } = useLocalSearchParams<{ id: string; province: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const { gameState, updateGameState } = useGameState(roomId!);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [loadingBattle, setLoadingBattle] = useState(true);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const provinceId = parseInt(provinceParam ?? "0", 10);
  const provinceInfo = provinceData.find((p) => p.id === provinceId);

  useEffect(() => {
    loadPlayersAndInit();
  }, [roomId]);

  // Realtime: battle_events dinle
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`battle:${roomId}:${provinceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "game_events", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const event = payload.new as { event_type: string; payload: Record<string, unknown> };
          if (event.event_type === "battle_state_update") {
            setBattleState(event.payload as BattleState);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, provinceId]);

  async function loadPlayersAndInit() {
    const { data } = await supabase
      .from("room_players")
      .select("player_id, seat, main_province_id, profiles(username)")
      .eq("room_id", roomId)
      .order("seat");

    if (!data || !gameState) {
      setLoadingBattle(false);
      return;
    }
    setPlayers(data as unknown as RoomPlayer[]);

    // Savaş durumu oluştur (ilk kez)
    const attackerId = gameState.current_turn;
    const defenderState = gameState.provinces[String(provinceId)];
    const defenderId = defenderState?.owner_id ?? "";
    const defenderSoldiers = defenderState?.soldiers ?? 1;

    const initial: BattleState = {
      attackerId,
      defenderId,
      provinceId,
      attackerSoldiers: 3,
      defenderSoldiers,
      phase: "attacker_turn",
      winnerId: null,
    };

    setBattleState(initial);
    await publishBattleState(initial);
    setInitialized(true);
    setLoadingBattle(false);
  }

  async function publishBattleState(state: BattleState) {
    await supabase.from("game_events").insert({
      room_id: roomId,
      event_type: "battle_state_update",
      payload: state,
    });
  }

  useEffect(() => {
    if (!battleState || battleState.phase === "finished") return;
    const difficulty = (provinceInfo?.difficulty ?? 1) as 1 | 2 | 3;
    const filtered = allQuestions.filter((q) => q.difficulty === difficulty);
    setCurrentQuestion(filtered[Math.floor(Math.random() * filtered.length)]);
  }, [battleState?.phase]);

  async function handleAnswer(correct: boolean) {
    if (!battleState || !gameState || !user) return;

    const isAttacker = user.id === battleState.attackerId;
    const isDefender = user.id === battleState.defenderId;
    const isMyTurn =
      (battleState.phase === "attacker_turn" && isAttacker) ||
      (battleState.phase === "defender_turn" && isDefender);

    if (!isMyTurn) return;

    const updated = { ...battleState };

    if (battleState.phase === "attacker_turn") {
      if (correct) {
        updated.defenderSoldiers -= 1;
      }
      updated.phase = "defender_turn";
    } else {
      if (correct) {
        updated.attackerSoldiers -= 1;
      }
      updated.phase = "attacker_turn";
    }

    // Savaş bitiş kontrolü
    if (updated.defenderSoldiers <= 0) {
      updated.phase = "finished";
      updated.winnerId = updated.attackerId;
    } else if (updated.attackerSoldiers <= 0) {
      updated.phase = "finished";
      updated.winnerId = updated.defenderId;
    }

    setBattleState(updated);
    await publishBattleState(updated);

    if (updated.phase === "finished") {
      await finishBattle(updated);
    }
  }

  async function finishBattle(state: BattleState) {
    if (!gameState) return;
    const updatedProvinces = { ...gameState.provinces };

    if (state.winnerId === state.attackerId) {
      // Saldıran kazandı — il geçti
      updatedProvinces[String(state.provinceId)] = {
        owner_id: state.attackerId,
        soldiers: 1,
        castle_level: gameState.provinces[String(state.provinceId)]?.castle_level ?? 0,
      };
      setResultMessage("Zafer! İl fethedildi!");
    } else {
      // Savunan kazandı — il kaldı
      updatedProvinces[String(state.provinceId)] = {
        ...gameState.provinces[String(state.provinceId)],
        soldiers: Math.max(1, state.defenderSoldiers),
      };
      setResultMessage("Savunma başarılı! İl korundu.");
    }

    // Sırayı bir sonraki oyuncuya geç
    const currentIndex = players.findIndex((p) => p.player_id === gameState.current_turn);
    const nextIndex = (currentIndex + 1) % players.length;
    const nextTurn = players[nextIndex]?.player_id ?? gameState.current_turn;

    await updateGameState({ provinces: updatedProvinces, current_turn: nextTurn });

    // 1.5 saniye sonra oyun ekranına dön
    setTimeout(() => {
      router.replace(`/game/${roomId}`);
    }, 1500);
  }

  if (loadingBattle || !battleState) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  const isAttacker = user?.id === battleState.attackerId;
  const isDefender = user?.id === battleState.defenderId;
  const isMyTurn =
    (battleState.phase === "attacker_turn" && isAttacker) ||
    (battleState.phase === "defender_turn" && isDefender);
  const attackerPlayer = players.find((p) => p.player_id === battleState.attackerId);
  const defenderPlayer = players.find((p) => p.player_id === battleState.defenderId);

  return (
    <View className="flex-1 bg-slate-900">
      {/* Başlık */}
      <View className="pt-12 px-4 pb-4 border-b border-slate-800">
        <Text className="text-white text-xl font-bold text-center">
          {provinceInfo?.name ?? "Savaş"} — Muharebe
        </Text>
      </View>

      {/* Savaş durumu */}
      <View className="flex-row px-4 py-4 gap-3">
        <View
          className={`flex-1 rounded-xl p-3 ${
            battleState.phase === "attacker_turn"
              ? "bg-blue-700 border-2 border-blue-300"
              : "bg-slate-800"
          }`}
        >
          <Text className="text-white text-xs font-bold mb-1">
            {attackerPlayer?.profiles?.username ?? "Saldıran"}
            {isAttacker ? " (Sen)" : ""}
          </Text>
          <Text className="text-white">{"⚔".repeat(Math.max(0, battleState.attackerSoldiers))}</Text>
          <Text className="text-slate-400 text-xs">{battleState.attackerSoldiers} hak</Text>
        </View>

        <View className="items-center justify-center">
          <Text className="text-slate-400 text-2xl">⚡</Text>
        </View>

        <View
          className={`flex-1 rounded-xl p-3 ${
            battleState.phase === "defender_turn"
              ? "bg-red-700 border-2 border-red-300"
              : "bg-slate-800"
          }`}
        >
          <Text className="text-white text-xs font-bold mb-1">
            {defenderPlayer?.profiles?.username ?? "Savunan"}
            {isDefender ? " (Sen)" : ""}
          </Text>
          <Text className="text-white">{"🛡".repeat(Math.max(0, battleState.defenderSoldiers))}</Text>
          <Text className="text-slate-400 text-xs">{battleState.defenderSoldiers} asker</Text>
        </View>
      </View>

      {/* Sonuç mesajı */}
      {resultMessage && (
        <View className="mx-4 mb-4 bg-slate-800 rounded-xl p-4">
          <Text className="text-white text-center text-lg font-bold">{resultMessage}</Text>
        </View>
      )}

      {/* Soru */}
      {battleState.phase !== "finished" && currentQuestion && (
        <View className="flex-1 justify-center">
          {isMyTurn ? (
            <QuestionCard question={currentQuestion} onAnswer={handleAnswer} />
          ) : (
            <View className="items-center px-4">
              <Text className="text-slate-400 text-base text-center">
                {battleState.phase === "attacker_turn"
                  ? `${attackerPlayer?.profiles?.username ?? "Saldıran"} soruyu cevaplıyor...`
                  : `${defenderPlayer?.profiles?.username ?? "Savunan"} soruyu cevaplıyor...`}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
