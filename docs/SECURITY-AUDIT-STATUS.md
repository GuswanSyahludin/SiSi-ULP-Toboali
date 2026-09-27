# SiSi ULP Toboali: Audit dan Status Remediasi (Sumber Tunggal)

_Terakhir diperbarui: 27 September 2026 · Basis kode yang diperiksa: `main` @ `7abd88e` · T-02 (H-01) completed 27 Sep 2026_

File ini adalah **satu-satunya** tempat mencatat temuan audit, status perbaikan, dan task remediasi SiSi. Jangan membuat file audit terpisah; tambahkan temuan baru ke Bagian 3 dan task-nya ke Bagian 5.

File ini menggabungkan:

- Status audit lama (Stage 0 sampai Stage 5 Task 3) dan backlog Stage 5.
- Audit menyeluruh frontend + backend, web + mobile, 26 September 2026.
- Verifikasi ulang manual terhadap kode, 27 September 2026 (termasuk regresi PR #3).
- Item validasi yang masih terbuka di `docs/LOCAL-WATERMARK.md` dan `docs/YANDAL-PHOTO-INTEGRATION.md`.
- `flutter-audit.txt` (sebagian sudah kedaluwarsa, lihat L-01).

Persyaratan produk tetap di `docs/PRD.md`. Setiap temuan di sini dipetakan ke FR di PRD bila relevan.

> **Catatan penomoran PR.** PR yang disebut di Stage 0 sampai 5 berasal dari repo lama `SyahludinGuswan/Sisi-ULP-Toboali`. PR #1 dan seterusnya di repo `GuswanSyahludin/SiSi-ULP-Toboali` memakai nomor baru. Contoh: "PR #3" di Stage 1 (repo lama) berbeda dengan PR #3 route mobile (repo baru).

---

## 1. Cara membaca status

| Tanda | Arti |
| --- | --- |
| ✅ | Selesai dan ter-merge |
| 🔴 | Terbuka, **terverifikasi**: dibaca langsung dari kode di `7abd88e` |
| 🟡 | Terbuka, **perlu verifikasi**: dilaporkan audit otomatis 26 Sep 2026, belum dicek baris per baris |
| ⚪ | Kedaluwarsa atau tidak berlaku lagi |

Estimasi effort adalah perkiraan kasar dari audit, bukan komitmen.

## 2. Ringkasan eksekutif

Stage 0 sampai Stage 5 Task 3 sudah selesai. Audit menyeluruh 26 Sep 2026 dan verifikasi ulang 27 Sep 2026 menemukan temuan terbuka berikut:

| Severity | Jumlah | Terverifikasi | Perlu verifikasi | Selesai |
| --- | --- | --- | --- | --- |
| Kritis | 5 | 3 | 2 | 0 |
| Tinggi | 8 | 5 | 3 | 0 (H-01 dalam proses) |
| Sedang | 8 | 5 | 3 | 0 |
| Rendah | 5 | 2 | 3 | 0 |

Prioritas absolut: **C-01** (regresi PR #3 yang menghapus edit Master Gardu secara diam-diam). Perbaikannya ada di PR #4 repo baru dan harus di-merge serta di-deploy sebelum pekerjaan lain.

---

## 3. Temuan terbuka

### 3.1 Kritis

#### C-01 🔴 Regresi PR #3: upload edit Master Gardu dari APK hilang diam-diam

- **Area:** Backend mobile sync
- **Lokasi:** `SiSi_BackEnd/Core/ZZZZZZZZZZZZZZZZZZ-Mobile-Master-Sync-Route.js`, `SiSi_Mobile/lib/db/repositories/gardu_sync_repository.dart`
- **Masalah:** Wrapper PR #3 mencegat semua action `getMasterGarduMobile` dan memanggil gateway download. APK memakai action yang sama dengan `mode: "update"` untuk upload edit Gardu. Gateway mengembalikan `success: true` tanpa menulis, lalu APK menghapus antrean outbox. Edit hilang tanpa jejak.
- **Melanggar:** FR-06, FR-07.
- **Perbaikan:** Teruskan `mode === "update"` ke `updateMasterGarduMobile` (PR #4 repo baru). Setelah deploy, periksa edit Gardu yang dikirim selama build PR #3 aktif.
- **Effort:** 1 jam + verifikasi lapangan.

#### C-02 🔴 Snapshot delta sync tidak memfilter data per ULP dan mengirim metadata seluruh pengguna

- **Area:** Backend mobile sync
- **Lokasi:** `SiSi_BackEnd/Core/Delta-Sync-Mobile.js` (`_deltaSnapshotCreate_`, `_deltaManifest_`, `_deltaRows_`)
- **Masalah:** `getMasterGarduMobile` sudah memanggil `guard_` (wajib login), tetapi tanpa `ulp: true`. `_deltaSnapshotCreate_` dan `_deltaManifest_` hanya memanggil `getSesiByToken`. `_deltaRows_` membaca seluruh sheet tanpa filter ULP untuk semua dataset kecuali `Master_Gardu`. Dataset `db_Users` hanya mengosongkan kolom password; email, role, ULP, tim, dan akses menu semua pengguna tetap terkirim ke setiap perangkat.
- **Melanggar:** FR-02, FR-03.
- **Perbaikan:** `guard_(..., { ulp: true })` di pembuatan snapshot dan manifest; filter baris per ULP (langsung atau via `ulpDariKodeHeader_`); keluarkan `db_Users` dari dataset mobile atau kirim kolom minimum saja.
- **Effort:** 16 sampai 32 jam.

#### C-03 🔴 Token sesi web dikirim lewat URL

- **Area:** Frontend web
- **Lokasi:** `SiSi_BackEnd/Core/login-page.html` (`scriptUrl + "?token=" + res.token`), `Main.html`
- **Masalah:** Setelah login, browser diarahkan ke URL berisi token bearer. Token masuk riwayat browser, log, header referrer, screenshot, dan link yang dibagikan.
- **Melanggar:** FR-04 dan persyaratan "Tokens are not accepted through insecure query-string contracts".
- **Perbaikan:** Bootstrap sesi tanpa query string (token tetap di `sessionStorage`, halaman utama memintanya lewat `google.script.run`); hapus pembacaan token dari query string setelah migrasi.
- **Effort:** 12 sampai 20 jam.

#### C-04 🟡 Fungsi top-level Apps Script tanpa guard internal

- **Area:** Backend web + mobile
- **Lokasi:** `SiSi_BackEnd/appsscript.json` (terverifikasi: `executeAs: USER_DEPLOYING`, `access: ANYONE_ANONYMOUS`), `Teknik/Jadwal-Padam-Code.js`, `Teknik/Tek-LapUP3UIWHarian.js`
- **Masalah:** Semua fungsi top-level dapat dipanggil langsung lewat `google.script.run` (didokumentasikan sendiri di header `Guard.js`). Audit otomatis melaporkan fungsi tanpa guard internal: `getJadwalPadamMaster`, `getJadwalPadamList`, `getJadwalPadamCalendarMonth`, `getJadwalPadamMasterBeban`, `getLaporanUP3`, `getLaporanWilayah`, `getLaporanHarianRow`, `simpanLaporanHarianWeb`, `refreshLaporanHarian`, `getMobileLaporanUp3Uiw`. Daftar fungsi belum diverifikasi manual.
- **Melanggar:** FR-01, FR-05.
- **Perbaikan:** Verifikasi tiap fungsi; tambahkan `guard_(arguments, { ulp: true, ... })` sebagai statement pertama; perluas Audit Gate agar gagal bila fungsi publik baru tidak memanggil `guard_`.
- **Effort:** 24 sampai 40 jam.

#### C-05 🟡 Materialisasi Master Gardu menghapus data lokal sebelum mengisi ulang

- **Area:** Frontend mobile (data lokal)
- **Lokasi:** `local_master_materializer.dart`, `master_gardu_dao.dart` (`gantiSemua`), `sync_repository.dart`
- **Masalah:** Dilaporkan: `gantiSemua()` menjalankan `delete(masterGardus)` lalu insert ulang tanpa menerapkan ulang patch outbox yang belum terkirim; `sinkronModul()` dapat mematerialisasi master sebelum outbox Gardu dikirim.
- **Melanggar:** FR-06, FR-07.
- **Perbaikan:** Kirim outbox dulu, lalu merge via staging; atau terapkan ulang semua patch pending setelah download. Jangan hapus baris live secara langsung.
- **Effort:** 20 sampai 32 jam.

### 3.2 Tinggi

#### H-01 ✅ Router perangkat menolak token dari query string

- **Lokasi:** `Core/Auth-Perangkat.js` (`authPerangkatRouter_`)
- **Masalah (sebelumnya):** `cekPerangkat`, `logoutPerangkat`, `daftarPerangkat`, `cabutPerangkat`, dan download `getMasterGarduMobile` jatuh ke `e.parameter` (query string) bila body kosong. Token bisa leak ke riwayat browser, log, referrer, screenshot.
- **Perbaikan (PR #6):** Hanya terima parameter dari JSON POST body, jangan dari query string. Setiap fungsi sanitasi dengan `.trim()`.
- **Status:** Merged 27 Sep 2026 (commit `38279b2`). CI green: Flutter, syntax, security, wiring.
- **Effort:** 4-8 jam (actual: selesai).

#### H-02 🔴 Akar masalah gagal download Data Master perlu dikoreksi

- **Lokasi:** `Core/Auth-Perangkat.js`, `Core/Delta-Sync-Mobile.js`, `delta_sync_repository.dart`
- **Masalah:** PR #3 berasumsi `getMasterGarduMobile` tidak punya route. Faktanya `AUTH_PERANGKAT_ACTIONS` sudah memuat action itu (header file mewajibkan router ini dipasang di `apiRouter_`). Pesan di APK "Respons server untuk sinkronisasi tidak valid" muncul saat respons **bukan JSON** (misalnya halaman error Apps Script), bukan saat action tidak dikenal. Dugaan kuat: `snapshotCreate` membangun hingga 24 dataset dalam satu eksekusi dan melewati batas eksekusi Apps Script (klien menunggu 330 detik). Ini cocok dengan gejala "perlu beberapa kali download baru berhasil".
- **Perbaikan:** Periksa log eksekusi Apps Script saat gagal; verifikasi `authPerangkatRouter_` terpasang di `apiRouter_`; pecah `snapshotCreate` per dataset atau per batch agar tiap eksekusi jauh di bawah batas waktu. Setelah terbukti, pertimbangkan menghapus route PR #3 karena duplikat.
- **Effort:** 8 sampai 16 jam.

#### H-03 🟡 `simpanMobileEksekusiRow` tanpa guard, validasi, sanitasi, dan lock

- **Lokasi:** `Core/Code.js`
- **Masalah:** Dilaporkan hanya memanggil `getSesiByToken`; input ditulis langsung ke sheet tanpa `safeCell_`; `targetRow = getLastRow() + 1` tanpa `withLock_` sehingga dua request paralel bisa menimpa baris yang sama.
- **Perbaikan:** `guard_(arguments, { ulp: true })`, validasi skema dan rentang koordinat, `safeRow_`, bungkus generate kode + append dalam `withLock_`, tambahkan idempotency key.
- **Effort:** 12 sampai 24 jam.

#### H-04 🟡 Jadwal Padam: ULP dari klien dan pengecekan kepemilikan tidak konsisten

- **Lokasi:** `Core/Jadwal-Padam-Mobile.js`, `Teknik/Jadwal-Padam-Code.js`
- **Masalah:** Dilaporkan router hanya mengisi `params.ulp` bila kosong; `updateJadwalPadam` dan `updateStatusJadwalPadam` mencari kode jadwal global tanpa cek ULP baris.
- **Perbaikan:** Pakai `ulpScope_(g, diminta)`; resolve baris lalu `barisUlpCocok_` sebelum baca atau ubah.
- **Effort:** 10 sampai 18 jam.

#### H-05 🟡 Tidak ada deteksi konflik untuk edit Master Gardu

- **Lokasi:** `master_gardu_repository.dart`, `gardu_outbox.dart`, `master_gardu_dao.dart`, `Core/Master-Gardu-Sync-Mobile.js`
- **Masalah:** Dilaporkan outbox hanya menyimpan patch terakhir tanpa revisi dasar; backend tidak memeriksa revisi. Dua perangkat yang mengedit gardu sama berakhir last-write-wins.
- **Perbaikan:** Tambahkan `serverRevision`, tolak update dengan revisi usang, tampilkan status konflik di UI.
- **Effort:** 24 sampai 40 jam.

#### H-06 🔴 Token perangkat tanpa masa berlaku absolut

- **Lokasi:** `Core/Auth-Perangkat.js`, `SiSi_Mobile/lib/services/sesi_store.dart`
- **Masalah:** Header file menyebut "sesi perangkat tanpa batas waktu". Token hanya dicabut saat logout, password berubah, atau dicabut admin. `bersihkanPerangkatTerlantar` (default 365 hari) harus dijalankan manual.
- **Perbaikan:** TTL absolut dan idle TTL; jadwalkan pembersihan; rotasi token saat `cekPerangkat`.
- **Effort:** 16 sampai 24 jam.

#### H-07 🔴 Foto hasil watermark dibuat publik

- **Lokasi:** `Yandal/Tek-Watermark.js` (`makePublic: true`), jalur upload ROW/mobile di `Code.js` (dilaporkan `ANYONE_WITH_LINK`)
- **Masalah:** Foto memuat koordinat, waktu, ULP, tim, dan data aset, dan siapa pun yang punya link bisa membukanya. Catatan: `engines/README.md` menyatakan engine deprecated, tetapi backend masih memanggil `wm-engine` di Cloud Run.
- **Perbaikan:** Default privat; akses lewat endpoint terautentikasi atau ACL per ULP; rencanakan migrasi engine sesuai README.
- **Effort:** 16 sampai 28 jam.

#### H-08 🔴 Password plaintext diterima tanpa batas waktu

- **Lokasi:** `Core/Guard.js` (`_verifyPw_`: "Keduanya hidup berdampingan selamanya")
- **Masalah:** Akun yang tidak pernah login tetap menyimpan password plaintext di `db_Users`.
- **Perbaikan:** Jalankan migrasi massal, ukur sisa akun plaintext, tetapkan tanggal cutover, lalu tolak plaintext.
- **Effort:** 8 sampai 16 jam.

### 3.3 Sedang

#### M-01 🔴 Baris tanpa ULP terlihat oleh semua ULP

- **Lokasi:** `Core/Guard.js` (`TAMPILKAN_BARIS_TANPA_ULP = true`, `barisUlpCocok_`)
- **Perbaikan:** Isi ULP semua baris lama, lalu ubah flag ke `false`.
- **Effort:** 4 sampai 8 jam setelah migrasi data.

#### M-02 🔴 Throttle login hanya per username

- **Lokasi:** `Core/Guard.js` (`loginThrottleGagal_`)
- **Masalah:** Penyerang bisa mencoba banyak username tanpa batas, dan juga bisa sengaja mengunci akun korban (20 kali gagal = terkunci 24 jam).
- **Perbaikan:** Tambahkan batas per perangkat/klien; pertimbangkan jalur buka kunci oleh Super User.
- **Effort:** 8 sampai 16 jam.

#### M-03 🟡 Enumerasi username saat login

- **Lokasi:** `Core/Code.js` (`doLogin`)
- **Status:** `verifikasiLogin_` dan `loginPerangkat` sudah memakai pesan generik (terverifikasi). Audit melaporkan `doLogin` masih membedakan "Username tidak ditemukan"; perlu dicek.
- **Effort:** 1 sampai 2 jam.

#### M-04 🔴 CDN tanpa SRI dan tanpa CSP

- **Lokasi:** `login-page.html` (Font Awesome, terverifikasi), `Main.html`, `Tek-Dashboard.html` dan halaman HTML lain (perlu dicek)
- **Perbaikan:** Tambahkan `integrity` + `crossorigin`, atau host aset sendiri.
- **Effort:** 6 sampai 12 jam.

#### M-05 🟡 Permukaan XSS dari `innerHTML` dan `onclick` inline

- **Lokasi:** `Main.html`, `Tek-Dashboard.html`
- **Masalah:** Dilaporkan `_tdEsc()` tidak meng-escape apostrof, padahal hasilnya dipasang di atribut JS bertanda kutip tunggal (contoh `calEditJadwal('...')`)
- **Effort:** 12 sampai 20 jam.

#### M-06 🔴 Anti-replay webhook AppSheet belum ditegakkan

- **Lokasi:** `Core/Guard.js` (`WEBHOOK_TS_MODE_DEFAULT = "warn"`)
- **Perbaikan:** Pastikan bot AppSheet mengirim `ts`, lalu set Script Property `SISI_WEBHOOK_TS_MODE=enforce`.
- **Effort:** 2 sampai 4 jam.

#### M-07 🔴 Foto asli Yandal belum disalin ke penyimpanan privat aplikasi

- **Lokasi:** `docs/YANDAL-PHOTO-INTEGRATION.md` ("Durable app-private copies and outbox/file lifecycle management remain pending")
- **Masalah:** Path asli masih dari cache ImagePicker; bisa hilang saat cache dibersihkan.
- **Melanggar:** FR-07.
- **Perbaikan:** Salin foto ke direktori privat per akun saat capture dan catat di outbox yang sama.
- **Effort:** 8 sampai 16 jam.

#### M-08 🟡 Utang kualitas kode Flutter

- **Lokasi:** laporan analyzer lama (`flutter-audit.txt`, 102 issue level info)
- **Masalah:** `withOpacity` deprecated, `value` pada form field (ganti `initialValue`), `WillPopScope`, `BuildContext` lintas async gap, `const`, kurung kurawal. Angka persis perlu dihitung ulang dari `flutter analyze` terbaru.
- **Effort:** 16 sampai 32 jam.

### 3.4 Rendah

#### L-01 🔴 `flutter-audit.txt` kedaluwarsa

- **Masalah:** Melaporkan error kompilasi `Undefined name 'Number'` di `jadwal_padam_screen.dart:327`. Kode di `main` sudah memakai `num.tryParse` dan CI Flutter hijau. Laporan lama ini sempat menghasilkan temuan "build gagal" yang keliru (⚪ untuk temuan itu).
- **Perbaikan:** Hapus file dari repo, atau hasilkan ulang otomatis di CI sebagai artefak.
- **Effort:** 0,5 jam.

#### L-02 🟡 URL deployment API hardcoded di APK

- **Lokasi:** `SiSi_Mobile/lib/services/api_service.dart`
- **Perbaikan:** Pakai `--dart-define` per flavor (staging/produksi).
- **Effort:** 2 sampai 6 jam.

#### L-03 🟡 Folder `engines/` deprecated tetapi masih dipakai

- **Masalah:** Backend masih memanggil `wm-engine`. Guard biaya engine disimpan per instance di `/tmp` dan endpoint `/guard/status` membuka konfigurasi budget.
- **Perbaikan:** Selesaikan migrasi ke layanan eksternal sesuai `engines/README.md`, lalu hapus folder.
- **Effort:** tergantung migrasi.

#### L-04 🔴 Dokumentasi dan konfigurasi usang

- **Masalah:** PRD menunjuk repo lama (diperbaiki di commit ini); `SiSi_Mobile/README.md` masih template "coba_sisi"; `GUARD_DEBUG = true` di `Guard.js` mencatat setiap pemanggilan internal.
- **Effort:** 1 sampai 2 jam.

#### L-05 🟡 Artefak debug ter-commit

- **Lokasi:** `.github/mobile-fix-error.log`, `SiSi_Mobile/snapshot-ci-debug.txt`, `SiSi_BackEnd/PREDEPLOY_AUDIT_PASSED.txt`, file `*_TRIGGER.txt`
- **Perbaikan:** Tinjau isinya (pastikan tidak ada token atau data pribadi), lalu hapus atau pindahkan ke artefak CI.
- **Effort:** 1 jam.

---

## 4. Riwayat remediasi (selesai)

| Stage | Cakupan | Status | Bukti (repo lama) |
| --- | --- | --- | --- |
| 0 | P0 Audit Gate: static gate fail-closed, CI wajib, regression test, wrapper late-loaded untuk boundary BA/mobile | ✅ | PR #6 |
| 1 | Atomicity BA: nomor BA + append memakai script lock 30 detik; gagal lock mencegah tulis | ✅ | PR #3 |
| 2 | Otorisasi same-ULP untuk list, download, PDF, upload final, sync Master Gardu BA | ✅ (boundary yang dicakup) | PR #4 |
| 3 | Kepemilikan baris BA: tepat satu baris `idBA`, file harus ada di baris itu, fallback Drive dihapus | ✅ | PR #7 |
| 4 | Hardening tulis sheet (`safeCell_`) untuk BA dan sync Master Gardu; harness urutan loader produksi | ✅ (cakupan merge) | PR #9, `6846a06` |
| 5.1 | Database lokal per akun, karantina `sisi_db` lama + sidecar, worker basi ditolak | ✅ + real-device | PR #10, `84d1b51` |
| 5.2 | Hapus fallback auth lama; hanya `loginPerangkat`/`cekPerangkat`/`logoutPerangkat` | ✅ | PR #11, `4269d3a` |
| 5.3 | Sesi dan token perangkat di secure storage; migrasi sekali jalan dengan token cocok; purge plaintext | ✅ | PR #12, `38aa8d5`; PR #13 `b27bc10` |

Perbaikan di repo baru:

| PR | Cakupan | Status |
| --- | --- | --- |
| #1, #2 | Ikon hapus Jadwal Padam di Dashboard Teknik (loader final deterministik) | ✅ merge `b0054fd`, deploy @217, terverifikasi di perangkat |
| #3 | Route `getMasterGarduMobile` | ⚠️ merge `7abd88e`, **menyebabkan C-01**; akar masalah perlu dikoreksi (H-02) |
| #4 | Hotfix C-01 | ✅ merge `df068da` |
| #5 | Docs consolidation | ✅ merge `df068da` |
| #6 | Fix H-01: reject auth tokens from query string | ✅ merge `38279b2`, CI green, real-device ready |

---

## 5. Rencana perbaikan dan task

Centang task saat PR-nya ter-merge dan bukti runtime tercatat. Task yang sama dilacak di ClickUp (list Project 1).

### Fase 0: Darurat

- [ ] **T-00** (C-01) Merge PR #4, `clasp push`, deployment baru. Cek edit Master Gardu yang dikirim selama build PR #3 aktif; minta input ulang yang hilang. _Selesai bila:_ edit gardu offline di perangkat nyata muncul di sheet `Master_Gardu`.

### Fase 1: Kritis (minggu ini)

- [ ] **T-01** (C-03) Hapus token dari URL login web. _Selesai bila:_ tidak ada `?token=` di riwayat browser setelah login, dan check CI token-query mencakup halaman web.
- [x] **T-02** (H-01) Tolak token dari query string di `authPerangkatRouter_` dan route PR #3. _Selesai bila:_ request dengan token di query ditolak dan dites di CI. **DONE: PR #6 merged 38279b2**
- [ ] **T-03** (C-02) Scoping ULP untuk snapshot/manifest delta, keluarkan `db_Users`. _Selesai bila:_ test membuktikan akun ULP A tidak menerima baris ULP B maupun daftar pengguna.
- [ ] **T-04** (C-04) Verifikasi dan pasang `guard_` di semua fungsi top-level yang dilaporkan; perluas Audit Gate. _Selesai bila:_ Audit Gate gagal untuk fungsi publik tanpa `guard_`.
- [ ] **T-05** (H-02) Buktikan akar masalah gagal download lewat log eksekusi; pecah `snapshotCreate` bila timeout. _Selesai bila:_ "Pilih semua" berhasil sekali jalan di perangkat nyata.
- [ ] **T-06** (C-05) Materialisasi Master Gardu tanpa menghapus edit pending. _Selesai bila:_ edit offline selamat setelah download ulang Data Master.

### Fase 2: Tinggi

- [ ] **T-07** (H-03) Guard, validasi, `safeRow_`, `withLock_`, idempotency untuk `simpanMobileEksekusiRow`.
- [ ] **T-08** (H-04) `ulpScope_` + cek kepemilikan baris di Jadwal Padam.
- [ ] **T-09** (H-05) Revisi server dan deteksi konflik untuk edit Master Gardu.
- [ ] **T-10** (H-06) TTL absolut, idle TTL, pembersihan terjadwal, rotasi token perangkat.
- [ ] **T-11** (H-07) Foto watermark privat secara default + akses terautentikasi.
- [ ] **T-12** (H-08) Migrasi massal password ke hash, lalu cutover tolak plaintext.

### Fase 3: Sedang

- [ ] **T-13** (M-01) Isi ULP baris lama, set `TAMPILKAN_BARIS_TANPA_ULP = false`.
- [ ] **T-14** (M-02) Rate limit per perangkat/klien + jalur buka kunci akun.
- [ ] **T-15** (M-03) Samakan pesan gagal `doLogin`.
- [ ] **T-16** (M-04) SRI/CSP atau host aset sendiri.
- [ ] **T-17** (M-05) Ganti `innerHTML`/`onclick` inline, perbaiki `_tdEsc()`.
- [ ] **T-18** (M-06) Enforce anti-replay webhook.
- [ ] **T-19** (M-07) Salinan foto Yandal yang tahan lama di penyimpanan privat.
- [ ] **T-20** (M-08) Bersihkan lint Flutter dari hasil `flutter analyze` terbaru.

### Fase 4: Rendah

- [ ] **T-21** (L-01) Hapus atau otomatisasi `flutter-audit.txt`.
- [ ] **T-22** (L-02) URL API per flavor.
- [ ] **T-23** (L-03) Selesaikan migrasi engine, hapus `engines/`.
- [ ] **T-24** (L-04, L-05) Rapikan README mobile, `GUARD_DEBUG`, artefak debug.

### Backlog Stage 5 (dibawa dari status lama)

- [ ] **T-25** Verifikasi migrasi kredensial lama di instalasi yang di-upgrade.
- [ ] **T-26** Dokumentasikan dan jalankan validasi secure storage di perangkat nyata.
- [ ] **T-27** Verifikasi redaksi token di URL, log, error, dan redirect (terkait T-01, T-02).
- [ ] **T-28** Smoke test otorisasi dan tulis-aman Apps Script yang ter-deploy.
- [ ] **T-29** Pastikan branch protection mewajibkan semua gate keamanan dan rilis.
- [ ] **T-30** Integration test Flutter untuk offline sync, retry, dan pengiriman ganda.

### Validasi fitur yang masih terbuka

- [ ] **T-31** Watermark lokal (`docs/LOCAL-WATERMARK.md`): belum terhubung ke kamera/outbox/upload; butuh test Flutter, analyze, dan perbandingan hasil di perangkat sebelum diaktifkan.
- [ ] **T-32** Foto Yandal (`docs/YANDAL-PHOTO-INTEGRATION.md`): jalankan test yang disebut, build APK bertanda tangan, dan skenario manual (kamera batal, GPS gagal/mock, draft lama, file hilang, restart, ganti akun).

---

## 6. Kebijakan otorisasi

Data BA dan file yang terhubung ke BA bersifat internal untuk ULP pemanggil. Tidak ada peran, termasuk Super User, yang boleh membaca atau mengubah data BA lintas ULP lewat endpoint operasional. Kepemilikan baris yang hilang, kosong, asing, ganda, atau tidak terselesaikan ditolak sebelum efek samping ke spreadsheet, Drive, PDF, atau penulisan.

## 7. Syarat rilis

- Backend lolos Audit Gate wajib.
- Endpoint terlindungi menolak sesi tidak valid sebelum efek samping.
- `getSesiByToken` tidak dianggap sebagai otorisasi penuh.
- Pengecualian internal singkat, eksplisit, dan terpisah dari allowlist route publik.
- Semua check CI wajib hijau.
- Bukti runtime ter-deploy dan perangkat nyata tercatat sebelum sign-off produksi.
- Perilaku database, antrean, cache, foto, dan worker per akun terverifikasi di perangkat nyata.
- Migrasi dan purge secure storage terverifikasi di perangkat yang di-upgrade.
- **Tidak ada temuan Kritis yang terbuka.**

## 8. Batasan audit

- Temuan 🔴 dibaca langsung dari kode di `7abd88e`. Temuan 🟡 berasal dari audit otomatis dan harus diverifikasi sebelum dikerjakan; bisa saja sudah tidak berlaku.
- `Code.js` dan beberapa file HTML besar belum dibaca baris per baris.
- Tidak ada uji runtime Apps Script ter-deploy, uji perangkat nyata, atau pemeriksaan ACL Drive/Cloud Run yang sebenarnya dalam audit ini.
- CI hijau dan static gate tidak membuktikan perilaku deployment atau properti APK rilis. Jangan hapus SQLite lokal untuk menyelesaikan konflik sync.
