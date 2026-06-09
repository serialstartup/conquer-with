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
  currentQuestion: Question | null;
  selectedOptionIndex: number | null;
};

type RoomPlayer = {
  player_id: string;
  seat: number;
  main_province_id: number;
  profiles: { username: string } | null;
};

type SpriteAnim = "idle" | "attack" | "gotHit" | "death";

const LABELS = ["A", "B", "C", "D"] as const;

export default function BattleScreen() {
  const { id: roomId, province: provinceParam } = useLocalSearchParams<{ id: string; province: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const gsRef = useRef<GameState | null>(null);
  const battleStateRef = useRef<BattleState | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [loadingBattle, setLoadingBattle] = useState(true);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [flashAnswer, setFlashAnswer] = useState<{ label: string; wasCorrect: boolean } | null>(null);
  const [attackerAnim, setAttackerAnim] = useState<SpriteAnim>("idle");
  const [defenderAnim, setDefenderAnim] = useState<SpriteAnim>("idle");
  const initialDefenderSoldiers = useRef<number>(1);
  const finishedRef = useRef(false);

  const provinceId = parseInt(provinceParam ?? "0", 10);
  const provinceInfo = provinceData.find((p) => p.id === provinceId);

  useEffect(() => {
    loadPlayersAndInit();
  }, [roomId]);

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

            // Rakip cevabını göster — sadece pasif oyuncuya (cevaplayan kişi değiliz)
            if (incoming.selectedOptionIndex != null) {
              const prevPhase = battleStateRef.current?.phase;
              const amPassive =
                (prevPhase === "attacker_turn" && user?.id !== incoming.attackerId) ||
                (prevPhase === "defender_turn" && user?.id !== incoming.defenderId);
              if (amPassive) {
                const label = LABELS[incoming.selectedOptionIndex] ?? "?";
                const wasCorrect =
                  battleStateRef.current?.currentQuestion?.correct_index === incoming.selectedOptionIndex;
                setFlashAnswer({ label, wasCorrect });
                setTimeout(() => setFlashAnswer(null), 2000);
              }
            }

            battleStateRef.current = incoming;
            setBattleState(incoming);
            setLoadingBattle(false);

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
    const pool = filtered.length > 0 ? filtered : allQuestions;
    return pool[Math.floor(Math.random() * pool.length)];
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
    setPlayers(playersData.map((p) => ({
      player_id: String(p.player_id),
      seat: Number(p.seat),
      main_province_id: Number(p.main_province_id),
      profiles: Array.isArray(p.profiles)
        ? ((p.profiles[0] as { username: string }) ?? null)
        : (p.profiles as { username: string } | null),
    })));

    const isAttacker = gs.current_turn === user?.id;

    if (isAttacker) {
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
        selectedOptionIndex: null,
      };

      await supabase.from("game_events").insert({
        room_id: roomId,
        event_type: "battle_start",
        payload: { provinceId, attackerId: gs.current_turn, defenderId },
      });

      battleStateRef.current = initial;
      setBattleState(initial);
      await publishBattleState(initial);
      setLoadingBattle(false);
    } else {
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
        battleStateRef.current = existing;
        setBattleState(existing);
      }
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

  async function handleAnswer(correct: boolean, selectedIndex: number) {
    if (!battleState || !user) return;

    const isAttacker = user.id === battleState.attackerId;
    const isDefender = user.id === battleState.defenderId;
    const isMyTurn =
      (battleState.phase === "attacker_turn" && isAttacker) ||
      (battleState.phase === "defender_turn" && isDefender);

    if (!isMyTurn) return;

    const updated: BattleState = { ...battleState, selectedOptionIndex: selectedIndex };

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
      updated.currentQuestion = pickQuestion();
      updated.selectedOptionIndex = null;
    }

    battleStateRef.current = updated;
    setBattleState(updated);
    if (updated.phase === "finished") {
      await finishBattle(updated);
    }
    await publishBattleState(updated);
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
        <ActivityIndicator size="large" color="#F59E0B" />
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
  const attackerTurnActive = battleState.phase === "attacker_turn";
  const defenderTurnActive = battleState.phase === "defender_turn";

  return (
    <View className="flex-1 flex-row bg-slate-900">
      {/* Sol: Savaş arenası */}
      <View className="border-r border-slate-700 bg-slate-800/30 justify-center px-3 pt-6 pb-4" style={{ flex: 2 }}>
        <Text className="text-amber-400 text-sm font-bold text-center tracking-widest uppercase mb-4">
          ⚔ {provinceInfo?.name ?? "Muharebe"} ⚔
        </Text>

        <View className="flex-row items-end justify-between">
          {/* Saldıran */}
          <View className="flex-1 items-center">
            <Text className="text-amber-300 text-xs font-bold mb-1 uppercase" numberOfLines={1}>
              {attackerPlayer?.profiles?.username ?? "Saldıran"}
              {isAttacker ? "\n(Sen)" : ""}
            </Text>
            <View className={`rounded-xl p-1 ${attackerTurnActive ? "bg-amber-900/60 border border-amber-500" : "bg-slate-800"}`}>
              <CrusaderSprite
                animation={attackerAnim}
                flipped={false}
                size={90}
                onComplete={() => {
                  if (attackerAnim !== "idle" && attackerAnim !== "death") setAttackerAnim("idle");
                }}
              />
            </View>
            <HPBar current={battleState.attackerSoldiers} max={3} color="amber" label="hak" />
          </View>

          <View className="items-center pb-6 px-1">
            <Text className="text-slate-600 text-lg font-black">VS</Text>
          </View>

          {/* Savunan */}
          <View className="flex-1 items-center">
            <Text className="text-red-300 text-xs font-bold mb-1 uppercase" numberOfLines={1}>
              {defenderPlayer?.profiles?.username ?? "Savunan"}
              {isDefender ? "\n(Sen)" : ""}
            </Text>
            <View className={`rounded-xl p-1 ${defenderTurnActive ? "bg-amber-900/60 border border-amber-500" : "bg-slate-800"}`}>
              <CrusaderSprite
                animation={defenderAnim}
                flipped={true}
                size={90}
                onComplete={() => {
                  if (defenderAnim !== "idle" && defenderAnim !== "death") setDefenderAnim("idle");
                }}
              />
            </View>
            <HPBar current={battleState.defenderSoldiers} max={initialDefenderSoldiers.current} color="red" label="asker" />
          </View>
        </View>
      </View>

      {/* Sağ: Soru alanı */}
      <View className="justify-center px-3 py-4" style={{ flex: 3 }}>
        {resultMessage && (
          <View className="mb-3 bg-amber-900 border border-amber-500 rounded-xl p-3">
            <Text className="text-amber-200 text-center text-sm font-bold">{resultMessage}</Text>
          </View>
        )}

        {flashAnswer && (
          <View className={`mb-3 rounded-xl p-2 border ${flashAnswer.wasCorrect ? "bg-green-900/80 border-green-600" : "bg-red-900/80 border-red-600"}`}>
            <Text className={`text-center text-xs font-bold ${flashAnswer.wasCorrect ? "text-green-300" : "text-red-300"}`}>
              Rakip: {flashAnswer.label} — {flashAnswer.wasCorrect ? "Doğru!" : "Yanlış!"}
            </Text>
          </View>
        )}

        {battleState.phase !== "finished" && battleState.currentQuestion && (
          <>
            {isMyTurn ? (
              <QuestionCard question={battleState.currentQuestion} onAnswer={handleAnswer} />
            ) : (
              <View>
                <Text className="text-amber-400 text-xs text-center mb-2 font-bold uppercase tracking-wide">
                  {activePlayerName} cevaplıyor...
                </Text>
                <ReadOnlyQuestion question={battleState.currentQuestion} />
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

function ReadOnlyQuestion({ question }: { question: Question }) {
  return (
    <View className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700">
      <Text className="text-white text-sm font-semibold text-center mb-3">{question.text}</Text>
      <View className="gap-2">
        {question.options.map((opt, i) => (
          <View key={i} className="bg-slate-700/80 rounded-xl px-3 py-2 border border-slate-600/50">
            <Text className="text-slate-300 text-xs">{opt}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function HPBar({ current, max, color, label }: { current: number; max: number; color: "amber" | "red"; label: string }) {
  const pct = max > 0 ? Math.max(0, current / max) : 0;
  const barColor = color === "amber" ? "bg-amber-500" : "bg-red-500";
  return (
    <View className="w-full mt-2 px-1">
      <View className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <View className={`h-full rounded-full ${barColor}`} style={{ width: `${pct * 100}%` }} />
      </View>
      <Text className="text-slate-400 text-xs text-center mt-1">{current} {label}</Text>
    </View>
  );
}
