/***** Tek-Yandal.gs — Modul Yandal (Yantek P0) *****/
/* Relasi: db_Global_Header (Kode Header) > db_Yandal_Shift (Kode Pekerjaan Shift) > db_Yandal_P0 (Kode Pekerjaan P0) */
/* Rev 9 Agu 2026 — DUAL-READ (migrasi arsip): fungsi rank/rekap membaca db_Yandal_P0
   dari AKTIF + ARSIP via _readSheetDual_() (Tek-Migrasi.gs): sinkronRankYandal,
   getRekapPointPetugasY, getDetailPerformaPetugasY, getListPetugasYandal, _unitPetugasMapY_.
   Fungsi TULIS/operasional & bacaan db_Yandal_Shift tetap AKTIF-saja.
   ⚠️ Paste file ini HANYA setelah sheet db_Yandal_P0 di arsip dikosongkan (HAPUS BARIS).
   Rev 12 Agu 2026 — db_Yandal_P0 sisip kolom "Alasan Rejected" (AQ / indeks 42): peta COL_P0
   bergeser +1 mulai approvedBy; setApprovalP0 menulis alasan Reject ke AQ (dikosongkan saat Approved).
   Rev 19 Agu 2026 — getApprovalP0List: tambah field catatan (AM), alasanRejected (AQ) & point (AR) ke response
   + objek counts {Menunggu, Approved, Rejected} (mengikuti filter ulp+tanggal) untuk badge tab di mobile.
   Kriteria status ditulis eksplisit — satu sumber untuk web SIE-Teknik & mobile (apiRouter_).
   + getLampiranPengecekanP0 & _sheetUkurGardu_ (hotfix siang): pembacaan lampiran di-gate jenis pekerjaan —
   spreadsheet gardu hanya dibuka utk "Pengecekan Gardu", sheet switching hanya di-scan utk "Pengecekan Switching";
   nama sheet gardu di-cache 6 jam (detail tidak lagi timeout/loading selamanya).
   + setApprovalP0 JADI ANTREAN (db_Approval_Queue): keputusan hanya DICATAT lalu balas seketika (~0,5 dtk) —
   UI mobile tidak lagi menunggu scan sheet + hitung point (penyebab timeout). Penulisan Status Approval +
   hitung Point dikerjakan backend oleh drainAntreanApprovalP0 tiap 1 menit (pasang trigger SEKALI via
   createApprovalDrainTriggerY() dari editor Apps Script).
   + sweepPointP0Yandal diturunkan ke default 15 menit (createPointP0DrainTriggerY(minutes)) — ia hanya
   BACKSTOP (point tetap dihitung seketika oleh antrean approval); scan sheet penuh tiap menit ikut
   membebani limit eksekusi simultan (penyebab timeout login/approval saat ramai).
+ INBOX PROPERTY (malam 2): setApprovalP0 menitipkan keputusan ke ScriptProperties (_apprInboxPush_) —
respons approve TIDAK menyentuh spreadsheet sama sekali (kebal macet backend Sheets);
drainAntreanApprovalP0 mem-flush inbox → db_Approval_Queue (_apprInboxFlush_) lalu memprosesnya.
Fallback: inbox penuh/gagal → tulis sheet langsung (enqueueApprovalP0_).
+ MALAM 3 — INBOX LOCK-FREE: satu property per kodeP0 (apprInbox_<kodeP0>) → tulis atomik TANPA lock;
push tidak lagi menunggu userLock yang bisa dipegang drain WM saat sheet sibuk (penyebab fallback lambat di v1).
+ MALAM 4 — SWEEP WM KELUAR DARI DRAIN 1-MENIT: sweepWmBacklogY (scan penuh P0 + Switching) dipindah ke
trigger terpisah 15 menit (createSweepWmBacklogTriggerY); drainAntreanP0 kini hanya menyentuh sheet antrean kecil.
+ sweepDurasiJarakYandalP0 default 5 → 30 menit. Tujuan: mengurangi okupansi slot eksekusi simultan —
penyebab request mobile antre slot (gejala: fungsi cepat tapi respons tetap timeout 30 dtk). */

// ====== KONFIG ======
var SHEET_YANDAL = {
  HEADER: "db_Global_Header",
  SHIFT: "db_Yandal_Shift",
  P0: "db_Yandal_P0",
  SWITCHING: "db_Yandal_Pengecekan_Switching",
  LIST_P0: "db_Yandal_List_P0",
};
// db_Yandal_List_P0 — master bobot tiap jenis pekerjaan P0 (0-based): No | Nama Pekerjaan | Bobot Pekerjaan
var COL_YANDAL_LIST_P0 = { no: 0, namaPekerjaan: 1, bobot: 2 };
var YANDAL_APPSHEET_ROOT_ID = ""; // root berkas AppSheet; kosong = pakai folder induk Spreadsheet
var YANDAL_IMG_FOLDER_ID = ""; // (fallback opsional) folder foto asli bila folderPath kosong
var YANDAL_WM_FOLDER_ID = ""; // (fallback opsional) folder hasil bila folderPath kosong
var YANDAL_TZ = "Asia/Jakarta";
var HARI_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
var BULAN_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

// Peta kolom 0-based (urutan = kolom A, B, C, ...)
var COL_YANDAL_SHIFT = {
  no: 0,
  kodeHeader: 1,
  kodeShift: 2,
  hari: 3,
  tanggal: 4,
  ulp: 5,
  tim: 6,
  shift: 7,
  petugas: 8,
  jumlahP0: 9,
  inputBy: 10,
  timestamp: 11,
};
var COL_P0 = {
  no: 0,
  kodeHeader: 1,
  kodeShift: 2,
  kodeP0: 3,
  ulp: 4,
  hari: 5,
  tanggal: 6,
  namaPekerjaan: 7,
  pekerjaanLainnya: 8,
  penyulang: 9,
  section: 10,
  daerah: 11,
  koordinat: 12,
  lat: 13,
  long: 14,
  koordinatClosing: 15,
  latClosing: 16,
  longClosing: 17,
  jarak: 18,
  jarakAntarP0: 19, // (kolom T) "Jarak Antara P0 Terbaru & P0 Terakhir" — diisi SKRIP (_recalcJarakAntarP0RowY_) saat prosesP0Yandal; P0 pertama di shift = "0 km"
  tim: 20,
  petugas: 21,
  timestampPembuatan: 22,
  fotoSebelum: 23,
  fotoSebelumWm: 24,
  fotoSebelumUrl: 25,
  linkDownloadSebelum: 26,
  timestampPekerjaan: 27,
  fotoPekerjaan: 28,
  fotoPekerjaanWm: 29,
  fotoPekerjaanUrl: 30,
  linkDownloadPekerjaan: 31,
  timestampSesudah: 32,
  fotoSesudah: 33,
  fotoSesudahWm: 34,
  fotoSesudahUrl: 35,
  linkDownloadSesudah: 36,
  catatan: 37,
  inputBy: 38,
  timestampWebsite: 39,
  durasi: 40,
  statusApproval: 41,
  alasanRejected: 42, // (kolom AQ) "Alasan Rejected" — diisi setApprovalP0 (12 Agu 2026)
  approvedBy: 43,
  timestampApprove: 44,
  point: 45,
  tampilSebelum: 46,
  tampilPekerjaan: 47,
  tampilSesudah: 48,
  folderPath: 49,
};
// db_Yandal_Pengecekan_Switching (cucu P0) — Pengecekan Switching. 4 indikator (Remote/Local/Protection/Reclose) + 6 foto: Arus + Gangguan 1..5 (tiap foto: Asli/WM/URL/Link Download).
var COL_SWITCHING = {
  no: 0,
  kodeHeader: 1,
  kodeShift: 2,
  kodeP0: 3,
  kodeSwitching: 4,
  ulp: 5,
  hari: 6,
  tanggal: 7,
  tim: 8,
  petugas: 9,
  penyulang: 10,
  namaSwitching: 11,
  jamPengecekan: 12,
  koordinat: 13,
  lat: 14,
  long: 15,
  indikatorRemote: 16,
  indikatorLocal: 17,
  indicatorProtection: 18,
  indicatorReclose: 19,
  arusR: 20,
  arusS: 21,
  arusT: 22,
  fotoArus: 23,
  fotoArusWm: 24,
  fotoArusUrl: 25,
  linkDownloadArus: 26,
  fotoG1: 27,
  fotoG1Wm: 28,
  fotoG1Url: 29,
  linkDownloadG1: 30,
  fotoG2: 31,
  fotoG2Wm: 32,
  fotoG2Url: 33,
  linkDownloadG2: 34,
  fotoG3: 35,
  fotoG3Wm: 36,
  fotoG3Url: 37,
  linkDownloadG3: 38,
  fotoG4: 39,
  fotoG4Wm: 40,
  fotoG4Url: 41,
  linkDownloadG4: 42,
  fotoG5: 43,
  fotoG5Wm: 44,
  fotoG5Url: 45,
  linkDownloadG5: 46,
  inputBy: 47,
  timestamp: 48,
  folderPath: 49,
};
// CATATAN GESER KOLOM: kolom "Jarak Antara P0 Terbaru & P0 Terakhir" disisipkan di T (indeks 19) → semua kolom mulai Tim bergeser +1 (huruf juga +1: V→W, AA→AB, AF→AG, AM→AN, AN→AO, dst). AppSheet pakai NAMA kolom → aman.
// CATATAN GESER KOLOM (12 Agu 2026): kolom "Alasan Rejected" disisipkan di AQ (indeks 42) → Approved By s/d Folder Path
// bergeser +1 (AQ→AR, AR→AS, AS→AT, AT→AU, AU→AV, AV→AW, AW→AX). Semua akses skrip via NAMA (COL_P0) → cukup ubah peta di atas.
// timestampPembuatan = "Time Stamp Pembuatan" (W) — waktu DEVICE (AppSheet NOW() saat Add) = START durasi & sumber jam Foto Sebelum.
// timestampPekerjaan = "Time Stamp Pekerjaan" (AB) — DateTime, Reset on edit ISBLANK([Foto Pekerjaan]) = sumber jam Foto Pekerjaan.
// timestampSesudah   = "Time Stamp Sesudah" (AG)  — DateTime, Reset on edit ISBLANK([Foto Sesudah]) = sumber jam Foto Sesudah & END durasi (waktu device, beku saat closing diambil).
// timestampWebsite   = "Time Stamp Website" (AN) — waktu SERVER saat baris selesai diproses (audit; diisi skrip). END durasi kini dari Time Stamp Sesudah (AG), bukan kolom ini.
// koordinatClosing(P)/latClosing(Q)/longClosing(R) — lokasi Closing. jarak(S) = jarak Closing→Pekerjaan (Haversine), tampil di watermark Foto Sesudah.

// ====== HELPER UMUM ======
function _ssY_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}
function _shY_(name) {
  return _ssY_().getSheetByName(name);
}
function _nowY_() {
  return new Date();
}
function _fmtY_(d, pat) {
  return Utilities.formatDate(d, YANDAL_TZ, pat);
}
function _hariY_(d) {
  return HARI_ID[d.getDay()];
}
function _jamHHmm_(v) {
  var ms = _toMillisY_(v);
  return isNaN(ms) ? "" : _fmtY_(new Date(ms), "HH:mm");
} // Time Stamp (per foto) -> "15:16"
function _tglDMY_(v) {
  var ms = _toMillisY_(v);
  var d = isNaN(ms)
    ? Object.prototype.toString.call(v) === "[object Date]"
      ? v
      : null
    : new Date(ms);
  return d
    ? _padY_(d.getDate(), 2) +
        " " +
        BULAN_ID[d.getMonth()] +
        " " +
        d.getFullYear()
    : String(v || "");
} // kolom G -> "04 Juni 2026"
function _padY_(n, len) {
  var s = "" + n;
  while (s.length < len) s = "0" + s;
  return s;
}
function _allY_(sh) {
  return sh.getDataRange().getValues();
}
function _setY_(sh, rowNum, col0, val) {
  sh.getRange(rowNum, col0 + 1).setValue(val);
}
function _setDateFmtY_(sh, rowNum, col0, d) {
  var c = sh.getRange(rowNum, col0 + 1);
  c.setNumberFormat("dd/MM/yyyy HH.mm.ss");
  c.setValue(d);
} // tulis Date + paksa format Indonesia (dd/MM/yyyy HH.mm.ss) agar tampil konsisten dgn baris lama
function _setTextY_(sh, rowNum, col0, val) {
  var c = sh.getRange(rowNum, col0 + 1);
  c.setNumberFormat("@");
  c.setValue(val);
} // tulis sebagai TEKS murni (anti dikonversi jadi serial waktu)

function _findRowY_(sh, col0, value) {
  var d = _allY_(sh);
  for (var i = 1; i < d.length; i++) {
    if (String(d[i][col0]) === String(value))
      return { rowNum: i + 1, row: d[i] };
  }
  return null;
}
function _countByValueY_(sh, col0, value) {
  var d = _allY_(sh),
    c = 0;
  for (var i = 1; i < d.length; i++)
    if (String(d[i][col0]) === String(value)) c++;
  return c;
}
function _countPrefixY_(sh, col0, prefix) {
  var d = _allY_(sh),
    c = 0;
  for (var i = 1; i < d.length; i++)
    if (String(d[i][col0]).indexOf(prefix) === 0) c++;
  return c;
}

// ====== GENERATOR KODE BERANTAI (silsilah tampak dari kode) ======
// Header (db_Global_Header) : <Y+2hurufSubTim>-<KodeULP><YYMMDD><Shift>  (suffix = NOMOR SHIFT 001/002/003; 1 header per shift per tim, maks 3/hari)
// Parent Shift              : <KodeHeader>-SHF<1|2|3>.<nnn>  (SHF1=Shift 1 08:00-16:00, SHF2=Shift 2 16:00-00:00, SHF3=Shift 3 00:00-08:00)
// Anak P0                   : <KodeShift>-P0.<nnn>
// Cucu Switching            : <KodeP0>-SWC.<nnn>
// Pemisah '-' antar-tingkat, '.' antara tag & nomor. Nomor anak reset per induk.
// Versi web pakai generator di bawah; versi AppSheet pakai INITIAL VALUE (lihat catatan halaman).
var YDL_MODUL = "YDL"; // fallback prefix bila Sub-Tim kosong
// Padanan AppSheet IV Shift: label baru "Shift 1/2/3 (jam)" → SHF1/2/3. Alias lama (Pagi/Siang/Malam) dipertahankan utk data lama.
var YDL_TAG_SHIFT = {
  "Shift 1": "SHF1",
  "Shift 2": "SHF2",
  "Shift 3": "SHF3",
  "Shift 1 (08:00 - 16:00)": "SHF1",
  "Shift 2 (16:00 - 00:00)": "SHF2",
  "Shift 3 (00:00 - 08:00)": "SHF3",
  Pagi: "SHF1",
  Siang: "SHF2",
  Malam: "SHF3",
};
function _shiftTagY_(shift) {
  return YDL_TAG_SHIFT[String(shift || "").trim()] || "SHF0";
}
// Prefix modul = "Y" + 2 huruf terakhir Sub-Tim (padanan USERSETTINGS("Sub-Tim") di AppSheet). Fallback "YDL" bila Sub-Tim kosong.
function _modulTagY_(subTim) {
  var s = String(subTim || "").trim();
  return s.length >= 2 ? "Y" + s.slice(-2) : YDL_MODUL;
}

// Nomor shift (1/2/3) dari label Shift — padanan suffix Kode Header AppSheet. 0 bila tak dikenal.
function _shiftNoY_(shift) {
  var n = parseInt(_shiftTagY_(shift).replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? 0 : n;
}
// Header: <Y+2 huruf Sub-Tim>-<KodeULP><YYMMDD><Shift> — suffix = NOMOR SHIFT (001/002/003), BUKAN urutan harian.
// 1 header per shift per tim (maks 3/hari) — DIPAKSA di AppSheet Valid_If [Kode Header] (unik + maksimal 3 header Yandal per Sub-Tim/ULP/Tanggal). Header Yandal DIBUAT AppSheet (form Shift), BUKAN server; generator ini hanya cadangan versi web. Padanan AppSheet IV: suffix IFS(HOUR(NOW() - TODAY())=8,1,=16,2,=0,3);
//   tanggal operasional IF(HOUR(NOW() - TODAY())=0, TODAY()-1, TODAY()) — teruskan `tgl` yg SUDAH = tanggal operasional & label `shift`.
// Fallback: bila `shift` tak dikenal → kembali ke urutan harian per-ULP (perilaku lama, backward-compat).
function genKodeHeaderYandal_(kodeUlp, tgl, subTim, shift) {
  var sh = _shY_(SHEET_YANDAL.HEADER);
  var base =
    _modulTagY_(subTim) +
    "-" +
    String(kodeUlp || "").trim() +
    _fmtY_(new Date(tgl), "yyMMdd");
  var no = _shiftNoY_(shift);
  return (
    base +
    _padY_(
      no > 0 ? no : _countPrefixY_(sh, COL_INS.HEADER.kodeHeader, base) + 1,
      3,
    )
  );
}
// Parent Shift: <KodeHeader>-SHF<1|2|3>.<nnn>. Nomor reset per Header+Shift.
// MAKSIMAL 1 data shift per Kode Header (1 header = 1 shift) — DIPAKSA di AppSheet Valid_If [Kode Pekerjaan Shift] (unik + tak boleh ada baris shift lain dgn Kode Header sama). Shift dibuat AppSheet (form Shift), generator ini hanya cadangan versi web.
function genKodeShiftYandal_(kodeHeader, shift) {
  var sh = _shY_(SHEET_YANDAL.SHIFT);
  var prefix = String(kodeHeader || "").trim() + "-" + _shiftTagY_(shift) + ".";
  return (
    prefix +
    _padY_(_countPrefixY_(sh, COL_YANDAL_SHIFT.kodeShift, prefix) + 1, 3)
  );
}
// Anak P0: <KodeShift>-P0.<nnn>. Nomor reset per Shift.
function genKodeP0Yandal_(kodeShift) {
  var sh = _shY_(SHEET_YANDAL.P0);
  var prefix = String(kodeShift || "").trim() + "-P0.";
  return prefix + _padY_(_countPrefixY_(sh, COL_P0.kodeP0, prefix) + 1, 3);
}
// Cucu Switching: <KodeP0>-SWC.<nnn>. Nomor reset per P0.
function genKodeSwitchingYandal_(kodeP0) {
  var sh = _shY_(SHEET_YANDAL.SWITCHING);
  var prefix = String(kodeP0 || "").trim() + "-SWC.";
  return (
    prefix +
    _padY_(_countPrefixY_(sh, COL_SWITCHING.kodeSwitching, prefix) + 1, 3)
  );
}

// ====== FOTO + WATERMARK ======
// Cari File ID di Drive dari path/nama yang disimpan AppSheet pada kolom Image.
function _resolveFotoIdY_(path) {
  if (!path) return null;
  var name = String(path).split("/").pop();
  if (YANDAL_IMG_FOLDER_ID) {
    var it = DriveApp.getFolderById(YANDAL_IMG_FOLDER_ID).getFilesByName(name);
    if (it.hasNext()) return it.next().getId();
  }
  var g = DriveApp.getFilesByName(name); // fallback: cari global
  return g.hasNext() ? g.next().getId() : null;
}

// Root tempat AppSheet menaruh berkas (default: folder induk Spreadsheet).
function _appsheetRootY_() {
  if (YANDAL_APPSHEET_ROOT_ID)
    return DriveApp.getFolderById(YANDAL_APPSHEET_ROOT_ID);
  var p = DriveApp.getFileById(SPREADSHEET_ID).getParents();
  return p.hasNext() ? p.next() : DriveApp.getRootFolder();
}

// Resolve path relatif AppSheet (kolom folderPath) -> Folder Drive; subfolder dibuat bila belum ada.
function _folderFromRelPathY_(relPath) {
  if (!relPath) return _appsheetRootY_();
  var clean = String(relPath);
  while (clean.charAt(0) === "/") clean = clean.slice(1);
  while (clean.length && clean.charAt(clean.length - 1) === "/")
    clean = clean.slice(0, -1);
  // CACHE folderPath -> folderId: hindari telusur Drive berulang (~6 round-trip) tiap edit baris yang sama.
  var cache = CacheService.getScriptCache(),
    ckey = "fldY_" + clean;
  var cid = cache.get(ckey);
  if (cid) {
    try {
      return DriveApp.getFolderById(cid);
    } catch (eC) {}
  } // id basi -> telusur ulang
  var folder = _appsheetRootY_();
  var parts = clean.split("/");
  for (var i = 0; i < parts.length; i++) {
    var nm = parts[i];
    if (!nm || nm === ".") continue;
    var it = folder.getFoldersByName(nm);
    folder = it.hasNext() ? it.next() : folder.createFolder(nm);
  }
  try {
    cache.put(ckey, folder.getId(), 21600);
  } catch (eP) {} // simpan 6 jam
  return folder;
}

/**
 * KEEP-WARM: panggil root engine agar Cloud Run tidak cold start.
 * Petugas kerja 24 jam -> pasang trigger time-driven "Every 5 minutes".
 * Triggers > Add Trigger > pingEngineY > Time-driven > Minutes timer > Every 5 minutes.
 * Instance Cloud Run baru mati setelah ~15 menit idle, jadi ping per 5 menit aman menjaganya hangat.
 * Engine tetap min-instances=0 (gratis saat idle); ping ringan ini cukup menjaga instance hangat.
 */
function pingEngineY() {
  try {
    UrlFetchApp.fetch(
      "https://wm-engine-1011716929576.asia-southeast2.run.app/",
      {
        method: "get",
        muteHttpExceptions: true,
      },
    );
  } catch (e) {}
}

// Cari File ID foto by nama DI DALAM folder tertentu (folder per-baris).
function _fotoIdInFolderY_(folder, path) {
  if (!folder || !path) return null;
  var name = String(path).split("/").pop();
  var it = folder.getFilesByName(name);
  return it.hasNext() ? it.next().getId() : null;
}

// Watermark 1 foto. Sumber = kSrc (Foto Asli, diisi/diganti petugas) — skrip hanya membaca, tidak menimpa.
// Hasil: path relatif WM ditulis ke kWm (Foto WM, tipe Image di AppSheet). Foto diambil & disimpan di folder per-baris (folderPath).
// HANYA PROSES FOTO YANG BERUBAH: nama WM mengikuti NAMA FILE SUMBER (bukan fileId). Bila foto belum berubah,
//   path WM = path tersimpan → langsung SKIP tanpa akses Drive/Slides (hemat waktu besar saat hanya 1 foto berubah).
// Saat regenerasi (foto berubah), kUrl (kolom "Link Download Foto ...") DIISI ULANG dengan link download paksa Drive (usercontent/download) -> dipakai tombol Download AppSheet. Kolom "Foto ... URL" (signed) TIDAK disentuh skrip.
function _wmFotoY_(sh, rowNum, kSrc, kWm, kUrl, info, rowFolder, folderRel) {
  var path = sh.getRange(rowNum, kSrc + 1).getValue(); // foto asli (diisi/diganti petugas)
  if (!path) {
    // TIDAK ada foto sumber -> kosongkan WM & URL (buang nilai nyasar, mis. tanggal dari AppSheet)
    if (String(sh.getRange(rowNum, kWm + 1).getValue()) !== "")
      sh.getRange(rowNum, kWm + 1).clearContent();
    if (String(sh.getRange(rowNum, kUrl + 1).getValue()) !== "")
      sh.getRange(rowNum, kUrl + 1).clearContent();
    return;
  }
  var fr = String(folderRel || "");
  while (fr.length && fr.charAt(fr.length - 1) === "/") fr = fr.slice(0, -1);
  var srcName = String(path).split("/").pop(); // nama file foto asli (unik tiap ambil foto)
  var wmName = "WM_" + srcName + ".jpg"; // nama hasil WM mengikuti nama sumber (JPEG, lebih ringan)
  var expectedRel = fr ? fr + "/" + wmName : null; // path relatif WM utk foto saat ini
  var nowVal = String(sh.getRange(rowNum, kWm + 1).getValue());
  if (expectedRel && nowVal === expectedRel) return; // FOTO BELUM BERUBAH → skip tanpa Drive/Slides
  if (!expectedRel && nowVal) return; // fallback (folderPath kosong): sudah ada hasil → jangan ulang
  // --- di bawah ini HANYA jalan utk foto baru/berubah ---
  var fileId = _fotoIdInFolderY_(rowFolder, path); // cari di folder per-baris (folderPath)
  if (!fileId) fileId = _resolveFotoIdY_(path); // fallback: folder lama / global (jarang)
  if (!fileId) {
    Logger.log("Foto tak ditemukan: " + path);
    return;
  }
  try {
    var outId = rowFolder ? rowFolder.getId() : YANDAL_WM_FOLDER_ID; // hasil disimpan di folder yang sama
    var url = watermarkFoto_(fileId, outId, info, expectedRel ? wmName : null); // hasil diberi nama wmName
    var relWm = expectedRel || url;
    _setTextY_(sh, rowNum, kWm, relWm); // Foto WM = path relatif, ditulis sbg TEKS (cegah Sheets ubah jadi tanggal); tipe Image
    var wmId = null;
    try {
      var outFolder =
        rowFolder ||
        (YANDAL_WM_FOLDER_ID
          ? DriveApp.getFolderById(YANDAL_WM_FOLDER_ID)
          : null);
      if (outFolder) wmId = _fotoIdInFolderY_(outFolder, wmName);
      if (!wmId) wmId = _resolveFotoIdY_(wmName);
    } catch (eFind) {
      Logger.log("Cari fileId WM gagal: " + eFind);
    }
    if (wmId) {
      try {
        DriveApp.getFileById(wmId).setSharing(
          DriveApp.Access.ANYONE_WITH_LINK,
          DriveApp.Permission.VIEW,
        );
      } catch (eShare) {
        Logger.log("Set sharing WM gagal: " + eShare);
      }
      _setTextY_(
        sh,
        rowNum,
        kUrl,
        "https://drive.usercontent.google.com/download?id=" +
          wmId +
          "&export=download",
      ); // URL WM = link download PAKSA (Content-Disposition attachment) -> tombol Download AppSheet
    } else {
      sh.getRange(rowNum, kUrl + 1).clearContent();
    }
  } catch (e) {
    Logger.log("Watermark gagal (" + path + "): " + e);
  }
}

// ====== DURASI (per baris) & JUMLAH P0 ======
function _durasiStr_(ms) {
  if (ms == null || isNaN(ms) || ms < 0) return ""; // jangan pernah tulis NaN
  var totalMin = Math.round(ms / 60000); // bulatkan ke menit terdekat
  if (totalMin < 1) {
    var det = Math.round(ms / 1000);
    return det + " detik";
  } // < 1 menit -> tampilkan detik
  var jam = Math.floor(totalMin / 60),
    menit = totalMin % 60;
  var parts = [];
  if (jam > 0) parts.push(jam + " jam");
  if (menit > 0) parts.push(menit + " menit");
  return parts.join(" "); // mis. "6 menit", "1 jam 3 menit", "2 jam"
}
// Ubah nilai Time Stamp (Date asli / serial number Sheets / string locale ID) -> milidetik epoch.
function _toMillisY_(v) {
  if (v == null || v === "") return NaN;
  if (Object.prototype.toString.call(v) === "[object Date]") return v.getTime();
  if (typeof v === "number") return Math.round((v - 25569) * 86400000); // serial Sheets -> epoch ms
  var s = String(v).trim();
  var t = new Date(s).getTime();
  if (!isNaN(t)) return t;
  // Format Indonesia: dd/MM/yyyy HH.mm.ss atau HH:mm:ss (pemisah jam bisa titik)
  var m = s.match(
    /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})[ T]+(\d{1,2})[.:](\d{1,2})(?:[.:](\d{1,2}))?/,
  );
  if (m)
    return new Date(
      +m[3],
      +m[2] - 1,
      +m[1],
      +m[4],
      +m[5],
      +(m[6] || 0),
    ).getTime();
  var m2 = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m2) return new Date(+m2[3], +m2[2] - 1, +m2[1]).getTime();
  return NaN;
}
// Durasi PER BARIS P0 — dihitung saat Foto Sesudah terisi:
//  • Waktu awal (START) = Time Stamp Pembuatan (V) = AppSheet NOW() saat Foto Sebelum — waktu DEVICE, terekam walau input offline.
//  • Waktu akhir (END)  = Time Stamp Sesudah (AF) = AppSheet NOW() saat Foto Sesudah diambil (Initial Value NOW() + Reset on edit ISBLANK([Foto Sesudah]) → BEKU saat Foto Sesudah terisi) — waktu DEVICE.
//  • ANTI-MANIPULASI: END dibekukan saat closing DIAMBIL, BUKAN waktu server saat baris diproses. Form yang dibiarkan terbuka / sync telat TIDAK lagi menambah durasi.
//  • Durasi = END − START. Keduanya waktu device → simetris & offline-safe (selisih jam device↔server tidak ikut terhitung).
//  • Time Stamp Website (AM) TETAP dicatat sbg waktu server diproses (audit), tapi TIDAK lagi dipakai sbg END durasi.
//  • Fallback aman: bila Time Stamp Sesudah kosong/invalid → END jatuh ke waktu server (perilaku lama) agar durasi tetap terisi.
//  • Sekali terisi TIDAK ditimpa lagi (aman dari edit foto berikutnya).
function _recalcDurasiRowY_(sh, rowNum) {
  var fotoSesudah = sh.getRange(rowNum, COL_P0.fotoSesudah + 1).getValue();
  if (!fotoSesudah) return; // foto sesudah belum ada → pekerjaan belum selesai
  var durNow = String(
    sh.getRange(rowNum, COL_P0.durasi + 1).getValue() || "",
  ).trim();
  if (durNow) return; // sudah pernah dihitung → jangan timpa
  var startMs = _toMillisY_(
    sh.getRange(rowNum, COL_P0.timestampPembuatan + 1).getValue(),
  ); // START = Time Stamp Pembuatan (V) = waktu DEVICE saat Foto Sebelum
  if (isNaN(startMs)) return; // device start belum ada → tunggu sync berikutnya
  var endMs = _toMillisY_(
    sh.getRange(rowNum, COL_P0.timestampSesudah + 1).getValue(),
  ); // END = Time Stamp Sesudah (AF) = waktu DEVICE saat Foto Sesudah diambil (beku saat closing)
  if (isNaN(endMs)) endMs = _nowY_().getTime(); // fallback aman: Time Stamp Sesudah kosong → pakai waktu server
  _setDateFmtY_(sh, rowNum, COL_P0.timestampWebsite, _nowY_()); // tetap catat Time Stamp Website (AM) = waktu server diproses (audit; BUKAN END durasi)
  if (endMs > startMs) endMs = _ivSehatY_(startMs, endMs, MENIT_PER_SHIFT_Y); // buang lompatan hari (jam device) + plafon 8 jam
  var diff = endMs - startMs;
  if (diff < 0) diff = 0; // jaga-jaga bila jam device tidak sinkron
  _setTextY_(sh, rowNum, COL_P0.durasi, _durasiStr_(diff)); // durasi = Time Stamp Sesudah − Time Stamp Pembuatan (keduanya waktu DEVICE)
}
// ====== JARAK (Closing → Pekerjaan) ======
// Hitung jarak garis-lurus 2 koordinat (Haversine) → km. Dipakai di watermark Foto Sesudah & ditulis ke kolom Jarak (S).
function _toNumY_(v) {
  if (v == null || v === "") return NaN;
  if (typeof v === "number") return v;
  var n = parseFloat(String(v).trim().replace(",", ".")); // dukung desimal koma
  return isNaN(n) ? NaN : n;
}
function _haversineKmY_(lat1, lon1, lat2, lon2) {
  var R = 6371,
    toRad = function (d) {
      return (d * Math.PI) / 180;
    }; // radius bumi (km)
  var dLat = toRad(lat2 - lat1),
    dLon = toRad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function _jarakKmStr_(km) {
  return km == null || isNaN(km) ? "" : km.toFixed(2).replace(".", ",") + " km";
} // "1,24 km"
// Hitung & simpan Jarak (Closing → Pekerjaan) bila kedua koordinat ada. Return string utk watermark.
function _recalcJarakRowY_(sh, rowNum) {
  var lat1 = _toNumY_(sh.getRange(rowNum, COL_P0.lat + 1).getValue());
  var lon1 = _toNumY_(sh.getRange(rowNum, COL_P0.long + 1).getValue());
  var lat2 = _toNumY_(sh.getRange(rowNum, COL_P0.latClosing + 1).getValue());
  var lon2 = _toNumY_(sh.getRange(rowNum, COL_P0.longClosing + 1).getValue());
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return ""; // koordinat belum lengkap
  var str = _jarakKmStr_(_haversineKmY_(lat1, lon1, lat2, lon2));
  _setTextY_(sh, rowNum, COL_P0.jarak, str); // simpan ke kolom Jarak (S) sbg teks
  return str;
}

// ====== JARAK ANTAR P0 (P0 terbaru → P0 sebelumnya: Tim/Shift/Tanggal yang sama) ======
// Ambil nomor urut P0 dari Kode Pekerjaan P0 (mis. "...-P0.003" / format lama "...-P0-3") → 3. NaN bila tak ada.
function _seqP0Y_(kodeP0) {
  var m = String(kodeP0 || "").match(/P0[.\-](\d+)/i);
  return m ? parseInt(m[1], 10) : NaN;
}
// "P0 sebelumnya" = baris P0 dgn Kode Pekerjaan Shift SAMA (otomatis = Tim+Shift+Tanggal sama) & nomor urut P0 < baris ini, ambil yang TERDEKAT (nomor terbesar yang masih lebih kecil).
// Jarak = Haversine Lat/Long pekerjaan (N/O) baris ini → P0 sebelumnya. P0 PERTAMA di shift → "0 km". Hasil ditulis ke kolom Jarak Antar P0 (T) sbg teks.
function _recalcJarakAntarP0RowY_(sh, rowNum) {
  var d = _allY_(sh);
  var row = d[rowNum - 1];
  var kodeShift = String(row[COL_P0.kodeShift] || "");
  if (!kodeShift) return ""; // tak bisa tentukan grup (Tim/Shift/Tanggal)
  var curSeq = _seqP0Y_(row[COL_P0.kodeP0]);
  // Cari P0 sebelumnya: nomor urut terbesar yang masih < curSeq, dgn koordinat valid, dlm shift sama.
  var prevSeq = -1,
    prevLat = NaN,
    prevLon = NaN;
  for (var i = 1; i < d.length; i++) {
    if (i === rowNum - 1) continue; // lewati baris sendiri
    if (String(d[i][COL_P0.kodeShift] || "") !== kodeShift) continue;
    var s = _seqP0Y_(d[i][COL_P0.kodeP0]);
    if (isNaN(s)) continue;
    if (!isNaN(curSeq) && s >= curSeq) continue; // hanya P0 yang lebih awal dari baris ini
    var la = _toNumY_(d[i][COL_P0.lat]),
      lo = _toNumY_(d[i][COL_P0.long]);
    if (isNaN(la) || isNaN(lo)) continue; // koordinat P0 sebelumnya belum ada → lewati
    if (s > prevSeq) {
      prevSeq = s;
      prevLat = la;
      prevLon = lo;
    }
  }
  if (isNaN(prevLat) || isNaN(prevLon)) {
    // tidak ada P0 sebelumnya → P0 PERTAMA
    _setTextY_(sh, rowNum, COL_P0.jarakAntarP0, "0 km");
    return "0 km";
  }
  var lat2 = _toNumY_(row[COL_P0.lat]),
    lon2 = _toNumY_(row[COL_P0.long]);
  if (isNaN(lat2) || isNaN(lon2)) return ""; // koordinat baris ini belum ada → tunggu sync berikutnya
  var str = _jarakKmStr_(_haversineKmY_(prevLat, prevLon, lat2, lon2));
  _setTextY_(sh, rowNum, COL_P0.jarakAntarP0, str); // tulis ke kolom Jarak Antar P0 (T) sbg teks
  return str;
}
function recalcJumlahP0_(kodeShift) {
  var jml = _countByValueY_(
    _shY_(SHEET_YANDAL.P0),
    COL_P0.kodeShift,
    kodeShift,
  );
  var f = _findRowY_(
    _shY_(SHEET_YANDAL.SHIFT),
    COL_YANDAL_SHIFT.kodeShift,
    kodeShift,
  );
  if (f)
    _setY_(_shY_(SHEET_YANDAL.SHIFT), f.rowNum, COL_YANDAL_SHIFT.jumlahP0, jml);
}

// ====== ANTREAN WM (backend — anti-beban AppSheet) ======
// Tujuan: doPost membalas SEKETIKA (cuma mencatat antrean) supaya bot AppSheet tidak menunggu watermark
// & tidak timeout/retry. Watermark dikerjakan backend oleh trigger drainAntreanP0 (tiap 1 menit).
// Sheet antrean db_WM_Queue dikelola skrip sendiri (dibuat otomatis) — TIDAK perlu ditambah ke aplikasi AppSheet.
// LOCK: enqueueP0Yandal_ & klaim drainAntreanP0 pakai getUserLock (BUKAN getScriptLock) supaya enqueue
//   dari doPost tidak antre di belakang job berat (prosesP0Yandal/recalcTick/refresh*) → doPost WM ~0.2 dtk.
var WM_QUEUE_SHEET = "db_WM_Queue";
var WM_QUEUE_MAX_ATTEMPTS = 5; // setelah gagal sekian kali → status "failed" (berhenti dicoba)
var WM_QUEUE_BATCH = 25; // maksimum item diproses per putaran (jaga < 6 menit limit)
var WM_QUEUE_STALE_MS = 10 * 60 * 1000; // item "processing" lebih tua dari ini dianggap macet → diklaim ulang
// Kolom db_WM_Queue (0-based): id | status | kodeP0 | foto | enqueuedAt | lastTriedAt | attempts

function _wmQueueSheet_() {
  var ss = _ssY_();
  var sh = ss.getSheetByName(WM_QUEUE_SHEET);
  if (!sh) {
    sh = ss.insertSheet(WM_QUEUE_SHEET);
    sh.getRange(1, 1, 1, 7).setValues([
      [
        "id",
        "status",
        "kodeP0",
        "foto",
        "enqueuedAt",
        "lastTriedAt",
        "attempts",
      ],
    ]);
    sh.setFrozenRows(1);
  }
  return sh;
}

// Catat 1 pekerjaan WM ke antrean. Dedup: bila kodeP0+foto yang sama masih "pending"/"processing" → tidak digandakan.
function enqueueP0Yandal_(kodeP0, fotoTarget) {
  if (!kodeP0) return false;
  var foto = String(fotoTarget || "")
    .toLowerCase()
    .trim();
  // LOCK TERPISAH (getUserLock, BUKAN getScriptLock): enqueue ringan ini dipanggil dari doPost,
  // jadi TIDAK ikut antre di belakang job berat (prosesP0Yandal/drainAntreanP0/recalcTick) yang
  // memakai getScriptLock. getUserLock hanya saling-eksklusif dgn klaim drainAntreanP0 (sama-sama
  // sentuh db_WM_Queue) → doPost balas ~0.2 dtk.
  var lock = LockService.getUserLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    Logger.log("enqueueP0Yandal_: gagal lock — " + e);
  }
  try {
    var sh = _wmQueueSheet_();
    var d = sh.getDataRange().getValues();
    for (var i = 1; i < d.length; i++) {
      var st = String(d[i][1]);
      if (
        (st === "pending" || st === "processing") &&
        String(d[i][2]) === String(kodeP0) &&
        String(d[i][3]) === foto
      ) {
        return true; // sudah antre → cukup, jangan dobel
      }
    }
    var id = String(Date.now()) + "-" + Math.floor(Math.random() * 100000);
    sh.appendRow([id, "pending", String(kodeP0), foto, _nowY_(), "", 0]);
    return true;
  } catch (e) {
    Logger.log("enqueueP0Yandal_: ERROR — " + e);
    return false;
  } finally {
    try {
      lock.releaseLock();
    } catch (e2) {}
  }
}

// ====== BACKSTOP: sapu foto belum ter-watermark → enqueue ulang ======
// Menutup celah timing: bila path Foto Asli baru masuk ke sheet SETELAH bot/antrean lewat
// (mis. sinkronisasi AppSheet telat) atau item antrean terlanjur dibuang, foto tetap akan
// diproses dalam <=1 menit. Logika: Foto Asli terisi TAPI Foto WM kosong → enqueue per kolom.
// Dedup ditangani enqueueP0Yandal_ (kodeP0+foto yang masih pending/processing tidak digandakan).
function sweepWmBacklogY() {
  var sh = _shY_(SHEET_YANDAL.P0);
  if (!sh) return 0;
  var d = _allY_(sh);
  var pairs = [
    { src: COL_P0.fotoSebelum, wm: COL_P0.fotoSebelumWm, foto: "sebelum" },
    {
      src: COL_P0.fotoPekerjaan,
      wm: COL_P0.fotoPekerjaanWm,
      foto: "pekerjaan",
    },
    { src: COL_P0.fotoSesudah, wm: COL_P0.fotoSesudahWm, foto: "sesudah" },
  ];
  var n = 0;
  for (var i = 1; i < d.length; i++) {
    var kodeP0 = String(d[i][COL_P0.kodeP0] || "").trim();
    if (!kodeP0) continue;
    for (var p = 0; p < pairs.length; p++) {
      var src = String(d[i][pairs[p].src] || "").trim();
      var wm = String(d[i][pairs[p].wm] || "").trim();
      if (src && !wm) {
        if (enqueueP0Yandal_(kodeP0, pairs[p].foto)) n++;
      } // ada foto, belum ada WM → antre ulang
    }
  }
  // Sapu juga db_Yandal_Pengecekan_Switching (6 foto: Arus + Gangguan 1..5).
  var shSwc = _shY_(SHEET_YANDAL.SWITCHING);
  if (shSwc) {
    var ds = _allY_(shSwc);
    var pairsSwc = [
      {
        src: COL_SWITCHING.fotoArus,
        wm: COL_SWITCHING.fotoArusWm,
        foto: "arus",
      },
      {
        src: COL_SWITCHING.fotoG1,
        wm: COL_SWITCHING.fotoG1Wm,
        foto: "gangguan1",
      },
      {
        src: COL_SWITCHING.fotoG2,
        wm: COL_SWITCHING.fotoG2Wm,
        foto: "gangguan2",
      },
      {
        src: COL_SWITCHING.fotoG3,
        wm: COL_SWITCHING.fotoG3Wm,
        foto: "gangguan3",
      },
      {
        src: COL_SWITCHING.fotoG4,
        wm: COL_SWITCHING.fotoG4Wm,
        foto: "gangguan4",
      },
      {
        src: COL_SWITCHING.fotoG5,
        wm: COL_SWITCHING.fotoG5Wm,
        foto: "gangguan5",
      },
    ];
    for (var r = 1; r < ds.length; r++) {
      var kodeSwc = String(ds[r][COL_SWITCHING.kodeSwitching] || "").trim();
      if (!kodeSwc) continue;
      for (var q = 0; q < pairsSwc.length; q++) {
        var srcS = String(ds[r][pairsSwc[q].src] || "").trim();
        var wmS = String(ds[r][pairsSwc[q].wm] || "").trim();
        if (srcS && !wmS) {
          if (enqueueP0Yandal_(kodeSwc, pairsSwc[q].foto)) n++;
        }
      }
    }
  }
  if (n)
    Logger.log(
      "sweepWmBacklogY: enqueue ulang " + n + " foto belum ter-watermark",
    );
  return n;
}

// Trigger backend (tiap 1 menit): proses antrean WM saja. Klaim → proses tanpa lock → finalisasi.
function drainAntreanP0() {
  // 19 Agu malam 4: sweepWmBacklogY DIPINDAH ke trigger terpisah 15 mnt (createSweepWmBacklogTriggerY) —
  // sweep = scan PENUH 2 sheet (P0 + Switching); dijalankan tiap 1 mnt di sini = pembeban slot eksekusi terbesar.
  var sh = _wmQueueSheet_();

  // Fase 1 — KLAIM item (lock singkat): tandai "processing" agar drain lain tidak ikut memproses item sama.
  var claimed = [];
  // getUserLock: sama dgn enqueueP0Yandal_ (saling-eksklusif utk db_WM_Queue), lepas dari getScriptLock
  // yang dipakai job berat → klaim antrean tidak tertahan & doPost enqueue tetap cepat.
  var lock = LockService.getUserLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    Logger.log("drainAntreanP0: gagal lock klaim — " + e);
    return;
  }
  try {
    var d = sh.getDataRange().getValues();
    var nowMs = Date.now();
    for (var i = 1; i < d.length && claimed.length < WM_QUEUE_BATCH; i++) {
      var st = String(d[i][1]);
      var lastMs = _toMillisY_(d[i][5]);
      var staleProc =
        st === "processing" &&
        !isNaN(lastMs) &&
        nowMs - lastMs > WM_QUEUE_STALE_MS;
      if (st === "pending" || staleProc) {
        d[i][1] = "processing";
        d[i][5] = new Date(nowMs);
        claimed.push({
          id: String(d[i][0]),
          kodeP0: String(d[i][2]),
          foto: String(d[i][3]),
        });
      }
    }
    if (claimed.length) sh.getDataRange().setValues(d);
  } catch (e) {
    Logger.log("drainAntreanP0: ERROR klaim — " + e);
  } finally {
    try {
      lock.releaseLock();
    } catch (e2) {}
  }
  if (!claimed.length) return;

  // Fase 2 — PROSES tanpa lock (prosesP0Yandal memakai LockService sendiri → tidak deadlock).
  var hasil = {};
  for (var j = 0; j < claimed.length; j++) {
    var it = claimed[j];
    try {
      if (
        String(it.kodeP0).indexOf("-SWC.") >= 0 ||
        String(it.kodeP0).indexOf("-SWT.") >= 0
      )
        prosesSwitchingYandal(it.kodeP0, it.foto); // item Pengecekan Switching (kode mengandung -SWC. / -SWT. lama utk data lama)
      else prosesP0Yandal(it.kodeP0, it.foto);
      hasil[it.id] = "done";
    } catch (e) {
      Logger.log("drainAntreanP0: proses gagal kode=" + it.kodeP0 + " — " + e);
      hasil[it.id] = "retry";
    }
  }

  // Fase 3 — FINALISASI (lock singkat): hapus yang "done", kembalikan "pending" utk retry, "failed" bila lewat batas.
  try {
    lock.waitLock(15000);
  } catch (e) {
    Logger.log("drainAntreanP0: gagal lock final — " + e);
    return;
  }
  try {
    var d2 = sh.getDataRange().getValues();
    var delRows = [];
    for (var k = 1; k < d2.length; k++) {
      var id = String(d2[k][0]);
      if (!(id in hasil)) continue;
      if (hasil[id] === "done") {
        delRows.push(k + 1);
      } else {
        var att = Number(d2[k][6] || 0) + 1;
        d2[k][6] = att;
        d2[k][1] = att >= WM_QUEUE_MAX_ATTEMPTS ? "failed" : "pending";
      }
    }
    sh.getDataRange().setValues(d2);
    delRows.sort(function (a, b) {
      return b - a;
    }); // hapus dari bawah agar indeks tidak bergeser
    for (var m = 0; m < delRows.length; m++) sh.deleteRow(delRows[m]);
  } catch (e) {
    Logger.log("drainAntreanP0: ERROR final — " + e);
  } finally {
    try {
      lock.releaseLock();
    } catch (e2) {}
  }
}

// SETUP sekali: pasang trigger time-driven drainAntreanP0 setiap 1 menit (jalankan manual dari editor).
// Lepas trigger antrean. CATATAN: mode sinkron sudah DIMATIKAN di doPost (fast sync), jadi tanpa trigger ini Foto WM TIDAK akan diproses sama sekali. Lepas hanya bila benar-benar perlu.
function hapusWmDrainTriggerY() {
  var trs = ScriptApp.getProjectTriggers(),
    n = 0;
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === "drainAntreanP0") {
      ScriptApp.deleteTrigger(trs[i]);
      n++;
    }
  Logger.log("Trigger drainAntreanP0 dihapus: " + n);
}

// SETUP sekali (19 Agu malam 4): trigger TERPISAH utk sweepWmBacklogY — default 15 menit.
// Sebelumnya sweep dipanggil di dalam drainAntreanP0 TIAP 1 MENIT — padahal sweep = scan penuh 2 sheet
// (db_Yandal_P0 + Switching) → salah satu pembeban slot eksekusi terbesar saat sheet sibuk. Foto tetap masuk
// antrean seketika lewat webhook enqueueP0Yandal_; sweep ini HANYA backstop celah timing (15 mnt cukup).
// Setelah deploy: jalankan fungsi ini SEKALI dari editor (pilih namanya → Run) agar trigger terpasang.
// Lepas trigger backstop sweep WM.
function hapusSweepWmBacklogTriggerY() {
  var trs = ScriptApp.getProjectTriggers(),
    n = 0;
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === "sweepWmBacklogY") {
      ScriptApp.deleteTrigger(trs[i]);
      n++;
    }
  Logger.log("Trigger sweepWmBacklogY dihapus: " + n);
}

// ====== (WA builder Yandal di-skip dulu — format WA belum ada) ======

// ====== PROSES SHIFT (bot db_Yandal_Shift, Adds) ======
function prosesShiftYandal(kodeShift) {
  var sh = _shY_(SHEET_YANDAL.SHIFT);
  var f = _findRowY_(sh, COL_YANDAL_SHIFT.kodeShift, kodeShift);
  if (!f) return;
  if (!f.row[COL_YANDAL_SHIFT.timestamp])
    _setY_(sh, f.rowNum, COL_YANDAL_SHIFT.timestamp, _nowY_());
  var tgl = f.row[COL_YANDAL_SHIFT.tanggal];
  if (tgl) _setY_(sh, f.rowNum, COL_YANDAL_SHIFT.hari, _hariY_(new Date(tgl)));
  recalcJumlahP0_(kodeShift);
}

// ====== PROSES P0 (bot db_Yandal_P0, Adds + Updates) ======
function prosesP0Yandal(kodeP0, fotoTarget) {
  // fotoTarget opsional: "sebelum" | "pekerjaan" | "sesudah" (kosong = proses semua foto yang ada)
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (eLock) {
    Logger.log("prosesP0Yandal: gagal ambil lock — " + eLock);
  }
  try {
    var sh = _shY_(SHEET_YANDAL.P0);
    if (!sh) {
      Logger.log("prosesP0Yandal: sheet '" + SHEET_YANDAL.P0 + "' TIDAK ADA");
      return;
    }
    var f = _findRowY_(sh, COL_P0.kodeP0, kodeP0);
    if (!f) {
      Logger.log("prosesP0Yandal: baris kodeP0 tak ditemukan — " + kodeP0);
      return;
    }
    var rowNum = f.rowNum,
      row = f.row,
      kodeShift = row[COL_P0.kodeShift];

    // 0) DURASI — START = WAKTU DEVICE (Time Stamp Pembuatan, AppSheet NOW() saat Foto Sebelum), END = WAKTU DEVICE (Time Stamp Sesudah, beku saat Foto Sesudah diambil).
    //    Keduanya waktu device (offline-safe) → durasi BEKU saat closing diambil; form dibiarkan terbuka / sync telat TIDAK menambah durasi (anti-manipulasi).
    //    Time Stamp Website tetap dicatat skrip (audit) tapi bukan lagi END. Durasi = END − START.
    try {
      _recalcDurasiRowY_(sh, rowNum);
    } catch (eDur) {
      Logger.log("prosesP0Yandal: recalc durasi gagal — " + eDur);
    }

    // 1–3b) Lookup, Time Stamp, watermark, folder — dibungkus agar error di sini TIDAK menggagalkan recalc
    try {
      // 1) LOOKUP Tim, Petugas, Kode Header dari Shift
      var fS = _findRowY_(
        _shY_(SHEET_YANDAL.SHIFT),
        COL_YANDAL_SHIFT.kodeShift,
        kodeShift,
      );
      var tim = "",
        petugas = "",
        kodeHeader = row[COL_P0.kodeHeader];
      if (fS) {
        tim = fS.row[COL_YANDAL_SHIFT.tim];
        petugas = fS.row[COL_YANDAL_SHIFT.petugas];
        _setY_(sh, rowNum, COL_P0.tim, tim);
        _setY_(sh, rowNum, COL_P0.petugas, petugas);
        if (!kodeHeader) {
          kodeHeader = fS.row[COL_YANDAL_SHIFT.kodeHeader];
          _setY_(sh, rowNum, COL_P0.kodeHeader, kodeHeader);
        }
      }

      // 2) Time Stamp + Hari — Time Stamp Pembuatan (V) diisi AppSheet (NOW() di device); skrip TIDAK menimpa.
      //    Time Stamp Pekerjaan (AA) & Time Stamp Sesudah (AF) = DateTime + Reset on edit ISBLANK([Foto ...]) saat foto terkait diisi.
      var hariVal = row[COL_P0.hari];
      if (row[COL_P0.tanggal]) {
        hariVal = _hariY_(new Date(row[COL_P0.tanggal]));
        _setY_(sh, rowNum, COL_P0.hari, hariVal);
      }

      // jam per foto dari timestamp masing-masing (fallback ke Time Stamp Pembuatan bila timestamp foto kosong)
      var jamPembuatan = _jamHHmm_(row[COL_P0.timestampPembuatan]); // Foto Sebelum
      var jamPekerjaan =
        _jamHHmm_(row[COL_P0.timestampPekerjaan]) || jamPembuatan; // Foto Pekerjaan
      var jamSesudah = _jamHHmm_(row[COL_P0.timestampSesudah]) || jamPembuatan; // Foto Sesudah

      // 3) Watermark 3 foto — info untuk Tek-Watermark.gs (gaya GPS Map Camera, 3 kartu)
      //    Header: ULP (kolom E) + "<Tim> (<Petugas>)" | jam dari timestamp foto masing-masing | hari (F) + tanggal (G)
      //    Bullet: penyulang (J), daerah (L), koordinat (M); durasi (AN) & jarak Closing→Pekerjaan (S) hanya pada Foto Sesudah.
      var info = {
        ulp: row[COL_P0.ulp], // kolom E
        tim: tim, // kolom P (hasil lookup Shift)
        petugas: petugas, // kolom Q (hasil lookup Shift)
        jam: jamPembuatan, // default = jam Foto Sebelum (Time Stamp Pembuatan)
        hari: hariVal, // kolom F
        tanggal: _tglDMY_(row[COL_P0.tanggal]), // kolom G -> "04 Juni 2026"
        penyulang: row[COL_P0.penyulang], // kolom J
        daerah: row[COL_P0.daerah], // kolom L
        koordinat: row[COL_P0.koordinat], // kolom M
        lat: row[COL_P0.lat],
        long: row[COL_P0.long], // utk mini-map
      };
      // Salinan info Foto Pekerjaan dengan jam-nya sendiri (+ jarak antar P0 / kolom T → tampil di watermark Foto Pekerjaan).
      var infoPekerjaan = {};
      for (var kp in info) infoPekerjaan[kp] = info[kp];
      infoPekerjaan.jam = jamPekerjaan;
      // Salinan info khusus Foto Sesudah: jam sendiri + durasi (AO) & jarak Closing→Pekerjaan (S) — dibaca ulang setelah recalc.
      var durasiVal = String(
        sh.getRange(rowNum, COL_P0.durasi + 1).getValue() || "",
      );
      var jarakVal = "";
      try {
        jarakVal = _recalcJarakRowY_(sh, rowNum);
      } catch (eJrk) {
        Logger.log("prosesP0Yandal: recalc jarak gagal — " + eJrk);
      }
      var jarakP0Val = "";
      try {
        jarakP0Val = _recalcJarakAntarP0RowY_(sh, rowNum);
      } catch (eJ2) {
        Logger.log("prosesP0Yandal: recalc jarak antar P0 gagal — " + eJ2);
      } // jarak P0 terbaru → P0 sebelumnya (shift sama) → kolom T
      infoPekerjaan.jarakP0 = jarakP0Val; // Jarak Antar P0 (T) tampil di watermark FOTO PEKERJAAN
      var infoSesudah = {};
      for (var k in info) infoSesudah[k] = info[k];
      infoSesudah.jam = jamSesudah;
      infoSesudah.durasi = durasiVal;
      infoSesudah.jarak = jarakVal;
      // Foto Sesudah (closing) DIAMBIL DI LOKASI CLOSING → koordinat teks & mini-map watermark pakai Koordinat/Lat/Long Closing (P/Q/R), bukan koordinat pekerjaan (M/N/O). Fallback ke koordinat pekerjaan bila closing kosong.
      var koorClosingY = row[COL_P0.koordinatClosing],
        latClosingY = row[COL_P0.latClosing],
        lonClosingY = row[COL_P0.longClosing];
      if (
        String(koorClosingY || "") !== "" ||
        (String(latClosingY || "") !== "" && String(lonClosingY || "") !== "")
      ) {
        infoSesudah.koordinat = koorClosingY;
        infoSesudah.lat = latClosingY;
        infoSesudah.long = lonClosingY;
      }

      // Folder per-baris dari kolom folderPath (path relatif AppSheet) — sumber foto & tujuan hasil
      var rowFolder = null;
      var folderRel = row[COL_P0.folderPath];
      try {
        if (folderRel) rowFolder = _folderFromRelPathY_(folderRel);
      } catch (eFld) {
        Logger.log("Resolve folderPath gagal (pakai fallback): " + eFld);
      }

      // Sumber = Foto Asli (W/AB/AG); hasil path relatif WM → Foto WM (X/AC/AH). Link Download (Z/AE/AJ) diisi skrip = link download paksa Drive (usercontent/download); "Foto ... URL" (Y/AD/AI) = signed, tidak disentuh skrip.
      // PROSES PER-KOLOM: watermark hanya foto yang ditambah/diedit (fotoTarget). Kosong = proses ketiganya.
      // Tiap foto independen & idempoten → walau hanya 1 foto diinput, WM-nya tetap terbentuk; foto kosong dilewati/dibersihkan.
      var t = String(fotoTarget || "")
        .toLowerCase()
        .trim();
      if (!t || t === "sebelum")
        _wmFotoY_(
          sh,
          rowNum,
          COL_P0.fotoSebelum,
          COL_P0.fotoSebelumWm,
          COL_P0.linkDownloadSebelum,
          info,
          rowFolder,
          folderRel,
        );
      if (!t || t === "pekerjaan")
        _wmFotoY_(
          sh,
          rowNum,
          COL_P0.fotoPekerjaan,
          COL_P0.fotoPekerjaanWm,
          COL_P0.linkDownloadPekerjaan,
          infoPekerjaan,
          rowFolder,
          folderRel,
        );
      if (!t || t === "sesudah")
        _wmFotoY_(
          sh,
          rowNum,
          COL_P0.fotoSesudah,
          COL_P0.fotoSesudahWm,
          COL_P0.linkDownloadSesudah,
          infoSesudah,
          rowFolder,
          folderRel,
        );
      // Catatan: kolom "Tampilan Foto ..." (=IMAGE di Sheet) & folderPath TIDAK ditimpa skrip.
    } catch (ePre) {
      Logger.log(
        "prosesP0Yandal: error pra-recalc (dilewati, recalc tetap jalan) — " +
          ePre,
      );
    }

    // 4) Jumlah P0 — SELALU dijalankan, walau langkah di atas gagal
    if (kodeShift) {
      recalcJumlahP0_(kodeShift);
      Logger.log(
        "prosesP0Yandal: recalc OK utk kodeShift=" +
          kodeShift +
          " (kodeP0=" +
          kodeP0 +
          ")",
      );
    } else {
      Logger.log(
        "prosesP0Yandal: kodeShift KOSONG di baris P0 " +
          kodeP0 +
          " → Jumlah P0 tidak bisa dihitung",
      );
    }
  } catch (eMain) {
    Logger.log("prosesP0Yandal: ERROR utama — " + eMain);
  } finally {
    try {
      lock.releaseLock();
    } catch (eRel) {}
  }
}

// ====== PROSES PENGECEKAN SWITCHING (bot db_Yandal_Pengecekan_Switching, Adds + Updates) ======
// Cucu dari P0. Watermark 6 foto (Arus + Gangguan 1..5). Lokasi GPS dari kolom Koordinat/Lat/Long baris ini.
// Konteks ULP/Hari/Tanggal/Tim/Petugas kini kolom sendiri (fallback LOOKUP P0 bila kosong). Daerah tetap di-LOOKUP dari P0.
// Jam watermark SEMUA foto = "Jam Pengecekan" (satu nilai). Nama Switching & Arus R/S/T tampil sbg bullet (engine ber-field switching & arus).
function prosesSwitchingYandal(kodeSwitching, fotoTarget) {
  // fotoTarget opsional: "arus" | "gangguan1".."gangguan5" (kosong = semua foto yang ada)
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (eLock) {
    Logger.log("prosesSwitchingYandal: gagal ambil lock — " + eLock);
  }
  try {
    var sh = _shY_(SHEET_YANDAL.SWITCHING);
    if (!sh) {
      Logger.log(
        "prosesSwitchingYandal: sheet '" +
          SHEET_YANDAL.SWITCHING +
          "' TIDAK ADA",
      );
      return;
    }
    var f = _findRowY_(sh, COL_SWITCHING.kodeSwitching, kodeSwitching);
    if (!f) {
      Logger.log(
        "prosesSwitchingYandal: baris tak ditemukan — " + kodeSwitching,
      );
      return;
    }
    var rowNum = f.rowNum,
      row = f.row,
      kodeP0 = row[COL_SWITCHING.kodeP0];

    // Konteks: pakai nilai BARIS SWITCHING (ULP/Hari/Tanggal/Tim/Petugas kini kolom sendiri); bila kosong → LOOKUP dari P0 induk lalu tulis balik.
    // Daerah tetap di-LOOKUP dari P0 (tidak ada kolomnya di sheet switching).
    var ulp = row[COL_SWITCHING.ulp],
      tanggalRaw = row[COL_SWITCHING.tanggal],
      hari = row[COL_SWITCHING.hari];
    var tim = row[COL_SWITCHING.tim],
      petugas = row[COL_SWITCHING.petugas],
      daerah = "";
    var fP = kodeP0
      ? _findRowY_(_shY_(SHEET_YANDAL.P0), COL_P0.kodeP0, kodeP0)
      : null;
    if (fP) {
      daerah = fP.row[COL_P0.daerah];
      if (!ulp) {
        ulp = fP.row[COL_P0.ulp];
        if (ulp) _setY_(sh, rowNum, COL_SWITCHING.ulp, ulp);
      }
      if (!tanggalRaw) {
        tanggalRaw = fP.row[COL_P0.tanggal];
        if (tanggalRaw) _setY_(sh, rowNum, COL_SWITCHING.tanggal, tanggalRaw);
      }
      if (!tim) {
        tim = fP.row[COL_P0.tim];
        if (tim) _setY_(sh, rowNum, COL_SWITCHING.tim, tim);
      }
      if (!petugas) {
        petugas = fP.row[COL_P0.petugas];
        if (petugas) _setY_(sh, rowNum, COL_SWITCHING.petugas, petugas);
      }
    }
    if (!hari && tanggalRaw) {
      hari = _hariY_(new Date(tanggalRaw));
      _setY_(sh, rowNum, COL_SWITCHING.hari, hari);
    }
    var tanggal = _tglDMY_(tanggalRaw);

    // Jam watermark = "Jam Pengecekan" (satu nilai utk semua foto). Dukung Date/serial/teks.
    var jam =
      _jamHHmm_(row[COL_SWITCHING.jamPengecekan]) ||
      String(row[COL_SWITCHING.jamPengecekan] || "");

    // Bullet Arus R/S/T (hanya nilai yang ada)
    var arusArr = [];
    if (String(row[COL_SWITCHING.arusR] || "") !== "")
      arusArr.push("R " + row[COL_SWITCHING.arusR]);
    if (String(row[COL_SWITCHING.arusS] || "") !== "")
      arusArr.push("S " + row[COL_SWITCHING.arusS]);
    if (String(row[COL_SWITCHING.arusT] || "") !== "")
      arusArr.push("T " + row[COL_SWITCHING.arusT]);
    var arus = arusArr.length ? arusArr.join(" / ") + " A" : "";

    // info utk Tek-Watermark.gs — koordinat/lat/long dari baris switching (lokasi titik switching).
    var info = {
      ulp: ulp,
      tim: tim,
      petugas: petugas,
      jam: jam,
      hari: hari,
      tanggal: tanggal,
      penyulang: row[COL_SWITCHING.penyulang],
      daerah: daerah,
      switching: row[COL_SWITCHING.namaSwitching], // bullet "Switching : ..."
      arus: arus, // bullet "Arus (R/S/T) : ..."
      koordinat: row[COL_SWITCHING.koordinat],
      lat: row[COL_SWITCHING.lat],
      long: row[COL_SWITCHING.long],
    };

    // Folder per-baris dari kolom folderPath (path relatif AppSheet)
    var rowFolder = null,
      folderRel = row[COL_SWITCHING.folderPath];
    try {
      if (folderRel) rowFolder = _folderFromRelPathY_(folderRel);
    } catch (eFld) {
      Logger.log("Resolve folderPath switching gagal: " + eFld);
    }

    // 6 foto: Arus + Gangguan 1..5 (independen & idempoten; kosong dilewati/dibersihkan)
    var fotos = [
      {
        key: "arus",
        src: COL_SWITCHING.fotoArus,
        wm: COL_SWITCHING.fotoArusWm,
        url: COL_SWITCHING.linkDownloadArus,
      },
      {
        key: "gangguan1",
        src: COL_SWITCHING.fotoG1,
        wm: COL_SWITCHING.fotoG1Wm,
        url: COL_SWITCHING.linkDownloadG1,
      },
      {
        key: "gangguan2",
        src: COL_SWITCHING.fotoG2,
        wm: COL_SWITCHING.fotoG2Wm,
        url: COL_SWITCHING.linkDownloadG2,
      },
      {
        key: "gangguan3",
        src: COL_SWITCHING.fotoG3,
        wm: COL_SWITCHING.fotoG3Wm,
        url: COL_SWITCHING.linkDownloadG3,
      },
      {
        key: "gangguan4",
        src: COL_SWITCHING.fotoG4,
        wm: COL_SWITCHING.fotoG4Wm,
        url: COL_SWITCHING.linkDownloadG4,
      },
      {
        key: "gangguan5",
        src: COL_SWITCHING.fotoG5,
        wm: COL_SWITCHING.fotoG5Wm,
        url: COL_SWITCHING.linkDownloadG5,
      },
    ];
    var t = String(fotoTarget || "")
      .toLowerCase()
      .trim();
    for (var i = 0; i < fotos.length; i++) {
      if (!t || t === fotos[i].key)
        _wmFotoY_(
          sh,
          rowNum,
          fotos[i].src,
          fotos[i].wm,
          fotos[i].url,
          info,
          rowFolder,
          folderRel,
        );
    }
  } catch (eMain) {
    Logger.log("prosesSwitchingYandal: ERROR utama — " + eMain);
  } finally {
    try {
      lock.releaseLock();
    } catch (eRel) {}
  }
}

// ====== APPROVAL P0 (untuk SIE-Teknik Tab "Approval P0") ======
// Dipanggil LANGSUNG via google.script.run (bukan webhook doPost).

// Ambil fileId dari Link Download / Foto URL -> URL thumbnail (utk <img>) + view (buka file).
function _p0FotoObj_(row, linkCol, urlCol) {
  var id = "";
  var cand = [String(row[linkCol] || ""), String(row[urlCol] || "")];
  for (var i = 0; i < cand.length && !id; i++) {
    var m =
      cand[i].match(/[?&]id=([-\w]{20,})/) ||
      cand[i].match(/\/d\/([-\w]{20,})/);
    if (m) id = m[1];
  }
  if (!id) return { has: false, thumb: "", full: "" };
  return {
    has: true,
    thumb: "https://drive.google.com/thumbnail?id=" + id + "&sz=w400",
    full: "https://drive.google.com/file/d/" + id + "/view",
  };
}

// Daftar P0 utk approval. params: { tanggal?, ulp?, status? }  status: 'Menunggu'|'Approved'|'Rejected'
// KRITERIA STATUS — SATU SUMBER, dipakai versi web (SIE-Teknik via google.script.run) & mobile
// (apiRouter_ memetakan getMobileApprovalP0List → fungsi ini):
//   • Approved / Rejected = nilai eksplisit kolom Status Approval (AO)
//   • Menunggu = Status Approval kosong TAPI ke-3 foto sudah punya URL
//   • Foto belum lengkap & belum diputuskan → TIDAK tampil di daftar mana pun
// Response menyertakan counts per status (mengikuti filter ulp+tanggal) untuk badge tab mobile.
var APPR_PENDING_CACHE_PREFIX = "apprPendingDecision_";
var APPR_PENDING_CACHE_TTL = 3600;
function _apprPendingCacheKey_(kodeP0) {
  return APPR_PENDING_CACHE_PREFIX + String(kodeP0 || "");
}
function _apprRememberPendingDecision_(kodeP0, keputusan) {
  try {
    CacheService.getScriptCache().put(
      _apprPendingCacheKey_(kodeP0),
      String(keputusan || ""),
      APPR_PENDING_CACHE_TTL,
    );
  } catch (e) {}
}

function getApprovalP0List(params) {
  try {
    params = params || {};
    var ulpFilter = String(params.ulp || "").trim();
    var tglFilter = params.tanggal ? _normTgl(params.tanggal) : "";
    var statusFilter = String(params.status || "Menunggu").trim(); // default: hanya yang menunggu approval
    var sh = _shY_(SHEET_YANDAL.P0);
    if (!sh || sh.getLastRow() <= 1)
      return {
        ok: true,
        list: [],
        counts: { Menunggu: 0, Approved: 0, Rejected: 0 },
      };
    var d = _allY_(sh),
      C = COL_P0,
      out = [],
      pendingKeys = [],
      pendingByKey = {};
    for (var pk = 1; pk < d.length; pk++) {
      var pendingKode = String(d[pk][C.kodeP0] || "").trim();
      if (pendingKode) pendingKeys.push(_apprPendingCacheKey_(pendingKode));
    }
    try { pendingByKey = CacheService.getScriptCache().getAll(pendingKeys) || {}; } catch (eCache) {}
    var counts = { Menunggu: 0, Approved: 0, Rejected: 0 };
    for (var i = 1; i < d.length; i++) {
      var kodeP0 = String(d[i][C.kodeP0] || "").trim();
      if (!kodeP0) continue;
      var ulp = String(d[i][C.ulp] || "").trim();
      if (ulpFilter && ulp !== ulpFilter) continue;
      var tgl = _normTgl(d[i][C.tanggal]);
      if (tglFilter && tgl !== tglFilter) continue;

      var fSeb = _p0FotoObj_(d[i], C.linkDownloadSebelum, C.fotoSebelumUrl);
      var fPek = _p0FotoObj_(d[i], C.linkDownloadPekerjaan, C.fotoPekerjaanUrl);
      var fSes = _p0FotoObj_(d[i], C.linkDownloadSesudah, C.fotoSesudahUrl);
      var fotoLengkap = fSeb.has && fPek.has && fSes.has; // ke-3 foto sudah punya URL

      // Status approval hanya 2 nilai nyata: Approved / Rejected. Selain itu efektif "Menunggu",
      // TAPI hanya P0 yang ke-3 fotonya sudah ada URL & status approval masih kosong yang masuk antrean approval.
      var raw = String(d[i][C.statusApproval] || "").trim();
      var pendingDecision = String(pendingByKey[_apprPendingCacheKey_(kodeP0)] || "").trim();
      var status;
      if (raw === "Approved" || raw === "Rejected") status = raw;
      else if (pendingDecision === "Approved" || pendingDecision === "Rejected") status = pendingDecision;
      else if (fotoLengkap) status = "Menunggu";
      else continue; // foto belum lengkap & belum diputuskan → belum masuk approval admin

      counts[status]++; // badge tab: hitung SEMUA status (filter ulp+tanggal tetap berlaku)
      if (statusFilter && status.toLowerCase() !== statusFilter.toLowerCase())
        continue;
      out.push({
        kodeP0: kodeP0,
        ulp: ulp,
        hari: String(d[i][C.hari] || ""),
        tanggal: tgl,
        namaPekerjaan:
          String(d[i][C.namaPekerjaan] || "").trim() ||
          String(d[i][C.pekerjaanLainnya] || "").trim(),
        penyulang: String(d[i][C.penyulang] || ""),
        section: String(d[i][C.section] || ""),
        daerah: String(d[i][C.daerah] || ""),
        tim: String(d[i][C.tim] || ""),
        petugas: String(d[i][C.petugas] || ""),
        durasi: String(d[i][C.durasi] || ""),
        jarakAntarP0: String(d[i][C.jarakAntarP0] || ""),
        jarakClosing: String(d[i][C.jarak] || ""),
        catatan: String(d[i][C.catatan] || ""), // BARU — kolom Catatan (AM) tampil di card & detail
        koordinat: String(d[i][C.koordinat] || ""),
        koordinatClosing: String(d[i][C.koordinatClosing] || ""),
        fotoSebelum: fSeb,
        fotoPekerjaan: fPek,
        fotoSesudah: fSes,
        status: status,
        approvedBy: String(d[i][C.approvedBy] || ""),
        alasanRejected: String(d[i][C.alasanRejected] || ""), // BARU — tampil di detail kartu Rejected
        point: String(d[i][C.point] || ""), // BARU — tampil di detail kartu Approved
        timestampApprove: d[i][C.timestampApprove]
          ? _tglDMY_(d[i][C.timestampApprove])
          : "",
      });
    }
    out.sort(function (a, b) {
      var ra = a.status === "Menunggu" ? 0 : 1,
        rb = b.status === "Menunggu" ? 0 : 1;
      if (ra !== rb) return ra - rb;
      return String(b.tanggal || "").localeCompare(String(a.tanggal || ""));
    });
    return { ok: true, list: out, counts: counts };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Set keputusan approval. params: { kodeP0, keputusan:'Approved'|'Rejected', username?, alasan? }
// alasan (khusus Rejected) → kolom "Alasan Rejected" (AQ / indeks 42); dikosongkan lagi saat Approved.
// REV 19 Agu 2026 — MODE ANTREAN (backlog): fungsi ini HANYA mencatat keputusan ke db_Approval_Queue lalu
// balas SEKETIKA — UI mobile tidak menunggu. Penulisan Status Approval + hitung Point dikerjakan backend
// oleh drainAntreanApprovalP0 (tiap 1 menit). Web SIE-Teknik TIDAK terpengaruh (response tetap ok:true).
function setApprovalP0(params) {
  try {
    params = params || {};
    var kodeP0 = String(params.kodeP0 || "").trim();
    var keputusan = String(params.keputusan || "").trim();
    var approver = String(params.username || params.approvedBy || "").trim();
    var alasan = String(params.alasan || "").trim();
    if (!kodeP0) return { ok: false, error: "kodeP0 wajib diisi." };
    if (["Approved", "Rejected"].indexOf(keputusan) < 0)
      return { ok: false, error: "Keputusan harus Approved atau Rejected." };
    if (keputusan === "Rejected" && !alasan)
      return { ok: false, error: "Alasan penolakan wajib diisi." };
    // JALUR CEPAT (malam 2): titipkan ke inbox PROPERTY (ScriptProperties) dulu — TANPA menyentuh spreadsheet,
    // jadi kebal macetnya backend Sheets (openById = bagian yang macet saat project sibuk).
    // Fallback langka (inbox penuh/lock gagal): baris enqueueApprovalP0_ di bawah menulis langsung ke sheet.
    var antre = _apprInboxPush_(kodeP0, keputusan, approver, alasan);
    if (antre !== true)
      antre = enqueueApprovalP0_(kodeP0, keputusan, approver, alasan);
    if (antre !== true)
      return { ok: false, error: "Keputusan gagal masuk antrean. Silakan coba lagi." };
    _apprRememberPendingDecision_(kodeP0, keputusan);
    return {
      ok: true,
      queued: antre,
      mode: "queued",
      kodeP0: kodeP0,
      status: keputusan,
      approvedBy: approver,
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ====== ANTREAN APPROVAL P0 (backend — UI tidak menunggu) ======
// Pola sama dgn antrean WM (db_WM_Queue): request hanya mencatat; trigger tiap 1 menit memproses.
// Sheet antrean db_Approval_Queue dikelola skrip sendiri (dibuat otomatis) — TIDAK perlu ditambah ke AppSheet.
var APPR_QUEUE_SHEET = "db_Approval_Queue";
var APPR_QUEUE_MAX_ATTEMPTS = 5; // setelah gagal sekian kali → status "failed" (berhenti dicoba)
var APPR_QUEUE_BATCH = 25; // maksimum item diproses per putaran
var APPR_QUEUE_STALE_MS = 10 * 60 * 1000; // item "processing" lebih tua dari ini dianggap macet → diklaim ulang
// Kolom db_Approval_Queue (0-based): id | status | kodeP0 | keputusan | username | alasan | enqueuedAt | lastTriedAt | attempts

function _apprQueueSheet_() {
  var ss = _ssY_();
  var sh = ss.getSheetByName(APPR_QUEUE_SHEET);
  if (!sh) {
    sh = ss.insertSheet(APPR_QUEUE_SHEET);
    sh.getRange(1, 1, 1, 9).setValues([
      [
        "id",
        "status",
        "kodeP0",
        "keputusan",
        "username",
        "alasan",
        "enqueuedAt",
        "lastTriedAt",
        "attempts",
      ],
    ]);
    sh.setFrozenRows(1);
  }
  return sh;
}

// Catat 1 keputusan ke antrean. Dedup: kodeP0 yang masih "pending"/"processing" → barisnya DIPERBARUI
// (keputusan terbaru menang), tidak digandakan. getUserLock (BUKAN script lock) → tidak antre di belakang job berat.
function enqueueApprovalP0_(kodeP0, keputusan, username, alasan) {
  if (!kodeP0) return false;
  var lock = LockService.getUserLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    Logger.log("enqueueApprovalP0_: gagal lock — " + e);
  }
  try {
    var sh = _apprQueueSheet_();
    var d = sh.getDataRange().getValues();
    for (var i = 1; i < d.length; i++) {
      var st = String(d[i][1]);
      if (
        (st === "pending" || st === "processing") &&
        String(d[i][2]) === String(kodeP0)
      ) {
        var rowNum = i + 1;
        sh.getRange(rowNum, 4).setValue(String(keputusan));
        sh.getRange(rowNum, 5).setValue(String(username || ""));
        sh.getRange(rowNum, 6).setValue(String(alasan || ""));
        return true;
      }
    }
    var id = String(Date.now()) + "-" + Math.floor(Math.random() * 100000);
    sh.appendRow([
      id,
      "pending",
      String(kodeP0),
      String(keputusan),
      String(username || ""),
      String(alasan || ""),
      _nowY_(),
      "",
      0,
    ]);
    return true;
  } catch (e) {
    Logger.log("enqueueApprovalP0_: ERROR — " + e);
    return false;
  } finally {
    try {
      lock.releaseLock();
    } catch (e2) {}
  }
}

// Eksekutor 1 item antrean (dipanggil drain): tulis Status/ApprovedBy/Timestamp/Alasan + Point (bila Approved).
function _prosesAntreanApprovalY_(item) {
  var sh = _shY_(SHEET_YANDAL.P0);
  var f = _findRowY_(sh, COL_P0.kodeP0, item.kodeP0);
  if (!f) throw new Error("Baris P0 tidak ditemukan: " + item.kodeP0);
  _setY_(sh, f.rowNum, COL_P0.statusApproval, item.keputusan);
  _setTextY_(sh, f.rowNum, COL_P0.approvedBy, item.username);
  _setDateFmtY_(sh, f.rowNum, COL_P0.timestampApprove, _nowY_());
  // Alasan penolakan → kolom "Alasan Rejected" (AQ): diisi saat Rejected, dikosongkan saat Approved.
  _setTextY_(
    sh,
    f.rowNum,
    COL_P0.alasanRejected,
    item.keputusan === "Rejected" ? item.alasan : "",
  );
  // Point (AR): dihitung saat Approved; dikosongkan saat Rejected.
  if (item.keputusan === "Approved") {
    try {
      hitungPointP0Yandal(item.kodeP0);
    } catch (ePt) {
      Logger.log("antrean approval: hitung point gagal — " + ePt);
    }
  } else {
    try {
      _setY_(sh, f.rowNum, COL_P0.point, "");
    } catch (eClr) {}
  }
}

// Trigger backend (tiap 1 menit): klaim (lock singkat) → proses tanpa lock → finalisasi. (Pola drainAntreanP0.)
// ====== INBOX CEPAT APPROVAL (ScriptProperties) — Rev 19 Agu 2026 (malam 3: LOCK-FREE) ======
// Respons approve TIDAK menyentuh spreadsheet DAN tidak menunggu lock apa pun: keputusan dititipkan
// sebagai SATU PROPERTY PER KODE P0 (tulis atomik sub-detik — kebal macet backend Sheets & lock).
// drainAntreanApprovalP0 mem-flush semua key berprefix tsb ke db_Approval_Queue tiap menit; key hanya
// dihapus setelah isinya BERHASIL pindah (tidak hilang; gagal → dicoba lagi flush berikutnya).
var APPR_INBOX_PREFIX = "apprInbox_"; // satu property per kodeP0 (~150 byte/item; kuota 500KB ≈ ribuan antrean)

// Titip 1 keputusan ke inbox (dipakai setApprovalP0). SATU property per kodeP0 → tulis atomik
// TANPA lock sama sekali: kebal macetnya lock (userLock/scriptLock) MAUPUN backend Sheets.
// Dedup alami: kodeP0 sama = property sama → keputusan terbaru menimpa (retry aman).
// Return true bila tertitip; false → caller fallback ke enqueueApprovalP0_ (tulis sheet langsung).
function _apprInboxPush_(kodeP0, keputusan, username, alasan) {
  try {
    PropertiesService.getScriptProperties().setProperty(
      APPR_INBOX_PREFIX + String(kodeP0),
      JSON.stringify({
        kodeP0: String(kodeP0),
        keputusan: String(keputusan),
        username: String(username || ""),
        alasan: String(alasan || ""),
        enqueuedAt: new Date().toISOString(),
      }),
    );
    return true;
  } catch (e) {
    Logger.log("_apprInboxPush_: " + e);
    return false;
  }
}

// Pindahkan SEMUA inbox → db_Approval_Queue (dipanggil di awal drainAntreanApprovalP0 / fastTick tiap 1 menit).
// Dedup sama dgn enqueueApprovalP0_: baris pending/processing dgn kodeP0 sama DIPERBARUI, bukan digandakan.
// Flush BOLEH menunggu userLock (konteks trigger — aman); yang penting push (request) tidak pernah menunggu.
function _apprInboxFlush_() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  var keys = [];
  for (var k in all) if (k.indexOf(APPR_INBOX_PREFIX) === 0) keys.push(k);
  if (!keys.length) return;
  var lock = LockService.getUserLock();
  if (!lock.tryLock(10000)) return; // sheet antrean sedang sibuk → coba lagi menit berikutnya (inbox aman)
  try {
    var sh = _apprQueueSheet_();
    var d = sh.getDataRange().getValues();
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var parsed = null;
      try {
        parsed = JSON.parse(all[key]);
      } catch (eP) {}
      var items = Array.isArray(parsed) ? parsed : [parsed]; // kompat: key lama "apprInbox_v1" menyimpan ARRAY
      var semuaPindah = true;
      for (var j = 0; j < items.length; j++) {
        var it = items[j];
        if (!it || !it.kodeP0) continue;
        try {
          var foundRow = -1;
          for (var r = 1; r < d.length; r++) {
            var st = String(d[r][1]);
            if (
              (st === "pending" || st === "processing") &&
              String(d[r][2]) === String(it.kodeP0)
            ) {
              foundRow = r + 1;
              break;
            }
          }
          if (foundRow > 0) {
            sh.getRange(foundRow, 4).setValue(String(it.keputusan));
            sh.getRange(foundRow, 5).setValue(String(it.username || ""));
            sh.getRange(foundRow, 6).setValue(String(it.alasan || ""));
          } else {
            var id =
              String(Date.now()) + "-" + Math.floor(Math.random() * 100000);
            sh.appendRow([
              id,
              "pending",
              String(it.kodeP0),
              String(it.keputusan),
              String(it.username || ""),
              String(it.alasan || ""),
              _nowY_(),
              "",
              0,
            ]);
            d.push([id, "pending", String(it.kodeP0), "", "", "", "", "", ""]); // agar item berikutnya dgn kodeP0 sama ikut ter-dedup
          }
        } catch (eItem) {
          semuaPindah = false;
          Logger.log("_apprInboxFlush_: gagal pindah " + key + " — " + eItem);
        }
      }
      // Hapus key HANYA bila semua itemnya pindah DAN isinya tidak berubah sejak snapshot (bila ada push baru
      // utk key ini saat flush berjalan → biarkan; flush berikutnya yang memindahkannya). Item gagal → key utuh.
      try {
        if (semuaPindah && props.getProperty(key) === all[key])
          props.deleteProperty(key);
      } catch (eD) {}
    }
  } catch (e) {
    Logger.log("_apprInboxFlush_: " + e);
  } finally {
    try {
      lock.releaseLock();
    } catch (e2) {}
  }
}

function drainAntreanApprovalP0() {
  try {
    _apprInboxFlush_();
  } catch (eFl) {
    Logger.log("drainAntreanApprovalP0: flush inbox gagal — " + eFl);
  }
  var sh = _apprQueueSheet_();
  var claimed = [];
  var lock = LockService.getUserLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    Logger.log("drainAntreanApprovalP0: gagal lock klaim — " + e);
    return;
  }
  try {
    var d = sh.getDataRange().getValues();
    var nowMs = Date.now();
    for (var i = 1; i < d.length && claimed.length < APPR_QUEUE_BATCH; i++) {
      var st = String(d[i][1]);
      var lastMs = _toMillisY_(d[i][7]);
      var staleProc =
        st === "processing" &&
        !isNaN(lastMs) &&
        nowMs - lastMs > APPR_QUEUE_STALE_MS;
      if (st === "pending" || staleProc) {
        d[i][1] = "processing";
        d[i][7] = new Date(nowMs);
        claimed.push({
          id: String(d[i][0]),
          kodeP0: String(d[i][2]),
          keputusan: String(d[i][3]),
          username: String(d[i][4]),
          alasan: String(d[i][5]),
        });
      }
    }
    if (claimed.length) sh.getDataRange().setValues(d);
  } catch (e) {
    Logger.log("drainAntreanApprovalP0: ERROR klaim — " + e);
  } finally {
    try {
      lock.releaseLock();
    } catch (e2) {}
  }
  if (!claimed.length) return;

  var hasil = {};
  for (var j = 0; j < claimed.length; j++) {
    var it = claimed[j];
    try {
      _prosesAntreanApprovalY_(it);
      hasil[it.id] = "done";
    } catch (e) {
      Logger.log(
        "drainAntreanApprovalP0: proses gagal kode=" + it.kodeP0 + " — " + e,
      );
      hasil[it.id] = "retry";
    }
  }

  try {
    lock.waitLock(15000);
  } catch (e) {
    Logger.log("drainAntreanApprovalP0: gagal lock final — " + e);
    return;
  }
  try {
    var d2 = sh.getDataRange().getValues();
    var delRows = [];
    for (var k = 1; k < d2.length; k++) {
      var id = String(d2[k][0]);
      if (!(id in hasil)) continue;
      if (hasil[id] === "done") {
        delRows.push(k + 1);
      } else {
        var att = Number(d2[k][8] || 0) + 1;
        d2[k][8] = att;
        d2[k][1] = att >= APPR_QUEUE_MAX_ATTEMPTS ? "failed" : "pending";
      }
    }
    sh.getDataRange().setValues(d2);
    delRows.sort(function (a, b) {
      return b - a;
    }); // hapus dari bawah agar indeks tidak bergeser
    for (var m = 0; m < delRows.length; m++) sh.deleteRow(delRows[m]);
  } catch (e) {
    Logger.log("drainAntreanApprovalP0: ERROR final — " + e);
  } finally {
    try {
      lock.releaseLock();
    } catch (e2) {}
  }
}

// SETUP sekali: pasang trigger time-driven drainAntreanApprovalP0 setiap 1 menit (jalankan manual dari editor).
// Lepas trigger antrean approval. CATATAN: tanpa trigger ini keputusan HANYA tercatat di antrean, TIDAK diproses.
function hapusApprovalDrainTriggerY() {
  var trs = ScriptApp.getProjectTriggers(),
    n = 0;
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === "drainAntreanApprovalP0") {
      ScriptApp.deleteTrigger(trs[i]);
      n++;
    }
  Logger.log("Trigger drainAntreanApprovalP0 dihapus: " + n);
}

// ====== EDIT NAMA PEKERJAAN P0 (modal Edit di SIE-Teknik tab "Approval P0", 12 Agu 2026) ======
// Dropdown master = kolom "Nama Pekerjaan" di db_Yandal_List_P0 (sumber bobot poin).
function getListPekerjaanP0() {
  try {
    var sh = _shY_(SHEET_YANDAL.LIST_P0);
    if (!sh || sh.getLastRow() <= 1) return { ok: true, list: [] };
    var d = _allY_(sh),
      list = [];
    for (var i = 1; i < d.length; i++) {
      var nm = String(d[i][COL_YANDAL_LIST_P0.namaPekerjaan] || "").trim();
      if (nm) list.push(nm);
    }
    return { ok: true, list: list };
  } catch (e) {
    return { ok: false, error: e.message, list: [] };
  }
}

// Ganti Nama Pekerjaan 1 baris P0. params: { kodeP0, namaPekerjaan, username? }
// Validasi: nama WAJIB ada di master db_Yandal_List_P0 (menjaga konsistensi bobot poin).
// Bila P0 sudah Approved → Point dihitung ULANG mengikuti bobot pekerjaan baru.
function updateNamaPekerjaanP0(params) {
  try {
    params = params || {};
    var kodeP0 = String(params.kodeP0 || "").trim();
    var namaBaru = String(params.namaPekerjaan || "").trim();
    if (!kodeP0) return { ok: false, error: "kodeP0 wajib diisi." };
    if (!namaBaru) return { ok: false, error: "Nama Pekerjaan wajib dipilih." };
    var lst = getListPekerjaanP0();
    var cocok = false,
      arr = (lst && lst.list) || [];
    for (var i = 0; i < arr.length; i++)
      if (String(arr[i]).toLowerCase() === namaBaru.toLowerCase()) {
        cocok = true;
        break;
      }
    if (!cocok)
      return {
        ok: false,
        error: "Nama Pekerjaan tidak ada di master db_Yandal_List_P0.",
      };
    var sh = _shY_(SHEET_YANDAL.P0);
    var f = _findRowY_(sh, COL_P0.kodeP0, kodeP0);
    if (!f) return { ok: false, error: "Baris P0 tidak ditemukan: " + kodeP0 };
    var namaLama = String(f.row[COL_P0.namaPekerjaan] || "").trim();
    _setTextY_(sh, f.rowNum, COL_P0.namaPekerjaan, namaBaru);
    // Bila sudah Approved → point mengikuti bobot pekerjaan BARU.
    var pointRes = null,
      status = String(f.row[COL_P0.statusApproval] || "").trim();
    if (status === "Approved") {
      try {
        pointRes = hitungPointP0Yandal(kodeP0);
      } catch (ePt) {
        Logger.log("updateNamaPekerjaanP0: hitung point gagal — " + ePt);
      }
    }
    Logger.log(
      "updateNamaPekerjaanP0: " +
        kodeP0 +
        ' "' +
        namaLama +
        '" → "' +
        namaBaru +
        '" oleh=' +
        String(params.username || "-"),
    );
    return {
      ok: true,
      kodeP0: kodeP0,
      namaLama: namaLama,
      namaPekerjaan: namaBaru,
      point: pointRes && pointRes.ok ? pointRes.point : null,
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ====== LAMPIRAN PENGECEKAN P0 (modal eye di SIE-Teknik tab "Approval P0") ======
// Dipanggil LANGSUNG via google.script.run dari SIE-Teknik. Bermakna utk P0 dgn Nama Pekerjaan
// "Pengecekan Gardu" / "Pengecekan Switching". Isi: konteks ringkas + 3 foto P0 (Sebelum/
// Pekerjaan/Sesudah) + seluruh baris anak db_Yandal_Pengecekan_Switching milik P0 tsb
// (Penyulang, Nama Switching, Jam Pengecekan, 4 indikator, Arus R/S/T, 6 foto: Arus + Gangguan 1..5
// — semua foto diambil dari kolom "Link Download Foto ...", sesuai spesifikasi 12 Agu 2026)
// + seluruh baris PENGUKURAN GARDU milik P0 (utk "Pengecekan Gardu"; 12 Agu 2026).
// Foto memakai helper _p0FotoObj_ yg sama dgn getApprovalP0List (Link Download / Foto URL).
// params: { kodeP0 } → { ok, p0:{...}, switching:[{...], gardu:[{...] }

// Sumber Pengecekan Gardu: sheet Pengukuran Gardu di spreadsheet TERPISAH (bukan SPREADSHEET_ID
// utama; satu file dgn spreadsheet BA). Sheet dicari via header kolom E = "Kode Pengukuran Gardu"
// (tahan ganti nama tab). Kunci relasi: kolom "Kode Pekerjaan P0".
var YANDAL_UKUR_SS_ID = "1TEC2iaxEcTCn0IXDZM1kHpAhKyBHuG90SMK48zEkeOw";
// Peta kolom 0-based (urutan = kolom A, B, C, ...):
// No | Kode Header | Kode Pekerjaan Shift | Kode Pekerjaan P0 | Kode Pengukuran Gardu | ULP | Hari
// | Tanggal | Penyulang | Section | No Gardu | Alamat | Jam Ukur | Beban Utama (R/S/T/N)
// | Tegangan (R-S/R-T/S-T/R-N/S-N/T-N) | Petugas
var COL_UKUR_GARDU = {
  no: 0,
  kodeHeader: 1,
  kodeShift: 2,
  kodeP0: 3,
  kodeUkur: 4,
  ulp: 5,
  hari: 6,
  tanggal: 7,
  penyulang: 8,
  section: 9,
  noGardu: 10,
  alamat: 11,
  jamUkur: 12,
  bebanR: 13,
  bebanS: 14,
  bebanT: 15,
  bebanN: 16,
  tegRS: 17,
  tegRT: 18,
  tegST: 19,
  tegRN: 20,
  tegSN: 21,
  tegTN: 22,
  petugas: 23,
};
// Cari sheet pengukuran gardu di spreadsheet tsb (cocokkan header kolom E; return null bila tak ada).
// REV 19 Agu 2026: nama sheet DI-CACHE 6 jam — scan header semua tab hanya sekali (sebelumnya: tiap panggilan).
function _sheetUkurGardu_(ssU) {
  var cache = CacheService.getScriptCache(),
    ckey = "ukurGarduSheetName";
  var cname = cache.get(ckey);
  if (cname) {
    var shc = ssU.getSheetByName(cname);
    if (shc) return shc; // cache hit → langsung pakai
  }
  var sheets = ssU.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var sh = sheets[i];
    if (sh.getLastRow() < 1) continue;
    if (sh.getLastColumn() <= COL_UKUR_GARDU.kodeUkur) continue;
    var head = sh.getRange(1, COL_UKUR_GARDU.kodeUkur + 1).getValue();
    if (
      String(head || "")
        .trim()
        .toLowerCase() === "kode pengukuran gardu"
    ) {
      try {
        cache.put(ckey, sh.getName(), 21600);
      } catch (eP) {}
      return sh;
    }
  }
  return null;
}
// params: { kodeP0 } → { ok, p0:{...}, switching:[{...], gardu:[{...] }
// REV 19 Agu 2026 (hotfix loading lama): bacaan lampiran DI-GATE oleh Nama Pekerjaan —
//   • spreadsheet KEDUA (pengukuran gardu; openById paling mahal) hanya dibuka bila nama pekerjaan mengandung "Gardu";
//   • sheet switching hanya di-scan bila nama pekerjaan mengandung "Switching".
// Pekerjaan biasa (ROW, dsb) → detail langsung balik tanpa menyentuh spreadsheet lain.
function getLampiranPengecekanP0(params) {
  try {
    var kodeP0 = String((params && params.kodeP0) || "").trim();
    if (!kodeP0) return { ok: false, error: "kodeP0 wajib diisi." };

    // 1) P0 induk: konteks ringkas + 3 foto standar.
    var shP0 = _shY_(SHEET_YANDAL.P0);
    if (!shP0)
      return { ok: false, error: "sheet '" + SHEET_YANDAL.P0 + "' tidak ada." };
    var fP = _findRowY_(shP0, COL_P0.kodeP0, kodeP0);
    if (!fP) return { ok: false, error: "Baris P0 tidak ditemukan: " + kodeP0 };
    var rp = fP.row;
    var p0 = {
      kodeP0: kodeP0,
      namaPekerjaan:
        String(rp[COL_P0.namaPekerjaan] || "").trim() ||
        String(rp[COL_P0.pekerjaanLainnya] || "").trim(),
      penyulang: String(rp[COL_P0.penyulang] || ""),
      daerah: String(rp[COL_P0.daerah] || ""),
      tanggal: _normTgl(rp[COL_P0.tanggal]),
      fotoSebelum: _p0FotoObj_(
        rp,
        COL_P0.linkDownloadSebelum,
        COL_P0.fotoSebelumUrl,
      ),
      fotoPekerjaan: _p0FotoObj_(
        rp,
        COL_P0.linkDownloadPekerjaan,
        COL_P0.fotoPekerjaanUrl,
      ),
      fotoSesudah: _p0FotoObj_(
        rp,
        COL_P0.linkDownloadSesudah,
        COL_P0.fotoSesudahUrl,
      ),
    };
    var namaPekLower = p0.namaPekerjaan.toLowerCase();

    // 2) Anak-anak Pengecekan Switching — HANYA bila pekerjaan ini berkaitan switching.
    var switching = [];
    if (namaPekLower.indexOf("switching") >= 0) {
      var shS = _shY_(SHEET_YANDAL.SWITCHING);
      if (shS && shS.getLastRow() > 1) {
        var ds = _allY_(shS),
          S = COL_SWITCHING;
        for (var i = 1; i < ds.length; i++) {
          if (String(ds[i][S.kodeP0] || "").trim() !== kodeP0) continue;
          switching.push({
            kodeSwitching: String(ds[i][S.kodeSwitching] || "").trim(),
            penyulang: String(ds[i][S.penyulang] || "").trim(),
            namaSwitching: String(ds[i][S.namaSwitching] || "").trim(),
            jamPengecekan:
              _jamHHmm_(ds[i][S.jamPengecekan]) ||
              String(ds[i][S.jamPengecekan] || ""),
            indikatorRemote: String(ds[i][S.indikatorRemote] || ""),
            indikatorLocal: String(ds[i][S.indikatorLocal] || ""),
            indicatorProtection: String(ds[i][S.indicatorProtection] || ""),
            indicatorReclose: String(ds[i][S.indicatorReclose] || ""),
            arusR: String(ds[i][S.arusR] || ""),
            arusS: String(ds[i][S.arusS] || ""),
            arusT: String(ds[i][S.arusT] || ""),
            fotoArus: _p0FotoObj_(ds[i], S.linkDownloadArus, S.fotoArusUrl),
            fotoG1: _p0FotoObj_(ds[i], S.linkDownloadG1, S.fotoG1Url),
            fotoG2: _p0FotoObj_(ds[i], S.linkDownloadG2, S.fotoG2Url),
            fotoG3: _p0FotoObj_(ds[i], S.linkDownloadG3, S.fotoG3Url),
            fotoG4: _p0FotoObj_(ds[i], S.linkDownloadG4, S.fotoG4Url),
            fotoG5: _p0FotoObj_(ds[i], S.linkDownloadG5, S.fotoG5Url),
          });
        }
      }
    }
    // 3) Baris-baris Pengukuran Gardu — HANYA bila pekerjaan "Pengecekan Gardu" (spreadsheet terpisah).
    var gardu = [];
    if (namaPekLower.indexOf("gardu") >= 0) {
      try {
        var shU = _sheetUkurGardu_(SpreadsheetApp.openById(YANDAL_UKUR_SS_ID));
        if (shU && shU.getLastRow() > 1) {
          var du = shU.getDataRange().getValues(),
            U = COL_UKUR_GARDU;
          for (var u = 1; u < du.length; u++) {
            if (String(du[u][U.kodeP0] || "").trim() !== kodeP0) continue;
            gardu.push({
              kodeUkur: String(du[u][U.kodeUkur] || "").trim(),
              penyulang: String(du[u][U.penyulang] || "").trim(),
              section: String(du[u][U.section] || "").trim(),
              noGardu: String(du[u][U.noGardu] || "").trim(),
              alamat: String(du[u][U.alamat] || "").trim(),
              jamUkur:
                _jamHHmm_(du[u][U.jamUkur]) || String(du[u][U.jamUkur] || ""),
              bebanR: String(du[u][U.bebanR] || ""),
              bebanS: String(du[u][U.bebanS] || ""),
              bebanT: String(du[u][U.bebanT] || ""),
              bebanN: String(du[u][U.bebanN] || ""),
              tegRS: String(du[u][U.tegRS] || ""),
              tegRT: String(du[u][U.tegRT] || ""),
              tegST: String(du[u][U.tegST] || ""),
              tegRN: String(du[u][U.tegRN] || ""),
              tegSN: String(du[u][U.tegSN] || ""),
              tegTN: String(du[u][U.tegTN] || ""),
              petugas: String(du[u][U.petugas] || "").trim(),
            });
          }
        }
      } catch (eU) {
        Logger.log(
          "getLampiranPengecekanP0: baca pengukuran gardu gagal — " + eU,
        );
      }
    }
    return { ok: true, p0: p0, switching: switching, gardu: gardu };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ====== POINT P0 (NILAI BOBOT PEKERJAAN) ======
// Poin = Skor Durasi (1-5, dari kolom AN) + (Bobot Pekerjaan × pengali, dari db_Yandal_List_P0).
// Pengali default 2; menjadi 2,5 bila Nama Pekerjaan mengandung "ROW" DAN dikerjakan pukul 22:00–05:00 (jam acuan = Time Stamp Pembuatan / kolom W).
// HANYA dihitung bila Status Approval P0 (AO) = "Approved". Hasil ditulis ke kolom Point (AR).
// 2 trigger: (1) web — dipanggil setApprovalP0 saat Approved; (2) bot AppSheet — action 'hitungPointP0Yandal' di doPost (Code.gs).

// Skor durasi (D) dari total menit. Ubah ambang di sini bila kebijakan berubah (acuan tertulis di Notion).
function _skorDurasiY_(menit) {
  if (isNaN(menit) || menit <= 30) return 1; // ≤ 0,5 jam (durasi kosong → skor minimum)
  if (menit <= 60) return 2; // 0,5 – 1 jam
  if (menit <= 120) return 3; // 1 – 2 jam
  if (menit <= 240) return 4; // 2 – 4 jam
  return 5; // > 4 jam
}
// Ubah teks Durasi (mis. "1 jam 30 menit", "45 menit", "2 jam", "30 detik") → total menit.
function _durasiToMenitY_(v) {
  var s = String(v == null ? "" : v)
    .toLowerCase()
    .trim();
  if (!s) return NaN;
  var menit = 0,
    found = false;
  var mJam = s.match(/(\d+)\s*jam/);
  if (mJam) {
    menit += parseInt(mJam[1], 10) * 60;
    found = true;
  }
  var mMnt = s.match(/(\d+)\s*menit/);
  if (mMnt) {
    menit += parseInt(mMnt[1], 10);
    found = true;
  }
  var mDtk = s.match(/(\d+)\s*detik/);
  if (mDtk) {
    menit += parseInt(mDtk[1], 10) / 60;
    found = true;
  }
  if (found) return menit;
  var n = parseFloat(s.replace(",", ".")); // fallback: angka polos dianggap menit
  return isNaN(n) ? NaN : n;
}
// Peta { nama pekerjaan (lowercase) -> bobot } dari db_Yandal_List_P0.
// Baris tanpa bobot numerik (mis. "Lain - Lain" dikosongkan) DILEWATI → poin diatur manual.
function _bobotPekerjaanMapY_() {
  var map = {};
  var sh = _shY_(SHEET_YANDAL.LIST_P0);
  if (!sh || sh.getLastRow() <= 1) return map;
  var d = _allY_(sh);
  for (var i = 1; i < d.length; i++) {
    var nm = String(d[i][COL_YANDAL_LIST_P0.namaPekerjaan] || "").trim();
    if (!nm) continue;
    var braw = d[i][COL_YANDAL_LIST_P0.bobot];
    if (braw === "" || braw == null) continue;
    var b = Number(braw);
    if (isNaN(b)) continue;
    map[nm.toLowerCase()] = b;
  }
  return map;
}
// Inti perhitungan poin dari 1 baris P0 (TANPA menulis sheet). Dipakai hitungPointP0Yandal (1 baris)
// & recalcPointP0Bertahap (massal) → satu sumber rumus (anti-divergensi bila rumus/pengali berubah).
// bobotMap dibuat SEKALI oleh pemanggil (dari _bobotPekerjaanMapY_) agar hemat baca sheet saat massal.
function _hitungPoinDariRowY_(row, bobotMap) {
  var status = String(row[COL_P0.statusApproval] || "").trim();
  if (status !== "Approved")
    return {
      ok: true,
      skipped: true,
      reason: "Status Approval P0 bukan Approved",
      status: status,
    };
  // Skor Durasi (D) dari kolom AN.
  var menit = _durasiToMenitY_(row[COL_P0.durasi]);
  var skorD = _skorDurasiY_(menit);
  // Bobot pekerjaan dari db_Yandal_List_P0 (cocokkan Nama Pekerjaan).
  var nama = String(row[COL_P0.namaPekerjaan] || "").trim();
  var key = nama.toLowerCase();
  if (!bobotMap || !bobotMap.hasOwnProperty(key)) {
    return {
      ok: false,
      skipped: true,
      reason:
        "Nama Pekerjaan tidak ada/tak berbobot di db_Yandal_List_P0 (atur Point manual)",
      namaPekerjaan: nama,
    };
  }
  var bobot = bobotMap[key];
  // Koefisien pengali bobot: default 2. Naik ke 2,5 bila Nama Pekerjaan mengandung "ROW"
  // DAN pekerjaan dilakukan pukul 22:00–05:00 (jam acuan = Time Stamp Pembuatan / kolom W).
  var pengali = 2;
  if (nama.toUpperCase().indexOf("ROW") >= 0) {
    var jamBuat = _jamHHmm_(row[COL_P0.timestampPembuatan]); // "HH:mm" (Asia/Jakarta)
    if (jamBuat) {
      var menitHari =
        parseInt(jamBuat.slice(0, 2), 10) * 60 +
        parseInt(jamBuat.slice(3, 5), 10);
      if (menitHari >= 1320 || menitHari <= 300) pengali = 2.5; // 22:00 s/d 05:00, lewat tengah malam
    }
  }
  var poin = skorD + bobot * pengali;
  return {
    ok: true,
    namaPekerjaan: nama,
    durasiMenit: isNaN(menit) ? null : menit,
    skorDurasi: skorD,
    bobot: bobot,
    pengali: pengali,
    point: poin,
  };
}

// Hitung & set Point (AR) untuk 1 baris P0. Idempoten (aman dipanggil berulang).
function hitungPointP0Yandal(kodeP0) {
  try {
    kodeP0 = String(kodeP0 || "").trim();
    if (!kodeP0) return { ok: false, error: "kodeP0 wajib diisi." };
    var sh = _shY_(SHEET_YANDAL.P0);
    if (!sh)
      return { ok: false, error: "sheet '" + SHEET_YANDAL.P0 + "' tidak ada." };
    var f = _findRowY_(sh, COL_P0.kodeP0, kodeP0);
    if (!f) return { ok: false, error: "Baris P0 tidak ditemukan: " + kodeP0 };
    var rowNum = f.rowNum,
      row = f.row;

    var r = _hitungPoinDariRowY_(row, _bobotPekerjaanMapY_());
    if (!r.ok || r.skipped) {
      return {
        ok: r.ok,
        skipped: r.skipped || false,
        reason: r.reason,
        kodeP0: kodeP0,
        status: r.status,
        namaPekerjaan: r.namaPekerjaan,
      };
    }
    _setY_(sh, rowNum, COL_P0.point, r.point); // tulis ke kolom Point (AR)

    Logger.log(
      "hitungPointP0Yandal: " +
        kodeP0 +
        " → D=" +
        r.skorDurasi +
        " bobot=" +
        r.bobot +
        " pengali=" +
        r.pengali +
        " point=" +
        r.point,
    );
    return {
      ok: true,
      kodeP0: kodeP0,
      namaPekerjaan: r.namaPekerjaan,
      durasiMenit: r.durasiMenit,
      skorDurasi: r.skorDurasi,
      bobot: r.bobot,
      pengali: r.pengali,
      point: r.point,
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ====== BACKSTOP POINT P0 (diproses otomatis tiap menit) ======
// Menutup celah AppSheet: bila Bot aktif tetapi tidak ada update baru / webhook terlewat,
// fungsi ini menyapu db_Yandal_P0 dan menghitung Point untuk semua baris:
//   Status Approval P0 = "Approved" DAN Point masih kosong.
// Jalankan createPointP0DrainTriggerY() sekali dari editor Apps Script untuk memasang trigger tiap 1 menit.
// opts.force=true → hitung ULANG semua baris Approved walau Point sudah terisi (dipakai saat rumus/pengali berubah).
function sweepPointP0Yandal(opts) {
  opts = opts || {};
  var force = opts.force === true;
  var sh = _shY_(SHEET_YANDAL.P0);
  if (!sh || sh.getLastRow() <= 1)
    return { ok: true, processed: 0, skipped: 0 };
  var d = _allY_(sh);
  var processed = 0,
    skipped = 0,
    errors = [];
  for (var i = 1; i < d.length; i++) {
    var kodeP0 = String(d[i][COL_P0.kodeP0] || "").trim();
    var status = String(d[i][COL_P0.statusApproval] || "").trim();
    var point = String(d[i][COL_P0.point] || "").trim();
    if (!kodeP0 || status !== "Approved" || (point && !force)) {
      skipped++;
      continue;
    }
    try {
      var res = hitungPointP0Yandal(kodeP0);
      if (res && res.ok && !res.skipped) processed++;
      else errors.push({ kodeP0: kodeP0, result: res });
    } catch (e) {
      errors.push({ kodeP0: kodeP0, error: e.message });
    }
  }
  if (processed || errors.length)
    Logger.log(
      "sweepPointP0Yandal: processed=" +
        processed +
        " errors=" +
        JSON.stringify(errors),
    );
  return { ok: true, processed: processed, skipped: skipped, errors: errors };
}

// HITUNG ULANG PAKSA semua Point P0 (baris Approved) — pakai SEKALI setelah rumus/pengali berubah.
// Menimpa Point lama dengan nilai baru (rumus terbaru). Jalankan manual dari editor Apps Script.
// Cek hasil di View > Logs; return ringkasan { processed, skipped, errors }.
function recalcPaksaPointP0Yandal() {
  return sweepPointP0Yandal({ force: true });
}

// ====== RECALC POINT BERTAHAP (anti-limit waktu 6 menit) ======
// Hitung ulang Point SEMUA baris Approved secara BERTAHAP (batch) memakai cursor di Script Properties,
// agar tidak kena batas waktu eksekusi Apps Script (~6 menit) saat data besar.
// CARA PAKAI: jalankan mulaiRecalcPointBertahap() SEKALI dari editor → trigger tiap 1 menit memproses
// per-batch sampai selesai, lalu berhenti & lepas trigger sendiri. Pantau di View > Logs.
var RECALC_POINT_PROP = "RECALC_POINT_CURSOR"; // Script Property: indeks baris data berikutnya (indeks array _allY_)
var RECALC_POINT_BATCH = 150; // maks baris diproses per putaran (turunkan bila masih mepet limit)

function _resetRecalcPointCursorY_() {
  PropertiesService.getScriptProperties().deleteProperty(RECALC_POINT_PROP);
}

// Proses 1 batch (force: selalu timpa Point dgn rumus terbaru). Return { ok, done, processed, skipped, next, errors }.
function recalcPointP0Bertahap(opts) {
  opts = opts || {};
  var batch = Number(opts.batch || RECALC_POINT_BATCH);
  if (isNaN(batch) || batch < 1) batch = RECALC_POINT_BATCH;
  var sh = _shY_(SHEET_YANDAL.P0);
  if (!sh || sh.getLastRow() <= 1) {
    _resetRecalcPointCursorY_();
    return { ok: true, done: true, processed: 0, skipped: 0, errors: [] };
  }
  var d = _allY_(sh);
  var bobotMap = _bobotPekerjaanMapY_(); // dibaca SEKALI per putaran (hemat baca sheet)
  var props = PropertiesService.getScriptProperties();
  var start = parseInt(props.getProperty(RECALC_POINT_PROP) || "1", 10);
  if (isNaN(start) || start < 1) start = 1;
  var processed = 0,
    skipped = 0,
    errors = [],
    i = start;
  for (; i < d.length; i++) {
    if (processed >= batch) break; // batas per putaran → sisanya di putaran berikutnya
    var row = d[i];
    var kodeP0 = String(row[COL_P0.kodeP0] || "").trim();
    if (!kodeP0) {
      skipped++;
      continue;
    }
    try {
      var r = _hitungPoinDariRowY_(row, bobotMap);
      if (r.ok && !r.skipped) {
        _setY_(sh, i + 1, COL_P0.point, r.point);
        processed++;
      } else {
        skipped++;
        if (!r.ok) errors.push({ kodeP0: kodeP0, reason: r.reason });
      }
    } catch (e) {
      errors.push({ kodeP0: kodeP0, error: e.message });
    }
  }
  var done = i >= d.length;
  if (done) _resetRecalcPointCursorY_();
  else props.setProperty(RECALC_POINT_PROP, String(i));
  Logger.log(
    "recalcPointP0Bertahap: start=" +
      start +
      " next=" +
      (done ? "-" : i) +
      " processed=" +
      processed +
      " skipped=" +
      skipped +
      " done=" +
      done +
      (errors.length ? " errors=" + JSON.stringify(errors) : ""),
  );
  return {
    ok: true,
    done: done,
    start: start,
    next: done ? null : i,
    processed: processed,
    skipped: skipped,
    errors: errors,
  };
}

// Handler trigger: 1 batch per tick. Lock (getUserLock) agar tick tidak tumpang-tindih. Selesai → lepas trigger sendiri.
function jalankanRecalcPointBertahap() {
  var lock = LockService.getUserLock();
  if (!lock.tryLock(1000)) {
    Logger.log(
      "Recalc Point bertahap: putaran sebelumnya masih jalan → lewati tick ini.",
    );
    return;
  }
  try {
    var r = recalcPointP0Bertahap();
    if (r && r.done) {
      var trs = ScriptApp.getProjectTriggers();
      for (var i = 0; i < trs.length; i++)
        if (trs[i].getHandlerFunction() === "jalankanRecalcPointBertahap")
          ScriptApp.deleteTrigger(trs[i]);
      Logger.log("Recalc Point bertahap SELESAI → trigger dilepas.");
    }
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

// MULAI recalc bertahap dari awal: reset cursor + pasang trigger tiap 1 menit (berhenti otomatis saat selesai).
// Jalankan SEKALI dari editor Apps Script setelah rumus berubah.
function mulaiRecalcPointBertahap() {
  _resetRecalcPointCursorY_();
  var trs = ScriptApp.getProjectTriggers();
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === "jalankanRecalcPointBertahap")
      ScriptApp.deleteTrigger(trs[i]);
  ScriptApp.newTrigger("jalankanRecalcPointBertahap")
    .timeBased()
    .everyMinutes(1)
    .create();
  Logger.log(
    "Recalc Point bertahap DIMULAI: batch=" +
      RECALC_POINT_BATCH +
      "/menit, berhenti otomatis saat selesai.",
  );
}

// HENTIKAN/batalkan recalc bertahap (lepas trigger + reset cursor).
function hentikanRecalcPointBertahap() {
  var trs = ScriptApp.getProjectTriggers(),
    n = 0;
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === "jalankanRecalcPointBertahap") {
      ScriptApp.deleteTrigger(trs[i]);
      n++;
    }
  _resetRecalcPointCursorY_();
  Logger.log(
    "Recalc Point bertahap DIHENTIKAN: trigger dilepas=" +
      n +
      ", cursor direset.",
  );
}

// SETUP sekali: pasang trigger time-driven sweepPointP0Yandal.
// Rev 19 Agu malam: default 1 menit → 15 menit (ia hanya BACKSTOP — point dihitung seketika oleh
// antrean approval saat Approved). Scan penuh db_Yandal_P0 tiap menit membebani limit eksekusi simultan.
// Lepas trigger backstop point P0.
function hapusPointP0DrainTriggerY() {
  var trs = ScriptApp.getProjectTriggers(),
    n = 0;
  for (var i = 0; i < trs.length; i++) {
    if (trs[i].getHandlerFunction() === "sweepPointP0Yandal") {
      ScriptApp.deleteTrigger(trs[i]);
      n++;
    }
  }
  Logger.log("Trigger sweepPointP0Yandal dihapus: " + n);
}

// ====== REKAP POINT PER PETUGAS (rentang tanggal) ======
// Dihitung ON-DEMAND (live) dari db_Yandal_P0 — TIDAK memakai sheet rekap tersendiri.
// Hanya baris ber-Status Approval P0 = "Approved" & sudah punya nilai Point.
// Tiap baris berisi 2 petugas (1 tim); POIN PENUH diberikan ke SETIAP petugas (tidak dibagi).
// Dipanggil dari dashboard web via google.script.run.getRekapPointPetugasY({ tglAwal, tglAkhir, ulp? }).
// Tanggal terima format 'yyyy-MM-dd' (input date HTML) atau 'dd/MM/yyyy'.

// Pisah daftar petugas → array nama. Pemisah didukung: koma, titik-koma, garis miring, '&', baris baru.
// Bila format pemisah di datamu beda (mis. kata "dan"), sesuaikan regex di sini.
function _splitPetugasY_(v) {
  var s = String(v == null ? "" : v);
  if (!s.trim()) return [];
  var parts = s.split(/\s*(?:,|;|\/|&|\r|\n)\s*/);
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i].trim();
    if (p) out.push(p);
  }
  return out;
}
function _rangeStartMsY_(v) {
  var ms = _toMillisY_(v);
  if (isNaN(ms)) return NaN;
  var d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function _rangeEndMsY_(v) {
  var ms = _toMillisY_(v);
  if (isNaN(ms)) return NaN;
  var d = new Date(ms);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

// Rekap poin per petugas dalam rentang tanggal. Return list terurut (poin terbesar dulu) + ringkasan.
function getRekapPointPetugasY(params) {
  try {
    params = params || {};
    var ulpFilter = String(params.ulp || "").trim();
    var awalMs = _rangeStartMsY_(params.tglAwal);
    var akhirMs = _rangeEndMsY_(params.tglAkhir);
    // DUAL-READ (migrasi): rekap poin rentang tanggal melintasi batas H-2 — baca AKTIF + ARSIP.
    var d = _readSheetDual_(
        SHEET_YANDAL.P0,
        COL_P0.kodeP0,
        COL_P0.folderPath + 1,
      ),
      C = COL_P0;
    var agg = {}; // nama → { petugas, jumlahP0, totalPoint }
    var totalP0 = 0,
      totalPoint = 0;
    for (var i = 0; i < d.length; i++) {
      if (String(d[i][C.statusApproval] || "").trim() !== "Approved") continue; // hanya yang disetujui
      if (ulpFilter && String(d[i][C.ulp] || "").trim() !== ulpFilter) continue; // filter ULP (opsional)
      var tMs = _toMillisY_(d[i][C.tanggal]);
      if (!isNaN(awalMs) && (isNaN(tMs) || tMs < awalMs)) continue; // sebelum rentang
      if (!isNaN(akhirMs) && (isNaN(tMs) || tMs > akhirMs)) continue; // sesudah rentang
      var poin = Number(d[i][C.point]);
      if (isNaN(poin)) continue; // poin belum dihitung → lewati
      var orang = _splitPetugasY_(d[i][C.petugas]);
      if (!orang.length) continue;
      totalP0 += 1;
      totalPoint += poin;
      for (var k = 0; k < orang.length; k++) {
        var nm = orang[k];
        if (!agg[nm]) agg[nm] = { petugas: nm, jumlahP0: 0, totalPoint: 0 };
        agg[nm].jumlahP0 += 1;
        agg[nm].totalPoint += poin; // POIN PENUH ke tiap orang
      }
    }
    var list = [];
    for (var key in agg) list.push(agg[key]);
    list.sort(function (a, b) {
      return b.totalPoint - a.totalPoint || b.jumlahP0 - a.jumlahP0;
    });
    for (var r = 0; r < list.length; r++) {
      list[r].rank = r + 1;
      list[r].rataRata = list[r].jumlahP0
        ? Math.round((list[r].totalPoint / list[r].jumlahP0) * 100) / 100
        : 0;
    }
    return {
      ok: true,
      tglAwal: params.tglAwal || "",
      tglAkhir: params.tglAkhir || "",
      ulp: ulpFilter,
      totalBarisP0: totalP0,
      totalPoint: totalPoint,
      jumlahPetugas: list.length,
      list: list,
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ====== DAFTAR PETUGAS YANDAL (untuk filter dropdown Tek-Yantek) ======
// Kumpulkan nama petugas UNIK dari db_Yandal_Shift (kolom Petugas) + db_Yandal_P0 (penambah).
// Kolom Petugas bisa berisi banyak nama (dipisah , ; / & atau baris baru) -> dipecah _splitPetugasY_.
// Opsional params.ulp: bila diisi, hanya petugas yang pernah bertugas di ULP tsb (membatasi dropdown
// non-Super User ke ULP-nya sendiri). Return { ok, list:[nama, ...] } terurut A-Z.
function getListPetugasYandal(params) {
  try {
    params = params || {};
    var ulpFilter = String(params.ulp || "").trim();
    var set = {};
    // Sumber utama: db_Yandal_Shift (Petugas = kolom I / idx 8, ULP = kolom F / idx 5)
    var shShift = _shY_(SHEET_YANDAL.SHIFT);
    if (shShift && shShift.getLastRow() > 1) {
      var ds = _allY_(shShift);
      for (var i = 1; i < ds.length; i++) {
        if (
          ulpFilter &&
          String(ds[i][COL_YANDAL_SHIFT.ulp] || "").trim() !== ulpFilter
        )
          continue;
        var orang = _splitPetugasY_(ds[i][COL_YANDAL_SHIFT.petugas]);
        for (var k = 0; k < orang.length; k++)
          if (orang[k]) set[orang[k]] = true;
      }
    }
    // Penambah: db_Yandal_P0 (Petugas = kolom V / idx 21, ULP = kolom E / idx 4)
    // DUAL-READ (migrasi): petugas yg hanya ada di baris lama (arsip) tetap muncul di dropdown.
    var dp = _readSheetDual_(
      SHEET_YANDAL.P0,
      COL_P0.kodeP0,
      COL_P0.folderPath + 1,
    );
    if (dp.length > 0) {
      for (var j = 0; j < dp.length; j++) {
        if (ulpFilter && String(dp[j][COL_P0.ulp] || "").trim() !== ulpFilter)
          continue;
        var orang2 = _splitPetugasY_(dp[j][COL_P0.petugas]);
        for (var m = 0; m < orang2.length; m++)
          if (orang2[m]) set[orang2[m]] = true;
      }
    }
    var list = [];
    for (var nm in set) list.push(nm);
    list.sort(function (a, b) {
      return String(a).localeCompare(String(b));
    });
    return { ok: true, list: list };
  } catch (e) {
    return { ok: false, error: e.message, list: [] };
  }
}

// ====== TABEL PETUGAS + RANK (halaman Tim Yandal / Tek-Yandal) ======
// Sumber angka = getRekapPointPetugasY (poin dari db_Yandal_P0, hanya baris Approved & ber-Point).
// Baris tabel = petugas yang punya data di PERIODE filter. Kolom rank dihitung terpisah:
//   • Rank Bulanan        : DIPINDAH sumbernya → dibaca dari db_Yandal_Rank (kolom Rank Bulanan, hasil
//     Nilai Total % = rata-rata % Nilai P0 + % Nilai Jam Efektif + % Nilai VCC) untuk periode bulan acuan.
//     Bila baris rank belum ada (belum pernah disinkron), jatuh balik ke peringkat poin P0 bulan acuan.
//   • Rank Sepanjang Tahun: peringkat total poin pada TAHUN acuan (1 Jan s/d 31 Des tahun tglAkhir).
// Peringkat dihitung terhadap SEMUA petugas dalam scope ULP (bukan hanya yang tampil di tabel).
// params: { tglAwal, tglAkhir, petugas?, ulp? }  → { ok, list:[{no,nama,unit,jumlahP0,totalPoint,rataRata,
//   pointBulanan,rankBulanan,pointTahunan,rankTahunan], bulanLabel, tahun, jumlahPetugas }
function _padNY_(n) {
  return (n < 10 ? "0" : "") + n;
}
// Peta { nama petugas -> Unit/ULP } dari db_Yandal_Shift (utama) + db_Yandal_P0 (penambah). Nilai terakhir menang.
function _unitPetugasMapY_(ulpFilter) {
  var map = {};
  var shShift = _shY_(SHEET_YANDAL.SHIFT);
  if (shShift && shShift.getLastRow() > 1) {
    var ds = _allY_(shShift);
    for (var i = 1; i < ds.length; i++) {
      var u = String(ds[i][COL_YANDAL_SHIFT.ulp] || "").trim();
      if (ulpFilter && u !== ulpFilter) continue;
      var o = _splitPetugasY_(ds[i][COL_YANDAL_SHIFT.petugas]);
      for (var k = 0; k < o.length; k++) if (o[k] && u) map[o[k]] = u;
    }
  }
  // DUAL-READ (migrasi): peta unit petugas ikut membaca arsip.
  var dp = _readSheetDual_(
    SHEET_YANDAL.P0,
    COL_P0.kodeP0,
    COL_P0.folderPath + 1,
  );
  if (dp.length > 0) {
    for (var j = 0; j < dp.length; j++) {
      var u2 = String(dp[j][COL_P0.ulp] || "").trim();
      if (ulpFilter && u2 !== ulpFilter) continue;
      var o2 = _splitPetugasY_(dp[j][COL_P0.petugas]);
      for (var m = 0; m < o2.length; m++)
        if (o2[m] && !map[o2[m]] && u2) map[o2[m]] = u2;
    }
  }
  return map;
}
// { nama -> {rank, totalPoint, jumlahP0} } dari hasil getRekapPointPetugasY.
function _rekapIndexY_(rekap) {
  var idx = {};
  var list = rekap && rekap.ok && rekap.list ? rekap.list : [];
  for (var i = 0; i < list.length; i++) idx[list[i].petugas] = list[i];
  return idx;
}
// { nama petugas -> nilai db_Yandal_Rank } untuk 1 periode 'YYYY-MM'. SUMBER BARU Rank Bulanan.
function _rankIndexY_(periode, ulpFilter) {
  var idx = {};
  try {
    var r = getRankYandal({ periode: periode, ulp: ulpFilter });
    var list = r && r.ok && r.list ? r.list : [];
    for (var i = 0; i < list.length; i++) {
      var it = list[i],
        rb = Number(it.rankBulanan);
      idx[it.petugas] = {
        kodeRank: String(it.kodeRank || ""),
        rankBulanan: isNaN(rb) || rb < 1 ? null : rb,
        nilaiTotal: Number(it.nilaiTotal) || 0,
        nilaiP0: Number(it.nilaiP0) || 0,
        nilaiJam: Number(it.nilaiJam) || 0,
        nilaiShift: Number(it.nilaiShift) || 0,
        nilaiVCC: Number(it.nilaiVCC) || 0,
        persenVCC: Number(it.persenVCC) || 0,
      };
    }
  } catch (e) {}
  return idx;
}
// Agregat db_Yandal_Rank SEPANJANG TAHUN (semua periode 'YYYY-MM' pada tahun tsb) → { nama -> {...} }.
// Rank Sepanjang Tahun = peringkat RATA-RATA Nilai Total seluruh bulan yang sudah terdata (bukan poin P0 mentah),
// agar satu sumber dengan Rank Bulanan. Tiebreak: menit efektif → jumlah shift → point P0 → jumlah P0.
function _rankTahunIndexY_(tahun, ulpFilter) {
  var idx = {},
    out = {};
  try {
    var sh = _ensureSheetRankY_(),
      R = COL_RANK_Y,
      d = _allY_(sh);
    var pref = String(tahun) + "-";
    for (var i = 1; i < d.length; i++) {
      var per = _periodeStrY_(d[i][R.periode]);
      if (String(per).indexOf(pref) !== 0) continue;
      var u = String(d[i][R.ulp] || "").trim();
      if (ulpFilter && u !== ulpFilter) continue;
      var nm = String(d[i][R.petugas] || "").trim();
      if (!nm) continue;
      if (!idx[nm])
        idx[nm] = {
          petugas: nm,
          ulp: u,
          bulan: 0,
          sumNilai: 0,
          pointP0: 0,
          jumlahP0: 0,
          jumlahShift: 0,
          menitEfektif: 0,
        };
      var a = idx[nm];
      a.bulan += 1;
      a.sumNilai += _toNumY_(d[i][R.nilaiTotal]) || 0;
      a.pointP0 += _toNumY_(d[i][R.pointP0]) || 0;
      a.jumlahP0 += _toNumY_(d[i][R.jumlahP0]) || 0;
      a.jumlahShift += _toNumY_(d[i][R.jumlahShift]) || 0;
      a.menitEfektif += _toNumY_(d[i][R.menitEfektif]) || 0;
    }
    var arr = [];
    for (var nm2 in idx) {
      var it = idx[nm2];
      it.nilaiRata = it.bulan
        ? _bulatY_(it.sumNilai / it.bulan, DESIMAL_NILAI_Y)
        : 0;
      arr.push(it);
    }
    _peringkatY_(
      arr,
      function (x) {
        return x.nilaiRata;
      },
      false,
      function (x, rk) {
        x.rankTahunan = rk;
      },
      function (x) {
        return [x.menitEfektif, x.jumlahShift, x.pointP0, x.jumlahP0];
      },
    );
    for (var z = 0; z < arr.length; z++) out[arr[z].petugas] = arr[z];
  } catch (e) {}
  return out;
}

// SUMBER DATA TABEL = db_Yandal_Rank, DIFILTER PER BULAN (periode 'YYYY-MM').
// params: { periode:'YYYY-MM', petugas?, ulp?, sinkron? }
//   • periode kosong → diturunkan dari params.bulan / params.tglAkhir (kompatibel pemanggil lama) → bulan berjalan.
//   • Baris tabel = petugas yang ada di db_Yandal_Rank pada periode tsb (BUKAN lagi rekap poin P0 per rentang tanggal).
//   • Semua angka bulanan (Jumlah Shift, Point P0, Jam Efektif, % Nilai, Nilai Total, Rank Bulanan) dibaca apa adanya
//     dari db_Yandal_Rank → urutan tabel SELALU selaras dengan Nilai Total (tidak lagi campur poin keseluruhan).
//   • Bila periode belum pernah disinkron (belum ada barisnya), sinkron otomatis dijalankan sekali agar tabel tidak kosong.
//   • sinkron:true → paksa hitung ulang periode tsb sebelum dibaca (dipakai tombol "Segarkan").
function getTabelPetugasYandal(params) {
  try {
    params = params || {};
    var ulpFilter = String(params.ulp || "").trim();
    var petugasFilter = String(params.petugas || "").trim();

    // Tentukan periode bulan acuan 'YYYY-MM'.
    var periode = _periodeStrY_(params.periode || params.bulan || "");
    if (!/^\d{4}-\d{2}$/.test(String(periode))) {
      var acuanMs = _toMillisY_(params.tglAkhir);
      periode = _fmtY_(
        isNaN(acuanMs) ? _nowY_() : new Date(acuanMs),
        "yyyy-MM",
      );
    }
    var th = Number(periode.substring(0, 4)),
      bl = Number(periode.substring(5, 7)) - 1;

    // Baca db_Yandal_Rank untuk periode tsb (sumber tunggal angka bulanan).
    var r = getRankYandal({
      periode: periode,
      ulp: ulpFilter,
      sinkron: params.sinkron === true,
    });
    if (!r.ok)
      return {
        ok: false,
        error: r.error || "Gagal membaca db_Yandal_Rank.",
        list: [],
      };
    var src = r.list || [];
    if (!src.length && params.sinkron !== true) {
      // periode belum pernah disinkron → sinkron sekali
      r = getRankYandal({ periode: periode, ulp: ulpFilter, sinkron: true });
      src = r && r.list ? r.list : [];
    }

    var idxTahun = _rankTahunIndexY_(th, ulpFilter);
    var unitMap = _unitPetugasMapY_(ulpFilter);

    var out = [];
    for (var i = 0; i < src.length; i++) {
      var it = src[i];
      if (petugasFilter && it.petugas !== petugasFilter) continue;
      var t = idxTahun[it.petugas],
        rb = Number(it.rankBulanan);
      var poinP0 = _toNumY_(it.pointP0) || 0,
        jmlP0 = _toNumY_(it.jumlahP0) || 0;
      out.push({
        no: 0,
        nama: it.petugas,
        unit: it.ulp || unitMap[it.petugas] || ulpFilter || "-",
        tim: it.tim || "",
        kodeRank: it.kodeRank || "",
        // ---- angka bulan berjalan (langsung dari db_Yandal_Rank) ----
        jumlahShift: _toNumY_(it.jumlahShift) || 0,
        jumlahP0: jmlP0,
        totalPoint: poinP0,
        pointBulanan: poinP0,
        rataRata: jmlP0 ? _bulatY_(poinP0 / jmlP0, 2) : 0,
        menitEfektif: _toNumY_(it.menitEfektif) || 0,
        jamEfektif: it.jamEfektif || "",
        targetJam: it.targetJam || "",
        persenEfektif: _toNumY_(it.persenEfektif) || 0,
        persenVCC: _toNumY_(it.persenVCC) || 0,
        // ---- nilai & peringkat bulanan ----
        nilaiTotal: _toNumY_(it.nilaiTotal) || 0,
        nilaiP0: _toNumY_(it.nilaiP0) || 0,
        nilaiJam: _toNumY_(it.nilaiJam) || 0,
        nilaiShift: _toNumY_(it.nilaiShift) || 0,
        nilaiVCC: _toNumY_(it.nilaiVCC) || 0,
        rankBulanan: isNaN(rb) || rb < 1 ? null : rb,
        sumberRank: "rank",
        // ---- sepanjang tahun (rata-rata Nilai Total seluruh bulan terdata) ----
        nilaiTahun: t ? t.nilaiRata : 0,
        bulanTerdata: t ? t.bulan : 0,
        pointTahunan: t ? _bulatY_(t.pointP0, 2) : 0,
        rankTahunan: t ? t.rankTahunan : null,
      });
    }
    // Urutan tampil: Rank Bulanan (db_Yandal_Rank) → Nilai Total → Rank Tahunan.
    out.sort(function (a, b2) {
      var ba = a.rankBulanan || 9999,
        bb = b2.rankBulanan || 9999;
      if (ba !== bb) return ba - bb;
      if ((b2.nilaiTotal || 0) !== (a.nilaiTotal || 0))
        return (b2.nilaiTotal || 0) - (a.nilaiTotal || 0);
      return (a.rankTahunan || 9999) - (b2.rankTahunan || 9999);
    });
    for (var n = 0; n < out.length; n++) out[n].no = n + 1;

    var jmlTahun = 0;
    for (var kk in idxTahun) jmlTahun++;
    return {
      ok: true,
      list: out,
      periode: periode,
      ulp: ulpFilter,
      bulanLabel: BULAN_ID[bl] + " " + th,
      tahun: th,
      totalPetugasBulan: src.length,
      totalPetugasTahun: jmlTahun,
      jumlahPetugas: out.length,
    };
  } catch (e) {
    return { ok: false, error: e.message, list: [] };
  }
}

// ====== DETAIL PERFORMA INDIVIDU (modal tombol mata di tabel Tim Yandal) ======
// SELALU memakai BULAN BERJALAN + TAHUN BERJALAN (bukan periode filter tabel).
// Sumber: db_Yandal_P0. Baris diakui milik petugas bila namanya ada di kolom Petugas (V) — dipecah _splitPetugasY_.
// Per SHIFT (dikelompokkan per Kode Pekerjaan Shift = Tim+Shift+Tanggal sama):
//   • jamMulai   = Time Stamp Pembuatan TERAWAL dari P0 di shift itu (mulai bekerja)
//   • jamSelesai = Time Stamp Sesudah TERAKHIR (fallback: Pekerjaan / Pembuatan) = selesai bekerja
//   • menitEfektif = GABUNGAN INTERVAL (union) waktu kerja P0 di shift itu — P0 yang waktunya TUMPANG TINDIH
//     dihitung SEKALI, bukan dijumlah. Contoh: 3 P0 sama-sama 09:00–10:00 = 1 jam efektif, bukan 3 jam.
//     Interval tiap P0 = [Time Stamp Pembuatan, Time Stamp Sesudah]; bila Sesudah kosong dipakai Time Stamp
//     Pekerjaan, dan bila tetap kosong/≤ mulai dipakai Pembuatan + Durasi (AN).
//   • menitKotor = Σ Durasi (AN) mentah — hanya pembanding / penanda overlap (tidak dipakai sbg jam efektif)
//   • persen = menitEfektif / 480 (8 jam); rentangMenit = jamSelesai − jamMulai (lama berada di lapangan)
// Pie chart: komposisi JENIS PEKERJAAN P0 bulan berjalan (jumlah P0 per Nama Pekerjaan).
// Gabung interval waktu → { menit, minMs, maxMs }. Interval yang beririsan/bersambung digabung jadi satu.
function _unionMenitY_(iv) {
  if (!iv || !iv.length) return { menit: 0, minMs: NaN, maxMs: NaN };
  var a = iv.slice().sort(function (x, y) {
    return x[0] - y[0];
  });
  var total = 0,
    s = a[0][0],
    e = a[0][1],
    minMs = a[0][0],
    maxMs = a[0][1];
  for (var i = 1; i < a.length; i++) {
    if (a[i][1] > maxMs) maxMs = a[i][1];
    if (a[i][0] <= e) {
      if (a[i][1] > e) e = a[i][1];
    } // tumpang tindih / bersambung → gabung
    else {
      total += e - s;
      s = a[i][0];
      e = a[i][1];
    } // ada jeda → tutup blok, mulai blok baru
  }
  total += e - s;
  return {
    menit: Math.max(0, Math.round(total / 60000)),
    minMs: minMs,
    maxMs: maxMs,
  };
}
// Perbaiki interval SATU P0 sebelum di-union (akar sebab bug rentang 30 jam).
// Data lapangan sering menyimpan Time Stamp Sesudah dengan TANGGAL yang melompat hari
// (jam device meleset / input menyusul keesokan hari), sehingga 1 P0 seolah berdurasi 30 jam.
// Aturan: bila panjang interval melebihi 1 shift (8 jam), JAM pada Time Stamp Sesudah
// ditempelkan ke TANGGAL MULAI; bila hasilnya lebih awal dari jam mulai, ditambah 1 hari
// (benar-benar melewati tengah malam). Bila masih tidak wajar, dipakai kolom Durasi (AN).
function _ivSehatY_(sMs, eMs, menitDurasi) {
  if (isNaN(sMs)) return eMs;
  var maks = MENIT_PER_SHIFT_Y * 60000;
  var dur = Math.max(0, Number(menitDurasi) || 0) * 60000;
  if (isNaN(eMs) || eMs <= sMs) return sMs + dur;
  if (eMs - sMs <= maks) return eMs;
  var ds = new Date(sMs),
    de = new Date(eMs);
  var e2 = new Date(
    ds.getFullYear(),
    ds.getMonth(),
    ds.getDate(),
    de.getHours(),
    de.getMinutes(),
    de.getSeconds(),
    0,
  ).getTime();
  if (e2 < sMs) e2 += 86400000;
  if (e2 - sMs > maks) e2 = sMs + dur;
  return e2;
}
// ====== JENDELA SHIFT (PERBAIKAN BUG: jam efektif melebihi jam kerja) ======
// Shift 1 = 08:00-16:00, Shift 2 = 16:00-24:00, Shift 3 = 00:00-08:00 pada TANGGAL OPERASIONAL.
// SEBAB BUG: interval tiap P0 dipakai apa adanya, jadi bila Time Stamp Sesudah (atau Pekerjaan)
// terbawa ke hari berikutnya / jam device meleset, union interval bisa jadi 25 jam dgn rentang 30 jam
// dan persen > 100%. Sekarang tiap interval DIPOTONG ke jendela shift + diberi plafon 8 jam.
function _shiftWindowMsY_(tanggalMs, shiftNo) {
  var no = Number(shiftNo);
  if (isNaN(tanggalMs) || !no || no < 1 || no > 3) return null; // shift tak dikenal -> tanpa jendela
  var d = new Date(tanggalMs);
  var jamMulai = no === 1 ? 8 : no === 2 ? 16 : 0;
  var start = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    jamMulai,
    0,
    0,
    0,
  ).getTime();
  return { start: start, end: start + MENIT_PER_SHIFT_Y * 60000 };
}
// Potong tiap interval ke jendela shift; interval yang tidak beririsan dibuang.
function _clampIvY_(iv, win) {
  if (!win) return (iv || []).slice();
  var out = [];
  for (var i = 0; i < (iv || []).length; i++) {
    var s = Math.max(iv[i][0], win.start),
      e = Math.min(iv[i][1], win.end);
    if (e > s) out.push([s, e]);
  }
  return out;
}
// Union menit yang SUDAH dibatasi jendela shift + plafon MENIT_PER_SHIFT_Y (480).
// Bila SEMUA interval jatuh di luar jendela (data anomali), interval asli tetap dipakai agar jam
// mulai/selesai tidak hilang, tetapi plafon 8 jam tetap berlaku. u.terpotong = penanda ada koreksi.
function _unionMenitShiftY_(iv, tanggalMs, shiftNo) {
  var win = _shiftWindowMsY_(tanggalMs, shiftNo);
  var cl = _clampIvY_(iv, win);
  var pakai = win && cl.length ? cl : iv || [];
  var uAsli = _unionMenitY_(iv || []);
  var u = _unionMenitY_(pakai);
  if (u.menit > MENIT_PER_SHIFT_Y) u.menit = MENIT_PER_SHIFT_Y;
  u.terpotong = uAsli.menit > u.menit;
  return u;
}
var SHIFT_JAM_Y = {
  1: "08:00 - 16:00",
  2: "16:00 - 00:00",
  3: "00:00 - 08:00",
};
function _shiftNoDariKodeY_(kodeShift) {
  var m = String(kodeShift || "").match(/SHF(\d)/i);
  return m ? parseInt(m[1], 10) : 0;
}
function _menitToJamStrY_(menit) {
  if (menit == null || isNaN(menit)) return "-";
  var t = Math.round(menit),
    j = Math.floor(t / 60),
    m = t % 60,
    p = [];
  if (j > 0) p.push(j + " jam");
  if (m > 0) p.push(m + " menit");
  return p.length ? p.join(" ") : "0 menit";
}
function _bulatY_(n, d) {
  var f = Math.pow(10, d || 0);
  return Math.round(n * f) / f;
}

function getDetailPerformaPetugasY(params) {
  try {
    params = params || {};
    var nama = String(params.petugas || "").trim();
    if (!nama) return { ok: false, error: "Nama petugas wajib diisi." };
    var ulpFilter = String(params.ulp || "").trim();

    var acuanMs = _toMillisY_(params.acuan);
    var acuan = isNaN(acuanMs) ? _nowY_() : new Date(acuanMs);
    var th = acuan.getFullYear(),
      bl = acuan.getMonth();
    var blAwalMs = new Date(th, bl, 1, 0, 0, 0, 0).getTime();
    var blAkhirMs = new Date(th, bl + 1, 0, 23, 59, 59, 999).getTime();
    var thAwalMs = new Date(th, 0, 1, 0, 0, 0, 0).getTime();
    var thAkhirMs = new Date(th, 11, 31, 23, 59, 59, 999).getTime();
    var awalBulan = th + "-" + _padNY_(bl + 1) + "-01";
    var akhirBulan =
      th +
      "-" +
      _padNY_(bl + 1) +
      "-" +
      _padNY_(new Date(th, bl + 1, 0).getDate());

    // DUAL-READ (migrasi): detail performa membaca AKTIF + ARSIP (bulan/tahun berjalan).
    var d = _readSheetDual_(
        SHEET_YANDAL.P0,
        COL_P0.kodeP0,
        COL_P0.folderPath + 1,
      ),
      C = COL_P0;

    var unit = "",
      tim = "";
    var grpTahun = {},
      jenis = {};
    var p0Tahun = 0,
      pointTahun = 0;

    for (var i = 0; i < d.length; i++) {
      var row = d[i];
      var ulpRow = String(row[C.ulp] || "").trim();
      if (ulpFilter && ulpRow !== ulpFilter) continue;
      var orang = _splitPetugasY_(row[C.petugas]);
      var ada = false;
      for (var k = 0; k < orang.length; k++)
        if (orang[k] === nama) {
          ada = true;
          break;
        }
      if (!ada) continue;

      var tMs = _toMillisY_(row[C.tanggal]);
      if (isNaN(tMs) || tMs < thAwalMs || tMs > thAkhirMs) continue; // di luar tahun berjalan
      if (!unit && ulpRow) unit = ulpRow;
      if (!tim) tim = String(row[C.tim] || "").trim();

      var poin = Number(row[C.point]);
      if (isNaN(poin)) poin = 0;
      var menit = _durasiToMenitY_(row[C.durasi]);
      if (isNaN(menit)) menit = 0;
      var kodeShift = String(row[C.kodeShift] || "").trim();

      p0Tahun += 1;
      pointTahun += poin;

      // Komposisi jenis pekerjaan: khusus BULAN berjalan (bahan pie chart)
      if (tMs >= blAwalMs && tMs <= blAkhirMs) {
        var namaKerja =
          String(row[C.namaPekerjaan] || "").trim() ||
          String(row[C.pekerjaanLainnya] || "").trim() ||
          "(Tanpa nama)";
        if (!jenis[namaKerja])
          jenis[namaKerja] = { nama: namaKerja, jumlah: 0, point: 0 };
        jenis[namaKerja].jumlah += 1;
        jenis[namaKerja].point += poin;
      }

      // Kelompokkan per shift (tahun berjalan); simpan INTERVAL waktu tiap P0 untuk digabung nanti
      var key = kodeShift || "tanpaShift-" + _normTgl(row[C.tanggal]);
      if (!grpTahun[key])
        grpTahun[key] = {
          kodeShift: kodeShift,
          tanggalMs: tMs,
          tanggal: _normTgl(row[C.tanggal]),
          hari: String(row[C.hari] || ""),
          shiftNo: _shiftNoDariKodeY_(kodeShift),
          jumlahP0: 0,
          menitKotor: 0,
          point: 0,
          iv: [],
          p0s: [],
        };
      var g = grpTahun[key];
      g.jumlahP0 += 1;
      g.point += poin;
      g.menitKotor += menit;

      var sMs = _toMillisY_(row[C.timestampPembuatan]);
      var eMs = _toMillisY_(row[C.timestampSesudah]);
      if (isNaN(eMs)) eMs = _toMillisY_(row[C.timestampPekerjaan]);
      if (!isNaN(sMs)) {
        eMs = _ivSehatY_(sMs, eMs, menit); // buang lompatan hari + fallback kolom Durasi
        g.iv.push([sMs, eMs]);
      }
      // Rincian tiap P0 (untuk tabel Detail di tab Jam Efektif frontend)
      g.p0s.push({
        kodeP0: String(row[C.kodeP0] || ""),
        pekerjaan:
          String(row[C.namaPekerjaan] || "").trim() ||
          String(row[C.pekerjaanLainnya] || "").trim() ||
          "(Tanpa nama)",
        penyulang: String(row[C.penyulang] || "").trim(),
        section: String(row[C.section] || "").trim(),
        daerah: String(row[C.daerah] || "").trim(),
        jamMulai: isNaN(sMs) ? "-" : _fmtY_(new Date(sMs), "HH:mm"),
        jamSelesai: isNaN(eMs) ? "-" : _fmtY_(new Date(eMs), "HH:mm"),
        durasiMenit: menit,
        durasiStr: _menitToJamStrY_(menit),
        point: _bulatY_(poin, 2),
        status: String(row[C.statusApproval] || "").trim(),
        _sortMs: isNaN(sMs) ? 0 : sMs,
      });
    }

    if (!p0Tahun)
      return {
        ok: true,
        petugas: nama,
        unit: unit || ulpFilter || "-",
        tim: tim || "-",
        bulanLabel: BULAN_ID[bl] + " " + th,
        tahun: th,
        kosong: true,
        ringkasan: {},
        shift: [],
        pekerjaan: [],
      };

    // Gabung interval per shift → jam efektif BERSIH (P0 yang tumpang tindih tidak dihitung dobel)
    var shiftList = [],
      shiftTahun = {};
    var p0Bulan = 0,
      pointBulan = 0,
      menitBulan = 0,
      menitKotorBulan = 0,
      shiftOverlapBulan = 0,
      menitTahun = 0;
    for (var kk in grpTahun) {
      var it = grpTahun[kk];
      var u = _unionMenitShiftY_(it.iv, it.tanggalMs, it.shiftNo); // dipotong ke jendela shift + plafon 8 jam
      menitTahun += u.menit;
      shiftTahun[kk] = true;
      if (it.tanggalMs < blAwalMs || it.tanggalMs > blAkhirMs) continue; // rincian per shift: BULAN berjalan

      p0Bulan += it.jumlahP0;
      pointBulan += it.point;
      menitBulan += u.menit;
      menitKotorBulan += it.menitKotor;
      var overlap = it.menitKotor - u.menit >= 1;
      if (overlap) shiftOverlapBulan++;
      var rentang =
        !isNaN(u.minMs) && !isNaN(u.maxMs)
          ? Math.max(0, Math.round((u.maxMs - u.minMs) / 60000))
          : null;

      shiftList.push({
        tanggal: it.tanggal,
        hari: it.hari,
        shift: it.shiftNo ? "Shift " + it.shiftNo : "-",
        shiftJam: it.shiftNo ? SHIFT_JAM_Y[it.shiftNo] || "" : "",
        jumlahP0: it.jumlahP0,
        jamMulai: isNaN(u.minMs) ? "-" : _fmtY_(new Date(u.minMs), "HH:mm"),
        jamSelesai: isNaN(u.maxMs) ? "-" : _fmtY_(new Date(u.maxMs), "HH:mm"),
        rentangMenit: rentang,
        rentangStr: rentang == null ? "-" : _menitToJamStrY_(rentang),
        menitEfektif: u.menit,
        jamEfektifStr: _menitToJamStrY_(u.menit),
        terpotong: !!u.terpotong,
        menitKotor: it.menitKotor,
        jamKotorStr: _menitToJamStrY_(it.menitKotor),
        overlap: overlap,
        persen: _bulatY_((u.menit / 480) * 100, 1),
        point: _bulatY_(it.point, 2),
        p0List: (it.p0s || []).sort(function (x, y) {
          return x._sortMs - y._sortMs;
        }),
        _sort: it.tanggalMs * 10 + (it.shiftNo || 0),
      });
    }
    shiftList.sort(function (a, b) {
      return b._sort - a._sort;
    });
    for (var s = 0; s < shiftList.length; s++) delete shiftList[s]._sort;

    var pekerjaan = [];
    for (var jn in jenis) pekerjaan.push(jenis[jn]);
    pekerjaan.sort(function (a, b) {
      return b.jumlah - a.jumlah;
    });
    for (var pp = 0; pp < pekerjaan.length; pp++)
      pekerjaan[pp].point = _bulatY_(pekerjaan[pp].point, 2);

    var rB = getRekapPointPetugasY({
      tglAwal: awalBulan,
      tglAkhir: akhirBulan,
      ulp: ulpFilter,
    });
    var rT = getRekapPointPetugasY({
      tglAwal: th + "-01-01",
      tglAkhir: th + "-12-31",
      ulp: ulpFilter,
    });
    var iB = _rekapIndexY_(rB)[nama],
      iT = _rekapIndexY_(rT)[nama];
    var rkD = _rankIndexY_(th + "-" + _padNY_(bl + 1), ulpFilter)[nama] || null; // nilai rank baru (db_Yandal_Rank)

    var jmlShiftBulan = shiftList.length,
      jmlShiftTahun = 0;
    for (var st in shiftTahun) jmlShiftTahun++;
    var jamKerjaBulanMenit = jmlShiftBulan * 480,
      jamKerjaTahunMenit = jmlShiftTahun * 480;

    return {
      ok: true,
      petugas: nama,
      unit: unit || ulpFilter || "-",
      tim: tim || "-",
      bulanLabel: BULAN_ID[bl] + " " + th,
      tahun: th,
      rankBulanan:
        rkD && rkD.rankBulanan ? rkD.rankBulanan : iB ? iB.rank : null,
      nilai: rkD,
      totalPetugasBulan: (rB.list || []).length,
      rankTahunan: iT ? iT.rank : null,
      totalPetugasTahun: (rT.list || []).length,
      ringkasan: {
        jumlahShiftBulan: jmlShiftBulan,
        jumlahP0Bulan: p0Bulan,
        pointBulan: _bulatY_(pointBulan, 2),
        menitEfektifBulan: menitBulan,
        jamEfektifBulanStr: _menitToJamStrY_(menitBulan),
        menitKotorBulan: menitKotorBulan,
        jamKotorBulanStr: _menitToJamStrY_(menitKotorBulan),
        shiftOverlapBulan: shiftOverlapBulan,
        jamKerjaBulanStr: _menitToJamStrY_(jamKerjaBulanMenit),
        persenBulan: jamKerjaBulanMenit
          ? _bulatY_((menitBulan / jamKerjaBulanMenit) * 100, 1)
          : 0,
        rataPerP0BulanStr: p0Bulan
          ? _menitToJamStrY_(menitBulan / p0Bulan)
          : "-",
        jumlahShiftTahun: jmlShiftTahun,
        jumlahP0Tahun: p0Tahun,
        pointTahun: _bulatY_(pointTahun, 2),
        menitEfektifTahun: menitTahun,
        jamEfektifTahunStr: _menitToJamStrY_(menitTahun),
        persenTahun: jamKerjaTahunMenit
          ? _bulatY_((menitTahun / jamKerjaTahunMenit) * 100, 1)
          : 0,
      },
      shift: shiftList,
      pekerjaan: pekerjaan,
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ====== RANK YANDAL (db_Yandal_Rank) — Nilai Total = Jam Efektif 55% + Jumlah Shift 15% + P0 18% + VCC 12% ======
// Satu baris = satu petugas per periode bulanan (kunci: Periode + ULP + Petugas).
// Operator HANYA mengisi kolom Q (Persentase VCC) dan R (Tanggal Capai 100% — TANGGAL saja, tanpa jam).
// Kolom S (Shift Capai 100%) DIHITUNG SERVER: dicari di db_Yandal_Shift — baris dgn Tanggal = kolom R
//   & Petugas memuat nama ybs → diambil nomor Shift-nya. Bila petugas punya >1 shift di tanggal itu,
//   dipakai nomor TERKECIL (paling awal). Tidak ditemukan → dianggap Shift 3 (paling lambat).
// Kolom lain dihitung server oleh sinkronRankYandal() dan TIDAK boleh diedit manual.
// Tata letak: tiap indikator ditulis BERPASANGAN — kolom angka mentah, lalu kolom persentasenya.
//   Jumlah Shift (G)   → % Nilai Shift (H)
//   Point P0 (J)       → % Nilai P0 (K)
//   Jam Efektif (M)    → % Nilai Jam Efektif (P)   [kolom O = % Efektif mentah, tanpa target]
//   Persentase VCC (Q) → % Nilai VCC (W)
// Normalisasi: tiap komponen diubah ke PERSEN (0–100) terhadap targetnya, lalu dirata-rata.
//   % Nilai Shift = Jumlah Shift / TARGET_SHIFT_Y × 100             (dibatasi maks 100; 24 shift = penuh)
//   % Nilai P0   = Point P0 / TARGET_POINT_P0_Y × 100               (dibatasi maks 100)
//   % Nilai Jam  = Menit Efektif / (Jumlah Shift × 480 × 85%) × 100  (dibatasi maks 100)
//   % Nilai VCC  = dasar + reward. Dasar = Persentase VCC × 90% (maks 90; berlaku walau belum 100%).
//                  Reward kecepatan HANYA bagi yang sudah 100%, dari Rank Tercepat VCC:
//                  juara 1 = +10, 2 = +8, 3 = +7, 4–10 = +6, 11–20 = +5, 21–30 = +4, 31+ = +3. Total maks 100.
//   Nilai Total  = (% Nilai Jam × 55%) + (% Nilai Shift × 15%) + (% Nilai P0 × 18%) + (% Nilai VCC × 12%),
//                  disimpan 2 desimal. Bobot diatur di BOBOT_JAM_Y / BOBOT_SHIFT_Y / BOBOT_P0_Y /
//                  BOBOT_VCC_Y (jumlahnya harus 1).
// Skor Tempuh = (Hari Tempuh − 1) × 3 + Nomor Shift; urutan shift 1 → 2 → 3; maks 31×3 = 93.
// Nilai Total kembar dipecah berjenjang: Menit Efektif → Jumlah Shift → Point P0 → Skor Tempuh → Jumlah P0
// (urutan mengikuti bobot terbesar: jam efektif dulu).
// Kembar di angka 0 sengaja DIBIARKAN kembar (tidak diadu).
var RANK_SHEET_Y = "db_Yandal_Rank";
// 26 kolom (A–Z). Kolom BARU: H = % Nilai Shift (disisipkan tepat setelah Jumlah Shift) →
// seluruh kolom lama mulai Jumlah P0 bergeser satu ke kanan; kolom operator kini Q & R.
var COL_RANK_Y = {
  no: 0,
  kodeRank: 1,
  periode: 2,
  ulp: 3,
  tim: 4,
  petugas: 5,
  jumlahShift: 6,
  nilaiShift: 7,
  jumlahP0: 8,
  pointP0: 9,
  nilaiP0: 10,
  menitEfektif: 11,
  jamEfektif: 12,
  targetJam: 13,
  persenEfektif: 14,
  nilaiJam: 15,
  persenVCC: 16,
  tglVCC: 17,
  shiftVCC: 18,
  hariTempuh: 19,
  skorTempuh: 20,
  rankTercepat: 21,
  nilaiVCC: 22,
  nilaiTotal: 23,
  rankBulanan: 24,
  timestamp: 25,
};
var HEADER_RANK_Y = [
  "No",
  "Kode Rank",
  "Periode",
  "ULP",
  "Tim",
  "Petugas",
  "Jumlah Shift",
  "% Nilai Shift",
  "Jumlah P0",
  "Point P0",
  "% Nilai P0",
  "Menit Efektif",
  "Jam Efektif",
  "Target Jam",
  "% Efektif",
  "% Nilai Jam Efektif",
  "Persentase VCC",
  "Tanggal Capai 100% VCC",
  "Shift Capai 100% VCC",
  "Hari Tempuh",
  "Skor Tempuh",
  "Rank Tercepat VCC",
  "% Nilai VCC",
  "Nilai Total (%)",
  "Rank Bulanan",
  "Time Stamp Recalc",
];

var TARGET_POINT_P0_Y = 1000; // point P0 yang dianggap "sangat baik" dalam 1 bulan (terbaik saat ini 900)
var TARGET_SHIFT_Y = 24; // jumlah shift per bulan yang bernilai penuh (100% Nilai Shift); lebih dari ini tidak menambah
var TARGET_PERSEN_EFEKTIF_Y = 0.85; // target 85% dari total jam kerja (jumlah shift × 8 jam)
var MENIT_PER_SHIFT_Y = 480; // 8 jam
var SKALA_NILAI_Y = 100; // semua nilai dinyatakan dalam PERSEN (0–100)
var DESIMAL_NILAI_Y = 2; // 2 desimal agar nilai kembar semu tidak muncul
var SKOR_TEMPUH_MAKS_Y = 93; // 31 hari × 3 shift
var BASIS_VCC_Y = 90; // nilai dasar bila Persentase VCC = 100 (sisa 10 = reward kecepatan)

// Peta shift petugas per tanggal dari db_Yandal_Shift: { 'yyyy-MM-dd|Nama Petugas' : nomorShift }.
// Kolom Petugas bisa memuat beberapa nama (dipecah _splitPetugasY_). Bila satu petugas punya lebih dari
// satu shift pada tanggal yang sama, diambil nomor TERKECIL (shift paling awal → paling menguntungkan).
function _shiftPetugasTglMapY_(ulpFilter) {
  var map = {},
    sh = _shY_(SHEET_YANDAL.SHIFT);
  if (!sh || sh.getLastRow() <= 1) return map;
  var d = _allY_(sh),
    S = COL_YANDAL_SHIFT;
  for (var i = 1; i < d.length; i++) {
    if (ulpFilter && String(d[i][S.ulp] || "").trim() !== ulpFilter) continue;
    var ms = _toMillisY_(d[i][S.tanggal]);
    if (isNaN(ms)) continue;
    var no = _shiftNoY_(d[i][S.shift]); // label "Shift 1 (08:00 - 16:00)" → 1
    if (!no) {
      var mm = String(d[i][S.shift] || "").match(/(\d)/);
      no = mm ? parseInt(mm[1], 10) : 0;
    }
    if (!no || no < 1 || no > 3) continue;
    var tgl = _fmtY_(new Date(ms), "yyyy-MM-dd");
    var orang = _splitPetugasY_(d[i][S.petugas]);
    for (var k = 0; k < orang.length; k++) {
      var key = tgl + "|" + orang[k];
      if (!map[key] || no < map[key]) map[key] = no;
    }
  }
  return map;
}
// Nomor shift petugas pada tanggal tertentu (0 bila tidak ada jadwal shift di tanggal itu).
function _shiftPetugasPadaTglY_(map, nama, ms) {
  if (isNaN(ms) || !map) return 0;
  return (
    map[_fmtY_(new Date(ms), "yyyy-MM-dd") + "|" + String(nama || "").trim()] ||
    0
  );
}

// Periode bisa tersimpan sbg TEKS 'YYYY-MM' ATAU (bila Google Sheets terlanjur mengubahnya) Date/serial.
// SEMUA pembacaan kolom Periode WAJIB lewat helper ini. Tanpa ini, perbandingan teks gagal →
// baris lama tidak dikenali → sinkron menambah baris baru terus (DUPLIKAT) & filter tidak menemukan data.
function _periodeStrY_(v) {
  if (v == null || v === "") return "";
  if (Object.prototype.toString.call(v) === "[object Date]")
    return _fmtY_(v, "yyyy-MM");
  if (typeof v === "number") {
    var msN = _toMillisY_(v);
    return isNaN(msN) ? "" : _fmtY_(new Date(msN), "yyyy-MM");
  }
  var s = String(v).trim();
  var m = s.match(/^(\d{4})-(\d{1,2})/);
  if (m) return m[1] + "-" + _padY_(Number(m[2]), 2);
  var ms2 = _toMillisY_(s);
  return isNaN(ms2) ? s : _fmtY_(new Date(ms2), "yyyy-MM");
}

// BOBOT KOMPOSISI NILAI TOTAL (jumlah harus 1). Ubah di sini bila kebijakan porsi berubah.
//   Jam Kerja Efektif 55% | Jumlah Shift 15% | Point P0 18% | Pencapaian VCC 12%
var BOBOT_JAM_Y = 0.55;
var BOBOT_SHIFT_Y = 0.15;
var BOBOT_P0_Y = 0.18;
var BOBOT_VCC_Y = 0.12;

// Reward kecepatan VCC dari Rank Tercepat (hanya bagi yang sudah 100%). Ubah tabel di sini bila kebijakan berubah.
function _rewardVccY_(rank) {
  var r = Number(rank);
  if (!r || r < 1) return 0;
  if (r === 1) return 10;
  if (r === 2) return 8;
  if (r === 3) return 7;
  if (r <= 10) return 6;
  if (r <= 20) return 5;
  if (r <= 30) return 4;
  return 3;
}

// Inisial nama: "Syahludin Guswan" -> "SG"; "Sumarno" -> "S"
function _inisialNamaY_(nama) {
  var p = String(nama || "")
      .trim()
      .split(/\s+/),
    s = "";
  for (var i = 0; i < p.length; i++)
    if (p[i]) s += p[i].charAt(0).toUpperCase();
  return s || "X";
}

// Peta Nama ULP -> Kode ULP dari db_Users
function _kodeUlpMapY_() {
  var map = {};
  try {
    var sh = _ssY_().getSheetByName("db_Users");
    if (!sh) return map;
    var d = _allY_(sh);
    for (var i = 1; i < d.length; i++) {
      var u = String(d[i][COL_USERS.ulp] || "").trim(),
        k = String(d[i][COL_USERS.kodeUlp] || "").trim();
      if (u && k && !map[u]) map[u] = k;
    }
  } catch (e) {}
  return map;
}

// RNK-<KodeULP><MMYY>-<Inisial>; bila kembar ditambah angka urut (…-S, …-S2, …-S3)
function genKodeRankY_(kodeUlp, periode, nama, dipakai) {
  var mmyy = periode.substring(5, 7) + periode.substring(2, 4);
  var dasar = "RNK-" + (kodeUlp || "0000") + mmyy + "-" + _inisialNamaY_(nama);
  var kode = dasar,
    n = 2;
  while (dipakai && dipakai[kode]) {
    kode = dasar + n;
    n++;
  }
  return kode;
}

// Peringkat gaya olahraga (nilai sama = rank sama, nomor berikutnya dilompati).
// getVal mengembalikan null bila baris tidak ikut diperingkat.
// tiebreak (opsional) mengembalikan array angka; makin besar makin unggul, dibandingkan berurutan.
// Baris bernilai 0 TIDAK diadu tiebreak — sengaja dibiarkan kembar.
function _peringkatY_(arr, getVal, asc, setFn, tiebreak) {
  var idxs = [];
  for (var i = 0; i < arr.length; i++) if (getVal(arr[i]) != null) idxs.push(i);

  var _kunci = function (o) {
    if (!tiebreak) return [];
    if (!getVal(o)) return [];
    return tiebreak(o) || [];
  };
  var _bandingKunci = function (a, b) {
    var ka = _kunci(a),
      kb = _kunci(b),
      n = Math.max(ka.length, kb.length);
    for (var i = 0; i < n; i++) {
      var xa = Number(ka[i]) || 0,
        xb = Number(kb[i]) || 0;
      if (xa !== xb) return xb - xa;
    }
    return 0;
  };

  idxs.sort(function (a, b) {
    var x = getVal(arr[a]),
      y = getVal(arr[b]);
    if (x !== y) return asc ? x - y : y - x;
    return _bandingKunci(arr[a], arr[b]);
  });

  var rank = 0,
    cnt = 0,
    prevIdx = -1;
  for (var j = 0; j < idxs.length; j++) {
    cnt++;
    var it = arr[idxs[j]];
    var sama =
      prevIdx >= 0 &&
      getVal(it) === getVal(arr[prevIdx]) &&
      _bandingKunci(it, arr[prevIdx]) === 0;
    if (!sama) rank = cnt;
    setFn(it, rank);
    prevIdx = idxs[j];
  }
}

// Buat sheet + header bila belum ada
function _ensureSheetRankY_() {
  var ss = _ssY_();
  var sh = ss.getSheetByName(RANK_SHEET_Y);
  if (!sh) sh = ss.insertSheet(RANK_SHEET_Y);
  // Header ditulis ulang bila belum ada ATAU tidak persis sama dgn HEADER_RANK_Y (mis. setelah kolom
  // '% Nilai Shift' ditambahkan). PENTING: bila sheet lama masih 25 kolom, SISIPKAN dulu kolom kosong
  // di posisi H secara manual agar data lama ikut bergeser — skrip hanya memperbaiki barisan judul.
  var perluHeader = sh.getLastRow() < 1;
  if (!perluHeader) {
    if (sh.getMaxColumns() < HEADER_RANK_Y.length)
      sh.insertColumnsAfter(
        sh.getMaxColumns(),
        HEADER_RANK_Y.length - sh.getMaxColumns(),
      );
    var hd = sh.getRange(1, 1, 1, HEADER_RANK_Y.length).getValues()[0];
    for (var hi = 0; hi < HEADER_RANK_Y.length; hi++) {
      if (String(hd[hi] || "").trim() !== HEADER_RANK_Y[hi]) {
        perluHeader = true;
        break;
      }
    }
  }
  if (perluHeader) {
    if (sh.getMaxColumns() < HEADER_RANK_Y.length)
      sh.insertColumnsAfter(
        sh.getMaxColumns(),
        HEADER_RANK_Y.length - sh.getMaxColumns(),
      );
    sh.getRange(1, 1, 1, HEADER_RANK_Y.length).setValues([HEADER_RANK_Y]);
    sh.setFrozenRows(1);
  }
  // Kolom Periode DIPAKSA berformat TEKS: '2026-07' jangan sampai diubah Sheets menjadi tanggal.
  try {
    sh.getRange(
      2,
      COL_RANK_Y.periode + 1,
      Math.max(1, sh.getMaxRows() - 1),
      1,
    ).setNumberFormat("@");
  } catch (eFmt) {}
  return sh;
}

// Daftar SELURUH petugas (termasuk yang belum punya P0 bulan ini)
function _semuaPetugasY_(ulpFilter) {
  var out = {};
  try {
    var r = getListPetugasYandal({ ulp: ulpFilter });
    var arr = r && r.list ? r.list : r instanceof Array ? r : [];
    for (var i = 0; i < arr.length; i++) {
      var it = arr[i];
      var nm =
        typeof it === "string"
          ? it
          : String((it && (it.nama || it.petugas)) || "");
      nm = nm.trim();
      if (!nm) continue;
      out[nm] =
        it && typeof it === "object" ? String(it.unit || it.ulp || "") : "";
    }
  } catch (e) {}
  return out;
}

/**
 * Sinkronkan db_Yandal_Rank untuk satu periode (default: bulan berjalan).
 * Aman dijalankan berulang: kolom operator (P, Q) tidak pernah ditimpa; R diisi server dari db_Yandal_Shift.
 * @param {Object} opts { periode:'YYYY-MM', ulp:'' } — ulp kosong = semua ULP
 */
function sinkronRankYandal(opts) {
  try {
    opts = opts || {};
    var periode =
      String(opts.periode || "").trim() || _fmtY_(_nowY_(), "yyyy-MM");
    var ulpFilter = String(opts.ulp || "").trim();
    var th = Number(periode.substring(0, 4)),
      bl = Number(periode.substring(5, 7));
    if (!th || !bl)
      return { ok: false, message: "Periode harus format YYYY-MM" };
    var awalMs = new Date(th, bl - 1, 1).getTime();
    var akhirMs = new Date(th, bl, 1).getTime() - 1;

    // 1) Agregasi dari db_Yandal_P0 (interval waktu disimpan untuk digabung/union)
    //    HANYA baris ber-Status Approval P0 = "Approved" yang dihitung — baris Menunggu/Rejected
    //    diabaikan total (tidak masuk Jumlah P0, Point, Jumlah Shift, maupun Menit Efektif).
    //    Durasi tiap P0 TIDAK dibatasi: panjang interval apa adanya, lalu di-union per shift.
    // DUAL-READ (migrasi): agregasi periode lama butuh P0 yg sudah pindah ke arsip.
    var C = COL_P0,
      d = _readSheetDual_(
        SHEET_YANDAL.P0,
        COL_P0.kodeP0,
        COL_P0.folderPath + 1,
      ),
      agg = {};
    for (var i = 0; i < d.length; i++) {
      var row = d[i];
      var ulpRow = String(row[C.ulp] || "").trim();
      if (ulpFilter && ulpRow !== ulpFilter) continue;
      var tMs = _toMillisY_(row[C.tanggal]);
      if (isNaN(tMs) || tMs < awalMs || tMs > akhirMs) continue;
      if (String(row[C.statusApproval] || "").trim() !== "Approved") continue; // hanya P0 yang sudah disetujui

      var poin = Number(row[C.point]);
      if (isNaN(poin)) poin = 0;
      var menit = _durasiToMenitY_(row[C.durasi]);
      if (isNaN(menit)) menit = 0;
      var kodeShift =
        String(row[C.kodeShift] || "").trim() ||
        "tgl-" + _normTgl(row[C.tanggal]);
      var sMs = _toMillisY_(row[C.timestampPembuatan]);
      var eMs = _toMillisY_(row[C.timestampSesudah]);
      if (isNaN(eMs)) eMs = _toMillisY_(row[C.timestampPekerjaan]);

      var orang = _splitPetugasY_(row[C.petugas]);
      for (var k = 0; k < orang.length; k++) {
        var nm = orang[k];
        if (!nm) continue;
        if (!agg[nm])
          agg[nm] = {
            ulp: ulpRow,
            tim: String(row[C.tim] || "").trim(),
            jumlahP0: 0,
            point: 0,
            shift: {},
          };
        var a = agg[nm];
        if (!a.ulp && ulpRow) a.ulp = ulpRow;
        if (!a.tim) a.tim = String(row[C.tim] || "").trim();
        a.jumlahP0 += 1;
        a.point += poin;
        if (!a.shift[kodeShift])
          a.shift[kodeShift] = {
            iv: [],
            tglMs: tMs,
            shiftNo: _shiftNoDariKodeY_(kodeShift),
          }; // simpan tanggal & nomor shift utk pemotongan jendela
        if (!isNaN(sMs)) {
          var e2 = _ivSehatY_(sMs, eMs, menit); // buang lompatan hari + fallback kolom Durasi
          a.shift[kodeShift].iv.push([sMs, e2]);
        }
      }
    }

    // 2) Gabungkan dengan daftar seluruh petugas
    var daftar = _semuaPetugasY_(ulpFilter);
    for (var nmA in agg) if (!(nmA in daftar)) daftar[nmA] = agg[nmA].ulp;

    // 3) Baris lama: ambil kolom VCC milik operator + kode rank yang sudah terbit
    // Kunci baris = Periode + ULP + Petugas. Periode dibaca lewat _periodeStrY_ (tahan bila Sheets
    // mengubah teks '2026-07' menjadi tanggal) → baris lama SELALU dikenali, tidak lagi menambah duplikat.
    // Baris kembar sisa sinkron lama otomatis DIHAPUS (nilai VCC-nya dipindahkan ke baris yang dipertahankan).
    var sh = _ensureSheetRankY_(),
      R = COL_RANK_Y,
      idx = {},
      kodeDipakai = {};
    for (var putaran = 0; putaran < 2; putaran++) {
      idx = {};
      kodeDipakai = {};
      var ex = _allY_(sh),
        dupRows = [];
      for (var r = 1; r < ex.length; r++) {
        var kd = String(ex[r][R.kodeRank] || "").trim();
        if (_periodeStrY_(ex[r][R.periode]) !== periode) {
          if (kd) kodeDipakai[kd] = true;
          continue;
        }
        var kunci =
          String(ex[r][R.ulp] || "").trim() +
          "|" +
          String(ex[r][R.petugas] || "").trim();
        if (idx[kunci]) {
          var vccLama = Number(idx[kunci].row[R.persenVCC]) || 0,
            vccDup = Number(ex[r][R.persenVCC]) || 0;
          if (!vccLama && vccDup) {
            // isian operator ada di baris kembar → selamatkan ke baris utama
            _setY_(sh, idx[kunci].rowNum, R.persenVCC, ex[r][R.persenVCC]);
            _setY_(sh, idx[kunci].rowNum, R.tglVCC, ex[r][R.tglVCC]);
            idx[kunci].row[R.persenVCC] = ex[r][R.persenVCC];
            idx[kunci].row[R.tglVCC] = ex[r][R.tglVCC];
          }
          dupRows.push(r + 1);
          continue;
        }
        if (kd) kodeDipakai[kd] = true;
        idx[kunci] = { rowNum: r + 1, row: ex[r] };
      }
      if (!dupRows.length) break;
      dupRows.sort(function (a, b) {
        return b - a;
      }); // hapus dari bawah agar nomor baris tidak bergeser
      for (var dr = 0; dr < dupRows.length; dr++) sh.deleteRow(dupRows[dr]);
      Logger.log(
        "sinkronRankYandal: " +
          dupRows.length +
          " baris duplikat periode " +
          periode +
          " dihapus",
      );
      // putaran ke-2: bangun ulang indeks dari sheet yang sudah bersih
    }

    // 4) Hitung nilai tiap petugas
    var ulpKode = _kodeUlpMapY_(),
      shiftMap = _shiftPetugasTglMapY_(ulpFilter),
      list = [];
    for (var nm2 in daftar) {
      var a2 = agg[nm2] || {
        ulp: daftar[nm2] || ulpFilter || "",
        tim: "",
        jumlahP0: 0,
        point: 0,
        shift: {},
      };
      var menitEf = 0,
        jmlShift = 0;
      // Jam efektif per shift DIBATASI jendela shift (8 jam) -> tidak mungkin lagi > jam kerja.
      for (var ks in a2.shift) {
        jmlShift++;
        var g2 = a2.shift[ks];
        menitEf += _unionMenitShiftY_(g2.iv, g2.tglMs, g2.shiftNo).menit;
      }

      var ulpNm = a2.ulp || daftar[nm2] || ulpFilter || "";
      var lama = idx[ulpNm + "|" + nm2];
      var persenVCC = lama ? Number(lama.row[R.persenVCC]) || 0 : 0;
      var tglVCCraw = lama ? lama.row[R.tglVCC] : "";
      var shiftVCC = _shiftPetugasPadaTglY_(
        shiftMap,
        nm2,
        _toMillisY_(tglVCCraw),
      ); // server: dicari di db_Yandal_Shift (tanggal Q + nama petugas)
      var kode =
        (lama && String(lama.row[R.kodeRank] || "").trim()) ||
        genKodeRankY_(ulpKode[ulpNm], periode, nm2, kodeDipakai);
      kodeDipakai[kode] = true;

      var targetMenit = Math.round(
        jmlShift * MENIT_PER_SHIFT_Y * TARGET_PERSEN_EFEKTIF_Y,
      );

      // VCC: hari tempuh & skor tempuh (hanya bila sudah 100% dan tanggalnya terbaca)
      var hariTempuh = null,
        skor = null,
        tMsV = _toMillisY_(tglVCCraw);
      if (persenVCC >= 100 && !isNaN(tMsV)) {
        var dv = new Date(tMsV);
        hariTempuh =
          Math.round(
            (new Date(dv.getFullYear(), dv.getMonth(), dv.getDate()).getTime() -
              awalMs) /
              86400000,
          ) + 1;
        if (hariTempuh < 1) hariTempuh = 1;
        var us = shiftVCC >= 1 && shiftVCC <= 3 ? shiftVCC : 3; // shift kosong dianggap paling lambat
        skor = (hariTempuh - 1) * 3 + us;
      }

      var nilaiShift = Math.min(
        SKALA_NILAI_Y,
        _bulatY_((jmlShift / TARGET_SHIFT_Y) * SKALA_NILAI_Y, DESIMAL_NILAI_Y),
      ); // 24 shift = 100%
      var nilaiP0 = Math.min(
        SKALA_NILAI_Y,
        _bulatY_(
          (a2.point / TARGET_POINT_P0_Y) * SKALA_NILAI_Y,
          DESIMAL_NILAI_Y,
        ),
      );
      var nilaiJam =
        targetMenit > 0
          ? Math.min(
              SKALA_NILAI_Y,
              _bulatY_(
                (menitEf / targetMenit) * SKALA_NILAI_Y,
                DESIMAL_NILAI_Y,
              ),
            )
          : 0;
      // Dasar VCC = persentase capaian × 90%. Reward kecepatan ditambahkan di langkah 5, setelah Rank Tercepat diketahui.
      var dasarVCC = Math.min(
        BASIS_VCC_Y,
        _bulatY_((Math.max(0, persenVCC) / 100) * BASIS_VCC_Y, DESIMAL_NILAI_Y),
      );

      list.push({
        rowNum: lama ? lama.rowNum : 0,
        kode: kode,
        ulp: ulpNm,
        tim: a2.tim,
        petugas: nm2,
        jumlahShift: jmlShift,
        nilaiShift: nilaiShift,
        jumlahP0: a2.jumlahP0,
        pointP0: _bulatY_(a2.point, 2),
        menitEfektif: menitEf,
        jamEfektif: _menitToJamStrY_(menitEf),
        targetJam: _menitToJamStrY_(targetMenit),
        persenEfektif:
          jmlShift > 0
            ? _bulatY_((menitEf / (jmlShift * MENIT_PER_SHIFT_Y)) * 100, 1)
            : 0,
        persenVCC: persenVCC,
        tglVCC: tglVCCraw,
        shiftVCC: shiftVCC || "",
        hariTempuh: hariTempuh,
        skorTempuh: skor,
        rankTercepat: null,
        nilaiP0: nilaiP0,
        nilaiJam: nilaiJam,
        nilaiVCC: dasarVCC,
        rewardVCC: 0,
        nilaiTotal: 0,
        rankBulanan: null,
      });
    }

    // 5) Peringkat — dihitung per ULP
    var byUlp = {};
    for (var li = 0; li < list.length; li++) {
      var u = list[li].ulp || "-";
      if (!byUlp[u]) byUlp[u] = [];
      byUlp[u].push(list[li]);
    }
    for (var uu in byUlp) {
      _peringkatY_(
        byUlp[uu],
        function (x) {
          return x.skorTempuh;
        },
        true,
        function (x, rk) {
          x.rankTercepat = rk;
        },
      );

      // Reward kecepatan + Nilai VCC final + Nilai Total (WAJIB setelah Rank Tercepat diketahui)
      for (var gg = 0; gg < byUlp[uu].length; gg++) {
        var itR = byUlp[uu][gg];
        itR.rewardVCC =
          itR.persenVCC >= 100 ? _rewardVccY_(itR.rankTercepat) : 0;
        itR.nilaiVCC = Math.min(
          SKALA_NILAI_Y,
          _bulatY_(itR.nilaiVCC + itR.rewardVCC, DESIMAL_NILAI_Y),
        );
        itR.nilaiTotal = _bulatY_(
          itR.nilaiJam * BOBOT_JAM_Y +
            itR.nilaiShift * BOBOT_SHIFT_Y +
            itR.nilaiP0 * BOBOT_P0_Y +
            itR.nilaiVCC * BOBOT_VCC_Y,
          DESIMAL_NILAI_Y,
        ); // porsi: jam efektif 55%, jumlah shift 15%, P0 18%, VCC 12%
      }

      _peringkatY_(
        byUlp[uu],
        function (x) {
          return x.nilaiTotal;
        },
        false,
        function (x, rk) {
          x.rankBulanan = rk;
        },
        function (x) {
          return [
            x.menitEfektif,
            x.jumlahShift,
            x.pointP0,
            x.skorTempuh == null ? 0 : SKOR_TEMPUH_MAKS_Y - x.skorTempuh,
            x.jumlahP0,
          ];
        },
      );
    }

    // 6) Tulis ke sheet
    var now = _nowY_(),
      tambah = [];
    for (var w = 0; w < list.length; w++) {
      var it = list[w],
        arr = [];
      for (var z = 0; z < HEADER_RANK_Y.length; z++) arr.push("");
      arr[R.no] = w + 1;
      arr[R.kodeRank] = it.kode;
      arr[R.periode] = periode;
      arr[R.ulp] = it.ulp;
      arr[R.tim] = it.tim;
      arr[R.petugas] = it.petugas;
      arr[R.jumlahShift] = it.jumlahShift;
      arr[R.nilaiShift] = it.nilaiShift;
      arr[R.jumlahP0] = it.jumlahP0;
      arr[R.pointP0] = it.pointP0;
      arr[R.menitEfektif] = it.menitEfektif;
      arr[R.jamEfektif] = it.jamEfektif;
      arr[R.targetJam] = it.targetJam;
      arr[R.persenEfektif] = it.persenEfektif;
      arr[R.persenVCC] = it.persenVCC;
      arr[R.tglVCC] = it.tglVCC;
      arr[R.shiftVCC] = it.shiftVCC;
      arr[R.hariTempuh] = it.hariTempuh == null ? "" : it.hariTempuh;
      arr[R.skorTempuh] = it.skorTempuh == null ? "" : it.skorTempuh;
      arr[R.rankTercepat] = it.rankTercepat == null ? "" : it.rankTercepat;
      arr[R.nilaiP0] = it.nilaiP0;
      arr[R.nilaiJam] = it.nilaiJam;
      arr[R.nilaiVCC] = it.nilaiVCC;
      arr[R.nilaiTotal] = it.nilaiTotal;
      arr[R.rankBulanan] = it.rankBulanan == null ? "" : it.rankBulanan;
      arr[R.timestamp] = _fmtY_(now, "dd/MM/yyyy HH:mm:ss");
      if (it.rowNum)
        sh.getRange(it.rowNum, 1, 1, HEADER_RANK_Y.length).setValues([arr]);
      else tambah.push(arr);
    }
    if (tambah.length)
      sh.getRange(
        sh.getLastRow() + 1,
        1,
        tambah.length,
        HEADER_RANK_Y.length,
      ).setValues(tambah);

    Logger.log(
      "sinkronRankYandal: periode=" +
        periode +
        " petugas=" +
        list.length +
        " barisBaru=" +
        tambah.length,
    );
    return {
      ok: true,
      periode: periode,
      jumlahPetugas: list.length,
      ditambah: tambah.length,
    };
  } catch (e) {
    Logger.log("sinkronRankYandal ERROR: " + e);
    return { ok: false, message: String(e) };
  }
}

// Baca db_Yandal_Rank untuk ditampilkan di menu Tim Yandal. args.sinkron=true → hitung ulang dulu.
function getRankYandal(args) {
  try {
    args = args || {};
    var periode =
      String(args.periode || "").trim() || _fmtY_(_nowY_(), "yyyy-MM");
    var ulpFilter = String(args.ulp || "").trim();
    if (args.sinkron) sinkronRankYandal({ periode: periode, ulp: ulpFilter });

    var sh = _ensureSheetRankY_(),
      R = COL_RANK_Y,
      d = _allY_(sh),
      out = [];
    for (var i = 1; i < d.length; i++) {
      if (_periodeStrY_(d[i][R.periode]) !== periode) continue;
      var u = String(d[i][R.ulp] || "").trim();
      if (ulpFilter && u !== ulpFilter) continue;
      out.push({
        kodeRank: String(d[i][R.kodeRank] || ""),
        ulp: u,
        tim: String(d[i][R.tim] || ""),
        petugas: String(d[i][R.petugas] || ""),
        jumlahShift: _toNumY_(d[i][R.jumlahShift]),
        nilaiShift: _toNumY_(d[i][R.nilaiShift]),
        jumlahP0: _toNumY_(d[i][R.jumlahP0]),
        pointP0: _toNumY_(d[i][R.pointP0]),
        menitEfektif: _toNumY_(d[i][R.menitEfektif]),
        jamEfektif: String(d[i][R.jamEfektif] || ""),
        targetJam: String(d[i][R.targetJam] || ""),
        persenEfektif: _toNumY_(d[i][R.persenEfektif]),
        persenVCC: _toNumY_(d[i][R.persenVCC]),
        hariTempuh: d[i][R.hariTempuh],
        rankTercepat: d[i][R.rankTercepat],
        nilaiP0: _toNumY_(d[i][R.nilaiP0]),
        nilaiJam: _toNumY_(d[i][R.nilaiJam]),
        nilaiVCC: _toNumY_(d[i][R.nilaiVCC]),
        nilaiTotal: _toNumY_(d[i][R.nilaiTotal]),
        rankBulanan: d[i][R.rankBulanan],
      });
    }
    out.sort(function (a, b) {
      return (b.nilaiTotal || 0) - (a.nilaiTotal || 0);
    });
    return { ok: true, periode: periode, list: out, jumlahPetugas: out.length };
  } catch (e) {
    return { ok: false, error: e.message, list: [] };
  }
}

// ====== INPUT PENCAPAIAN VCC (SIE-Teknik, tab "Input Pencapaian VCC Yandal") ======
// HANYA 2 kolom yang boleh disentuh operator: Q (Persentase VCC) & R (Tanggal Capai 100% VCC).
// Kolom lain (termasuk S Shift, T Hari Tempuh, U Skor Tempuh, V Rank Tercepat, W % Nilai VCC,
// X Nilai Total, Y Rank Bulanan) DIHITUNG ULANG server lewat sinkronRankYandal setelah penyimpanan.

// Daftar baris VCC 1 periode. args: { periode:'YYYY-MM', ulp?, sinkron? }
// Baris belum ada (sheet kosong) → otomatis disinkronkan dulu supaya operator langsung dapat mengisi.
function getVccYandalList(args) {
  try {
    args = args || {};
    var periode =
      String(args.periode || "").trim() || _fmtY_(_nowY_(), "yyyy-MM");
    var ulpFilter = String(args.ulp || "").trim();
    var sh = _ensureSheetRankY_(),
      R = COL_RANK_Y;

    var adaPeriode = false,
      d0 = _allY_(sh);
    for (var c = 1; c < d0.length; c++) {
      if (_periodeStrY_(d0[c][R.periode]) !== periode) continue;
      if (ulpFilter && String(d0[c][R.ulp] || "").trim() !== ulpFilter)
        continue;
      adaPeriode = true;
      break;
    }
    if (args.sinkron || !adaPeriode)
      sinkronRankYandal({ periode: periode, ulp: ulpFilter });

    var d = _allY_(sh),
      out = [];
    for (var i = 1; i < d.length; i++) {
      if (_periodeStrY_(d[i][R.periode]) !== periode) continue;
      var u = String(d[i][R.ulp] || "").trim();
      if (ulpFilter && u !== ulpFilter) continue;
      var tMs = _toMillisY_(d[i][R.tglVCC]);
      out.push({
        kodeRank: String(d[i][R.kodeRank] || ""),
        periode: periode,
        ulp: u,
        tim: String(d[i][R.tim] || ""),
        petugas: String(d[i][R.petugas] || ""),
        persenVCC: _toNumY_(d[i][R.persenVCC]) || 0,
        tglVCC: isNaN(tMs) ? "" : _fmtY_(new Date(tMs), "yyyy-MM-dd"), // utk <input type="date">
        tglVCCStr: isNaN(tMs) ? "" : _tglDMY_(new Date(tMs)), // utk tampilan tabel
        shiftVCC: d[i][R.shiftVCC],
        hariTempuh: d[i][R.hariTempuh],
        rankTercepat: d[i][R.rankTercepat],
        nilaiVCC: _toNumY_(d[i][R.nilaiVCC]) || 0,
        nilaiTotal: _toNumY_(d[i][R.nilaiTotal]) || 0,
        rankBulanan: d[i][R.rankBulanan],
      });
    }
    out.sort(function (a, b) {
      return (
        String(a.ulp).localeCompare(String(b.ulp)) ||
        String(a.petugas).localeCompare(String(b.petugas))
      );
    });
    for (var n = 0; n < out.length; n++) out[n].no = n + 1;
    return {
      ok: true,
      periode: periode,
      ulp: ulpFilter,
      list: out,
      jumlahPetugas: out.length,
    };
  } catch (e) {
    return { ok: false, error: e.message, list: [] };
  }
}

// Simpan Persentase VCC (P) & Tanggal Capai 100% VCC (Q) untuk SATU baris (kunci: Kode Rank).
// args: { kodeRank, persenVCC, tanggal:'yyyy-MM-dd'|'' , username? }
// Setelah tersimpan, periode terkait langsung disinkronkan agar Shift, Hari Tempuh, Skor Tempuh,
// Rank Tercepat, % Nilai VCC, Nilai Total, dan Rank Bulanan ikut diperbarui.
function setVccYandal(args) {
  try {
    args = args || {};
    var kodeRank = String(args.kodeRank || "").trim();
    if (!kodeRank) return { ok: false, error: "Kode Rank wajib diisi." };

    var persen =
      args.persenVCC === "" || args.persenVCC == null
        ? 0
        : _toNumY_(args.persenVCC);
    if (isNaN(persen))
      return { ok: false, error: "Persentase VCC harus berupa angka." };
    if (persen < 0 || persen > 100)
      return { ok: false, error: "Persentase VCC harus antara 0 dan 100." };

    var tglStr = String(args.tanggal || "").trim();
    var tglMs = tglStr ? _toMillisY_(tglStr) : NaN;
    if (tglStr && isNaN(tglMs))
      return { ok: false, error: "Tanggal Capai 100% VCC tidak terbaca." };

    var sh = _ensureSheetRankY_(),
      R = COL_RANK_Y;
    var f = _findRowY_(sh, R.kodeRank, kodeRank);
    if (!f)
      return { ok: false, error: "Baris rank tidak ditemukan: " + kodeRank };
    var periode = _periodeStrY_(f.row[R.periode]);

    // Tanggal wajib bila sudah 100% (dipakai menghitung Hari Tempuh & Rank Tercepat).
    if (persen >= 100 && !tglStr)
      return {
        ok: false,
        error: "Persentase 100% wajib disertai Tanggal Capai 100% VCC.",
      };
    // Tanggal harus berada dalam periode baris tsb.
    if (tglStr && periode) {
      if (_fmtY_(new Date(tglMs), "yyyy-MM") !== periode) {
        return {
          ok: false,
          error: "Tanggal harus berada di periode " + periode + ".",
        };
      }
    }

    _setY_(sh, f.rowNum, R.persenVCC, persen);
    if (tglStr) {
      var dv = new Date(tglMs);
      var cel = sh.getRange(f.rowNum, R.tglVCC + 1);
      cel.setNumberFormat("dd/MM/yyyy"); // TANGGAL saja, tanpa jam
      cel.setValue(new Date(dv.getFullYear(), dv.getMonth(), dv.getDate()));
    } else {
      sh.getRange(f.rowNum, R.tglVCC + 1).clearContent();
    }

    // Hitung ulang seluruh periode: Rank Tercepat & reward saling bergantung antar petugas.
    var sync = null;
    try {
      sync = sinkronRankYandal({
        periode: periode,
        ulp: String(f.row[R.ulp] || "").trim(),
      });
    } catch (eS) {
      Logger.log("setVccYandal: sinkron gagal — " + eS);
    }

    Logger.log(
      "setVccYandal: " +
        kodeRank +
        " persen=" +
        persen +
        " tgl=" +
        (tglStr || "-") +
        " oleh=" +
        String(args.username || "-"),
    );
    return {
      ok: true,
      kodeRank: kodeRank,
      periode: periode,
      persenVCC: persen,
      tanggal: tglStr,
      sinkron: (sync && sync.ok) === true,
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// SETUP sekali: trigger harian 00:30 menyegarkan db_Yandal_Rank (bulan berjalan).
// ====== BACKSTOP DURASI & JARAK P0 (recalc massal — baris yang terlewat) ======
// Menutup celah bila prosesP0Yandal tak sempat menghitung Durasi/Jarak (mis. webhook
// terlewat, koordinat/closing masuk belakangan, atau sync AppSheet telat). Menyapu
// db_Yandal_P0 dan MELENGKAPI nilai yang KOSONG saja (idempoten):
//   - Durasi (AN)        : Foto Sesudah terisi & Durasi kosong  -> _recalcDurasiRowY_
//   - Jarak Closing (S)  : Lat/Long (N/O) & Lat/Long Closing (Q/R) lengkap & Jarak kosong -> _recalcJarakRowY_
//   - Jarak Antar P0 (T) : Kode Shift ada & kolom T kosong       -> _recalcJarakAntarP0RowY_ (menentukan '0 km'/nilai)
// opts.force=true -> hitung ULANG walau sudah terisi (bukan hanya yang kosong).
// opts.max        -> batasi jumlah baris diproses per putaran (jaga limit 6 menit; jalankan ulang bila 'terpotong'=true).
// CATATAN: Jarak Antar P0 membaca ulang seluruh sheet tiap baris (O(n) per baris) -> pakai opts.max bila data besar.
// Pasang trigger: createRecalcDurasiJarakTriggerY() (default tiap 5 menit). Preview manual: previewRecalcDurasiJarakYandalP0().
function sweepDurasiJarakYandalP0(opts) {
  opts = opts || {};
  var force = opts.force === true;
  var max = Number(opts.max || 0); // 0 = tanpa batas
  var sh = _shY_(SHEET_YANDAL.P0);
  if (!sh || sh.getLastRow() <= 1)
    return {
      ok: true,
      baris: 0,
      durasi: 0,
      jarak: 0,
      jarakAntarP0: 0,
      diproses: 0,
      terpotong: false,
    };
  var d = _allY_(sh),
    C = COL_P0;
  var nDur = 0,
    nJarak = 0,
    nAntar = 0,
    nProses = 0,
    terpotong = false;

  for (var i = 1; i < d.length; i++) {
    if (max && nProses >= max) {
      terpotong = true;
      break;
    }
    var rowNum = i + 1,
      row = d[i];
    var kodeP0 = String(row[C.kodeP0] || "").trim();
    if (!kodeP0) continue;
    var did = false;

    // 1) DURASI (AN) — hanya bila Foto Sesudah ada. _recalcDurasiRowY_ guard 'sekali isi'.
    //    force: kosongkan dulu; bila hasil hitung gagal, kembalikan nilai lama (anti hilang data).
    var adaFotoSesudah = String(row[C.fotoSesudah] || "").trim() !== "";
    var durKosong = String(row[C.durasi] || "").trim() === "";
    if (adaFotoSesudah && (durKosong || force)) {
      try {
        var durLama = String(
          sh.getRange(rowNum, C.durasi + 1).getValue() || "",
        );
        if (force && durLama) sh.getRange(rowNum, C.durasi + 1).clearContent();
        _recalcDurasiRowY_(sh, rowNum);
        var durBaru = String(
          sh.getRange(rowNum, C.durasi + 1).getValue() || "",
        ).trim();
        if (durBaru) {
          nDur++;
          did = true;
        } else if (force && durLama) {
          _setTextY_(sh, rowNum, C.durasi, durLama);
        } // gagal hitung -> pulihkan
      } catch (eD) {
        Logger.log(
          "sweepDurasiJarakYandalP0: durasi gagal baris " + rowNum + " — " + eD,
        );
      }
    }

    // 2) JARAK Closing->Pekerjaan (S) — perlu Lat/Long (N/O) & Lat/Long Closing (Q/R). _recalcJarakRowY_ tak menulis bila koordinat kurang.
    var koordLengkap =
      String(row[C.lat] || "") !== "" &&
      String(row[C.long] || "") !== "" &&
      String(row[C.latClosing] || "") !== "" &&
      String(row[C.longClosing] || "") !== "";
    var jarakKosong = String(row[C.jarak] || "").trim() === "";
    if (koordLengkap && (jarakKosong || force)) {
      try {
        var sJarak = _recalcJarakRowY_(sh, rowNum);
        if (sJarak) {
          nJarak++;
          did = true;
        }
      } catch (eJ) {
        Logger.log(
          "sweepDurasiJarakYandalP0: jarak gagal baris " + rowNum + " — " + eJ,
        );
      }
    }

    // 3) JARAK ANTAR P0 (T) — butuh Kode Shift. _recalcJarakAntarP0RowY_ tulis '0 km' (P0 pertama) atau nilai.
    var adaShift = String(row[C.kodeShift] || "").trim() !== "";
    var antarKosong = String(row[C.jarakAntarP0] || "").trim() === "";
    if (adaShift && (antarKosong || force)) {
      try {
        var sAntar = _recalcJarakAntarP0RowY_(sh, rowNum);
        if (sAntar) {
          nAntar++;
          did = true;
        }
      } catch (eT) {
        Logger.log(
          "sweepDurasiJarakYandalP0: jarak antar P0 gagal baris " +
            rowNum +
            " — " +
            eT,
        );
      }
    }

    if (did) nProses++;
  }

  Logger.log(
    "sweepDurasiJarakYandalP0" +
      (force ? " [FORCE]" : "") +
      " -> durasi=" +
      nDur +
      " jarak=" +
      nJarak +
      " jarakAntarP0=" +
      nAntar +
      " barisDiproses=" +
      nProses +
      (terpotong ? " (TERPOTONG oleh max)" : ""),
  );
  return {
    ok: true,
    baris: d.length - 1,
    durasi: nDur,
    jarak: nJarak,
    jarakAntarP0: nAntar,
    diproses: nProses,
    terpotong: terpotong,
  };
}

// Preview manual (recalc hanya yang KOSONG; aman). Cek hasil di Log (View > Logs).
function previewRecalcDurasiJarakYandalP0(opts) {
  return sweepDurasiJarakYandalP0(opts || {});
}
// Recalc PAKSA semua baris (abaikan nilai lama; menimpa Durasi/Jarak yg sudah ada). Gunakan hati-hati.
function recalcPaksaDurasiJarakYandalP0(opts) {
  opts = opts || {};
  opts.force = true;
  return sweepDurasiJarakYandalP0(opts);
}

// SETUP sekali (jalankan dari editor): pasang trigger time-driven sweepDurasiJarakYandalP0.
// minutes: 1/5/10/15/30 (default 30 sejak 19 Agu malam 4). Recalc hanya baris kosong -> steady-state ringan.
// Lepas trigger backstop durasi/jarak.
function hapusRecalcDurasiJarakTriggerY() {
  var trs = ScriptApp.getProjectTriggers(),
    n = 0;
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === "sweepDurasiJarakYandalP0") {
      ScriptApp.deleteTrigger(trs[i]);
      n++;
    }
  Logger.log("Trigger sweepDurasiJarakYandalP0 dihapus: " + n);
}
