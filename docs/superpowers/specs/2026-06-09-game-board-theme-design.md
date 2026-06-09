# Oyun Tahtası Görsel Tema — Tasarım Spec

**Tarih:** 2026-06-09  
**Kapsam:** TurkeyMap, PlayerStatus, room/[id].tsx, results/[id].tsx

---

## Amaç

Oyun tahtasına askerî/strateji görsel kimliği ver: koyu oyuncu renkleri, daha koyu boş iller, yumuşak border, sıra dışı soluklaştma, amber kale vurgusu.

---

## Renk Değişiklikleri

### Oyuncu Renkleri

| Seat | Eski hex | Yeni hex | Tailwind |
|---|---|---|---|
| 1 | `#2563EB` | `#1e40af` | `blue-800` |
| 2 | `#DC2626` | `#991b1b` | `red-800` |
| 3 | `#16A34A` | `#166534` | `green-800` |
| 4 | `#CA8A04` | `#854d0e` | `yellow-800` |

### Harita Sabitleri (TurkeyMap)

| Sabit | Eski | Yeni |
|---|---|---|
| `EMPTY_COLOR` | `#334155` | `#1e293b` |
| `BORDER_COLOR` | `#FFFFFF` | `#ffffff60` |
| `CASTLE_STROKE` | (beyaz) | `#F59E0B` |

### Sıra Dışı Soluklaştma

```tsx
const fillOpacity = isMyTurn ? 1 : 0.65;
// Path elemanına fillOpacity={fillOpacity} eklenir
```

### Kale Border

```tsx
stroke={castlePlayer ? '#F59E0B' : BORDER_COLOR}
strokeWidth={castlePlayer ? 2.5 : 1}
strokeOpacity={castlePlayer ? 1 : 0.7}
```

---

## Etkilenen Dosyalar

| Dosya | Değişim |
|---|---|
| `src/components/TurkeyMap.tsx` | PLAYER_COLORS, EMPTY_COLOR, BORDER_COLOR, fillOpacity, castle stroke |
| `src/components/PlayerStatus.tsx` | PLAYER_COLORS Tailwind sınıfları |
| `src/app/room/[id].tsx` | SEAT_COLORS Tailwind sınıfları |
| `src/app/results/[id].tsx` | SEAT_COLORS Tailwind sınıfları |

---

## Doğrulama

- Oyun tahtasında her oyuncunun koyu askerî renkte göründüğünü kontrol et
- Sıra karşı oyuncudayken iller soluklaşmalı, sıra sendeyken parlaklaşmalı
- Kale ilinin border'ı amber olmalı
- PlayerStatus, WaitingRoom ve Results sıra renkleriyle uyumlu olmalı
