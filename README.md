# Kira-Kira! — game matematik untuk kanak-kanak

Game math ringkas dalam BM dan English, dengan soalan ikut umur (4–6, 7–9, 10–12).
Satu codebase: main dalam browser untuk test, dan dibungkus jadi app Android guna Capacitor.

## Mula (web, untuk test dan debug)

Perlu Node.js 20 atau lebih baru.

```bash
npm install
npm run dev
```

Buka link yang keluar (contoh http://localhost:5173). Sebab ada `--host`, kau boleh buka juga
dari phone dalam WiFi yang sama guna link "Network" (contoh http://192.168.x.x:5173).

Tip debug:
- Tekan 1–4 pada keyboard untuk jawab soalan.
- Dalam Console (F12), semasa `npm run dev`:
  - `kiraKira.answer()` tunjuk jawapan soalan semasa
  - `kiraKira.setLevel(2)` lompat terus ke tahap 3 (0 = mudah, 2 = mencabar)
  - `kiraKira.sample('older', 'fraction', 2)` tengok 10 contoh soalan untuk mana-mana umur, topik, tahap
  - `kiraKira.state` tengok semua state game
- Chrome DevTools → Toggle device toolbar (Ctrl+Shift+M) untuk tengok saiz phone.
- `npm run test:questions` semak ribuan soalan secara automatik (jawapan betul, pilihan unik, tiada nombor negatif).

## Upload ke server untuk test

Zip projek ialah source code; browser tak boleh buka terus. Yang diupload ialah hasil build:

```bash
npm run build
```

Upload **isi** folder `dist/` (bukan folder dist itu sendiri) ke server, contohnya ke
`public_html/kira-kira/` di cPanel. Kemudian buka `https://domainkau.com/kira-kira/`.
Fail `upload-ke-server.zip` yang disertakan dah mengandungi folder `kira-kira/` siap untuk diupload.

- Boleh diletak di root domain atau mana-mana subfolder.
- Mesti dibuka melalui `http://` atau `https://`. Klik dua kali `index.html` dari komputer tak akan berfungsi.
- Di Chrome Android, menu ⋮ → "Add to Home screen" akan pasang game sebagai app dengan ikonnya sendiri.
- Pilihan hosting percuma: Netlify (drag & drop folder dist), Cloudflare Pages, GitHub Pages.

## Ikon dan grafik

- `public/`: favicon (`.ico` dan `.svg`), ikon Apple, ikon web app 192/512 dan versi maskable, serta `manifest.webmanifest`.
- `assets/`: sumber ikon dan splash untuk Android (dijana ke folder android/ oleh `npm run android:setup`).
- `store/`: grafik untuk Play Console: ikon 512×512 dan feature graphic 1024×500.

## Struktur

```
src/
  questions.js   penjana soalan ikut umur, topik dan tahap  ← tambah topik baru di sini
  i18n.js        semua teks BM dan English
  main.js        skrin, flow game, event
  style.css      rupa (blok mainan atas kertas petak)
  storage.js     simpan setting dan rekod dalam phone (localStorage)
  sound.js       bunyi (Web Audio, tiada fail audio)
  haptics.js     getaran (plugin Haptics dalam app, navigator.vibrate di browser)
scripts/test-questions.js
capacitor.config.json
```

## Android (Fasa 3)

### Cara paling cepat: install APK terus ke phone

1. Hantar `kira-kira-debug.apk` ke phone (WhatsApp ke diri sendiri, Google Drive, atau kabel USB).
2. Buka fail tu di phone. Android akan minta kebenaran "Install unknown apps" untuk app yang
   kau guna buka fail tu (contohnya Files atau Chrome). Benarkan, kemudian tekan Install.
3. Ikon Kira-Kira akan muncul di launcher.

APK debug ni hanya untuk test. Play Store perlukan fail `.aab` yang ditandatangani (Fasa 4).

### Build sendiri dengan Android Studio

Perlu Android Studio (versi terbaru) dan Node.js 20+.

```bash
npm install
npm run android:setup   # build web, jana ikon/splash, kunci potret, sync ke Android
npm run android:open    # buka dalam Android Studio, tekan Run (▶) untuk phone/emulator
```

Selepas ubah kod web, cukup jalankan `npm run android:sync` dan tekan Run semula.
Kalau phone disambung dengan USB (USB debugging hidup), `npm run android:run` terus pasang ke phone.

### Debug app Android dari komputer

Sambung phone dengan USB, buka Chrome di komputer dan pergi ke `chrome://inspect`.
App Kira-Kira akan tersenarai; tekan "inspect" untuk dapat DevTools penuh (Console, Elements)
sama macam dalam browser. Ini hanya berfungsi untuk build debug.

### Tukar appId (buat sebelum Fasa 4)

`appId` dalam `capacitor.config.json` masih `com.contoh.kirakira`. Tukar kepada ID unik kau
(contoh `com.namakau.kirakira`), kemudian:

```bash
rm -rf android
npm run android:setup
```

Skrip setup akan cipta semula folder android/ dengan semua tetapan (ikon, splash, potret, versi).
Nota: appId tak boleh ditukar lagi selepas app diterbitkan di Play Store.

### Tetapan Android yang dah dibuat

- Ikon adaptif (empat blok + − × ÷) dan splash screen, dijana dari folder `assets/`.
  Nak tukar ikon? Ganti PNG dalam `assets/` dan jalankan `npm run android:setup`.
- Orientasi dikunci potret.
- Butang back Android: undur satu skrin; dalam game minta pengesahan; di menu utama app diminimize.
- Bunyi berhenti bila app ke background.
- Getaran guna plugin `@capacitor/haptics`.
- Edge-to-edge: kandungan tak terlindung oleh status bar atau butang navigasi.
- Versi app ikut `version` dalam package.json (0.3.0 → versionCode 300). Naikkan versi setiap kali upload ke Play Store.
- Target Android 16 (API 36), minimum Android 7 (API 24).

## Cara game berfungsi

- Tahap susah (1–3) berubah sendiri: 3 betul berturut-turut naik tahap, 2 salah berturut-turut turun tahap
  (turun secara senyap supaya budak tak kecewa). Tahap terakhir diingat untuk setiap topik.
- Tiada emoji: semua ikon dan bentuk (bulatan, bintang, segi empat, segi tiga) dilukis sebagai SVG,
  jadi rupa sama di semua phone. `npm run test:questions` juga semak tiada emoji dalam soalan.
- Bunyi: sound effect sahaja (tekan, betul, salah, naik tahap, 3 bintang), dijana guna Web Audio.
- Semua data (bintang, tahap, ketepatan) disimpan dalam phone sahaja. Boleh dipadam di skrin Tetapan.
- Font Baloo 2 dibundle dalam app, jadi game berfungsi tanpa internet.

## Benda yang masih perlu (Fasa 4)

- Tukar appId (lihat atas).
- Kunci tandatangan (upload key) dan build `.aab` untuk release.
- Privacy policy, borang Families Policy, dan senarai kedai (screenshot, penerangan) di Play Console.
- Closed testing dengan tester sebelum production (untuk akaun developer personal yang baru).
