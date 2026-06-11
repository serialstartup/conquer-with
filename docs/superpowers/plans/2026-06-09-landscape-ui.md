# Landscape UI + Koyu Strateji Teması Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 5 menü ekranını (Home, Lobby Create, Lobby Join, Waiting Room, Results) 2-sütunlu landscape layout'a taşı ve amber/koyu strateji görsel teması uygula.

**Architecture:** Her ekran `flex-1 flex-row` kök container alır. Sol sütun (flex:2) başlık + bağlam, sağ sütun (flex:3) form + butonlar. `bg-amber-700` ana buton rengi, `text-amber-400` başlık rengi, `bg-slate-800/40 border-r border-slate-700` sol sütun ayrımı.

**Tech Stack:** Expo 56, React Native 0.85, NativeWind v4, Expo Router, TypeScript

---

## Dosya Haritası

| Dosya | İşlem |
|---|---|
| `src/app/index.tsx` | Komple yeniden yaz |
| `src/app/lobby/create.tsx` | Komple yeniden yaz |
| `src/app/lobby/join.tsx` | Komple yeniden yaz |
| `src/app/room/[id].tsx` | Komple yeniden yaz (startGame mantığı korunur) |
| `src/app/results/[id].tsx` | Komple yeniden yaz (loadResults mantığı korunur) |

---

## Task 1: Home Screen

**Dosya:** `src/app/index.tsx`

- [ ] **Dosyayı yaz:**

```tsx
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
      <View className="flex-1 flex-row bg-slate-900">
        <View className="border-r border-slate-700 bg-slate-800/40 justify-center px-8" style={{ flex: 2 }}>
          <Text className="text-amber-400 text-3xl font-bold mb-2">⚔ Bil ve Fethet</Text>
          <Text className="text-slate-400 text-sm">Topraklarını genişlet, bilginle fethet</Text>
        </View>
        <View className="justify-center px-8" style={{ flex: 3 }}>
          <Text className="text-amber-400 text-base font-semibold mb-3">Kullanıcı Adın</Text>
          <TextInput
            className="bg-slate-800 text-white text-lg rounded-xl px-4 py-3 mb-4"
            placeholder="Kullanıcı adı gir..."
            placeholderTextColor="#64748b"
            value={usernameInput}
            onChangeText={setUsernameInput}
            maxLength={20}
            autoCapitalize="none"
          />
          <TouchableOpacity
            className="bg-amber-700 rounded-xl py-4 items-center"
            onPress={async () => {
              if (!usernameInput.trim()) return;
              setSaving(true);
              try {
                await setUsername(usernameInput.trim());
              } catch {
                // Hata olursa saving false'a döner
              } finally {
                setSaving(false);
              }
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
      </View>
    );
  }

  return (
    <View className="flex-1 flex-row bg-slate-900">
      <View className="border-r border-slate-700 bg-slate-800/40 justify-center px-8" style={{ flex: 2 }}>
        <Text className="text-amber-400 text-3xl font-bold mb-2">⚔ Bil ve Fethet</Text>
        <Text className="text-slate-400 text-sm mb-4">Topraklarını genişlet, bilginle fethet</Text>
        <Text className="text-slate-500 text-xs">{profile.username} · Misafir</Text>
      </View>
      <View className="justify-center px-8 gap-3" style={{ flex: 3 }}>
        <TouchableOpacity
          className="bg-amber-700 rounded-xl py-4 items-center"
          onPress={() => router.push("/lobby/create")}
        >
          <Text className="text-white text-lg font-bold">Oda Oluştur</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-slate-700 rounded-xl py-4 items-center"
          onPress={() => router.push("/lobby/join")}
        >
          <Text className="text-white text-lg font-semibold">Odaya Katıl</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

- [ ] **Commit:**
```bash
git add src/app/index.tsx
git commit -m "feat: home screen landscape 2-column layout + amber theme"
```

---

## Task 2: Lobby Create

**Dosya:** `src/app/lobby/create.tsx`

- [ ] **Dosyayı yaz:**

```tsx
import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useRoom } from "@/hooks/useRoom";

export default function CreateRoom() {
  const { createRoom, loading, error } = useRoom();
  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(4);
  const router = useRouter();

  async function handleCreate() {
    const roomId = await createRoom(20, maxPlayers);
    if (roomId) router.replace(`/room/${roomId}`);
  }

  return (
    <View className="flex-1 flex-row bg-slate-900">
      <View className="border-r border-slate-700 bg-slate-800/40 justify-center px-8" style={{ flex: 2 }}>
        <TouchableOpacity onPress={() => router.back()} className="mb-6">
          <Text className="text-slate-400 text-base">← Geri</Text>
        </TouchableOpacity>
        <Text className="text-amber-400 text-3xl font-bold mb-2">Oda Oluştur</Text>
        <Text className="text-slate-400 text-sm">Kaç oyuncuyla oynayacaksın?</Text>
      </View>
      <View className="justify-center px-8" style={{ flex: 3 }}>
        <Text className="text-white font-semibold mb-3">Oyuncu Sayısı</Text>
        <View className="flex-row gap-3 mb-8">
          {([2, 3, 4] as const).map((n) => (
            <TouchableOpacity
              key={n}
              className={`flex-1 py-3 rounded-xl items-center ${
                maxPlayers === n ? "bg-amber-700 border border-amber-500" : "bg-slate-700"
              }`}
              onPress={() => setMaxPlayers(n)}
            >
              <Text className="text-white font-bold text-lg">{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {error && <Text className="text-red-400 mb-4 text-center">{error}</Text>}
        <TouchableOpacity
          className="bg-amber-700 rounded-xl py-4 items-center"
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-lg font-bold">Odayı Oluştur</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

- [ ] **Commit:**
```bash
git add src/app/lobby/create.tsx
git commit -m "feat: lobby create screen landscape 2-column layout + amber theme"
```

---

## Task 3: Lobby Join

**Dosya:** `src/app/lobby/join.tsx`

- [ ] **Dosyayı yaz:**

```tsx
import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useRoom } from "@/hooks/useRoom";

export default function JoinRoom() {
  const { joinRoom, loading, error } = useRoom();
  const [code, setCode] = useState("");
  const router = useRouter();

  async function handleJoin() {
    if (code.trim().length !== 6) return;
    const roomId = await joinRoom(code.trim());
    if (roomId) router.replace(`/room/${roomId}`);
  }

  return (
    <View className="flex-1 flex-row bg-slate-900">
      <View className="border-r border-slate-700 bg-slate-800/40 justify-center px-8" style={{ flex: 2 }}>
        <TouchableOpacity onPress={() => router.back()} className="mb-6">
          <Text className="text-slate-400 text-base">← Geri</Text>
        </TouchableOpacity>
        <Text className="text-amber-400 text-3xl font-bold mb-2">Odaya Katıl</Text>
        <Text className="text-slate-400 text-sm">6 haneli oda kodunu gir</Text>
      </View>
      <View className="justify-center px-8" style={{ flex: 3 }}>
        <TextInput
          className="bg-slate-800 text-white text-2xl font-bold rounded-xl px-4 py-4 mb-6 text-center tracking-widest"
          placeholder="XXXXXX"
          placeholderTextColor="#475569"
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        {error && <Text className="text-red-400 mb-4 text-center">{error}</Text>}
        <TouchableOpacity
          className="bg-amber-700 rounded-xl py-4 items-center"
          onPress={handleJoin}
          disabled={loading || code.trim().length !== 6}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-lg font-bold">Katıl</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

- [ ] **Commit:**
```bash
git add src/app/lobby/join.tsx
git commit -m "feat: lobby join screen landscape 2-column layout + amber theme"
```

---

## Task 4: Waiting Room

**Dosya:** `src/app/room/[id].tsx`

Not: `startGame` fonksiyonu değişmez. `loadPlayers` içindeki `as unknown as` cast da düzeltilir.
`ScrollView` import'u zaten var, eklemeye gerek yok.

- [ ] **Dosyayı yaz:**

```tsx
import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Share, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

type RoomPlayer = {
  id: string;
  seat: number;
  player_id: string;
  profiles: { username: string } | null;
};

type RoomData = {
  id: string;
  code: string;
  host_id: string;
  status: string;
  max_players: number;
  time_limit_minutes: number;
};

const SEAT_COLORS = ["bg-blue-600", "bg-red-600", "bg-green-600", "bg-yellow-600"] as const;

export default function WaitingRoom() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadRoom();
    loadPlayers();

    const channel = supabase
      .channel(`room:${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${id}` }, () => {
        loadPlayers();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${id}` }, (payload) => {
        const updated = payload.new as RoomData;
        setRoom(updated);
        if (updated.status === "playing") {
          router.replace(`/game/${id}`);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  async function loadRoom() {
    const { data } = await supabase
      .from("rooms")
      .select("id, code, host_id, status, max_players, time_limit_minutes")
      .eq("id", id)
      .single();
    if (data) setRoom(data);
  }

  async function loadPlayers() {
    const { data } = await supabase
      .from("room_players")
      .select("id, seat, player_id, profiles(username)")
      .eq("room_id", id)
      .order("seat");
    if (data) setPlayers(data.map((p) => ({
      id: String(p.id),
      seat: Number(p.seat),
      player_id: String(p.player_id),
      profiles: Array.isArray(p.profiles)
        ? ((p.profiles[0] as { username: string }) ?? null)
        : (p.profiles as { username: string } | null),
    })));
  }

  async function startGame() {
    if (!room || !user || starting) return;
    setStarting(true);
    try {
      const { data: updated, error: updateError } = await supabase
        .from("rooms")
        .update({ status: "starting" })
        .eq("id", room.id)
        .eq("status", "waiting")
        .select("id")
        .maybeSingle();

      if (updateError || !updated) {
        setStarting(false);
        return;
      }

      const { data: freshPlayers } = await supabase
        .from("room_players")
        .select("id, seat, player_id")
        .eq("room_id", room.id)
        .order("seat");

      if (!freshPlayers || freshPlayers.length < 2) {
        await supabase.from("rooms").update({ status: "waiting" }).eq("id", room.id);
        setStarting(false);
        return;
      }

      const availableIds = Array.from({ length: 81 }, (_, i) => i).sort(() => Math.random() - 0.5);

      for (let i = 0; i < freshPlayers.length; i++) {
        await supabase
          .from("room_players")
          .update({ main_province_id: availableIds[i] })
          .eq("id", freshPlayers[i].id);
      }

      const provinces: Record<string, { owner_id: string | null; soldiers: number; castle_level: number }> = {};
      for (let i = 0; i < 81; i++) {
        provinces[String(i)] = { owner_id: null, soldiers: 0, castle_level: 0 };
      }
      for (let i = 0; i < freshPlayers.length; i++) {
        provinces[String(availableIds[i])] = {
          owner_id: freshPlayers[i].player_id,
          soldiers: 3,
          castle_level: 1,
        };
      }

      const { error: gsError } = await supabase.from("game_states").insert({
        room_id: room.id,
        current_turn: freshPlayers[0].player_id,
        provinces,
        phase: "playing",
        started_at: new Date().toISOString(),
      });

      if (gsError) {
        await supabase.from("rooms").update({ status: "playing" }).eq("id", room.id);
        router.replace(`/game/${room.id}`);
        return;
      }

      await supabase.from("rooms").update({ status: "playing" }).eq("id", room.id);
      router.replace(`/game/${room.id}`);
    } catch {
      Alert.alert("Hata", "Oyun başlatılamadı");
      await supabase.from("rooms").update({ status: "waiting" }).eq("id", room.id);
      setStarting(false);
    }
  }

  if (!room) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  const isHost = user?.id === room.host_id;
  const canStart = players.length >= 2 && isHost;

  return (
    <View className="flex-1 flex-row bg-slate-900">
      <View className="border-r border-slate-700 bg-slate-800/40 justify-center px-8" style={{ flex: 2 }}>
        <TouchableOpacity onPress={() => router.back()} className="mb-6">
          <Text className="text-slate-400 text-base">← Geri</Text>
        </TouchableOpacity>
        <Text className="text-amber-400 text-3xl font-bold mb-1">Bekleme Odası</Text>
        <TouchableOpacity
          onPress={() => Share.share({ message: `Bil ve Fethet - Oda kodu: ${room.code}` })}
          className="mt-4"
        >
          <Text className="text-slate-400 text-xs mb-1">Oda Kodu</Text>
          <Text className="text-blue-400 text-2xl font-bold tracking-widest">{room.code}</Text>
          <Text className="text-slate-500 text-xs mt-1">Paylaşmak için dokun</Text>
        </TouchableOpacity>
        <Text className="text-slate-400 text-sm mt-6">
          {players.length} / {room.max_players} oyuncu
        </Text>
      </View>
      <View className="py-6 px-6" style={{ flex: 3 }}>
        <ScrollView className="flex-1 mb-4">
          {players.map((p) => {
            const seatColor = SEAT_COLORS[(p.seat - 1) % SEAT_COLORS.length];
            return (
              <View key={p.id} className="flex-row items-center bg-slate-800 rounded-xl px-4 py-3 mb-2">
                <View className={`w-8 h-8 rounded-full ${seatColor} items-center justify-center mr-3`}>
                  <Text className="text-white font-bold">{p.seat}</Text>
                </View>
                <Text className="text-white font-semibold flex-1">
                  {p.profiles?.username ?? "Bağlanıyor..."}
                </Text>
                {p.player_id === room.host_id && (
                  <Text className="text-yellow-400 text-xs">Host</Text>
                )}
              </View>
            );
          })}
        </ScrollView>
        {!isHost && (
          <Text className="text-slate-500 text-center mb-3">Host oyunu başlatmasını bekle...</Text>
        )}
        {isHost && (
          <TouchableOpacity
            className={`rounded-xl py-4 items-center ${canStart ? "bg-amber-700" : "bg-slate-700"}`}
            onPress={startGame}
            disabled={!canStart || starting}
          >
            {starting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className={`text-lg font-bold ${canStart ? "text-white" : "text-slate-500"}`}>
                {players.length < 2 ? "En az 2 oyuncu gerekli" : "Oyunu Başlat"}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
```

- [ ] **Commit:**
```bash
git add src/app/room/\[id\].tsx
git commit -m "feat: waiting room landscape 2-column layout + amber theme + seat colors"
```

---

## Task 5: Results

**Dosya:** `src/app/results/[id].tsx`

Not: `loadResults` içindeki mantık değişmez; sadece render kısmı 2-sütuna taşınır.

- [ ] **Dosyayı yaz:**

```tsx
import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { Provinces } from "@/types/game";

type PlayerResult = {
  player_id: string;
  username: string;
  seat: number;
  main_province_id: number;
  province_count: number;
  is_winner: boolean;
};

const SEAT_COLORS = [
  "bg-blue-600", "bg-red-600", "bg-green-600", "bg-yellow-600",
] as const;

export default function ResultsScreen() {
  const { id: roomId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [winReason, setWinReason] = useState<"castle" | "time">("time");

  useEffect(() => {
    loadResults();
  }, [roomId]);

  async function loadResults() {
    const [{ data: gamePlayers }, { data: gameState }] = await Promise.all([
      supabase
        .from("room_players")
        .select("player_id, seat, main_province_id, profiles(username)")
        .eq("room_id", roomId)
        .order("seat"),
      supabase
        .from("game_states")
        .select("provinces")
        .eq("room_id", roomId)
        .single(),
    ]);

    if (!gamePlayers || !gameState) { setLoading(false); return; }

    const provinces = gameState.provinces as Provinces;

    const playerResults: PlayerResult[] = (gamePlayers as unknown as Array<{
      player_id: string;
      seat: number;
      main_province_id: number;
      profiles: { username: string } | null;
    }>).map((p) => {
      const provinceCount = Object.values(provinces).filter(
        (prov) => prov.owner_id === p.player_id
      ).length;
      return {
        player_id: p.player_id,
        username: p.profiles?.username ?? "?",
        seat: p.seat,
        main_province_id: p.main_province_id,
        province_count: provinceCount,
        is_winner: false,
      };
    });

    playerResults.sort((a, b) => b.province_count - a.province_count || a.seat - b.seat);
    if (playerResults.length > 0) playerResults[0].is_winner = true;

    const castleCapture = playerResults.some((p) => {
      const mainState = provinces[String(p.main_province_id)];
      return mainState && mainState.owner_id !== p.player_id && mainState.owner_id !== null;
    });
    setWinReason(castleCapture ? "castle" : "time");

    setResults(playerResults);
    setLoading(false);

    for (const p of playerResults) {
      try {
        await supabase.rpc("increment_games_played", { player_id: p.player_id });
      } catch {
        // RPC mevcut değilse sessizce geç
      }
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  const winner = results[0];
  const isIWon = winner?.player_id === user?.id;

  return (
    <View className="flex-1 flex-row bg-slate-900">
      <View className="border-r border-slate-700 bg-slate-800/40 justify-center px-8" style={{ flex: 5 }}>
        <Text className="text-amber-400 text-xl font-bold tracking-widest uppercase mb-1">
          {isIWon ? "Tebrikler!" : "Oyun Bitti"}
        </Text>
        <Text className="text-slate-400 text-sm mb-6">
          {winReason === "castle" ? "Ana kale fethedildi" : "Süre doldu"}
        </Text>
        {winner && (
          <View className="bg-yellow-900/40 border border-yellow-600 rounded-2xl p-5 items-center">
            <Text className="text-yellow-400 text-sm font-semibold mb-1">Kazanan</Text>
            <Text className="text-white text-2xl font-bold">{winner.username}</Text>
            <Text className="text-yellow-300 text-lg font-semibold mt-1">{winner.province_count} il</Text>
          </View>
        )}
      </View>
      <View className="py-6 px-6" style={{ flex: 5 }}>
        <Text className="text-slate-400 text-sm font-semibold mb-3 uppercase tracking-wide">Sıralama</Text>
        <ScrollView className="flex-1 mb-4">
          {results.map((player, index) => {
            const color = SEAT_COLORS[(player.seat - 1) % SEAT_COLORS.length];
            const isMe = player.player_id === user?.id;
            return (
              <View
                key={player.player_id}
                className={`flex-row items-center rounded-xl px-4 py-3 mb-2 bg-slate-800 ${isMe ? "border border-slate-500" : ""}`}
              >
                <View className={`w-8 h-8 rounded-full ${color} items-center justify-center mr-3`}>
                  <Text className="text-white font-bold text-sm">{index + 1}</Text>
                </View>
                <Text className="text-white font-semibold flex-1">
                  {player.username}{isMe ? " (Sen)" : ""}
                </Text>
                <Text className="text-slate-300 font-bold">{player.province_count} il</Text>
              </View>
            );
          })}
        </ScrollView>
        <TouchableOpacity
          className="bg-slate-700 rounded-xl py-3 items-center"
          onPress={() => router.replace("/")}
        >
          <Text className="text-white text-lg font-bold">Ana Menüye Dön</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

- [ ] **Commit:**
```bash
git add src/app/results/\[id\].tsx
git commit -m "feat: results screen landscape 2-column layout + amber theme"
```

---

## Doğrulama

- [ ] `npx tsc --noEmit 2>&1 | grep "src/"` — sıfır hata
- [ ] `npx expo start --ios` — her ekranı gez, 2-sütunun görünür olduğunu kontrol et
- [ ] Waiting room'da oyuncu eklendikçe sağ sütunda scroll çalışıyor mu kontrol et
- [ ] Results'ta sol sütun kazanan kartın sığdığını kontrol et
