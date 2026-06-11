# Tasarım Spec: Harita UX + Ana Ekran Görsel Polish

**Tarih:** 2026-06-11  
**Durum:** Tamamlandı

---

## Kapsam

Oyunu "gerçek bir oyun gibi" hissettirmeye yönelik iki bağımsız grup:

- **Grup A (Harita UX):** Province tooltip, border highlight, kenney.nl castle PNG
- **Grup B (Ana ekran):** Türkiye haritası arka planı, frosted-glass layout

---

## Tasarım Kararları

| Konu | Karar |
|---|---|
| Tooltip tetik | Long press = tooltip/highlight, kısa bas = aksiyon (değişmez) |
| Tooltip konumu | Haritanın alt kısmında absolute-positioned info bar |
| Border efekt | Amber glow stroke (stroke #F59E0B, strokeWidth 3) + diğerleri fillOpacity 0.35 |
| Castle icon | kenney.nl Strategy Pack PNG → assets/icons/castle.png |
| Home bg | TurkeyMapBackground (statik, ghost renk, pointerEvents none) |
| Home layout | Sol transparan, sağ frosted-glass card (bg-slate-800/60 rounded-2xl) |

---

## Değiştirilen Dosyalar

| Dosya | Değişim |
|---|---|
| `src/components/TurkeyMap.tsx` | username tip eklendi, long press, tooltip, highlight, castle PNG |
| `src/components/TurkeyMapBackground.tsx` | **Yeni** — statik harita arka planı |
| `src/app/index.tsx` | Background bileşeni, frosted-glass layout, text-4xl başlık |
| `src/app/game/[id].tsx` | username eklendi TurkeyMap players prop'una |

---

## Kapsam Dışı (Sonraki Sprint)

- Özel yetenekler
- Leaderboard
- Animasyonlu harita arka planı (V2)
