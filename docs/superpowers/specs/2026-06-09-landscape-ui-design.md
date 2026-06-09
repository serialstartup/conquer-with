# Landscape UI + Koyu Strateji Teması — Tasarım Spec

**Tarih:** 2026-06-09  
**Kapsam:** Home, Lobby Create, Lobby Join, Waiting Room, Results ekranları  
**Yönelim:** Landscape-only (app.json: `"orientation": "landscape"`)

---

## Amaç

Mevcut tüm menü/lobi/sonuç ekranları dikey (portrait) akış için tasarlanmış; landscape modda geniş ekranın ortasında dar bir sütun olarak görünüyor. Bu spec ekranları 2-sütunlu landscape-aware layout'a taşır ve tüm arayüze tutarlı bir "koyu strateji oyunu" görsel kimliği verir.

---

## Tasarım Sistemi

### Renk Paleti (Değişenler)

| Rol | Eski | Yeni |
|---|---|---|
| Ekran başlığı | `text-white` | `text-amber-400` |
| Ana buton arkaplan | `bg-blue-600` | `bg-amber-700` |
| Ana buton hover/aktif | — | `active:bg-amber-800` |
| Sol sütun arkaplan | — | `bg-slate-800/40` |
| Sol/sağ ayırıcı | — | `border-r border-slate-700` |

### Değişmeyen Elemanlar

- Arkaplan: `bg-slate-900`
- İkincil buton: `bg-slate-700`
- Giriş alanı: `bg-slate-800`
- Yardımcı metin: `text-slate-400`
- Oyuncu renkleri (seat 1-4): Mevcut mavi/kırmızı/yeşil/sarı korunur

### Layout Şablonu

Tüm ekranlar `flex-1 flex-row` kök container kullanır:

```
┌──────────────────────────────────────────────┐
│  Sol Sütun (flex-[2])  │  Sağ Sütun (flex-[3]) │
│  bg-slate-800/40       │  bg-slate-900          │
│  border-r border-slate-700                     │
│  px-8 justify-center   │  px-8 justify-center   │
└──────────────────────────────────────────────┘
```

Sol sütun: Başlık, branding, bağlam bilgisi.  
Sağ sütun: Form elemanları, liste, aksiyon butonları.

---

## Ekran Tasarımları

### 1. Home (`src/app/index.tsx`)

**Oran:** flex-[2] / flex-[3]

**Sol sütun:**
- `⚔ BİL VE FETHET` — `text-amber-400 text-3xl font-bold`
- Tagline: `text-slate-400 text-sm mt-1` — "Türkiye'yi fetheden kazanır"
- Mevcut kullanıcı adı gösterimi (giriş yapıldıysa): `text-slate-500 text-xs` alt kısımda

**Sağ sütun — Onboarding (kullanıcı adı yok):**
- `text-amber-400 text-base font-semibold` başlık: "Kullanıcı Adın"
- TextInput: mevcut stil korunur
- Devam Et butonu: `bg-amber-700`

**Sağ sütun — Authenticated:**
- "Oda Oluştur" butonu: `bg-amber-700 rounded-xl py-4`
- "Odaya Katıl" butonu: `bg-slate-700 rounded-xl py-4`
- Butonlar arası `gap-3`

---

### 2. Lobby Create (`src/app/lobby/create.tsx`)

**Oran:** flex-[2] / flex-[3]

**Sol sütun:**
- `← Geri` butonu üst köşe (`text-slate-400`)
- `Oda Oluştur` başlık: `text-amber-400 text-3xl font-bold`
- Alt açıklama: `text-slate-400 text-sm` — "Kaç oyuncuyla oynayacaksın?"

**Sağ sütun:**
- Oyuncu sayısı seçici: `flex-row gap-3` — 2, 3, 4 butonları
  - Seçili: `bg-amber-700 border border-amber-500`
  - Seçisiz: `bg-slate-700`
- `Odayı Oluştur` butonu: `bg-amber-700 rounded-xl py-4`

---

### 3. Lobby Join (`src/app/lobby/join.tsx`)

**Oran:** flex-[2] / flex-[3]

**Sol sütun:**
- `← Geri`
- `Odaya Katıl` başlık: `text-amber-400 text-3xl font-bold`
- Alt metin: `text-slate-400 text-sm` — "6 haneli oda kodunu gir"

**Sağ sütun:**
- Kod input: mevcut stil korunur (`bg-slate-800 text-white text-2xl font-bold tracking-widest`)
- `Katıl` butonu: `bg-amber-700 rounded-xl py-4`

---

### 4. Waiting Room (`src/app/room/[id].tsx`)

**Oran:** flex-[2] / flex-[3]

**Sol sütun:**
- `← Geri`
- `Bekleme Odası` başlık: `text-amber-400 text-2xl font-bold`
- Oda kodu: `text-blue-400 text-3xl font-bold tracking-widest`
- "Paylaş" etiketi: `text-slate-500 text-xs`

**Sağ sütun:**
- Oyuncu listesi: ScrollView, mevcut kart stili korunur
- Alt: `Oyunu Başlat` butonu (host) — `bg-amber-700` (etkin) / `bg-slate-700` (disabled)

---

### 5. Results (`src/app/results/[id].tsx`)

**Oran:** flex-[5] / flex-[5] (eşit)

**Sol sütun:**
- `SONUÇLAR` başlık: `text-amber-400 text-xl font-bold tracking-widest uppercase`
- Kazanan kartı: mevcut `bg-yellow-900/40 border-yellow-600` korunur, tam genişlikte sol sütunda
- Kazanan adı: `text-white text-2xl font-bold`
- İl sayısı: `text-yellow-300 text-lg`

**Sağ sütun:**
- Sıralama listesi: ScrollView içinde, mevcut kart stili korunur
- Alt: `Ana Menüye Dön` butonu — `bg-slate-700 rounded-xl py-3`

---

## Değişmeyen Ekranlar

- `game/[id].tsx` — zaten landscape-aware, üst satır + harita düzeni çalışıyor
- `game/[id]/battle.tsx` — önceki oturumda tamamen yeniden tasarlandı

---

## Uygulama Notları

- Tüm `pt-16` / `pt-12` üst padding'ler kaldırılır; 2-sütun layout içinde `justify-center` ile dikey ortalama yapılır
- iOS landscape'de status bar gizlenir; yatay `SafeAreaView` inset'leri için `px-safe` veya `edges={['left','right']}` yeterli
- NativeWind v4 `flex-[2]` / `flex-[3]` sözdizimi destekliyor (`flex: 2`, `flex: 3` inline style ile fallback)
- Buton `active:` state: NativeWind v4'te React Native Pressable üzerinde `active:bg-amber-800` çalışır; `TouchableOpacity` kullanılıyorsa `activeOpacity={0.8}` ile yönetilir

---

## Doğrulama

1. Her ekranda 2-sütunun görünür ve dengeli olduğunu kontrol et
2. Küçük tablet (iPad mini landscape) ve geniş telefon (iPhone 15 Plus landscape) simülatörde test et
3. Amber butonların `active:bg-amber-800` state'inin çalıştığını doğrula
4. Waiting room oyuncu listesinin sağ sütunda scroll ettiğini kontrol et
5. Results ekranında kazanan kartın sol sütuna sığdığını kontrol et
