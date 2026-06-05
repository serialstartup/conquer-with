# Türkiye SVG Harita — Tasarım Dokümanı

**Tarih:** 2026-06-05
**Durum:** Onaylandı

---

## Bağlam

MVP'de il seçimi `ProvinceGrid` bileşeniyle flex-wrap buton listesi olarak yapılıyor. Gerçek Türkiye haritasına geçiş hem görsel kaliteyi hem oyun hissini köklü biçimde iyileştirecek. Bu doküman, `react-native-svg` + GeoJSON tabanlı interaktif haritanın tam tasarımını kapsar.

---

## Mimari Özet

```
GameScreen
└── TurkeyMap  (ProvinceGrid'in yerini alır, aynı props arayüzü)
    ├── GestureDetector  (PinchGesture + PanGesture — Simultaneous)
    │   └── Animated.View  (scale + translateX/Y)
    │       └── Svg (viewBox="0 0 800 480")
    │           ├── <Path> × 81       (il sınırı + fill rengi)
    │           └── <Image>/<Text> × 81  (kale PNG veya asker sayısı)
```

**Sıfır yeni bağımlılık** — `react-native-svg`, `react-native-gesture-handler`, `react-native-reanimated` Expo 56'da mevcut.

---

## 1. Veri Katmanı

### GeoJSON Kaynağı
- **Kaynak:** cihadturhan/tr-geojson (MIT lisanslı)
- 81 il poligon sınırı içeriyor

### Build-time Dönüşüm
Tek seferlik Node.js scripti GeoJSON'ı SVG path string'lerine çevirir:

```
scripts/generate-province-paths.js
  Input : tr-geojson/provinces.geojson
  Output: src/data/provinces-paths.json
```

Çıktı formatı:
```json
{
  "0": { "path": "M 234 156 L ...", "centroid": [240, 160] },
  "1": { "path": "M ...", "centroid": [310, 200] }
}
```

- `path`: SVG `<Path d={...}>` için string
- `centroid`: il merkezi — ikon/metin buraya yerleşir

### Projeksiyon
Plate Carrée (doğrusal ölçek). Türkiye bounding box:
- Boylam: 25.7°E → 44.8°E  ↦  x: 0 → 800
- Enlem: 42.1°N → 35.8°N   ↦  y: 0 → 480 (ters — SVG y aşağı)

### Province ID Eşleştirme
`provinces.json` ID 0–80 ile GeoJSON plaka numarası 1–81 arasında isim bazlı eşleştirme script içinde yapılır. Eşleşmeyen il varsa script hata verir (sessiz başarısızlık yok).

### Harita-Agnostik Tasarım
Pipeline kasıtlı olarak haritaya özgü değil. İleriki genişleme:
- `scripts/generate-province-paths.js --source usa --output src/data/usa-paths.json`
- Aynı bileşen farklı paths dosyasını alır

Önerilen GeoJSON kaynakları:
- **Dünya ülkeleri:** naturalearthdata.com
- **USA eyaletleri:** census.gov
- **Herhangi ülke:** gadm.org

---

## 2. Bileşen Mimarisi

### Yeni Dosyalar
| Dosya | Açıklama |
|---|---|
| `src/components/TurkeyMap.tsx` | Ana harita bileşeni |
| `src/data/provinces-paths.json` | Script çıktısı (generated) |
| `scripts/generate-province-paths.js` | Tek seferlik dönüşüm scripti |
| `assets/icons/castle.png` | Kale ikonu (Kenney.nl'den) |

### Props Arayüzü
`ProvinceGrid` ile birebir aynı — `GameScreen` başka hiçbir yerde değişmez:

```typescript
type Props = {
  provinces: Provinces;
  provinceData: Province[];
  players: PlayerInfo[];
  currentUserId: string;
  currentTurnId: string;
  onProvincePress: (provinceId: number) => void;
  disabled?: boolean;
};
```

### GameScreen Değişikliği
```tsx
// Tek değişiklik: import + bileşen adı
import { TurkeyMap } from "@/components/TurkeyMap";
// <ProvinceGrid ... />  →  <TurkeyMap ... />
```

`ProvinceGrid` stabil olana kadar silinmez, `TurkeyMap` yerleşince kaldırılır.

---

## 3. Zoom/Pan Etkileşimi

### Kütüphaneler
- `react-native-gesture-handler`: `PinchGesture` + `PanGesture`
- `react-native-reanimated`: `useSharedValue`, `useAnimatedStyle`

### Davranış
| Özellik | Değer |
|---|---|
| Min zoom | Ekrana tam sığan ölçek (~1x) |
| Max zoom | 4x |
| Başlangıç | Harita ekran genişliğine otomatik fit |
| Pan sınırı | Harita ekran dışına çıkamaz |

### Tap / Pan Ayrımı
Pan gesture `minDistance: 5px` eşiği gerektirir:
- Parmak yerinde kalkınca → **tap** (il seç)
- Parmak 5px+ kayınca → **pan** (haritayı kaydır)

### Gesture Kompozisyonu
```typescript
const gesture = Gesture.Simultaneous(pinchGesture, panGesture);
```

---

## 4. İl Görünümü

### Renkler
| Durum | Renk | Hex |
|---|---|---|
| Boş il | Koyu gri | `#334155` |
| Oyuncu 1 | Mavi | `#2563EB` |
| Oyuncu 2 | Kırmızı | `#DC2626` |
| Oyuncu 3 | Yeşil | `#16A34A` |
| Oyuncu 4 | Sarı | `#CA8A04` |

### İl Sınırları
- Normal il: 0.5px beyaz stroke
- Kale ili: 2px oyuncu renginin açık tonu (parlak border)

### İkon/Metin Gösterimi
Zoom < 1.8x → ikonlar gizli (kalabalık önlenir)
Zoom ≥ 1.8x → fade-in:

| İl tipi | Gösterim |
|---|---|
| Kale ili | 18×18px kale PNG (`<SvgImage>`) — merkeze |
| Sahiplenilmiş il | asker sayısı `<SvgText>` — küçük, merkeze |
| Boş il | Hiçbir şey |

### Crusader Asset (İleride)
`isometric_Mini-Crusader` paketi (8 animasyon: idle, walk, run, attack, block, got-hit, jump, death) şu an kullanılmıyor. "Bizzat savaş" özelliği için saklanır. Animasyon yaklaşımı: `setInterval` ile frame index artışı, `<Image source={frames[frameIndex]}>` — ekstra kütüphane gereksiz.

---

## 5. Uygulama Sırası

1. `scripts/generate-province-paths.js` yaz ve çalıştır → `provinces-paths.json` üret
2. `assets/icons/castle.png` Kenney.nl'den ekle
3. `TurkeyMap.tsx` — SVG render (önce zoom/pan olmadan, statik)
4. Zoom/pan gesture ekle
5. İkon/metin overlay ekle (zoom threshold ile)
6. `GameScreen`'de import değiştir
7. Fiziksel cihazda test: zoom/pan + il tıklama + doğru renk

---

## Doğrulama Kriterleri

- [ ] Tüm 81 il haritada görünür, sınırlar doğru
- [ ] Pinch zoom çalışır (1x–4x arası)
- [ ] Pan harita sınırında durur, ekran dışına çıkmaz
- [ ] Tap ile il seçimi çalışır, pan ile karışmaz
- [ ] İl renkleri oyuncu sahipliğini doğru yansıtır
- [ ] Kale ili parlak border + kale ikonu gösterir
- [ ] Zoom < 1.8x'te ikonlar gizlenir
- [ ] iOS ve Android'de test edildi
