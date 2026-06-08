import { useEffect, useState, useRef } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { QuestionCard } from "@/components/QuestionCard";
import { CrusaderSprite } from "@/components/CrusaderSprite";
import questions from "@/data/questions.json";
import provinces from "@/data/provinces.json";
import type { Question, Province, GameState } from "@/types/game";

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
  currentQuestion: Question | null; // her iki ekranda aynı soru
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
  const gsRef = useRef<GameState | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [loadingBattle, setLoadingBattle] = useState(true);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [attackerAnim, setAttackerAnim] = useState<SpriteAnim>("idle");
  const [defenderAnim, setDefenderAnim] = useState<SpriteAnim>("idle");
  const initialDefenderSoldiers = useRef<number>(1);
  const finishedRef = useRef(false);

  const provinceId = parseInt(provinceParam ?? "0", 10);
  const provinceInfo = provinceData.find((p) => p.id === provinceId);

  useEffect(() => {
    loadPlayersAndInit();
  }, [roomId]);

  // Realtime: battle_state_update dinle (defender için initial state + her iki taraf için sync)
  useEffect(() => {
    if (!roomId) return;
    const channelName = `battle:${roomId}:${provinceId}:${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "game_events", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const event = payload.new as { event_type: string; payload: Record<string, unknown> };
          if (event.event_type === "battle_state_update") {
            const incoming = event.payload as BattleState;
            if (incoming.provinceId !== provinceId) return;
            if (!initialDefenderSoldiers.current || initialDefenderSoldiers.current === 1) {
              initialDefenderSoldiers.current = incoming.defenderSoldiers;
            }
            setBattleState(incoming);
            setLoadingBattle(false);

            // Pasif oyuncu (bu eventi yayınlamayan taraf) için bitiş işlemi
            if (incoming.phase === "finished" && !finishedRef.current) {
              finishedRef.current = true;
              if (incoming.winnerId === incoming.attackerId) {
                setDefenderAnim("death");
                setResultMessage(
                  user?.id === incoming.attackerId ? "Zafer! İl fethedildi!" : "İl kaybedildi..."
                );
              } else {
                setAttackerAnim("death");
                setResultMessage(
                  user?.id === incoming.defenderId ? "Savunma başarılı! İl korundu." : "Saldırı başarısız oldu."
                );
              }
              setTimeout(() => { router.back(); }, 2000);
            }
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, provinceId]);

  function pickQuestion(): Question {
    const difficulty = (provinceInfo?.difficulty ?? 1) as 1 | 2 | 3;
    const filtered = allQuestions.filter((q) => q.difficulty === difficulty);
    return filtered[Math.floor(Math.random() * filtered.length)];
  }

  async function loadPlayersAndInit() {
    const [{ data: gsData }, { data: playersData }] = await Promise.all([
      supabase.from("game_states").select("*").eq("room_id", roomId).single(),
      supabase.from("room_players")
        .select("player_id, seat, main_province_id, profiles(username)")
        .eq("room_id", roomId)
        .order("seat"),
    ]);

    if (!gsData || !playersData) { setLoadingBattle(false); return; }

    const gs = gsData as GameState;
    gsRef.current = gs;
    setPlayers(playersData as unknown as RoomPlayer[]);

    const isAttacker = gs.current_turn === user?.id;

    if (isAttacker) {
      // Saldıran: başlangıç durumunu oluştur ve yayınla
      const defenderState = gs.provinces[String(provinceId)];
      const defenderId = defenderState?.owner_id ?? "";
      const defenderSoldiers = defenderState?.soldiers ?? 1;
      initialDefenderSoldiers.current = defenderSoldiers;

      const initial: BattleState = {
        attackerId: gs.current_turn,
        defenderId,
        provinceId,
        attackerSoldiers: 3,
        defenderSoldiers,
        phase: "attacker_turn",
        winnerId: null,
        currentQuestion: pickQuestion(),
      };

      // Savunanı bilgilendir (game screen'de listener var)
      await supabase.from("game_events").insert({
        room_id: roomId,
        event_type: "battle_start",
        payload: { provinceId, attackerId: gs.current_turn, defenderId },
      });

      setBattleState(initial);
      await publishBattleState(initial);
      setLoadingBattle(false);
    } else {
      // Savunan: en son mevcut savaş durumunu çek (attacker'dan önce gelmiş olabilir)
      const { data: events } = await supabase
        .from("game_events")
        .select("payload")
        .eq("room_id", roomId)
        .eq("event_type", "battle_state_update")
        .order("created_at", { ascending: false })
        .limit(1);

      const existing = events?.[0]?.payload as BattleState | undefined;
      if (existing && existing.provinceId === provinceId && existing.phase !== "finished") {
        initialDefenderSoldiers.current = existing.defenderSoldiers;
        setBattleState(existing);
      }
      // Yoksa realtime listener initial state'i alacak
      setLoadingBattle(false);
    }
  }

  async function publishBattleState(state: BattleState) {
    await supabase.from("game_events").insert({
      room_id: roomId,
      event_type: "battle_state_update",
      payload: state,
    });
  }

  async function handleAnswer(correct: boolean) {
    if (!battleState || !user) return;

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
      updated.currentQuestion = null;
      setDefenderAnim("death");
    } else if (updated.attackerSoldiers <= 0) {
      updated.phase = "finished";
      updated.winnerId = updated.defenderId;
      updated.currentQuestion = null;
      setAttackerAnim("death");
    } else {
      // Bir sonraki tur için yeni soru seç
      updated.currentQuestion = pickQuestion();
    }

    setBattleState(updated);
    await publishBattleState(updated);

    if (updated.phase === "finished") {
      await finishBattle(updated);
    }
  }

  async function finishBattle(state: BattleState) {
    const gs = gsRef.current;
    if (!gs) return;
    finishedRef.current = true;

    const updatedProvinces = { ...gs.provinces };

    if (state.winnerId === state.attackerId) {
      updatedProvinces[String(state.provinceId)] = {
        owner_id: state.attackerId,
        soldiers: 1,
        castle_level: gs.provinces[String(state.provinceId)]?.castle_level ?? 0,
      };
      setResultMessage("Zafer! İl fethedildi!");
    } else {
      updatedProvinces[String(state.provinceId)] = {
        ...gs.provinces[String(state.provinceId)],
        soldiers: Math.max(1, state.defenderSoldiers),
      };
      setResultMessage("Savunma başarılı! İl korundu.");
    }

    const currentIndex = players.findIndex((p) => p.player_id === gs.current_turn);
    const nextIndex = (currentIndex + 1) % players.length;
    const nextTurn = players[nextIndex]?.player_id ?? gs.current_turn;

    await supabase
      .from("game_states")
      .update({ provinces: updatedProvinces, current_turn: nextTurn, updated_at: new Date().toISOString() })
      .eq("room_id", roomId);

    setTimeout(() => { router.back(); }, 2000);
  }

  if (loadingBattle || !battleState) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#fff" />
        <Text className="text-slate-500 text-xs mt-3">Savaş başlatılıyor...</Text>
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
  const activePlayerName = battleState.phase === "attacker_turn"
    ? (attackerPlayer?.profiles?.username ?? "Saldıran")
    : (defenderPlayer?.profiles?.username ?? "Savunan");

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
          <View className={`rounded-xl p-1 ${battleState.phase === "attacker_turn" ? "bg-blue-900 border border-blue-400" : "bg-slate-800"}`}>
            <CrusaderSprite
              animation={attackerAnim}
              flipped={false}
              size={100}
              onComplete={() => {
                if (attackerAnim !== "idle" && attackerAnim !== "death") setAttackerAnim("idle");
              }}
            />
          </View>
          <HPBar current={battleState.attackerSoldiers} max={3} color="blue" label="hak" />
        </View>

        <View className="items-center px-2 pb-4">
          <Text className="text-slate-500 text-2xl font-black">VS</Text>
        </View>

        {/* Savunan */}
        <View className="flex-1 items-center">
          <Text className="text-red-300 text-xs font-bold mb-1 uppercase tracking-wide">
            {defenderPlayer?.profiles?.username ?? "Savunan"}
            {isDefender ? " (Sen)" : ""}
          </Text>
          <View className={`rounded-xl p-1 ${battleState.phase === "defender_turn" ? "bg-red-900 border border-red-400" : "bg-slate-800"}`}>
            <CrusaderSprite
              animation={defenderAnim}
              flipped={true}
              size={100}
              onComplete={() => {
                if (defenderAnim !== "idle" && defenderAnim !== "death") setDefenderAnim("idle");
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

      {/* Soru — her iki oyuncu da aynı soruyu görür */}
      {battleState.phase !== "finished" && battleState.currentQuestion && (
        <View className="flex-1 justify-center">
          {isMyTurn ? (
            <QuestionCard question={battleState.currentQuestion} onAnswer={handleAnswer} />
          ) : (
            <View className="px-4">
              <Text className="text-amber-400 text-xs text-center mb-2 font-bold uppercase tracking-wide">
                {activePlayerName} cevaplıyor...
              </Text>
              <ReadOnlyQuestion question={battleState.currentQuestion} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function ReadOnlyQuestion({ question }: { question: Question }) {
  return (
    <View className="bg-slate-800 rounded-2xl p-4 opacity-75">
      <Text className="text-white text-sm font-semibold text-center mb-3">{question.text}</Text>
      <View className="gap-2">
        {question.options.map((opt, i) => (
          <View key={i} className="bg-slate-700 rounded-xl px-3 py-2">
            <Text className="text-slate-300 text-xs">{opt}</Text>
          </View>
        ))}
      </View>
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
      <Text className="text-slate-400 text-xs text-center mt-1">{current} {label}</Text>
    </View>
  );
}
