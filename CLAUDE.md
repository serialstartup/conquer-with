@AGENTS.md

# Bil ve Fethet — Proje Rehberi

## Proje Nedir?

Türkiye haritasında 2-4 oyunculu gerçek zamanlı online strateji + trivia oyunu.
1990'ların klasik Türk kutu oyunundan ilham alındı.

- Oyuncular sırayla il seçer, soruyu doğru cevaplarsa ili alır
- Rakip ilin üzerine gidilirse savaş başlar (sıralı soru yarışması, askerler azalır)
- Kazanma: rakip ana kaleyi al **veya** süre dolunca en çok ili olan kazan

---

- Detaylı bilgiler için obsidian dosyasını oku:
  - '/Users/oguztasci/Desktop/secondBrain/application-ideas/09-bil-ve-fethet'
  - '/Users/oguztasci/Desktop/secondBrain/application-ideas/09-bil-ve-fethet/[en son tarih]'

  Whenever we change something or add new features, we will update our obsidian folder in:
  - '/Users/oguztasci/Desktop/secondBrain//application-ideas/09-bil-ve-fethet/[en son tarih]'

## Oturum Notu Protokolü

Her kod oturumunun sonunda Obsidian'a not kaydet:

- **Klasör:** `/Users/oguztasci/Desktop/secondBrain/application-ideas/09-bil-ve-fethet/`
- **Dosya:** `YYYY-MM-DD.md` (bugünün tarihi; varsa üzerine yaz)
- **İçerik:** yapılanlar, yapılacaklar, açık sorular

En son durum için o klasördeki en yeni tarih dosyasını oku.

---

## Supabase

- **Proje ID:** `vejmnevgoydayyopgmid`
- **Org:** Mobile Applications
- **Dashboard:** `https://supabase.com/dashboard/project/vejmnevgoydayyopgmid`
- **Auth Providers:** `…/auth/providers`
- **SQL Editor:** `…/sql`

Migration dosyaları: `supabase/migrations/`

### Tablolar

| Tablo          | Amaç                                                    |
| -------------- | ------------------------------------------------------- |
| `profiles`     | Kullanıcı adı, is_guest, games_played                   |
| `rooms`        | Oyun odası (6 haneli kod, max_players, status)          |
| `room_players` | Oyuncu → oda ilişkisi, seat, main_province_id           |
| `game_states`  | Aktif oyun durumu (provinces JSONB, mevcut tur)         |
| `game_events`  | Savaş sync event log                                    |
| `questions`    | Seed tablo (kullanılmıyor; sorular JSON'dan yükleniyor) |

Realtime: `game_states` ve `game_events` tablolarında aktif.

---

## Teknik Stack

| Katman         | Teknoloji                             |
| -------------- | ------------------------------------- |
| Framework      | Expo 56 + React Native 0.85           |
| Routing        | Expo Router (file-based)              |
| Stil           | NativeWind v4 + Tailwind CSS          |
| Backend        | Supabase (Auth, Realtime, PostgreSQL) |
| Dil            | TypeScript                            |
| Paket yönetici | npm                                   |

> **Önemli:** Expo API'si her versiyonda değişiyor. Kod yazmadan önce https://docs.expo.dev/versions/v56.0.0/ adresini oku.

---

## Mimari

```
src/
├── app/                    # Expo Router ekranları
│   ├── index.tsx           # Home — kullanıcı adı + oda butonları
│   ├── lobby/
│   │   ├── create.tsx      # Oda oluştur (max player seç)
│   │   └── join.tsx        # Odaya katıl (6 haneli kod)
│   ├── room/[id].tsx       # Bekleme odası — host oyunu başlatır
│   ├── game/
│   │   ├── [id].tsx        # Ana oyun tahtası
│   │   └── [id]/battle.tsx # Savaş ekranı (saldıran vs savunan)
│   └── results/[id].tsx    # Oyun sonu sıralama
│
├── components/
│   ├── ProvinceGrid.tsx    # 81 il grid'i (renkli, asker sayılı)
│   ├── QuestionCard.tsx    # Çoktan seçmeli soru kartı
│   └── PlayerStatus.tsx    # Oyuncu il sayısı + sıra göstergesi
│
├── hooks/
│   ├── useAuth.ts          # AuthContext + anonim sign-in
│   ├── useRoom.ts          # Oda oluşturma / katılma
│   ├── useGameState.ts     # Realtime game_states subscription
│   └── useGameTimer.ts     # Geri sayım sayacı
│
├── lib/
│   └── supabase.ts         # Supabase client (AsyncStorage persist)
│
├── types/
│   └── game.ts             # Oyun tipi tanımları
│
└── data/
    ├── provinces.json      # 81 il (id, name, region, difficulty 1-3)
    └── questions.json      # 200 soru (4 kategori × 50, zorluk 1-3)
```

---

## Oyun Akışı

```
Home → Create/Join Room → Waiting Room → Game Board
                                              ↓
                                     Claim / Reinforce / Battle
                                              ↓
                                         Battle Screen
                                              ↓
                                      Results (süre veya kale)
```

**Tur fazları:** `claim` (boş il) → `reinforce` (kendi ilin) → `battle` (düşman ilin)

**Savaş:** Saldıran 3 soru hakkı, savunan mevcut asker sayısı kadar. Doğru cevap rakip askeri azaltır. Sıfıra düşen taraf kaybeder.

---

## MVP Durumu (2026-06-04 itibarıyla)

Tüm fazlar tamamlandı (Faz 0-7, 11 commit):

- [x] Proje kurulumu, Supabase bağlantısı
- [x] DB schema (6 tablo, RLS, Realtime)
- [x] Auth (anonim giriş, kullanıcı adı)
- [x] Lobi sistemi (oda oluştur/katıl, gerçek zamanlı oyuncu listesi)
- [x] Oyun verisi (81 il, 200 soru)
- [x] Oyun döngüsü (tur sistemi, il seçimi, soru akışı)
- [x] Savaş sistemi
- [x] Oyun sonu (süre sayacı, sonuç ekranı)

**Bilinen eksikler / backlog:**

| Öncelik | İş                                      |
| ------- | --------------------------------------- |
| Orta    | `example/` dizini temizle (TS hataları) |
| Düşük   | SVG Türkiye haritası (V2)               |
| Düşük   | Sorular Supabase DB'ye taşı (V2)        |
| Düşük   | Özel yetenek sistemi (kart çal, joker)  |
| Düşük   | Liderboard + arkadaş sistemi            |
| Düşük   | Futbol soru kategorisi                  |

---

## Geliştirme Komutları

```bash
npx expo start          # Geliştirme sunucusu başlat
npx expo start --ios    # iOS simulator
npx expo start --android
```

Ortam değişkenleri için `.env` dosyası gerekli (`.env.example`'a bak):

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```
