# Turkey SVG Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `ProvinceGrid` (flex-wrap buton listesi) bileşenini, pinch zoom + pan destekli interaktif Türkiye SVG haritasıyla değiştir.

**Architecture:** Build-time Node.js scripti GeoJSON il sınırlarını SVG path string'lerine çevirir ve `provinces-paths.json`'a yazar. `TurkeyMap` bileşeni bu veriyi `react-native-svg` ile render eder; `react-native-gesture-handler` + `react-native-reanimated` zoom/pan sağlar. `GameScreen`'de tek değişiklik import + bileşen adı.

**Tech Stack:** react-native-svg, react-native-gesture-handler v2 (Gesture API), react-native-reanimated 4, Node.js (build-time script)

---

## Dosya Haritası

| Dosya | İşlem | Açıklama |
|---|---|---|
| `scripts/generate-province-paths.js` | Oluştur | GeoJSON → SVG path dönüşüm scripti |
| `scripts/data/tr-cities-utf8.json` | Oluştur (download) | Türkiye GeoJSON kaynak verisi |
| `src/data/provinces-paths.json` | Oluştur (generated) | Script çıktısı — 81 il path + centroid |
| `assets/icons/castle.png` | Ekle (manuel) | Kale ikonu (Kenney.nl) |
| `src/components/TurkeyMap.tsx` | Oluştur | Ana harita bileşeni |
| `src/app/game/[id].tsx` | Değiştir | ProvinceGrid → TurkeyMap (2 satır) |
| `src/components/ProvinceGrid.tsx` | Silinmez | TurkeyMap stabil olunca kaldırılır |

---

## Task 1: Bağımlılık Kurulumu

**Files:**
- Modify: `package.json`

- [ ] **react-native-svg'yi kur**

```bash
cd /Applications/projects/mobile-apps/conquer-with
npx expo install react-native-svg
```

Beklenen: `package.json`'a `"react-native-svg": "15.x.x"` eklenmiş olmalı.

- [ ] **Kurulumu doğrula**

```bash
grep "react-native-svg" package.json
```

Beklenen çıktı: `"react-native-svg": "15.x.x"` (sürüm fark eder, satır olmalı).

- [ ] **Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: react-native-svg kur (harita için)"
```

---

## Task 2: GeoJSON Verisi İndir

**Files:**
- Create: `scripts/data/tr-cities-utf8.json`

- [ ] **GeoJSON'ı indir**

```bash
curl -L "https://raw.githubusercontent.com/cihadturhan/tr-geojson/master/geo/tr-cities-utf8.json" \
  -o /Applications/projects/mobile-apps/conquer-with/scripts/data/tr-cities-utf8.json
```

- [ ] **Yapıyı doğrula — feature sayısı 81 olmalı**

```bash
node -e "
const d = require('./scripts/data/tr-cities-utf8.json');
console.log('Feature sayısı:', d.features.length);
console.log('İlk il adı:', d.features[0].properties.name);
console.log('Geometry tipi:', d.features[0].geometry.type);
"
```

Beklenen çıktı:
```
Feature sayısı: 81
İlk il adı: ADANA  (ya da Adana — normalizasyon halleder)
Geometry tipi: MultiPolygon
```

Eğer feature sayısı 81 değilse veya curl başarısız olursa: `https://github.com/cihadturhan/tr-geojson` adresine git, `geo/tr-cities-utf8.json` dosyasını manuel indir, `scripts/data/` altına kaydet.

- [ ] **scripts/data/ gitignore'a ekle**

`.gitignore` dosyasına şu satırı ekle (raw veriyi repoya almıyoruz):
```
scripts/data/
```

```bash
echo "scripts/data/" >> .gitignore
```

---

## Task 3: Province Path Generator Script

**Files:**
- Create: `scripts/generate-province-paths.js`

- [ ] **Scripti oluştur**

```javascript
// scripts/generate-province-paths.js
const fs = require('fs');
const path = require('path');

const BOUNDS = { minLon: 25.7, maxLon: 44.8, minLat: 35.8, maxLat: 42.1 };
const VIEW_W = 800;
const VIEW_H = 480;
// Her N. koordinatı al — path boyutunu küçültür
const SIMPLIFY_STEP = 3;

function normalize(str) {
  return str.toLowerCase()
    .replace(/ı/g, 'i').replace(/i̇/g, 'i')
    .replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o')
    .replace(/ç/g, 'c').replace(/â/g, 'a')
    .trim();
}

function toXY(lon, lat) {
  const x = ((lon - BOUNDS.minLon) / (BOUNDS.maxLon - BOUNDS.minLon)) * VIEW_W;
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * VIEW_H;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

function ringToPath(ring) {
  const sampled = ring.filter((_, i) => i % SIMPLIFY_STEP === 0);
  if (sampled[sampled.length - 1] !== ring[ring.length - 1]) {
    sampled.push(ring[ring.length - 1]);
  }
  const pts = sampled.map(([lon, lat]) => toXY(lon, lat));
  return 'M ' + pts.map(([x, y]) => `${x},${y}`).join(' L ') + ' Z';
}

function geometryToPath(geom) {
  if (geom.type === 'Polygon') {
    return geom.coordinates.map(ringToPath).join(' ');
  }
  if (geom.type === 'MultiPolygon') {
    return geom.coordinates.flatMap(poly => poly.map(ringToPath)).join(' ');
  }
  return '';
}

function centroid(geom) {
  let sumX = 0, sumY = 0, n = 0;
  const addRing = (ring) => {
    for (const [lon, lat] of ring) {
      const [x, y] = toXY(lon, lat);
      sumX += x; sumY += y; n++;
    }
  };
  if (geom.type === 'Polygon') addRing(geom.coordinates[0]);
  else if (geom.type === 'MultiPolygon') {
    // En büyük poligonun centroid'ini al (adaları dışla)
    let biggest = null, maxLen = 0;
    for (const poly of geom.coordinates) {
      if (poly[0].length > maxLen) { maxLen = poly[0].length; biggest = poly; }
    }
    if (biggest) addRing(biggest[0]);
  }
  return [Math.round(sumX / n * 10) / 10, Math.round(sumY / n * 10) / 10];
}

const geojson = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'data', 'tr-cities-utf8.json'), 'utf8'
));
const provinces = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'src', 'data', 'provinces.json'), 'utf8'
));

const nameToId = Object.fromEntries(provinces.map(p => [normalize(p.name), p.id]));

const output = {};
const unmatched = [];

for (const f of geojson.features) {
  const raw = f.properties.name || f.properties.NAME || '';
  const norm = normalize(raw);
  const id = nameToId[norm];
  if (id === undefined) { unmatched.push(raw); continue; }
  output[id] = { path: geometryToPath(f.geometry), centroid: centroid(f.geometry) };
}

if (unmatched.length > 0) {
  console.error('❌ Eşleşmeyen iller:', unmatched);
  process.exit(1);
}

const outPath = path.join(__dirname, '..', 'src', 'data', 'provinces-paths.json');
fs.writeFileSync(outPath, JSON.stringify(output));
console.log(`✓ ${Object.keys(output).length}/81 il işlendi → ${outPath}`);
const kb = Math.round(fs.statSync(outPath).size / 1024);
console.log(`✓ Dosya boyutu: ${kb} KB`);
```

- [ ] **Scripti çalıştır**

```bash
node scripts/generate-province-paths.js
```

Beklenen çıktı:
```
✓ 81/81 il işlendi → .../src/data/provinces-paths.json
✓ Dosya boyutu: XX KB
```

Hata çıkarsa:
- `❌ Eşleşmeyen iller: [...]` → Properties'deki isim farklıdır. `node -e "const d=require('./scripts/data/tr-cities-utf8.json'); d.features.forEach(f=>console.log(f.properties.name))"` ile isimleri listele, `normalize()` fonksiyonunu güncelle.

- [ ] **Çıktıyı doğrula**

```bash
node -e "
const d = require('./src/data/provinces-paths.json');
const keys = Object.keys(d);
console.log('İl sayısı:', keys.length);
console.log('ID 0 (Adana) path uzunluğu:', d['0'].path.length, 'karakter');
console.log('ID 0 centroid:', d['0'].centroid);
console.log('ID 5 (Ankara) centroid:', d['5'].centroid);
"
```

Beklenen:
```
İl sayısı: 81
ID 0 (Adana) path uzunluğu: XXXX karakter
ID 0 centroid: [ 380.x, 280.x ]   (x: 0-800 arası, y: 0-480 arası olmalı)
ID 5 (Ankara) centroid: [ 390.x, 160.x ]  (yaklaşık Türkiye ortası)
```

- [ ] **Commit**

```bash
git add scripts/generate-province-paths.js src/data/provinces-paths.json .gitignore
git commit -m "feat: GeoJSON → SVG path generator scripti ve provinces-paths.json"
```

---

## Task 4: Kale İkonu Asset'i Ekle

**Files:**
- Create: `assets/icons/castle.png`

- [ ] **Kenney.nl'den kale PNG indir**

Tarayıcıda `https://kenney.nl/assets` → arama: `"medieval"` veya `"tiny town"` → PNG formatında kale/kule ikonu indir.

Gereksinimler:
- Şeffaf arka plan (transparent PNG)
- En az 64×64 px
- Tek başına kale/kule görseli

Dosyayı şuraya kaydet: `assets/icons/castle.png`

- [ ] **Dosyanın varlığını doğrula**

```bash
file assets/icons/castle.png
```

Beklenen: `assets/icons/castle.png: PNG image data, ... (RGBA)`

- [ ] **Commit**

```bash
git add assets/icons/castle.png
git commit -m "assets: kale ikonu ekle (Kenney.nl)"
```

---

## Task 5: TurkeyMap — Statik Render (zoom/pan yok)

**Files:**
- Create: `src/components/TurkeyMap.tsx`

Önce zoom/pan olmadan sadece haritanın doğru render edildiğini doğruluyoruz.

- [ ] **TurkeyMap.tsx oluştur**

```tsx
// src/components/TurkeyMap.tsx
import React from 'react';
import { Dimensions, ScrollView } from 'react-native';
import Svg, { Path, Text as SvgText, Image as SvgImage } from 'react-native-svg';
import provincesPaths from '@/data/provinces-paths.json';
import type { Province, Provinces } from '@/types/game';

const VIEWBOX_W = 800;
const VIEWBOX_H = 480;
const PLAYER_COLORS = ['#2563EB', '#DC2626', '#16A34A', '#CA8A04'];
const EMPTY_COLOR = '#334155';
const EMPTY_STROKE = '#475569';

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

const pathsData = provincesPaths as Record<string, { path: string; centroid: [number, number] }>;

export function TurkeyMap({
  provinces,
  provinceData,
  players,
  currentUserId,
  currentTurnId,
  onProvincePress,
  disabled = false,
}: Props) {
  const { width: screenW } = Dimensions.get('window');
  const svgH = Math.round(screenW * VIEWBOX_H / VIEWBOX_W);
  const isMyTurn = currentUserId === currentTurnId;

  function getColor(provinceId: number): string {
    const owner = provinces[String(provinceId)]?.owner_id;
    if (!owner) return EMPTY_COLOR;
    const player = players.find(p => p.id === owner);
    if (!player) return EMPTY_COLOR;
    return PLAYER_COLORS[(player.seat - 1) % PLAYER_COLORS.length];
  }

  function getCastlePlayer(provinceId: number): PlayerInfo | undefined {
    return players.find(p => p.main_province_id === provinceId);
  }

  function getSoldiers(provinceId: number): number {
    return provinces[String(provinceId)]?.soldiers ?? 0;
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ alignItems: 'center' }}
      scrollEnabled={false}
    >
      <Svg
        width={screenW}
        height={svgH}
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      >
        {provinceData.map(province => {
          const data = pathsData[String(province.id)];
          if (!data) return null;

          const fill = getColor(province.id);
          const castlePlayer = getCastlePlayer(province.id);
          const soldiers = getSoldiers(province.id);
          const owned = !!provinces[String(province.id)]?.owner_id;
          const [cx, cy] = data.centroid;

          return (
            <React.Fragment key={province.id}>
              <Path
                d={data.path}
                fill={fill}
                stroke={castlePlayer ? PLAYER_COLORS[(castlePlayer.seat - 1) % PLAYER_COLORS.length] : EMPTY_STROKE}
                strokeWidth={castlePlayer ? 2 : 0.5}
                strokeOpacity={castlePlayer ? 0.9 : 0.5}
                onPress={() => {
                  if (!disabled && isMyTurn) onProvincePress(province.id);
                }}
              />
              {owned && castlePlayer && (
                <SvgImage
                  href={require('../../assets/icons/castle.png')}
                  x={cx - 8}
                  y={cy - 8}
                  width={16}
                  height={16}
                />
              )}
              {owned && !castlePlayer && soldiers > 0 && (
                <SvgText
                  x={cx}
                  y={cy + 4}
                  fontSize={9}
                  fill="white"
                  textAnchor="middle"
                  fontWeight="bold"
                  pointerEvents="none"
                >
                  {soldiers}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
      </Svg>
    </ScrollView>
  );
}
```

- [ ] **GameScreen'de TurkeyMap'i geçici olarak test et**

`src/app/game/[id].tsx` dosyasında:

```tsx
// Eski satırı yorum yap, yenisini ekle:
// import { ProvinceGrid } from "@/components/ProvinceGrid";
import { TurkeyMap } from "@/components/TurkeyMap";

// JSX'te:
// <ProvinceGrid ... />
<TurkeyMap
  provinces={gameState.provinces}
  provinceData={provinceData}
  players={players.map(p => ({ id: p.player_id, seat: p.seat, main_province_id: p.main_province_id }))}
  currentUserId={user?.id ?? ''}
  currentTurnId={gameState.current_turn}
  onProvincePress={handleProvincePress}
  disabled={showQuestion}
/>
```

- [ ] **Uygulamayı başlat ve görsel olarak doğrula**

```bash
npx expo start
```

Kontrol listesi:
- [ ] Türkiye haritası ekranda görünüyor
- [ ] Tüm iller boş (gri) başlıyor
- [ ] Bir oyun başlat → iller renkleniyor
- [ ] İle tıklanınca soru geliyor
- [ ] TypeScript hataları yok (`npx tsc --noEmit`)

- [ ] **Commit**

```bash
git add src/components/TurkeyMap.tsx src/app/game/[id].tsx
git commit -m "feat: TurkeyMap statik render (zoom/pan öncesi)"
```

---

## Task 6: Zoom/Pan Gesture Ekle

**Files:**
- Modify: `src/components/TurkeyMap.tsx`

- [ ] **TurkeyMap'i zoom/pan destekli hale getir**

`src/components/TurkeyMap.tsx` dosyasını tamamen şu içerikle değiştir:

```tsx
// src/components/TurkeyMap.tsx
import React, { useState } from 'react';
import { Dimensions, View } from 'react-native';
import Svg, { Path, Text as SvgText, Image as SvgImage } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import provincesPaths from '@/data/provinces-paths.json';
import type { Province, Provinces } from '@/types/game';

const VIEWBOX_W = 800;
const VIEWBOX_H = 480;
const PLAYER_COLORS = ['#2563EB', '#DC2626', '#16A34A', '#CA8A04'];
const EMPTY_COLOR = '#334155';
const EMPTY_STROKE = '#475569';
const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ICON_ZOOM_THRESHOLD = 1.8;

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

const pathsData = provincesPaths as Record<string, { path: string; centroid: [number, number] }>;

export function TurkeyMap({
  provinces,
  provinceData,
  players,
  currentUserId,
  currentTurnId,
  onProvincePress,
  disabled = false,
}: Props) {
  const { width: screenW } = Dimensions.get('window');
  const svgH = Math.round(screenW * VIEWBOX_H / VIEWBOX_W);
  const isMyTurn = currentUserId === currentTurnId;
  const [showIcons, setShowIcons] = useState(false);

  // Gesture state
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  // İkon gösterimini zoom eşiğine göre React state'e yansıt
  useAnimatedReaction(
    () => scale.value,
    (s) => { runOnJS(setShowIcons)(s >= ICON_ZOOM_THRESHOLD); },
    []
  );

  function clampTranslate(tx: number, ty: number, s: number) {
    'worklet';
    const maxTx = ((s - 1) * screenW) / 2;
    const maxTy = ((s - 1) * svgH) / 2;
    return {
      x: Math.min(maxTx, Math.max(-maxTx, tx)),
      y: Math.min(maxTy, Math.max(-maxTy, ty)),
    };
  }

  const pinch = Gesture.Pinch()
    .onUpdate(e => {
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, savedScale.value * e.scale));
      const clamped = clampTranslate(savedTx.value, savedTy.value, scale.value);
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      savedTx.value = translateX.value;
      savedTy.value = translateY.value;
    });

  const pan = Gesture.Pan()
    .minDistance(5)
    .onUpdate(e => {
      const clamped = clampTranslate(
        savedTx.value + e.translationX,
        savedTy.value + e.translationY,
        scale.value
      );
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd(() => {
      savedTx.value = translateX.value;
      savedTy.value = translateY.value;
    });

  const gesture = Gesture.Simultaneous(pinch, pan);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  function getColor(provinceId: number): string {
    const owner = provinces[String(provinceId)]?.owner_id;
    if (!owner) return EMPTY_COLOR;
    const player = players.find(p => p.id === owner);
    if (!player) return EMPTY_COLOR;
    return PLAYER_COLORS[(player.seat - 1) % PLAYER_COLORS.length];
  }

  function getCastlePlayer(provinceId: number): PlayerInfo | undefined {
    return players.find(p => p.main_province_id === provinceId);
  }

  function getSoldiers(provinceId: number): number {
    return provinces[String(provinceId)]?.soldiers ?? 0;
  }

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <Animated.View style={[{ width: screenW, height: svgH }, animStyle]}>
          <Svg
            width={screenW}
            height={svgH}
            viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          >
            {provinceData.map(province => {
              const data = pathsData[String(province.id)];
              if (!data) return null;

              const fill = getColor(province.id);
              const castlePlayer = getCastlePlayer(province.id);
              const soldiers = getSoldiers(province.id);
              const owned = !!provinces[String(province.id)]?.owner_id;
              const [cx, cy] = data.centroid;

              return (
                <React.Fragment key={province.id}>
                  <Path
                    d={data.path}
                    fill={fill}
                    stroke={castlePlayer
                      ? PLAYER_COLORS[(castlePlayer.seat - 1) % PLAYER_COLORS.length]
                      : EMPTY_STROKE}
                    strokeWidth={castlePlayer ? 2 : 0.5}
                    strokeOpacity={castlePlayer ? 0.9 : 0.5}
                    onPress={() => {
                      if (!disabled && isMyTurn) onProvincePress(province.id);
                    }}
                  />
                  {showIcons && owned && castlePlayer && (
                    <SvgImage
                      href={require('../../assets/icons/castle.png')}
                      x={cx - 8}
                      y={cy - 8}
                      width={16}
                      height={16}
                    />
                  )}
                  {showIcons && owned && !castlePlayer && soldiers > 0 && (
                    <SvgText
                      x={cx}
                      y={cy + 4}
                      fontSize={9}
                      fill="white"
                      textAnchor="middle"
                      fontWeight="bold"
                      pointerEvents="none"
                    >
                      {soldiers}
                    </SvgText>
                  )}
                </React.Fragment>
              );
            })}
          </Svg>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
```

- [ ] **Zoom/pan'ı test et**

```bash
npx expo start
```

Kontrol listesi:
- [ ] İki parmakla harita zoom yapıyor (1x–4x arası)
- [ ] Tek parmakla harita kaydırılıyor
- [ ] Harita ekran dışına çıkmıyor (sınırlarda duruyor)
- [ ] 1.8x zoom üzerinde kale ikonu ve asker sayısı görünüyor
- [ ] 1.8x altında ikonlar gizleniyor
- [ ] Il'e kısa dokunuş → soru geliyor (pan ile karışmıyor)

- [ ] **Commit**

```bash
git add src/components/TurkeyMap.tsx
git commit -m "feat: TurkeyMap zoom/pan gesture (pinch 1x-4x, pan sınırlı)"
```

---

## Task 7: GameScreen Entegrasyonu — Temizlik

**Files:**
- Modify: `src/app/game/[id].tsx`
- Delete comment: `ProvinceGrid` import satırı

- [ ] **Task 5'te yapılan geçici yorum satırını kalıcı hale getir**

`src/app/game/[id].tsx` içinde:

```tsx
// Bu satırı SİL:
// import { ProvinceGrid } from "@/components/ProvinceGrid";

// Bu satır kalmalı:
import { TurkeyMap } from "@/components/TurkeyMap";
```

JSX kısmında `<ProvinceGrid .../>` satırının tamamen silindiğini, `<TurkeyMap .../>` kullanıldığını doğrula.

- [ ] **TypeScript kontrolü**

```bash
npx tsc --noEmit
```

Beklenen: Hata yok (0 errors).

- [ ] **Tam oyun akışı testi**

İki cihazla:
1. Oda kur → katıl → başlat
2. Türkiye haritası her iki cihazda da açılıyor
3. Bir il seç → soru → doğru cevapla → il renkleniyor
4. Savaş dene → battle ekranı açılıyor
5. Süre dolunca results ekranı açılıyor

- [ ] **Final commit**

```bash
git add src/app/game/[id].tsx
git commit -m "feat: Faz 8 - Türkiye SVG haritası (ProvinceGrid → TurkeyMap)"
```

---

## Doğrulama Kriterleri

- [ ] Tüm 81 il haritada görünür
- [ ] Pinch zoom çalışır (1x–4x)
- [ ] Pan harita sınırında durur
- [ ] Tap → soru geliyor, pan ile karışmıyor
- [ ] İl renkleri oyuncu sahipliğini yansıtıyor
- [ ] Kale ili: parlak border + zoom ≥1.8x'te kale ikonu
- [ ] Zoom < 1.8x'te ikonlar gizleniyor
- [ ] iOS ve Android'de test edildi
- [ ] `npx tsc --noEmit` hata vermiyor
