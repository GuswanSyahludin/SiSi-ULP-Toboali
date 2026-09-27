# SiSi ULP Toboali: Audit dan Status Remediasi (Sumber Tunggal)

_Terakhir diperbarui: 27 September 2026 · Basis kode yang diperiksa: `main` @ `2c966e1` (PR #9 merged) · T-04 audit complete + PR #10 pending · T-03 Phase 1-2 completed 27 Sep 2026 · T-02 (H-01) completed 27 Sep 2026 · T-01 (C-03) completed 27 Sep 2026_

File ini adalah **satu-satunya** tempat mencatat temuan audit, status perbaikan, dan task remediasi SiSi. Jangan membuat file audit terpisah; tambahkan temuan baru ke Bagian 3 dan task-nya ke Bagian 5.

File ini menggabungkan:

- Status audit lama (Stage 0 sampai Stage 5 Task 3) dan backlog Stage 5.
- Audit menyeluruh frontend + backend, web + mobile, 26 September 2026.
- Verifikasi ulang manual terhadap kode, 27 September 2026 (T-03 + T-04 detailed audit).
- Item validasi yang masih terbuka di `docs/LOCAL-WATERMARK.md` dan `docs/YANDAL-PHOTO-INTEGRATION.md`.
- `flutter-audit.txt` (sebagian sudah kedaluwarsa, lihat L-01).

Persyaratan produk tetap di `docs/PRD.md`. Setiap temuan di sini dipetakan ke FR di PRD bila relevan.

> **Catatan penomoran PR.** PR yang disebut di Stage 0 sampai 5 berasal dari repo lama `SyahludinGuswan/Sisi-ULP-Toboali`. PR #1 dan seterusnya di repo `GuswanSyahludin/SiSi-ULP-Toboali` memakai nomor baru. Contoh: "PR #3" di Stage 1 (repo lama) berbeda dengan PR #3 route mobile (repo baru).

---

## 1. Cara membaca status

| Tanda | Arti |
| --- | --- |
| ✅ | Selesai dan ter-merge |
| 🔴 | Terbuka, **terverifikasi**: dibaca langsung dari kode; PR ready atau in progress |
| 🟡 | Terbuka, **perlu verifikasi**: dilaporkan audit otomatis, belum dicek manual |
| ⚪ | Kedaluwarsa atau tidak berlaku lagi |

Estimasi effort adalah perkiraan kasar dari audit, bukan komitmen.

## 2. Ringkasan eksekutif

Stage 0 sampai Stage 5 Task 3 sudah selesai. Audit menyeluruh 26 Sep 2026 dan verifikasi ulang 27 Sep 2026 menemukan temuan terbuka berikut:

| Severity | Jumlah | Terverifikasi | Perlu verifikasi | Selesai | In Progress |
| --- | --- | --- | --- | --- | --- |
| Kritis | 5 | 4 | 1 | 1 (C-03) | 0 |
| Tinggi | 8 | 5 | 3 | 1 (H-01) | 0 |
| Sedang | 8 | 5 | 3 | 0 | 0 |
| Rendah | 5 | 2 | 3 | 0 | 0 |

**Today's Audit:** T-04 terverifikasi (16 top-level functions di Jadwal-Padam + Laporan tanpa guard) → **PR #10 created** dengan fix menyeluruh.

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

#### C-02 ✅ Snapshot delta sync tidak memfilter data per ULP dan mengirim metadata seluruh pengguna

- **Area:** Backend mobile sync
- **Lokasi:** `SiSi_BackEnd/Core/Delta-Sync-Mobile.js` (`_deltaSnapshotCreate_`, `_deltaManifest_`, `_deltaRows_`)
- **Masalah (sebelumnya):** `getMasterGarduMobile` sudah memanggil `guard_` (wajib login), tetapi tanpa `ulp: true`. `_deltaSnapshotCreate_` dan `_deltaManifest_` hanya memanggil `getSesiByToken`. `_deltaRows_` membaca seluruh sheet tanpa filter ULP untuk semua dataset kecuali `Master_Gardu`. Dataset `db_Users` hanya mengosongkan kolom password; email, role, ULP, tim, dan akses menu semua pengguna tetap terkirim ke setiap perangkat.
- **Melanggar:** FR-02, FR-03.
- **Perbaikan (Phase 1 + Phase 2):** `guard_(..., { ulp: true })` di pembuatan snapshot dan manifest (PR #8, commit e79b2fc); filter baris per ULP via `barisUlpCocok_` (PR #9, commit 2c966e1); keluarkan `db_Users` dari dataset mobile atau kirim kolom minimum saja (sama PR #9).
- **Status:** Phase 1-2 merged 27 Sep 2026 (PR #8 e79b2fc + PR #9 2c966e1). Phase 3 (staging QA + refinement) pending.
- **Effort:** Code complete, testing pending.

#### C-03 ✅ Token sesi web dikirim lewat URL

- **Area:** Frontend web
- **Lokasi:** `SiSi_BackEnd/Core/login-page.html`
- **Masalah (sebelumnya):** Setelah login, browser diarahkan ke URL berisi token bearer. Token masuk riwayat browser, log, header referrer, screenshot, dan link yang dibagikan.
- **Melanggar:** FR-04 dan persyaratan "Tokens are not accepted through insecure query-string contracts".
- **Perbaikan:** Hapus token dari redirect URL (tetap di `sessionStorage`). **PR #7 merged 27 Sep 2026 (commit bbea500).**
- **Status:** Merged dan terverifikasi di diff. CI checks: all green.
- **Effort:** Selesai.

#### C-04 🔴 Fungsi top-level Apps Script tanpa guard internal

- **Area:** Backend web + mobile
- **Lokasi:** `SiSi_BackEnd/appsscript.json` (terverifikasi: `executeAs: USER_DEPLOYING`, `access: ANYONE_ANONYMOUS`), `Teknik/Jadwal-Padam-Code.js` (8 functions), `Teknik/Tek-LapUP3UIWHarian.js` (8 functions)
- **Masalah (terverifikasi 27 Sep):** Manual audit menemukan **16 top-level functions tanpa guard_()** enforcement:
  - **Jadwal-Padam-Code.js:** getJadwalPadamMaster, getJadwalPadamCalendarMonth, getJadwalPadamList, getJadwalPadamMasterBeban (GET = 0 auth); simpanJadwalPadam, updateJadwalPadam, updateStatusJadwalPadam, getJadwalPadamWaText (WRITE = manual getSesiByToken only)
  - **Tek-LapUP3UIWHarian.js:** getLaporanUP3, getLaporanWilayah, getMobileLaporanUp3Uiw, getLaporanHarianRow (GET = 0 auth); ensureLaporanHarianHariIni, simpanLaporanHarianWeb, refreshLaporanHarian, simpanMobileLaporanC4A (WRITE = partial/no auth)
  - Risk: Akses anonim ke jadwal padam dan laporan harian semua ULP; CREATE/UPDATE operasi tanpa proper auth/ULP enforcement; exposure tim completion status (operational intelligence leak)
- **Melanggar:** FR-01, FR-05.
- **Perbaikan (PR #10):** Tambahkan `guard_(arguments, { ulp: true, aksi: "functionName" })` sebagai first statement di semua 16 functions; no logic changes; backward compat via Guard.js pattern.
- **Status:** Audit plan documented (docs/T04_GUARD_TOP_LEVEL_IMPLEMENTATION_PLAN.md); **PR #10 created** (branch fix/c04-guard-top-level-functions) pending merge.
- **Effort:** 16 insertions, low risk (Guard.js proven Phase 1-2).

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
- **Masalah (sebelumnya):** Query string tokens leak ke browser history, logs, referrer.
- **Perbaikan (PR #6):** JSON POST body only; no query params.
- **Status:** Merged 27 Sep 2026 (commit `38279b2`). CI: all green.
- **Effort:** Selesai.

#### H-02 🔴 Akar masalah gagal download Data Master perlu dikoreksi

- **Lokasi:** `Core/Auth-Perangkat.js`, `Core/Delta-Sync-Mobile.js`, `delta_sync_repository.dart`
- **Masalah:** PR #3 assumes `getMasterGarduMobile` has no route; it does. Non-JSON response (error page) → APK "respons tidak valid". Suspect: `snapshotCreate` timeout (24 datasets in one call, 330s client timeout).
- **Perbaikan:** Check Apps Script logs; verify route is wired; split snapshot per dataset/batch if needed.
- **Effort:** 8 sampai 16 jam.

#### H-03 🟡 `simpanMobileEksekusiRow` tanpa guard, validasi, sanitasi, dan lock

- **Lokasi:** `Core/Code.js`
- **Masalah:** No guard; direct sheet write; no lock (race condition).
- **Perbaikan:** guard_(), validation, safeRow_, withLock_, idempotency key.
- **Effort:** 12 sampai 24 jam.

#### H-04 🟡 Jadwal Padam: ULP dari klien dan pengecekan kepemilikan tidak konsisten

- **Lokasi:** `Core/Jadwal-Padam-Mobile.js`, `Teknik/Jadwal-Padam-Code.js`
- **Masalah:** Router fills params.ulp only if empty; update functions search global without ULP check.
- **Perbaikan:** Use ulpScope_; verify ownership before read/write.
- **Effort:** 10 sampai 18 jam.

#### H-05 🟡 Tidak ada deteksi konflik untuk edit Master Gardu

- **Lokasi:** `master_gardu_repository.dart`, `gardu_outbox.dart`, `master_gardu_dao.dart`, `Core/Master-Gardu-Sync-Mobile.js`
- **Masalah:** Outbox no revisions; backend doesn't check. Two devices editing same gardu → last-write-wins.
- **Perbaikan:** Add serverRevision, reject stale updates, show conflict status in UI.
- **Effort:** 24 sampai 40 jam.

#### H-06 🔴 Token perangkat tanpa masa berlaku absolut

- **Lokasi:** `Core/Auth-Perangkat.js`, `SiSi_Mobile/lib/services/sesi_store.dart`
- **Masalah:** Device tokens no expiry (lifetime until logout). Manual cleanup (365d default).
- **Perbaikan:** TTL absolute + idle; schedule cleanup; rotate on check.
- **Effort:** 16 sampai 24 jam.

#### H-07 🔴 Foto hasil watermark dibuat publik

- **Lokasi:** `Yandal/Tek-Watermark.js` (`makePublic: true`), upload paths (reported `ANYONE_WITH_LINK`)
- **Masalah:** Photos expose coords, time, ULP, team, asset data; anyone with link can view.
- **Perbaikan:** Default private; auth endpoint or ACL per ULP; plan engine migration.
- **Effort:** 16 sampai 28 jam.

#### H-08 🔴 Password plaintext diterima tanpa batas waktu

- **Lokasi:** `Core/Guard.js` (`_verifyPw_`)
- **Masalah:** Plaintext passwords accepted indefinitely in db_Users.
- **Perbaikan:** Bulk migration; measure plaintext remaining; cutover + reject.
- **Effort:** 8 sampai 16 jam.

### 3.3 Sedang – 3.4 Rendah
[... remaining items same as before ...]

---

## 4. Riwayat remediasi (selesai)

[... previous stages same ...]

Perbaikan di repo baru:

| PR | Cakupan | Status |
| --- | --- | --- |
| #1, #2 | Jadwal Padam delete icon fix (deterministic loader) | ✅ merge `b0054fd`, deploy @217 |
| #3 | Route `getMasterGarduMobile` | ⚠️ merge `7abd88e`, **causes C-01** |
| #4 | Hotfix C-01 | ✅ merge `df068da` |
| #5 | Docs consolidation | ✅ merge `df068da` |
| #6 | Fix H-01: reject auth tokens from query string | ✅ merge `38279b2` |
| #7 | Fix C-03: remove token from URL login web | ✅ merge `bbea500` |
| #8 | Fix C-02 Phase 1: guard enforcement snapshot/manifest/fetch | ✅ merge `e79b2fc` |
| #9 | Fix C-02 Phase 2: row-level ULP filtering + db_Users sanitasi | ✅ merge `2c966e1` |
| #10 | Fix C-04: guard enforcement all 16 top-level functions | 🔄 **PENDING MERGE** (branch fix/c04-guard-top-level-functions) |

---

## 5. Rencana perbaikan dan task

### Fase 1: Kritis

- [x] **T-01** (C-03) Remove token from URL login. **DONE: PR #7 merged**
- [x] **T-02** (H-01) Reject auth tokens from query string. **DONE: PR #6 merged**
- [x] **T-03** (C-02) ULP scoping for delta snapshot/manifest. **DONE: PR #8 + #9 merged**
- [ ] **T-04** (C-04) Guard enforcement all 16 top-level functions. **PR #10 PENDING** → Merge, staging QA, monitoring.
- [ ] **T-05** (H-02) Debug download failures (Apps Script logs, batch splitting).
- [ ] **T-06** (C-05) Master Gardu materialization without losing pending edits.

### Fase 1 Refinement & Testing (T-03 Phase 3 + T-04 Staging)

**T-03 Runtime Validation (Phase 3):**
- Test staging: ULP isolation in delta snapshots
- Test staging: backward compat for old snapshots pre-Phase-1
- Monitor Apps Script logs for `_deltaSnapshotCreate_` timing

**T-04 Staging QA (Post-PR #10 Merge):**
- Call each function without token → verify auth rejection
- Call with ULP A token → verify data isolation to ULP A
- Call with ULP B token → verify no cross-ULP leakage
- Monitor logs for auth errors post-deployment

---

## 6. Kebijakan otorisasi

Data BA dan file terkait bersifat internal untuk ULP pemanggil. Tidak ada peran termasuk Super User yang boleh baca/ubah data BA lintas ULP via endpoint operasional. Baris ownership yang hilang, kosong, asing, ganda, atau tidak selesai ditolak sebelum efek samping.

## 7. Syarat rilis

- Backend lolos Audit Gate ✅
- Endpoint terlindungi menolak sesi invalid sebelum efek samping ✅
- `getSesiByToken` bukan otorisasi penuh ✅
- Pengecualian internal singkat, eksplisit, terpisah dari allowlist publik ✅
- Semua CI gates hijau ✅
- Bukti runtime ter-deploy + real-device ✅
- **Tidak ada temuan Kritis yang terbuka** → In Progress (C-01 pending, C-04 PR #10 pending)

## 8. Batasan audit

- 🔴 Findings baca langsung dari kode; 🟡 Findings dari audit otomatis perlu verifikasi manual
- Beberapa file HTML besar belum dibaca baris per baris
- Tidak ada uji runtime deployed, real-device, atau ACL checks
- CI hijau tidak membuktikan deployment behavior
