# Kale İkonu — Tasarım Spec

**Tarih:** 2026-06-09  
**Kapsam:** `src/components/TurkeyMap.tsx` — tek dosya  
**Durum:** MVP (geçici — ilerleyen versiyonda kenney.nl veya benzer kaynak PNG ile değiştirilecek)

---

## Amaç

`assets/icons/castle.png` (66-byte placeholder) yerine react-native-svg primitive'leriyle çizilen amber renk kale silueti. Dış asset gerektirmez, zoom'da keskin, amber temaya uyumlu.

---

## Teknik Değişiklik

**Dosya:** `src/components/TurkeyMap.tsx`

Import değişimi:
```tsx
// Önce:
import Svg, { Path, Text as SvgText, Image as SvgImage } from 'react-native-svg';
// Sonra:
import Svg, { Path, Text as SvgText, G, Rect } from 'react-native-svg';
```

`SvgImage` bloğu yerine:
```tsx
const CASTLE_COLOR = "#F59E0B"; // amber-400

<G transform={`translate(${cx}, ${cy})`}>
  <Rect x={-7} y={-5} width={5} height={9} fill={CASTLE_COLOR} />
  <Rect x={2}  y={-5} width={5} height={9} fill={CASTLE_COLOR} />
  <Rect x={-4} y={-1} width={8} height={5} fill={CASTLE_COLOR} />
  <Rect x={-2} y={1}  width={4} height={3} fill="#0f172a"       />
  <Rect x={-7} y={-7} width={2} height={2} fill={CASTLE_COLOR} />
  <Rect x={-4} y={-7} width={2} height={2} fill={CASTLE_COLOR} />
  <Rect x={2}  y={-7} width={2} height={2} fill={CASTLE_COLOR} />
  <Rect x={5}  y={-7} width={2} height={2} fill={CASTLE_COLOR} />
</G>
```

---

## V2 Notu

Bu ikon MVP amaçlı bir geçici çözümdür. İlerleyen versiyonda:
- kenney.nl veya benzer kaynaktan kale PNG/SVG asset indirilecek
- `assets/icons/castle.png` gerçek dosyayla değiştirilecek
- `SvgImage href={require(...)}` yaklaşımına geri dönülecek

---

## Doğrulama

- Expo başlat, haritada zoom >= 1.8 yap
- Ana kale provincelerinde amber kale silueti görünmeli
- Zoom out'ta kaybolmalı (ICON_ZOOM_THRESHOLD = 1.8 korunur)
