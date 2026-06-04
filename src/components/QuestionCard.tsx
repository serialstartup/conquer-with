import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import type { Question } from "@/types/game";

type Props = {
  question: Question;
  onAnswer: (correct: boolean) => void;
  disabled?: boolean;
  timeLimit?: number; // saniye, ileride kullanılacak
};

export function QuestionCard({ question, onAnswer, disabled = false }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  function handleSelect(index: number) {
    if (answered || disabled) return;
    setSelected(index);
    setAnswered(true);
    const isCorrect = index === question.correct_index;
    // 800ms sonra sonucu ilet (kullanıcının seçimini görmesi için)
    setTimeout(() => onAnswer(isCorrect), 800);
  }

  function getOptionStyle(index: number) {
    if (!answered) return "bg-slate-700 border border-slate-600";
    if (index === question.correct_index) return "bg-green-700 border border-green-500";
    if (index === selected && selected !== question.correct_index) return "bg-red-800 border border-red-600";
    return "bg-slate-700 border border-slate-600 opacity-50";
  }

  const labels = ["A", "B", "C", "D"] as const;

  return (
    <View className="bg-slate-800 rounded-2xl p-5 mx-4">
      <View className="flex-row items-center mb-3">
        <View className={`px-2 py-0.5 rounded-full mr-2 ${
          question.difficulty === 1 ? "bg-green-800" :
          question.difficulty === 2 ? "bg-yellow-800" : "bg-red-800"
        }`}>
          <Text className="text-white text-xs">
            {question.difficulty === 1 ? "Kolay" : question.difficulty === 2 ? "Orta" : "Zor"}
          </Text>
        </View>
        <Text className="text-slate-400 text-xs capitalize">{question.category}</Text>
      </View>

      <Text className="text-white text-base font-semibold mb-5 leading-6">
        {question.text}
      </Text>

      <View className="gap-2">
        {question.options.map((option, index) => (
          <TouchableOpacity
            key={index}
            className={`flex-row items-center rounded-xl px-4 py-3 ${getOptionStyle(index)}`}
            onPress={() => handleSelect(index)}
            disabled={answered || disabled}
          >
            <Text className="text-slate-400 font-bold mr-3 w-5">{labels[index]}</Text>
            <Text className="text-white flex-1">{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
