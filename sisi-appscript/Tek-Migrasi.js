/* =====================================================
   Tek-Migrasi.gs — SiSi ULP Toboali (MIGRASI KE ARSIP)
   Memindahkan baris dari spreadsheet AKTIF (SPREADSHEET_ID)
   ke spreadsheet ARSIP. BAGIAN 1: db_Global_Header.
   Mekanisme per baris:
     - Kode Header BELUM ada di arsip -> copy + append -> hapus di aktif
     - Kode Header SUDAH ada di arsip -> hapus saja di aktif
   Batch + resume via trigger tiap 1 menit (anti limit 6 menit).
   ===================================================== */

var SPREADSHEET_ID_ARSIP = '11HzsthxFOA_7BN_fDT7LHAqrjGP9SSzHrtFv24F7P14';
var MIGRASI_BATCH        = 200;    // baris diproses per putaran
var MIGRASI_CURSOR_PROP  = 'MIGRASI_HEADER_CURSOR';
var MIGRASI_DRY_RUN      = true;   // true = SIMULASI saja (log hitungan, tanpa tulis/hapus)

/* Kriteria migrasi: TANGGAL <= H-2 (Asia/Jakarta).
   Baris tanpa tanggal terbaca TIDAK dipindah (aman). */
var MIGRASI_H_MINUS = 2;   // data lebih tua dari 2 hari -> pindah ke arsip

function _migrasiBatasTanggal() {
  var d = new Date();
  d.setDate(d.getDate() - MIGRASI_H_MINUS);
  return _normTgl(d);      // 'yyyy-MM-dd'
}

function _lolosKriteriaMigrasiHeader(row) {
  var tgl = _normTgl(row[COL_INS.HEADER.tanggal]);
  if (!tgl) return false;                 // tanggal kosong/rusak -> biarkan di aktif
  return tgl <= _migrasiBatasTanggal();   // H-2 ke belakang -> pindah
}

/* Baris terakhir yang BENAR-BENAR berisi Kode Header (kolom B).
   PENTING: getLastRow() bisa ter-tipu formula kolom A (No) yang memanjang ke bawah
   (sel tampak kosong tapi dihitung berisi). Bila dipakai sbg posisi append, data
   menempel jauh di bawah & tampak "tidak berpindah". Fungsi ini mengembalikan
   posisi baris terakhir yang kolom B-nya berisi teks. */
function _lastRowKodeHeader_(sh) {
  var last = sh.getLastRow();
  if (last < 2) return 1;
  var col = sh.getRange(2, COL_INS.HEADER.kodeHeader + 1, last - 1, 1).getValues();
  for (var i = col.length - 1; i >= 0; i--) {
    if (String(col[i][0] || '').trim() !== '') return i + 2;
  }
  return 1;
}

/* ===== 1 BATCH MIGRASI ===== */
function migrasiGlobalHeaderBatch() {
  if (MIGRASI_DRY_RUN) Logger.log('⚠️ MODE SIMULASI (DRY RUN) AKTIF — tidak ada data yang disalin/dihapus. Set MIGRASI_DRY_RUN = false utk menjalankan sungguhan.');
  var H = COL_INS.HEADER;
  var LEBAR = H.statusTextWa + 1;    // 17 kolom (A..Q) — kolom A = formula No, TIDAK disalin
  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_INS.HEADER);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(SHEET_INS.HEADER);
  if (!shAktif || !shArsip) throw new Error('db_Global_Header tidak ditemukan di salah satu file.');

  // 1) INDEX Kode Header yang SUDAH ada di arsip (1x baca per putaran) — pengganti
  //    "bandingkan 1 baris ke arsip" tapi O(1) per baris.
  var adaDiArsip = {};
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, H.kodeHeader + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      var ka = String(colArsip[a][0] || '').trim();
      if (ka) adaDiArsip[ka] = true;
    }
  }

  // 2) Baca batch baris AKTIF dari posisi cursor (resume antar-putaran)
  var props = PropertiesService.getScriptProperties();
  var start = parseInt(props.getProperty(MIGRASI_CURSOR_PROP) || '2', 10); // baris 1 = judul
  var lastRow = shAktif.getLastRow();
  if (start > lastRow) {
    props.deleteProperty(MIGRASI_CURSOR_PROP);
    return { done: true, disalin: 0, dihapus: 0 };
  }
  var end = Math.min(start + MIGRASI_BATCH - 1, lastRow);
  var data = shAktif.getRange(start, 1, end - start + 1, LEBAR).getValues();

  // 3) Klasifikasi per mekanisme
  var akanDisalin = [], akanDihapus = [];
  for (var i = 0; i < data.length; i++) {
    var kode = String(data[i][H.kodeHeader] || '').trim();
    if (!kode) continue;                                  // baris kosong: lewati, JANGAN dihapus
    if (adaDiArsip[kode]) {
      akanDihapus.push(start + i);                        // SUDAH ADA -> hapus saja
    } else if (_lolosKriteriaMigrasiHeader(data[i])) {
      akanDisalin.push(data[i].slice(1));                 // salin TANPA kolom A (formula No)
      akanDihapus.push(start + i);                        // setelah tersalin -> hapus di aktif
      adaDiArsip[kode] = true;                            // anti dobel dalam batch yang sama
    }
  }

  // 4) APPEND ke arsip (1x setValues) + VERIFIKASI sebelum boleh menghapus
  if (!MIGRASI_DRY_RUN && akanDisalin.length) {
    var rowStart = _lastRowKodeHeader_(shArsip) + 1;   // jangkar ke baris terakhir BERISI KODE (kebal baris hantu formula)
    shArsip.getRange(rowStart, 2, akanDisalin.length, LEBAR - 1).setValues(akanDisalin);
    SpreadsheetApp.flush();
    // Verifikasi: baca balik Kode Header baris pertama yang ditulis
    var cekPertama = String(shArsip.getRange(rowStart, H.kodeHeader + 1).getValue() || '').trim();
    if (cekPertama !== String(akanDisalin[0][H.kodeHeader - 1] || '').trim()) {   // idx -1 krn kolom A tdk ikut (slice(1))
      throw new Error('Verifikasi append GAGAL — penghapusan dibatalkan untuk batch ini.');
    }
  }

  // 5) HAPUS di aktif dari BAWAH ke ATAS (nomor baris tidak bergeser)
  if (!MIGRASI_DRY_RUN) {
    akanDihapus.sort(function (a, b) { return b - a; });
    for (var d = 0; d < akanDihapus.length; d++) shAktif.deleteRow(akanDihapus[d]);
    SpreadsheetApp.flush();
  }

  // 6) Cursor berikutnya: geser sebesar batch DIKURANGI baris yang terhapus
  //    (baris di bawah naik mengisi celah hapus — tanpa ini ada baris yang terlewat)
  var nextStart = end + 1 - (MIGRASI_DRY_RUN ? 0 : akanDihapus.length);
  var done = nextStart > shAktif.getLastRow();
  if (done) props.deleteProperty(MIGRASI_CURSOR_PROP);
  else props.setProperty(MIGRASI_CURSOR_PROP, String(nextStart));

  Logger.log('[migrasiGlobalHeader] batch ' + start + '-' + end +
             ' | disalin=' + akanDisalin.length + ' | dihapus=' + akanDihapus.length +
             ' | next=' + (done ? 'SELESAI' : nextStart) + (MIGRASI_DRY_RUN ? ' [DRY RUN]' : ''));
  return { done: done, disalin: akanDisalin.length, dihapus: akanDihapus.length };
}

/* ===== TRIGGER: mulai / tick / berhenti ===== */
function mulaiMigrasiGlobalHeader() {
  PropertiesService.getScriptProperties().deleteProperty(MIGRASI_CURSOR_PROP);
  var trs = ScriptApp.getProjectTriggers();
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === 'migrasiGlobalHeaderTick') ScriptApp.deleteTrigger(trs[i]);
  ScriptApp.newTrigger('migrasiGlobalHeaderTick').timeBased().everyMinutes(1).create();
  Logger.log('Migrasi db_Global_Header DIMULAI (tiap 1 menit, batch ' + MIGRASI_BATCH + ').');
}

function migrasiGlobalHeaderTick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;                       // tick sebelumnya masih jalan -> lewati
  try {
    var r = migrasiGlobalHeaderBatch();
    if (r && r.done) {
      var trs = ScriptApp.getProjectTriggers();
      for (var i = 0; i < trs.length; i++)
        if (trs[i].getHandlerFunction() === 'migrasiGlobalHeaderTick') ScriptApp.deleteTrigger(trs[i]);
      Logger.log('Migrasi db_Global_Header SELESAI -> trigger dilepas.');
    }
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

function hentikanMigrasiGlobalHeader() {
  var trs = ScriptApp.getProjectTriggers(), n = 0;
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === 'migrasiGlobalHeaderTick') { ScriptApp.deleteTrigger(trs[i]); n++; }
  PropertiesService.getScriptProperties().deleteProperty(MIGRASI_CURSOR_PROP);
  Logger.log('Migrasi dihentikan, ' + n + ' trigger dilepas, cursor direset.');
}

/* SETUP sekali: tiap hari 01:00 WIB jalankan migrasi SEMUA sheet yg sudah terdaftar
   (Global Header + ROW Realisasi + ROW Eksekusi + INS Temuan + Yandal P0 + Teknik_Laporan Harian + InsJar Realisasi + InsDu Realisasi + Hartek PenyulangGardu + Hartek Pekerjaan + Hartek Material + Yandal Shift + Yandal Pengecekan Switching) lewat mulaiMigrasiSemua(). Masing-masing memakai
   cursor + tick 1 menit & berhenti otomatis saat selesai; hari berikutnya mulai lagi
   utk data H-2 terbaru. */
function createMigrasiHarianTrigger() {
  var trs = ScriptApp.getProjectTriggers();
  for (var i = 0; i < trs.length; i++) {
    var f = trs[i].getHandlerFunction();
    if (f === 'mulaiMigrasiSemua' || f === 'mulaiMigrasiGlobalHeader') ScriptApp.deleteTrigger(trs[i]);
  }
  ScriptApp.newTrigger('mulaiMigrasiSemua')
    .timeBased().atHour(1).everyDays(1).inTimezone('Asia/Jakarta').create();
  return 'Trigger migrasi harian dipasang (01:00 WIB): Global Header + ROW Realisasi + ROW Eksekusi + INS Temuan + Yandal P0 + Teknik_Laporan Harian + InsJar Realisasi + InsDu Realisasi + Hartek PenyulangGardu + Hartek Pekerjaan + Hartek Material + Yandal Shift + Yandal Pengecekan Switching.';
}

/* ===== PREVIEW MIGRASI (read-only, aman) =====
   Jalankan dari editor Apps Script: previewMigrasiGlobalHeader() -> lihat View > Logs.
   Menampilkan tanggal batas (H-2), total baris, rincian akan-disalin / sudah-ada-di-arsip
   (akan dihapus) / tetap di aktif, beserta contoh Kode Header tiap kategori.
   TIDAK menulis/menghapus apa pun. */
function previewMigrasiGlobalHeader() {
  var H = COL_INS.HEADER;
  var LEBAR = H.statusTextWa + 1;
  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_INS.HEADER);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(SHEET_INS.HEADER);
  if (!shAktif || !shArsip) { Logger.log('Sheet db_Global_Header tidak ditemukan di salah satu file.'); return; }

  // Index Kode Header yang sudah ada di arsip
  var adaDiArsip = {};
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, H.kodeHeader + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      var ka = String(colArsip[a][0] || '').trim();
      if (ka) adaDiArsip[ka] = true;
    }
  }

  var batas = _migrasiBatasTanggal();
  var total = 0, pindah = 0, sudahAda = 0, tetap = 0, tanpaKode = 0;
  var sampelPindah = [], sampelSudahAda = [], sampelTetap = [];
  var lastRow = shAktif.getLastRow();
  if (lastRow > 1) {
    var data = shAktif.getRange(2, 1, lastRow - 1, LEBAR).getValues();
    for (var i = 0; i < data.length; i++) {
      var kode = String(data[i][H.kodeHeader] || '').trim();
      if (!kode) { tanpaKode++; continue; }
      total++;
      var label = kode + ' (' + _normTgl(data[i][H.tanggal]) + ')';
      if (adaDiArsip[kode]) {
        sudahAda++;
        if (sampelSudahAda.length < 5) sampelSudahAda.push(label);
      } else if (_lolosKriteriaMigrasiHeader(data[i])) {
        pindah++;
        if (sampelPindah.length < 5) sampelPindah.push(label);
      } else {
        tetap++;
        if (sampelTetap.length < 5) sampelTetap.push(label);
      }
    }
  }

  Logger.log('================ PREVIEW MIGRASI db_Global_Header ================');
  Logger.log('Batas tanggal (H-' + MIGRASI_H_MINUS + '): ' + batas + ' — baris dgn Tanggal <= ' + batas + ' akan dipindah.');
  Logger.log('Total baris ber-Kode Header di AKTIF : ' + total);
  Logger.log('  > Akan DISALIN ke arsip lalu dihapus : ' + pindah);
  Logger.log('      contoh: ' + (sampelPindah.join(', ') || '-'));
  Logger.log('  > SUDAH ADA di arsip (hanya dihapus) : ' + sudahAda);
  Logger.log('      contoh: ' + (sampelSudahAda.join(', ') || '-'));
  Logger.log('  > TETAP di aktif (belum H-' + MIGRASI_H_MINUS + ')         : ' + tetap);
  Logger.log('      contoh: ' + (sampelTetap.join(', ') || '-'));
  Logger.log('Baris tanpa Kode Header (dilewati)   : ' + tanpaKode);
  Logger.log('Baris yang sudah ada di ARSIP        : ' + Math.max(0, shArsip.getLastRow() - 1));
  Logger.log('==================================================================');
}

/* ===== MIGRASI 1 BARIS by Kode Header (uji coba / manual) =====
     - Kode Header BELUM ada di arsip -> copy + append + verifikasi -> hapus di aktif
     - Kode Header SUDAH ada di arsip -> hapus saja di aktif
   Idempoten: aman dijalankan berulang utk kode yang sama.
   CATATAN: fungsi ini TIDAK mengecek kriteria H-2 — baris dipilih manual.
   Cara pakai dari editor: migrasiSatuBarisGlobalHeader('INS-TBL260805001');
   Return { ok, mode:'disalin'|'hapus-duplikat'|'tidak-ada-di-aktif', ... } */
function migrasiSatuBarisGlobalHeader(kodeHeader) {
  var H = COL_INS.HEADER;
  var LEBAR = H.statusTextWa + 1;    // 17 kolom (A..Q) — kolom A formula, TIDAK disalin
  var key = String(kodeHeader || '').trim();
  if (!key) return { ok: false, message: 'Kode Header wajib diisi.' };

  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_INS.HEADER);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(SHEET_INS.HEADER);
  if (!shAktif || !shArsip) return { ok: false, message: 'Sheet db_Global_Header tidak ditemukan di salah satu file.' };

  // 1) Cek keberadaan Kode Header di ARSIP
  var adaDiArsip = false;
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, H.kodeHeader + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      if (String(colArsip[a][0] || '').trim() === key) { adaDiArsip = true; break; }
    }
  }

  // 2) Cari nomor barisnya di AKTIF
  var rowNum = -1;
  if (shAktif.getLastRow() > 1) {
    var colAktif = shAktif.getRange(2, H.kodeHeader + 1, shAktif.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < colAktif.length; i++) {
      if (String(colAktif[i][0] || '').trim() === key) { rowNum = i + 2; break; }
    }
  }
  if (rowNum < 0) {
    Logger.log('[migrasiSatuBarisGlobalHeader] "' + key + '" TIDAK ditemukan di file AKTIF — tidak ada yang diproses. Pastikan Kode Header persis sama dgn kolom B sheet aktif (contoh format asli: R02-1613021202001).');
    return { ok: true, mode: 'tidak-ada-di-aktif', kodeHeader: key, sudahDiArsip: adaDiArsip };
  }

  var mode;
  if (adaDiArsip) {
    mode = 'hapus-duplikat';          // SUDAH ADA di arsip -> cukup hapus di aktif
  } else {
    // BELUM ADA -> copy kolom B..Q -> append ke arsip -> VERIFIKASI baca balik
    var rowData = shAktif.getRange(rowNum, 1, 1, LEBAR).getValues()[0].slice(1);
    var rowBaru = _lastRowKodeHeader_(shArsip) + 1;   // jangkar ke baris terakhir BERISI KODE (kebal baris hantu formula)
    shArsip.getRange(rowBaru, 2, 1, LEBAR - 1).setValues([rowData]);
    SpreadsheetApp.flush();
    var cek = String(shArsip.getRange(rowBaru, H.kodeHeader + 1).getValue() || '').trim();
    if (cek !== key) {
      throw new Error('Verifikasi append GAGAL utk ' + key + ' — baris di aktif TIDAK dihapus.');
    }
    mode = 'disalin';
  }

  // 3) Hapus baris di AKTIF
  shAktif.deleteRow(rowNum);
  SpreadsheetApp.flush();
  Logger.log('[migrasiSatuBarisGlobalHeader] ' + key + ' -> ' + mode + ' (baris aktif ' + rowNum + ' dihapus)');
  return { ok: true, mode: mode, kodeHeader: key, barisAktifDihapus: rowNum };
}

/* ===== DIAGNOSA MIGRASI (read-only, aman) =====
   Jalankan SEKALI dari editor: diagnosaMigrasi() -> lihat View > Logs, kirim hasilnya utk dianalisis.
   Memeriksa berurutan: status DRY_RUN, koneksi file AKTIF & ARSIP, keberadaan sheet,
   jumlah baris, dan contoh bacaan tanggal + hasil kriteria H-2 pada 5 baris pertama.
   TIDAK menulis/menghapus apa pun. */
function diagnosaMigrasi() {
  Logger.log('================ DIAGNOSA MIGRASI ================');
  Logger.log('MIGRASI_DRY_RUN = ' + MIGRASI_DRY_RUN + (MIGRASI_DRY_RUN ? '   <<<< MASIH MODE SIMULASI! Ubah ke false utk eksekusi sungguhan.' : '   (mode sungguhan)'));
  Logger.log('Batas tanggal H-' + MIGRASI_H_MINUS + ' = ' + _migrasiBatasTanggal());

  // 1) Koneksi file AKTIF
  var shAktif = null;
  try {
    shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_INS.HEADER);
    Logger.log('File AKTIF : dibuka OK — sheet db_Global_Header ' + (shAktif ? ('ditemukan, baris data = ' + (shAktif.getLastRow() - 1)) : 'TIDAK DITEMUKAN (cek nama sheet!)'));
  } catch (e) { Logger.log('File AKTIF : GAGAL dibuka — ' + e.message); }

  // 2) Koneksi file ARSIP
  var shArsip = null;
  try {
    shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(SHEET_INS.HEADER);
    Logger.log('File ARSIP : dibuka OK — sheet db_Global_Header ' + (shArsip ? ('ditemukan, baris data = ' + (shArsip.getLastRow() - 1)) : 'TIDAK DITEMUKAN (cek nama sheet!)'));
  } catch (e) { Logger.log('File ARSIP : GAGAL dibuka — ' + e.message + ' (cek izin akses file)'); }

  if (!shAktif || !shArsip) { Logger.log('Diagnosa berhenti: perbaiki dulu koneksi/nama sheet di atas.'); return; }

  // 2b) Deteksi baris "HANTU" (formula tanpa isi): getLastRow vs baris terakhir berisi Kode Header
  Logger.log('File AKTIF : getLastRow=' + shAktif.getLastRow() + ' vs baris terakhir berisi Kode = ' + _lastRowKodeHeader_(shAktif));
  Logger.log('File ARSIP : getLastRow=' + shArsip.getLastRow() + ' vs baris terakhir berisi Kode = ' + _lastRowKodeHeader_(shArsip) + '   <<< bila > 1 padahal tampak kosong = ada baris hantu; HAPUS BARISNYA (bukan cuma clear isi)');

  // 3) Sampel 5 baris pertama: kode, tanggal mentah, tanggal ternormalisasi, lolos H-2?
  var H = COL_INS.HEADER;
  var n = Math.min(5, shAktif.getLastRow() - 1);
  if (n < 1) { Logger.log('Sheet aktif KOSONG — tidak ada yang bisa dipindah.'); return; }
  var data = shAktif.getRange(2, 1, n, H.statusTextWa + 1).getValues();
  var batas = _migrasiBatasTanggal();
  Logger.log('--- Sampel ' + n + ' baris pertama file aktif ---');
  for (var i = 0; i < n; i++) {
    var kode = String(data[i][H.kodeHeader] || '').trim();
    var norm = _normTgl(data[i][H.tanggal]);
    Logger.log('baris ' + (i + 2) + ': kode="' + kode + '" | tanggal normal="' + norm + '" | lolos H-2: ' + ((norm && norm <= batas) ? 'YA' : 'TIDAK'));
  }
  Logger.log('==================================================');
}

/* =====================================================
   BAGIAN 2: db_ROW_Realisasi
   Mekanisme SAMA dgn Global Header, 2 penyesuaian:
     - Kunci dedup/lookup = Kode Pekerjaan (kolom C / COL_ROW_RLZ.kodePekerjaan),
       karena Kode Header TIDAK unik di sheet ini (1 header -> banyak realisasi).
     - Kriteria tanggal = kolom E (Tanggal, COL_ROW_RLZ.tanggal) baris itu sendiri <= H-2.
   Memakai COL_ROW_RLZ & COL_ROW_RLZ_N dari Tek-ROW.gs (global scope).
   ===================================================== */

var MIGRASI_CURSOR_PROP_RLZ = 'MIGRASI_ROW_RLZ_CURSOR';

function _lolosKriteriaMigrasiRowRealisasi(row) {
  var tgl = _normTgl(row[COL_ROW_RLZ.tanggal]);   // kolom E
  if (!tgl) return false;                         // tanggal kosong/rusak -> biarkan di aktif
  return tgl <= _migrasiBatasTanggal();
}

// Baris terakhir yg benar-benar berisi Kode Pekerjaan (kolom C) — kebal baris hantu formula kolom A.
function _lastRowKodeRowRlz_(sh) {
  var last = sh.getLastRow();
  if (last < 2) return 1;
  var col = sh.getRange(2, COL_ROW_RLZ.kodePekerjaan + 1, last - 1, 1).getValues();
  for (var i = col.length - 1; i >= 0; i--) {
    if (String(col[i][0] || '').trim() !== '') return i + 2;
  }
  return 1;
}

/* ===== 1 BATCH MIGRASI db_ROW_Realisasi ===== */
function migrasiRowRealisasiBatch() {
  if (MIGRASI_DRY_RUN) Logger.log('⚠️ MODE SIMULASI (DRY RUN) AKTIF — tidak ada data yang disalin/dihapus. Set MIGRASI_DRY_RUN = false utk menjalankan sungguhan.');
  var R = COL_ROW_RLZ, LEBAR = COL_ROW_RLZ_N;   // 13 kolom (A..M); kolom A = formula No, TIDAK disalin
  var NAMA = 'db_ROW_Realisasi';
  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) throw new Error(NAMA + ' tidak ditemukan di salah satu file.');

  // 1) INDEX Kode Pekerjaan yang SUDAH ada di arsip
  var adaDiArsip = {};
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, R.kodePekerjaan + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      var ka = String(colArsip[a][0] || '').trim();
      if (ka) adaDiArsip[ka] = true;
    }
  }

  // 2) Baca batch baris AKTIF dari cursor
  var props = PropertiesService.getScriptProperties();
  var start = parseInt(props.getProperty(MIGRASI_CURSOR_PROP_RLZ) || '2', 10);
  var lastRow = shAktif.getLastRow();
  if (start > lastRow) { props.deleteProperty(MIGRASI_CURSOR_PROP_RLZ); return { done: true, disalin: 0, dihapus: 0 }; }
  var end = Math.min(start + MIGRASI_BATCH - 1, lastRow);
  var data = shAktif.getRange(start, 1, end - start + 1, LEBAR).getValues();

  // 3) Klasifikasi per mekanisme
  var akanDisalin = [], akanDihapus = [];
  for (var i = 0; i < data.length; i++) {
    var kode = String(data[i][R.kodePekerjaan] || '').trim();
    if (!kode) continue;                                   // baris kosong: lewati, JANGAN dihapus
    if (adaDiArsip[kode]) {
      akanDihapus.push(start + i);                         // SUDAH ADA -> hapus saja
    } else if (_lolosKriteriaMigrasiRowRealisasi(data[i])) {
      akanDisalin.push(data[i].slice(1));                  // salin TANPA kolom A (formula No)
      akanDihapus.push(start + i);                         // setelah tersalin -> hapus di aktif
      adaDiArsip[kode] = true;                             // anti dobel dalam batch yg sama
    }
  }

  // 4) APPEND ke arsip + VERIFIKASI baca balik Kode Pekerjaan baris pertama
  if (!MIGRASI_DRY_RUN && akanDisalin.length) {
    var rowStart = _lastRowKodeRowRlz_(shArsip) + 1;
    shArsip.getRange(rowStart, 2, akanDisalin.length, LEBAR - 1).setValues(akanDisalin);
    SpreadsheetApp.flush();
    var cek = String(shArsip.getRange(rowStart, R.kodePekerjaan + 1).getValue() || '').trim();
    // akanDisalin = baris TANPA kolom A (slice(1)) -> Kode Pekerjaan (kolom C, idx 2) bergeser ke idx 1 (= R.kodePekerjaan - 1)
    if (cek !== String(akanDisalin[0][R.kodePekerjaan - 1] || '').trim()) {
      throw new Error('Verifikasi append GAGAL — penghapusan dibatalkan utk batch ini.');
    }
  }

  // 5) HAPUS di aktif dari BAWAH ke ATAS
  if (!MIGRASI_DRY_RUN) {
    akanDihapus.sort(function (a, b) { return b - a; });
    for (var d = 0; d < akanDihapus.length; d++) shAktif.deleteRow(akanDihapus[d]);
    SpreadsheetApp.flush();
  }

  // 6) Cursor berikutnya (batch - jumlahDihapus)
  var nextStart = end + 1 - (MIGRASI_DRY_RUN ? 0 : akanDihapus.length);
  var done = nextStart > shAktif.getLastRow();
  if (done) props.deleteProperty(MIGRASI_CURSOR_PROP_RLZ);
  else props.setProperty(MIGRASI_CURSOR_PROP_RLZ, String(nextStart));

  Logger.log('[migrasiRowRealisasi] batch ' + start + '-' + end +
             ' | disalin=' + akanDisalin.length + ' | dihapus=' + akanDihapus.length +
             ' | next=' + (done ? 'SELESAI' : nextStart) + (MIGRASI_DRY_RUN ? ' [DRY RUN]' : ''));
  return { done: done, disalin: akanDisalin.length, dihapus: akanDihapus.length };
}

/* ===== TRIGGER ROW REALISASI: mulai / tick / berhenti ===== */
function mulaiMigrasiRowRealisasi() {
  PropertiesService.getScriptProperties().deleteProperty(MIGRASI_CURSOR_PROP_RLZ);
  var trs = ScriptApp.getProjectTriggers();
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === 'migrasiRowRealisasiTick') ScriptApp.deleteTrigger(trs[i]);
  ScriptApp.newTrigger('migrasiRowRealisasiTick').timeBased().everyMinutes(1).create();
  Logger.log('Migrasi db_ROW_Realisasi DIMULAI (tiap 1 menit, batch ' + MIGRASI_BATCH + ').');
}

function migrasiRowRealisasiTick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    var r = migrasiRowRealisasiBatch();
    if (r && r.done) {
      var trs = ScriptApp.getProjectTriggers();
      for (var i = 0; i < trs.length; i++)
        if (trs[i].getHandlerFunction() === 'migrasiRowRealisasiTick') ScriptApp.deleteTrigger(trs[i]);
      Logger.log('Migrasi db_ROW_Realisasi SELESAI -> trigger dilepas.');
    }
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

function hentikanMigrasiRowRealisasi() {
  var trs = ScriptApp.getProjectTriggers(), n = 0;
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === 'migrasiRowRealisasiTick') { ScriptApp.deleteTrigger(trs[i]); n++; }
  PropertiesService.getScriptProperties().deleteProperty(MIGRASI_CURSOR_PROP_RLZ);
  Logger.log('Migrasi ROW Realisasi dihentikan, ' + n + ' trigger dilepas, cursor direset.');
}

/* ===== MIGRASI 1 BARIS db_ROW_Realisasi by Kode Pekerjaan (uji coba / manual) =====
   Alur sama dgn versi Global Header, kunci = Kode Pekerjaan (kolom C).
   TIDAK mengecek kriteria H-2 — baris dipilih manual.
   Cara pakai: migrasiSatuBarisRowRealisasi('<Kode Pekerjaan persis dari kolom C>'); */
function migrasiSatuBarisRowRealisasi(kodePekerjaan) {
  var R = COL_ROW_RLZ, LEBAR = COL_ROW_RLZ_N, NAMA = 'db_ROW_Realisasi';
  var key = String(kodePekerjaan || '').trim();
  if (!key) return { ok: false, message: 'Kode Pekerjaan wajib diisi.' };

  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) return { ok: false, message: 'Sheet ' + NAMA + ' tidak ditemukan di salah satu file.' };

  // 1) Cek keberadaan di ARSIP
  var adaDiArsip = false;
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, R.kodePekerjaan + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      if (String(colArsip[a][0] || '').trim() === key) { adaDiArsip = true; break; }
    }
  }

  // 2) Cari nomor baris di AKTIF
  var rowNum = -1;
  if (shAktif.getLastRow() > 1) {
    var colAktif = shAktif.getRange(2, R.kodePekerjaan + 1, shAktif.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < colAktif.length; i++) {
      if (String(colAktif[i][0] || '').trim() === key) { rowNum = i + 2; break; }
    }
  }
  if (rowNum < 0) {
    Logger.log('[migrasiSatuBarisRowRealisasi] "' + key + '" TIDAK ditemukan di file AKTIF — tidak ada yang diproses. Ambil nilai persis dari kolom C db_ROW_Realisasi.');
    return { ok: true, mode: 'tidak-ada-di-aktif', kodePekerjaan: key, sudahDiArsip: adaDiArsip };
  }

  var mode;
  if (adaDiArsip) {
    mode = 'hapus-duplikat';
  } else {
    var rowData = shAktif.getRange(rowNum, 1, 1, LEBAR).getValues()[0].slice(1);   // B..M (tanpa kolom A)
    var rowBaru = _lastRowKodeRowRlz_(shArsip) + 1;
    shArsip.getRange(rowBaru, 2, 1, LEBAR - 1).setValues([rowData]);
    SpreadsheetApp.flush();
    var cek = String(shArsip.getRange(rowBaru, R.kodePekerjaan + 1).getValue() || '').trim();
    if (cek !== key) {
      throw new Error('Verifikasi append GAGAL utk ' + key + ' — baris di aktif TIDAK dihapus.');
    }
    mode = 'disalin';
  }

  // 3) Hapus baris di AKTIF
  shAktif.deleteRow(rowNum);
  SpreadsheetApp.flush();
  Logger.log('[migrasiSatuBarisRowRealisasi] ' + key + ' -> ' + mode + ' (baris aktif ' + rowNum + ' dihapus)');
  return { ok: true, mode: mode, kodePekerjaan: key, barisAktifDihapus: rowNum };
}

/* ===== PREVIEW db_ROW_Realisasi (read-only, aman) ===== */
function previewMigrasiRowRealisasi() {
  var R = COL_ROW_RLZ, LEBAR = COL_ROW_RLZ_N, NAMA = 'db_ROW_Realisasi';
  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) { Logger.log('Sheet ' + NAMA + ' tidak ditemukan di salah satu file.'); return; }

  var adaDiArsip = {};
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, R.kodePekerjaan + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      var ka = String(colArsip[a][0] || '').trim();
      if (ka) adaDiArsip[ka] = true;
    }
  }

  var batas = _migrasiBatasTanggal();
  var total = 0, pindah = 0, sudahAda = 0, tetap = 0, tanpaKode = 0;
  var sampelPindah = [], sampelSudahAda = [], sampelTetap = [];
  var lastRow = shAktif.getLastRow();
  if (lastRow > 1) {
    var data = shAktif.getRange(2, 1, lastRow - 1, LEBAR).getValues();
    for (var i = 0; i < data.length; i++) {
      var kode = String(data[i][R.kodePekerjaan] || '').trim();
      if (!kode) { tanpaKode++; continue; }
      total++;
      var label = kode + ' (' + _normTgl(data[i][R.tanggal]) + ')';
      if (adaDiArsip[kode]) {
        sudahAda++;
        if (sampelSudahAda.length < 5) sampelSudahAda.push(label);
      } else if (_lolosKriteriaMigrasiRowRealisasi(data[i])) {
        pindah++;
        if (sampelPindah.length < 5) sampelPindah.push(label);
      } else {
        tetap++;
        if (sampelTetap.length < 5) sampelTetap.push(label);
      }
    }
  }

  Logger.log('================ PREVIEW MIGRASI db_ROW_Realisasi ================');
  Logger.log('Batas tanggal (H-' + MIGRASI_H_MINUS + '): ' + batas + ' — baris dgn Tanggal (kolom E) <= ' + batas + ' akan dipindah.');
  Logger.log('Total baris ber-Kode Pekerjaan di AKTIF : ' + total);
  Logger.log('  > Akan DISALIN ke arsip lalu dihapus : ' + pindah);
  Logger.log('      contoh: ' + (sampelPindah.join(', ') || '-'));
  Logger.log('  > SUDAH ADA di arsip (hanya dihapus) : ' + sudahAda);
  Logger.log('      contoh: ' + (sampelSudahAda.join(', ') || '-'));
  Logger.log('  > TETAP di aktif (belum H-' + MIGRASI_H_MINUS + ')         : ' + tetap);
  Logger.log('      contoh: ' + (sampelTetap.join(', ') || '-'));
  Logger.log('Baris tanpa Kode Pekerjaan (dilewati) : ' + tanpaKode);
  Logger.log('Baris yang sudah ada di ARSIP         : ' + Object.keys(adaDiArsip).length);
  Logger.log('Deteksi hantu AKTIF : getLastRow=' + lastRow + ' vs baris terakhir berisi Kode = ' + _lastRowKodeRowRlz_(shAktif));
  Logger.log('Deteksi hantu ARSIP : getLastRow=' + shArsip.getLastRow() + ' vs baris terakhir berisi Kode = ' + _lastRowKodeRowRlz_(shArsip));
  Logger.log('==================================================================');
}

/* =====================================================
   BAGIAN 3: db_ROW_Eksekusi
   Mekanisme SAMA, penyesuaian:
     - Kunci dedup/lookup = Kode Eksekusi (kolom D / COL_ROW.kodeEksekusi) — unik per baris.
     - Kriteria tanggal = kolom G (Tanggal, COL_ROW.tanggal) <= H-2.
       PERINGATAN: kolom E di sheet ini adalah ULP, BUKAN tanggal!
     - Lebar 30 kolom (A..AD); kolom A = formula No, TIDAK disalin (tulis B..AC).
   Memakai COL_ROW & COL_ROW_N dari Tek-ROW.gs (global scope).
   ===================================================== */

var MIGRASI_CURSOR_PROP_EKS = 'MIGRASI_ROW_EKS_CURSOR';

function _lolosKriteriaMigrasiRowEksekusi(row) {
  var tgl = _normTgl(row[COL_ROW.tanggal]);   // kolom G (BUKAN kolom E — itu ULP)
  if (!tgl) return false;                     // tanggal kosong/rusak -> biarkan di aktif
  return tgl <= _migrasiBatasTanggal();
}

// Baris terakhir yg benar-benar berisi Kode Eksekusi (kolom D) — kebal baris hantu formula kolom A.
function _lastRowKodeRowEks_(sh) {
  var last = sh.getLastRow();
  if (last < 2) return 1;
  var col = sh.getRange(2, COL_ROW.kodeEksekusi + 1, last - 1, 1).getValues();
  for (var i = col.length - 1; i >= 0; i--) {
    if (String(col[i][0] || '').trim() !== '') return i + 2;
  }
  return 1;
}

/* ===== 1 BATCH MIGRASI db_ROW_Eksekusi ===== */
function migrasiRowEksekusiBatch() {
  if (MIGRASI_DRY_RUN) Logger.log('⚠️ MODE SIMULASI (DRY RUN) AKTIF — tidak ada data yang disalin/dihapus. Set MIGRASI_DRY_RUN = false utk menjalankan sungguhan.');
  var C = COL_ROW, LEBAR = COL_ROW_N;   // 30 kolom (A..AD); kolom A = formula No, TIDAK disalin
  var NAMA = 'db_ROW_Eksekusi';
  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) throw new Error(NAMA + ' tidak ditemukan di salah satu file.');

  // 1) INDEX Kode Eksekusi yang SUDAH ada di arsip
  var adaDiArsip = {};
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, C.kodeEksekusi + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      var ka = String(colArsip[a][0] || '').trim();
      if (ka) adaDiArsip[ka] = true;
    }
  }

  // 2) Baca batch baris AKTIF dari cursor
  var props = PropertiesService.getScriptProperties();
  var start = parseInt(props.getProperty(MIGRASI_CURSOR_PROP_EKS) || '2', 10);
  var lastRow = shAktif.getLastRow();
  if (start > lastRow) { props.deleteProperty(MIGRASI_CURSOR_PROP_EKS); return { done: true, disalin: 0, dihapus: 0 }; }
  var end = Math.min(start + MIGRASI_BATCH - 1, lastRow);
  var data = shAktif.getRange(start, 1, end - start + 1, LEBAR).getValues();

  // 3) Klasifikasi per mekanisme
  var akanDisalin = [], akanDihapus = [];
  for (var i = 0; i < data.length; i++) {
    var kode = String(data[i][C.kodeEksekusi] || '').trim();
    if (!kode) continue;                                   // baris kosong: lewati, JANGAN dihapus
    if (adaDiArsip[kode]) {
      akanDihapus.push(start + i);                         // SUDAH ADA -> hapus saja
    } else if (_lolosKriteriaMigrasiRowEksekusi(data[i])) {
      akanDisalin.push(data[i].slice(1));                  // salin TANPA kolom A (formula No)
      akanDihapus.push(start + i);                         // setelah tersalin -> hapus di aktif
      adaDiArsip[kode] = true;                             // anti dobel dalam batch yg sama
    }
  }

  // 4) APPEND ke arsip + VERIFIKASI baca balik Kode Eksekusi baris pertama
  if (!MIGRASI_DRY_RUN && akanDisalin.length) {
    var rowStart = _lastRowKodeRowEks_(shArsip) + 1;
    shArsip.getRange(rowStart, 2, akanDisalin.length, LEBAR - 1).setValues(akanDisalin);
    SpreadsheetApp.flush();
    var cek = String(shArsip.getRange(rowStart, C.kodeEksekusi + 1).getValue() || '').trim();
    // akanDisalin = baris TANPA kolom A (slice(1)) -> Kode Eksekusi (kolom D, idx 3) bergeser ke idx 2 (= C.kodeEksekusi - 1)
    if (cek !== String(akanDisalin[0][C.kodeEksekusi - 1] || '').trim()) {
      throw new Error('Verifikasi append GAGAL — penghapusan dibatalkan utk batch ini.');
    }
  }

  // 5) HAPUS di aktif dari BAWAH ke ATAS
  if (!MIGRASI_DRY_RUN) {
    akanDihapus.sort(function (a, b) { return b - a; });
    for (var d = 0; d < akanDihapus.length; d++) shAktif.deleteRow(akanDihapus[d]);
    SpreadsheetApp.flush();
  }

  // 6) Cursor berikutnya (batch - jumlahDihapus)
  var nextStart = end + 1 - (MIGRASI_DRY_RUN ? 0 : akanDihapus.length);
  var done = nextStart > shAktif.getLastRow();
  if (done) props.deleteProperty(MIGRASI_CURSOR_PROP_EKS);
  else props.setProperty(MIGRASI_CURSOR_PROP_EKS, String(nextStart));

  Logger.log('[migrasiRowEksekusi] batch ' + start + '-' + end +
             ' | disalin=' + akanDisalin.length + ' | dihapus=' + akanDihapus.length +
             ' | next=' + (done ? 'SELESAI' : nextStart) + (MIGRASI_DRY_RUN ? ' [DRY RUN]' : ''));
  return { done: done, disalin: akanDisalin.length, dihapus: akanDihapus.length };
}

/* ===== TRIGGER ROW EKSEKUSI: mulai / tick / berhenti ===== */
function mulaiMigrasiRowEksekusi() {
  PropertiesService.getScriptProperties().deleteProperty(MIGRASI_CURSOR_PROP_EKS);
  var trs = ScriptApp.getProjectTriggers();
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === 'migrasiRowEksekusiTick') ScriptApp.deleteTrigger(trs[i]);
  ScriptApp.newTrigger('migrasiRowEksekusiTick').timeBased().everyMinutes(1).create();
  Logger.log('Migrasi db_ROW_Eksekusi DIMULAI (tiap 1 menit, batch ' + MIGRASI_BATCH + ').');
}

function migrasiRowEksekusiTick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    var r = migrasiRowEksekusiBatch();
    if (r && r.done) {
      var trs = ScriptApp.getProjectTriggers();
      for (var i = 0; i < trs.length; i++)
        if (trs[i].getHandlerFunction() === 'migrasiRowEksekusiTick') ScriptApp.deleteTrigger(trs[i]);
      Logger.log('Migrasi db_ROW_Eksekusi SELESAI -> trigger dilepas.');
    }
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

function hentikanMigrasiRowEksekusi() {
  var trs = ScriptApp.getProjectTriggers(), n = 0;
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === 'migrasiRowEksekusiTick') { ScriptApp.deleteTrigger(trs[i]); n++; }
  PropertiesService.getScriptProperties().deleteProperty(MIGRASI_CURSOR_PROP_EKS);
  Logger.log('Migrasi ROW Eksekusi dihentikan, ' + n + ' trigger dilepas, cursor direset.');
}

/* ===== MIGRASI 1 BARIS db_ROW_Eksekusi by Kode Eksekusi (uji coba / manual) =====
   Alur sama dgn versi sebelumnya, kunci = Kode Eksekusi (kolom D).
   TIDAK mengecek kriteria H-2 — baris dipilih manual.
   Cara pakai: migrasiSatuBarisRowEksekusi('<Kode Eksekusi persis dari kolom D>'); */
function migrasiSatuBarisRowEksekusi(kodeEksekusi) {
  var C = COL_ROW, LEBAR = COL_ROW_N, NAMA = 'db_ROW_Eksekusi';
  var key = String(kodeEksekusi || '').trim();
  if (!key) return { ok: false, message: 'Kode Eksekusi wajib diisi.' };

  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) return { ok: false, message: 'Sheet ' + NAMA + ' tidak ditemukan di salah satu file.' };

  // 1) Cek keberadaan di ARSIP
  var adaDiArsip = false;
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, C.kodeEksekusi + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      if (String(colArsip[a][0] || '').trim() === key) { adaDiArsip = true; break; }
    }
  }

  // 2) Cari nomor baris di AKTIF
  var rowNum = -1;
  if (shAktif.getLastRow() > 1) {
    var colAktif = shAktif.getRange(2, C.kodeEksekusi + 1, shAktif.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < colAktif.length; i++) {
      if (String(colAktif[i][0] || '').trim() === key) { rowNum = i + 2; break; }
    }
  }
  if (rowNum < 0) {
    Logger.log('[migrasiSatuBarisRowEksekusi] "' + key + '" TIDAK ditemukan di file AKTIF — tidak ada yang diproses. Ambil nilai persis dari kolom D db_ROW_Eksekusi.');
    return { ok: true, mode: 'tidak-ada-di-aktif', kodeEksekusi: key, sudahDiArsip: adaDiArsip };
  }

  var mode;
  if (adaDiArsip) {
    mode = 'hapus-duplikat';
  } else {
    var rowData = shAktif.getRange(rowNum, 1, 1, LEBAR).getValues()[0].slice(1);   // B..AC (tanpa kolom A)
    var rowBaru = _lastRowKodeRowEks_(shArsip) + 1;
    shArsip.getRange(rowBaru, 2, 1, LEBAR - 1).setValues([rowData]);
    SpreadsheetApp.flush();
    var cek = String(shArsip.getRange(rowBaru, C.kodeEksekusi + 1).getValue() || '').trim();
    if (cek !== key) {
      throw new Error('Verifikasi append GAGAL utk ' + key + ' — baris di aktif TIDAK dihapus.');
    }
    mode = 'disalin';
  }

  // 3) Hapus baris di AKTIF
  shAktif.deleteRow(rowNum);
  SpreadsheetApp.flush();
  Logger.log('[migrasiSatuBarisRowEksekusi] ' + key + ' -> ' + mode + ' (baris aktif ' + rowNum + ' dihapus)');
  return { ok: true, mode: mode, kodeEksekusi: key, barisAktifDihapus: rowNum };
}

/* ===== PREVIEW db_ROW_Eksekusi (read-only, aman) ===== */
function previewMigrasiRowEksekusi() {
  var C = COL_ROW, LEBAR = COL_ROW_N, NAMA = 'db_ROW_Eksekusi';
  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) { Logger.log('Sheet ' + NAMA + ' tidak ditemukan di salah satu file.'); return; }

  var adaDiArsip = {};
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, C.kodeEksekusi + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      var ka = String(colArsip[a][0] || '').trim();
      if (ka) adaDiArsip[ka] = true;
    }
  }

  var batas = _migrasiBatasTanggal();
  var total = 0, pindah = 0, sudahAda = 0, tetap = 0, tanpaKode = 0;
  var sampelPindah = [], sampelSudahAda = [], sampelTetap = [];
  var lastRow = shAktif.getLastRow();
  if (lastRow > 1) {
    var data = shAktif.getRange(2, 1, lastRow - 1, LEBAR).getValues();
    for (var i = 0; i < data.length; i++) {
      var kode = String(data[i][C.kodeEksekusi] || '').trim();
      if (!kode) { tanpaKode++; continue; }
      total++;
      var label = kode + ' (' + _normTgl(data[i][C.tanggal]) + ')';
      if (adaDiArsip[kode]) {
        sudahAda++;
        if (sampelSudahAda.length < 5) sampelSudahAda.push(label);
      } else if (_lolosKriteriaMigrasiRowEksekusi(data[i])) {
        pindah++;
        if (sampelPindah.length < 5) sampelPindah.push(label);
      } else {
        tetap++;
        if (sampelTetap.length < 5) sampelTetap.push(label);
      }
    }
  }

  Logger.log('================ PREVIEW MIGRASI db_ROW_Eksekusi ================');
  Logger.log('Batas tanggal (H-' + MIGRASI_H_MINUS + '): ' + batas + ' — baris dgn Tanggal (kolom G) <= ' + batas + ' akan dipindah.');
  Logger.log('Total baris ber-Kode Eksekusi di AKTIF : ' + total);
  Logger.log('  > Akan DISALIN ke arsip lalu dihapus : ' + pindah);
  Logger.log('      contoh: ' + (sampelPindah.join(', ') || '-'));
  Logger.log('  > SUDAH ADA di arsip (hanya dihapus) : ' + sudahAda);
  Logger.log('      contoh: ' + (sampelSudahAda.join(', ') || '-'));
  Logger.log('  > TETAP di aktif (belum H-' + MIGRASI_H_MINUS + ')         : ' + tetap);
  Logger.log('      contoh: ' + (sampelTetap.join(', ') || '-'));
  Logger.log('Baris tanpa Kode Eksekusi (dilewati) : ' + tanpaKode);
  Logger.log('Baris yang sudah ada di ARSIP        : ' + Object.keys(adaDiArsip).length);
  Logger.log('Deteksi hantu AKTIF : getLastRow=' + lastRow + ' vs baris terakhir berisi Kode = ' + _lastRowKodeRowEks_(shAktif));
  Logger.log('Deteksi hantu ARSIP : getLastRow=' + shArsip.getLastRow() + ' vs baris terakhir berisi Kode = ' + _lastRowKodeRowEks_(shArsip));
  Logger.log('==================================================================');
}

/* =====================================================
   BAGIAN 4: db_INS_Temuan
   Mekanisme SAMA dgn sheet sebelumnya, tapi KRITERIA BEDA (bukan tanggal):
     1) Tanggal BEBAS — tidak jadi kriteria.
     2) Kolom AA (Status / T.status) WAJIB = 'Selesai' (STATUS_INS.SELESAI).
     3) 4 kolom link foto WAJIB terisi:
          R  = Foto Temuan Url    (T.fotoTemuanUrl,    idx 17)
          T  = Foto Tiang Url     (T.fotoTiangUrl,     idx 19)
          AI = Foto Pekerjaan Url (T.fotoPekerjaanUrl, idx 34)
          AK = Foto Sesudah Url   (T.fotoSesudahUrl,   idx 36)
        -> hanya temuan SELESAI & DOKUMENTASI FOTO LENKAP yg pindah ke arsip.
     - Kunci dedup/lookup = Kode Pekerjaan (kolom D / T.kodePekerjaan) — unik per baris.
     - Lebar 45 kolom (A..AS); kolom A = formula No, TIDAK disalin (tulis B..AS).
   Memakai COL_INS.TEMUAN, SHEET_INS & STATUS_INS dari Code.gs (global scope).
   ===================================================== */

var MIGRASI_CURSOR_PROP_TMN = 'MIGRASI_TEMUAN_CURSOR';

function _lolosKriteriaMigrasiInsTemuan(row) {
  var T = COL_INS.TEMUAN;
  if (String(row[T.status] || '').trim() !== STATUS_INS.SELESAI) return false;   // AA wajib 'Selesai'
  if (!String(row[T.fotoTemuanUrl]    || '').trim()) return false;               // R  wajib terisi
  if (!String(row[T.fotoTiangUrl]     || '').trim()) return false;               // T  wajib terisi
  if (!String(row[T.fotoPekerjaanUrl] || '').trim()) return false;               // AI wajib terisi
  if (!String(row[T.fotoSesudahUrl]   || '').trim()) return false;               // AK wajib terisi
  return true;
}

// Baris terakhir yg benar-benar berisi Kode Pekerjaan (kolom D) — kebal baris hantu formula kolom A.
function _lastRowKodeInsTemuan_(sh) {
  var last = sh.getLastRow();
  if (last < 2) return 1;
  var col = sh.getRange(2, COL_INS.TEMUAN.kodePekerjaan + 1, last - 1, 1).getValues();
  for (var i = col.length - 1; i >= 0; i--) {
    if (String(col[i][0] || '').trim() !== '') return i + 2;
  }
  return 1;
}

/* ===== 1 BATCH MIGRASI db_INS_Temuan ===== */
function migrasiInsTemuanBatch() {
  if (MIGRASI_DRY_RUN) Logger.log('⚠️ MODE SIMULASI (DRY RUN) AKTIF — tidak ada data yang disalin/dihapus. Set MIGRASI_DRY_RUN = false utk menjalankan sungguhan.');
  var T = COL_INS.TEMUAN, LEBAR = T.folderPath + 1;   // 45 kolom (A..AS); kolom A = formula No, TIDAK disalin
  var NAMA = SHEET_INS.TEMUAN;                        // 'db_INS_Temuan'
  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) throw new Error(NAMA + ' tidak ditemukan di salah satu file.');

  // 1) INDEX Kode Pekerjaan yang SUDAH ada di arsip
  var adaDiArsip = {};
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, T.kodePekerjaan + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      var ka = String(colArsip[a][0] || '').trim();
      if (ka) adaDiArsip[ka] = true;
    }
  }

  // 2) Baca batch baris AKTIF dari cursor
  var props = PropertiesService.getScriptProperties();
  var start = parseInt(props.getProperty(MIGRASI_CURSOR_PROP_TMN) || '2', 10);
  var lastRow = shAktif.getLastRow();
  if (start > lastRow) { props.deleteProperty(MIGRASI_CURSOR_PROP_TMN); return { done: true, disalin: 0, dihapus: 0 }; }
  var end = Math.min(start + MIGRASI_BATCH - 1, lastRow);
  var data = shAktif.getRange(start, 1, end - start + 1, LEBAR).getValues();

  // 3) Klasifikasi per mekanisme (kriteria: Status Selesai + 4 link foto lengkap; tanggal BEBAS)
  var akanDisalin = [], akanDihapus = [];
  for (var i = 0; i < data.length; i++) {
    var kode = String(data[i][T.kodePekerjaan] || '').trim();
    if (!kode) continue;                                   // baris kosong: lewati, JANGAN dihapus
    if (adaDiArsip[kode]) {
      akanDihapus.push(start + i);                         // SUDAH ADA -> hapus saja
    } else if (_lolosKriteriaMigrasiInsTemuan(data[i])) {
      akanDisalin.push(data[i].slice(1));                  // salin TANPA kolom A (formula No)
      akanDihapus.push(start + i);                         // setelah tersalin -> hapus di aktif
      adaDiArsip[kode] = true;                             // anti dobel dalam batch yg sama
    }
  }

  // 4) APPEND ke arsip + VERIFIKASI baca balik Kode Pekerjaan baris pertama
  if (!MIGRASI_DRY_RUN && akanDisalin.length) {
    var rowStart = _lastRowKodeInsTemuan_(shArsip) + 1;
    shArsip.getRange(rowStart, 2, akanDisalin.length, LEBAR - 1).setValues(akanDisalin);
    SpreadsheetApp.flush();
    var cek = String(shArsip.getRange(rowStart, T.kodePekerjaan + 1).getValue() || '').trim();
    // akanDisalin = baris TANPA kolom A (slice(1)) -> Kode Pekerjaan (kolom D, idx 3) bergeser ke idx 2 (= T.kodePekerjaan - 1)
    if (cek !== String(akanDisalin[0][T.kodePekerjaan - 1] || '').trim()) {
      throw new Error('Verifikasi append GAGAL — penghapusan dibatalkan utk batch ini.');
    }
  }

  // 5) HAPUS di aktif dari BAWAH ke ATAS
  if (!MIGRASI_DRY_RUN) {
    akanDihapus.sort(function (a, b) { return b - a; });
    for (var d = 0; d < akanDihapus.length; d++) shAktif.deleteRow(akanDihapus[d]);
    SpreadsheetApp.flush();
  }

  // 6) Cursor berikutnya (batch - jumlahDihapus)
  var nextStart = end + 1 - (MIGRASI_DRY_RUN ? 0 : akanDihapus.length);
  var done = nextStart > shAktif.getLastRow();
  if (done) props.deleteProperty(MIGRASI_CURSOR_PROP_TMN);
  else props.setProperty(MIGRASI_CURSOR_PROP_TMN, String(nextStart));

  Logger.log('[migrasiInsTemuan] batch ' + start + '-' + end +
             ' | disalin=' + akanDisalin.length + ' | dihapus=' + akanDihapus.length +
             ' | next=' + (done ? 'SELESAI' : nextStart) + (MIGRASI_DRY_RUN ? ' [DRY RUN]' : ''));
  return { done: done, disalin: akanDisalin.length, dihapus: akanDihapus.length };
}

/* ===== TRIGGER INS TEMUAN: mulai / tick / berhenti ===== */
function mulaiMigrasiInsTemuan() {
  PropertiesService.getScriptProperties().deleteProperty(MIGRASI_CURSOR_PROP_TMN);
  var trs = ScriptApp.getProjectTriggers();
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === 'migrasiInsTemuanTick') ScriptApp.deleteTrigger(trs[i]);
  ScriptApp.newTrigger('migrasiInsTemuanTick').timeBased().everyMinutes(1).create();
  Logger.log('Migrasi db_INS_Temuan DIMULAI (tiap 1 menit, batch ' + MIGRASI_BATCH + ').');
}

function migrasiInsTemuanTick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    var r = migrasiInsTemuanBatch();
    if (r && r.done) {
      var trs = ScriptApp.getProjectTriggers();
      for (var i = 0; i < trs.length; i++)
        if (trs[i].getHandlerFunction() === 'migrasiInsTemuanTick') ScriptApp.deleteTrigger(trs[i]);
      Logger.log('Migrasi db_INS_Temuan SELESAI -> trigger dilepas.');
    }
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

function hentikanMigrasiInsTemuan() {
  var trs = ScriptApp.getProjectTriggers(), n = 0;
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === 'migrasiInsTemuanTick') { ScriptApp.deleteTrigger(trs[i]); n++; }
  PropertiesService.getScriptProperties().deleteProperty(MIGRASI_CURSOR_PROP_TMN);
  Logger.log('Migrasi INS Temuan dihentikan, ' + n + ' trigger dilepas, cursor direset.');
}

/* ===== MIGRASI 1 BARIS db_INS_Temuan by Kode Pekerjaan (uji coba / manual) =====
   Alur sama dgn versi sebelumnya, kunci = Kode Pekerjaan (kolom D).
   TIDAK mengecek kriteria Status/Foto — baris dipilih manual.
   Cara pakai: migrasiSatuBarisInsTemuan('<Kode Pekerjaan persis dari kolom D>'); */
function migrasiSatuBarisInsTemuan(kodePekerjaan) {
  var T = COL_INS.TEMUAN, LEBAR = T.folderPath + 1, NAMA = SHEET_INS.TEMUAN;
  var key = String(kodePekerjaan || '').trim();
  if (!key) return { ok: false, message: 'Kode Pekerjaan wajib diisi.' };

  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) return { ok: false, message: 'Sheet ' + NAMA + ' tidak ditemukan di salah satu file.' };

  // 1) Cek keberadaan di ARSIP
  var adaDiArsip = false;
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, T.kodePekerjaan + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      if (String(colArsip[a][0] || '').trim() === key) { adaDiArsip = true; break; }
    }
  }

  // 2) Cari nomor baris di AKTIF
  var rowNum = -1;
  if (shAktif.getLastRow() > 1) {
    var colAktif = shAktif.getRange(2, T.kodePekerjaan + 1, shAktif.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < colAktif.length; i++) {
      if (String(colAktif[i][0] || '').trim() === key) { rowNum = i + 2; break; }
    }
  }
  if (rowNum < 0) {
    Logger.log('[migrasiSatuBarisInsTemuan] "' + key + '" TIDAK ditemukan di file AKTIF — tidak ada yang diproses. Ambil nilai persis dari kolom D db_INS_Temuan.');
    return { ok: true, mode: 'tidak-ada-di-aktif', kodePekerjaan: key, sudahDiArsip: adaDiArsip };
  }

  var mode;
  if (adaDiArsip) {
    mode = 'hapus-duplikat';
  } else {
    var rowData = shAktif.getRange(rowNum, 1, 1, LEBAR).getValues()[0].slice(1);   // B..AS (tanpa kolom A)
    var rowBaru = _lastRowKodeInsTemuan_(shArsip) + 1;
    shArsip.getRange(rowBaru, 2, 1, LEBAR - 1).setValues([rowData]);
    SpreadsheetApp.flush();
    var cek = String(shArsip.getRange(rowBaru, T.kodePekerjaan + 1).getValue() || '').trim();
    if (cek !== key) {
      throw new Error('Verifikasi append GAGAL utk ' + key + ' — baris di aktif TIDAK dihapus.');
    }
    mode = 'disalin';
  }

  // 3) Hapus baris di AKTIF
  shAktif.deleteRow(rowNum);
  SpreadsheetApp.flush();
  Logger.log('[migrasiSatuBarisInsTemuan] ' + key + ' -> ' + mode + ' (baris aktif ' + rowNum + ' dihapus)');
  return { ok: true, mode: mode, kodePekerjaan: key, barisAktifDihapus: rowNum };
}

/* ===== PREVIEW db_INS_Temuan (read-only, aman) ===== */
function previewMigrasiInsTemuan() {
  var T = COL_INS.TEMUAN, LEBAR = T.folderPath + 1, NAMA = SHEET_INS.TEMUAN;
  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) { Logger.log('Sheet ' + NAMA + ' tidak ditemukan di salah satu file.'); return; }

  var adaDiArsip = {};
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, T.kodePekerjaan + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      var ka = String(colArsip[a][0] || '').trim();
      if (ka) adaDiArsip[ka] = true;
    }
  }

  var total = 0, pindah = 0, sudahAda = 0, tetap = 0, tanpaKode = 0, belumSelesai = 0, fotoKurang = 0;
  var sampelPindah = [], sampelSudahAda = [], sampelTetap = [];
  var lastRow = shAktif.getLastRow();
  if (lastRow > 1) {
    var data = shAktif.getRange(2, 1, lastRow - 1, LEBAR).getValues();
    for (var i = 0; i < data.length; i++) {
      var kode = String(data[i][T.kodePekerjaan] || '').trim();
      if (!kode) { tanpaKode++; continue; }
      total++;
      var label = kode + ' (' + _normTgl(data[i][T.tanggal]) + ' | ' + String(data[i][T.status] || '').trim() + ')';
      if (adaDiArsip[kode]) {
        sudahAda++;
        if (sampelSudahAda.length < 5) sampelSudahAda.push(label);
      } else if (_lolosKriteriaMigrasiInsTemuan(data[i])) {
        pindah++;
        if (sampelPindah.length < 5) sampelPindah.push(label);
      } else {
        tetap++;
        if (String(data[i][T.status] || '').trim() !== STATUS_INS.SELESAI) belumSelesai++; else fotoKurang++;
        if (sampelTetap.length < 5) sampelTetap.push(label);
      }
    }
  }

  Logger.log('================ PREVIEW MIGRASI db_INS_Temuan ================');
  Logger.log('Kriteria: Status (AA) = Selesai + kolom R/T/AI/AK (4 link foto) terisi — tanggal BEBAS.');
  Logger.log('Total baris ber-Kode Pekerjaan di AKTIF : ' + total);
  Logger.log('  > Akan DISALIN ke arsip lalu dihapus : ' + pindah);
  Logger.log('      contoh: ' + (sampelPindah.join(', ') || '-'));
  Logger.log('  > SUDAH ADA di arsip (hanya dihapus) : ' + sudahAda);
  Logger.log('      contoh: ' + (sampelSudahAda.join(', ') || '-'));
  Logger.log('  > TETAP di aktif (belum memenuhi kriteria): ' + tetap + '  (belum Selesai: ' + belumSelesai + ' | Selesai tapi foto kurang: ' + fotoKurang + ')');
  Logger.log('      contoh: ' + (sampelTetap.join(', ') || '-'));
  Logger.log('Baris tanpa Kode Pekerjaan (dilewati) : ' + tanpaKode);
  Logger.log('Baris yang sudah ada di ARSIP         : ' + Object.keys(adaDiArsip).length);
  Logger.log('Deteksi hantu AKTIF : getLastRow=' + lastRow + ' vs baris terakhir berisi Kode = ' + _lastRowKodeInsTemuan_(shAktif));
  Logger.log('Deteksi hantu ARSIP : getLastRow=' + shArsip.getLastRow() + ' vs baris terakhir berisi Kode = ' + _lastRowKodeInsTemuan_(shArsip));
  Logger.log('==================================================================');
}

/* =====================================================
   BAGIAN 5: db_Yandal_P0
   Mekanisme SAMA, penyesuaian:
     - Kunci dedup/lookup = Kode Pekerjaan P0 (kolom D / COL_P0.kodeP0) — unik per baris.
     - Kriteria tanggal = kolom G (Tanggal, COL_P0.tanggal) <= H-2 (sama seperti sheet lain).
     - Lebar 50 kolom (A..AX — 12 Agu 2026: +"Alasan Rejected" di AQ) mengikuti COL_P0.folderPath+1; kolom A = formula No, TIDAK disalin (tulis B..AX).
   KHUSUS sheet ini ada GUARD JENDELA WAKTU: P0 diinput 24 JAM TANPA JEDA (3 shift),
   jadi migrasi HANYA boleh memproses pada sela pergantian shift (Asia/Jakarta):
     1) 23:55 - 00:10   2) 07:50 - 08:10   3) 15:50 - 16:10
   Di luar jendela itu batch DILEWATI (trigger tetap terpasang & mengecek tiap menit).
   GUARD ke-2 (9 Agu 2026): Status Approval (kolom AP) terisi -> boleh pindah; yg belum
   diputuskan admin masih bisa berubah -> jangan pindah dulu ke arsip.
   GUARD ke-3 (10 Agu 2026): P0 TERLANTAR — Status Approval kosong DAN ketiga foto asli
   (X=Foto Sebelum, AC=Foto Pekerjaan, AH=Foto Sesudah) kosong semua -> IKUT dipindah
   (bersih-bersih; baris seperti itu tidak akan diproses lagi).
   Memakai COL_P0 & SHEET_YANDAL dari Tek-Yandal-Code.gs (global scope).
   ===================================================== */

var MIGRASI_CURSOR_PROP_P0 = 'MIGRASI_YANDAL_P0_CURSOR';

/* Guard jendela waktu migrasi P0 (Asia/Jakarta). true HANYA pada:
   23:55 - 00:10 (lintas tengah malam), 07:50 - 08:10, 15:50 - 16:10. */
function _dalamJendelaMigrasiP0_(d) {
  var hm = Utilities.formatDate(d || new Date(), 'Asia/Jakarta', 'HH:mm');
  var m  = parseInt(hm.substring(0, 2), 10) * 60 + parseInt(hm.substring(3, 5), 10);
  if (m >= 1435 || m <= 10) return true;    // 23:55 - 00:10 (lintas tengah malam)
  if (m >= 470 && m <= 490) return true;    // 07:50 - 08:10
  if (m >= 950 && m <= 970) return true;    // 15:50 - 16:10
  return false;
}

function _lolosKriteriaMigrasiYandalP0(row) {
  var tgl = _normTgl(row[COL_P0.tanggal]);   // kolom G
  if (!tgl) return false;                    // tanggal kosong/rusak -> biarkan di aktif
  if (tgl > _migrasiBatasTanggal()) return false;   // lebih muda dari H-2 -> tetap di aktif
  // JALUR 1 (9 Agu 2026): Status Approval (kolom AP) terisi -> boleh pindah.
  if (String(row[COL_P0.statusApproval] || '').trim()) return true;
  // JALUR 2 (10 Agu 2026): P0 TERLANTAR — Status Approval kosong DAN ketiga kolom foto
  // asli kosong semua (X=Foto Sebelum, AC=Foto Pekerjaan, AH=Foto Sesudah). Baris seperti
  // ini tidak akan diproses lagi -> IKUT dipindah sebagai bersih-bersih.
  var terlantar = !String(row[COL_P0.fotoSebelum]   || '').trim()
               && !String(row[COL_P0.fotoPekerjaan] || '').trim()
               && !String(row[COL_P0.fotoSesudah]   || '').trim();
  return terlantar;   // ada foto tapi belum approval (Menunggu) -> TETAP di aktif
}

// Baris terakhir yg benar-benar berisi Kode P0 (kolom D) — kebal baris hantu formula kolom A.
function _lastRowKodeYandalP0_(sh) {
  var last = sh.getLastRow();
  if (last < 2) return 1;
  var col = sh.getRange(2, COL_P0.kodeP0 + 1, last - 1, 1).getValues();
  for (var i = col.length - 1; i >= 0; i--) {
    if (String(col[i][0] || '').trim() !== '') return i + 2;
  }
  return 1;
}

/* ===== 1 BATCH MIGRASI db_Yandal_P0 =====
   force=true utk MEMAKSA jalan di luar jendela (HANYA uji coba manual — hati-hati tabrakan input petugas). */
function migrasiYandalP0Batch(force) {
  if (MIGRASI_DRY_RUN) Logger.log('⚠️ MODE SIMULASI (DRY RUN) AKTIF — tidak ada data yang disalin/dihapus. Set MIGRASI_DRY_RUN = false utk menjalankan sungguhan.');
  if (!_dalamJendelaMigrasiP0_()) {
    if (force !== true) {
      Logger.log('[migrasiYandalP0] Di luar jendela (23:55-00:10 / 07:50-08:10 / 15:50-16:10 WIB) — batch DILEWATI, cursor tidak bergerak.');
      return { done: false, skipped: 'di-luar-jendela' };
    }
    Logger.log('⚠️ FORCE: migrasi dijalankan DI LUAR jendela waktu (mode paksa).');
  }
  var C = COL_P0, LEBAR = C.folderPath + 1;   // 49 kolom (A..AW); kolom A = formula No, TIDAK disalin
  var NAMA = SHEET_YANDAL.P0;                 // 'db_Yandal_P0'
  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) throw new Error(NAMA + ' tidak ditemukan di salah satu file.');

  // 1) INDEX Kode P0 yang SUDAH ada di arsip
  var adaDiArsip = {};
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, C.kodeP0 + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      var ka = String(colArsip[a][0] || '').trim();
      if (ka) adaDiArsip[ka] = true;
    }
  }

  // 2) Baca batch baris AKTIF dari cursor
  var props = PropertiesService.getScriptProperties();
  var start = parseInt(props.getProperty(MIGRASI_CURSOR_PROP_P0) || '2', 10);
  var lastRow = shAktif.getLastRow();
  if (start > lastRow) { props.deleteProperty(MIGRASI_CURSOR_PROP_P0); return { done: true, disalin: 0, dihapus: 0 }; }
  var end = Math.min(start + MIGRASI_BATCH - 1, lastRow);
  var data = shAktif.getRange(start, 1, end - start + 1, LEBAR).getValues();

  // 3) Klasifikasi per mekanisme
  var akanDisalin = [], akanDihapus = [];
  for (var i = 0; i < data.length; i++) {
    var kode = String(data[i][C.kodeP0] || '').trim();
    if (!kode) continue;                                   // baris kosong: lewati, JANGAN dihapus
    if (adaDiArsip[kode]) {
      akanDihapus.push(start + i);                         // SUDAH ADA -> hapus saja
    } else if (_lolosKriteriaMigrasiYandalP0(data[i])) {
      akanDisalin.push(data[i].slice(1));                  // salin TANPA kolom A (formula No)
      akanDihapus.push(start + i);                         // setelah tersalin -> hapus di aktif
      adaDiArsip[kode] = true;                             // anti dobel dalam batch yg sama
    }
  }

  // 4) APPEND ke arsip + VERIFIKASI baca balik Kode P0 baris pertama
  if (!MIGRASI_DRY_RUN && akanDisalin.length) {
    var rowStart = _lastRowKodeYandalP0_(shArsip) + 1;
    shArsip.getRange(rowStart, 2, akanDisalin.length, LEBAR - 1).setValues(akanDisalin);
    SpreadsheetApp.flush();
    var cek = String(shArsip.getRange(rowStart, C.kodeP0 + 1).getValue() || '').trim();
    // akanDisalin = baris TANPA kolom A (slice(1)) -> Kode P0 (kolom D, idx 3) bergeser ke idx 2 (= C.kodeP0 - 1)
    if (cek !== String(akanDisalin[0][C.kodeP0 - 1] || '').trim()) {
      throw new Error('Verifikasi append GAGAL — penghapusan dibatalkan utk batch ini.');
    }
  }

  // 5) HAPUS di aktif dari BAWAH ke ATAS
  if (!MIGRASI_DRY_RUN) {
    akanDihapus.sort(function (a, b) { return b - a; });
    for (var d = 0; d < akanDihapus.length; d++) shAktif.deleteRow(akanDihapus[d]);
    SpreadsheetApp.flush();
  }

  // 6) Cursor berikutnya (batch - jumlahDihapus)
  var nextStart = end + 1 - (MIGRASI_DRY_RUN ? 0 : akanDihapus.length);
  var done = nextStart > shAktif.getLastRow();
  if (done) props.deleteProperty(MIGRASI_CURSOR_PROP_P0);
  else props.setProperty(MIGRASI_CURSOR_PROP_P0, String(nextStart));

  Logger.log('[migrasiYandalP0] batch ' + start + '-' + end +
             ' | disalin=' + akanDisalin.length + ' | dihapus=' + akanDihapus.length +
             ' | next=' + (done ? 'SELESAI' : nextStart) + (MIGRASI_DRY_RUN ? ' [DRY RUN]' : ''));
  return { done: done, disalin: akanDisalin.length, dihapus: akanDihapus.length };
}

/* ===== TRIGGER YANDAL P0: mulai / tick / berhenti ===== */
function mulaiMigrasiYandalP0() {
  PropertiesService.getScriptProperties().deleteProperty(MIGRASI_CURSOR_PROP_P0);
  var trs = ScriptApp.getProjectTriggers();
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === 'migrasiYandalP0Tick') ScriptApp.deleteTrigger(trs[i]);
  ScriptApp.newTrigger('migrasiYandalP0Tick').timeBased().everyMinutes(1).create();
  Logger.log('Migrasi db_Yandal_P0 DIMULAI (tiap 1 menit, batch ' + MIGRASI_BATCH + ') — proses HANYA di jendela 23:55-00:10 / 07:50-08:10 / 15:50-16:10 WIB.');
}

function migrasiYandalP0Tick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    var r = migrasiYandalP0Batch();
    if (r && r.done) {
      var trs = ScriptApp.getProjectTriggers();
      for (var i = 0; i < trs.length; i++)
        if (trs[i].getHandlerFunction() === 'migrasiYandalP0Tick') ScriptApp.deleteTrigger(trs[i]);
      Logger.log('Migrasi db_Yandal_P0 SELESAI -> trigger dilepas.');
    }
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

function hentikanMigrasiYandalP0() {
  var trs = ScriptApp.getProjectTriggers(), n = 0;
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === 'migrasiYandalP0Tick') { ScriptApp.deleteTrigger(trs[i]); n++; }
  PropertiesService.getScriptProperties().deleteProperty(MIGRASI_CURSOR_PROP_P0);
  Logger.log('Migrasi Yandal P0 dihentikan, ' + n + ' trigger dilepas, cursor direset.');
}

/* ===== MIGRASI 1 BARIS db_Yandal_P0 by Kode P0 (uji coba / manual) =====
   Alur sama dgn versi sebelumnya, kunci = Kode P0 (kolom D).
   TIDAK mengecek kriteria H-2 & TIDAK mengecek jendela waktu — baris dipilih manual.
   Cara pakai: migrasiSatuBarisYandalP0('<Kode P0 persis dari kolom D>'); */
function migrasiSatuBarisYandalP0(kodeP0) {
  var C = COL_P0, LEBAR = C.folderPath + 1, NAMA = SHEET_YANDAL.P0;
  var key = String(kodeP0 || '').trim();
  if (!key) return { ok: false, message: 'Kode P0 wajib diisi.' };

  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) return { ok: false, message: 'Sheet ' + NAMA + ' tidak ditemukan di salah satu file.' };

  // 1) Cek keberadaan di ARSIP
  var adaDiArsip = false;
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, C.kodeP0 + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      if (String(colArsip[a][0] || '').trim() === key) { adaDiArsip = true; break; }
    }
  }

  // 2) Cari nomor baris di AKTIF
  var rowNum = -1;
  if (shAktif.getLastRow() > 1) {
    var colAktif = shAktif.getRange(2, C.kodeP0 + 1, shAktif.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < colAktif.length; i++) {
      if (String(colAktif[i][0] || '').trim() === key) { rowNum = i + 2; break; }
    }
  }
  if (rowNum < 0) {
    Logger.log('[migrasiSatuBarisYandalP0] "' + key + '" TIDAK ditemukan di file AKTIF — tidak ada yang diproses. Ambil nilai persis dari kolom D db_Yandal_P0.');
    return { ok: true, mode: 'tidak-ada-di-aktif', kodeP0: key, sudahDiArsip: adaDiArsip };
  }

  var mode;
  if (adaDiArsip) {
    mode = 'hapus-duplikat';
  } else {
    var rowData = shAktif.getRange(rowNum, 1, 1, LEBAR).getValues()[0].slice(1);   // B..AW (tanpa kolom A)
    var rowBaru = _lastRowKodeYandalP0_(shArsip) + 1;
    shArsip.getRange(rowBaru, 2, 1, LEBAR - 1).setValues([rowData]);
    SpreadsheetApp.flush();
    var cek = String(shArsip.getRange(rowBaru, C.kodeP0 + 1).getValue() || '').trim();
    if (cek !== key) {
      throw new Error('Verifikasi append GAGAL utk ' + key + ' — baris di aktif TIDAK dihapus.');
    }
    mode = 'disalin';
  }

  // 3) Hapus baris di AKTIF
  shAktif.deleteRow(rowNum);
  SpreadsheetApp.flush();
  Logger.log('[migrasiSatuBarisYandalP0] ' + key + ' -> ' + mode + ' (baris aktif ' + rowNum + ' dihapus)');
  return { ok: true, mode: mode, kodeP0: key, barisAktifDihapus: rowNum };
}

/* ===== PREVIEW db_Yandal_P0 (read-only, aman — bebas jendela waktu) ===== */
function previewMigrasiYandalP0() {
  var C = COL_P0, LEBAR = C.folderPath + 1, NAMA = SHEET_YANDAL.P0;
  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) { Logger.log('Sheet ' + NAMA + ' tidak ditemukan di salah satu file.'); return; }

  var adaDiArsip = {};
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, C.kodeP0 + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      var ka = String(colArsip[a][0] || '').trim();
      if (ka) adaDiArsip[ka] = true;
    }
  }

  var batas = _migrasiBatasTanggal();
  var total = 0, pindah = 0, sudahAda = 0, tetap = 0, tanpaKode = 0, belumAppr = 0, terlantar = 0;
  var sampelPindah = [], sampelSudahAda = [], sampelTetap = [];
  var lastRow = shAktif.getLastRow();
  if (lastRow > 1) {
    var data = shAktif.getRange(2, 1, lastRow - 1, LEBAR).getValues();
    for (var i = 0; i < data.length; i++) {
      var kode = String(data[i][C.kodeP0] || '').trim();
      if (!kode) { tanpaKode++; continue; }
      total++;
      var label = kode + ' (' + _normTgl(data[i][C.tanggal]) + ' | ' + (String(data[i][C.statusApproval] || '').trim() || 'status kosong') + ')';
      if (adaDiArsip[kode]) {
        sudahAda++;
        if (sampelSudahAda.length < 5) sampelSudahAda.push(label);
      } else if (_lolosKriteriaMigrasiYandalP0(data[i])) {
        pindah++;
        if (!String(data[i][C.statusApproval] || '').trim()) terlantar++;   // lolos via jalur terlantar (foto kosong)
        if (sampelPindah.length < 5) sampelPindah.push(label);
      } else {
        tetap++;
        // Pecah alasan tertahan: sudah <= H-2 tapi Status Approval kosong vs memang belum <= H-2.
        if (!String(data[i][C.statusApproval] || '').trim() && _normTgl(data[i][C.tanggal]) <= batas) belumAppr++;
        if (sampelTetap.length < 5) sampelTetap.push(label);
      }
    }
  }

  Logger.log('================ PREVIEW MIGRASI db_Yandal_P0 ================');
  Logger.log('Kriteria: Tanggal (kolom G) <= ' + batas + ' (H-' + MIGRASI_H_MINUS + ') DAN (Status Approval (kolom AP) terisi ATAU ketiga foto asli X/AC/AH kosong = P0 terlantar).');
  Logger.log('Guard jendela saat ini: ' + (_dalamJendelaMigrasiP0_() ? 'DI DALAM jendela (batch boleh jalan)' : 'DI LUAR jendela (batch DILEWATI)') + ' — sekarang ' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'HH:mm') + ' WIB.');
  Logger.log('Total baris ber-Kode P0 di AKTIF      : ' + total);
  Logger.log('  > Akan DISALIN ke arsip lalu dihapus : ' + pindah + '  (Status Approval terisi: ' + (pindah - terlantar) + ' | terlantar tanpa foto: ' + terlantar + ')');
  Logger.log('      contoh: ' + (sampelPindah.join(', ') || '-'));
  Logger.log('  > SUDAH ADA di arsip (hanya dihapus) : ' + sudahAda);
  Logger.log('      contoh: ' + (sampelSudahAda.join(', ') || '-'));
  Logger.log('  > TETAP di aktif                     : ' + tetap + '  (belum H-' + MIGRASI_H_MINUS + ': ' + (tetap - belumAppr) + ' | ada foto tapi Status Approval kosong (Menunggu): ' + belumAppr + ')');
  Logger.log('      contoh: ' + (sampelTetap.join(', ') || '-'));
  Logger.log('Baris tanpa Kode P0 (dilewati)      : ' + tanpaKode);
  Logger.log('Baris yang sudah ada di ARSIP       : ' + Object.keys(adaDiArsip).length);
  Logger.log('Deteksi hantu AKTIF : getLastRow=' + lastRow + ' vs baris terakhir berisi Kode = ' + _lastRowKodeYandalP0_(shAktif));
  Logger.log('Deteksi hantu ARSIP : getLastRow=' + shArsip.getLastRow() + ' vs baris terakhir berisi Kode = ' + _lastRowKodeYandalP0_(shArsip));
  Logger.log('==================================================================');
}

/* ===== MULAI SEMUA MIGRASI (dipanggil trigger harian 01:00) =====
   PENTING soal kuota: Apps Script membatasi MAKS 20 trigger per script (project ini sudah
   penuh dgn trigger rutin: watermark, WA, laporan, rank, dll). Karena itu SEMUA sheet
   migrasi berbagi SATU trigger gabungan (migrasiSemuaTick): tiap menit menjalankan 1 batch
   utk TIAP sheet yg masih aktif. Sheet yg selesai ditandai & diloncati; semua selesai ->
   trigger lepas sendiri. Fungsi mulaiMigrasi<Sheet>() per-sheet TETAP ADA utk menjalankan
   1 sheet saja, tapi tiap pemanggilan memakan 1 slot trigger — gunakan hemat-hemat. */
var MIGRASI_SEMUA_STATE_PROP = 'MIGRASI_SEMUA_STATE';   // JSON {kunci:true/false}

var MIGRASI_SEMUA_DAFTAR = [
  // PENTING: cursor ditulis sbg STRING LITERAL (bukan referensi variabel) — referensi var
  // dievaluasi saat file DIMUAT, sedangkan MIGRASI_CURSOR_PROP_LH baru didefinisikan di
  // BAGIAN 6 (SETELAH array ini) -> sempat memicu "Invalid argument: key" di mulaiMigrasiSemua.
  { kunci: 'header', cursor: 'MIGRASI_HEADER_CURSOR',     batch: function () { return migrasiGlobalHeaderBatch(); } },
  { kunci: 'rlz',    cursor: 'MIGRASI_ROW_RLZ_CURSOR',    batch: function () { return migrasiRowRealisasiBatch(); } },
  { kunci: 'eks',    cursor: 'MIGRASI_ROW_EKS_CURSOR',    batch: function () { return migrasiRowEksekusiBatch(); } },
  { kunci: 'tmn',    cursor: 'MIGRASI_TEMUAN_CURSOR',     batch: function () { return migrasiInsTemuanBatch(); } },
  { kunci: 'p0',     cursor: 'MIGRASI_YANDAL_P0_CURSOR',  batch: function () { return migrasiYandalP0Batch(); } },
  { kunci: 'lh',     cursor: 'MIGRASI_LAP_HARIAN_CURSOR', batch: function () { return migrasiLapHarianBatch(); } },
  { kunci: 'ijr',    cursor: 'MIGRASI_INSJAR_RLZ_CURSOR', batch: function () { return migrasiInsJarRlzBatch(); } },
  { kunci: 'idr',    cursor: 'MIGRASI_INSDU_RLZ_CURSOR',  batch: function () { return migrasiInsDuRlzBatch(); } },
  { kunci: 'hpg',    cursor: 'MIGRASI_HARTEK_PG_CURSOR',  batch: function () { return migrasiHartekPGBatch(); } },
  { kunci: 'hpkj',   cursor: 'MIGRASI_HARTEK_PKJ_CURSOR', batch: function () { return migrasiHartekPkjBatch(); } },
  { kunci: 'hmt',    cursor: 'MIGRASI_HARTEK_MAT_CURSOR', batch: function () { return migrasiHartekMatBatch(); } },
  { kunci: 'ysh',    cursor: 'MIGRASI_YANDAL_SHIFT_CURSOR', batch: function () { return migrasiYandalShiftBatch(); } },
  { kunci: 'ysw',    cursor: 'MIGRASI_YANDAL_SWC_CURSOR', batch: function () { return migrasiYandalSwcBatch(); } }
];

function _migrasiSemuaStateBaca_() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(MIGRASI_SEMUA_STATE_PROP) || '{}'); }
  catch (e) { return {}; }
}

function mulaiMigrasiSemua() {
  var props = PropertiesService.getScriptProperties();
  var state = {};
  for (var i = 0; i < MIGRASI_SEMUA_DAFTAR.length; i++) {
    props.deleteProperty(MIGRASI_SEMUA_DAFTAR[i].cursor);   // reset cursor tiap sheet
    state[MIGRASI_SEMUA_DAFTAR[i].kunci] = true;            // tandai aktif
  }
  props.setProperty(MIGRASI_SEMUA_STATE_PROP, JSON.stringify(state));
  var trs = ScriptApp.getProjectTriggers();
  for (var t = 0; t < trs.length; t++)
    if (trs[t].getHandlerFunction() === 'migrasiSemuaTick') ScriptApp.deleteTrigger(trs[t]);
  ScriptApp.newTrigger('migrasiSemuaTick').timeBased().everyMinutes(1).create();   // SATU trigger utk semua sheet
  Logger.log('Migrasi SEMUA sheet DIMULAI via 1 trigger gabungan (tiap 1 menit, batch ' + MIGRASI_BATCH + '/sheet).');
}

/* Handler trigger gabungan: 1 batch per sheet aktif per menit. Ada plafon waktu per tick
   (~4,5 menit) — sisanya dilanjutkan tick berikutnya (cursor tiap sheet menyimpan posisi). */
function migrasiSemuaTick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;                       // tick sebelumnya masih jalan -> lewati
  try {
    var state = _migrasiSemuaStateBaca_();
    var t0 = Date.now(), sisa = 0;
    for (var i = 0; i < MIGRASI_SEMUA_DAFTAR.length; i++) {
      var item = MIGRASI_SEMUA_DAFTAR[i];
      if (!state[item.kunci]) continue;                  // sudah selesai -> loncati
      if (Date.now() - t0 > 270000) { Logger.log('[migrasiSemuaTick] plafon waktu tick tercapai — sisa sheet lanjut menit berikutnya.'); break; }
      try {
        var r = item.batch();
        if (r && r.done) { state[item.kunci] = false; Logger.log('[migrasiSemuaTick] ' + item.kunci + ' SELESAI.'); }
      } catch (eB) {
        Logger.log('[migrasiSemuaTick] batch ' + item.kunci + ' ERROR — ' + eB + ' (dicoba lagi tick berikutnya)');
      }
    }
    for (var k in state) if (state[k]) sisa++;
    if (sisa === 0) {
      var trs = ScriptApp.getProjectTriggers();
      for (var t = 0; t < trs.length; t++) if (trs[t].getHandlerFunction() === 'migrasiSemuaTick') ScriptApp.deleteTrigger(trs[t]);
      PropertiesService.getScriptProperties().deleteProperty(MIGRASI_SEMUA_STATE_PROP);
      Logger.log('[migrasiSemuaTick] SEMUA sheet SELESAI -> trigger dilepas.');
    } else {
      PropertiesService.getScriptProperties().setProperty(MIGRASI_SEMUA_STATE_PROP, JSON.stringify(state));
    }
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

/* HENTIKAN SEMUA trigger migrasi (gabungan + tick per-sheet) TANPA mereset cursor —
   aman utk bersih-bersih saat kena batas "too many triggers"; lanjutkan dgn mulaiMigrasiSemua(). */
function hentikanSemuaMigrasi() {
  var handlers = ['migrasiSemuaTick','migrasiGlobalHeaderTick','migrasiRowRealisasiTick','migrasiRowEksekusiTick','migrasiInsTemuanTick','migrasiYandalP0Tick','migrasiLapHarianTick','migrasiInsJarRlzTick','migrasiInsDuRlzTick','migrasiHartekPGTick','migrasiHartekPkjTick','migrasiHartekMatTick','migrasiYandalShiftTick','migrasiYandalSwcTick'];
  var trs = ScriptApp.getProjectTriggers(), n = 0;
  for (var i = 0; i < trs.length; i++) {
    if (handlers.indexOf(trs[i].getHandlerFunction()) >= 0) { ScriptApp.deleteTrigger(trs[i]); n++; }
  }
  PropertiesService.getScriptProperties().deleteProperty(MIGRASI_SEMUA_STATE_PROP);
  Logger.log('Semua trigger migrasi dilepas: ' + n + '. Cursor TIDAK direset (resume aman via mulaiMigrasiSemua / trigger harian).');
  return n;
}

/* DIAGNOSA kuota trigger: daftar semua trigger terpasang + jumlahnya (batas 20/script). */
function lihatTriggerSaya() {
  var trs = ScriptApp.getProjectTriggers(), hitung = {};
  for (var i = 0; i < trs.length; i++) {
    var f = trs[i].getHandlerFunction();
    hitung[f] = (hitung[f] || 0) + 1;
  }
  Logger.log('Total trigger terpasang: ' + trs.length + '  (BATAS Apps Script: 20 per script)');
  for (var k in hitung) Logger.log('  ' + hitung[k] + 'x  ' + k);
  if (trs.length >= 18) Logger.log('⚠️ Sudah dekat batas — hapus trigger yg tidak dipakai via menu ⏰ (Triggers) di editor.');
  return { total: trs.length, perHandler: hitung };
}

/* ═══ GUARD MIGRASI: tanggal <= H-2 = wilayah ARSIP ═══
   Dipakai Tek-ROW.gs (sweep/recalc/ensure) agar TIDAK membuat ulang baris utk tanggal
   yang sudah pindah ke spreadsheet arsip. Batas mengikuti _migrasiBatasTanggal() (H-2)
   sehingga selalu sinkron dgn kriteria migrasi. Aman: guard non-aktif bila dipanggil
   sebelum Tek-Migrasi.gs terpasang. */
function _tglSudahDiarsip_(tglIso) {
  if (typeof _migrasiBatasTanggal !== 'function') return false;
  var tgl = _normTgl(tglIso);
  return !!tgl && tgl <= _migrasiBatasTanggal();
}

/* ===== DUAL-READ utk LAPORAN/REKAP (baca AKTIF + ARSIP, gabung) =====
   Dipakai laporan UP3/UIW & rekap lintas waktu (komulatif bulanan): data <= H-2 ada di
   arsip, > H-2 di aktif. Dedup by kolom kunci (0-based) agar baris in-flight (baru
   tersalin, belum terhapus) tidak terhitung dobel.
   ⚠️ HANYA utk sheet yg SUDAH dimigrasi & arsipnya bersih — sheet yg belum dimigrasi
   masih berisi salinan basi di arsip (angka jadi dobel). */
function _readSheetDual_(namaSheet, keyCol0, width) {
  var out = [], seen = {};
  var ids = [SPREADSHEET_ID, SPREADSHEET_ID_ARSIP];
  for (var s = 0; s < ids.length; s++) {
    var sh = SpreadsheetApp.openById(ids[s]).getSheetByName(namaSheet);
    if (!sh || sh.getLastRow() < 2) continue;
    var data = sh.getRange(2, 1, sh.getLastRow() - 1, width).getValues();
    for (var i = 0; i < data.length; i++) {
      var k = String(data[i][keyCol0] || '').trim();
      if (k) { if (seen[k]) continue; seen[k] = 1; }   // kunci terisi -> dedup
      out.push(data[i]);
    }
  }
  return out;
}

/* Peta Kode Header -> ULP lintas file (AKTIF + ARSIP). Dipakai laporan UP3/UIW:
   header lama sudah pindah ke arsip, jadi join ULP utk baris lama hanya jalan dgn dual. */
function _lapUlpMapDual_() {
  var H = COL_INS.HEADER, map = {};
  var d = _readSheetDual_(SHEET_INS.HEADER, H.kodeHeader, H.statusTextWa + 1);
  for (var i = 0; i < d.length; i++) {
    var k = String(d[i][H.kodeHeader] || '').trim();
    if (k && !map[k]) map[k] = String(d[i][H.ulp] || '').trim();
  }
  return map;
}

/* =====================================================
   BAGIAN 6: Teknik_Laporan Harian  (sheet materialisasi laporan harian)
   2 perbedaan BESAR dari sheet lain:
     - TIDAK ada kolom kode -> KUNCI dedup/lookup = TANGGAL (kolom B) itu sendiri
       (1 baris per tanggal, sistem single-ULP). Index arsip = tanggal ternormalisasi.
     - Kolom A (No) BUKAN formula (nilai statis dari skrip) -> IKUT DISALIN:
       seluruh 8 kolom A..H disalin apa adanya (tanpa slice; verifikasi tanpa geser indeks).
   Kriteria: Tanggal (kolom B) <= H-2 (murni tanggal).
   Memakai LH.SHEET & LH.COL dari Tek-LapUP3UIWHarian.gs (global scope).
   ===================================================== */

var MIGRASI_CURSOR_PROP_LH = 'MIGRASI_LAP_HARIAN_CURSOR';

function _lolosKriteriaMigrasiLapHarian(row) {
  var tgl = _normTgl(row[LH.COL.tanggal]);   // kolom B
  if (!tgl) return false;                    // tanggal kosong/rusak -> biarkan di aktif
  return tgl <= _migrasiBatasTanggal();      // H-2 ke belakang -> pindah
}

// Baris terakhir yg benar-benar berisi Tanggal terbaca (kolom B) — jangkar append.
function _lastRowTglLapHarian_(sh) {
  var last = sh.getLastRow();
  if (last < 2) return 1;
  var col = sh.getRange(2, LH.COL.tanggal + 1, last - 1, 1).getValues();
  for (var i = col.length - 1; i >= 0; i--) {
    if (_normTgl(col[i][0])) return i + 2;
  }
  return 1;
}

// Index tanggal -> true utk sebuah sheet (aktif/arsip): { 'yyyy-MM-dd': true, ... }
function _tglIndexLapHarian_(sh) {
  var idx = {};
  if (sh && sh.getLastRow() > 1) {
    var col = sh.getRange(2, LH.COL.tanggal + 1, sh.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < col.length; i++) {
      var t = _normTgl(col[i][0]);
      if (t) idx[t] = true;
    }
  }
  return idx;
}

/* ===== 1 BATCH MIGRASI Teknik_Laporan Harian ===== */
function migrasiLapHarianBatch() {
  if (MIGRASI_DRY_RUN) Logger.log('⚠️ MODE SIMULASI (DRY RUN) AKTIF — tidak ada data yang disalin/dihapus. Set MIGRASI_DRY_RUN = false utk menjalankan sungguhan.');
  var NAMA = LH.SHEET, LEBAR = 8;    // A..H — kolom A (No) nilai STATIS -> ikut disalin
  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) throw new Error(NAMA + ' tidak ditemukan di salah satu file.');

  // 1) INDEX tanggal yang SUDAH ada di arsip (1x baca per putaran)
  var adaDiArsip = _tglIndexLapHarian_(shArsip);

  // 2) Baca batch baris AKTIF dari cursor
  var props = PropertiesService.getScriptProperties();
  var start = parseInt(props.getProperty(MIGRASI_CURSOR_PROP_LH) || '2', 10);
  var lastRow = shAktif.getLastRow();
  if (start > lastRow) { props.deleteProperty(MIGRASI_CURSOR_PROP_LH); return { done: true, disalin: 0, dihapus: 0 }; }
  var end = Math.min(start + MIGRASI_BATCH - 1, lastRow);
  var data = shAktif.getRange(start, 1, end - start + 1, LEBAR).getValues();

  // 3) Klasifikasi per mekanisme (kunci = tanggal ternormalisasi)
  var batas = _migrasiBatasTanggal();
  var akanDisalin = [], akanDihapus = [];
  for (var i = 0; i < data.length; i++) {
    var tgl = _normTgl(data[i][LH.COL.tanggal]);
    if (!tgl) continue;                                    // tanpa tanggal: lewati, JANGAN dihapus
    if (adaDiArsip[tgl]) {
      akanDihapus.push(start + i);                         // SUDAH ADA -> hapus saja
    } else if (tgl <= batas) {
      akanDisalin.push(data[i]);                           // SALIN UTUH 8 kolom (No ikut)
      akanDihapus.push(start + i);
      adaDiArsip[tgl] = true;                              // anti dobel dalam batch yg sama
    }
  }

  // 4) APPEND ke arsip (mulai kolom A) + VERIFIKASI baca balik Tanggal baris pertama
  if (!MIGRASI_DRY_RUN && akanDisalin.length) {
    var rowStart = _lastRowTglLapHarian_(shArsip) + 1;
    shArsip.getRange(rowStart, 1, akanDisalin.length, LEBAR).setValues(akanDisalin);
    SpreadsheetApp.flush();
    var cek = _normTgl(shArsip.getRange(rowStart, LH.COL.tanggal + 1).getValue());
    if (cek !== _normTgl(akanDisalin[0][LH.COL.tanggal])) {   // TANPA geser indeks (kolom A ikut disalin)
      throw new Error('Verifikasi append GAGAL — penghapusan dibatalkan utk batch ini.');
    }
  }

  // 5) HAPUS di aktif dari BAWAH ke ATAS
  if (!MIGRASI_DRY_RUN) {
    akanDihapus.sort(function (a, b) { return b - a; });
    for (var d = 0; d < akanDihapus.length; d++) shAktif.deleteRow(akanDihapus[d]);
    SpreadsheetApp.flush();
  }

  // 6) Cursor berikutnya (batch - jumlahDihapus)
  var nextStart = end + 1 - (MIGRASI_DRY_RUN ? 0 : akanDihapus.length);
  var done = nextStart > shAktif.getLastRow();
  if (done) props.deleteProperty(MIGRASI_CURSOR_PROP_LH);
  else props.setProperty(MIGRASI_CURSOR_PROP_LH, String(nextStart));

  Logger.log('[migrasiLapHarian] batch ' + start + '-' + end +
             ' | disalin=' + akanDisalin.length + ' | dihapus=' + akanDihapus.length +
             ' | next=' + (done ? 'SELESAI' : nextStart) + (MIGRASI_DRY_RUN ? ' [DRY RUN]' : ''));
  return { done: done, disalin: akanDisalin.length, dihapus: akanDihapus.length };
}

/* ===== TRIGGER LAP HARIAN: mulai / tick / berhenti ===== */
function mulaiMigrasiLapHarian() {
  PropertiesService.getScriptProperties().deleteProperty(MIGRASI_CURSOR_PROP_LH);
  var trs = ScriptApp.getProjectTriggers();
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === 'migrasiLapHarianTick') ScriptApp.deleteTrigger(trs[i]);
  ScriptApp.newTrigger('migrasiLapHarianTick').timeBased().everyMinutes(1).create();
  Logger.log('Migrasi Teknik_Laporan Harian DIMULAI (tiap 1 menit, batch ' + MIGRASI_BATCH + ').');
}

function migrasiLapHarianTick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    var r = migrasiLapHarianBatch();
    if (r && r.done) {
      var trs = ScriptApp.getProjectTriggers();
      for (var i = 0; i < trs.length; i++)
        if (trs[i].getHandlerFunction() === 'migrasiLapHarianTick') ScriptApp.deleteTrigger(trs[i]);
      Logger.log('Migrasi Teknik_Laporan Harian SELESAI -> trigger dilepas.');
    }
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

function hentikanMigrasiLapHarian() {
  var trs = ScriptApp.getProjectTriggers(), n = 0;
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === 'migrasiLapHarianTick') { ScriptApp.deleteTrigger(trs[i]); n++; }
  PropertiesService.getScriptProperties().deleteProperty(MIGRASI_CURSOR_PROP_LH);
  Logger.log('Migrasi Lap Harian dihentikan, ' + n + ' trigger dilepas, cursor direset.');
}

/* ===== MIGRASI 1 BARIS Teknik_Laporan Harian by Tanggal (uji coba / manual) =====
   Kunci = Tanggal (kolom B) — terima 'yyyy-MM-dd' atau format lain yg dikenali _normTgl.
   TIDAK mengecek kriteria H-2 — baris dipilih manual.
   Cara pakai: migrasiSatuBarisLapHarian('2026-08-01'); */
function migrasiSatuBarisLapHarian(tanggal) {
  var NAMA = LH.SHEET, LEBAR = 8;
  var key = _normTgl(tanggal);
  if (!key) return { ok: false, message: 'Tanggal tidak terbaca (pakai yyyy-MM-dd).' };

  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) return { ok: false, message: 'Sheet ' + NAMA + ' tidak ditemukan di salah satu file.' };

  // 1) Cek keberadaan tanggal di ARSIP
  var adaDiArsip = _tglIndexLapHarian_(shArsip)[key] === true;

  // 2) Cari nomor baris di AKTIF
  var rowNum = 0;
  if (shAktif.getLastRow() > 1) {
    var colAktif = shAktif.getRange(2, LH.COL.tanggal + 1, shAktif.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < colAktif.length; i++) {
      if (_normTgl(colAktif[i][0]) === key) { rowNum = i + 2; break; }
    }
  }
  if (!rowNum) {
    Logger.log('[migrasiSatuBarisLapHarian] "' + key + '" TIDAK ditemukan di file AKTIF — tidak ada yang diproses.');
    return { ok: true, mode: 'tidak-ada-di-aktif', tanggal: key, sudahDiArsip: adaDiArsip };
  }

  var mode;
  if (adaDiArsip) {
    mode = 'hapus-duplikat';
  } else {
    var rowData = shAktif.getRange(rowNum, 1, 1, LEBAR).getValues()[0];   // A..H utuh (No ikut)
    var rowBaru = _lastRowTglLapHarian_(shArsip) + 1;
    shArsip.getRange(rowBaru, 1, 1, LEBAR).setValues([rowData]);
    SpreadsheetApp.flush();
    var cek = _normTgl(shArsip.getRange(rowBaru, LH.COL.tanggal + 1).getValue());
    if (cek !== key) {
      throw new Error('Verifikasi append GAGAL utk ' + key + ' — baris di aktif TIDAK dihapus.');
    }
    mode = 'disalin';
  }

  // 3) Hapus baris di AKTIF
  shAktif.deleteRow(rowNum);
  SpreadsheetApp.flush();
  Logger.log('[migrasiSatuBarisLapHarian] ' + key + ' -> ' + mode + ' (baris aktif ' + rowNum + ' dihapus)');
  return { ok: true, mode: mode, tanggal: key, barisAktifDihapus: rowNum };
}

/* ===== PREVIEW Teknik_Laporan Harian (read-only, aman) ===== */
function previewMigrasiLapHarian() {
  var NAMA = LH.SHEET, LEBAR = 8;
  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) { Logger.log('Sheet ' + NAMA + ' tidak ditemukan di salah satu file.'); return; }

  var adaDiArsip = _tglIndexLapHarian_(shArsip);
  var batas = _migrasiBatasTanggal();
  var total = 0, pindah = 0, sudahAda = 0, tetap = 0, tanpaTgl = 0;
  var sampelPindah = [], sampelSudahAda = [], sampelTetap = [];
  var lastRow = shAktif.getLastRow();
  if (lastRow > 1) {
    var data = shAktif.getRange(2, 1, lastRow - 1, LEBAR).getValues();
    for (var i = 0; i < data.length; i++) {
      var tgl = _normTgl(data[i][LH.COL.tanggal]);
      if (!tgl) { tanpaTgl++; continue; }
      total++;
      if (adaDiArsip[tgl]) {
        sudahAda++;
        if (sampelSudahAda.length < 5) sampelSudahAda.push(tgl);
      } else if (tgl <= batas) {
        pindah++;
        if (sampelPindah.length < 5) sampelPindah.push(tgl);
      } else {
        tetap++;
        if (sampelTetap.length < 5) sampelTetap.push(tgl);
      }
    }
  }

  Logger.log('============ PREVIEW MIGRASI Teknik_Laporan Harian ============');
  Logger.log('Batas tanggal (H-' + MIGRASI_H_MINUS + '): ' + batas + ' — baris dgn Tanggal (kolom B) <= ' + batas + ' akan dipindah.');
  Logger.log('Total baris bertanggal di AKTIF       : ' + total);
  Logger.log('  > Akan DISALIN ke arsip lalu dihapus : ' + pindah + '  (contoh: ' + (sampelPindah.join(', ') || '-') + ')');
  Logger.log('  > SUDAH ADA di arsip (hanya dihapus) : ' + sudahAda + '  (contoh: ' + (sampelSudahAda.join(', ') || '-') + ')');
  Logger.log('  > TETAP di aktif (belum H-' + MIGRASI_H_MINUS + ')         : ' + tetap + '  (contoh: ' + (sampelTetap.join(', ') || '-') + ')');
  Logger.log('Baris tanpa tanggal terbaca (lewati): ' + tanpaTgl);
  Logger.log('Baris yang sudah ada di ARSIP       : ' + Object.keys(adaDiArsip).length);
  Logger.log('Deteksi hantu AKTIF : getLastRow=' + lastRow + ' vs baris terakhir bertanggal = ' + _lastRowTglLapHarian_(shAktif));
  Logger.log('Deteksi hantu ARSIP : getLastRow=' + shArsip.getLastRow() + ' vs baris terakhir bertanggal = ' + _lastRowTglLapHarian_(shArsip));
  Logger.log('==============================================================');
}

/* =====================================================
   BAGIAN 7: db_InsJar_Realisasi
   Mekanisme SAMA dgn ROW Realisasi, penyesuaian:
     - Kunci dedup/lookup = Kode Pekerjaan Penyulang (kolom C / COL_INS.REALISASI.kodePekerjaanPeny)
       — unik per baris (<KodeHeader>-PNY.nnn).
     - Kriteria tanggal = kolom E (Tanggal, R.tanggal) <= H-2. (Tanggal realisasi selalu
       = tanggal header-nya, jadi anak & induk termigrasi pada usia yg sama.)
     - Lebar 13 kolom (A..M); kolom A = formula No, TIDAK disalin (tulis B..M).
   Memakai COL_INS.REALISASI & SHEET_INS.REALISASI dari Code.gs (global scope).
   Catatan: sheet ini TIDAK punya jalur auto-create utk tanggal lama (tak ada sweep/ensure
   seperti ROW; _recalcRealisasiByKodePeny hanya MENGUPDATE baris yg ada) -> TIDAK butuh
   guard anti-duplikat tambahan.
   ===================================================== */

var MIGRASI_CURSOR_PROP_IJR = 'MIGRASI_INSJAR_RLZ_CURSOR';

function _lolosKriteriaMigrasiInsJarRlz(row) {
  var tgl = _normTgl(row[COL_INS.REALISASI.tanggal]);   // kolom E
  if (!tgl) return false;                               // tanggal kosong/rusak -> biarkan di aktif
  return tgl <= _migrasiBatasTanggal();
}

// Baris terakhir yg benar-benar berisi Kode Pekerjaan Penyulang (kolom C) — kebal baris hantu formula kolom A.
function _lastRowKodeInsJarRlz_(sh) {
  var last = sh.getLastRow();
  if (last < 2) return 1;
  var col = sh.getRange(2, COL_INS.REALISASI.kodePekerjaanPeny + 1, last - 1, 1).getValues();
  for (var i = col.length - 1; i >= 0; i--) {
    if (String(col[i][0] || '').trim() !== '') return i + 2;
  }
  return 1;
}

/* ===== 1 BATCH MIGRASI db_InsJar_Realisasi ===== */
function migrasiInsJarRlzBatch() {
  if (MIGRASI_DRY_RUN) Logger.log('⚠️ MODE SIMULASI (DRY RUN) AKTIF — tidak ada data yang disalin/dihapus. Set MIGRASI_DRY_RUN = false utk menjalankan sungguhan.');
  var R = COL_INS.REALISASI, LEBAR = R.timestamp + 1;   // 13 kolom (A..M); kolom A = formula No, TIDAK disalin
  var NAMA = SHEET_INS.REALISASI;                        // 'db_InsJar_Realisasi'
  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) throw new Error(NAMA + ' tidak ditemukan di salah satu file.');

  // 1) INDEX Kode Pekerjaan Penyulang yang SUDAH ada di arsip
  var adaDiArsip = {};
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, R.kodePekerjaanPeny + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      var ka = String(colArsip[a][0] || '').trim();
      if (ka) adaDiArsip[ka] = true;
    }
  }

  // 2) Baca batch baris AKTIF dari cursor
  var props = PropertiesService.getScriptProperties();
  var start = parseInt(props.getProperty(MIGRASI_CURSOR_PROP_IJR) || '2', 10);
  var lastRow = shAktif.getLastRow();
  if (start > lastRow) { props.deleteProperty(MIGRASI_CURSOR_PROP_IJR); return { done: true, disalin: 0, dihapus: 0 }; }
  var end = Math.min(start + MIGRASI_BATCH - 1, lastRow);
  var data = shAktif.getRange(start, 1, end - start + 1, LEBAR).getValues();

  // 3) Klasifikasi per mekanisme
  var akanDisalin = [], akanDihapus = [];
  for (var i = 0; i < data.length; i++) {
    var kode = String(data[i][R.kodePekerjaanPeny] || '').trim();
    if (!kode) continue;                                   // baris kosong: lewati, JANGAN dihapus
    if (adaDiArsip[kode]) {
      akanDihapus.push(start + i);                         // SUDAH ADA -> hapus saja
    } else if (_lolosKriteriaMigrasiInsJarRlz(data[i])) {
      akanDisalin.push(data[i].slice(1));                  // salin TANPA kolom A (formula No)
      akanDihapus.push(start + i);                         // setelah tersalin -> hapus di aktif
      adaDiArsip[kode] = true;                             // anti dobel dalam batch yg sama
    }
  }

  // 4) APPEND ke arsip + VERIFIKASI baca balik Kode Pekerjaan Penyulang baris pertama
  if (!MIGRASI_DRY_RUN && akanDisalin.length) {
    var rowStart = _lastRowKodeInsJarRlz_(shArsip) + 1;
    shArsip.getRange(rowStart, 2, akanDisalin.length, LEBAR - 1).setValues(akanDisalin);
    SpreadsheetApp.flush();
    var cek = String(shArsip.getRange(rowStart, R.kodePekerjaanPeny + 1).getValue() || '').trim();
    // akanDisalin = baris TANPA kolom A (slice(1)) -> Kode Pekerjaan Penyulang (kolom C, idx 2) bergeser ke idx 1 (= R.kodePekerjaanPeny - 1)
    if (cek !== String(akanDisalin[0][R.kodePekerjaanPeny - 1] || '').trim()) {
      throw new Error('Verifikasi append GAGAL — penghapusan dibatalkan utk batch ini.');
    }
  }

  // 5) HAPUS di aktif dari BAWAH ke ATAS
  if (!MIGRASI_DRY_RUN) {
    akanDihapus.sort(function (a, b) { return b - a; });
    for (var d = 0; d < akanDihapus.length; d++) shAktif.deleteRow(akanDihapus[d]);
    SpreadsheetApp.flush();
  }

  // 6) Cursor berikutnya (batch - jumlahDihapus)
  var nextStart = end + 1 - (MIGRASI_DRY_RUN ? 0 : akanDihapus.length);
  var done = nextStart > shAktif.getLastRow();
  if (done) props.deleteProperty(MIGRASI_CURSOR_PROP_IJR);
  else props.setProperty(MIGRASI_CURSOR_PROP_IJR, String(nextStart));

  Logger.log('[migrasiInsJarRlz] batch ' + start + '-' + end +
             ' | disalin=' + akanDisalin.length + ' | dihapus=' + akanDihapus.length +
             ' | next=' + (done ? 'SELESAI' : nextStart) + (MIGRASI_DRY_RUN ? ' [DRY RUN]' : ''));
  return { done: done, disalin: akanDisalin.length, dihapus: akanDihapus.length };
}

/* ===== TRIGGER INSJAR REALISASI: mulai / tick / berhenti ===== */
function mulaiMigrasiInsJarRlz() {
  PropertiesService.getScriptProperties().deleteProperty(MIGRASI_CURSOR_PROP_IJR);
  var trs = ScriptApp.getProjectTriggers();
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === 'migrasiInsJarRlzTick') ScriptApp.deleteTrigger(trs[i]);
  ScriptApp.newTrigger('migrasiInsJarRlzTick').timeBased().everyMinutes(1).create();
  Logger.log('Migrasi db_InsJar_Realisasi DIMULAI (tiap 1 menit, batch ' + MIGRASI_BATCH + ').');
}

function migrasiInsJarRlzTick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    var r = migrasiInsJarRlzBatch();
    if (r && r.done) {
      var trs = ScriptApp.getProjectTriggers();
      for (var i = 0; i < trs.length; i++)
        if (trs[i].getHandlerFunction() === 'migrasiInsJarRlzTick') ScriptApp.deleteTrigger(trs[i]);
      Logger.log('Migrasi db_InsJar_Realisasi SELESAI -> trigger dilepas.');
    }
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

function hentikanMigrasiInsJarRlz() {
  var trs = ScriptApp.getProjectTriggers(), n = 0;
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === 'migrasiInsJarRlzTick') { ScriptApp.deleteTrigger(trs[i]); n++; }
  PropertiesService.getScriptProperties().deleteProperty(MIGRASI_CURSOR_PROP_IJR);
  Logger.log('Migrasi InsJar Realisasi dihentikan, ' + n + ' trigger dilepas, cursor direset.');
}

/* ===== MIGRASI 1 BARIS db_InsJar_Realisasi by Kode Pekerjaan Penyulang (uji coba / manual) =====
   Alur sama dgn versi sebelumnya, kunci = Kode Pekerjaan Penyulang (kolom C).
   TIDAK mengecek kriteria H-2 — baris dipilih manual.
   Cara pakai: migrasiSatuBarisInsJarRlz('<Kode Pekerjaan Penyulang persis dari kolom C>'); */
function migrasiSatuBarisInsJarRlz(kodePekerjaanPeny) {
  var R = COL_INS.REALISASI, LEBAR = R.timestamp + 1, NAMA = SHEET_INS.REALISASI;
  var key = String(kodePekerjaanPeny || '').trim();
  if (!key) return { ok: false, message: 'Kode Pekerjaan Penyulang wajib diisi.' };

  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) return { ok: false, message: 'Sheet ' + NAMA + ' tidak ditemukan di salah satu file.' };

  // 1) Cek keberadaan di ARSIP
  var adaDiArsip = false;
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, R.kodePekerjaanPeny + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      if (String(colArsip[a][0] || '').trim() === key) { adaDiArsip = true; break; }
    }
  }

  // 2) Cari nomor baris di AKTIF
  var rowNum = -1;
  if (shAktif.getLastRow() > 1) {
    var colAktif = shAktif.getRange(2, R.kodePekerjaanPeny + 1, shAktif.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < colAktif.length; i++) {
      if (String(colAktif[i][0] || '').trim() === key) { rowNum = i + 2; break; }
    }
  }
  if (rowNum < 0) {
    Logger.log('[migrasiSatuBarisInsJarRlz] "' + key + '" TIDAK ditemukan di file AKTIF — tidak ada yang diproses. Ambil nilai persis dari kolom C db_InsJar_Realisasi.');
    return { ok: true, mode: 'tidak-ada-di-aktif', kodePekerjaanPeny: key, sudahDiArsip: adaDiArsip };
  }

  var mode;
  if (adaDiArsip) {
    mode = 'hapus-duplikat';
  } else {
    var rowData = shAktif.getRange(rowNum, 1, 1, LEBAR).getValues()[0].slice(1);   // B..M (tanpa kolom A)
    var rowBaru = _lastRowKodeInsJarRlz_(shArsip) + 1;
    shArsip.getRange(rowBaru, 2, 1, LEBAR - 1).setValues([rowData]);
    SpreadsheetApp.flush();
    var cek = String(shArsip.getRange(rowBaru, R.kodePekerjaanPeny + 1).getValue() || '').trim();
    if (cek !== key) {
      throw new Error('Verifikasi append GAGAL utk ' + key + ' — baris di aktif TIDAK dihapus.');
    }
    mode = 'disalin';
  }

  // 3) Hapus baris di AKTIF
  shAktif.deleteRow(rowNum);
  SpreadsheetApp.flush();
  Logger.log('[migrasiSatuBarisInsJarRlz] ' + key + ' -> ' + mode + ' (baris aktif ' + rowNum + ' dihapus)');
  return { ok: true, mode: mode, kodePekerjaanPeny: key, barisAktifDihapus: rowNum };
}

/* ===== PREVIEW db_InsJar_Realisasi (read-only, aman) ===== */
function previewMigrasiInsJarRlz() {
  var R = COL_INS.REALISASI, LEBAR = R.timestamp + 1, NAMA = SHEET_INS.REALISASI;
  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) { Logger.log('Sheet ' + NAMA + ' tidak ditemukan di salah satu file.'); return; }

  var adaDiArsip = {};
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, R.kodePekerjaanPeny + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      var ka = String(colArsip[a][0] || '').trim();
      if (ka) adaDiArsip[ka] = true;
    }
  }

  var batas = _migrasiBatasTanggal();
  var total = 0, pindah = 0, sudahAda = 0, tetap = 0, tanpaKode = 0;
  var sampelPindah = [], sampelSudahAda = [], sampelTetap = [];
  var lastRow = shAktif.getLastRow();
  if (lastRow > 1) {
    var data = shAktif.getRange(2, 1, lastRow - 1, LEBAR).getValues();
    for (var i = 0; i < data.length; i++) {
      var kode = String(data[i][R.kodePekerjaanPeny] || '').trim();
      if (!kode) { tanpaKode++; continue; }
      total++;
      var label = kode + ' (' + _normTgl(data[i][R.tanggal]) + ' | ' + (String(data[i][R.penyulang] || '').trim() || '-') + ')';
      if (adaDiArsip[kode]) {
        sudahAda++;
        if (sampelSudahAda.length < 5) sampelSudahAda.push(label);
      } else if (_lolosKriteriaMigrasiInsJarRlz(data[i])) {
        pindah++;
        if (sampelPindah.length < 5) sampelPindah.push(label);
      } else {
        tetap++;
        if (sampelTetap.length < 5) sampelTetap.push(label);
      }
    }
  }

  Logger.log('================ PREVIEW MIGRASI db_InsJar_Realisasi ================');
  Logger.log('Batas tanggal (H-' + MIGRASI_H_MINUS + '): ' + batas + ' — baris dgn Tanggal (kolom E) <= ' + batas + ' akan dipindah.');
  Logger.log('Total baris ber-Kode Pekerjaan Penyulang di AKTIF : ' + total);
  Logger.log('  > Akan DISALIN ke arsip lalu dihapus : ' + pindah);
  Logger.log('      contoh: ' + (sampelPindah.join(', ') || '-'));
  Logger.log('  > SUDAH ADA di arsip (hanya dihapus) : ' + sudahAda);
  Logger.log('      contoh: ' + (sampelSudahAda.join(', ') || '-'));
  Logger.log('  > TETAP di aktif (belum H-' + MIGRASI_H_MINUS + ')         : ' + tetap);
  Logger.log('      contoh: ' + (sampelTetap.join(', ') || '-'));
  Logger.log('Baris tanpa Kode Pekerjaan Penyulang (dilewati) : ' + tanpaKode);
  Logger.log('Baris yang sudah ada di ARSIP                   : ' + Object.keys(adaDiArsip).length);
  Logger.log('Deteksi hantu AKTIF : getLastRow=' + lastRow + ' vs baris terakhir berisi Kode = ' + _lastRowKodeInsJarRlz_(shAktif));
  Logger.log('Deteksi hantu ARSIP : getLastRow=' + shArsip.getLastRow() + ' vs baris terakhir berisi Kode = ' + _lastRowKodeInsJarRlz_(shArsip));
  Logger.log('==================================================================');
}

/* =====================================================
   BAGIAN 8: db_InsDu_Realisasi (Inspeksi Gardu)
   Mekanisme SAMA dgn InsJar Realisasi (BAGIAN 7), penyesuaian:
     - Kunci dedup/lookup = Kode Pekerjaan Gardu (kolom C /
       COL_INSDU.REALISASI.kodePekerjaanGardu) — unik per baris
       (format <KodeHeader>-GDU.<nnn>; 1 baris = 1 gardu).
     - Kriteria: Tanggal (kolom E, COL_INSDU.REALISASI.tanggal) <= H-2 —
       tanggal realisasi selalu = tanggal header-nya, jadi anak & induk
       termigrasi pada usia yang sama.
     - Lebar 12 kolom (A..L); kolom A (No, formula) TIDAK disalin (tulis B..L,
       sama dgn pola simpanRealisasiInsGardu).
   Memakai SHEET_INSDU_REALISASI & COL_INSDU dari Tek-InsDu.gs (global scope).
   ===================================================== */

var MIGRASI_CURSOR_PROP_IDR = 'MIGRASI_INSDU_RLZ_CURSOR';

function _lolosKriteriaMigrasiInsDuRlz(row) {
  var tgl = _normTgl(row[COL_INSDU.REALISASI.tanggal]);   // kolom E
  if (!tgl) return false;                          // tanggal kosong/rusak -> biarkan di aktif
  return tgl <= _migrasiBatasTanggal();
}

// Baris terakhir yg benar-benar berisi Kode Pekerjaan Gardu (kolom C) — kebal baris hantu formula kolom A.
function _lastRowKodeInsDuRlz_(sh) {
  var last = sh.getLastRow();
  if (last < 2) return 1;
  var col = sh.getRange(2, COL_INSDU.REALISASI.kodePekerjaanGardu + 1, last - 1, 1).getValues();
  for (var i = col.length - 1; i >= 0; i--) {
    if (String(col[i][0] || '').trim() !== '') return i + 2;
  }
  return 1;
}

/* ===== 1 BATCH MIGRASI db_InsDu_Realisasi ===== */
function migrasiInsDuRlzBatch() {
  if (MIGRASI_DRY_RUN) Logger.log('⚠️ MODE SIMULASI (DRY RUN) AKTIF — tidak ada data yang disalin/dihapus. Set MIGRASI_DRY_RUN = false utk menjalankan sungguhan.');
  var R = COL_INSDU.REALISASI, LEBAR = R.timestamp + 1;   // 12 kolom (A..L); kolom A = formula No, TIDAK disalin
  var NAMA = SHEET_INSDU_REALISASI;                        // 'db_InsDu_Realisasi'
  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) throw new Error(NAMA + ' tidak ditemukan di salah satu file.');

  // 1) INDEX Kode Pekerjaan Gardu yang SUDAH ada di arsip
  var adaDiArsip = {};
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, R.kodePekerjaanGardu + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      var ka = String(colArsip[a][0] || '').trim();
      if (ka) adaDiArsip[ka] = true;
    }
  }

  // 2) Baca batch baris AKTIF dari cursor
  var props = PropertiesService.getScriptProperties();
  var start = parseInt(props.getProperty(MIGRASI_CURSOR_PROP_IDR) || '2', 10);
  var lastRow = shAktif.getLastRow();
  if (start > lastRow) { props.deleteProperty(MIGRASI_CURSOR_PROP_IDR); return { done: true, disalin: 0, dihapus: 0 }; }
  var end = Math.min(start + MIGRASI_BATCH - 1, lastRow);
  var data = shAktif.getRange(start, 1, end - start + 1, LEBAR).getValues();

  // 3) Klasifikasi per mekanisme
  var akanDisalin = [], akanDihapus = [];
  for (var i = 0; i < data.length; i++) {
    var kode = String(data[i][R.kodePekerjaanGardu] || '').trim();
    if (!kode) continue;                                   // baris kosong: lewati, JANGAN dihapus
    if (adaDiArsip[kode]) {
      akanDihapus.push(start + i);                         // SUDAH ADA -> hapus saja
    } else if (_lolosKriteriaMigrasiInsDuRlz(data[i])) {
      akanDisalin.push(data[i].slice(1));                  // salin TANPA kolom A (formula No)
      akanDihapus.push(start + i);                         // setelah tersalin -> hapus di aktif
      adaDiArsip[kode] = true;                             // anti dobel dalam batch yg sama
    }
  }

  // 4) APPEND ke arsip + VERIFIKASI baca balik Kode Pekerjaan Gardu baris pertama
  if (!MIGRASI_DRY_RUN && akanDisalin.length) {
    var rowStart = _lastRowKodeInsDuRlz_(shArsip) + 1;
    shArsip.getRange(rowStart, 2, akanDisalin.length, LEBAR - 1).setValues(akanDisalin);
    SpreadsheetApp.flush();
    var cek = String(shArsip.getRange(rowStart, R.kodePekerjaanGardu + 1).getValue() || '').trim();
    // akanDisalin = baris TANPA kolom A (slice(1)) -> Kode Pekerjaan Gardu (kolom C, idx 2) bergeser ke idx 1 (= R.kodePekerjaanGardu - 1)
    if (cek !== String(akanDisalin[0][R.kodePekerjaanGardu - 1] || '').trim()) {
      throw new Error('Verifikasi append GAGAL — penghapusan dibatalkan utk batch ini.');
    }
  }

  // 5) HAPUS di aktif dari BAWAH ke ATAS
  if (!MIGRASI_DRY_RUN) {
    akanDihapus.sort(function (a, b) { return b - a; });
    for (var d = 0; d < akanDihapus.length; d++) shAktif.deleteRow(akanDihapus[d]);
    SpreadsheetApp.flush();
  }

  // 6) Cursor berikutnya (batch - jumlahDihapus)
  var nextStart = end + 1 - (MIGRASI_DRY_RUN ? 0 : akanDihapus.length);
  var done = nextStart > shAktif.getLastRow();
  if (done) props.deleteProperty(MIGRASI_CURSOR_PROP_IDR);
  else props.setProperty(MIGRASI_CURSOR_PROP_IDR, String(nextStart));

  Logger.log('[migrasiInsDuRlz] batch ' + start + '-' + end +
             ' | disalin=' + akanDisalin.length + ' | dihapus=' + akanDihapus.length +
             ' | next=' + (done ? 'SELESAI' : nextStart) + (MIGRASI_DRY_RUN ? ' [DRY RUN]' : ''));
  return { done: done, disalin: akanDisalin.length, dihapus: akanDihapus.length };
}

/* ===== TRIGGER INSDU REALISASI: mulai / tick / berhenti ===== */
function mulaiMigrasiInsDuRlz() {
  PropertiesService.getScriptProperties().deleteProperty(MIGRASI_CURSOR_PROP_IDR);
  var trs = ScriptApp.getProjectTriggers();
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === 'migrasiInsDuRlzTick') ScriptApp.deleteTrigger(trs[i]);
  ScriptApp.newTrigger('migrasiInsDuRlzTick').timeBased().everyMinutes(1).create();
  Logger.log('Migrasi db_InsDu_Realisasi DIMULAI (tiap 1 menit, batch ' + MIGRASI_BATCH + ').');
}

function migrasiInsDuRlzTick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    var r = migrasiInsDuRlzBatch();
    if (r && r.done) {
      var trs = ScriptApp.getProjectTriggers();
      for (var i = 0; i < trs.length; i++)
        if (trs[i].getHandlerFunction() === 'migrasiInsDuRlzTick') ScriptApp.deleteTrigger(trs[i]);
      Logger.log('Migrasi db_InsDu_Realisasi SELESAI -> trigger dilepas.');
    }
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

function hentikanMigrasiInsDuRlz() {
  var trs = ScriptApp.getProjectTriggers(), n = 0;
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === 'migrasiInsDuRlzTick') { ScriptApp.deleteTrigger(trs[i]); n++; }
  PropertiesService.getScriptProperties().deleteProperty(MIGRASI_CURSOR_PROP_IDR);
  Logger.log('Migrasi InsDu Realisasi dihentikan, ' + n + ' trigger dilepas, cursor direset.');
}

/* ===== MIGRASI 1 BARIS db_InsDu_Realisasi by Kode Pekerjaan Gardu (uji coba / manual) =====
   Alur sama dgn versi sebelumnya, kunci = Kode Pekerjaan Gardu (kolom C).
   TIDAK mengecek kriteria H-2 — baris dipilih manual.
   Cara pakai: migrasiSatuBarisInsDuRlz('<Kode Pekerjaan Gardu persis dari kolom C>'); */
function migrasiSatuBarisInsDuRlz(kodePekerjaanGardu) {
  var R = COL_INSDU.REALISASI, LEBAR = R.timestamp + 1, NAMA = SHEET_INSDU_REALISASI;
  var key = String(kodePekerjaanGardu || '').trim();
  if (!key) return { ok: false, message: 'Kode Pekerjaan Gardu wajib diisi.' };

  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) return { ok: false, message: 'Sheet ' + NAMA + ' tidak ditemukan di salah satu file.' };

  // 1) Cek keberadaan di ARSIP
  var adaDiArsip = false;
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, R.kodePekerjaanGardu + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      if (String(colArsip[a][0] || '').trim() === key) { adaDiArsip = true; break; }
    }
  }

  // 2) Cari nomor baris di AKTIF
  var rowNum = -1;
  if (shAktif.getLastRow() > 1) {
    var colAktif = shAktif.getRange(2, R.kodePekerjaanGardu + 1, shAktif.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < colAktif.length; i++) {
      if (String(colAktif[i][0] || '').trim() === key) { rowNum = i + 2; break; }
    }
  }
  if (rowNum < 0) {
    Logger.log('[migrasiSatuBarisInsDuRlz] "' + key + '" TIDAK ditemukan di file AKTIF — tidak ada yang diproses. Ambil nilai persis dari kolom C db_InsDu_Realisasi.');
    return { ok: true, mode: 'tidak-ada-di-aktif', kodePekerjaanGardu: key, sudahDiArsip: adaDiArsip };
  }

  var mode;
  if (adaDiArsip) {
    mode = 'hapus-duplikat';
  } else {
    var rowData = shAktif.getRange(rowNum, 1, 1, LEBAR).getValues()[0].slice(1);   // B..L (tanpa kolom A)
    var rowBaru = _lastRowKodeInsDuRlz_(shArsip) + 1;
    shArsip.getRange(rowBaru, 2, 1, LEBAR - 1).setValues([rowData]);
    SpreadsheetApp.flush();
    var cek = String(shArsip.getRange(rowBaru, R.kodePekerjaanGardu + 1).getValue() || '').trim();
    if (cek !== key) {
      throw new Error('Verifikasi append GAGAL utk ' + key + ' — baris di aktif TIDAK dihapus.');
    }
    mode = 'disalin';
  }

  // 3) Hapus baris di AKTIF
  shAktif.deleteRow(rowNum);
  SpreadsheetApp.flush();
  Logger.log('[migrasiSatuBarisInsDuRlz] ' + key + ' -> ' + mode + ' (baris aktif ' + rowNum + ' dihapus)');
  return { ok: true, mode: mode, kodePekerjaanGardu: key, barisAktifDihapus: rowNum };
}

/* ===== PREVIEW db_InsDu_Realisasi (read-only, aman) ===== */
function previewMigrasiInsDuRlz() {
  var R = COL_INSDU.REALISASI, LEBAR = R.timestamp + 1, NAMA = SHEET_INSDU_REALISASI;
  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) { Logger.log('Sheet ' + NAMA + ' tidak ditemukan di salah satu file.'); return; }

  var adaDiArsip = {};
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, R.kodePekerjaanGardu + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      var ka = String(colArsip[a][0] || '').trim();
      if (ka) adaDiArsip[ka] = true;
    }
  }

  var batas = _migrasiBatasTanggal();
  var total = 0, pindah = 0, sudahAda = 0, tetap = 0, tanpaKode = 0;
  var sampelPindah = [], sampelSudahAda = [], sampelTetap = [];
  var lastRow = shAktif.getLastRow();
  if (lastRow > 1) {
    var data = shAktif.getRange(2, 1, lastRow - 1, LEBAR).getValues();
    for (var i = 0; i < data.length; i++) {
      var kode = String(data[i][R.kodePekerjaanGardu] || '').trim();
      if (!kode) { tanpaKode++; continue; }
      total++;
      var label = kode + ' (' + _normTgl(data[i][R.tanggal]) + ' | ' + String(data[i][R.nomorGardu] || '').trim() + ')';
      if (adaDiArsip[kode]) {
        sudahAda++;
        if (sampelSudahAda.length < 5) sampelSudahAda.push(label);
      } else if (_lolosKriteriaMigrasiInsDuRlz(data[i])) {
        pindah++;
        if (sampelPindah.length < 5) sampelPindah.push(label);
      } else {
        tetap++;
        if (sampelTetap.length < 5) sampelTetap.push(label);
      }
    }
  }

  Logger.log('================ PREVIEW MIGRASI db_InsDu_Realisasi ================');
  Logger.log('Batas tanggal (H-' + MIGRASI_H_MINUS + '): ' + batas + ' — baris dgn Tanggal (kolom E) <= ' + batas + ' akan dipindah.');
  Logger.log('Total baris ber-Kode Pekerjaan Gardu di AKTIF : ' + total);
  Logger.log('  > Akan DISALIN ke arsip lalu dihapus : ' + pindah);
  Logger.log('      contoh: ' + (sampelPindah.join(', ') || '-'));
  Logger.log('  > SUDAH ADA di arsip (hanya dihapus) : ' + sudahAda);
  Logger.log('      contoh: ' + (sampelSudahAda.join(', ') || '-'));
  Logger.log('  > TETAP di aktif (belum H-' + MIGRASI_H_MINUS + ')         : ' + tetap);
  Logger.log('      contoh: ' + (sampelTetap.join(', ') || '-'));
  Logger.log('Baris tanpa Kode Pekerjaan Gardu (dilewati) : ' + tanpaKode);
  Logger.log('Baris yang sudah ada di ARSIP             : ' + Object.keys(adaDiArsip).length);
  Logger.log('Deteksi hantu AKTIF : getLastRow=' + lastRow + ' vs baris terakhir berisi Kode = ' + _lastRowKodeInsDuRlz_(shAktif));
  Logger.log('Deteksi hantu ARSIP : getLastRow=' + shArsip.getLastRow() + ' vs baris terakhir berisi Kode = ' + _lastRowKodeInsDuRlz_(shArsip));
  Logger.log('==================================================================');
}

/* =====================================================
   BAGIAN 9: db_Hartek_PenyulangGardu (Hartek tier-2)
   Mekanisme SAMA dgn InsJar/InsDu Realisasi (BAGIAN 7 & 8), penyesuaian:
     - Kunci dedup/lookup = Kode PG (kolom C / COL_HTK.PG.kodePG) — unik per
       baris (format <Header>-PNY.<nnn> / -GRD.<nnn> / -NTK.<nnn>).
     - Kriteria: Tanggal (kolom F, COL_HTK.PG.tanggal) <= H-2.
       PERINGATAN: kolom E di sheet ini adalah HARI, BUKAN tanggal!
       Tanggal diisi bot prosesHartekPG dari header -> anak & induk
       termigrasi pada usia yang sama.
     - Lebar 15 kolom (A..O); kolom A (No, formula) TIDAK disalin (tulis B..O).
   Memakai SHEET_HTK & COL_HTK dari Tek-Hartek-Code.gs (global scope).
   ===================================================== */

var MIGRASI_CURSOR_PROP_HPG = 'MIGRASI_HARTEK_PG_CURSOR';

function _lolosKriteriaMigrasiHartekPG(row) {
  var tgl = _normTgl(row[COL_HTK.PG.tanggal]);     // kolom F (BUKAN kolom E — itu Hari)
  if (!tgl) return false;                          // tanggal kosong/rusak -> biarkan di aktif
  return tgl <= _migrasiBatasTanggal();
}

// Baris terakhir yg benar-benar berisi Kode PG (kolom C) — kebal baris hantu formula kolom A.
function _lastRowKodeHartekPG_(sh) {
  var last = sh.getLastRow();
  if (last < 2) return 1;
  var col = sh.getRange(2, COL_HTK.PG.kodePG + 1, last - 1, 1).getValues();
  for (var i = col.length - 1; i >= 0; i--) {
    if (String(col[i][0] || '').trim() !== '') return i + 2;
  }
  return 1;
}

/* ===== 1 BATCH MIGRASI db_Hartek_PenyulangGardu ===== */
function migrasiHartekPGBatch() {
  if (MIGRASI_DRY_RUN) Logger.log('⚠️ MODE SIMULASI (DRY RUN) AKTIF — tidak ada data yang disalin/dihapus. Set MIGRASI_DRY_RUN = false utk menjalankan sungguhan.');
  var R = COL_HTK.PG, LEBAR = R.timeStamp + 1;      // 15 kolom (A..O); kolom A = formula No, TIDAK disalin
  var NAMA = SHEET_HTK.PG;                           // 'db_Hartek_PenyulangGardu'
  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) throw new Error(NAMA + ' tidak ditemukan di salah satu file.');

  // 1) INDEX Kode PG yang SUDAH ada di arsip
  var adaDiArsip = {};
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, R.kodePG + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      var ka = String(colArsip[a][0] || '').trim();
      if (ka) adaDiArsip[ka] = true;
    }
  }

  // 2) Baca batch baris AKTIF dari cursor
  var props = PropertiesService.getScriptProperties();
  var start = parseInt(props.getProperty(MIGRASI_CURSOR_PROP_HPG) || '2', 10);
  var lastRow = shAktif.getLastRow();
  if (start > lastRow) { props.deleteProperty(MIGRASI_CURSOR_PROP_HPG); return { done: true, disalin: 0, dihapus: 0 }; }
  var end = Math.min(start + MIGRASI_BATCH - 1, lastRow);
  var data = shAktif.getRange(start, 1, end - start + 1, LEBAR).getValues();

  // 3) Klasifikasi per mekanisme
  var akanDisalin = [], akanDihapus = [];
  for (var i = 0; i < data.length; i++) {
    var kode = String(data[i][R.kodePG] || '').trim();
    if (!kode) continue;                                   // baris kosong: lewati, JANGAN dihapus
    if (adaDiArsip[kode]) {
      akanDihapus.push(start + i);                         // SUDAH ADA -> hapus saja
    } else if (_lolosKriteriaMigrasiHartekPG(data[i])) {
      akanDisalin.push(data[i].slice(1));                  // salin TANPA kolom A (formula No)
      akanDihapus.push(start + i);                         // setelah tersalin -> hapus di aktif
      adaDiArsip[kode] = true;                             // anti dobel dalam batch yg sama
    }
  }

  // 4) APPEND ke arsip + VERIFIKASI baca balik Kode PG baris pertama
  if (!MIGRASI_DRY_RUN && akanDisalin.length) {
    var rowStart = _lastRowKodeHartekPG_(shArsip) + 1;
    shArsip.getRange(rowStart, 2, akanDisalin.length, LEBAR - 1).setValues(akanDisalin);
    SpreadsheetApp.flush();
    var cek = String(shArsip.getRange(rowStart, R.kodePG + 1).getValue() || '').trim();
    // akanDisalin = baris TANPA kolom A (slice(1)) -> Kode PG (kolom C, idx 2) bergeser ke idx 1 (= R.kodePG - 1)
    if (cek !== String(akanDisalin[0][R.kodePG - 1] || '').trim()) {
      throw new Error('Verifikasi append GAGAL — penghapusan dibatalkan utk batch ini.');
    }
  }

  // 5) HAPUS di aktif dari BAWAH ke ATAS
  if (!MIGRASI_DRY_RUN) {
    akanDihapus.sort(function (a, b) { return b - a; });
    for (var d = 0; d < akanDihapus.length; d++) shAktif.deleteRow(akanDihapus[d]);
    SpreadsheetApp.flush();
  }

  // 6) Cursor berikutnya (batch - jumlahDihapus)
  var nextStart = end + 1 - (MIGRASI_DRY_RUN ? 0 : akanDihapus.length);
  var done = nextStart > shAktif.getLastRow();
  if (done) props.deleteProperty(MIGRASI_CURSOR_PROP_HPG);
  else props.setProperty(MIGRASI_CURSOR_PROP_HPG, String(nextStart));

  Logger.log('[migrasiHartekPG] batch ' + start + '-' + end +
             ' | disalin=' + akanDisalin.length + ' | dihapus=' + akanDihapus.length +
             ' | next=' + (done ? 'SELESAI' : nextStart) + (MIGRASI_DRY_RUN ? ' [DRY RUN]' : ''));
  return { done: done, disalin: akanDisalin.length, dihapus: akanDihapus.length };
}

/* ===== TRIGGER HARTEK PG: mulai / tick / berhenti ===== */
function mulaiMigrasiHartekPG() {
  PropertiesService.getScriptProperties().deleteProperty(MIGRASI_CURSOR_PROP_HPG);
  var trs = ScriptApp.getProjectTriggers();
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === 'migrasiHartekPGTick') ScriptApp.deleteTrigger(trs[i]);
  ScriptApp.newTrigger('migrasiHartekPGTick').timeBased().everyMinutes(1).create();
  Logger.log('Migrasi db_Hartek_PenyulangGardu DIMULAI (tiap 1 menit, batch ' + MIGRASI_BATCH + ').');
}

function migrasiHartekPGTick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    var r = migrasiHartekPGBatch();
    if (r && r.done) {
      var trs = ScriptApp.getProjectTriggers();
      for (var i = 0; i < trs.length; i++)
        if (trs[i].getHandlerFunction() === 'migrasiHartekPGTick') ScriptApp.deleteTrigger(trs[i]);
      Logger.log('Migrasi db_Hartek_PenyulangGardu SELESAI -> trigger dilepas.');
    }
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

function hentikanMigrasiHartekPG() {
  var trs = ScriptApp.getProjectTriggers(), n = 0;
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === 'migrasiHartekPGTick') { ScriptApp.deleteTrigger(trs[i]); n++; }
  PropertiesService.getScriptProperties().deleteProperty(MIGRASI_CURSOR_PROP_HPG);
  Logger.log('Migrasi Hartek PenyulangGardu dihentikan, ' + n + ' trigger dilepas, cursor direset.');
}

/* ===== MIGRASI 1 BARIS db_Hartek_PenyulangGardu by Kode PG (uji coba / manual) =====
   Alur sama dgn versi sebelumnya, kunci = Kode PG (kolom C).
   TIDAK mengecek kriteria H-2 — baris dipilih manual.
   Cara pakai: migrasiSatuBarisHartekPG('<Kode PG persis dari kolom C>'); */
function migrasiSatuBarisHartekPG(kodePG) {
  var R = COL_HTK.PG, LEBAR = R.timeStamp + 1, NAMA = SHEET_HTK.PG;
  var key = String(kodePG || '').trim();
  if (!key) return { ok: false, message: 'Kode PG wajib diisi.' };

  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) return { ok: false, message: 'Sheet ' + NAMA + ' tidak ditemukan di salah satu file.' };

  // 1) Cek keberadaan di ARSIP
  var adaDiArsip = false;
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, R.kodePG + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      if (String(colArsip[a][0] || '').trim() === key) { adaDiArsip = true; break; }
    }
  }

  // 2) Cari nomor baris di AKTIF
  var rowNum = -1;
  if (shAktif.getLastRow() > 1) {
    var colAktif = shAktif.getRange(2, R.kodePG + 1, shAktif.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < colAktif.length; i++) {
      if (String(colAktif[i][0] || '').trim() === key) { rowNum = i + 2; break; }
    }
  }
  if (rowNum < 0) {
    Logger.log('[migrasiSatuBarisHartekPG] "' + key + '" TIDAK ditemukan di file AKTIF — tidak ada yang diproses. Ambil nilai persis dari kolom C db_Hartek_PenyulangGardu.');
    return { ok: true, mode: 'tidak-ada-di-aktif', kodePG: key, sudahDiArsip: adaDiArsip };
  }

  var mode;
  if (adaDiArsip) {
    mode = 'hapus-duplikat';
  } else {
    var rowData = shAktif.getRange(rowNum, 1, 1, LEBAR).getValues()[0].slice(1);   // B..O (tanpa kolom A)
    var rowBaru = _lastRowKodeHartekPG_(shArsip) + 1;
    shArsip.getRange(rowBaru, 2, 1, LEBAR - 1).setValues([rowData]);
    SpreadsheetApp.flush();
    var cek = String(shArsip.getRange(rowBaru, R.kodePG + 1).getValue() || '').trim();
    if (cek !== key) {
      throw new Error('Verifikasi append GAGAL utk ' + key + ' — baris di aktif TIDAK dihapus.');
    }
    mode = 'disalin';
  }

  // 3) Hapus baris di AKTIF
  shAktif.deleteRow(rowNum);
  SpreadsheetApp.flush();
  Logger.log('[migrasiSatuBarisHartekPG] ' + key + ' -> ' + mode + ' (baris aktif ' + rowNum + ' dihapus)');
  return { ok: true, mode: mode, kodePG: key, barisAktifDihapus: rowNum };
}

/* ===== PREVIEW db_Hartek_PenyulangGardu (read-only, aman) ===== */
function previewMigrasiHartekPG() {
  var R = COL_HTK.PG, LEBAR = R.timeStamp + 1, NAMA = SHEET_HTK.PG;
  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) { Logger.log('Sheet ' + NAMA + ' tidak ditemukan di salah satu file.'); return; }

  var adaDiArsip = {};
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, R.kodePG + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      var ka = String(colArsip[a][0] || '').trim();
      if (ka) adaDiArsip[ka] = true;
    }
  }

  var batas = _migrasiBatasTanggal();
  var total = 0, pindah = 0, sudahAda = 0, tetap = 0, tanpaKode = 0;
  var sampelPindah = [], sampelSudahAda = [], sampelTetap = [];
  var lastRow = shAktif.getLastRow();
  if (lastRow > 1) {
    var data = shAktif.getRange(2, 1, lastRow - 1, LEBAR).getValues();
    for (var i = 0; i < data.length; i++) {
      var kode = String(data[i][R.kodePG] || '').trim();
      if (!kode) { tanpaKode++; continue; }
      total++;
      var label = kode + ' (' + _normTgl(data[i][R.tanggal]) + ' | ' + (String(data[i][R.penyulang] || '').trim() || String(data[i][R.gardu] || '').trim() || '-') + ')';
      if (adaDiArsip[kode]) {
        sudahAda++;
        if (sampelSudahAda.length < 5) sampelSudahAda.push(label);
      } else if (_lolosKriteriaMigrasiHartekPG(data[i])) {
        pindah++;
        if (sampelPindah.length < 5) sampelPindah.push(label);
      } else {
        tetap++;
        if (sampelTetap.length < 5) sampelTetap.push(label);
      }
    }
  }

  Logger.log('================ PREVIEW MIGRASI db_Hartek_PenyulangGardu ================');
  Logger.log('Batas tanggal (H-' + MIGRASI_H_MINUS + '): ' + batas + ' — baris dgn Tanggal (kolom F) <= ' + batas + ' akan dipindah.');
  Logger.log('Total baris ber-Kode PG di AKTIF        : ' + total);
  Logger.log('  > Akan DISALIN ke arsip lalu dihapus : ' + pindah);
  Logger.log('      contoh: ' + (sampelPindah.join(', ') || '-'));
  Logger.log('  > SUDAH ADA di arsip (hanya dihapus) : ' + sudahAda);
  Logger.log('      contoh: ' + (sampelSudahAda.join(', ') || '-'));
  Logger.log('  > TETAP di aktif (belum H-' + MIGRASI_H_MINUS + ')         : ' + tetap);
  Logger.log('      contoh: ' + (sampelTetap.join(', ') || '-'));
  Logger.log('Baris tanpa Kode PG (dilewati)        : ' + tanpaKode);
  Logger.log('Baris yang sudah ada di ARSIP         : ' + Object.keys(adaDiArsip).length);
  Logger.log('Deteksi hantu AKTIF : getLastRow=' + lastRow + ' vs baris terakhir berisi Kode = ' + _lastRowKodeHartekPG_(shAktif));
  Logger.log('Deteksi hantu ARSIP : getLastRow=' + shArsip.getLastRow() + ' vs baris terakhir berisi Kode = ' + _lastRowKodeHartekPG_(shArsip));
  Logger.log('==================================================================');
}

/* =====================================================
   BAGIAN 10: db_Hartek_Pekerjaan (Hartek tier-3)
   Mekanisme SAMA dgn sheet sebelumnya, penyesuaian:
     - Kunci dedup/lookup = Kode Pekerjaan (kolom D / COL_HTK.PEKERJAAN.kodePekerjaan)
       — unik per baris (format <KodePG>-PKJ.<nnn>).
     - Kriteria: Tanggal (kolom G, COL_HTK.PEKERJAAN.tanggal) <= H-2.
       PERINGATAN: kolom E = ULP & kolom F = Hari di sheet ini — tanggal = kolom G!
       Tanggal diisi bot prosesHartekPekerjaan dari PG induk -> anak & induk
       termigrasi pada usia yang sama.
     - Lebar 17 kolom (A..Q); kolom A (No, formula) TIDAK disalin (tulis B..Q).
   Memakai SHEET_HTK & COL_HTK dari Tek-Hartek-Code.gs (global scope).
   ===================================================== */

var MIGRASI_CURSOR_PROP_HPKJ = 'MIGRASI_HARTEK_PKJ_CURSOR';

function _lolosKriteriaMigrasiHartekPkj(row) {
  var tgl = _normTgl(row[COL_HTK.PEKERJAAN.tanggal]);   // kolom G (BUKAN kolom E — itu ULP; F = Hari)
  if (!tgl) return false;                          // tanggal kosong/rusak -> biarkan di aktif
  return tgl <= _migrasiBatasTanggal();
}

// Baris terakhir yg benar-benar berisi Kode Pekerjaan (kolom D) — kebal baris hantu formula kolom A.
function _lastRowKodeHartekPkj_(sh) {
  var last = sh.getLastRow();
  if (last < 2) return 1;
  var col = sh.getRange(2, COL_HTK.PEKERJAAN.kodePekerjaan + 1, last - 1, 1).getValues();
  for (var i = col.length - 1; i >= 0; i--) {
    if (String(col[i][0] || '').trim() !== '') return i + 2;
  }
  return 1;
}

/* ===== 1 BATCH MIGRASI db_Hartek_Pekerjaan ===== */
function migrasiHartekPkjBatch() {
  if (MIGRASI_DRY_RUN) Logger.log('⚠️ MODE SIMULASI (DRY RUN) AKTIF — tidak ada data yang disalin/dihapus. Set MIGRASI_DRY_RUN = false utk menjalankan sungguhan.');
  var R = COL_HTK.PEKERJAAN, LEBAR = R.timestamp + 1;   // 17 kolom (A..Q); kolom A = formula No, TIDAK disalin
  var NAMA = SHEET_HTK.PEKERJAAN;                        // 'db_Hartek_Pekerjaan'
  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) throw new Error(NAMA + ' tidak ditemukan di salah satu file.');

  // 1) INDEX Kode Pekerjaan yang SUDAH ada di arsip
  var adaDiArsip = {};
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, R.kodePekerjaan + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      var ka = String(colArsip[a][0] || '').trim();
      if (ka) adaDiArsip[ka] = true;
    }
  }

  // 2) Baca batch baris AKTIF dari cursor
  var props = PropertiesService.getScriptProperties();
  var start = parseInt(props.getProperty(MIGRASI_CURSOR_PROP_HPKJ) || '2', 10);
  var lastRow = shAktif.getLastRow();
  if (start > lastRow) { props.deleteProperty(MIGRASI_CURSOR_PROP_HPKJ); return { done: true, disalin: 0, dihapus: 0 }; }
  var end = Math.min(start + MIGRASI_BATCH - 1, lastRow);
  var data = shAktif.getRange(start, 1, end - start + 1, LEBAR).getValues();

  // 3) Klasifikasi per mekanisme
  var akanDisalin = [], akanDihapus = [];
  for (var i = 0; i < data.length; i++) {
    var kode = String(data[i][R.kodePekerjaan] || '').trim();
    if (!kode) continue;                                   // baris kosong: lewati, JANGAN dihapus
    if (adaDiArsip[kode]) {
      akanDihapus.push(start + i);                         // SUDAH ADA -> hapus saja
    } else if (_lolosKriteriaMigrasiHartekPkj(data[i])) {
      akanDisalin.push(data[i].slice(1));                  // salin TANPA kolom A (formula No)
      akanDihapus.push(start + i);                         // setelah tersalin -> hapus di aktif
      adaDiArsip[kode] = true;                             // anti dobel dalam batch yg sama
    }
  }

  // 4) APPEND ke arsip + VERIFIKASI baca balik Kode Pekerjaan baris pertama
  if (!MIGRASI_DRY_RUN && akanDisalin.length) {
    var rowStart = _lastRowKodeHartekPkj_(shArsip) + 1;
    shArsip.getRange(rowStart, 2, akanDisalin.length, LEBAR - 1).setValues(akanDisalin);
    SpreadsheetApp.flush();
    var cek = String(shArsip.getRange(rowStart, R.kodePekerjaan + 1).getValue() || '').trim();
    // akanDisalin = baris TANPA kolom A (slice(1)) -> Kode Pekerjaan (kolom D, idx 3) bergeser ke idx 2 (= R.kodePekerjaan - 1)
    if (cek !== String(akanDisalin[0][R.kodePekerjaan - 1] || '').trim()) {
      throw new Error('Verifikasi append GAGAL — penghapusan dibatalkan utk batch ini.');
    }
  }

  // 5) HAPUS di aktif dari BAWAH ke ATAS
  if (!MIGRASI_DRY_RUN) {
    akanDihapus.sort(function (a, b) { return b - a; });
    for (var d = 0; d < akanDihapus.length; d++) shAktif.deleteRow(akanDihapus[d]);
    SpreadsheetApp.flush();
  }

  // 6) Cursor berikutnya (batch - jumlahDihapus)
  var nextStart = end + 1 - (MIGRASI_DRY_RUN ? 0 : akanDihapus.length);
  var done = nextStart > shAktif.getLastRow();
  if (done) props.deleteProperty(MIGRASI_CURSOR_PROP_HPKJ);
  else props.setProperty(MIGRASI_CURSOR_PROP_HPKJ, String(nextStart));

  Logger.log('[migrasiHartekPkj] batch ' + start + '-' + end +
             ' | disalin=' + akanDisalin.length + ' | dihapus=' + akanDihapus.length +
             ' | next=' + (done ? 'SELESAI' : nextStart) + (MIGRASI_DRY_RUN ? ' [DRY RUN]' : ''));
  return { done: done, disalin: akanDisalin.length, dihapus: akanDihapus.length };
}

/* ===== TRIGGER HARTEK PEKERJAAN: mulai / tick / berhenti ===== */
function mulaiMigrasiHartekPkj() {
  PropertiesService.getScriptProperties().deleteProperty(MIGRASI_CURSOR_PROP_HPKJ);
  var trs = ScriptApp.getProjectTriggers();
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === 'migrasiHartekPkjTick') ScriptApp.deleteTrigger(trs[i]);
  ScriptApp.newTrigger('migrasiHartekPkjTick').timeBased().everyMinutes(1).create();
  Logger.log('Migrasi db_Hartek_Pekerjaan DIMULAI (tiap 1 menit, batch ' + MIGRASI_BATCH + ').');
}

function migrasiHartekPkjTick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    var r = migrasiHartekPkjBatch();
    if (r && r.done) {
      var trs = ScriptApp.getProjectTriggers();
      for (var i = 0; i < trs.length; i++)
        if (trs[i].getHandlerFunction() === 'migrasiHartekPkjTick') ScriptApp.deleteTrigger(trs[i]);
      Logger.log('Migrasi db_Hartek_Pekerjaan SELESAI -> trigger dilepas.');
    }
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

function hentikanMigrasiHartekPkj() {
  var trs = ScriptApp.getProjectTriggers(), n = 0;
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === 'migrasiHartekPkjTick') { ScriptApp.deleteTrigger(trs[i]); n++; }
  PropertiesService.getScriptProperties().deleteProperty(MIGRASI_CURSOR_PROP_HPKJ);
  Logger.log('Migrasi Hartek Pekerjaan dihentikan, ' + n + ' trigger dilepas, cursor direset.');
}

/* ===== MIGRASI 1 BARIS db_Hartek_Pekerjaan by Kode Pekerjaan (uji coba / manual) =====
   Alur sama dgn versi sebelumnya, kunci = Kode Pekerjaan (kolom D).
   TIDAK mengecek kriteria H-2 — baris dipilih manual.
   Cara pakai: migrasiSatuBarisHartekPkj('<Kode Pekerjaan persis dari kolom D>'); */
function migrasiSatuBarisHartekPkj(kodePekerjaan) {
  var R = COL_HTK.PEKERJAAN, LEBAR = R.timestamp + 1, NAMA = SHEET_HTK.PEKERJAAN;
  var key = String(kodePekerjaan || '').trim();
  if (!key) return { ok: false, message: 'Kode Pekerjaan wajib diisi.' };

  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) return { ok: false, message: 'Sheet ' + NAMA + ' tidak ditemukan di salah satu file.' };

  // 1) Cek keberadaan di ARSIP
  var adaDiArsip = false;
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, R.kodePekerjaan + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      if (String(colArsip[a][0] || '').trim() === key) { adaDiArsip = true; break; }
    }
  }

  // 2) Cari nomor baris di AKTIF
  var rowNum = -1;
  if (shAktif.getLastRow() > 1) {
    var colAktif = shAktif.getRange(2, R.kodePekerjaan + 1, shAktif.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < colAktif.length; i++) {
      if (String(colAktif[i][0] || '').trim() === key) { rowNum = i + 2; break; }
    }
  }
  if (rowNum < 0) {
    Logger.log('[migrasiSatuBarisHartekPkj] "' + key + '" TIDAK ditemukan di file AKTIF — tidak ada yang diproses. Ambil nilai persis dari kolom D db_Hartek_Pekerjaan.');
    return { ok: true, mode: 'tidak-ada-di-aktif', kodePekerjaan: key, sudahDiArsip: adaDiArsip };
  }

  var mode;
  if (adaDiArsip) {
    mode = 'hapus-duplikat';
  } else {
    var rowData = shAktif.getRange(rowNum, 1, 1, LEBAR).getValues()[0].slice(1);   // B..Q (tanpa kolom A)
    var rowBaru = _lastRowKodeHartekPkj_(shArsip) + 1;
    shArsip.getRange(rowBaru, 2, 1, LEBAR - 1).setValues([rowData]);
    SpreadsheetApp.flush();
    var cek = String(shArsip.getRange(rowBaru, R.kodePekerjaan + 1).getValue() || '').trim();
    if (cek !== key) {
      throw new Error('Verifikasi append GAGAL utk ' + key + ' — baris di aktif TIDAK dihapus.');
    }
    mode = 'disalin';
  }

  // 3) Hapus baris di AKTIF
  shAktif.deleteRow(rowNum);
  SpreadsheetApp.flush();
  Logger.log('[migrasiSatuBarisHartekPkj] ' + key + ' -> ' + mode + ' (baris aktif ' + rowNum + ' dihapus)');
  return { ok: true, mode: mode, kodePekerjaan: key, barisAktifDihapus: rowNum };
}

/* ===== PREVIEW db_Hartek_Pekerjaan (read-only, aman) ===== */
function previewMigrasiHartekPkj() {
  var R = COL_HTK.PEKERJAAN, LEBAR = R.timestamp + 1, NAMA = SHEET_HTK.PEKERJAAN;
  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) { Logger.log('Sheet ' + NAMA + ' tidak ditemukan di salah satu file.'); return; }

  var adaDiArsip = {};
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, R.kodePekerjaan + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      var ka = String(colArsip[a][0] || '').trim();
      if (ka) adaDiArsip[ka] = true;
    }
  }

  var batas = _migrasiBatasTanggal();
  var total = 0, pindah = 0, sudahAda = 0, tetap = 0, tanpaKode = 0;
  var sampelPindah = [], sampelSudahAda = [], sampelTetap = [];
  var lastRow = shAktif.getLastRow();
  if (lastRow > 1) {
    var data = shAktif.getRange(2, 1, lastRow - 1, LEBAR).getValues();
    for (var i = 0; i < data.length; i++) {
      var kode = String(data[i][R.kodePekerjaan] || '').trim();
      if (!kode) { tanpaKode++; continue; }
      total++;
      var label = kode + ' (' + _normTgl(data[i][R.tanggal]) + ' | ' + (String(data[i][R.pekerjaan] || '').trim() || '-') + ')';
      if (adaDiArsip[kode]) {
        sudahAda++;
        if (sampelSudahAda.length < 5) sampelSudahAda.push(label);
      } else if (_lolosKriteriaMigrasiHartekPkj(data[i])) {
        pindah++;
        if (sampelPindah.length < 5) sampelPindah.push(label);
      } else {
        tetap++;
        if (sampelTetap.length < 5) sampelTetap.push(label);
      }
    }
  }

  Logger.log('================ PREVIEW MIGRASI db_Hartek_Pekerjaan ================');
  Logger.log('Batas tanggal (H-' + MIGRASI_H_MINUS + '): ' + batas + ' — baris dgn Tanggal (kolom G) <= ' + batas + ' akan dipindah.');
  Logger.log('Total baris ber-Kode Pekerjaan di AKTIF : ' + total);
  Logger.log('  > Akan DISALIN ke arsip lalu dihapus : ' + pindah);
  Logger.log('      contoh: ' + (sampelPindah.join(', ') || '-'));
  Logger.log('  > SUDAH ADA di arsip (hanya dihapus) : ' + sudahAda);
  Logger.log('      contoh: ' + (sampelSudahAda.join(', ') || '-'));
  Logger.log('  > TETAP di aktif (belum H-' + MIGRASI_H_MINUS + ')         : ' + tetap);
  Logger.log('      contoh: ' + (sampelTetap.join(', ') || '-'));
  Logger.log('Baris tanpa Kode Pekerjaan (dilewati) : ' + tanpaKode);
  Logger.log('Baris yang sudah ada di ARSIP         : ' + Object.keys(adaDiArsip).length);
  Logger.log('Deteksi hantu AKTIF : getLastRow=' + lastRow + ' vs baris terakhir berisi Kode = ' + _lastRowKodeHartekPkj_(shAktif));
  Logger.log('Deteksi hantu ARSIP : getLastRow=' + shArsip.getLastRow() + ' vs baris terakhir berisi Kode = ' + _lastRowKodeHartekPkj_(shArsip));
  Logger.log('==================================================================');
}

/* =====================================================
   BAGIAN 11: db_Hartek_Material (Hartek tier-4)
   Mekanisme SAMA dgn sheet sebelumnya, penyesuaian:
     - Kunci dedup/lookup = Kode Material (kolom E / COL_HTK.MATERIAL.kodeMaterial)
       — unik per baris (format <KodePekerjaan>-MAT.<nnn>).
     - Kriteria: Tanggal (kolom H, COL_HTK.MATERIAL.tanggal) <= H-2.
       Tanggal diisi bot prosesHartekMaterial dari Pekerjaan induk -> anak &
       induk termigrasi pada usia yang sama.
     - Lebar 19 kolom (A..S); kolom A (No, formula) TIDAK disalin (tulis B..S).
   Memakai SHEET_HTK & COL_HTK dari Tek-Hartek-Code.gs (global scope).
   ===================================================== */

var MIGRASI_CURSOR_PROP_HMT = 'MIGRASI_HARTEK_MAT_CURSOR';

function _lolosKriteriaMigrasiHartekMat(row) {
  var tgl = _normTgl(row[COL_HTK.MATERIAL.tanggal]);   // kolom H
  if (!tgl) return false;                          // tanggal kosong/rusak -> biarkan di aktif
  return tgl <= _migrasiBatasTanggal();
}

// Baris terakhir yg benar-benar berisi Kode Material (kolom E) — kebal baris hantu formula kolom A.
function _lastRowKodeHartekMat_(sh) {
  var last = sh.getLastRow();
  if (last < 2) return 1;
  var col = sh.getRange(2, COL_HTK.MATERIAL.kodeMaterial + 1, last - 1, 1).getValues();
  for (var i = col.length - 1; i >= 0; i--) {
    if (String(col[i][0] || '').trim() !== '') return i + 2;
  }
  return 1;
}

/* ===== 1 BATCH MIGRASI db_Hartek_Material ===== */
function migrasiHartekMatBatch() {
  if (MIGRASI_DRY_RUN) Logger.log('⚠️ MODE SIMULASI (DRY RUN) AKTIF — tidak ada data yang disalin/dihapus. Set MIGRASI_DRY_RUN = false utk menjalankan sungguhan.');
  var R = COL_HTK.MATERIAL, LEBAR = R.timestamp + 1;    // 19 kolom (A..S); kolom A = formula No, TIDAK disalin
  var NAMA = SHEET_HTK.MATERIAL;                         // 'db_Hartek_Material'
  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) throw new Error(NAMA + ' tidak ditemukan di salah satu file.');

  // 1) INDEX Kode Material yang SUDAH ada di arsip
  var adaDiArsip = {};
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, R.kodeMaterial + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      var ka = String(colArsip[a][0] || '').trim();
      if (ka) adaDiArsip[ka] = true;
    }
  }

  // 2) Baca batch baris AKTIF dari cursor
  var props = PropertiesService.getScriptProperties();
  var start = parseInt(props.getProperty(MIGRASI_CURSOR_PROP_HMT) || '2', 10);
  var lastRow = shAktif.getLastRow();
  if (start > lastRow) { props.deleteProperty(MIGRASI_CURSOR_PROP_HMT); return { done: true, disalin: 0, dihapus: 0 }; }
  var end = Math.min(start + MIGRASI_BATCH - 1, lastRow);
  var data = shAktif.getRange(start, 1, end - start + 1, LEBAR).getValues();

  // 3) Klasifikasi per mekanisme
  var akanDisalin = [], akanDihapus = [];
  for (var i = 0; i < data.length; i++) {
    var kode = String(data[i][R.kodeMaterial] || '').trim();
    if (!kode) continue;                                   // baris kosong: lewati, JANGAN dihapus
    if (adaDiArsip[kode]) {
      akanDihapus.push(start + i);                         // SUDAH ADA -> hapus saja
    } else if (_lolosKriteriaMigrasiHartekMat(data[i])) {
      akanDisalin.push(data[i].slice(1));                  // salin TANPA kolom A (formula No)
      akanDihapus.push(start + i);                         // setelah tersalin -> hapus di aktif
      adaDiArsip[kode] = true;                             // anti dobel dalam batch yg sama
    }
  }

  // 4) APPEND ke arsip + VERIFIKASI baca balik Kode Material baris pertama
  if (!MIGRASI_DRY_RUN && akanDisalin.length) {
    var rowStart = _lastRowKodeHartekMat_(shArsip) + 1;
    shArsip.getRange(rowStart, 2, akanDisalin.length, LEBAR - 1).setValues(akanDisalin);
    SpreadsheetApp.flush();
    var cek = String(shArsip.getRange(rowStart, R.kodeMaterial + 1).getValue() || '').trim();
    // akanDisalin = baris TANPA kolom A (slice(1)) -> Kode Material (kolom E, idx 4) bergeser ke idx 3 (= R.kodeMaterial - 1)
    if (cek !== String(akanDisalin[0][R.kodeMaterial - 1] || '').trim()) {
      throw new Error('Verifikasi append GAGAL — penghapusan dibatalkan utk batch ini.');
    }
  }

  // 5) HAPUS di aktif dari BAWAH ke ATAS
  if (!MIGRASI_DRY_RUN) {
    akanDihapus.sort(function (a, b) { return b - a; });
    for (var d = 0; d < akanDihapus.length; d++) shAktif.deleteRow(akanDihapus[d]);
    SpreadsheetApp.flush();
  }

  // 6) Cursor berikutnya (batch - jumlahDihapus)
  var nextStart = end + 1 - (MIGRASI_DRY_RUN ? 0 : akanDihapus.length);
  var done = nextStart > shAktif.getLastRow();
  if (done) props.deleteProperty(MIGRASI_CURSOR_PROP_HMT);
  else props.setProperty(MIGRASI_CURSOR_PROP_HMT, String(nextStart));

  Logger.log('[migrasiHartekMat] batch ' + start + '-' + end +
             ' | disalin=' + akanDisalin.length + ' | dihapus=' + akanDihapus.length +
             ' | next=' + (done ? 'SELESAI' : nextStart) + (MIGRASI_DRY_RUN ? ' [DRY RUN]' : ''));
  return { done: done, disalin: akanDisalin.length, dihapus: akanDihapus.length };
}

/* ===== TRIGGER HARTEK MATERIAL: mulai / tick / berhenti ===== */
function mulaiMigrasiHartekMat() {
  PropertiesService.getScriptProperties().deleteProperty(MIGRASI_CURSOR_PROP_HMT);
  var trs = ScriptApp.getProjectTriggers();
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === 'migrasiHartekMatTick') ScriptApp.deleteTrigger(trs[i]);
  ScriptApp.newTrigger('migrasiHartekMatTick').timeBased().everyMinutes(1).create();
  Logger.log('Migrasi db_Hartek_Material DIMULAI (tiap 1 menit, batch ' + MIGRASI_BATCH + ').');
}

function migrasiHartekMatTick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    var r = migrasiHartekMatBatch();
    if (r && r.done) {
      var trs = ScriptApp.getProjectTriggers();
      for (var i = 0; i < trs.length; i++)
        if (trs[i].getHandlerFunction() === 'migrasiHartekMatTick') ScriptApp.deleteTrigger(trs[i]);
      Logger.log('Migrasi db_Hartek_Material SELESAI -> trigger dilepas.');
    }
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

function hentikanMigrasiHartekMat() {
  var trs = ScriptApp.getProjectTriggers(), n = 0;
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === 'migrasiHartekMatTick') { ScriptApp.deleteTrigger(trs[i]); n++; }
  PropertiesService.getScriptProperties().deleteProperty(MIGRASI_CURSOR_PROP_HMT);
  Logger.log('Migrasi Hartek Material dihentikan, ' + n + ' trigger dilepas, cursor direset.');
}

/* ===== MIGRASI 1 BARIS db_Hartek_Material by Kode Material (uji coba / manual) =====
   Alur sama dgn versi sebelumnya, kunci = Kode Material (kolom E).
   TIDAK mengecek kriteria H-2 — baris dipilih manual.
   Cara pakai: migrasiSatuBarisHartekMat('<Kode Material persis dari kolom E>'); */
function migrasiSatuBarisHartekMat(kodeMaterial) {
  var R = COL_HTK.MATERIAL, LEBAR = R.timestamp + 1, NAMA = SHEET_HTK.MATERIAL;
  var key = String(kodeMaterial || '').trim();
  if (!key) return { ok: false, message: 'Kode Material wajib diisi.' };

  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) return { ok: false, message: 'Sheet ' + NAMA + ' tidak ditemukan di salah satu file.' };

  // 1) Cek keberadaan di ARSIP
  var adaDiArsip = false;
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, R.kodeMaterial + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      if (String(colArsip[a][0] || '').trim() === key) { adaDiArsip = true; break; }
    }
  }

  // 2) Cari nomor baris di AKTIF
  var rowNum = -1;
  if (shAktif.getLastRow() > 1) {
    var colAktif = shAktif.getRange(2, R.kodeMaterial + 1, shAktif.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < colAktif.length; i++) {
      if (String(colAktif[i][0] || '').trim() === key) { rowNum = i + 2; break; }
    }
  }
  if (rowNum < 0) {
    Logger.log('[migrasiSatuBarisHartekMat] "' + key + '" TIDAK ditemukan di file AKTIF — tidak ada yang diproses. Ambil nilai persis dari kolom E db_Hartek_Material.');
    return { ok: true, mode: 'tidak-ada-di-aktif', kodeMaterial: key, sudahDiArsip: adaDiArsip };
  }

  var mode;
  if (adaDiArsip) {
    mode = 'hapus-duplikat';
  } else {
    var rowData = shAktif.getRange(rowNum, 1, 1, LEBAR).getValues()[0].slice(1);   // B..S (tanpa kolom A)
    var rowBaru = _lastRowKodeHartekMat_(shArsip) + 1;
    shArsip.getRange(rowBaru, 2, 1, LEBAR - 1).setValues([rowData]);
    SpreadsheetApp.flush();
    var cek = String(shArsip.getRange(rowBaru, R.kodeMaterial + 1).getValue() || '').trim();
    if (cek !== key) {
      throw new Error('Verifikasi append GAGAL utk ' + key + ' — baris di aktif TIDAK dihapus.');
    }
    mode = 'disalin';
  }

  // 3) Hapus baris di AKTIF
  shAktif.deleteRow(rowNum);
  SpreadsheetApp.flush();
  Logger.log('[migrasiSatuBarisHartekMat] ' + key + ' -> ' + mode + ' (baris aktif ' + rowNum + ' dihapus)');
  return { ok: true, mode: mode, kodeMaterial: key, barisAktifDihapus: rowNum };
}

/* ===== PREVIEW db_Hartek_Material (read-only, aman) ===== */
function previewMigrasiHartekMat() {
  var R = COL_HTK.MATERIAL, LEBAR = R.timestamp + 1, NAMA = SHEET_HTK.MATERIAL;
  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) { Logger.log('Sheet ' + NAMA + ' tidak ditemukan di salah satu file.'); return; }

  var adaDiArsip = {};
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, R.kodeMaterial + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      var ka = String(colArsip[a][0] || '').trim();
      if (ka) adaDiArsip[ka] = true;
    }
  }

  var batas = _migrasiBatasTanggal();
  var total = 0, pindah = 0, sudahAda = 0, tetap = 0, tanpaKode = 0;
  var sampelPindah = [], sampelSudahAda = [], sampelTetap = [];
  var lastRow = shAktif.getLastRow();
  if (lastRow > 1) {
    var data = shAktif.getRange(2, 1, lastRow - 1, LEBAR).getValues();
    for (var i = 0; i < data.length; i++) {
      var kode = String(data[i][R.kodeMaterial] || '').trim();
      if (!kode) { tanpaKode++; continue; }
      total++;
      var label = kode + ' (' + _normTgl(data[i][R.tanggal]) + ' | ' + (String(data[i][R.material] || '').trim() || '-') + ')';
      if (adaDiArsip[kode]) {
        sudahAda++;
        if (sampelSudahAda.length < 5) sampelSudahAda.push(label);
      } else if (_lolosKriteriaMigrasiHartekMat(data[i])) {
        pindah++;
        if (sampelPindah.length < 5) sampelPindah.push(label);
      } else {
        tetap++;
        if (sampelTetap.length < 5) sampelTetap.push(label);
      }
    }
  }

  Logger.log('================ PREVIEW MIGRASI db_Hartek_Material ================');
  Logger.log('Batas tanggal (H-' + MIGRASI_H_MINUS + '): ' + batas + ' — baris dgn Tanggal (kolom H) <= ' + batas + ' akan dipindah.');
  Logger.log('Total baris ber-Kode Material di AKTIF  : ' + total);
  Logger.log('  > Akan DISALIN ke arsip lalu dihapus : ' + pindah);
  Logger.log('      contoh: ' + (sampelPindah.join(', ') || '-'));
  Logger.log('  > SUDAH ADA di arsip (hanya dihapus) : ' + sudahAda);
  Logger.log('      contoh: ' + (sampelSudahAda.join(', ') || '-'));
  Logger.log('  > TETAP di aktif (belum H-' + MIGRASI_H_MINUS + ')         : ' + tetap);
  Logger.log('      contoh: ' + (sampelTetap.join(', ') || '-'));
  Logger.log('Baris tanpa Kode Material (dilewati)  : ' + tanpaKode);
  Logger.log('Baris yang sudah ada di ARSIP         : ' + Object.keys(adaDiArsip).length);
  Logger.log('Deteksi hantu AKTIF : getLastRow=' + lastRow + ' vs baris terakhir berisi Kode = ' + _lastRowKodeHartekMat_(shAktif));
  Logger.log('Deteksi hantu ARSIP : getLastRow=' + shArsip.getLastRow() + ' vs baris terakhir berisi Kode = ' + _lastRowKodeHartekMat_(shArsip));
  Logger.log('==================================================================');
}

/* =====================================================
   BAGIAN 12: db_Yandal_Shift (Yandal tier-2)
   Mekanisme SAMA dgn sheet sebelumnya + GUARD JENDELA WAKTU seperti P0 (BAGIAN 5):
   tabel Shift ikut DITULIS hampir tiap menit pada jam aktif (recalcJumlahP0_ menulis
   Jumlah P0 tiap P0 diproses + AppSheet membuat baris shift baru di tiap pergantian
   shift) -> batch HANYA jalan di 3 jendela sela pergantian shift via
   _dalamJendelaMigrasiP0_() (23:55-00:10 / 07:50-08:10 / 15:50-16:10 WIB).
   Penyesuaian lain:
     - Kunci dedup/lookup = Kode Pekerjaan Shift (kolom C / COL_YANDAL_SHIFT.kodeShift)
       — unik per baris (format <KodeHeader>-SHF<1|2|3>.<nnn>).
     - Kriteria: Tanggal (kolom E, COL_YANDAL_SHIFT.tanggal) <= H-2 — MURNI tanggal
       (TANPA guard status/foto seperti P0). Tanggal = tanggal operasional shift
       = tanggal header-nya -> anak & induk termigrasi pada usia yang sama.
     - Lebar 12 kolom (A..L); kolom A (No, formula) TIDAK disalin (tulis B..L).
   Memakai SHEET_YANDAL & COL_YANDAL_SHIFT dari Tek-Yandal-Code.gs (global scope).
   ===================================================== */

var MIGRASI_CURSOR_PROP_YSH = 'MIGRASI_YANDAL_SHIFT_CURSOR';

function _lolosKriteriaMigrasiYandalShift(row) {
  var tgl = _normTgl(row[COL_YANDAL_SHIFT.tanggal]);   // kolom E
  if (!tgl) return false;                          // tanggal kosong/rusak -> biarkan di aktif
  return tgl <= _migrasiBatasTanggal();
}

// Baris terakhir yg benar-benar berisi Kode Shift (kolom C) — kebal baris hantu formula kolom A.
function _lastRowKodeYandalShift_(sh) {
  var last = sh.getLastRow();
  if (last < 2) return 1;
  var col = sh.getRange(2, COL_YANDAL_SHIFT.kodeShift + 1, last - 1, 1).getValues();
  for (var i = col.length - 1; i >= 0; i--) {
    if (String(col[i][0] || '').trim() !== '') return i + 2;
  }
  return 1;
}

/* ===== 1 BATCH MIGRASI db_Yandal_Shift =====
   force=true utk MEMAKSA jalan di luar jendela (HANYA uji coba manual — hati-hati tabrakan input petugas). */
function migrasiYandalShiftBatch(force) {
  if (MIGRASI_DRY_RUN) Logger.log('⚠️ MODE SIMULASI (DRY RUN) AKTIF — tidak ada data yang disalin/dihapus. Set MIGRASI_DRY_RUN = false utk menjalankan sungguhan.');
  if (!_dalamJendelaMigrasiP0_()) {
    if (force !== true) {
      Logger.log('[migrasiYandalShift] Di luar jendela (23:55-00:10 / 07:50-08:10 / 15:50-16:10 WIB) — batch DILEWATI, cursor tidak bergerak.');
      return { done: false, skipped: 'di-luar-jendela' };
    }
    Logger.log('⚠️ FORCE: migrasi dijalankan DI LUAR jendela waktu (mode paksa).');
  }
  var R = COL_YANDAL_SHIFT, LEBAR = R.timestamp + 1;   // 12 kolom (A..L); kolom A = formula No, TIDAK disalin
  var NAMA = SHEET_YANDAL.SHIFT;                        // 'db_Yandal_Shift'
  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) throw new Error(NAMA + ' tidak ditemukan di salah satu file.');

  // 1) INDEX Kode Shift yang SUDAH ada di arsip
  var adaDiArsip = {};
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, R.kodeShift + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      var ka = String(colArsip[a][0] || '').trim();
      if (ka) adaDiArsip[ka] = true;
    }
  }

  // 2) Baca batch baris AKTIF dari cursor
  var props = PropertiesService.getScriptProperties();
  var start = parseInt(props.getProperty(MIGRASI_CURSOR_PROP_YSH) || '2', 10);
  var lastRow = shAktif.getLastRow();
  if (start > lastRow) { props.deleteProperty(MIGRASI_CURSOR_PROP_YSH); return { done: true, disalin: 0, dihapus: 0 }; }
  var end = Math.min(start + MIGRASI_BATCH - 1, lastRow);
  var data = shAktif.getRange(start, 1, end - start + 1, LEBAR).getValues();

  // 3) Klasifikasi per mekanisme
  var akanDisalin = [], akanDihapus = [];
  for (var i = 0; i < data.length; i++) {
    var kode = String(data[i][R.kodeShift] || '').trim();
    if (!kode) continue;                                   // baris kosong: lewati, JANGAN dihapus
    if (adaDiArsip[kode]) {
      akanDihapus.push(start + i);                         // SUDAH ADA -> hapus saja
    } else if (_lolosKriteriaMigrasiYandalShift(data[i])) {
      akanDisalin.push(data[i].slice(1));                  // salin TANPA kolom A (formula No)
      akanDihapus.push(start + i);                         // setelah tersalin -> hapus di aktif
      adaDiArsip[kode] = true;                             // anti dobel dalam batch yg sama
    }
  }

  // 4) APPEND ke arsip + VERIFIKASI baca balik Kode Shift baris pertama
  if (!MIGRASI_DRY_RUN && akanDisalin.length) {
    var rowStart = _lastRowKodeYandalShift_(shArsip) + 1;
    shArsip.getRange(rowStart, 2, akanDisalin.length, LEBAR - 1).setValues(akanDisalin);
    SpreadsheetApp.flush();
    var cek = String(shArsip.getRange(rowStart, R.kodeShift + 1).getValue() || '').trim();
    // akanDisalin = baris TANPA kolom A (slice(1)) -> Kode Shift (kolom C, idx 2) bergeser ke idx 1 (= R.kodeShift - 1)
    if (cek !== String(akanDisalin[0][R.kodeShift - 1] || '').trim()) {
      throw new Error('Verifikasi append GAGAL — penghapusan dibatalkan utk batch ini.');
    }
  }

  // 5) HAPUS di aktif dari BAWAH ke ATAS
  if (!MIGRASI_DRY_RUN) {
    akanDihapus.sort(function (a, b) { return b - a; });
    for (var d = 0; d < akanDihapus.length; d++) shAktif.deleteRow(akanDihapus[d]);
    SpreadsheetApp.flush();
  }

  // 6) Cursor berikutnya (batch - jumlahDihapus)
  var nextStart = end + 1 - (MIGRASI_DRY_RUN ? 0 : akanDihapus.length);
  var done = nextStart > shAktif.getLastRow();
  if (done) props.deleteProperty(MIGRASI_CURSOR_PROP_YSH);
  else props.setProperty(MIGRASI_CURSOR_PROP_YSH, String(nextStart));

  Logger.log('[migrasiYandalShift] batch ' + start + '-' + end +
             ' | disalin=' + akanDisalin.length + ' | dihapus=' + akanDihapus.length +
             ' | next=' + (done ? 'SELESAI' : nextStart) + (MIGRASI_DRY_RUN ? ' [DRY RUN]' : ''));
  return { done: done, disalin: akanDisalin.length, dihapus: akanDihapus.length };
}

/* ===== TRIGGER YANDAL SHIFT: mulai / tick / berhenti ===== */
function mulaiMigrasiYandalShift() {
  PropertiesService.getScriptProperties().deleteProperty(MIGRASI_CURSOR_PROP_YSH);
  var trs = ScriptApp.getProjectTriggers();
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === 'migrasiYandalShiftTick') ScriptApp.deleteTrigger(trs[i]);
  ScriptApp.newTrigger('migrasiYandalShiftTick').timeBased().everyMinutes(1).create();
  Logger.log('Migrasi db_Yandal_Shift DIMULAI (tiap 1 menit, batch ' + MIGRASI_BATCH + ') — proses HANYA di jendela 23:55-00:10 / 07:50-08:10 / 15:50-16:10 WIB.');
}

function migrasiYandalShiftTick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    var r = migrasiYandalShiftBatch();
    if (r && r.done) {
      var trs = ScriptApp.getProjectTriggers();
      for (var i = 0; i < trs.length; i++)
        if (trs[i].getHandlerFunction() === 'migrasiYandalShiftTick') ScriptApp.deleteTrigger(trs[i]);
      Logger.log('Migrasi db_Yandal_Shift SELESAI -> trigger dilepas.');
    }
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

function hentikanMigrasiYandalShift() {
  var trs = ScriptApp.getProjectTriggers(), n = 0;
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === 'migrasiYandalShiftTick') { ScriptApp.deleteTrigger(trs[i]); n++; }
  PropertiesService.getScriptProperties().deleteProperty(MIGRASI_CURSOR_PROP_YSH);
  Logger.log('Migrasi Yandal Shift dihentikan, ' + n + ' trigger dilepas, cursor direset.');
}

/* ===== MIGRASI 1 BARIS db_Yandal_Shift by Kode Shift (uji coba / manual) =====
   Alur sama dgn versi sebelumnya, kunci = Kode Pekerjaan Shift (kolom C).
   TIDAK mengecek kriteria H-2 & TIDAK mengecek jendela waktu — baris dipilih manual.
   Cara pakai: migrasiSatuBarisYandalShift('<Kode Shift persis dari kolom C>'); */
function migrasiSatuBarisYandalShift(kodeShift) {
  var R = COL_YANDAL_SHIFT, LEBAR = R.timestamp + 1, NAMA = SHEET_YANDAL.SHIFT;
  var key = String(kodeShift || '').trim();
  if (!key) return { ok: false, message: 'Kode Shift wajib diisi.' };

  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) return { ok: false, message: 'Sheet ' + NAMA + ' tidak ditemukan di salah satu file.' };

  // 1) Cek keberadaan di ARSIP
  var adaDiArsip = false;
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, R.kodeShift + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      if (String(colArsip[a][0] || '').trim() === key) { adaDiArsip = true; break; }
    }
  }

  // 2) Cari nomor baris di AKTIF
  var rowNum = -1;
  if (shAktif.getLastRow() > 1) {
    var colAktif = shAktif.getRange(2, R.kodeShift + 1, shAktif.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < colAktif.length; i++) {
      if (String(colAktif[i][0] || '').trim() === key) { rowNum = i + 2; break; }
    }
  }
  if (rowNum < 0) {
    Logger.log('[migrasiSatuBarisYandalShift] "' + key + '" TIDAK ditemukan di file AKTIF — tidak ada yang diproses. Ambil nilai persis dari kolom C db_Yandal_Shift.');
    return { ok: true, mode: 'tidak-ada-di-aktif', kodeShift: key, sudahDiArsip: adaDiArsip };
  }

  var mode;
  if (adaDiArsip) {
    mode = 'hapus-duplikat';
  } else {
    var rowData = shAktif.getRange(rowNum, 1, 1, LEBAR).getValues()[0].slice(1);   // B..L (tanpa kolom A)
    var rowBaru = _lastRowKodeYandalShift_(shArsip) + 1;
    shArsip.getRange(rowBaru, 2, 1, LEBAR - 1).setValues([rowData]);
    SpreadsheetApp.flush();
    var cek = String(shArsip.getRange(rowBaru, R.kodeShift + 1).getValue() || '').trim();
    if (cek !== key) {
      throw new Error('Verifikasi append GAGAL utk ' + key + ' — baris di aktif TIDAK dihapus.');
    }
    mode = 'disalin';
  }

  // 3) Hapus baris di AKTIF
  shAktif.deleteRow(rowNum);
  SpreadsheetApp.flush();
  Logger.log('[migrasiSatuBarisYandalShift] ' + key + ' -> ' + mode + ' (baris aktif ' + rowNum + ' dihapus)');
  return { ok: true, mode: mode, kodeShift: key, barisAktifDihapus: rowNum };
}

/* ===== PREVIEW db_Yandal_Shift (read-only, aman — bebas jendela waktu) ===== */
function previewMigrasiYandalShift() {
  var R = COL_YANDAL_SHIFT, LEBAR = R.timestamp + 1, NAMA = SHEET_YANDAL.SHIFT;
  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) { Logger.log('Sheet ' + NAMA + ' tidak ditemukan di salah satu file.'); return; }

  var adaDiArsip = {};
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, R.kodeShift + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      var ka = String(colArsip[a][0] || '').trim();
      if (ka) adaDiArsip[ka] = true;
    }
  }

  var batas = _migrasiBatasTanggal();
  var total = 0, pindah = 0, sudahAda = 0, tetap = 0, tanpaKode = 0;
  var sampelPindah = [], sampelSudahAda = [], sampelTetap = [];
  var lastRow = shAktif.getLastRow();
  if (lastRow > 1) {
    var data = shAktif.getRange(2, 1, lastRow - 1, LEBAR).getValues();
    for (var i = 0; i < data.length; i++) {
      var kode = String(data[i][R.kodeShift] || '').trim();
      if (!kode) { tanpaKode++; continue; }
      total++;
      var label = kode + ' (' + _normTgl(data[i][R.tanggal]) + ' | ' + (String(data[i][R.tim] || '').trim() || '-') + ' / ' + (String(data[i][R.shift] || '').trim() || '-') + ')';
      if (adaDiArsip[kode]) {
        sudahAda++;
        if (sampelSudahAda.length < 5) sampelSudahAda.push(label);
      } else if (_lolosKriteriaMigrasiYandalShift(data[i])) {
        pindah++;
        if (sampelPindah.length < 5) sampelPindah.push(label);
      } else {
        tetap++;
        if (sampelTetap.length < 5) sampelTetap.push(label);
      }
    }
  }

  Logger.log('================ PREVIEW MIGRASI db_Yandal_Shift ================');
  Logger.log('Batas tanggal (H-' + MIGRASI_H_MINUS + '): ' + batas + ' — baris dgn Tanggal (kolom E) <= ' + batas + ' akan dipindah (murni tanggal, tanpa guard status/foto).');
  Logger.log('Guard jendela saat ini: ' + (_dalamJendelaMigrasiP0_() ? 'DI DALAM jendela (batch boleh jalan)' : 'DI LUAR jendela (batch DILEWATI)') + ' — sekarang ' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'HH:mm') + ' WIB.');
  Logger.log('Total baris ber-Kode Shift di AKTIF     : ' + total);
  Logger.log('  > Akan DISALIN ke arsip lalu dihapus : ' + pindah);
  Logger.log('      contoh: ' + (sampelPindah.join(', ') || '-'));
  Logger.log('  > SUDAH ADA di arsip (hanya dihapus) : ' + sudahAda);
  Logger.log('      contoh: ' + (sampelSudahAda.join(', ') || '-'));
  Logger.log('  > TETAP di aktif (belum H-' + MIGRASI_H_MINUS + ')         : ' + tetap);
  Logger.log('      contoh: ' + (sampelTetap.join(', ') || '-'));
  Logger.log('Baris tanpa Kode Shift (dilewati)     : ' + tanpaKode);
  Logger.log('Baris yang sudah ada di ARSIP         : ' + Object.keys(adaDiArsip).length);
  Logger.log('Deteksi hantu AKTIF : getLastRow=' + lastRow + ' vs baris terakhir berisi Kode = ' + _lastRowKodeYandalShift_(shAktif));
  Logger.log('Deteksi hantu ARSIP : getLastRow=' + shArsip.getLastRow() + ' vs baris terakhir berisi Kode = ' + _lastRowKodeYandalShift_(shArsip));
  Logger.log('==================================================================');
}

/* =====================================================
   BAGIAN 13: db_Yandal_Pengecekan_Switching (cucu P0)
   Mekanisme SAMA dgn Yandal Shift (BAGIAN 12) — GUARD JENDELA WAKTU tetap dipakai
   (sheet ini ikut disapu sweepWmBacklogY & diproses prosesSwitchingYandal hampir tiap
   menit pada jam aktif), penyesuaian:
     - Kunci dedup/lookup = Kode Switching (kolom E / COL_SWITCHING.kodeSwitching)
       — unik per baris (format <KodeP0>-SWC.<nnn>).
     - Kriteria: Tanggal (kolom H, COL_SWITCHING.tanggal) <= H-2
       + GUARD RANTAI (11 Agu 2026): Kode Pekerjaan P0 induk (kolom D,
       COL_SWITCHING.kodeP0) WAJIB sudah ada di arsip db_Yandal_P0 — anak tidak
       boleh pindah mendahului induknya. Tanggal diisi dari P0 induk (fallback
       lookup prosesSwitchingYandal) -> termigrasi pada usia yang sama dgn P0-nya.
     - Lebar 50 kolom (A..AX); kolom A (No, formula) TIDAK disalin (tulis B..AX).
   Memakai SHEET_YANDAL & COL_SWITCHING dari Tek-Yandal-Code.gs (global scope).
   ===================================================== */

var MIGRASI_CURSOR_PROP_YSW = 'MIGRASI_YANDAL_SWC_CURSOR';

/* Kriteria + GUARD RANTAI: p0DiArsip = index Kode P0 yg SUDAH ada di arsip
   db_Yandal_P0 (dibangun 1x per putaran). Switching hanya pindah bila P0
   induknya (kolom D) SUDAH dipindahkan ke arsip — anak tidak mendahului induk. */
function _lolosKriteriaMigrasiYandalSwc(row, p0DiArsip) {
  var tgl = _normTgl(row[COL_SWITCHING.tanggal]);      // kolom H
  if (!tgl) return false;                          // tanggal kosong/rusak -> biarkan di aktif
  if (tgl > _migrasiBatasTanggal()) return false;  // lebih muda dari H-2 -> tetap di aktif
  var kp0 = String(row[COL_SWITCHING.kodeP0] || '').trim();   // kolom D = Kode Pekerjaan P0 induk
  if (!kp0) return false;                          // tanpa kode P0 induk -> biarkan di aktif
  return p0DiArsip[kp0] === true;                  // P0 induk SUDAH di arsip -> boleh pindah
}

// Baris terakhir yg benar-benar berisi Kode Switching (kolom E) — kebal baris hantu formula kolom A.
function _lastRowKodeYandalSwc_(sh) {
  var last = sh.getLastRow();
  if (last < 2) return 1;
  var col = sh.getRange(2, COL_SWITCHING.kodeSwitching + 1, last - 1, 1).getValues();
  for (var i = col.length - 1; i >= 0; i--) {
    if (String(col[i][0] || '').trim() !== '') return i + 2;
  }
  return 1;
}

/* ===== 1 BATCH MIGRASI db_Yandal_Pengecekan_Switching =====
   force=true utk MEMAKSA jalan di luar jendela (HANYA uji coba manual — hati-hati tabrakan input petugas). */
function migrasiYandalSwcBatch(force) {
  if (MIGRASI_DRY_RUN) Logger.log('⚠️ MODE SIMULASI (DRY RUN) AKTIF — tidak ada data yang disalin/dihapus. Set MIGRASI_DRY_RUN = false utk menjalankan sungguhan.');
  if (!_dalamJendelaMigrasiP0_()) {
    if (force !== true) {
      Logger.log('[migrasiYandalSwc] Di luar jendela (23:55-00:10 / 07:50-08:10 / 15:50-16:10 WIB) — batch DILEWATI, cursor tidak bergerak.');
      return { done: false, skipped: 'di-luar-jendela' };
    }
    Logger.log('⚠️ FORCE: migrasi dijalankan DI LUAR jendela waktu (mode paksa).');
  }
  var R = COL_SWITCHING, LEBAR = R.folderPath + 1;      // 50 kolom (A..AX); kolom A = formula No, TIDAK disalin
  var NAMA = SHEET_YANDAL.SWITCHING;                    // 'db_Yandal_Pengecekan_Switching'
  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) throw new Error(NAMA + ' tidak ditemukan di salah satu file.');

  // 1) INDEX Kode Switching yang SUDAH ada di arsip
  var adaDiArsip = {};
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, R.kodeSwitching + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      var ka = String(colArsip[a][0] || '').trim();
      if (ka) adaDiArsip[ka] = true;
    }
  }

  // 1b) INDEX Kode P0 yang SUDAH ada di arsip db_Yandal_P0 — GUARD RANTAI:
  //     switching hanya boleh pindah bila P0 induknya SUDAH dipindahkan duluan.
  var p0DiArsip = {};
  var shArsipP0 = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(SHEET_YANDAL.P0);
  if (shArsipP0 && shArsipP0.getLastRow() > 1) {
    var colP0 = shArsipP0.getRange(2, COL_P0.kodeP0 + 1, shArsipP0.getLastRow() - 1, 1).getValues();
    for (var p = 0; p < colP0.length; p++) {
      var kp = String(colP0[p][0] || '').trim();
      if (kp) p0DiArsip[kp] = true;
    }
  }

  // 2) Baca batch baris AKTIF dari cursor
  var props = PropertiesService.getScriptProperties();
  var start = parseInt(props.getProperty(MIGRASI_CURSOR_PROP_YSW) || '2', 10);
  var lastRow = shAktif.getLastRow();
  if (start > lastRow) { props.deleteProperty(MIGRASI_CURSOR_PROP_YSW); return { done: true, disalin: 0, dihapus: 0 }; }
  var end = Math.min(start + MIGRASI_BATCH - 1, lastRow);
  var data = shAktif.getRange(start, 1, end - start + 1, LEBAR).getValues();

  // 3) Klasifikasi per mekanisme
  var akanDisalin = [], akanDihapus = [];
  for (var i = 0; i < data.length; i++) {
    var kode = String(data[i][R.kodeSwitching] || '').trim();
    if (!kode) continue;                                   // baris kosong: lewati, JANGAN dihapus
    if (adaDiArsip[kode]) {
      akanDihapus.push(start + i);                         // SUDAH ADA -> hapus saja
    } else if (_lolosKriteriaMigrasiYandalSwc(data[i], p0DiArsip)) {
      akanDisalin.push(data[i].slice(1));                  // salin TANPA kolom A (formula No)
      akanDihapus.push(start + i);                         // setelah tersalin -> hapus di aktif
      adaDiArsip[kode] = true;                             // anti dobel dalam batch yg sama
    }
  }

  // 4) APPEND ke arsip + VERIFIKASI baca balik Kode Switching baris pertama
  if (!MIGRASI_DRY_RUN && akanDisalin.length) {
    var rowStart = _lastRowKodeYandalSwc_(shArsip) + 1;
    shArsip.getRange(rowStart, 2, akanDisalin.length, LEBAR - 1).setValues(akanDisalin);
    SpreadsheetApp.flush();
    var cek = String(shArsip.getRange(rowStart, R.kodeSwitching + 1).getValue() || '').trim();
    // akanDisalin = baris TANPA kolom A (slice(1)) -> Kode Switching (kolom E, idx 4) bergeser ke idx 3 (= R.kodeSwitching - 1)
    if (cek !== String(akanDisalin[0][R.kodeSwitching - 1] || '').trim()) {
      throw new Error('Verifikasi append GAGAL — penghapusan dibatalkan utk batch ini.');
    }
  }

  // 5) HAPUS di aktif dari BAWAH ke ATAS
  if (!MIGRASI_DRY_RUN) {
    akanDihapus.sort(function (a, b) { return b - a; });
    for (var d = 0; d < akanDihapus.length; d++) shAktif.deleteRow(akanDihapus[d]);
    SpreadsheetApp.flush();
  }

  // 6) Cursor berikutnya (batch - jumlahDihapus)
  var nextStart = end + 1 - (MIGRASI_DRY_RUN ? 0 : akanDihapus.length);
  var done = nextStart > shAktif.getLastRow();
  if (done) props.deleteProperty(MIGRASI_CURSOR_PROP_YSW);
  else props.setProperty(MIGRASI_CURSOR_PROP_YSW, String(nextStart));

  Logger.log('[migrasiYandalSwc] batch ' + start + '-' + end +
             ' | disalin=' + akanDisalin.length + ' | dihapus=' + akanDihapus.length +
             ' | next=' + (done ? 'SELESAI' : nextStart) + (MIGRASI_DRY_RUN ? ' [DRY RUN]' : ''));
  return { done: done, disalin: akanDisalin.length, dihapus: akanDihapus.length };
}

/* ===== TRIGGER YANDAL SWITCHING: mulai / tick / berhenti ===== */
function mulaiMigrasiYandalSwc() {
  PropertiesService.getScriptProperties().deleteProperty(MIGRASI_CURSOR_PROP_YSW);
  var trs = ScriptApp.getProjectTriggers();
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === 'migrasiYandalSwcTick') ScriptApp.deleteTrigger(trs[i]);
  ScriptApp.newTrigger('migrasiYandalSwcTick').timeBased().everyMinutes(1).create();
  Logger.log('Migrasi db_Yandal_Pengecekan_Switching DIMULAI (tiap 1 menit, batch ' + MIGRASI_BATCH + ') — proses HANYA di jendela 23:55-00:10 / 07:50-08:10 / 15:50-16:10 WIB.');
}

function migrasiYandalSwcTick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    var r = migrasiYandalSwcBatch();
    if (r && r.done) {
      var trs = ScriptApp.getProjectTriggers();
      for (var i = 0; i < trs.length; i++)
        if (trs[i].getHandlerFunction() === 'migrasiYandalSwcTick') ScriptApp.deleteTrigger(trs[i]);
      Logger.log('Migrasi db_Yandal_Pengecekan_Switching SELESAI -> trigger dilepas.');
    }
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

function hentikanMigrasiYandalSwc() {
  var trs = ScriptApp.getProjectTriggers(), n = 0;
  for (var i = 0; i < trs.length; i++)
    if (trs[i].getHandlerFunction() === 'migrasiYandalSwcTick') { ScriptApp.deleteTrigger(trs[i]); n++; }
  PropertiesService.getScriptProperties().deleteProperty(MIGRASI_CURSOR_PROP_YSW);
  Logger.log('Migrasi Yandal Switching dihentikan, ' + n + ' trigger dilepas, cursor direset.');
}

/* ===== MIGRASI 1 BARIS db_Yandal_Pengecekan_Switching by Kode Switching (uji coba / manual) =====
   Alur sama dgn versi sebelumnya, kunci = Kode Switching (kolom E).
   TIDAK mengecek kriteria H-2, jendela waktu, MAUPUN guard rantai P0 — baris dipilih manual.
   Cara pakai: migrasiSatuBarisYandalSwc('<Kode Switching persis dari kolom E>'); */
function migrasiSatuBarisYandalSwc(kodeSwitching) {
  var R = COL_SWITCHING, LEBAR = R.folderPath + 1, NAMA = SHEET_YANDAL.SWITCHING;
  var key = String(kodeSwitching || '').trim();
  if (!key) return { ok: false, message: 'Kode Switching wajib diisi.' };

  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) return { ok: false, message: 'Sheet ' + NAMA + ' tidak ditemukan di salah satu file.' };

  // 1) Cek keberadaan di ARSIP
  var adaDiArsip = false;
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, R.kodeSwitching + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      if (String(colArsip[a][0] || '').trim() === key) { adaDiArsip = true; break; }
    }
  }

  // 2) Cari nomor baris di AKTIF
  var rowNum = -1;
  if (shAktif.getLastRow() > 1) {
    var colAktif = shAktif.getRange(2, R.kodeSwitching + 1, shAktif.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < colAktif.length; i++) {
      if (String(colAktif[i][0] || '').trim() === key) { rowNum = i + 2; break; }
    }
  }
  if (rowNum < 0) {
    Logger.log('[migrasiSatuBarisYandalSwc] "' + key + '" TIDAK ditemukan di file AKTIF — tidak ada yang diproses. Ambil nilai persis dari kolom E db_Yandal_Pengecekan_Switching.');
    return { ok: true, mode: 'tidak-ada-di-aktif', kodeSwitching: key, sudahDiArsip: adaDiArsip };
  }

  var mode;
  if (adaDiArsip) {
    mode = 'hapus-duplikat';
  } else {
    var rowData = shAktif.getRange(rowNum, 1, 1, LEBAR).getValues()[0].slice(1);   // B..AX (tanpa kolom A)
    var rowBaru = _lastRowKodeYandalSwc_(shArsip) + 1;
    shArsip.getRange(rowBaru, 2, 1, LEBAR - 1).setValues([rowData]);
    SpreadsheetApp.flush();
    var cek = String(shArsip.getRange(rowBaru, R.kodeSwitching + 1).getValue() || '').trim();
    if (cek !== key) {
      throw new Error('Verifikasi append GAGAL utk ' + key + ' — baris di aktif TIDAK dihapus.');
    }
    mode = 'disalin';
  }

  // 3) Hapus baris di AKTIF
  shAktif.deleteRow(rowNum);
  SpreadsheetApp.flush();
  Logger.log('[migrasiSatuBarisYandalSwc] ' + key + ' -> ' + mode + ' (baris aktif ' + rowNum + ' dihapus)');
  return { ok: true, mode: mode, kodeSwitching: key, barisAktifDihapus: rowNum };
}

/* ===== PREVIEW db_Yandal_Pengecekan_Switching (read-only, aman — bebas jendela waktu) ===== */
function previewMigrasiYandalSwc() {
  var R = COL_SWITCHING, LEBAR = R.folderPath + 1, NAMA = SHEET_YANDAL.SWITCHING;
  var shAktif = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NAMA);
  var shArsip = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(NAMA);
  if (!shAktif || !shArsip) { Logger.log('Sheet ' + NAMA + ' tidak ditemukan di salah satu file.'); return; }

  var adaDiArsip = {};
  if (shArsip.getLastRow() > 1) {
    var colArsip = shArsip.getRange(2, R.kodeSwitching + 1, shArsip.getLastRow() - 1, 1).getValues();
    for (var a = 0; a < colArsip.length; a++) {
      var ka = String(colArsip[a][0] || '').trim();
      if (ka) adaDiArsip[ka] = true;
    }
  }

  // INDEX Kode P0 di arsip db_Yandal_P0 (GUARD RANTAI) — utk menandai switching yg P0-nya belum pindah
  var p0DiArsip = {};
  var shArsipP0 = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(SHEET_YANDAL.P0);
  if (shArsipP0 && shArsipP0.getLastRow() > 1) {
    var colP0 = shArsipP0.getRange(2, COL_P0.kodeP0 + 1, shArsipP0.getLastRow() - 1, 1).getValues();
    for (var p = 0; p < colP0.length; p++) {
      var kp = String(colP0[p][0] || '').trim();
      if (kp) p0DiArsip[kp] = true;
    }
  }

  var batas = _migrasiBatasTanggal();
  var total = 0, pindah = 0, sudahAda = 0, tetap = 0, tanpaKode = 0, indukBelum = 0;
  var sampelPindah = [], sampelSudahAda = [], sampelTetap = [];
  var lastRow = shAktif.getLastRow();
  if (lastRow > 1) {
    var data = shAktif.getRange(2, 1, lastRow - 1, LEBAR).getValues();
    for (var i = 0; i < data.length; i++) {
      var kode = String(data[i][R.kodeSwitching] || '').trim();
      if (!kode) { tanpaKode++; continue; }
      total++;
      var label = kode + ' (' + _normTgl(data[i][R.tanggal]) + ' | ' + (String(data[i][R.namaSwitching] || '').trim() || '-') + ')';
      if (adaDiArsip[kode]) {
        sudahAda++;
        if (sampelSudahAda.length < 5) sampelSudahAda.push(label);
      } else if (_lolosKriteriaMigrasiYandalSwc(data[i], p0DiArsip)) {
        pindah++;
        if (sampelPindah.length < 5) sampelPindah.push(label);
      } else {
        tetap++;
        // Pecah alasan tertahan: lolos tanggal TAPI P0 induk (kolom D) belum ada di arsip.
        var kp0 = String(data[i][R.kodeP0] || '').trim();
        if (_normTgl(data[i][R.tanggal]) <= batas && !(kp0 && p0DiArsip[kp0])) indukBelum++;
        if (sampelTetap.length < 5) sampelTetap.push(label);
      }
    }
  }

  Logger.log('================ PREVIEW MIGRASI db_Yandal_Pengecekan_Switching ================');
  Logger.log('Batas tanggal (H-' + MIGRASI_H_MINUS + '): ' + batas + ' — baris dgn Tanggal (kolom H) <= ' + batas + ' DAN Kode P0 induk (kolom D) sudah ada di arsip db_Yandal_P0 yang akan dipindah.');
  Logger.log('Guard jendela saat ini: ' + (_dalamJendelaMigrasiP0_() ? 'DI DALAM jendela (batch boleh jalan)' : 'DI LUAR jendela (batch DILEWATI)') + ' — sekarang ' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'HH:mm') + ' WIB.');
  Logger.log('Total baris ber-Kode Switching di AKTIF: ' + total);
  Logger.log('  > Akan DISALIN ke arsip lalu dihapus : ' + pindah);
  Logger.log('      contoh: ' + (sampelPindah.join(', ') || '-'));
  Logger.log('  > SUDAH ADA di arsip (hanya dihapus) : ' + sudahAda);
  Logger.log('      contoh: ' + (sampelSudahAda.join(', ') || '-'));
  Logger.log('  > TETAP di aktif                     : ' + tetap + '  (lolos tanggal tapi P0 induk belum pindah: ' + indukBelum + ' — otomatis menyusul putaran berikutnya)');
  Logger.log('      contoh: ' + (sampelTetap.join(', ') || '-'));
  Logger.log('Baris tanpa Kode Switching (dilewati): ' + tanpaKode);
  Logger.log('Baris yang sudah ada di ARSIP        : ' + Object.keys(adaDiArsip).length);
  Logger.log('Deteksi hantu AKTIF : getLastRow=' + lastRow + ' vs baris terakhir berisi Kode = ' + _lastRowKodeYandalSwc_(shAktif));
  Logger.log('Deteksi hantu ARSIP : getLastRow=' + shArsip.getLastRow() + ' vs baris terakhir berisi Kode = ' + _lastRowKodeYandalSwc_(shArsip));
  Logger.log('==================================================================');
}

/* =====================================================
   ORKESTRASI TRIGGER GABUNGAN — hemat kuota 20 trigger/script
   (Dibuat 11 Agu 2026, menjawab error "This script has too many triggers")

   Latar: project ini punya ±16 trigger rutin; batas Apps Script = MAKS 20 per script.
   Solusi: fungsi ringan digabung ke SATU tick 1-menit dgn GERBANG INTERVAL per tugas
   (tiap tugas tetap punya cadence sendiri, dilacak via timestamp terakhir-jalan).
   Yang BERAT & sensitif latensi (drainAntreanP0 — panggilan engine watermark) TETAP
   terpisah agar tugas lain tidak mengantre di belakangnya.

   PASANG SEKALI: jalankan pasangTriggerGabunganSiSi() dari editor.
   Rollback: lepasTriggerGabunganSiSi(), lalu jalankan ulang fungsi create*Trigger()
   asli tiap modul (createWmDrainTriggerY, createPointP0DrainTriggerY,
   createLaporanDrainTrigger, pasangTriggerLaporanHarian, createRankTriggerY, dll).
   ===================================================== */

/* Daftar tugas tick gabungan. tiapMenit = interval minimal antar eksekusi tugas itu.
   Urutan = prioritas saat waktu sempit (ringan & sering di atas; berat & jarang di bawah).
   Tambah/kurangi tugas cukup edit tabel ini. */
var TICK_GABUNGAN_DAFTAR = [
  { fn: 'recalcTick',                  tiapMenit: 1  },   // antrean recalc db_Recalc_Queue (Code.gs)
  { fn: 'drainLaporanDirty',           tiapMenit: 1  },   // antrean rebuild laporan dirty-flag (Tek-LapUP3UIWHarian.gs)
  { fn: 'drainFotoRow',                tiapMenit: 1  },   // antrean foto ROW (Tek-ROW.gs)
  { fn: 'sweepPointP0Yandal',          tiapMenit: 1,  berat: true },   // backstop Point P0 (Tek-Yandal-Code.gs) — baca penuh sheet P0
  { fn: 'refreshLaporanHarianHariIni', tiapMenit: 1,  berat: true },   // backstop laporan hari ini (Tek-LapUP3UIWHarian.gs) — 11 Agu: dinaikkan 15 mnt -> 1 mnt (laporan selalu segar)
  { fn: 'refreshWaHarian',             tiapMenit: 1,  berat: true },   // backstop WA sweep db_Global_Header H & H-1 (Code.gs) — 12 Agu: dipindah dari harian 00:30 -> tiap 1 mnt (WA selalu segar)
  { fn: 'validasiUlangFotoTemuan',     tiapMenit: 5  },   // validasi ulang foto temuan (Tek-Temuan.gs) — sesuaikan bila interval aslinya beda
  { fn: 'pingEngineY',                 tiapMenit: 5  },   // keep-warm engine watermark (Tek-Yandal-Code.gs)
  { fn: 'sweepEksekusiRowBacklog',     tiapMenit: 60, berat: true },   // sweep backlog eksekusi ROW mundur 7 hari (Tek-ROW.gs)
  { fn: 'refreshLaporanHarianROW',     tiapMenit: 60, berat: true }    // rebuild db_ROW_Lap_Harian (Tek-ROW.gs) — menggantikan trigger hourly + harian 18:00
];
var TICK_GABUNGAN_PROP = 'TICK_GABUNGAN_LAST';   // JSON { namaFn: lastRunMs }
var TICK_GABUNGAN_MUTEX_PROP = 'TICK_GABUNGAN_MUTEX';   // timestamp tick yg sedang jalan (anti-overlap TANPA LockService)

/* Handler trigger gabungan (tiap 1 menit). Master TIDAK memegang lock saat menjalankan
   tugas (tiap tugas punya lock sendiri); overlap dicegah gerbang interval + lock tugas. */
function tickGabunganSiSi() {
  var props = PropertiesService.getScriptProperties();
  // MUTEX via Properties (BUKAN LockService — agar lock internal tiap tugas tidak terganggu):
  // tick yg masih jalan -> tick berikutnya dilewati; tick mati > 6,5 mnt (terpotong batas
  // 6 mnt Apps Script) dianggap hang & boleh diambil alih.
  var mutex = parseInt(props.getProperty(TICK_GABUNGAN_MUTEX_PROP) || '0', 10);
  if (mutex && Date.now() - mutex < 390000) return;
  props.setProperty(TICK_GABUNGAN_MUTEX_PROP, String(Date.now()));
  try {
    var last = {};
    try { last = JSON.parse(props.getProperty(TICK_GABUNGAN_PROP) || '{}'); } catch (eJ) { last = {}; }
    var now = Date.now(), t0 = now, jalan = 0;
    for (var i = 0; i < TICK_GABUNGAN_DAFTAR.length; i++) {
      var t = TICK_GABUNGAN_DAFTAR[i];
      if (now - (last[t.fn] || 0) < t.tiapMenit * 60000 - 5000) continue;   // belum jadwalnya -> loncati
      var elapsed = Date.now() - t0;
      // Tugas BERAT hanya DIMULAI bila sisa waktu masih besar (loncati & coba tick berikutnya bila
      // tidak) — mencegah eksekusi terpotong batas 6 mnt di tengah tugas (= status error di Pemicu).
      if (t.berat ? elapsed > 150000 : elapsed > 240000) {
        Logger.log('[tickGabungan] plafon waktu — sisa tugas lanjut menit berikutnya.');
        break;
      }
      var f = this[t.fn];
      if (typeof f !== 'function') { Logger.log('[tickGabungan] ' + t.fn + ' tidak ada (modul belum terpasang?) — diloncati.'); last[t.fn] = now; continue; }
      try { f.call(this); jalan++; }
      catch (eF) { Logger.log('[tickGabungan] ' + t.fn + ' ERROR — ' + eF); }
      last[t.fn] = Date.now();
    }
    props.setProperty(TICK_GABUNGAN_PROP, JSON.stringify(last));
    if (jalan) Logger.log('[tickGabungan] menjalankan ' + jalan + ' tugas.');
  } finally {
    try { props.deleteProperty(TICK_GABUNGAN_MUTEX_PROP); } catch (eM) {}
  }
}

/* Trigger HARIAN gabungan (00:30 WIB): menggantikan trigger harian terpisah
   (ensureLaporanHarianHariIni 00:00, sinkronRankYandal 00:30, mulaiMigrasiSemua 01:00).
   mulaiMigrasiSemua dijalankan TERAKHIR (hanya memasang trigger tick migrasi — instan).
   12 Agu 2026: refreshWaHarian DIPINDAH ke tick gabungan (tiap 1 menit) — sweep WA
   db_Global_Header kini berjalan terus sepanjang hari, bukan lagi hanya 1×/hari 00:30. */
function harianGabunganSiSi() {
  var urut = ['ensureLaporanHarianHariIni', 'sinkronRankYandal', 'mulaiMigrasiSemua'];
  var t0 = Date.now();
  for (var i = 0; i < urut.length; i++) {
    var f = this[urut[i]];
    if (typeof f !== 'function') { Logger.log('[harianGabungan] ' + urut[i] + ' tidak ada — diloncati.'); continue; }
    try { f.call(this); Logger.log('[harianGabungan] ' + urut[i] + ' OK'); }
    catch (eF) { Logger.log('[harianGabungan] ' + urut[i] + ' ERROR — ' + eF); }
    if (Date.now() - t0 > 300000) { Logger.log('[harianGabungan] plafon 5 mnt — sisa tugas (' + urut.slice(i + 1).join(', ') + ') tidak dijalankan hari ini.'); break; }
  }
}

/* PASANG SEKALI dari editor: melepas SEMUA trigger lama yg tergabung + memasang 2 trigger:
     - tickGabunganSiSi   : tiap 1 menit (dgn gerbang interval per tugas)
     - harianGabunganSiSi : tiap hari 00:30 WIB
   TIDAK disentuh: drainAntreanP0 (1 mnt, sengaja terpisah krn berat), migrasiSemuaTick
   (milik migrasi), jalankanPerbaikanMassalKodeROWMenit (job satu-kali — HAPUS manual di
   ⏰ Triggers bila pekerjaannya sudah selesai). */
function pasangTriggerGabunganSiSi() {
  var lepas = ['recalcTick','drainLaporanDirty','drainFotoRow','sweepPointP0Yandal','validasiUlangFotoTemuan',
               'pingEngineY','refreshLaporanHarianHariIni','sweepEksekusiRowBacklog','refreshLaporanHarianROW',
               'ensureLaporanHarianHariIni','refreshWaHarian','sinkronRankYandal','mulaiMigrasiSemua',
               'tickGabunganSiSi','harianGabunganSiSi'];
  var trs = ScriptApp.getProjectTriggers(), n = 0;
  for (var i = 0; i < trs.length; i++) {
    if (lepas.indexOf(trs[i].getHandlerFunction()) >= 0) { ScriptApp.deleteTrigger(trs[i]); n++; }
  }
  ScriptApp.newTrigger('tickGabunganSiSi').timeBased().everyMinutes(1).create();
  ScriptApp.newTrigger('harianGabunganSiSi').timeBased().atHour(0).nearMinute(30).everyDays(1).inTimezone('Asia/Jakarta').create();
  var msg = 'Trigger gabungan terpasang: tickGabunganSiSi (1 mnt) + harianGabunganSiSi (00:30). ' + n + ' trigger lama dilepas. Sisa terpisah: drainAntreanP0 + migrasiSemuaTick.';
  Logger.log(msg);
  return msg;
}

/* Lepas 2 trigger gabungan & kosongkan state (utk rollback ke trigger per-modul). */
function lepasTriggerGabunganSiSi() {
  var trs = ScriptApp.getProjectTriggers(), n = 0;
  for (var i = 0; i < trs.length; i++) {
    var f = trs[i].getHandlerFunction();
    if (f === 'tickGabunganSiSi' || f === 'harianGabunganSiSi') { ScriptApp.deleteTrigger(trs[i]); n++; }
  }
  PropertiesService.getScriptProperties().deleteProperty(TICK_GABUNGAN_PROP);
  Logger.log('Trigger gabungan dilepas: ' + n + '. Pasang ulang trigger per modul via fungsi create*Trigger masing-masing.');
  return n;
}