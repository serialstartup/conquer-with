import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useGameState } from "@/hooks/useGameState";
import { QuestionCard } from "@/components/QuestionCard";
import { CrusaderSprite } from "@/components/CrusaderSprite";
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
  attackerSoldiers: number;
  defenderSoldiers: number;
  phase: BattlePhase;
  winnerId: string | null;
};

type RoomPlayer = {
  player_id: string;
  seat: number;
  main_province_id: number;
  profiles: { username: string } | null;
};

type SpriteAnim = "idle" | "attack" | "gotHit" | "death";

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
  const [attackerAnim, setAttackerAnim] = useState<SpriteAnim>("idle");
  const [defenderAnim, setDefenderAnim] = useState<SpriteAnim>("idle");
  const initialDefenderSoldiers = useRef<number>(1);

  const provinceId = parseInt(provinceParam ?? "0", 10);
  const provinceInfo = provinceData.find((p) => p.id === provinceId);

  useEffect(() => {
    loadPlayersAndInit();
  }, [roomId]);

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
    return () => { supabase.removeChannel(channel); };
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

    const attackerId = gameState.current_turn;
    const defenderState = gameState.provinces[String(provinceId)];
    const defenderId = defenderState?.owner_id ?? "";
    const defenderSoldiers = defenderState?.soldiers ?? 1;

    initialDefenderSoldiers.current = defenderSoldiers;

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
        setAttackerAnim("attack");
        setDefenderAnim("gotHit");
      }
      updated.phase = "defender_turn";
    } else {
      if (correct) {
        updated.attackerSoldiers -= 1;
        setDefenderAnim("attack");
        setAttackerAnim("gotHit");
      }
      updated.phase = "attacker_turn";
    }

    if (updated.defenderSoldiers <= 0) {
      updated.phase = "finished";
      updated.winnerId = updated.attackerId;
      setDefenderAnim("death");
    } else if (updated.attackerSoldiers <= 0) {
      updated.phase = "finished";
      updated.winnerId = updated.defenderId;
      setAttackerAnim("death");
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
      updatedProvinces[String(state.provinceId)] = {
        owner_id: state.attackerId,
        soldiers: 1,
        castle_level: gameState.provinces[String(state.provinceId)]?.castle_level ?? 0,
      };
      setResultMessage("Zafer! İl fethedildi!");
    } else {
      updatedProvinces[String(state.provinceId)] = {
        ...gameState.provinces[String(state.provinceId)],
        soldiers: Math.max(1, state.defenderSoldiers),
      };
      setResultMessage("Savunma başarılı! İl korundu.");
    }

    const currentIndex = players.findIndex((p) => p.player_id === gameState.current_turn);
    const nextIndex = (currentIndex + 1) % players.length;
    const nextTurn = players[nextIndex]?.player_id ?? gameState.current_turn;

    await updateGameState({ provinces: updatedProvinces, current_turn: nextTurn });

    setTimeout(() => { router.replace(`/game/${roomId}`); }, 2000);
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
      <View className="pt-8 px-4 pb-3 border-b border-slate-700">
        <Text className="text-amber-400 text-lg font-bold text-center tracking-widest uppercase">
          ⚔ {provinceInfo?.name ?? "Muharebe"} Savaşı ⚔
        </Text>
      </View>

      {/* Savaşçılar */}
      <View className="flex-row px-2 pt-3 pb-1 items-end justify-between">
        {/* Saldıran */}
        <View className="flex-1 items-center">
          <Text className="text-blue-300 text-xs font-bold mb-1 uppercase tracking-wide">
            {attackerPlayer?.profiles?.username ?? "Saldıran"}
            {isAttacker ? " (Sen)" : ""}
          </Text>
          <View
            className={`rounded-xl p-1 ${
              battleState.phase === "attacker_turn" ? "bg-blue-900 border border-blue-400" : "bg-slate-800"
            }`}
          >
            <CrusaderSprite
              animation={attackerAnim}
              flipped={false}
              size={100}
              onComplete={() => {
                if (attackerAnim !== "idle" && attackerAnim !== "death") {
                  setAttackerAnim("idle");
                }
              }}
            />
          </View>
          <HPBar current={battleState.attackerSoldiers} max={3} color="blue" label="hak" />
        </View>

        {/* VS */}
        <View className="items-center px-2 pb-4">
          <Text className="text-slate-500 text-2xl font-black">VS</Text>
        </View>

        {/* Savunan */}
        <View className="flex-1 items-center">
          <Text className="text-red-300 text-xs font-bold mb-1 uppercase tracking-wide">
            {defenderPlayer?.profiles?.username ?? "Savunan"}
            {isDefender ? " (Sen)" : ""}
          </Text>
          <View
            className={`rounded-xl p-1 ${
              battleState.phase === "defender_turn" ? "bg-red-900 border border-red-400" : "bg-slate-800"
            }`}
          >
            <CrusaderSprite
              animation={defenderAnim}
              flipped={true}
              size={100}
              onComplete={() => {
                if (defenderAnim !== "idle" && defenderAnim !== "death") {
                  setDefenderAnim("idle");
                }
              }}
            />
          </View>
          <HPBar current={battleState.defenderSoldiers} max={initialDefenderSoldiers.current} color="red" label="asker" />
        </View>
      </View>

      {/* Sonuç mesajı */}
      {resultMessage && (
        <View className="mx-4 mb-2 bg-amber-900 border border-amber-500 rounded-xl p-3">
          <Text className="text-amber-200 text-center text-base font-bold">{resultMessage}</Text>
        </View>
      )}

      {/* Soru */}
      {battleState.phase !== "finished" && currentQuestion && (
        <View className="flex-1 justify-center">
          {isMyTurn ? (
            <QuestionCard question={currentQuestion} onAnswer={handleAnswer} />
          ) : (
            <View className="items-center px-4 py-6">
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

function HPBar({ current, max, color, label }: { current: number; max: number; color: "blue" | "red"; label: string }) {
  const pct = max > 0 ? Math.max(0, current / max) : 0;
  const barColor = color === "blue" ? "bg-blue-500" : "bg-red-500";
  return (
    <View className="w-full mt-2 px-1">
      <View className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <View className={`h-full rounded-full ${barColor}`} style={{ width: `${pct * 100}%` }} />
      </View>
      <Text className="text-slate-400 text-xs text-center mt-1">
        {current} {label}
      </Text>
    </View>
  );
}
