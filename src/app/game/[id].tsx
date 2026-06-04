import { useEffect, useState } from "react";
import { View, Text, Modal, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useGameState } from "@/hooks/useGameState";
import { ProvinceGrid } from "@/components/ProvinceGrid";
import { QuestionCard } from "@/components/QuestionCard";
import { PlayerStatus } from "@/components/PlayerStatus";
import provinces from "@/data/provinces.json";
import questions from "@/data/questions.json";
import type { Question, Province } from "@/types/game";

const provinceData = provinces as Province[];
const allQuestions = questions as Question[];

type RoomPlayer = {
  id: string;
  seat: number;
  player_id: string;
  main_province_id: number;
  profiles: { username: string } | null;
};

type ActionType = "claim" | "reinforce" | "battle" | null;

export default function GameScreen() {
  const { id: roomId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const { gameState, loading, updateGameState } = useGameState(roomId!);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [actionType, setActionType] = useState<ActionType>(null);
  const [showQuestion, setShowQuestion] = useState(false);

  useEffect(() => {
    loadPlayers();
  }, [roomId]);

  // Ana kale düşüp düşmediğini kontrol et
  useEffect(() => {
    if (!gameState || !players.length) return;
    for (const player of players) {
      const mainProvince = gameState.provinces[String(player.main_province_id)];
      if (mainProvince && mainProvince.owner_id !== player.player_id && mainProvince.owner_id !== null) {
        // Ana kale el değiştirdi — oyun bitti
        supabase.from("game_states").update({ phase: "finished" }).eq("room_id", roomId);
        router.replace(`/results/${roomId}`);
        return;
      }
    }
  }, [gameState?.provinces]);

  async function loadPlayers() {
    const { data } = await supabase
      .from("room_players")
      .select("id, seat, player_id, main_province_id, profiles(username)")
      .eq("room_id", roomId)
      .order("seat");
    if (data) setPlayers(data as unknown as RoomPlayer[]);
  }

  function getRandomQuestion(difficulty: 1 | 2 | 3): Question {
    const filtered = allQuestions.filter((q) => q.difficulty === difficulty);
    return filtered[Math.floor(Math.random() * filtered.length)];
  }

  function handleProvincePress(provinceId: number) {
    if (!gameState || !user) return;
    if (gameState.current_turn !== user.id) return;

    const state = gameState.provinces[String(provinceId)];
    const provinceInfo = provinceData.find((p) => p.id === provinceId)!;
    const difficulty = provinceInfo.difficulty as 1 | 2 | 3;
    const question = getRandomQuestion(difficulty);

    setSelectedProvince(provinceId);
    setCurrentQuestion(question);

    if (!state?.owner_id) {
      setActionType("claim");
    } else if (state.owner_id === user.id) {
      setActionType("reinforce");
    } else {
      setActionType("battle");
    }

    setShowQuestion(true);
  }

  async function handleAnswer(correct: boolean) {
    setShowQuestion(false);
    if (!gameState || !user || selectedProvince === null) return;

    const updatedProvinces = { ...gameState.provinces };
    const provinceKey = String(selectedProvince);

    if (correct) {
      if (actionType === "claim") {
        updatedProvinces[provinceKey] = { owner_id: user.id, soldiers: 1, castle_level: 0 };
      } else if (actionType === "reinforce") {
        const current = updatedProvinces[provinceKey];
        updatedProvinces[provinceKey] = { ...current, soldiers: current.soldiers + 1 };
      } else if (actionType === "battle") {
        // Savaş moduna geç
        setShowQuestion(false);
        setSelectedProvince(null);
        setCurrentQuestion(null);
        setActionType(null);
        router.push(`/game/${roomId}/battle?province=${selectedProvince}`);
        return;
      }
    }

    // Sırayı bir sonraki oyuncuya geç
    const currentIndex = players.findIndex((p) => p.player_id === gameState.current_turn);
    const nextIndex = (currentIndex + 1) % players.length;
    const nextTurn = players[nextIndex].player_id;

    await updateGameState({ provinces: updatedProvinces, current_turn: nextTurn });

    setSelectedProvince(null);
    setCurrentQuestion(null);
    setActionType(null);
  }

  if (loading || !gameState) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  const isMyTurn = gameState.current_turn === user?.id;
  const currentPlayer = players.find((p) => p.player_id === gameState.current_turn);

  const playerInfoList = players.map((p) => ({
    id: p.player_id,
    username: p.profiles?.username ?? "?",
    seat: p.seat,
    main_province_id: p.main_province_id,
  }));

  return (
    <View className="flex-1 bg-slate-900">
      {/* Sıra bilgisi */}
      <View className="pt-12 px-4 pb-2">
        <Text className="text-slate-400 text-xs text-center">
          {isMyTurn ? "Sıra sende — bir il seç" : `${currentPlayer?.profiles?.username ?? "?"} oynuyor...`}
        </Text>
      </View>

      {/* Oyuncu durumu */}
      <PlayerStatus
        players={playerInfoList}
        provinces={gameState.provinces}
        currentTurnId={gameState.current_turn}
        currentUserId={user?.id ?? ""}
      />

      {/* İl grid */}
      <View className="flex-1">
        <ProvinceGrid
          provinces={gameState.provinces}
          provinceData={provinceData}
          players={players.map((p) => ({ id: p.player_id, seat: p.seat, main_province_id: p.main_province_id }))}
          currentUserId={user?.id ?? ""}
          currentTurnId={gameState.current_turn}
          onProvincePress={handleProvincePress}
          disabled={showQuestion}
        />
      </View>

      {/* Soru modal */}
      <Modal visible={showQuestion} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-slate-900 rounded-t-3xl pt-4 pb-8">
            <View className="w-12 h-1 bg-slate-600 rounded-full mx-auto mb-4" />
            {currentQuestion && (
              <QuestionCard
                question={currentQuestion}
                onAnswer={handleAnswer}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
