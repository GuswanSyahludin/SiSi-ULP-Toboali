/* ═════════════════════════════════════
   Tek-ROW.gs — SiSi ULP Toboali (MODUL ROW)
   Fungsi: Dropdown ROW, Data Eksekusi ROW, Laporan Harian ROW,
           Refresh/trigger laporan, Teruskan Temuan -> ROW (TO ROW).
   Konstanta & helper bersama ada di Code.gs (Inti).
   Catatan lintas-file (global scope, tanpa import):
     - _sectionRange & topologi ada di Tek-Temuan.gs
     - _getOrCreateFolderByPath / _uploadFotoTemuan & _BULAN_ID_INS ada di Tek-Temuan.gs
     - _jenisPekerjaan / _findRowTemuan / _normTgl / _kodeUlpByUlp ada di Code.gs (Inti)
     - DUAL-READ (migrasi arsip, 7 Agu 2026): _aggregateForTim & getSemuaLaporan membaca
       db_ROW_Realisasi dari AKTIF + ARSIP via _readSheetDual_() (helper ada di Tek-Migrasi.gs).
       CATATAN: refreshLaporanHarianROW SENGAJA belum dual-read — aktifkan hanya setelah
       migrasi db_ROW_Eksekusi selesai & arsipnya bersih (patch di halaman Tek-Migrasi bagian 5).
     - Rev 9 Agu 2026: GUARD migrasi _tglSudahDiarsip_ terpasang di 4 titik (sweepEksekusiRowBacklog,
       recalcEksekusiROW, _ensureRealisasiInduk, _ensureHeaderRow) — tanggal <= H-2 tidak dibuat ulang.
       sweepEksekusiRowBacklog & recalcEksekusiROW kini membaca db_INS_Temuan DUAL (AKTIF+ARSIP)
       via _readSheetDual_() — migrasi Temuan tanpa kriteria tanggal (BAGIAN 4 Tek-Migrasi.gs).
═════════════════════════════════════ */


/* ═══ PETA KOLOM db_ROW_Eksekusi (0-based, 30 kolom) ═══
   PENTING: selalu pakai NAMA (COL_ROW.xxx), JANGAN angka, agar aman bila kolom bertambah. */
var COL_ROW = {
  no: 0, kodeHeader: 1, kodePekerjaan: 2, kodeEksekusi: 3, ulp: 4, hari: 5,
  tanggal: 6, tim: 7, penyulang: 8, section: 9, nomorTiang: 10,
  koordinatTiang: 11, latTiang: 12, longTiang: 13,
  koordinatPekerjaan: 14, latPekerjaan: 15, longPekerjaan: 16,
  fotoSebelum: 17, fotoSebelumUrl: 18, fotoPekerjaan: 19, fotoPekerjaanUrl: 20,
  fotoSesudah: 21, fotoSesudahUrl: 22, diameter: 23, jenisPekerjaan: 24,
  tampilFotoSebelum: 25, tampilFotoPekerjaan: 26, tampilFotoSesudah: 27,
  inputOleh: 28, timestamp: 29
};
var COL_ROW_N = 30; // jumlah kolom db_ROW_Eksekusi

/* ═══ PETA KOLOM db_ROW_Realisasi (0-based, 13 kolom) — INDUK db_ROW_Eksekusi ═══ */
var COL_ROW_RLZ = {
  no: 0, kodeHeader: 1, kodePekerjaan: 2, hari: 3, tanggal: 4, tim: 5, penyulang: 6,
  section: 7, rabas: 8, sedang: 9, besar: 10, inputOleh: 11, timestamp: 12
};
var COL_ROW_RLZ_N = 13; // jumlah kolom db_ROW_Realisasi


/* ═══ GUARD: apakah sebuah tim termasuk Tim ROW? ═══
   Kriteria (sesuai permintaan): cukup nama tim MENGANDUNG kata "ROW" (case-insensitive),
   mis. "ROW", "ROW 01".."ROW 04", atau "Tim ROW". Dipakai prosesEksekusiROW agar auto-buat
   Kode Header / Kode Pekerjaan / Kode Eksekusi HANYA berjalan untuk Tim ROW. */
function _isTimROW_(tim) {
  return String(tim || '').toLowerCase().indexOf('row') >= 0;
}


/* ═══ DROPDOWN ROW ═══ */
function getDropdownROW() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    /* Penyulang */
    var peny = [], penySet = {};
    var shP  = ss.getSheetByName('db_Penyulang');
    if (shP && shP.getLastRow() > 1) {
      var dp = shP.getRange(2, 1, shP.getLastRow() - 1, 3).getValues();
      for (var i = 0; i < dp.length; i++) {
        var p = String(dp[i][2] || '').trim(); // C
        if (p && !penySet[p]) { penySet[p] = true; peny.push(p); }
      }
    }

    /* Section */
    var sec = [];
    var shS = ss.getSheetByName('db_Section');
    if (shS && shS.getLastRow() > 1) {
      var ds = shS.getRange(2, 1, shS.getLastRow() - 1, 2).getValues();
      for (var j = 0; j < ds.length; j++) {
        var s = String(ds[j][1] || '').trim(); // B
        if (s) sec.push(s);
      }
    }

    /* ULP & Tim dari db_Tim (cascade) */
    var ulpSet = {}, timByUlp = {};
    var shT = ss.getSheetByName('db_Tim');
    if (shT && shT.getLastRow() > 1) {
      var dt = shT.getRange(2, 1, shT.getLastRow() - 1, 4).getValues();
      for (var k = 0; k < dt.length; k++) {
        var ulpVal = String(dt[k][1] || '').trim(); // B
        var timVal = String(dt[k][3] || '').trim(); // D
        if (!ulpVal || !timVal) continue;
        ulpSet[ulpVal] = 1;
        if (!timByUlp[ulpVal]) timByUlp[ulpVal] = [];
        if (timByUlp[ulpVal].indexOf(timVal) === -1) timByUlp[ulpVal].push(timVal);
      }
    }
    var ulpList = Object.keys(ulpSet).sort();
    ulpList.forEach(function(u){ timByUlp[u].sort(); });

    return { success: true, penyulang: peny.sort(), section: sec.sort(),
             ulp: ulpList, timByUlp: timByUlp };
  } catch(e) {
    return { success: false, penyulang: [], section: [], ulp: [], timByUlp: {}, message: e.message };
  }
}


/* ═══ DATA ROW — BACA ═══ */
function getDataROW(limit, tglMulai, tglAkhir) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName('db_ROW_Eksekusi');
    if (!sh) return { rows: [], message: 'Sheet db_ROW_Eksekusi tidak ditemukan' };

    var lastRow = sh.getLastRow();
    if (lastRow < 2) return { rows: [], truncated: false, total: 0 };

    var data = sh.getRange(1, 1, lastRow, COL_ROW_N).getValues();
    var maxR = Math.min(Number(limit) || 200, 200);
    var tz   = Session.getScriptTimeZone();
    var rows = [];

    var dMulai = tglMulai ? new Date(tglMulai + 'T00:00:00') : null;
    var dAkhir = tglAkhir ? new Date(tglAkhir + 'T23:59:59') : null;
    var filterTgl = (dMulai !== null || dAkhir !== null);

    for (var i = 1; i < data.length; i++) {
      var r = data[i];
      if (!r[COL_ROW.kodeEksekusi] && !r[COL_ROW.nomorTiang]) continue;

      if (filterTgl) {
        if (!r[COL_ROW.tanggal]) continue;
        var tglStr = '';
        try {
          tglStr = r[COL_ROW.tanggal] instanceof Date
            ? Utilities.formatDate(r[COL_ROW.tanggal], tz, 'yyyy-MM-dd')
            : String(r[COL_ROW.tanggal]).substring(0, 10);
        } catch(e) { continue; }
        var tgl = new Date(tglStr + 'T00:00:00');
        if (isNaN(tgl.getTime())) continue;
        if (dMulai && tgl < dMulai) continue;
        if (dAkhir && tgl > dAkhir) continue;
      }

      var tanggal = '';
      try {
        tanggal = r[COL_ROW.tanggal] instanceof Date
          ? Utilities.formatDate(r[COL_ROW.tanggal], tz, 'yyyy-MM-dd')
          : String(r[COL_ROW.tanggal] || '');
      } catch(e) { tanggal = ''; }

      rows.push([
        r[COL_ROW.no],
        String(r[COL_ROW.kodeEksekusi] ||''), String(r[COL_ROW.ulp] ||''), String(r[COL_ROW.nomorTiang] ||''),
        '','','','','','','',
        String(r[COL_ROW.fotoSebelumUrl]   || ''), '',
        String(r[COL_ROW.fotoPekerjaanUrl] || ''), '',
        String(r[COL_ROW.fotoSesudahUrl]   || ''),
        (r[COL_ROW.diameter] !== '' && r[COL_ROW.diameter] !== null) ? Number(r[COL_ROW.diameter]) : '',
        String(r[COL_ROW.tim] ||''), tanggal, String(r[COL_ROW.penyulang] ||''),
        String(r[COL_ROW.section] ||''), String(r[COL_ROW.jenisPekerjaan] ||'')
      ]);
      if (rows.length >= maxR) break;
    }

    return { rows: rows, truncated: rows.length >= maxR && (lastRow - 1) > maxR, total: lastRow - 1 };
  } catch(e) {
    Logger.log('[getDataROW] ERROR: ' + e.message);
    return { rows: [], message: 'Error: ' + e.message };
  }
}

function getFotoROW(nomorBaris) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName('db_ROW_Eksekusi');
    if (!sh) return { success: false, message: 'Sheet tidak ditemukan' };

    var lastRow = sh.getLastRow();
    if (lastRow < 2) return { success: false, message: 'Data kosong' };

    var data = sh.getRange(2, 1, lastRow - 1, COL_ROW_N).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][COL_ROW.no]) !== String(nomorBaris)) continue;
      return {
        success: true,
        fotoSbl: String(data[i][COL_ROW.fotoSebelumUrl]   || ''),
        fotoPkj: String(data[i][COL_ROW.fotoPekerjaanUrl] || ''),
        fotoSsd: String(data[i][COL_ROW.fotoSesudahUrl]   || '')
      };
    }
    return { success: false, message: 'Baris tidak ditemukan' };
  } catch(e) {
    return { success: false, message: e.message };
  }
}


/* ═══ DATA ROW — SIMPAN (input langsung) ═══ */
function simpanDataROW(payload) {
  /* OTENTIKASI + SKOP ULP (29 Agu 2026).
     Sebelumnya: token bersifat OPSIONAL, dan `payload.ulp` yang dikirim klien
     SELALU mengalahkan ULP sesi (`var ulp = payload.ulp || ''` — tanpa token
     pun proses tetap berjalan). Jadi siapa pun bisa menulis eksekusi ROW atas
     nama ULP mana pun, bahkan tanpa login. */
  var gAks = guard_(arguments, { ulp: true, aksi: 'simpanDataROW' });
  try {
    if (!payload) return { success: false, message: 'Payload kosong' };

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName('db_ROW_Eksekusi');
    if (!sh) return { success: false, message: 'Sheet db_ROW_Eksekusi tidak ditemukan' };

    /* ULP dari SESI. payload.ulp hanya dihormati untuk Super User. */
    var ulp = ulpScope_(gAks, payload.ulp) || String(gAks.ulp || '').trim();
    if (!ulp) return { success: false, message: 'Akun belum terhubung ke ULP.' };

    var now     = new Date();
    var tz      = Session.getScriptTimeZone();
    var tanggal = payload.tanggal ? new Date(payload.tanggal) : now;
    if (isNaN(tanggal.getTime())) tanggal = now;
    var tglStr  = Utilities.formatDate(tanggal, tz, 'yyyy-MM-dd');

    var kodeUlp          = _kodeUlpByUlp(ss, ulp);
    var kodePekerjaanRow = String(payload.kodePekerjaanRow || '').trim(); // turunan db_ROW_Realisasi (opsional)
    var kodeHeaderRow    = String(payload.kodeHeader || '').trim();       // induk header (opsional)
    var timRow           = String(payload.tim || '').trim();
    var penyulangRow     = String(payload.penyulang || '').trim();
    var sectionRow       = String(payload.section || '').trim();
    var inputByRow       = String(payload.inputOleh || payload.tim || '').trim();

    // AUTO-BUAT AYAH (db_Global_Header) + ANAK (db_ROW_Realisasi) PADA INPUT LANGSUNG:
    // Bila Kode Pekerjaan realisasi TIDAK dikirim (input eksekusi langsung tanpa header) TAPI
    // tim termasuk Tim ROW & Penyulang terisi, cari/buat induk realisasi via _ensureRealisasiInduk
    // (yang otomatis membuat header db_Global_Header bila belum ada). Dari sini diperoleh
    // Kode Header + Kode Pekerjaan induk sehingga eksekusi langsung TERTAUT ke ayah+anak.
    // (Tanpa langkah ini, simpanDataROW dulu hanya menulis baris eksekusi tanpa membuat header/realisasi.)
    if(!kodePekerjaanRow && _isTimROW_(timRow) && penyulangRow){
      try {
        var indukLangsung = _ensureRealisasiInduk(ss, {
          tim: timRow, penyulang: penyulangRow, tanggal: tglStr,
          section: sectionRow, ulp: ulp, inputOleh: inputByRow
        });
        if(indukLangsung && indukLangsung.kodePekerjaan){
          kodePekerjaanRow = indukLangsung.kodePekerjaan;
          if(indukLangsung.kodeHeader) kodeHeaderRow = indukLangsung.kodeHeader;
        }
      } catch(eInduk){ Logger.log('[simpanDataROW] auto-buat ayah+anak gagal: ' + eInduk.message); }
    }

    // Kode Eksekusi berantai dari Kode Pekerjaan realisasi: <KodePekerjaan>-EKS.<urut3>.
    // Bila Kode Pekerjaan realisasi tetap tidak tersedia (mis. bukan Tim ROW / Penyulang kosong),
    // pakai format mandiri lama ROW-EKS-<KodeULP><YYYYMMDD><urut3> agar kode tetap terisi.
    var kodeEksekusi;
    if(kodePekerjaanRow){
      kodeEksekusi = _generateKodeEksekusiRow(ss, kodePekerjaanRow);
    } else {
      var pfx = 'ROW-EKS-' + String(kodeUlp||'').trim() + _normTgl(tglStr).replace(/-/g,'');
      var nE = 0;
      if(sh && sh.getLastRow() > 1){
        var colE = sh.getRange(2, COL_ROW.kodeEksekusi + 1, sh.getLastRow() - 1, 1).getValues();
        for(var ie=0;ie<colE.length;ie++){ if(String(colE[ie][0]||'').indexOf(pfx) === 0) nE++; }
      }
      kodeEksekusi = pfx + ('00'+(nE+1)).slice(-3);
    }

    var baris = new Array(COL_ROW_N).fill('');
    // Kolom No (A) sengaja TIDAK diisi -> dihitung formula COUNTA di sheet.
    baris[COL_ROW.kodeHeader]     = kodeHeaderRow;
    baris[COL_ROW.kodePekerjaan]  = kodePekerjaanRow;
    baris[COL_ROW.kodeEksekusi]   = kodeEksekusi;
    baris[COL_ROW.ulp]            = ulp;
    baris[COL_ROW.hari]           = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][tanggal.getDay()];
    baris[COL_ROW.tanggal]        = tanggal;
    /* Teks bebas dari pengguna -> lindungi dari formula injection.
       Kolom-kolom ini tampil di rekap, WA, dan PDF ekspor. */
    baris[COL_ROW.tim]            = safeCell_(String(payload.tim || ''));
    baris[COL_ROW.penyulang]      = safeCell_(String(payload.penyulang || ''));
    baris[COL_ROW.section]        = safeCell_(String(payload.section || ''));
    baris[COL_ROW.nomorTiang]     = safeCell_(String(payload.nomorTiang || ''));
    baris[COL_ROW.diameter]       = Number(payload.diameter) || 0;
    baris[COL_ROW.jenisPekerjaan] = safeCell_(String(payload.jenis || ''));
    /* Pencatat diambil dari SESI, bukan payload.inputOleh yang dikirim klien. */
    baris[COL_ROW.inputOleh]      = String(gAks.username || '');
    baris[COL_ROW.timestamp]      = now;
    // Koordinat & foto tidak wajib pada input langsung (boleh diisi via AppSheet/tombol).

    // Tulis B..AC saja; kolom A (No) dibiarkan untuk formula COUNTA di sheet.
    var targetRow = sh.getLastRow() + 1;
    sh.getRange(targetRow, 2, 1, COL_ROW_N - 1).setValues([baris.slice(1)]);
    SpreadsheetApp.flush();

    return { success: true, kodeEksekusi: kodeEksekusi, kodePekerjaan: kodeEksekusi };
  } catch(e) {
    return { success: false, message: e.message };
  }
}


/* ═══ LAPORAN — REKAP PER TIM (Tab 2) ═══
   PERBAIKAN: baca LANGSUNG dari db_ROW_Realisasi (induk), BUKAN db_ROW_All_Lap_Harian.
   Alasan: db_ROW_All_Lap_Harian dibangun refreshViewLaporan yg (a) tdk punya trigger
   -> sering basi/kosong, (b) hanya memuat eksekusi ber-foto-lengkap, (c) hanya memuat
   Tim+Tanggal yg SUDAH punya baris db_ROW_Lap_Harian. Akibatnya rekap sering kosong.
   db_ROW_Realisasi selalu terisi & disinkronkan dari eksekusi oleh recalcEksekusiROW.
   Output tetap 18 kolom (urutan sama) agar frontend Tab 2 tidak perlu diubah:
   [No,Tim,Hari,Tanggal,KoordAwal,KoordAkhir,KMSeb,KMSes,Total,
    TotBulR,TotBulS,TotBulB,Penyulang,Section,Rabas,Sedang,Besar,Kendala] */
function getSemuaLaporan(tglMulai, tglAkhir, tim, penyulang) {
  try {
    // DUAL-READ (migrasi arsip): db_ROW_Realisasi dibaca dari AKTIF + ARSIP via
    // _readSheetDual_() (Tek-Migrasi.gs) agar rekap & total bulanan tidak putus di batas H-2.
    var RL = COL_ROW_RLZ;
    var data = _readSheetDual_('db_ROW_Realisasi', RL.kodePekerjaan, COL_ROW_RLZ_N);

    var fDari   = tglMulai ? _normTanggal(tglMulai) : '';
    var fSampai = tglAkhir ? _normTanggal(tglAkhir) : '';
    var fTim    = tim       ? String(tim).trim().toLowerCase()       : '';
    var fPeny   = penyulang ? String(penyulang).trim().toLowerCase() : '';

    // 1) Total bulanan per Tim+Bulan (tidak terpengaruh filter penyulang/tanggal harian).
    var totBul = {};
    for (var b = 0; b < data.length; b++) {
      var rb = data[b];
      if (!String(rb[RL.kodePekerjaan]||'').trim() && !String(rb[RL.kodeHeader]||'').trim()) continue;
      var tB = _normTanggal(rb[RL.tanggal]);
      if (!tB) continue;
      var k = String(rb[RL.tim]||'').trim().toLowerCase() + '|' + tB.substring(0, 7);
      if (!totBul[k]) totBul[k] = { r: 0, s: 0, b: 0 };
      totBul[k].r += Number(rb[RL.rabas])  || 0;
      totBul[k].s += Number(rb[RL.sedang]) || 0;
      totBul[k].b += Number(rb[RL.besar])  || 0;
    }

    // 2) Baris detail terfilter.
    var rows = [], no = 1;
    for (var i = 0; i < data.length; i++) {
      var r = data[i];
      if (!String(r[RL.kodePekerjaan]||'').trim() && !String(r[RL.kodeHeader]||'').trim()) continue;

      var tglStr = _normTanggal(r[RL.tanggal]);
      var timR   = String(r[RL.tim] || '').trim();
      var penyR  = String(r[RL.penyulang] || '').trim();

      if (fDari   && (!tglStr || tglStr < fDari))   continue;
      if (fSampai && (!tglStr || tglStr > fSampai)) continue;
      if (fTim  && timR.toLowerCase()  !== fTim)  continue;
      if (fPeny && penyR.toLowerCase() !== fPeny) continue;

      var rabas  = Number(r[RL.rabas])  || 0;
      var sedang = Number(r[RL.sedang]) || 0;
      var besar  = Number(r[RL.besar])  || 0;
      var tb = totBul[timR.toLowerCase() + '|' + (tglStr ? tglStr.substring(0,7) : '')] || { r:0, s:0, b:0 };

      rows.push([
        no++, timR, String(r[RL.hari] || ''), tglStr,
        '-', '-', '-', '-',
        rabas + sedang + besar,
        tb.r, tb.s, tb.b,
        penyR, String(r[RL.section] || ''),
        rabas, sedang, besar, ''
      ]);
    }
    return { rows: rows };
  } catch(e) {
    return { rows: [], message: e.message };
  }
}

function getLaporanHarian(tim, tanggal) {
  try {
    if (!tim || !tanggal) return { success: false, message: 'Tim dan tanggal wajib diisi' };

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName('db_ROW_Lap_Harian');
    if (!sh) return { success: false, message: 'Sheet tidak ditemukan' };

    var lastRow = sh.getLastRow();
    if (lastRow < 2) return { success: false, message: 'Belum ada data' };

    var data    = sh.getRange(2, 1, lastRow - 1, 13).getValues();
    var tglCari = _normTanggal(tanggal);

    for (var i = 0; i < data.length; i++) {
      var r = data[i];
      if (!r[2]) continue;
      if (String(r[2]).trim() !== tim) continue;
      if (_normTanggal(r[4]) !== tglCari) continue;

      return {
        success: true,
        laporan: {
          tim: String(r[2] || ''), hari: String(r[3] || ''), tanggal: r[4],
          koordinatAwal: String(r[5] || '-'), koordinatAkhir: String(r[6] || '-'),
          kmSbl: r[7] !== '' ? r[7] : '-', kmSsd: r[8] !== '' ? r[8] : '-',
          kendala: String(r[9] || ''), waText: String(r[10] || ''),
          createdTs: r[11], updateTs: r[12]
        }
      };
    }
    return { success: false, message: 'Data tidak ditemukan: ' + tim + ' / ' + tanggal };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

/* Reset Koordinat & KM harian (trigger tengah malam) */
function resetLaporanHarian() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName('db_ROW_Lap_Harian');
    if (!sh) { Logger.log('[resetLaporanHarian] Sheet tidak ditemukan'); return; }

    var lastRow = sh.getLastRow();
    if (lastRow < 2) { Logger.log('[resetLaporanHarian] Tidak ada data'); return; }

    var dataRows = lastRow - 1;
    sh.getRange(2, 6, dataRows, 4).clearContent(); // F..I
    SpreadsheetApp.flush();
    Logger.log('[resetLaporanHarian] Reset ' + dataRows + ' baris');
  } catch(e) {
    Logger.log('[resetLaporanHarian] ERROR: ' + e.message);
  }
}

/* Gabungkan db_ROW_Lap_Harian + db_ROW_Eksekusi -> db_ROW_All_Lap_Harian */
function refreshViewLaporan() {
  try {
    var ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
    var shH = ss.getSheetByName('db_ROW_Lap_Harian');
    var shR = ss.getSheetByName('db_ROW_Eksekusi');
    var shV = ss.getSheetByName('db_ROW_All_Lap_Harian');

    if (!shH || !shR) { Logger.log('[refreshViewLaporan] Sheet sumber tidak ditemukan'); return; }
    if (!shV) shV = ss.insertSheet('db_ROW_All_Lap_Harian');

    var tz    = Session.getScriptTimeZone();
    var dataH = shH.getLastRow() > 1 ? shH.getRange(1, 1, shH.getLastRow(), 13).getValues() : [[]];
    var dataR = shR.getLastRow() > 1 ? shR.getRange(1, 1, shR.getLastRow(), COL_ROW_N).getValues() : [[]];

    var HEADER = [
      'No','Tim','Hari','Tanggal','Koordinat Awal','Koordinat Akhir',
      'KM Sebelum','KM Sesudah','Total',
      'Total Bulanan Rabas / Pangkas (Gawang)',
      'Total Bulanan Tebang Sedang (Batang)',
      'Total Bulanan Tebang Besar (Batang)',
      'Penyulang','Section',
      'Rabas / Pangkas (Gawang)','Tebang Sedang (Batang)','Tebang Besar (Batang)','Kendala'
    ];

    var rows = [HEADER], no = 1;
    for (var i = 1; i < dataH.length; i++) {
      var h = dataH[i];
      if (!h[2]) continue;
      var tim = String(h[2]).trim();
      var tglStr = '';
      try { tglStr = Utilities.formatDate(new Date(h[4]), tz, 'yyyy-MM-dd'); } catch(e) { tglStr = String(h[4]); }
      var bulan = tglStr.substring(0, 7);

      var detailMap = {};
      for (var j = 1; j < dataR.length; j++) {
        var r = dataR[j];
        if (!_fotoLengkap(r)) continue;
        var rTim = String(r[COL_ROW.tim] || '').trim();
        var rTgl = '';
        try { rTgl = Utilities.formatDate(new Date(r[COL_ROW.tanggal]), tz, 'yyyy-MM-dd'); } catch(e) { rTgl = String(r[COL_ROW.tanggal]); }
        if (rTim !== tim || rTgl !== tglStr) continue;

        var key = String(r[COL_ROW.penyulang] || '') + '||' + String(r[COL_ROW.section] || '');
        if (!detailMap[key]) detailMap[key] = { penyulang: String(r[COL_ROW.penyulang] || ''), section: String(r[COL_ROW.section] || ''), rabas: 0, sedang: 0, besar: 0 };
        var jenis = String(r[COL_ROW.jenisPekerjaan] || '').toLowerCase();
        if      (jenis.indexOf('rabas') >= 0 || jenis.indexOf('pangkas') >= 0) detailMap[key].rabas++;
        else if (jenis.indexOf('sedang') >= 0) detailMap[key].sedang++;
        else if (jenis.indexOf('besar')  >= 0) detailMap[key].besar++;
      }

      var totR = 0, totS = 0, totB = 0;
      for (var m = 1; m < dataR.length; m++) {
        var r2 = dataR[m];
        if (String(r2[COL_ROW.tim] || '').trim() !== tim) continue;
        if (!_fotoLengkap(r2)) continue;
        var rBln = '';
        try { rBln = Utilities.formatDate(new Date(r2[COL_ROW.tanggal]), tz, 'yyyy-MM'); } catch(e) { rBln = ''; }
        if (rBln !== bulan) continue;
        var jenis2 = String(r2[COL_ROW.jenisPekerjaan] || '').toLowerCase();
        if      (jenis2.indexOf('rabas') >= 0 || jenis2.indexOf('pangkas') >= 0) totR++;
        else if (jenis2.indexOf('sedang') >= 0) totS++;
        else if (jenis2.indexOf('besar')  >= 0) totB++;
      }

      var keys = Object.keys(detailMap);
      if (keys.length === 0) {
        rows.push([no++, tim, h[3], h[4], h[5], h[6], h[7], h[8], 0, totR, totS, totB, '-', '-', 0, 0, 0, h[9]]);
      } else {
        for (var k = 0; k < keys.length; k++) {
          var d = detailMap[keys[k]];
          rows.push([no++, tim, h[3], h[4], h[5], h[6], h[7], h[8],
            d.rabas + d.sedang + d.besar, totR, totS, totB,
            d.penyulang, d.section, d.rabas, d.sedang, d.besar, h[9]]);
        }
      }
    }

    shV.clearContents();
    if (rows.length > 0) shV.getRange(1, 1, rows.length, HEADER.length).setValues(rows);
    shV.getRange(1, 1, 1, HEADER.length).setBackground('#1e3a8a').setFontColor('#ffffff').setFontWeight('bold');
    SpreadsheetApp.flush();
    Logger.log('[refreshViewLaporan] Selesai: ' + (rows.length - 1) + ' baris');
  } catch(e) {
    Logger.log('[refreshViewLaporan] ERROR: ' + e.message);
  }
}


/* ═══ HELPER LAPORAN ═══ */
function _namaBulanID(date) {
  var b = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return b[date.getMonth()];
}

function _formatTanggalID(date) {
  var hariList = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  return hariList[date.getDay()] + ', ' + date.getDate() + ' ' + _namaBulanID(date) + ' ' + date.getFullYear();
}

function _buildPenySecList(shP) {
  var penySecList = {};
  if (!shP || shP.getLastRow() < 2) return penySecList;
  var dp = shP.getRange(2, 1, shP.getLastRow() - 1, 6).getValues();
  for (var i = 0; i < dp.length; i++) {
    var peny = String(dp[i][2] || '').trim(); // C
    var sec  = String(dp[i][4] || '').trim(); // E
    if (!peny || !sec) continue;
    if (!penySecList[peny]) penySecList[peny] = [];
    penySecList[peny].push(sec);
  }
  return penySecList;
}

// ROW kini memakai FORMULA INTI cabang-aware (_sectionRange, di Tek-Temuan.gs).
// penySecList tidak lagi dipakai; topologi dibangun otomatis dari master db_Penyulang.
function _getSectionRange(penyulang, sections, penySecList) {
  if (!sections || sections.length === 0) return '-';
  var hasil = _sectionRange(penyulang, sections);
  return hasil || '-';
}

function _fotoLengkap(row) {
  // "Foto lengkap" = ketiga URL foto terisi (kolom S/U/W = fotoSebelumUrl/fotoPekerjaanUrl/fotoSesudahUrl),
  // BUKAN kolom nama foto (R/T/V). Nama bisa terisi walau upload URL gagal, jadi URL lebih akurat.
  var l = String(row[COL_ROW.fotoSebelumUrl]   || '').trim();
  var n = String(row[COL_ROW.fotoPekerjaanUrl] || '').trim();
  var p = String(row[COL_ROW.fotoSesudahUrl]   || '').trim();
  return l !== '' && n !== '' && p !== '';
}

function _formatWA(d) {
  var tglObj = new Date(d.tanggal);
  var tglStr = _formatTanggalID(tglObj);

  var lines = [];
  lines.push('*Realisasi Team ' + d.tim + ' ULP ' + d.ulp + '*');
  lines.push('-------------------------------------------------');
  lines.push('Hari / Tanggal : ' + tglStr);
  lines.push('Koordinat Awal : ' + (d.kAwal  || '-'));
  lines.push('Koordinat Akhir : ' + (d.kAkhr || '-'));
  lines.push('');
  lines.push('Km Sebelum / Sesudah : ' + (d.kmSbl || '-') + ' / ' + (d.kmSsd || '-'));
  lines.push('');

  d.detail.forEach(function(p, i) {
    var prefix = d.detail.length > 1 ? (i + 1) + '. ' : '';
    lines.push(prefix + 'Penyulang : *' + p.penyulang + '*');
    lines.push('Section : ' + p.section);
    lines.push('');
    lines.push('Realisasi ROW');
    lines.push('1. Rabas / Pangkas : ' + p.rabas + ' Gawang\n'
      + '2. Tebang Sedang kll>78,5cm <157cm : ' + p.sedang + ' Batang\n'
      + '3. Tebang Besar >157cm : ' + p.besar + ' Batang');
    lines.push('');
  });

  lines.push('Kendala : ' + (d.kendala || ''));
  lines.push('');
  lines.push('Total Bulanan Rabas / Pangkas : ' + d.totBulR + ' Gawang');
  lines.push('Total Bulanan Tebang Pohon Keliling >78,5cm <157cm : ' + d.totBulS + ' Batang');
  lines.push('Total Bulanan Tebang Pohon Keliling >157cm : ' + d.totBulB + ' Batang');
  return lines.join('\n');
}

function _normTanggal(v) {
  if (!v) return '';
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return '';
    return Utilities.formatDate(v, 'Asia/Jakarta', 'yyyy-MM-dd');
  }
  var s = String(v).trim();
  if (!s) return '';
  var m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m1) return m1[3] + '-' + m1[2].padStart(2,'0') + '-' + m1[1].padStart(2,'0');
  var m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return m2[0];
  var d = new Date(s);
  if (!isNaN(d.getTime())) return Utilities.formatDate(d, 'Asia/Jakarta', 'yyyy-MM-dd');
  return s;
}


/* ═══ REFRESH LAPORAN HARIAN ROW (trigger) ═══ */
function refreshLaporanHarianROW() {
  var ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  var shH = ss.getSheetByName(SHEET_INS.HEADER);
  var shE = ss.getSheetByName('db_ROW_Eksekusi');
  var shL = ss.getSheetByName('db_ROW_Lap_Harian');
  var shP = ss.getSheetByName('db_Penyulang');
  if (!shH || !shE || !shL || !shP) { Logger.log('ERROR: Sheet tidak ditemukan'); return; }

  var tz = Session.getScriptTimeZone();
  var penySecList = _buildPenySecList(shP);

  var eksAll = shE.getLastRow() > 1 ? shE.getRange(2, 1, shE.getLastRow() - 1, COL_ROW_N).getValues() : [];

  var lapIndex = {};
  if (shL.getLastRow() > 1) {
    var lapRows = shL.getRange(2, 1, shL.getLastRow() - 1, 13).getValues();
    for (var i = 0; i < lapRows.length; i++) {
      var lTim = String(lapRows[i][2] || '').trim();
      var lTgl = '';
      try { lTgl = Utilities.formatDate(new Date(lapRows[i][4]), tz, 'yyyy-MM-dd'); } catch(e) { continue; }
      lapIndex[lTim + '_' + lTgl] = { rowSheet: i + 2, createdTs: lapRows[i][11], updateTs: lapRows[i][12] };
    }
  }

  if (shH.getLastRow() < 2) { Logger.log('db_ROW_Header kosong'); return; }
  var headers = shH.getRange(2, 1, shH.getLastRow() - 1, 16).getValues();

  for (var h = 0; h < headers.length; h++) {
    var row = headers[h];
    if (String(row[5] || '').trim() !== 'ROW') continue;
    var ulp = String(row[2] || '').trim();
    var tim = String(row[6] || '').trim();
    var hari = String(row[3] || '').trim();
    var tgl = row[4];
    var kAwal = String(row[7] || '').trim();
    var kAkhr = String(row[8] || '').trim();
    var kmSbl = row[9] !== '' ? row[9] : '';
    var kmSsd = row[10] !== '' ? row[10] : '';
    var kendala = String(row[11] || '').trim();
    var hdrTs = row[13];
    if (!tim || !tgl) continue;

    var tglStr = '';
    try { tglStr = Utilities.formatDate(new Date(tgl), tz, 'yyyy-MM-dd'); } catch(e) { continue; }
    var key = tim + '_' + tglStr;
    var bulan = tglStr.substring(0, 7);

    // Auto-generate / KOREKSI Kode_Header ROW (R<2 huruf Sub-Tim>-<KodeULP><YYMMDD><urut3>).
    // Tag header WAJIB mengikuti Sub-Tim (kolom Tim header, apa adanya) = "R" + 2 digit terakhir
    // Sub-Tim (mis. "ROW 02" -> "R02"). Bila Kode Header KOSONG ATAU tag-nya TIDAK cocok (mis.
    // "R01-..." hasil INITIAL VALUE AppSheet dari USERSETTINGS("Sub-Tim") yg basi/beda dgn kolom
    // Tim baris ini), GENERATE ulang dari Sub-Tim & tulis balik agar header konsisten dgn kolom
    // Tim. Selaras dgn _ensureHeaderRow — memperbaiki kasus "input ROW 02 tapi Kode Header R01".
    var kodeHeaderRow  = String(row[1] || '').trim();
    var expectedTagLap = 'R' + String(tim || '').trim().slice(-2);
    var tagCocokLap    = kodeHeaderRow && kodeHeaderRow.indexOf(expectedTagLap + '-') === 0;
    if (!kodeHeaderRow || !tagCocokLap) {
      try {
        kodeHeaderRow = _generateKodeHeaderRow(ss, _kodeUlpByUlp(ss, ulp), tglStr, tim);
        shH.getRange(h + 2, COL_INS.HEADER.kodeHeader + 1).setValue(kodeHeaderRow);
      } catch (eK) {}
    }

    var eksHari = [], maxExTs = null;
    for (var e = 0; e < eksAll.length; e++) {
      var r = eksAll[e];
      var rTim = String(r[COL_ROW.tim] || '').trim();
      var rTgl = '';
      try { rTgl = Utilities.formatDate(new Date(r[COL_ROW.tanggal]), tz, 'yyyy-MM-dd'); } catch(e2) { continue; }
      if (rTim !== tim || rTgl !== tglStr) continue;
      eksHari.push(r);
      var rTs = r[COL_ROW.timestamp];
      if (rTs) { var rTsDate = new Date(rTs); if (!maxExTs || rTsDate > new Date(maxExTs)) maxExTs = rTs; }
    }
    if (eksHari.length === 0) { Logger.log('Skip (no eksekusi): ' + key); continue; }

    var eksFL = eksHari.filter(function(r){ return _fotoLengkap(r); });
    if (eksFL.length === 0) { Logger.log('Skip (foto belum lengkap): ' + key); continue; }

    var existing = lapIndex[key], needUpdate = false;
    if (!existing) { needUpdate = true; Logger.log('Baru: ' + key); }
    else {
      var updateTs = existing.updateTs ? new Date(existing.updateTs) : null;
      var hdrNewer = hdrTs && updateTs && new Date(hdrTs) > updateTs;
      var eksNewer = maxExTs && updateTs && new Date(maxExTs) > updateTs;
      needUpdate = hdrNewer || eksNewer;
    }
    if (!needUpdate) continue;

    var penyMap = {};
    eksHari.forEach(function(r) {
      if (!_fotoLengkap(r)) return;
      var peny = String(r[COL_ROW.penyulang] || '').trim();
      var sec  = String(r[COL_ROW.section] || '').trim();
      var jenis = String(r[COL_ROW.jenisPekerjaan] || '').toLowerCase();
      if (!peny) return;
      if (!penyMap[peny]) penyMap[peny] = { rabas:0, sedang:0, besar:0, sections:[] };
      if (sec && penyMap[peny].sections.indexOf(sec) === -1) penyMap[peny].sections.push(sec);
      if      (jenis.indexOf('rabas') >= 0 || jenis.indexOf('pangkas') >= 0) penyMap[peny].rabas++;
      else if (jenis.indexOf('sedang') >= 0) penyMap[peny].sedang++;
      else if (jenis.indexOf('besar')  >= 0) penyMap[peny].besar++;
    });

    var detail = Object.keys(penyMap).sort().map(function(peny) {
      var d = penyMap[peny];
      return { penyulang: peny, section: _getSectionRange(peny, d.sections, penySecList),
               rabas: d.rabas, sedang: d.sedang, besar: d.besar };
    });

    var totBulR = 0, totBulS = 0, totBulB = 0;
    for (var e2 = 0; e2 < eksAll.length; e2++) {
      var r3 = eksAll[e2];
      if (String(r3[COL_ROW.tim] || '').trim() !== tim) continue;
      var rBln = '';
      try { rBln = Utilities.formatDate(new Date(r3[COL_ROW.tanggal]), tz, 'yyyy-MM'); } catch(e3) { continue; }
      if (rBln !== bulan) continue;
      if (!_fotoLengkap(r3)) continue;
      var jenis3 = String(r3[COL_ROW.jenisPekerjaan] || '').toLowerCase();
      if      (jenis3.indexOf('rabas') >= 0 || jenis3.indexOf('pangkas') >= 0) totBulR++;
      else if (jenis3.indexOf('sedang') >= 0) totBulS++;
      else if (jenis3.indexOf('besar')  >= 0) totBulB++;
    }

    var waText = _formatWA({
      ulp: ulp, tim: tim, hari: hari, tanggal: tglStr,
      kAwal: kAwal, kAkhr: kAkhr, kmSbl: kmSbl, kmSsd: kmSsd, kendala: kendala,
      detail: detail, totBulR: totBulR, totBulS: totBulS, totBulB: totBulB
    });

    // CATATAN: WA Text di db_Global_Header TIDAK lagi ditulis di sini.
    // Penulisan WA Text header dipusatkan ke Tek-WaEngine: recalcWaRow_ (via recalcWaByHeader / refreshWaHarian).
    // refreshLaporanHarianROW kini hanya mengisi sheet db_ROW_Lap_Harian (daftar laporan web app).

    var now = new Date();
    if (!existing) {
      var lastNo = shL.getLastRow();
      shL.appendRow([lastNo, ulp, tim, hari, new Date(tgl), kAwal, kAkhr, kmSbl, kmSsd, kendala, waText, now, now]);
      lapIndex[key] = { rowSheet: shL.getLastRow(), createdTs: now, updateTs: now };
    } else {
      var rowIdx = existing.rowSheet;
      shL.getRange(rowIdx, 6, 1, 6).setValues([[kAwal, kAkhr, kmSbl, kmSsd, kendala, waText]]);
      shL.getRange(rowIdx, 13).setValue(now);
      lapIndex[key].updateTs = now;
    }
    Logger.log('Selesai: ' + key + ' (' + detail.length + ' penyulang)');
  }

  SpreadsheetApp.flush();
  Logger.log('refreshLaporanHarianROW selesai');
}

function getLaporanHarianList(filterUlp, filterTim, filterTgl) {
  try {
    var ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
    var shL = ss.getSheetByName('db_ROW_Lap_Harian');
    if (!shL || shL.getLastRow() < 2) return { success: true, rows: [] };

    var tz   = Session.getScriptTimeZone();
    var data = shL.getRange(2, 1, shL.getLastRow() - 1, 13).getValues();
    var rows = [];

    for (var i = 0; i < data.length; i++) {
      var r = data[i];
      var ulp = String(r[1] || '').trim();
      var tim = String(r[2] || '').trim();
      var tgl = '';
      try { tgl = Utilities.formatDate(new Date(r[4]), tz, 'yyyy-MM-dd'); } catch(e) { tgl = String(r[4]); }

      if (filterUlp && ulp !== filterUlp) continue;
      if (filterTim && tim !== filterTim) continue;
      if (filterTgl && tgl !== filterTgl) continue;

      rows.push({
        no: r[0], ulp: ulp, tim: tim, hari: String(r[3] || ''), tanggal: tgl,
        kAwal: String(r[5] || ''), kAkhr: String(r[6] || ''), kmSbl: r[7], kmSsd: r[8],
        kendala: String(r[9] || ''), waText: String(r[10] || ''),
        createdTs: r[11] ? Utilities.formatDate(new Date(r[11]), tz, 'dd/MM/yyyy HH:mm') : '-',
        updateTs:  r[12] ? Utilities.formatDate(new Date(r[12]), tz, 'dd/MM/yyyy HH:mm') : '-'
      });
    }

    rows.sort(function(a, b) { return b.tanggal.localeCompare(a.tanggal) || b.tim.localeCompare(a.tim); });
    return { success: true, rows: rows };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function forceRefreshLaporan(tim, tanggal) {
  try {
    if (!tim || !tanggal) return { success: false, message: 'Tim dan tanggal wajib diisi' };

    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var shLap = ss.getSheetByName('db_ROW_Lap_Harian');
    var shExe = ss.getSheetByName('db_ROW_Eksekusi');
    var shHdr = ss.getSheetByName(SHEET_INS.HEADER);
    var shP   = ss.getSheetByName('db_Penyulang');
    if (!shLap || !shExe || !shHdr || !shP) return { success: false, message: 'Sheet tidak ditemukan' };

    var tglStr = _normTanggal(tanggal);
    var lapData = shLap.getDataRange().getValues();
    var lapRowIdx = -1;
    for (var i = 1; i < lapData.length; i++) {
      if (String(lapData[i][2]||'').trim() === tim.trim() && _normTanggal(lapData[i][4]) === tglStr) { lapRowIdx = i; break; }
    }

    var exeAll = shExe.getDataRange().getValues();
    var hdrAll = shHdr.getDataRange().getValues();
    var penySecList = _buildPenySecList(shP);

    var exeRows = exeAll.filter(function(r, idx) {
      if (idx === 0) return false;
      return String(r[COL_ROW.tim]||'').trim() === tim.trim() && _normTanggal(r[COL_ROW.tanggal]) === tglStr;
    });
    var exeFotoLengkap = exeRows.filter(function(r){ return _fotoLengkap(r); });

    var hdrRow = null, hdrRowIdx = -1;
    for (var h = 1; h < hdrAll.length; h++) {
      if (String(hdrAll[h][5]||'').trim() !== 'ROW') continue;
      if (String(hdrAll[h][6]||'').trim() === tim.trim() && _normTanggal(hdrAll[h][4]) === tglStr) { hdrRow = hdrAll[h]; hdrRowIdx = h; break; }
    }

    if (!hdrRow && exeFotoLengkap.length === 0)
      return { success: false, message: 'Header & Eksekusi (foto lengkap) tidak ditemukan untuk ' + tim + ' / ' + tglStr };
    if (!hdrRow)
      return { success: false, message: 'Data Header tidak ditemukan untuk ' + tim + ' / ' + tglStr };
    if (exeFotoLengkap.length === 0)
      return { success: false, message: 'Tidak ada eksekusi dengan foto lengkap untuk ' + tim + ' / ' + tglStr
        + (exeRows.length > 0 ? ' (' + exeRows.length + ' data ada tapi foto belum lengkap)' : '') };

    var ulp = lapRowIdx >= 0 ? String(lapData[lapRowIdx][1]||'').trim() : String(hdrRow[2]||'').trim();
    var d = _aggregateForTim(ulp, tim, tglStr, exeRows, exeAll, hdrRow, penySecList);
    var waText = _formatWA(d);
    var now = new Date();

    // WA Text header dipusatkan ke WA engine: panggil recalcWaByHeader utk header ini.
    try {
      var _kh = String(hdrRow[COL_INS.HEADER.kodeHeader] || '').trim();
      if (_kh && typeof recalcWaByHeader === 'function') recalcWaByHeader(_kh);
    } catch (eW) {}

    if (lapRowIdx >= 0) {
      var sheetRow = lapRowIdx + 1;
      shLap.getRange(sheetRow, 6, 1, 6).setValues([[d.kAwal, d.kAkhr, d.kmSbl, d.kmSsd, d.kendala, waText]]);
      shLap.getRange(sheetRow, 13).setValue(now);
    } else {
      var lastNo = shLap.getLastRow();
      shLap.appendRow([lastNo, ulp, tim, d.hari, new Date(hdrRow[4]), d.kAwal, d.kAkhr, d.kmSbl, d.kmSsd, d.kendala, waText, now, now]);
    }

    SpreadsheetApp.flush();
    return { success: true, message: 'Laporan ' + (lapRowIdx >= 0 ? 'diperbarui' : 'dibuat baru') + ': ' +
      Utilities.formatDate(now, 'Asia/Jakarta', 'dd/MM/yyyy HH:mm') };
  } catch(e) {
    return { success: false, message: 'Error: ' + e.message };
  }
}

function _aggregateForTim(ulp, tim, tglStr, exeRows, exeAll, hdrRow, penySecList) {
  var tz = Session.getScriptTimeZone();
  var bulan = tglStr.substring(0, 7);

  // Header WA cukup membaca dari db_ROW_Realisasi (induk) — lebih efisien drpd memindai
  // db_ROW_Eksekusi tiap kali, karena realisasi sudah RINGKAS (1 baris per penyulang/Kode
  // Pekerjaan) & nilainya sudah disinkronkan dari eksekusi (syarat foto lengkap) oleh
  // recalcEksekusiROW. Sekali baca utk dua hal: detail harian (tim+tanggal) + total bulanan (tim+bulan).
  var kodeHeader = hdrRow ? String(hdrRow[COL_INS.HEADER.kodeHeader] || '').trim() : '';
  var detail = [], totBulR = 0, totBulS = 0, totBulB = 0;
  try {
    // DUAL-READ (migrasi arsip): db_ROW_Realisasi dibaca dari AKTIF + ARSIP via
    // _readSheetDual_() (Tek-Migrasi.gs) agar Total Bulanan di WA tetap penuh walau
    // data awal bulan sudah dipindah ke spreadsheet arsip.
    var RLA = COL_ROW_RLZ;
    var rlzAll = _readSheetDual_('db_ROW_Realisasi', RLA.kodePekerjaan, COL_ROW_RLZ_N);
    if (rlzAll.length > 0) {
      for (var ri = 0; ri < rlzAll.length; ri++) {
        var rlr = rlzAll[ri];
        if (String(rlr[RLA.tim] || '').trim() !== tim) continue;
        var rlrTgl = _normTanggal(rlr[RLA.tanggal]);
        var rb  = Number(rlr[RLA.rabas])  || 0;
        var rs  = Number(rlr[RLA.sedang]) || 0;
        var rbz = Number(rlr[RLA.besar])  || 0;
        // Total bulanan: semua realisasi tim ini dalam bulan yg sama.
        if (rlrTgl.substring(0, 7) === bulan) { totBulR += rb; totBulS += rs; totBulB += rbz; }
        // Detail: tautkan realisasi ke header via KODE HEADER (paling robust; tanggal realisasi
        // bisa beda dari tanggal header krn realisasi = tanggal rencana). Fallback ke tanggal
        // bila Kode Header realisasi kosong / tak tersedia di header.
        var cocokHeader = kodeHeader && String(rlr[RLA.kodeHeader] || '').trim() === kodeHeader;
        var cocokTgl    = rlrTgl === tglStr;
        if (!cocokHeader && !cocokTgl) continue;
        var penyR = String(rlr[RLA.penyulang] || '').trim();
        if (!penyR) continue;
        detail.push({
          penyulang: penyR,
          section: String(rlr[RLA.section] || '').trim() || '-',
          rabas: rb, sedang: rs, besar: rbz
        });
      }
      detail.sort(function(a, b){ return a.penyulang.localeCompare(b.penyulang); });
    }
  } catch (eRlz) {
    Logger.log('[_aggregateForTim] baca db_ROW_Realisasi gagal: ' + eRlz.message);
  }

  return {
    ulp: ulp, tim: tim, hari: hdrRow ? String(hdrRow[3]||'') : '', tanggal: tglStr,
    kAwal: hdrRow ? String(hdrRow[7]||'') : '', kAkhr: hdrRow ? String(hdrRow[8]||'') : '',
    kmSbl: hdrRow ? String(hdrRow[9]||'') : '', kmSsd: hdrRow ? String(hdrRow[10]||'') : '',
    kendala: hdrRow ? String(hdrRow[11]||'') : '',
    detail: detail, totBulR: totBulR, totBulS: totBulS, totBulB: totBulB
  };
}

function getHeaderList() {
  try {
    var ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
    var shH = ss.getSheetByName(SHEET_INS.HEADER);
    var shL = ss.getSheetByName('db_ROW_Lap_Harian');
    var shE = ss.getSheetByName('db_ROW_Eksekusi');
    if (!shH) return { success: false, message: 'Sheet db_ROW_Header tidak ditemukan' };

    var tz = Session.getScriptTimeZone();
    var lastRow = shH.getLastRow();
    if (lastRow < 2) return { success: true, items: [] };
    var hdrData = shH.getRange(2, 1, lastRow - 1, 16).getValues();

    var lapDone = {};
    if (shL && shL.getLastRow() > 1) {
      var lapRows = shL.getRange(2, 1, shL.getLastRow() - 1, 13).getValues();
      for (var i = 0; i < lapRows.length; i++) {
        var lTim = String(lapRows[i][2] || '').trim();
        var lTgl = '';
        try { lTgl = Utilities.formatDate(new Date(lapRows[i][4]), tz, 'yyyy-MM-dd'); } catch(e) { continue; }
        if (lTim && lTgl) lapDone[lTim + '_' + lTgl] = true;
      }
    }

    var exeDone = {};
    if (shE && shE.getLastRow() > 1) {
      var exeData = shE.getRange(2, 1, shE.getLastRow() - 1, COL_ROW_N).getValues();
      for (var j = 0; j < exeData.length; j++) {
        if (!_fotoLengkap(exeData[j])) continue;
        var eTim = String(exeData[j][COL_ROW.tim] || '').trim();
        var eTgl = '';
        try { eTgl = Utilities.formatDate(new Date(exeData[j][COL_ROW.tanggal]), tz, 'yyyy-MM-dd'); } catch(e) { continue; }
        if (eTim && eTgl) exeDone[eTim + '_' + eTgl] = true;
      }
    }

    var seen = {}, items = [];
    for (var h = 0; h < hdrData.length; h++) {
      var row = hdrData[h];
      if (String(row[5] || '').trim() !== 'ROW') continue;
      var ulp = String(row[2] || '').trim();
      var tim = String(row[6] || '').trim();
      var tgl = row[4];
      if (!tim || !tgl) continue;
      var tglStr = '';
      try { tglStr = Utilities.formatDate(new Date(tgl), tz, 'yyyy-MM-dd'); } catch(e) { continue; }
      var key = tim + '_' + tglStr;
      if (seen[key]) continue;
      seen[key] = true;
      items.push({ ulp: ulp, tim: tim, tanggal: tglStr, sudahAda: !!lapDone[key], adaExe: !!exeDone[key] });
    }

    items.sort(function(a, b){ return a.tanggal.localeCompare(b.tanggal) || a.tim.localeCompare(b.tim); });
    return { success: true, items: items };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

// Kode Header ROW: R<2 huruf Sub-Tim>-<KodeULP><YYMMDD><urut3> (urut harian per-ULP).
// Disamakan dgn INITIAL VALUE AppSheet:
//   "R" & RIGHT(USERSETTINGS("Sub-Tim"),2) & "-" & [Kode ULP]
//     & RIGHT(YEAR([Tanggal]),2) & RIGHT("0"&MONTH([Tanggal]),2) & RIGHT("0"&DAY([Tanggal]),2)
//     & RIGHT("00" & (COUNT(SELECT(db_Global_Header[Kode Header],
//         AND(LEFT([Kode Header],4)="R"&RIGHT(USERSETTINGS("Sub-Tim"),2)&"-",
//             [ULP]=[_THISROW].[ULP],[Tanggal]=[_THISROW].[Tanggal])))+1),3)
function _generateKodeHeaderRow(ss, kodeUlp, tanggal, subTim){
  var tag    = 'R' + String(subTim || '').trim().slice(-2);   // "R" & RIGHT(Sub-Tim,2)
  var tgl    = _normTgl(tanggal).replace(/-/g,'').slice(2);    // YYMMDD (tahun 2 digit)
  var prefix = tag + '-' + String(kodeUlp||'').trim() + tgl;
  var data   = ss.getSheetByName(SHEET_INS.HEADER).getDataRange().getValues();
  var n = 0;
  for(var i=1;i<data.length;i++){
    if(String(data[i][COL_INS.HEADER.kodeHeader]||'').indexOf(prefix) === 0) n++;
  }
  return prefix + ('00'+(n+1)).slice(-3);
}

// Kode Eksekusi ROW: <KodePekerjaanRealisasi>-EKS.<urut3> (urut reset per Kode Pekerjaan).
// Berantai dari Kode Pekerjaan db_ROW_Realisasi (induk) -> db_ROW_Eksekusi (anak), sehingga
// silsilah Header > Realisasi > Eksekusi tampak dari kodenya. Contoh: R03-1613260617001-PNY.001-EKS.001.
// Urut dihitung dari kolom Kode Pekerjaan (C) db_ROW_Eksekusi yg cocok dgn Kode Pekerjaan realisasi.
function _generateKodeEksekusiRow(ss, kodePekerjaanRlz){
  var key = String(kodePekerjaanRlz || '').trim();
  if(!key) return '';
  var sh  = ss.getSheetByName('db_ROW_Eksekusi');
  var n = 0;
  if(sh && sh.getLastRow() > 1){
    var col = sh.getRange(2, COL_ROW.kodePekerjaan + 1, sh.getLastRow() - 1, 1).getValues();
    for(var i=0;i<col.length;i++){
      if(String(col[i][0]||'').trim() === key) n++;
    }
  }
  return key + '-EKS.' + ('00'+(n+1)).slice(-3);
}

// Kode Pekerjaan db_ROW_Realisasi: <KodeHeader>-PNY.<urut3> (urut reset per Kode Header).
// Disamakan dgn INITIAL VALUE AppSheet:
//   [Kode Header] & "-PNY." & RIGHT("00" &
//     (COUNT(SELECT(db_ROW_Realisasi[Kode Pekerjaan],
//        [Kode Header] = [_THISROW].[Kode Header])) + 1), 3)
// CATATAN: baris realisasi normalnya dibuat oleh AppSheet (Tim ROW). Fungsi ini disediakan
// untuk membuat/mengisi Kode Pekerjaan realisasi dari sisi server (mis. backfill/migrasi).
function _generateKodePekerjaanRealisasi(ss, kodeHeader){
  var key = String(kodeHeader || '').trim();
  if(!key) return '';
  var sh  = ss.getSheetByName('db_ROW_Realisasi');
  var n = 0;
  if(sh && sh.getLastRow() > 1){
    var data = sh.getRange(2, 1, sh.getLastRow() - 1, COL_ROW_RLZ_N).getValues();
    for(var i=0;i<data.length;i++){
      if(String(data[i][COL_ROW_RLZ.kodeHeader]||'').trim() === key) n++;
    }
  }
  return key + '-PNY.' + ('00'+(n+1)).slice(-3);
}


/* ═══ AUTO-BUAT HEADER ROW (db_Global_Header) ═══
   Cari baris header ROW utk Sub-Tim + Tanggal. Bila ada tapi Kode Header kosong -> generate
   & tulis balik. Bila TIDAK ADA -> buat baris header baru (Tim='ROW', Sub-Tim=<subTim>) dgn
   4 kolom Koordinat Awal/Akhir & KM Awal/Akhir SENGAJA DIKOSONGKAN (diisi tim belakangan).
   Mengembalikan Kode Header (string). subTim = tim spesifik, mis. "ROW 03". */
function _ensureHeaderRow(ss, subTim, tglStr, ulp, inputBy){
  var H   = COL_INS.HEADER;
  var st  = String(subTim || '').trim();
  var tgl = _normTanggal(tglStr);
  if(!st || !tgl) return '';
  // GUARD MIGRASI: jangan buat header baru utk tanggal yg sudah diarsip (<= H-2).
  if (typeof _tglSudahDiarsip_ === 'function' && _tglSudahDiarsip_(tgl)) {
    Logger.log('[_ensureHeaderRow] ' + tgl + ' <= H-2 (sudah diarsip) — header TIDAK dibuat ulang.');
    return '';
  }

  var shH = ss.getSheetByName(SHEET_INS.HEADER);
  if(!shH) return '';

  // 1) Cari header ROW yg cocok (Tim='ROW' + Sub-Tim + Tanggal).
  if(shH.getLastRow() > 1){
    var data = shH.getRange(2, 1, shH.getLastRow() - 1, 16).getValues();
    for(var i=0;i<data.length;i++){
      if(String(data[i][H.tim]||'').trim() !== 'ROW') continue;
      if(String(data[i][H.subTim]||'').trim() !== st) continue;
      if(_normTanggal(data[i][H.tanggal]) !== tgl) continue;
      var ulpHdr = String(data[i][H.ulp]||'').trim() || ulp;
      var kh = String(data[i][H.kodeHeader]||'').trim();
      // Tag header WAJIB mengikuti Sub-Tim (kolom Tim, apa adanya): "R" + 2 digit terakhir Sub-Tim.
      // Mis. Sub-Tim "ROW 02" -> tag "R02". Bila Kode Header KOSONG ATAU tag-nya TIDAK cocok
      // (mis. "R01-..." hasil INITIAL VALUE AppSheet dari USERSETTINGS("Sub-Tim") yg basi/beda dgn
      // kolom Tim baris ini), GENERATE ulang dari Sub-Tim & tulis balik agar header konsisten
      // dgn kolom Tim. Inilah yg memperbaiki kasus "input ROW 02 tapi Kode Header R01".
      var expectedTag = 'R' + st.slice(-2);
      var tagCocok    = kh && kh.indexOf(expectedTag + '-') === 0;
      if(kh && tagCocok) return kh;                      // sudah ada & tag cocok -> pakai apa adanya
      var genK = _generateKodeHeaderRow(ss, _kodeUlpByUlp(ss, ulpHdr), tgl, st);
      shH.getRange(i + 2, H.kodeHeader + 1).setValue(genK);
      SpreadsheetApp.flush();
      return genK;
    }
  }

  // 2) Tidak ada header -> buat baris header baru.
  var kodeHeader = _generateKodeHeaderRow(ss, _kodeUlpByUlp(ss, ulp), tgl, st);
  var tglObj = new Date(tgl + 'T00:00:00'); if(isNaN(tglObj.getTime())) tglObj = new Date();
  var hari   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][tglObj.getDay()];
  var now    = new Date();
  var FMT_TS = 'dd/MM/yyyy HH:mm:ss';   // format datetime seragam utk timestamp yg di-set server

  var baris = new Array(16).fill('');
  // Kolom A (No) dibiarkan utk formula di sheet.
  baris[H.kodeHeader]      = kodeHeader;
  baris[H.ulp]             = String(ulp || '').trim();
  baris[H.hari]            = hari;
  baris[H.tanggal]         = tglObj;
  baris[H.tim]             = 'ROW';                       // pembeda kategori
  baris[H.subTim]          = st;                          // sub-tim spesifik (mis. "ROW 03")
  baris[H.koordinatAwal]   = '';                          // SENGAJA KOSONG
  baris[H.koordinatAkhir]  = '';                          // SENGAJA KOSONG
  baris[H.kmAwal]          = '';                          // SENGAJA KOSONG
  baris[H.kmAkhir]         = '';                          // SENGAJA KOSONG
  baris[H.kendala]         = '';
  baris[H.waText]          = '';                          // diisi oleh recalcWaByHeader
  baris[H.timestamp]       = now;                          // Date objek (datetime); format diset di bawah
  baris[H.inputBy]         = String(inputBy || '').trim() || 'Auto (server)';
  baris[H.timestampUpdate] = now;                          // Date objek (datetime); format diset di bawah

  var targetRow = shH.getLastRow() + 1;
  shH.getRange(targetRow, 2, 1, 15).setValues([baris.slice(1)]);   // tulis B..P; kolom A formula
  // Samakan format TimeStamp & TimeStamp Update -> datetime dd/MM/yyyy HH:mm:ss (override format date-only).
  shH.getRange(targetRow, H.timestamp + 1).setNumberFormat(FMT_TS);
  shH.getRange(targetRow, H.timestampUpdate + 1).setNumberFormat(FMT_TS);
  SpreadsheetApp.flush();
  return kodeHeader;
}


/* ═══ AUTO-BUAT INDUK db_ROW_Realisasi ═══
   Bila tidak ada baris realisasi (induk) yg cocok utk Tim + Penyulang + Tanggal, buat otomatis
   agar eksekusi bisa TERTAUT (via Kode Pekerjaan) & nilai Rabas/Sedang/Besar langsung terekap
   oleh recalcEksekusiROW (Step 5) + WA header (Step 6). Header induk dibuat lewat _ensureHeaderRow
   bila belum ada. Mengembalikan { kodeHeader, kodePekerjaan, section, rowSheet, dibuat }.
   opts: { tim(sub-tim, mis "ROW 03"), penyulang, tanggal(yyyy-MM-dd), section, ulp } */
function _ensureRealisasiInduk(ss, opts){
  opts = opts || {};
  var tim       = String(opts.tim || '').trim();
  var penyulang = String(opts.penyulang || '').trim();
  var tglStr    = _normTanggal(opts.tanggal || new Date());
  var section   = String(opts.section || '').trim();
  var ulp       = String(opts.ulp || '').trim();
  var inputOleh = String(opts.inputOleh || '').trim() || 'Auto (server)';  // sumber: kolom AC db_ROW_Eksekusi
  if(!tim || !penyulang || !tglStr) return null;
  // GUARD MIGRASI: jangan buat induk baru utk tanggal yg sudah diarsip (<= H-2).
  if (typeof _tglSudahDiarsip_ === 'function' && _tglSudahDiarsip_(tglStr)) {
    Logger.log('[_ensureRealisasiInduk] ' + tglStr + ' <= H-2 (sudah diarsip) — induk TIDAK dibuat ulang.');
    return null;
  }

  var shL = ss.getSheetByName('db_ROW_Realisasi');
  if(!shL) return null;
  var RL = COL_ROW_RLZ;

  // 1) Cari induk yg sudah ada (Tim + Penyulang + Tanggal), pertajam dgn Section.
  if(shL.getLastRow() > 1){
    var data = shL.getRange(2, 1, shL.getLastRow() - 1, COL_ROW_RLZ_N).getValues();
    var pickFirst = null, firstRow = -1, pickMatch = null, matchRow = -1;
    for(var i=0;i<data.length;i++){
      var rr = data[i];
      if(String(rr[RL.tim]||'').trim().toLowerCase() !== tim.toLowerCase()) continue;
      if(String(rr[RL.penyulang]||'').trim().toLowerCase() !== penyulang.toLowerCase()) continue;
      if(_normTanggal(rr[RL.tanggal]) !== tglStr) continue;
      if(!pickFirst){ pickFirst = rr; firstRow = i + 2; }
      var secR = String(rr[RL.section]||'').trim();
      if(secR && section && secR === section){ pickMatch = rr; matchRow = i + 2; break; }
    }
    var pick = pickMatch || pickFirst;
    if(pick){
      var pickRowSheet = pickMatch ? matchRow : firstRow;
      var khLama  = String(pick[RL.kodeHeader]||'').trim();
      var kpLama  = String(pick[RL.kodePekerjaan]||'').trim();
      var secLama = String(pick[RL.section]||'').trim();

      // SELF-HEAL INDUK LAMA (KAKEK + AYAH): induk realisasi sering DIBUAT OLEH APPSHEET dgn
      // Kode Header KOSONG atau ber-tag SALAH (mis. "R01-..." dari INITIAL VALUE
      // USERSETTINGS("Sub-Tim") yg basi) padahal Sub-Tim baris ini mis. "ROW 02" (seharusnya
      // "R02-..."). Karena step-1 ini MEMAKAI ULANG induk yg sudah ada, tanpa koreksi maka input
      // baru terus mewarisi Kode Header lama yg salah ("header tidak mau berubah") & Kode
      // Pekerjaan (ayah) bisa kosong/tak berantai -> rantai berhenti. Maka di sini: (A) pastikan
      // KAKEK ada & tag benar, (B) pastikan AYAH ada & berantai dari kakek, (C) tulis-balik.
      // Selaras dgn perbaikanMassalKodeROW.

      // Helper: nomor urut Kode Pekerjaan (PNY) berikutnya utk sebuah Kode Header. Hanya
      // menghitung baris yg SUDAH punya Kode Pekerjaan <kh>-PNY.nnn, sehingga baris induk yg
      // Kode Pekerjaan-nya masih KOSONG (yg sedang diperbaiki) TIDAK ikut terhitung -> anak
      // pertama tetap dapat -PNY.001 (tidak loncat ke 002).
      function _nextPnyForHeader(kh){
        var k = String(kh||'').trim();
        if(!k) return '';
        var nn = 0;
        if(shL.getLastRow() > 1){
          var allRP = shL.getRange(2, 1, shL.getLastRow() - 1, COL_ROW_RLZ_N).getValues();
          for(var pi=0; pi<allRP.length; pi++){
            if(String(allRP[pi][RL.kodeHeader]||'').trim() !== k) continue;
            var pv = String(allRP[pi][RL.kodePekerjaan]||'').trim();
            if(pv && pv.indexOf(k + '-PNY.') === 0) nn++;
          }
        }
        return k + '-PNY.' + ('00'+(nn+1)).slice(-3);
      }

      var expTag = 'R' + tim.slice(-2);
      var khFix = khLama, kpFix = kpLama;

      // (A) KAKEK (Kode Header): pastikan ADA & tag-nya benar.
      if(!khLama){
        // Induk lama tanpa Kode Header (AppSheet gagal isi INITIAL VALUE) -> cari/buat header.
        try { khFix = _ensureHeaderRow(ss, tim, tglStr, ulp, inputOleh) || ''; } catch(eEH){ khFix = ''; }
      } else {
        var dIdx   = khLama.indexOf('-');
        var curTag = dIdx >= 0 ? khLama.substring(0, dIdx) : khLama;
        if(curTag !== expTag){
          var khBaru = expTag + (dIdx >= 0 ? khLama.substring(dIdx) : '');
          // Koreksi tag Kode Header di db_Global_Header (anti-tabrakan: lewati bila target sudah dipakai).
          var shHfix = ss.getSheetByName(SHEET_INS.HEADER);
          var bentrok = false, barisHdr = -1;
          if(shHfix && shHfix.getLastRow() > 1){
            var Hf   = COL_INS.HEADER;
            var hAll = shHfix.getRange(2, 1, shHfix.getLastRow() - 1, 16).getValues();
            for(var hi=0; hi<hAll.length; hi++){
              var khRow = String(hAll[hi][Hf.kodeHeader]||'').trim();
              if(khRow === khBaru) bentrok = true;
              if(khRow === khLama && barisHdr === -1) barisHdr = hi + 2;
            }
            if(!bentrok && barisHdr > 0) shHfix.getRange(barisHdr, Hf.kodeHeader + 1).setValue(khBaru);
          }
          if(!bentrok) khFix = khBaru;   // bila bentrok -> pertahankan khLama (jangan timpa)
        }
      }

      // (B) AYAH (Kode Pekerjaan): pastikan ADA & berantai dari Kode Header yg sudah benar (khFix).
      if(khFix){
        if(!kpLama){
          // Ayah belum terbuat -> generate baru dari khFix (anak pertama -> -PNY.001).
          kpFix = _nextPnyForHeader(khFix);
        } else if(khLama && kpLama.indexOf(khLama + '-') === 0 && khFix !== khLama){
          // Ayah lama berantai dari header lama -> tukar prefiks header (pertahankan -PNY.nnn).
          kpFix = khFix + kpLama.substring(khLama.length);
        } else if(kpLama.indexOf(khFix + '-PNY.') !== 0){
          // Ayah ada tapi TIDAK berantai dari khFix (prefiks beda/rusak) -> regenerate.
          kpFix = _nextPnyForHeader(khFix);
        }
      }

      // (C) Tulis-balik ke baris induk realisasi bila ada perubahan.
      var khBerubah = (khFix && khFix !== khLama);
      var kpBerubah = (kpFix && kpFix !== kpLama);
      if(khBerubah) shL.getRange(pickRowSheet, RL.kodeHeader + 1).setValue(khFix);
      if(kpBerubah) shL.getRange(pickRowSheet, RL.kodePekerjaan + 1).setValue(kpFix);
      if(khBerubah || kpBerubah) SpreadsheetApp.flush();

      return { kodeHeader: khFix, kodePekerjaan: kpFix, section: secLama,
               rowSheet: pickRowSheet, dibuat: false };
    }
  }

  // 2) Tidak ada induk -> pastikan header ada (buat bila perlu) lalu tulis baris realisasi baru.
  var kodeHeader    = _ensureHeaderRow(ss, tim, tglStr, ulp, inputOleh);
  var kodePekerjaan = kodeHeader ? _generateKodePekerjaanRealisasi(ss, kodeHeader) : '';
  if(!kodePekerjaan){
    // Tanpa Kode Header pun realisasi tetap dibuat agar eksekusi tertaut; pakai pola mandiri.
    var kodeUlp = _kodeUlpByUlp(ss, ulp);
    kodePekerjaan = 'RLZ-' + String(kodeUlp||'').trim() + _normTgl(tglStr).replace(/-/g,'')
                    + '-' + ('000'+(shL.getLastRow())).slice(-3);
  }

  var tglObj = new Date(tglStr + 'T00:00:00'); if(isNaN(tglObj.getTime())) tglObj = new Date();
  var hari   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][tglObj.getDay()];
  var now    = new Date();

  var baris = new Array(COL_ROW_RLZ_N).fill('');
  // Kolom A (No) dibiarkan utk formula di sheet.
  baris[RL.kodeHeader]    = kodeHeader;
  baris[RL.kodePekerjaan] = kodePekerjaan;
  baris[RL.hari]          = hari;
  baris[RL.tanggal]       = tglObj;
  baris[RL.tim]           = tim;
  baris[RL.penyulang]     = penyulang;
  baris[RL.section]       = section;
  baris[RL.rabas]         = 0;
  baris[RL.sedang]        = 0;
  baris[RL.besar]         = 0;
  baris[RL.inputOleh]     = inputOleh;
  baris[RL.timestamp]     = now;

  var targetRow = shL.getLastRow() + 1;
  shL.getRange(targetRow, 2, 1, COL_ROW_RLZ_N - 1).setValues([baris.slice(1)]);
  // Samakan format TimeStamp realisasi -> datetime dd/MM/yyyy HH:mm:ss (nilai di-set server).
  shL.getRange(targetRow, RL.timestamp + 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  SpreadsheetApp.flush();

  return { kodeHeader: kodeHeader, kodePekerjaan: kodePekerjaan, section: section,
           rowSheet: targetRow, dibuat: true };
}


/* ═══ TO ROW (Tek-ROW) — Tim dari db_Users + Penerusan + Eksekusi ═══ */

// Daftar tim UNIK dari db_Users (kolom I = Tim), difilter per-ULP (kolom F = ULP).
// Tanpa ULP (mis. Super User memilih "Semua") -> semua tim. Frontend membaca t.namaTim.
function getListTimUsersByUlp(ulp){
  try{
    var sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('db_Users');
    if(!sh || sh.getLastRow() < 2) return [];
    var data = sh.getRange(2, 1, sh.getLastRow() - 1, COL_USERS.tim + 1).getValues();
    var f = String(ulp || '').trim().toLowerCase();
    var seen = {}, out = [];
    for(var i=0;i<data.length;i++){
      var rUlp = String(data[i][COL_USERS.ulp] || '').trim();
      var tim  = String(data[i][COL_USERS.tim] || '').trim();
      if(!tim) continue;
      if(f && rUlp.toLowerCase() !== f) continue;
      var key = tim.toLowerCase();
      if(seen[key]) continue;
      seen[key] = true;
      out.push({ namaTim: tim, ulp: rUlp });
    }
    out.sort(function(a,b){ return a.namaTim.localeCompare(b.namaTim); });
    return out;
  }catch(e){
    return [];
  }
}

// Folder Drive khusus foto ROW Eksekusi (pola sama dgn foto temuan)
function _folderRowEksekusiPath(tanggal, kodePekerjaan){
  var p = _normTgl(tanggal).split('-');                 // [yyyy, mm, dd]
  var bl = parseInt(p[1], 10) || 1;
  var blFolder = ('0' + bl).slice(-2) + '. ' + _BULAN_ID_INS[bl - 1];
  return ['AppSheet SiSi - ULP Toboali','ROW Eksekusi', p[0], blFolder, p[2] || '', kodePekerjaan];
}

// Teruskan temuan ke Tim ROW + isi Data Eksekusi.
//   1) Update baris db_INS_Temuan  -> status 'Selesai' + data eksekusi & foto.
//   2) Tulis baris baru db_ROW_Eksekusi (struktur 30 kolom).
// payload: { kodePekerjaan, timPelaksana, catatanSpv, diameter, jenis, tglSelesai, username,
//            fotoPekerjaanB64, fotoPekerjaanMime, fotoSesudahB64, fotoSesudahMime }
function simpanTeruskanROW(payload){
  /* OTENTIKASI + PEMILIKAN (29 Agu 2026).
     Sebelumnya NOL pemeriksaan: kodePekerjaan diterima dari klien, lalu fungsi
     ini menulis db_INS_Temuan, membuat baris db_ROW_Eksekusi, dan MENGUNGGAH
     FOTO ke Drive — semua bisa dilakukan siapa pun tanpa login. */
  var gAks = guard_(arguments, { ulp: true, aksi: 'simpanTeruskanROW' });
  try{
    payload = payload || {};
    var kodePekerjaan = String(payload.kodePekerjaan || '').trim();
    var timPelaksana  = String(payload.timPelaksana  || '').trim();
    if(!kodePekerjaan) return { ok:false, message:'Kode Pekerjaan kosong.' };
    if(!timPelaksana)  return { ok:false, message:'Tim pelaksana wajib dipilih.' };

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var T  = COL_INS.TEMUAN;

    var loc = _findRowTemuan(kodePekerjaan);
    if(!loc) return { ok:false, message:'Temuan tidak ditemukan: ' + kodePekerjaan };
    var rowVals = loc.sheet.getRange(loc.row, 1, 1, loc.sheet.getLastColumn()).getValues()[0];
    if(!barisUlpCocok_(gAks, rowVals[T.ulp])){
      audit_(gAks.sesi, 'simpanTeruskanROW', kodePekerjaan, 'TOLAK', 'temuan milik ULP lain');
      return { ok:false, message:'Temuan bukan milik ULP Anda.' };
    }

    var ulp           = String(rowVals[T.ulp]           || '').trim();
    var penyulang     = String(rowVals[T.penyulang]     || '').trim();
    var section       = String(rowVals[T.section]       || '').trim();
    var nomorTiang    = String(rowVals[T.nomorTiang]    || '').trim();
    var fotoTemuanUrl = String(rowVals[T.fotoTemuanUrl] || '').trim();

    var diameter   = Number(payload.diameter) || 0;
    var jenis      = safeCell_(String(payload.jenis || '').trim() || _jenisPekerjaan(diameter));
    var tglSelesai = _normTgl(payload.tglSelesai || new Date());
    /* Pencatat dari SESI — bukan payload.username yang dikirim klien. */
    var username   = String(gAks.username || '').trim();
    var now        = new Date();

    // Upload foto (pola foto temuan -> Drive, ANYONE_WITH_LINK)
    var folder = null;
    function _f(){ if(!folder) folder = _getOrCreateFolderByPath(_folderRowEksekusiPath(tglSelesai, kodePekerjaan)); return folder; }
    var base = kodePekerjaan + '_' + penyulang;
    var fPkj = { nama:'', url:'' }, fSsd = { nama:'', url:'' };
    if(payload.fotoPekerjaanB64) fPkj = _uploadFotoTemuan(payload.fotoPekerjaanB64, payload.fotoPekerjaanMime, base + '_Foto Pekerjaan', _f());
    if(payload.fotoSesudahB64)   fSsd = _uploadFotoTemuan(payload.fotoSesudahB64,   payload.fotoSesudahMime,   base + '_Foto Sesudah',   _f());

    // 1) Update db_INS_Temuan
    var sh = loc.sheet, row = loc.row;
    sh.getRange(row, T.timEksekusi    + 1).setValue(timPelaksana);
    sh.getRange(row, T.forwardBy      + 1).setValue(username);
    sh.getRange(row, T.tglForward     + 1).setValue(now);
    if(payload.catatanSpv != null) sh.getRange(row, T.catatan + 1).setValue(String(payload.catatanSpv));
    sh.getRange(row, T.diameter       + 1).setValue(diameter);
    sh.getRange(row, T.jenisPekerjaan + 1).setValue(jenis);
    if(fPkj.nama) sh.getRange(row, T.fotoPekerjaan    + 1).setValue(fPkj.nama);
    if(fPkj.url)  sh.getRange(row, T.fotoPekerjaanUrl + 1).setValue(fPkj.url);
    if(fSsd.nama) sh.getRange(row, T.fotoSesudah      + 1).setValue(fSsd.nama);
    if(fSsd.url)  sh.getRange(row, T.fotoSesudahUrl   + 1).setValue(fSsd.url);
    sh.getRange(row, T.tglSelesai       + 1).setValue(tglSelesai);
    sh.getRange(row, T.inputBySelesai   + 1).setValue(username);
    sh.getRange(row, T.timestampSelesai + 1).setValue(now);
    sh.getRange(row, T.status           + 1).setValue(STATUS_INS.SELESAI);

    // 2) Tulis baris baru db_ROW_Eksekusi (struktur 30 kolom)
    var kodeRow = '';
    var shR = ss.getSheetByName('db_ROW_Eksekusi');
    if(shR){
      var tglObj = new Date(tglSelesai + 'T00:00:00');
      if(isNaN(tglObj.getTime())) tglObj = now;

      // Selaraskan dgn realisasi induk (db_ROW_Realisasi): cari baris yg cocok
      // Tim + Penyulang + Tanggal, lalu match Section. Pakai Kode Pekerjaan & Kode Header
      // realisasi tsb agar eksekusi TERTAUT ke realisasi (penting utk sinkron Step 5 recalc
      // & anti-dobel). Fallback ke Kode Pekerjaan temuan bila realisasi belum ada.
      var kodePekerjaanRlz = '', kodeHeaderRlz = '';
      try {
        var shRlz = ss.getSheetByName('db_ROW_Realisasi');
        if (shRlz && shRlz.getLastRow() > 1) {
          var RLz = COL_ROW_RLZ;
          var rlzAll = shRlz.getRange(2, 1, shRlz.getLastRow() - 1, COL_ROW_RLZ_N).getValues();
          var pickMatch = null, pickFirst = null;
          for (var ri = 0; ri < rlzAll.length; ri++) {
            var rr = rlzAll[ri];
            if (String(rr[RLz.tim] || '').trim().toLowerCase() !== timPelaksana.toLowerCase()) continue;
            if (String(rr[RLz.penyulang] || '').trim().toLowerCase() !== penyulang.toLowerCase()) continue;
            if (_normTanggal(rr[RLz.tanggal]) !== tglSelesai) continue;
            if (!pickFirst) pickFirst = rr;
            var secR = String(rr[RLz.section] || '').trim();
            if (secR && section && secR === section) { pickMatch = rr; break; }
          }
          var pick = pickMatch || pickFirst;
          if (pick) {
            kodePekerjaanRlz = String(pick[RLz.kodePekerjaan] || '').trim();
            kodeHeaderRlz    = String(pick[RLz.kodeHeader]    || '').trim();
          }
        }
      } catch (eRlz) { Logger.log('[simpanTeruskanROW] lookup realisasi gagal: ' + eRlz.message); }

      // Kode Pekerjaan final: utamakan dari realisasi induk; fallback ke kode temuan.
      var kodePekerjaanFinal = kodePekerjaanRlz || kodePekerjaan;
      // Kode Eksekusi berantai dari Kode Pekerjaan realisasi: <KodePekerjaan>-EKS.<urut3>.
      kodeRow = _generateKodeEksekusiRow(ss, kodePekerjaanFinal);

      // Koordinat & foto sebelum diambil dari baris temuan (db_INS_Temuan)
      var koordPek    = String(rowVals[T.koordinat] || '').trim();        // V
      var latPek      = parseFloat(rowVals[T.lat]);  if(isNaN(latPek))  latPek  = '';  // W
      var longPek     = parseFloat(rowVals[T.long]); if(isNaN(longPek)) longPek = '';  // X
      var fotoSblNama = String(rowVals[T.fotoTemuan] || '').trim();       // Q

      var baris = new Array(COL_ROW_N).fill('');
      // No (A) dibiarkan untuk formula COUNTA di sheet.
      baris[COL_ROW.kodeHeader]         = kodeHeaderRlz;                     // dari realisasi induk (kalau ada)
      baris[COL_ROW.kodePekerjaan]      = kodePekerjaanFinal;                // utamakan Kode Pekerjaan realisasi; fallback ke kode temuan
      baris[COL_ROW.kodeEksekusi]       = kodeRow;         // Kode Eksekusi (berantai dari Kode Pekerjaan)
      baris[COL_ROW.ulp]                = ulp;
      baris[COL_ROW.hari]               = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][tglObj.getDay()];
      baris[COL_ROW.tanggal]            = tglObj;
      baris[COL_ROW.tim]                = timPelaksana;
      baris[COL_ROW.penyulang]          = penyulang;
      baris[COL_ROW.section]            = section;
      baris[COL_ROW.nomorTiang]         = nomorTiang;
      baris[COL_ROW.koordinatPekerjaan] = koordPek;
      baris[COL_ROW.latPekerjaan]       = latPek;
      baris[COL_ROW.longPekerjaan]      = longPek;
      baris[COL_ROW.fotoSebelum]        = fotoSblNama;
      baris[COL_ROW.fotoSebelumUrl]     = fotoTemuanUrl;
      baris[COL_ROW.fotoPekerjaan]      = fPkj.nama;
      baris[COL_ROW.fotoPekerjaanUrl]   = fPkj.url;
      baris[COL_ROW.fotoSesudah]        = fSsd.nama;
      baris[COL_ROW.fotoSesudahUrl]     = fSsd.url;
      baris[COL_ROW.diameter]           = diameter;
      baris[COL_ROW.jenisPekerjaan]     = jenis;
      baris[COL_ROW.inputOleh]          = username || timPelaksana;
      baris[COL_ROW.timestamp]          = now;

      // Tulis B..AC saja; kolom A (No) dibiarkan untuk formula COUNTA.
      var targetRow = shR.getLastRow() + 1;
      shR.getRange(targetRow, 2, 1, COL_ROW_N - 1).setValues([baris.slice(1)]);
    }

    SpreadsheetApp.flush();

    // Sinkron realisasi + WA otomatis (sama spt jalur AppSheet/webhook): hitung ulang
    // realisasi dari eksekusi & perbarui WA Text header. Eksekusi yg baru ditulis di atas
    // sudah TERTAUT ke realisasi (Kode Pekerjaan disamakan), jadi anti-dobel recalc akan
    // melewatinya & Step 5/6 cukup menyinkronkan angka + WA. Dibungkus try agar kegagalan
    // sinkron tidak menggagalkan penerusan temuan.
    var sinkronWa = null;
    try {
      if (typeof recalcEksekusiROW === 'function') {
        sinkronWa = recalcEksekusiROW(timPelaksana, penyulang, tglSelesai);
      }
    } catch (eSync) { Logger.log('[simpanTeruskanROW] sinkron realisasi/WA gagal: ' + eSync.message); }

    return { ok:true, kodePekerjaan:kodePekerjaan, kodeRow:kodeRow, kodeEksekusi:kodeRow,
             jenis:jenis, fotoPekerjaanUrl:fPkj.url, fotoSesudahUrl:fSsd.url, sinkronWa:sinkronWa };
  }catch(e){
    return { ok:false, message:e.message };
  }
}


/* ═══ RANTAI TERBALIK ROW (bottom-up): db_ROW_Eksekusi (anak) -> db_ROW_Realisasi (induk) -> db_Global_Header (kakek) ═══
   Dipicu Bot AppSheet saat baris BARU ditambah ke db_ROW_Eksekusi dgn Kode Eksekusi = UNIQUEID()
   (kunci stabil acak, TIDAK memuat silsilah). Alur kebalikan dari rantai top-down:
     1) Temukan baris eksekusi berdasarkan Kode Eksekusi (UNIQUEID).
     2) Baca konteksnya: Tim (sub-tim, mis "ROW 03"), Penyulang, Tanggal, ULP.
     3) _ensureRealisasiInduk(): CARI/BUAT induk db_ROW_Realisasi yg cocok Tim+Penyulang+Tanggal+ULP.
        Section TIDAK dipakai sbg kriteria (di-set via formula di db_ROW_Realisasi). Bila induk
        belum ada -> dibuat; KAKEK db_Global_Header juga dibuat
        otomatis bila perlu via _ensureHeaderRow. -> dapat Kode Pekerjaan + Kode Header.
     4) GENERATE Kode Eksekusi baru bila masih UNIQUEID() -> <KodePekerjaan>-EKS.<nnn>, lalu
        TULIS-BALIK Kode Pekerjaan (C), Kode Header (B), & Kode Eksekusi (D) ke baris eksekusi.
        Relasi anak->induk->kakek tetap dijamin lewat KOLOM FK (Kode Pekerjaan & Kode Header).
     5) Sinkron angka (Rabas/Sedang/Besar) + WA header: ditandai 'dirty' ke antrean recalcTick
        (markRecalcRowDirty_ + markWaDirty_) agar respons webhook cepat; fallback sinkron langsung
        (recalcEksekusiROW + recalcWaByHeader) bila antrean belum terpasang.
   Kunci pencocokan: Tim + Penyulang + Tanggal + ULP — anti-duplikat induk/kakek. (Section di-set
   via formula di db_ROW_Realisasi, bukan kriteria pencocokan.)
   Mengembalikan { ok, kodeEksekusi, kodeHeader, kodePekerjaan, indukDibuat, ... }.
*/
function prosesEksekusiROW(kodeEksekusi){
  try{
    var key = String(kodeEksekusi || '').trim();
    if(!key) return { ok:false, message:'Kode Eksekusi kosong.' };

    var ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
    var shR = ss.getSheetByName('db_ROW_Eksekusi');
    if(!shR) return { ok:false, message:'Sheet db_ROW_Eksekusi tidak ditemukan' };
    if(shR.getLastRow() < 2) return { ok:false, message:'db_ROW_Eksekusi kosong' };

    // 1) Cari baris eksekusi berdasarkan Kode Eksekusi (kolom D).
    var data = shR.getRange(2, 1, shR.getLastRow() - 1, COL_ROW_N).getValues();
    var rowIdx = -1, r = null;
    for(var i=0;i<data.length;i++){
      if(String(data[i][COL_ROW.kodeEksekusi]||'').trim() === key){ rowIdx = i + 2; r = data[i]; break; }
    }
    if(rowIdx === -1) return { ok:false, message:'Kode Eksekusi tidak ditemukan: ' + key };

    // 2) Baca konteks baris eksekusi.
    var tim       = String(r[COL_ROW.tim] || '').trim();          // sub-tim spesifik, mis "ROW 03"
    var penyulang = String(r[COL_ROW.penyulang] || '').trim();
    var tglStr    = _normTanggal(r[COL_ROW.tanggal]);
    var ulp       = String(r[COL_ROW.ulp] || '').trim();
    var inputOleh = String(r[COL_ROW.inputOleh] || '').trim();   // kolom AC db_ROW_Eksekusi (Input Oleh)
    if(!tim || !penyulang || !tglStr){
      return { ok:false, message:'Data eksekusi belum lengkap (butuh Tim + Penyulang + Tanggal).',
               kodeEksekusi:key, tim:tim, penyulang:penyulang, tanggal:tglStr };
    }

    // 2b) GUARD TIM ROW: hanya bangun rantai (Kode Header / Kode Pekerjaan / Kode Eksekusi)
    //     bila tim adalah Tim ROW. Bila bukan (mis. bot db_ROW_Eksekusi tak sengaja menangkap
    //     baris tim lain), lewati tanpa membuat header/realisasi/kode apa pun.
    if(!_isTimROW_(tim)){
      return { ok:false, skipped:true, alasan:'bukan tim ROW', kodeEksekusi:key, tim:tim,
               penyulang:penyulang, tanggal:tglStr };
    }

    // 3) CARI/BUAT induk realisasi (+ kakek header bila perlu) via helper yg sudah ada.
    //    Pencocokan: Tim + Penyulang + Tanggal + ULP -> anti-duplikat. Section TIDAK dikirim
    //    sbg kriteria; Section di-set via formula di db_ROW_Realisasi.
    var induk = _ensureRealisasiInduk(ss, {
      tim: tim, penyulang: penyulang, tanggal: tglStr, ulp: ulp, inputOleh: inputOleh
    });
    if(!induk || !induk.kodePekerjaan){
      return { ok:false, message:'Gagal membuat/menemukan induk realisasi.',
               kodeEksekusi:key, tim:tim, penyulang:penyulang, tanggal:tglStr };
    }
    var kodeHeader    = String(induk.kodeHeader || '').trim();
    var kodePekerjaan = String(induk.kodePekerjaan || '').trim();

    // 4) Kode Eksekusi: bila masih UNIQUEID() (belum berformat berantai <KodePekerjaan>-EKS.<nnn>),
    //    GENERATE baru yg berantai dari Kode Pekerjaan induk. Dihitung SEBELUM Kode Pekerjaan
    //    ditulis ke kolom C agar urutan (nnn) tidak menghitung baris ini sendiri. Idempoten:
    //    kode yg sudah berformat ...-EKS.nnn TIDAK digenerate ulang (aman bila bot fire lagi).
    var kodeEksLama  = String(r[COL_ROW.kodeEksekusi] || '').trim();
    var kodeEksFinal = kodeEksLama;
    // Regenerasi Kode Eksekusi + tulis-balik dibungkus Mutex (LockService) agar dua proses
    // paralel (mis. dua webhook AppSheet bersamaan) tidak mengambil nomor urut yg sama.
    // Lock mencakup BACA nomor + TULIS ke sheet sebelum lock dilepas -> proses berikutnya
    // membaca nomor yg sudah tertulis -> double Kode Eksekusi tidak terjadi.
    var eksFinalLock = LockService.getScriptLock();
    eksFinalLock.waitLock(15000);
    try{
      // Regenerasi bila: (a) belum berformat <KodePekerjaan>-EKS.nnn, ATAU
      // (b) sudah ...-EKS.nnn TAPI prefiks-nya BUKAN Kode Pekerjaan induk (mis. hasil INITIAL
      // VALUE "-EKS.001" saat Kode Pekerjaan masih kosong pada input langsung). Idempoten: kode
      // yg sudah berprefiks Kode Pekerjaan induk TIDAK digenerate ulang (aman bila bot fire lagi).
      var sudahBerantai = kodePekerjaan && kodeEksLama.indexOf(kodePekerjaan + '-EKS.') === 0;
      if(kodePekerjaan && !sudahBerantai){
        var genEks = _generateKodeEksekusiRow(ss, kodePekerjaan);
        if(genEks) kodeEksFinal = genEks;
      }

      // 5) TULIS-BALIK ke baris eksekusi: Kode Pekerjaan (C), Kode Header (B), Kode Eksekusi (D).
      // Ditulis di DALAM lock yg sama agar proses lain yg menunggu membaca nomor yg sudah
      // tertulis (bukan sebelum tulis -> tidak ada celah dobel nomor).
      if(String(r[COL_ROW.kodePekerjaan]||'').trim() !== kodePekerjaan)
        shR.getRange(rowIdx, COL_ROW.kodePekerjaan + 1).setValue(kodePekerjaan);
      if(kodeHeader && String(r[COL_ROW.kodeHeader]||'').trim() !== kodeHeader)
        shR.getRange(rowIdx, COL_ROW.kodeHeader + 1).setValue(kodeHeader);
      if(kodeEksFinal && kodeEksFinal !== kodeEksLama)
        shR.getRange(rowIdx, COL_ROW.kodeEksekusi + 1).setValue(kodeEksFinal);
      SpreadsheetApp.flush();
    }finally{
      eksFinalLock.releaseLock();
    }

    // 6) Sinkron angka realisasi + WA header (kakek). Utamakan antrean (respons cepat),
    //    fallback sinkron langsung bila antrean belum terpasang.
    var queued = false, sinkron = null;
    if(typeof markRecalcRowDirty_ === 'function'){
      try{
        queued = markRecalcRowDirty_(tim, tglStr);
        if(kodeHeader && typeof markWaDirty_ === 'function') markWaDirty_(kodeHeader);
        // Tandai foto untuk dipindahkan ke path final: ENQUEUE per KODE EKSEKUSI (final)
        // ke db_FotoRow_Queue; drainFotoRow (trigger 1 mnt) memprosesnya per batch.
        if(kodeEksFinal) enqueueFotoRow_(kodeEksFinal);
      }catch(eQ){ Logger.log('[prosesEksekusiROW] enqueue gagal: ' + eQ.message); }
    } else {
      try{ if(typeof recalcEksekusiROW === 'function') sinkron = recalcEksekusiROW(tim, penyulang, tglStr); }
      catch(eS){ Logger.log('[prosesEksekusiROW] recalcEksekusiROW gagal: ' + eS.message); }
      try{ if(kodeHeader && typeof recalcWaByHeader === 'function') recalcWaByHeader(kodeHeader); }
      catch(eW){ Logger.log('[prosesEksekusiROW] recalcWaByHeader gagal: ' + eW.message); }
    }

    return { ok:true, kodeEksekusi:kodeEksFinal, kodeEksekusiLama:key, kodeHeader:kodeHeader,
             kodePekerjaan:kodePekerjaan, indukDibuat: !!induk.dibuat, tim:tim, penyulang:penyulang,
             tanggal:tglStr, queued:queued, sinkron:sinkron };
  }catch(e){
    return { ok:false, message:'Error: ' + e.message };
  }
}


/* ═══ RECALC: Temuan WO Selesai (ROW) -> db_ROW_Eksekusi ═══
   Memindai db_INS_Temuan berstatus 'Selesai' & kriteria ROW (kolom Diameter terisi —
   hanya Tim ROW yang mengisi Diameter), mencocokkan ke db_ROW_Realisasi (induk) via
   Tim + Penyulang + Tanggal, lalu menduplikat ke db_ROW_Eksekusi (anak) bila belum ada.
   - Bila induk realisasi tidak ada -> DIBUAT OTOMATIS (induk + header bila perlu) via
     _ensureRealisasiInduk, sehingga eksekusi tetap tertaut & nilai langsung terekap.
     (4 kolom header: Koordinat Awal/Akhir & KM Awal/Akhir sengaja dikosongkan.)
   - Anti-dobel: acuan "sudah dicopy atau belum" = (Kode Pekerjaan ROW + KOORDINAT PEKERJAAN) sama.
     Koordinat temuan (kolom Koordinat db_INS_Temuan) disalin ke kolom Koordinat Pekerjaan
     db_ROW_Eksekusi saat dipindah, lalu dipakai sbg pembanding. Fallback ke Nomor Tiang hanya
     bila Koordinat Pekerjaan KOSONG (agar tetap aman dari tabrakan kunci kosong).
   - Hitungan Rabas/Sedang/Besar di db_ROW_Realisasi di-update otomatis.
   Param opsional: filterTim (=Tim Eksekusi), filterPenyulang, filterTanggal (yyyy-MM-dd, default hari ini).
*/
function recalcEksekusiROW(filterTim, filterPenyulang, filterTanggal) {
  try {
    var ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
    var shT = ss.getSheetByName(SHEET_INS.TEMUAN);
    var shR = ss.getSheetByName('db_ROW_Eksekusi');
    var shL = ss.getSheetByName('db_ROW_Realisasi');
    if (!shT || !shR || !shL) return { success:false, message:'Sheet tidak ditemukan (Temuan/Eksekusi/Realisasi)' };

    var T  = COL_INS.TEMUAN;
    var RL = COL_ROW_RLZ;
    var tglTarget = filterTanggal ? _normTanggal(filterTanggal) : _normTanggal(new Date());
    // GUARD MIGRASI: tanggal <= H-2 wilayah arsip — jangan buat/ubah baris (induk & header sudah pindah).
    if (typeof _tglSudahDiarsip_ === 'function' && _tglSudahDiarsip_(tglTarget)) {
      Logger.log('[recalcEksekusiROW] ' + tglTarget + ' <= H-2 (sudah diarsip) — dilewati.');
      return { success: true, skipped: 'diarsip', tanggal: tglTarget, ditambah: 0 };
    }
    var fTim  = filterTim       ? String(filterTim).trim().toLowerCase()       : '';
    var fPeny = filterPenyulang ? String(filterPenyulang).trim().toLowerCase() : '';

    // Generator Kode Eksekusi aman utk banyak baris sekaligus (hitung sheet + cache lokal).
    // Berantai dari Kode Pekerjaan realisasi: <KodePekerjaan>-EKS.<urut3> (urut reset per Kode Pekerjaan).
    var seqCache = {};
    function _nextKodeEks(kodePekerjaanRlz) {
      var key = String(kodePekerjaanRlz || '').trim();
      if (!key) return '';
      if (seqCache[key] === undefined) {
        var base = 0;
        if (shR.getLastRow() > 1) {
          var col = shR.getRange(2, COL_ROW.kodePekerjaan + 1, shR.getLastRow() - 1, 1).getValues();
          for (var i = 0; i < col.length; i++) { if (String(col[i][0] || '').trim() === key) base++; }
        }
        seqCache[key] = base;
      }
      seqCache[key]++;
      return key + '-EKS.' + ('00' + seqCache[key]).slice(-3);
    }

    /* 1) Index realisasi by Tim + Penyulang + Tanggal (4 tim ROW bisa di 1 penyulang) */
    var rlzData = shL.getLastRow() > 1 ? shL.getRange(2, 1, shL.getLastRow() - 1, COL_ROW_RLZ_N).getValues() : [];
    var rlzIndex = {};
    for (var i = 0; i < rlzData.length; i++) {
      var rl = rlzData[i];
      var rlTim  = String(rl[RL.tim] || '').trim();
      var rlPeny = String(rl[RL.penyulang] || '').trim();
      var rlTgl  = _normTanggal(rl[RL.tanggal]);
      if (!rlPeny || !rlTgl) continue;
      var k = rlTim.toLowerCase() + '|' + rlPeny.toLowerCase() + '|' + rlTgl;
      if (!rlzIndex[k]) rlzIndex[k] = [];
      rlzIndex[k].push({
        kodeHeader:    String(rl[RL.kodeHeader] || '').trim(),
        kodePekerjaan: String(rl[RL.kodePekerjaan] || '').trim(),
        section:       String(rl[RL.section] || '').trim(),
        rowSheet:      i + 2
      });
    }

    /* 2) Index eksekusi yg sudah ada (anti-dobel): Kode Pekerjaan ROW + KOORDINAT PEKERJAAN.
          Koordinat = acuan "sudah dicopy atau belum" (unik per lokasi tiang, lebih andal drpd
          Nomor Tiang yg bisa kosong/kembar). Fallback ke Nomor Tiang bila Koordinat Pekerjaan kosong. */
    var exData = shR.getLastRow() > 1 ? shR.getRange(2, 1, shR.getLastRow() - 1, COL_ROW_N).getValues() : [];
    var exSeen = {};
    for (var e = 0; e < exData.length; e++) {
      var kp = String(exData[e][COL_ROW.kodePekerjaan] || '').trim();
      if (!kp) continue;
      var koordEx      = String(exData[e][COL_ROW.koordinatPekerjaan] || '').trim();
      var pembandingEx = koordEx || String(exData[e][COL_ROW.nomorTiang] || '').trim();
      exSeen[kp + '|' + pembandingEx] = true;
    }

    /* 3) Pindai temuan Selesai + kriteria ROW (Diameter terisi) */
    // DUAL-READ (migrasi): db_INS_Temuan dibaca AKTIF + ARSIP (dedup by Kode Pekerjaan) — migrasi
    // Temuan TANPA kriteria tanggal bisa memindahkan temuan Selesai H/H-1 ke arsip lebih dulu.
    var tData = _readSheetDual_(SHEET_INS.TEMUAN, COL_INS.TEMUAN.kodePekerjaan, COL_INS.TEMUAN.folderPath + 1);
    if (!tData.length) return { success:true, ditambah:0, dilewatiDobel:0, tanpaRealisasi:0, message:'Tidak ada temuan' };

    var ditambah = 0, dilewatiDobel = 0, tanpaRealisasi = 0, indukDibuat = 0, barisBaru = [], rlzTerdampak = {}, hdrTerdampakSet = {};
    var now = new Date();

    for (var r = 0; r < tData.length; r++) {
      var row = tData[r];
      if (String(row[T.status] || '').trim() !== STATUS_INS.SELESAI) continue;

      // KRITERIA ROW = Diameter TERISI (0 = Rabas/Pangkas tetap sah). Hanya sel KOSONG (non-ROW) dilewati.
      var rawDia = row[T.diameter];
      if (rawDia === '' || rawDia === null || rawDia === undefined) continue; // Diameter kosong -> bukan ROW
      var diameter = parseFloat(rawDia);
      if (isNaN(diameter)) continue; // nilai Diameter tak valid (0 = Rabas/Pangkas TETAP diproses)

      if (_normTanggal(row[T.tglSelesai]) !== tglTarget) continue;

      var penyulang = String(row[T.penyulang] || '').trim();
      var timEks    = String(row[T.timEksekusi] || '').trim();
      if (fPeny && penyulang.toLowerCase() !== fPeny) continue;
      if (fTim  && timEks.toLowerCase()    !== fTim)  continue;

      var rlzKey = timEks.toLowerCase() + '|' + penyulang.toLowerCase() + '|' + tglTarget;
      var cand = rlzIndex[rlzKey];
      if (!cand || cand.length === 0) {
        // Tidak ada induk realisasi -> BUAT OTOMATIS (induk + header bila perlu) agar eksekusi
        // tertaut & nilai (Rabas/Sedang/Besar) langsung terekap. Header baru: 4 kolom (Koordinat
        // Awal/Akhir, KM Awal/Akhir) sengaja DIKOSONGKAN (diisi tim belakangan via AppSheet).
        var indukBaru = _ensureRealisasiInduk(ss, {
          tim: timEks, penyulang: penyulang, tanggal: tglTarget,
          section: String(row[T.section] || '').trim(), ulp: String(row[T.ulp] || '').trim()
        });
        if (!indukBaru || !indukBaru.kodePekerjaan) { tanpaRealisasi++; continue; }
        var entryBaru = { kodeHeader: indukBaru.kodeHeader, kodePekerjaan: indukBaru.kodePekerjaan,
                          section: indukBaru.section, rowSheet: indukBaru.rowSheet };
        cand = [entryBaru];
        rlzIndex[rlzKey] = cand;
        indukDibuat++;
        // Daftarkan induk baru ke rlzData agar Step 5 ikut menyinkronkan nilainya dari eksekusi.
        if (indukBaru.rowSheet) {
          var synthetic = new Array(COL_ROW_RLZ_N).fill('');
          synthetic[RL.kodeHeader]    = indukBaru.kodeHeader;
          synthetic[RL.kodePekerjaan] = indukBaru.kodePekerjaan;
          synthetic[RL.tim]           = timEks;
          synthetic[RL.penyulang]     = penyulang;
          synthetic[RL.tanggal]       = tglTarget;
          synthetic[RL.section]       = indukBaru.section;
          synthetic[RL.rabas] = 0; synthetic[RL.sedang] = 0; synthetic[RL.besar] = 0;
          rlzData[indukBaru.rowSheet - 2] = synthetic;
        }
      }

      var section = String(row[T.section] || '').trim();
      var match = null;
      for (var c = 0; c < cand.length; c++) { if (cand[c].section && section && cand[c].section === section) { match = cand[c]; break; } }
      if (!match) match = cand[0];

      var nomorTiang = String(row[T.nomorTiang] || '').trim();
      // ANTI-DOBEL: acuan "sudah dicopy atau belum" = Kode Pekerjaan + KOORDINAT PEKERJAAN
      // (koordinat temuan yg disalin ke kolom Koordinat Pekerjaan). Koordinat unik per lokasi
      // tiang -> lebih andal drpd Nomor Tiang. Fallback ke Nomor Tiang hanya bila koordinat kosong.
      var koordTemuanDedup = String(row[T.koordinat] || '').trim();
      var pembandingDedup  = koordTemuanDedup || nomorTiang;
      var dedupKey = match.kodePekerjaan + '|' + pembandingDedup;
      if (exSeen[dedupKey]) { dilewatiDobel++; continue; }

      var ulp      = String(row[T.ulp] || '').trim();
      var jenis    = String(row[T.jenisPekerjaan] || '').trim() || _jenisPekerjaan(diameter);
      var tglObj   = new Date(tglTarget + 'T00:00:00'); if (isNaN(tglObj.getTime())) tglObj = now;
      var koordPek = String(row[T.koordinat] || '').trim();
      var latPek   = parseFloat(row[T.lat]);  if (isNaN(latPek))  latPek  = '';
      var longPek  = parseFloat(row[T.long]); if (isNaN(longPek)) longPek = '';

      var baris = new Array(COL_ROW_N).fill('');
      baris[COL_ROW.kodeHeader]         = match.kodeHeader;
      baris[COL_ROW.kodePekerjaan]      = match.kodePekerjaan;
      baris[COL_ROW.kodeEksekusi]       = _nextKodeEks(match.kodePekerjaan);
      baris[COL_ROW.ulp]                = ulp;
      baris[COL_ROW.hari]               = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][tglObj.getDay()];
      baris[COL_ROW.tanggal]            = tglObj;
      baris[COL_ROW.tim]                = timEks;
      baris[COL_ROW.penyulang]          = penyulang;
      baris[COL_ROW.section]            = section;
      baris[COL_ROW.nomorTiang]         = nomorTiang;
      baris[COL_ROW.koordinatPekerjaan] = koordPek;
      baris[COL_ROW.latPekerjaan]       = latPek;
      baris[COL_ROW.longPekerjaan]      = longPek;
      baris[COL_ROW.fotoSebelum]        = String(row[T.fotoTemuan] || '').trim();
      baris[COL_ROW.fotoSebelumUrl]     = String(row[T.fotoTemuanUrl] || '').trim();
      baris[COL_ROW.fotoPekerjaan]      = String(row[T.fotoPekerjaan] || '').trim();
      baris[COL_ROW.fotoPekerjaanUrl]   = String(row[T.fotoPekerjaanUrl] || '').trim();
      baris[COL_ROW.fotoSesudah]        = String(row[T.fotoSesudah] || '').trim();
      baris[COL_ROW.fotoSesudahUrl]     = String(row[T.fotoSesudahUrl] || '').trim();
      baris[COL_ROW.diameter]           = diameter;
      baris[COL_ROW.jenisPekerjaan]     = jenis;
      baris[COL_ROW.inputOleh]          = String(row[T.inputBySelesai] || timEks).trim();
      baris[COL_ROW.timestamp]          = now;

      barisBaru.push(baris.slice(1));
      exSeen[dedupKey] = true;
      rlzTerdampak[match.rowSheet] = match.kodePekerjaan;
      if (match.kodeHeader) hdrTerdampakSet[match.kodeHeader] = true;
      ditambah++;
    }

    /* 4) Tulis semua baris baru sekaligus (B..AD) */
    if (barisBaru.length > 0) {
      var startRow = shR.getLastRow() + 1;
      shR.getRange(startRow, 2, barisBaru.length, COL_ROW_N - 1).setValues(barisBaru);
      SpreadsheetApp.flush();
    }

    /* 5) Sinkronkan Section + Rabas/Sedang/Besar di db_ROW_Realisasi dari db_ROW_Eksekusi.
          Cocokkan via Kode Pekerjaan ROW (relasi induk-anak). Dilakukan utk SEMUA realisasi
          yg punya Kode Pekerjaan & sudah punya eksekusi, agar tetap akurat walau eksekusi
          sudah ada sebelumnya (bukan hanya yg baru ditambah pada run ini). */
    if (rlzData.length > 0) {
      var penySecList2 = _buildPenySecList(ss.getSheetByName('db_Penyulang'));
      var exAll = shR.getLastRow() > 1 ? shR.getRange(2, 1, shR.getLastRow() - 1, COL_ROW_N).getValues() : [];

      // Agregasi eksekusi per Kode Pekerjaan ROW: HANYA eksekusi dgn FOTO LENGKAP yg dihitung.
      // hasEks menandai Kode Pekerjaan yg punya eksekusi (foto lengkap atau belum) -> dipakai agar
      // realisasi yg eksekusinya ada tapi foto belum lengkap di-set 0 (bukan nilai stale), sedangkan
      // realisasi yg belum punya eksekusi sama sekali TIDAK ditimpa.
      var aggByKode = {}, hasEks = {};
      for (var x = 0; x < exAll.length; x++) {
        var ex = exAll[x];
        var kp = String(ex[COL_ROW.kodePekerjaan] || '').trim();
        if (!kp) continue;
        hasEks[kp] = true;
        if (!_fotoLengkap(ex)) continue; // hitung hanya eksekusi dgn foto lengkap
        if (!aggByKode[kp]) aggByKode[kp] = { sections: [], rabas: 0, sedang: 0, besar: 0 };
        var exSec = String(ex[COL_ROW.section] || '').trim();
        if (exSec && aggByKode[kp].sections.indexOf(exSec) === -1) aggByKode[kp].sections.push(exSec);
        var jx = String(ex[COL_ROW.jenisPekerjaan] || '').toLowerCase();
        if      (jx.indexOf('rabas') >= 0 || jx.indexOf('pangkas') >= 0) aggByKode[kp].rabas++;
        else if (jx.indexOf('sedang') >= 0) aggByKode[kp].sedang++;
        else if (jx.indexOf('besar')  >= 0) aggByKode[kp].besar++;
      }

      // Tulis Section + hitungan ke tiap realisasi sesuai Kode Pekerjaan-nya.
      // Bila nilai realisasi BERUBAH, tandai Kode Header-nya (hdrTerdampakSet) agar WA Text
      // header ikut di-recalc di step 6 — termasuk saat TIDAK ada eksekusi baru (mis. foto baru
      // lengkap belakangan), supaya Section/angka di db_Global_Header tidak tertinggal.
      for (var rr = 0; rr < rlzData.length; rr++) {
        var rl2 = rlzData[rr];
        var kp2 = String(rl2[RL.kodePekerjaan] || '').trim();
        if (!kp2) continue;
        // SINKRON PENUH "sesuai data yang ada": realisasi selalu mengikuti agregasi eksekusi
        // foto-lengkap saat ini. Bila eksekusi utk Kode Pekerjaan ini sudah tidak ada / belum
        // foto-lengkap -> agg2 di-reset ke 0, supaya penghapusan eksekusi langsung menurunkan
        // angka realisasi & WA (tidak ada nilai stale; tidak ada baris realisasi yang dilewati).
        var agg2 = aggByKode[kp2] || { sections: [], rabas: 0, sedang: 0, besar: 0 };
        var sheetRow2 = rr + 2;
        var rlPeny2   = String(rl2[RL.penyulang] || '').trim();
        var secRange2 = _getSectionRange(rlPeny2, agg2.sections, penySecList2);

        var berubah = false;
        if (secRange2 && secRange2 !== '-' && secRange2 !== String(rl2[RL.section] || '').trim()) {
          shL.getRange(sheetRow2, RL.section + 1).setValue(secRange2);
          berubah = true;
        }
        if ((Number(rl2[RL.rabas])  || 0) !== agg2.rabas ||
            (Number(rl2[RL.sedang]) || 0) !== agg2.sedang ||
            (Number(rl2[RL.besar])  || 0) !== agg2.besar) {
          shL.getRange(sheetRow2, RL.rabas + 1, 1, 3).setValues([[agg2.rabas, agg2.sedang, agg2.besar]]);
          berubah = true;
        }
        if (berubah) {
          var khR = String(rl2[RL.kodeHeader] || '').trim();
          if (khR) hdrTerdampakSet[khR] = true;
        }
      }
      SpreadsheetApp.flush();
    }

    /* 6) Perbarui Laporan Harian (db_ROW_Lap_Harian) + WA Text header via WA engine.
          Jalan bila ada eksekusi BARU (ditambah) ATAU ada nilai realisasi yg berubah di step 5
          (hdrTerdampakSet terisi) — supaya Section/angka di db_Global_Header tidak tertinggal. */
    var laporanRefreshed = false, waHeaderDiperbarui = 0;
    var hdrKeys = Object.keys(hdrTerdampakSet);
    if (ditambah > 0 || hdrKeys.length > 0) {
      try { refreshLaporanHarianROW(); laporanRefreshed = true; }
      catch (eR) { Logger.log('[recalcEksekusiROW] refreshLaporanHarianROW gagal: ' + eR.message); }

      // WA Text di db_Global_Header dipusatkan ke WA engine (recalcWaByHeader -> recalcWaRow_).
      for (var hk = 0; hk < hdrKeys.length; hk++) {
        try {
          if (typeof recalcWaByHeader === 'function') { recalcWaByHeader(hdrKeys[hk]); waHeaderDiperbarui++; }
        } catch (eW) { Logger.log('[recalcEksekusiROW] recalcWaByHeader gagal (' + hdrKeys[hk] + '): ' + eW.message); }
      }
    }

    Logger.log('[recalcEksekusiROW] tgl=' + tglTarget + ' ditambah=' + ditambah + ' indukDibuat=' + indukDibuat + ' dobel=' + dilewatiDobel + ' tanpaRealisasi=' + tanpaRealisasi + ' laporanRefreshed=' + laporanRefreshed + ' waHeader=' + waHeaderDiperbarui);
    return { success:true, tanggal:tglTarget, ditambah:ditambah, indukDibuat:indukDibuat, dilewatiDobel:dilewatiDobel, tanpaRealisasi:tanpaRealisasi, laporanRefreshed:laporanRefreshed, waHeaderDiperbarui:waHeaderDiperbarui };
  } catch(e) {
    Logger.log('[recalcEksekusiROW] ERROR: ' + e.message);
    return { success:false, message:e.message };
  }
}


/* ═══ WRAPPER UNTUK TRIGGER WAKTU ═══
   PENTING: trigger waktu mengirim OBJEK EVENT sebagai argumen pertama. Bila trigger
   dipasang langsung ke recalcEksekusiROW, objek itu terbaca sebagai filterTim -> 0 data.
   Maka pasang trigger ke wrapper ini; ia memanggil recalcEksekusiROW() default (hari ini,
   semua tim & penyulang). */
function jalankanRecalcEksekusiROWHarian() {
  // Hanya beroperasi antara jam 08:00 - 19:00 WIB; di luar itu dilewati.
  var jam = Number(Utilities.formatDate(new Date(), 'Asia/Jakarta', 'H'));
  if (jam < 8 || jam > 19) {
    Logger.log('[jalankanRecalcEksekusiROWHarian] Lewat (jam ' + jam + ' di luar 08-19 WIB)');
    return { success: true, skipped: true, jam: jam };
  }
  var hasil = recalcEksekusiROW(); // default: hari ini, tanpa filter
  Logger.log('[jalankanRecalcEksekusiROWHarian] ' + JSON.stringify(hasil));
  return hasil;
}

/* ═══ PASANG TRIGGER recalc ROW (jalankan manual SEKALI) ═══
   Memasang trigger waktu tiap 1 jam. Eksekusi nyata dibatasi 08:00-19:00 WIB
   oleh guard di jalankanRecalcEksekusiROWHarian().
   Aman dijalankan ulang: trigger lama utk handler ini dihapus dulu (anti-dobel). */
/* ═══ BUILDER WA ROW (kontrak Tek-WaEngine: recalc(ss, kodeHeader)) ═══
   Membangun WA Text utk 1 header ROW di db_Global_Header lalu menulisnya ke kolom
   WA Text header tsb. Memakai _aggregateForTim + _formatWA (format ROW yg sudah ada).
   Cocok utk 4 sub-tim ROW (ROW 01..04) — pembeda ada di kolom Sub-Tim header. */
function recalcWaRow_(ss, kodeHeader){
  try{
    var H   = COL_INS.HEADER;
    var key = String(kodeHeader || '').trim();
    if(!key) return;

    var shH = ss.getSheetByName(SHEET_INS.HEADER);
    var shE = ss.getSheetByName('db_ROW_Eksekusi');
    var shP = ss.getSheetByName('db_Penyulang');
    if(!shH || !shE) return;

    // Cari baris header sesuai Kode Header
    var hdrData = shH.getDataRange().getValues();
    var hdrRow = null, hdrRowIdx = -1;
    for(var i=1;i<hdrData.length;i++){
      if(String(hdrData[i][H.kodeHeader]||'').trim() === key){ hdrRow = hdrData[i]; hdrRowIdx = i; break; }
    }
    if(!hdrRow) return;

    var ulp    = String(hdrRow[2] || '').trim();          // ULP
    var tim    = String(hdrRow[6] || '').trim();          // Sub-Tim = tim spesifik (mis. ROW 03)
    var tglStr = _normTanggal(hdrRow[4]);                  // Tanggal
    if(!tim || !tglStr) return;

    // WA detail + total bulanan dibaca dari db_ROW_Realisasi di dalam _aggregateForTim,
    // jadi tak perlu memindai db_ROW_Eksekusi di sini (lebih efisien).
    var d      = _aggregateForTim(ulp, tim, tglStr, [], [], hdrRow, null);
    var waText = _formatWA(d);

    // Tulis WA Text ke baris header (hdrRowIdx 0-based -> +1 nomor baris sheet)
    shH.getRange(hdrRowIdx + 1, H.waText + 1).setValue(waText);
    // Set Timestamp Update header (kolom P) tiap WA Text diperbarui — Date objek + format datetime seragam.
    var celTsUpd = shH.getRange(hdrRowIdx + 1, H.timestampUpdate + 1);
    celTsUpd.setValue(new Date());
    celTsUpd.setNumberFormat('dd/MM/yyyy HH:mm:ss');
  }catch(e){
    Logger.log('[recalcWaRow_] ERROR (' + kodeHeader + '): ' + e.message);
  }
}


/* ═══ DIAGNOSTIK WA ROW (jalankan manual di editor Apps Script) ═══
   Pakai utk tahu kenapa blok penyulang WA kosong. Contoh pemanggilan:
     debugRealisasiWaRow('ROW 01', '2026-06-10')
   Lihat hasilnya di Logs (Ctrl+Enter) / menu Executions, atau salin objek yg dikembalikan.
   Yg perlu diperiksa:
     - header.kodeHeader  vs  realisasiTimTanggal[].kodeHeader / realisasiTimBulan[].kodeHeader
     - apakah ADA baris realisasi utk tim ini dgn tanggal = hari ini (penyulang terisi)
     - eksekusiTimTanggal[].fotoLengkap (true bila URL S/U/W terisi semua) */
function debugRealisasiWaRow(tim, tanggal) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var tglStr = _normTanggal(tanggal || new Date());
  var bulan  = tglStr.substring(0, 7);
  var timStr = String(tim || '').trim();
  var out = { tim: timStr, tanggal: tglStr, header: null,
              realisasiTimTanggal: [], realisasiTimBulan: [], eksekusiTimTanggal: [] };

  // Header (db_Global_Header) utk Sub-Tim + tanggal ini
  var H = COL_INS.HEADER;
  var shH = ss.getSheetByName(SHEET_INS.HEADER);
  if (shH && shH.getLastRow() > 1) {
    var hAll = shH.getRange(2, 1, shH.getLastRow() - 1, 16).getValues();
    for (var i = 0; i < hAll.length; i++) {
      if (String(hAll[i][5] || '').trim() !== 'ROW') continue;
      if (String(hAll[i][6] || '').trim() === timStr && _normTanggal(hAll[i][4]) === tglStr) {
        out.header = { kodeHeader: String(hAll[i][H.kodeHeader] || ''), subTim: String(hAll[i][6] || ''), tanggal: _normTanggal(hAll[i][4]) };
        break;
      }
    }
  }

  // Realisasi (db_ROW_Realisasi) milik tim ini
  var RL = COL_ROW_RLZ;
  var shL = ss.getSheetByName('db_ROW_Realisasi');
  if (shL && shL.getLastRow() > 1) {
    var rlz = shL.getRange(2, 1, shL.getLastRow() - 1, COL_ROW_RLZ_N).getValues();
    for (var r = 0; r < rlz.length; r++) {
      if (String(rlz[r][RL.tim] || '').trim() !== timStr) continue;
      var t = _normTanggal(rlz[r][RL.tanggal]);
      var info = { baris: r + 2, kodeHeader: String(rlz[r][RL.kodeHeader] || ''), kodePekerjaan: String(rlz[r][RL.kodePekerjaan] || ''),
                   tanggal: t, penyulang: String(rlz[r][RL.penyulang] || ''), section: String(rlz[r][RL.section] || ''),
                   rabas: rlz[r][RL.rabas], sedang: rlz[r][RL.sedang], besar: rlz[r][RL.besar] };
      if (t === tglStr) out.realisasiTimTanggal.push(info);
      if (t.substring(0, 7) === bulan) out.realisasiTimBulan.push(info);
    }
  }

  // Eksekusi (db_ROW_Eksekusi) utk tim + tanggal ini + status URL foto (S/U/W)
  var shE = ss.getSheetByName('db_ROW_Eksekusi');
  if (shE && shE.getLastRow() > 1) {
    var ex = shE.getRange(2, 1, shE.getLastRow() - 1, COL_ROW_N).getValues();
    for (var e = 0; e < ex.length; e++) {
      if (String(ex[e][COL_ROW.tim] || '').trim() !== timStr) continue;
      if (_normTanggal(ex[e][COL_ROW.tanggal]) !== tglStr) continue;
      out.eksekusiTimTanggal.push({
        kodeHeader: String(ex[e][COL_ROW.kodeHeader] || ''),
        kodePekerjaan: String(ex[e][COL_ROW.kodePekerjaan] || ''),
        penyulang: String(ex[e][COL_ROW.penyulang] || ''),
        jenis: String(ex[e][COL_ROW.jenisPekerjaan] || ''),
        urlS: String(ex[e][COL_ROW.fotoSebelumUrl] || ''),
        urlU: String(ex[e][COL_ROW.fotoPekerjaanUrl] || ''),
        urlW: String(ex[e][COL_ROW.fotoSesudahUrl] || ''),
        fotoLengkap: _fotoLengkap(ex[e])
      });
    }
  }

  Logger.log(JSON.stringify(out, null, 2));
  return out;
}


/* ═══ PERBAIKAN MASSAL KODE ROW (R01→R02 + cascade PNY/EKS) ═══
   Tujuan: memperbaiki baris yang SUDAH terlanjur terbuat dgn tag Kode Header salah
   (mis. "R01-..." hasil INITIAL VALUE AppSheet USERSETTINGS("Sub-Tim") yg basi), padahal
   Sub-Tim baris itu "ROW 02" (seharusnya "R02-..."). Berbeda dgn prosesEksekusiROW yg hanya
   memproses SATU Kode Eksekusi & TIDAK mengoreksi induk yg sudah ada, fungsi ini AMAN dijalankan
   bare dari editor (tanpa argumen) dan memperbaiki SEMUA baris terdampak sekaligus.

   ALUR (top-down, anti-pecah rantai):
     1) Pindai db_Global_Header (Tim='ROW'): hitung tag yg benar = 'R' + 2 digit terakhir
        Sub-Tim. Bila tag Kode Header TIDAK cocok -> TUKAR hanya bagian tag, sisa kode
        (<KodeULP><YYMMDD><NNN>) DIPERTAHANKAN -> mis. R01-1613260619001 -> R02-1613260619001.
        (Sisa kode dipertahankan agar nomor urut & relasi anak tetap konsisten.) Bila target
        sudah dipakai baris header LAIN -> DILEWATI & dicatat sbg konflik (tdk menimpa).
     2) Cascade db_ROW_Realisasi: ganti prefiks header lama -> baru pada Kode Header (sama persis)
        & Kode Pekerjaan (<KodeHeader>-PNY.nnn).
     3) Cascade db_ROW_Eksekusi: ganti prefiks header lama -> baru pada Kode Header, Kode
        Pekerjaan, & Kode Eksekusi (<KodePekerjaan>-EKS.nnn). Suffix -PNY.nnn/-EKS.nnn TIDAK
        diubah -> rantai tetap utuh.
     4) (Opsional, default ON) Proses Kode Eksekusi MENTAH (masih UNIQUEID, belum ber-'-EKS.')
        utk Tim ROW via prosesEksekusiROW -> baris yg belum pernah diproses ikut dibangun
        rantainya (Header/Pekerjaan/Eksekusi) dgn tag yg sudah benar.
     5) Rebuild WA Text header (recalcWaByHeader) utk tiap Kode Header baru + refresh Laporan.

   opts (opsional):
     - dryRun: true  -> simulasi, TIDAK menulis apa pun (lihat ringkasan di Logs dulu).
     - prosesRawEks: false -> lewati langkah 4 (jangan proses Kode Eksekusi mentah).
   Jalankan: perbaikanMassalKodeROW()  atau  perbaikanMassalKodeROW({dryRun:true}) utk pratinjau. */
function perbaikanMassalKodeROW(opts){
  opts = opts || {};
  var dryRun       = !!opts.dryRun;
  var prosesRawEks = opts.prosesRawEks !== false;   // default true
  try{
    var ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
    var H   = COL_INS.HEADER;
    var shH = ss.getSheetByName(SHEET_INS.HEADER);
    var shL = ss.getSheetByName('db_ROW_Realisasi');
    var shE = ss.getSheetByName('db_ROW_Eksekusi');
    if(!shH || !shL || !shE) return { ok:false, message:'Sheet tidak ditemukan (Header/Realisasi/Eksekusi)' };

    var log = { headerDiperbaiki:0, headerKonflik:0, realisasiDiperbaiki:0,
                eksekusiDiperbaiki:0, rawDiproses:0, detail:[] };
    var headerMap = {};   // Kode Header lama -> baru

    /* 1) Koreksi tag Kode Header di db_Global_Header (Tim='ROW'). */
    if(shH.getLastRow() > 1){
      var hData = shH.getRange(2, 1, shH.getLastRow() - 1, 16).getValues();
      var existingHeaders = {};
      for(var a=0;a<hData.length;a++){
        var khA = String(hData[a][H.kodeHeader]||'').trim();
        if(khA) existingHeaders[khA] = 1;
      }
      for(var i=0;i<hData.length;i++){
        if(String(hData[i][H.tim]||'').trim() !== 'ROW') continue;
        var subTim = String(hData[i][H.subTim]||'').trim();
        var kh     = String(hData[i][H.kodeHeader]||'').trim();
        if(!subTim || !kh) continue;
        var expectedTag = 'R' + subTim.slice(-2);
        var dashIdx = kh.indexOf('-');
        var curTag  = dashIdx >= 0 ? kh.substring(0, dashIdx) : kh;
        if(curTag === expectedTag) continue;                 // sudah benar
        var sisa  = dashIdx >= 0 ? kh.substring(dashIdx) : '';  // termasuk '-'
        var newKh = expectedTag + sisa;
        if(newKh === kh) continue;
        if(existingHeaders[newKh]){                           // target sudah dipakai baris lain
          log.headerKonflik++;
          log.detail.push('KONFLIK: ' + kh + ' -> ' + newKh + ' (target sudah ada, dilewati)');
          continue;
        }
        headerMap[kh] = newKh;
        existingHeaders[newKh] = 1;
        if(!dryRun) shH.getRange(i + 2, H.kodeHeader + 1).setValue(newKh);
        log.headerDiperbaiki++;
        log.detail.push('Header: ' + kh + ' -> ' + newKh + ' (Sub-Tim ' + subTim + ')');
      }
      if(!dryRun) SpreadsheetApp.flush();
    }

    var adaMap = Object.keys(headerMap).length > 0;

    /* 2) Cascade db_ROW_Realisasi (Kode Header + Kode Pekerjaan). */
    if(adaMap && shL.getLastRow() > 1){
      var RL = COL_ROW_RLZ;
      var lData = shL.getRange(2, 1, shL.getLastRow() - 1, COL_ROW_RLZ_N).getValues();
      for(var r=0;r<lData.length;r++){
        var khR = String(lData[r][RL.kodeHeader]||'').trim();
        var kpR = String(lData[r][RL.kodePekerjaan]||'').trim();
        var setKh = khR, setKp = kpR, changed = false;
        if(headerMap[khR]){ setKh = headerMap[khR]; changed = true; }
        for(var oldKh in headerMap){
          if(kpR.indexOf(oldKh + '-') === 0){ setKp = headerMap[oldKh] + kpR.substring(oldKh.length); changed = true; break; }
        }
        if(changed){
          if(!dryRun){
            if(setKh !== khR) shL.getRange(r + 2, RL.kodeHeader + 1).setValue(setKh);
            if(setKp !== kpR) shL.getRange(r + 2, RL.kodePekerjaan + 1).setValue(setKp);
          }
          log.realisasiDiperbaiki++;
        }
      }
      if(!dryRun) SpreadsheetApp.flush();
    }

    /* 3) Cascade db_ROW_Eksekusi (Kode Header + Kode Pekerjaan + Kode Eksekusi). */
    if(adaMap && shE.getLastRow() > 1){
      var eData = shE.getRange(2, 1, shE.getLastRow() - 1, COL_ROW_N).getValues();
      for(var e=0;e<eData.length;e++){
        var khE = String(eData[e][COL_ROW.kodeHeader]||'').trim();
        var kpE = String(eData[e][COL_ROW.kodePekerjaan]||'').trim();
        var keE = String(eData[e][COL_ROW.kodeEksekusi]||'').trim();
        var setKhE = khE, setKpE = kpE, setKeE = keE, chg = false;
        if(headerMap[khE]){ setKhE = headerMap[khE]; chg = true; }
        for(var oldKh2 in headerMap){
          var nw = headerMap[oldKh2];
          if(kpE.indexOf(oldKh2 + '-') === 0){ setKpE = nw + kpE.substring(oldKh2.length); chg = true; }
          if(keE.indexOf(oldKh2 + '-') === 0){ setKeE = nw + keE.substring(oldKh2.length); chg = true; }
        }
        if(chg){
          if(!dryRun){
            if(setKhE !== khE) shE.getRange(e + 2, COL_ROW.kodeHeader + 1).setValue(setKhE);
            if(setKpE !== kpE) shE.getRange(e + 2, COL_ROW.kodePekerjaan + 1).setValue(setKpE);
            if(setKeE !== keE) shE.getRange(e + 2, COL_ROW.kodeEksekusi + 1).setValue(setKeE);
          }
          log.eksekusiDiperbaiki++;
        }
      }
      if(!dryRun) SpreadsheetApp.flush();
    }

    /* 4) Proses Kode Eksekusi MENTAH (UNIQUEID, belum ber-'-EKS.') utk Tim ROW. */
    if(prosesRawEks && !dryRun && shE.getLastRow() > 1){
      var eRaw = shE.getRange(2, 1, shE.getLastRow() - 1, COL_ROW_N).getValues();
      var rawKeys = [];
      for(var e2=0;e2<eRaw.length;e2++){
        var tim2 = String(eRaw[e2][COL_ROW.tim]||'').trim();
        var ke2  = String(eRaw[e2][COL_ROW.kodeEksekusi]||'').trim();
        if(!ke2 || !_isTimROW_(tim2)) continue;
        if(ke2.indexOf('-EKS.') >= 0) continue;   // sudah berantai
        rawKeys.push(ke2);
      }
      for(var rk=0;rk<rawKeys.length;rk++){
        try{ var res = prosesEksekusiROW(rawKeys[rk]); if(res && res.ok) log.rawDiproses++; }
        catch(ePr){ Logger.log('[perbaikanMassalKodeROW] proses raw gagal (' + rawKeys[rk] + '): ' + ePr.message); }
      }
    }

    /* 5) Rebuild WA Text header (tiap Kode Header baru) + refresh Laporan Harian. */
    if(!dryRun && (log.eksekusiDiperbaiki > 0 || log.realisasiDiperbaiki > 0 || log.rawDiproses > 0)){
      for(var oldKh3 in headerMap){
        try{ if(typeof recalcWaByHeader === 'function') recalcWaByHeader(headerMap[oldKh3]); }
        catch(eW){ Logger.log('[perbaikanMassalKodeROW] recalcWaByHeader gagal (' + headerMap[oldKh3] + '): ' + eW.message); }
      }
      try{ refreshLaporanHarianROW(); } catch(eR){ Logger.log('[perbaikanMassalKodeROW] refreshLaporanHarianROW gagal: ' + eR.message); }
    }

    Logger.log('[perbaikanMassalKodeROW] ' + JSON.stringify(log, null, 2));
    return { ok:true, dryRun:dryRun, ringkasan:log };
  }catch(e){
    Logger.log('[perbaikanMassalKodeROW] ERROR: ' + e.message);
    return { ok:false, message:'Error: ' + e.message };
  }
}


/* ═══ WRAPPER TRIGGER TIAP MENIT (AMAN) UNTUK perbaikanMassalKodeROW ═══
   PENTING: pasang trigger waktu ke fungsi INI, JANGAN ke perbaikanMassalKodeROW langsung.
   Walau objek event trigger tidak merusak default perbaikanMassalKodeROW
   (dryRun=false, prosesRawEks=true), wrapper ini menambah 2 pengaman utk cadence tiap menit:
     (1) LockService (script lock): bila run sebelumnya BELUM selesai, run ini langsung dilewati
         -> anti-overlap (mencegah dua run menulis sheet bersamaan & salah hitung nomor PNY/EKS).
     (2) Guard EXIT CEPAT: bila TIDAK ada Kode Eksekusi mentah (UNIQUEID) utk Tim ROW & TIDAK ada
         Kode Header ROW ber-tag salah, langsung keluar tanpa memindai berat -> hemat kuota.
   Hanya bila ada pekerjaan nyata, baru memanggil perbaikanMassalKodeROW({ prosesRawEks:true }). */
function jalankanPerbaikanMassalKodeROWMenit(){
  var lock = LockService.getScriptLock();
  if(!lock.tryLock(0)){
    Logger.log('[perbaikanMassalKodeROWMenit] Dilewati: run sebelumnya masih berjalan (locked).');
    return { skipped:true, alasan:'locked' };
  }
  try{
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    if(!_adaPekerjaanPerbaikanROW_(ss)){
      Logger.log('[perbaikanMassalKodeROWMenit] Exit cepat: tidak ada Kode Eksekusi mentah / tag header salah.');
      return { skipped:true, alasan:'nihil' };
    }
    var hasil = perbaikanMassalKodeROW({ prosesRawEks:true });
    Logger.log('[perbaikanMassalKodeROWMenit] ' + JSON.stringify(hasil));
    return hasil;
  } finally {
    try{ lock.releaseLock(); }catch(eRel){}
  }
}

/* Guard ringan: ADA pekerjaan utk perbaikanMassalKodeROW?
   true bila (a) ada baris db_ROW_Eksekusi Tim ROW dgn Kode Eksekusi MENTAH (belum ber-'-EKS.'),
   ATAU (b) ada baris db_Global_Header Tim='ROW' dgn tag Kode Header != 'R'+2 digit Sub-Tim.
   Hanya membaca kolom yg perlu (bukan getDataRange penuh) agar murah dipanggil tiap menit. */
function _adaPekerjaanPerbaikanROW_(ss){
  // (1) Kode Eksekusi mentah (UNIQUEID) utk Tim ROW?
  var shE = ss.getSheetByName('db_ROW_Eksekusi');
  if(shE && shE.getLastRow() > 1){
    var nE   = shE.getLastRow() - 1;
    var tims = shE.getRange(2, COL_ROW.tim + 1,         nE, 1).getValues();
    var keys = shE.getRange(2, COL_ROW.kodeEksekusi + 1, nE, 1).getValues();
    for(var i=0;i<nE;i++){
      var ke = String(keys[i][0]||'').trim();
      if(!ke) continue;
      if(!_isTimROW_(tims[i][0])) continue;
      if(ke.indexOf('-EKS.') < 0) return true;   // mentah -> ada pekerjaan
    }
  }
  // (2) Header ROW dgn tag salah?
  var H   = COL_INS.HEADER;
  var shH = ss.getSheetByName(SHEET_INS.HEADER);
  if(shH && shH.getLastRow() > 1){
    var nH   = shH.getLastRow() - 1;
    var hKh  = shH.getRange(2, H.kodeHeader + 1, nH, 1).getValues();
    var hTim = shH.getRange(2, H.tim + 1,        nH, 1).getValues();
    var hSub = shH.getRange(2, H.subTim + 1,     nH, 1).getValues();
    for(var j=0;j<nH;j++){
      if(String(hTim[j][0]||'').trim() !== 'ROW') continue;
      var sub = String(hSub[j][0]||'').trim();
      var kh  = String(hKh[j][0]||'').trim();
      if(!sub || !kh) continue;
      var expectedTag = 'R' + sub.slice(-2);
      var dashIdx = kh.indexOf('-');
      var curTag  = dashIdx >= 0 ? kh.substring(0, dashIdx) : kh;
      if(curTag !== expectedTag) return true;    // tag salah -> ada pekerjaan
    }
  }
  return false;
}

/* ═══ PASANG TRIGGER perbaikan massal ROW tiap 1 menit (jalankan manual SEKALI) ═══
   Memasang trigger waktu tiap 1 menit ke wrapper aman jalankanPerbaikanMassalKodeROWMenit.
   Aman dijalankan ulang: trigger lama utk wrapper ini DAN trigger langsung ke
   perbaikanMassalKodeROW (bila pernah dipasang) dihapus dulu -> anti-dobel. */
function setupTriggerPerbaikanMassalMenit(){
  ScriptApp.getProjectTriggers().forEach(function(t){
    var fn = t.getHandlerFunction();
    if(fn === 'jalankanPerbaikanMassalKodeROWMenit' || fn === 'perbaikanMassalKodeROW'){
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('jalankanPerbaikanMassalKodeROWMenit').timeBased().everyMinutes(1).create();
  Logger.log('Trigger perbaikan massal ROW dipasang (tiap 1 menit, via wrapper aman).');
  return '✅ Trigger tiap 1 menit dipasang ke jalankanPerbaikanMassalKodeROWMenit (anti-overlap + exit cepat). Trigger langsung ke perbaikanMassalKodeROW (bila ada) sudah dihapus.';
}


/* ═══ URL WEB APP (untuk tombol "Unduh PDF" di frontend Tab 2) ═══
   Mengembalikan URL deployment /exec aktif. Frontend memanggil getExecUrlROW() lalu
   membuka <url>?pdf=rekap&tglDari=&tglSampai=&tim=&penyulang=&ulp= utk mengunduh Rekap. */
function getExecUrlROW(){
  try { return ScriptApp.getService().getUrl() || ''; }
  catch(e){ return ''; }
}


/* ═══ DOWNLOAD PDF ROW (link web via doGet) ═══
   DUA file terpisah, dipilih lewat query string ?pdf= :
     • ?pdf=realisasi -> tabel db_ROW_Realisasi (rekap per Kode Pekerjaan: Rabas/Sedang/Besar + total)
     • ?pdf=eksekusi  -> tabel db_ROW_Eksekusi  (detail per titik: No.Tiang/Diameter/Jenis + link foto)
   Filter opsional: tglDari, tglSampai (yyyy-MM-dd), tim, penyulang, ulp.
   Dipasang di doGet (Code.gs): if(e.parameter.pdf) return unduhPdfROW(e).
   Cara kerja: build HTML -> Utilities.newBlob(html,'text/html').getAs('application/pdf')
   -> simpan ke Drive (folder "AppSheet SiSi - ULP Toboali/PDF ROW", share anyone-with-link)
   -> balas halaman yang me-redirect ke URL unduhan Drive (uc?export=download).
   _getOrCreateFolderByPath ada di Tek-Temuan.gs (global). */
function unduhPdfROW(e){
  try{
    var p = (e && e.parameter) || {};
    var jenis = String(p.pdf || '').trim().toLowerCase();
    var f = {
      tglDari:   _normTanggal(p.tglDari   || '') || '',
      tglSampai: _normTanggal(p.tglSampai || '') || '',
      tim:       String(p.tim || '').trim(),
      penyulang: String(p.penyulang || '').trim(),
      ulp:       String(p.ulp || '').trim()
    };

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var html, namaDasar;
    if(jenis === 'eksekusi'){
      html = _buildHtmlPdfEksekusiROW(_pdfQueryEksekusiROW(ss, f), f);
      namaDasar = 'ROW_Eksekusi';
    } else if(jenis === 'rekap'){
      html = _buildHtmlPdfRekapLampiranROW(f);   // rekap resmi (portrait) + lampiran (landscape) -> 1 file PDF
      namaDasar = 'Rekap_ROW';
    } else {
      html = _buildHtmlPdfRealisasiROW(_pdfQueryRealisasiROW(ss, f), f);
      namaDasar = 'ROW_Realisasi';
    }

    var suffix = (f.tglDari || f.tglSampai)
      ? ('_' + (f.tglDari || 'awal') + '_sd_' + (f.tglSampai || f.tglDari || 'akhir'))
      : ('_' + _normTanggal(new Date()));
    var namaFile = namaDasar + suffix + '.pdf';

    var blob   = Utilities.newBlob(html, 'text/html', 'tmp.html').getAs('application/pdf').setName(namaFile);
    var folder = _getOrCreateFolderByPath(['AppSheet SiSi - ULP Toboali', 'PDF ROW']);
    var file   = folder.createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(eShare){}
    var urlUnduh = 'https://drive.google.com/uc?export=download&id=' + file.getId();

    return HtmlService.createHtmlOutput(
      '<!DOCTYPE html><html><head><meta charset="utf-8">'
      + '<meta name="viewport" content="width=device-width, initial-scale=1">'
      + '<title>Unduh PDF ROW</title>'
      + '<script>window.location.replace(' + JSON.stringify(urlUnduh) + ');<\/script>'
      + '</head><body style="font-family:Segoe UI,Arial,sans-serif;text-align:center;padding:40px;color:#1e293b">'
      + '<p>Menyiapkan unduhan <b>' + _pdfEsc(namaFile) + '</b>…</p>'
      + '<p>Jika tidak otomatis terunduh, <a href="' + _pdfEsc(urlUnduh) + '">klik di sini</a>.</p>'
      + '</body></html>'
    ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  }catch(err){
    return HtmlService.createHtmlOutput(
      '<p style="font-family:Arial,sans-serif;color:#b91c1c">Gagal membuat PDF: '
      + _pdfEsc(err && err.message ? err.message : String(err)) + '</p>'
    );
  }
}

/* ═══════════════════════════════════════════════════════════
   PDF REKAP + LAMPIRAN JADI 1 FILE — Tek-ROW.gs
   Menggabungkan Rekap resmi (A4 portrait, db_ROW_Realisasi) dengan
   LAMPIRAN dokumentasi (halaman terpisah, A4 LANDSCAPE, tabel + foto)
   dari db_ROW_Eksekusi — semuanya dalam SATU file PDF.

   AMAN: TIDAK mendefinisikan ulang fungsi yang sudah ada. Ia MEMANGGIL
   ULANG fungsi bawaan: _buildHtmlPdfRekapROW, _pdfQueryRealisasiROW,
   _pdfDateFilterLolos_, _pdfEsc, _normTanggal, _jenisPekerjaan,
   SPREADSHEET_ID, COL_ROW, COL_ROW_N.

   AKTIF di unduhPdfROW(e) cabang rekap:
     html = _buildHtmlPdfRekapLampiranROW(f);
═══════════════════════════════════════════════════════════ */

/* Bungkus: Rekap resmi (portrait) + Lampiran (landscape) -> 1 dokumen HTML. */
function _buildHtmlPdfRekapLampiranROW(f){
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // 1) Rekap resmi PLN (portrait) — pakai builder bawaan, tidak diubah.
  var htmlRekap = _buildHtmlPdfRekapROW(_pdfQueryRealisasiROW(ss, f), f);

  // 2) Lampiran (landscape A4, tabel + foto) dari db_ROW_Eksekusi.
  var fragmen = pdfLampiranFragmentROW(pdfDataLampiranROW(ss, f), f);

  // 3) Sisipkan CSS landscape + fragmen lampiran ke dokumen rekap.
  var html = htmlRekap.replace('</head>', pdfLampiranCssROW() + '</head>');
  html = html.replace('</body></html>', fragmen + '</body></html>');
  return html;
}

/* Baca db_ROW_Eksekusi -> baris lampiran (terfilter & terurut). */
function pdfDataLampiranROW(ss, f){
  var sh = ss.getSheetByName('db_ROW_Eksekusi');
  if(!sh || sh.getLastRow() < 2) return [];
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, COL_ROW_N).getValues();
  var out = [];
  for(var i=0;i<data.length;i++){
    var r  = data[i];
    var ke = String(r[COL_ROW.kodeEksekusi] || '').trim();
    var nt = String(r[COL_ROW.nomorTiang] || '').trim();
    if(!ke && !nt) continue;
    var tgl  = _normTanggal(r[COL_ROW.tanggal]);
    var tim  = String(r[COL_ROW.tim] || '').trim();
    var peny = String(r[COL_ROW.penyulang] || '').trim();
    var ulp  = String(r[COL_ROW.ulp] || '').trim();
    if(!_pdfDateFilterLolos_(tgl, f)) continue;
    if(f.tim       && tim.toLowerCase()  !== String(f.tim).toLowerCase())       continue;
    if(f.penyulang && peny.toLowerCase() !== String(f.penyulang).toLowerCase()) continue;
    if(f.ulp       && ulp.toLowerCase()  !== String(f.ulp).toLowerCase())       continue;
    var dia = (r[COL_ROW.diameter] === '' || r[COL_ROW.diameter] == null) ? '' : Number(r[COL_ROW.diameter]);
    var jenis = String(r[COL_ROW.jenisPekerjaan] || '').trim() || (dia !== '' ? _jenisPekerjaan(dia) : '');
    out.push({
      ulp: ulp, tanggal: tgl, tim: tim, penyulang: peny,
      section: String(r[COL_ROW.section] || ''),
      jenis: jenis, diameter: dia,
      koordinat: String(r[COL_ROW.koordinatPekerjaan] || ''),
      fotoSebelum:   String(r[COL_ROW.fotoSebelumUrl]   || ''),
      fotoPekerjaan: String(r[COL_ROW.fotoPekerjaanUrl] || ''),
      fotoSesudah:   String(r[COL_ROW.fotoSesudahUrl]   || '')
    });
  }
  out.sort(function(a,b){
    return (a.tanggal||'').localeCompare(b.tanggal||'')
        || a.tim.localeCompare(b.tim)
        || a.penyulang.localeCompare(b.penyulang);
  });
  return out;
}

/* Fragmen HTML halaman LAMPIRAN (landscape A4). */
function pdfLampiranFragmentROW(rows, f){
  // Format tanggal Indonesia: DD MMMM YYYY (mis. "26 Juni 2026").
  var _BLN_LMP = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  function _tglDMY_(iso){
    var s = String(iso || '').trim(); if(!s) return '';
    var p = s.split('-'); if(p.length < 3) return s;
    var mm = parseInt(p[1],10) || 1;
    return p[2] + ' ' + _BLN_LMP[mm-1] + ' ' + p[0];
  }

  var info = [];
  if(f.tim)       info.push('Tim: ' + f.tim);
  if(f.penyulang) info.push('Penyulang: ' + f.penyulang);
  info.push('Jumlah: ' + rows.length);

  // Kop header (gaya sama spt rekapitulasi: logo PLN + identitas + UP3/ULP/PERIODE).
  var ULP_L = String(f.ulp || 'TOBOALI').toUpperCase();
  var periodeKop = (f.tglDari || f.tglSampai)
    ? (_tglDMY_(f.tglDari || f.tglSampai) + ' s/d ' + _tglDMY_(f.tglSampai || f.tglDari))
    : '-';
  var logoLmp = '';
  try { logoLmp = _pdfLogoPlnB64_(); } catch(eLL){ logoLmp = ''; }
  var logoCellLmp = logoLmp
    ? '<td class="lkop-logo"><img class="logo" src="data:image/png;base64,' + logoLmp + '"></td>'
    : '<td class="lkop-logo"></td>';

  // Kop + judul (tampil di halaman PERTAMA lampiran saja).
  var KOP = '<table class="lkop"><tr>'
    + logoCellLmp
    + '<td class="lkop-org">PT. PLN (Persero)<br>Unit Induk Wilayah Bangka Belitung</td>'
    + '<td class="lkop-title">Laporan Bulanan<br>Perambasan Pohon ( ROW )</td>'
    + '</tr></table>'
    + '<table class="lkop-info">'
    + '<tr><td class="lki-k">UP3</td><td class="lki-c">:</td><td>BANGKA</td></tr>'
    + '<tr><td class="lki-k">ULP</td><td class="lki-c">:</td><td>' + _pdfEsc(ULP_L) + '</td></tr>'
    + '<tr><td class="lki-k">PERIODE</td><td class="lki-c">:</td><td>' + _pdfEsc(periodeKop) + '</td></tr>'
    + '</table>'
    + '<div class="lkop-spacer"></div>'
    + '<h2 class="lh">Lampiran Dokumentasi ROW</h2>'
    + '<p class="lsub">' + _pdfEsc(info.join('  •  ')) + '</p>';

  // Colgroup + header tabel (DIULANG di tiap halaman lampiran).
  var COLS_THEAD = '<colgroup>'
    + '<col style="width:3%"><col style="width:4%"><col style="width:7%"><col style="width:4%">'
    + '<col style="width:6%"><col style="width:31%"><col style="width:6%"><col style="width:5%">'
    + '<col style="width:10%"><col style="width:8%"><col style="width:8%"><col style="width:8%">'
    + '</colgroup><thead><tr>'
    + '<th>No</th><th>ULP</th><th>Tanggal</th><th>Tim</th><th>Penyulang</th><th>Section</th>'
    + '<th>Jenis Pekerjaan</th><th>Ø (cm)</th><th>Koordinat Pekerjaan</th>'
    + '<th>Foto Sebelum</th><th>Foto Pekerjaan</th><th>Foto Selesai</th>'
    + '</tr></thead>';

  // Satu baris <tr> lampiran.
  function _barisLampiran(r, no){
    return '<tr>'
      + '<td class="lc">' + no + '</td>'
      + '<td class="lc">' + _pdfEsc(r.ulp) + '</td>'
      + '<td class="lc">' + _pdfEsc(_tglDMY_(r.tanggal)) + '</td>'
      + '<td class="lc">' + _pdfEsc(r.tim) + '</td>'
      + '<td class="lc">' + _pdfEsc(r.penyulang) + '</td>'
      + '<td>' + _pdfEsc(r.section) + '</td>'
      + '<td>' + _pdfEsc(r.jenis) + '</td>'
      + '<td class="lc">' + _pdfEsc(r.diameter) + '</td>'
      + '<td class="lc">' + _pdfEsc(r.koordinat) + '</td>'
      + '<td class="lc">' + pdfFotoImgROW(r.fotoSebelum) + '</td>'
      + '<td class="lc">' + pdfFotoImgROW(r.fotoPekerjaan) + '</td>'
      + '<td class="lc">' + pdfFotoImgROW(r.fotoSesudah) + '</td>'
      + '</tr>';
  }

  // PAGINASI: maksimum 25 baris foto per halaman. Tiap halaman = 1 blok .lampiran-page
  // (page-break-before) dgn header tabel diulang; kop PLN hanya di halaman pertama.
  var PER_PAGE = 25;
  var h = '';
  if(!rows.length){
    h = '<div class="lampiran-page">' + KOP
      + '<table class="lampiran">' + COLS_THEAD
      + '<tbody><tr><td class="lc" colspan="12" style="padding:24px">Tidak ada data eksekusi untuk filter ini.</td></tr></tbody></table></div>';
    return h;
  }
  for(var p=0; p<rows.length; p+=PER_PAGE){
    h += '<div class="lampiran-page">';
    if(p === 0) h += KOP;
    h += '<table class="lampiran">' + COLS_THEAD + '<tbody>';
    var akhir = Math.min(p + PER_PAGE, rows.length);
    for(var i=p; i<akhir; i++){ h += _barisLampiran(rows[i], i+1); }
    h += '</tbody></table></div>';
  }
  return h;
}

/* CSS khusus lampiran (disisipkan ke <head> dokumen rekap). */
function pdfLampiranCssROW(){
  return '<style>'
    + '@page lampiranROW { size: A4 landscape; margin: 10mm; }'
    + '.lampiran-page { page: lampiranROW; page-break-before: always; }'
    + '.lampiran-page, .lampiran-page * { font-family: "Times New Roman", Times, serif !important; text-transform: none !important; color:#000 !important; }'
    + '.lampiran-page h2.lh { font-size:14px; color:#000; margin:0 0 2px; }'
    + '.lampiran-page p.lsub { font-size:10px; color:#000; margin:0 0 8px; }'
    + 'table.lampiran { width:100%; border-collapse:collapse; table-layout:fixed; }'
    + 'table.lampiran th, table.lampiran td { border:1px solid #94a3b8; padding:1px 3px; font-size:8px; vertical-align:top; word-wrap:break-word; overflow-wrap:break-word; }'
    + 'table.lampiran th { background:#FFC000 !important; color:#000 !important; text-align:center; -webkit-print-color-adjust:exact; print-color-adjust:exact; }'
    + 'table.lampiran td.lc { text-align:center; }'
    + 'table.lampiran tbody tr:nth-child(even){ background:#f1f5f9; }'
    + 'table.lampiran img.lf { width:auto; max-width:100%; max-height:5.5mm; height:auto; display:block; margin:0 auto; }'
    + 'table.lampiran a { color:#000; text-decoration:none; font-size:8px; }'
    + 'table.lampiran .nofoto { color:#000; }'
    + 'table.lkop { width:100%; border-collapse:collapse; margin:0 0 4px; }'
    + 'table.lkop td { border:none; vertical-align:middle; }'
    + 'table.lkop td.lkop-logo { width:50px; }'
    + 'table.lkop .logo { height:42px; }'
    + 'table.lkop td.lkop-org { font-size:11px; font-weight:bold; text-align:left; }'
    + 'table.lkop td.lkop-title { font-size:11px; font-weight:bold; text-align:right; }'
    + 'table.lkop-info { width:100%; border-collapse:collapse; border-top:3px double #000; margin:0; }'
    + 'table.lkop-info td { border:none; font-size:9px; font-weight:bold; padding:3px 4px 0 8px; }'
    + 'table.lkop-info td.lki-k { width:70px; }'
    + 'table.lkop-info td.lki-c { width:12px; }'
    + '.lkop-spacer { border-top:3px double #000; height:8px; border-bottom:3px double #000; margin:5px 0 10px; }'
    + '</style>';
}

/* Foto -> <img> base64 (paling andal utk konverter PDF lawas).
   Gagal / akses tertutup -> tampilkan link "Lihat". */
function pdfFotoImgROW(url){
  var b64 = pdfFotoB64ROW(url);
  if(b64) return '<img class="lf" src="' + b64 + '">';
  var u = String(url || '').trim();
  if(u){
    var isDrive = /(?:drive|docs)\.google\.com/i.test(u);
    var m = isDrive ? u.match(/[-\w]{25,}/) : null;
    var link = m ? 'https://drive.google.com/file/d/' + m[0] + '/view' : u;
    return '<a href="' + _pdfEsc(link) + '">Lihat</a>';
  }
  return '<span class="nofoto">—</span>';
}

/* Ambil foto -> data URI base64.
   - URL Drive (drive/docs.google.com): baca byte via DriveApp (atau uc?export=download).
   - URL non-Drive spt kolom URL AppSheet (appsheet.com/image/getimageurl?...&signature=...):
     fetch LANGSUNG url tsb -> byte gambar. Inilah sumber foto sebenarnya di gsheet.
   Gagal / akses tertutup -> '' (pemanggil tampilkan link "Lihat"). */
function pdfFotoB64ROW(url){
  var u = String(url || '').trim();
  if(!u) return '';
  var isDrive = /(?:drive|docs)\.google\.com/i.test(u);
  var m  = u.match(/[-\w]{25,}/);
  var id = (isDrive && m) ? m[0] : '';
  try{
    var cache = CacheService.getScriptCache();
    var key = id;
    if(!key){
      try{
        var dig = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, u, Utilities.Charset.UTF_8);
        key = dig.map(function(b){ return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
      }catch(eH){ key = String(u).slice(0,80); }
    }
    var ck = 'ROWFOTO4_' + key;
    var c  = cache ? cache.get(ck) : null;
    if(c) return c;
    var blob = null, ct = '';
    // 1) Foto Drive: baca byte LANGSUNG via DriveApp (hindari halaman interstisial "uc?export=download").
    if(id){
      try{
        var file = DriveApp.getFileById(id);
        try{ blob = file.getThumbnail(); }catch(eTh){ blob = null; }   // thumbnail kecil utk 150px
        if(!blob || String(blob.getContentType()||'').indexOf('image') !== 0) blob = file.getBlob();
        ct = blob ? String(blob.getContentType() || '') : '';
      }catch(eD){ blob = null; ct = ''; }
    }
    // 2) URL non-Drive (mis. AppSheet getimageurl) ATAU fallback Drive: fetch URL langsung.
    //    URL AppSheet sudah membawa signature, jadi fetch langsung mengembalikan byte gambar.
    if(!blob || ct.indexOf('image') !== 0){
      var fetchUrl = id ? ('https://drive.google.com/uc?export=download&id=' + id) : u;
      var resp = UrlFetchApp.fetch(fetchUrl, { muteHttpExceptions:true, followRedirects:true });
      if(resp.getResponseCode() === 200){
        blob = resp.getBlob();
        ct   = blob.getContentType() || 'image/jpeg';
      }
    }
    if(!blob || ct.indexOf('image') !== 0) return '';   // bukan gambar -> pemanggil tampilkan "Lihat"
    var b64  = 'data:' + ct + ';base64,' + Utilities.base64Encode(blob.getBytes());
    try { if(cache && b64.length < 95000) cache.put(ck, b64, 21600); } catch(eC){}
    return b64;
  }catch(e){
    return '';
  }
}

/* Escape HTML utk konten PDF. */
function _pdfEsc(v){
  return String(v == null ? '' : v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* Lolos filter tanggal? (bila filter tanggal di-set, baris tanpa tanggal otomatis gugur). */
function _pdfDateFilterLolos_(tgl, f){
  if(f.tglDari || f.tglSampai){
    if(!tgl) return false;
    if(f.tglDari   && tgl < f.tglDari)   return false;
    if(f.tglSampai && tgl > f.tglSampai) return false;
  }
  return true;
}

/* Baca db_ROW_Realisasi -> array objek (terfilter & terurut). */
function _pdfQueryRealisasiROW(ss, f){
  var sh = ss.getSheetByName('db_ROW_Realisasi');
  if(!sh || sh.getLastRow() < 2) return [];
  var RL = COL_ROW_RLZ;
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, COL_ROW_RLZ_N).getValues();
  var out = [];
  for(var i=0;i<data.length;i++){
    var r = data[i];
    var kh   = String(r[RL.kodeHeader] || '').trim();
    var kp   = String(r[RL.kodePekerjaan] || '').trim();
    if(!kh && !kp) continue;                       // lewati baris kosong
    var tgl  = _normTanggal(r[RL.tanggal]);
    var tim  = String(r[RL.tim] || '').trim();
    var peny = String(r[RL.penyulang] || '').trim();
    if(!_pdfDateFilterLolos_(tgl, f)) continue;
    if(f.tim && tim.toLowerCase() !== f.tim.toLowerCase()) continue;
    if(f.penyulang && peny.toLowerCase() !== f.penyulang.toLowerCase()) continue;
    out.push({
      kodeHeader: kh, kodePekerjaan: kp, hari: String(r[RL.hari] || ''),
      tanggal: tgl, tim: tim, penyulang: peny, section: String(r[RL.section] || ''),
      rabas: Number(r[RL.rabas]) || 0, sedang: Number(r[RL.sedang]) || 0,
      besar: Number(r[RL.besar]) || 0, inputOleh: String(r[RL.inputOleh] || '')
    });
  }
  out.sort(function(a,b){
    return (a.tanggal||'').localeCompare(b.tanggal||'')
        || a.tim.localeCompare(b.tim)
        || a.kodePekerjaan.localeCompare(b.kodePekerjaan);
  });
  return out;
}

/* Baca db_ROW_Eksekusi -> array objek (terfilter & terurut). */
function _pdfQueryEksekusiROW(ss, f){
  var sh = ss.getSheetByName('db_ROW_Eksekusi');
  if(!sh || sh.getLastRow() < 2) return [];
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, COL_ROW_N).getValues();
  var out = [];
  for(var i=0;i<data.length;i++){
    var r  = data[i];
    var ke = String(r[COL_ROW.kodeEksekusi] || '').trim();
    var nt = String(r[COL_ROW.nomorTiang] || '').trim();
    if(!ke && !nt) continue;                        // lewati baris kosong
    var tgl  = _normTanggal(r[COL_ROW.tanggal]);
    var tim  = String(r[COL_ROW.tim] || '').trim();
    var peny = String(r[COL_ROW.penyulang] || '').trim();
    if(!_pdfDateFilterLolos_(tgl, f)) continue;
    if(f.tim && tim.toLowerCase() !== f.tim.toLowerCase()) continue;
    if(f.penyulang && peny.toLowerCase() !== f.penyulang.toLowerCase()) continue;
    out.push({
      kodeHeader: String(r[COL_ROW.kodeHeader] || ''),
      kodePekerjaan: String(r[COL_ROW.kodePekerjaan] || ''),
      kodeEksekusi: ke, tanggal: tgl, tim: tim, penyulang: peny,
      section: String(r[COL_ROW.section] || ''), nomorTiang: nt,
      diameter: (r[COL_ROW.diameter] === '' || r[COL_ROW.diameter] == null) ? '' : Number(r[COL_ROW.diameter]),
      jenisPekerjaan: String(r[COL_ROW.jenisPekerjaan] || ''),
      fotoSebelumUrl: String(r[COL_ROW.fotoSebelumUrl] || ''),
      fotoPekerjaanUrl: String(r[COL_ROW.fotoPekerjaanUrl] || ''),
      fotoSesudahUrl: String(r[COL_ROW.fotoSesudahUrl] || ''),
      inputOleh: String(r[COL_ROW.inputOleh] || '')
    });
  }
  out.sort(function(a,b){
    return (a.tanggal||'').localeCompare(b.tanggal||'')
        || a.tim.localeCompare(b.tim)
        || a.kodeEksekusi.localeCompare(b.kodeEksekusi);
  });
  return out;
}

/* CSS bersama utk kedua PDF. */
function _pdfCssROW_(){
  return '<style>'
    + '*{box-sizing:border-box}'
    + 'body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;margin:18px;font-size:11px}'
    + 'h1{font-size:16px;margin:0 0 2px}'
    + '.sub{color:#64748b;font-size:10px;margin:0 0 12px}'
    + 'table{width:100%;border-collapse:collapse;margin-top:8px}'
    + 'th,td{border:1px solid #cbd5e1;padding:4px 6px;text-align:left;vertical-align:top}'
    + 'th{background:#1e3a8a;color:#fff;font-size:10px}'
    + 'tbody tr:nth-child(even){background:#f1f5f9}'
    + 'td.num,th.num{text-align:right}'
    + 'tfoot td{font-weight:bold;background:#e2e8f0}'
    + '.empty{padding:20px;text-align:center;color:#94a3b8}'
    + 'a{color:#1d4ed8;text-decoration:none}'
    + '</style>';
}

/* Judul + baris info filter (dipakai kedua PDF). */
function _pdfHeaderHtmlROW_(judul, f, jumlah){
  var info = [];
  if(f.tglDari || f.tglSampai) info.push('Periode: ' + (f.tglDari || '…') + ' s/d ' + (f.tglSampai || f.tglDari || '…'));
  else info.push('Per: ' + _normTanggal(new Date()));
  if(f.tim) info.push('Tim: ' + f.tim);
  if(f.penyulang) info.push('Penyulang: ' + f.penyulang);
  if(f.ulp) info.push('ULP: ' + f.ulp);
  info.push('Jumlah baris: ' + jumlah);
  info.push('Dibuat: ' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm'));
  return '<h1>' + _pdfEsc(judul) + '</h1><p class="sub">' + _pdfEsc(info.join('  •  ')) + '</p>';
}

/* HTML PDF FILE 1: db_ROW_Realisasi. */
function _buildHtmlPdfRealisasiROW(rows, f){
  var h = '<!DOCTYPE html><html><head><meta charset="utf-8">' + _pdfCssROW_() + '</head><body>';
  h += _pdfHeaderHtmlROW_('Laporan Realisasi ROW (db_ROW_Realisasi)', f, rows.length);
  if(!rows.length){ h += '<p class="empty">Tidak ada data realisasi untuk filter ini.</p></body></html>'; return h; }
  h += '<table><thead><tr>'
    + '<th>No</th><th>Tanggal</th><th>Tim</th><th>Penyulang</th><th>Section</th>'
    + '<th>Kode Pekerjaan</th><th class="num">Rabas/Pangkas</th><th class="num">Tebang Sedang</th>'
    + '<th class="num">Tebang Besar</th><th class="num">Total</th></tr></thead><tbody>';
  var tR=0,tS=0,tB=0;
  for(var i=0;i<rows.length;i++){
    var r = rows[i];
    var tot = r.rabas + r.sedang + r.besar;
    tR+=r.rabas; tS+=r.sedang; tB+=r.besar;
    h += '<tr><td>' + (i+1) + '</td>'
      + '<td>' + _pdfEsc(r.tanggal) + '</td>'
      + '<td>' + _pdfEsc(r.tim) + '</td>'
      + '<td>' + _pdfEsc(r.penyulang) + '</td>'
      + '<td>' + _pdfEsc(r.section) + '</td>'
      + '<td>' + _pdfEsc(r.kodePekerjaan) + '</td>'
      + '<td class="num">' + r.rabas + '</td>'
      + '<td class="num">' + r.sedang + '</td>'
      + '<td class="num">' + r.besar + '</td>'
      + '<td class="num">' + tot + '</td></tr>';
  }
  h += '</tbody><tfoot><tr><td colspan="6">TOTAL</td>'
    + '<td class="num">' + tR + '</td><td class="num">' + tS + '</td>'
    + '<td class="num">' + tB + '</td><td class="num">' + (tR+tS+tB) + '</td></tr></tfoot></table>';
  h += '</body></html>';
  return h;
}

/* HTML PDF FILE 2: db_ROW_Eksekusi. */
function _buildHtmlPdfEksekusiROW(rows, f){
  var h = '<!DOCTYPE html><html><head><meta charset="utf-8">' + _pdfCssROW_() + '</head><body>';
  h += _pdfHeaderHtmlROW_('Laporan Eksekusi ROW (db_ROW_Eksekusi)', f, rows.length);
  if(!rows.length){ h += '<p class="empty">Tidak ada data eksekusi untuk filter ini.</p></body></html>'; return h; }
  h += '<table><thead><tr>'
    + '<th>No</th><th>Tanggal</th><th>Tim</th><th>Penyulang</th><th>Section</th>'
    + '<th>No. Tiang</th><th class="num">Diameter</th><th>Jenis</th>'
    + '<th>Kode Eksekusi</th><th>Foto</th></tr></thead><tbody>';
  for(var i=0;i<rows.length;i++){
    var r = rows[i];
    var foto = [];
    if(r.fotoSebelumUrl)   foto.push('<a href="' + _pdfEsc(r.fotoSebelumUrl) + '">Sebelum</a>');
    if(r.fotoPekerjaanUrl) foto.push('<a href="' + _pdfEsc(r.fotoPekerjaanUrl) + '">Pekerjaan</a>');
    if(r.fotoSesudahUrl)   foto.push('<a href="' + _pdfEsc(r.fotoSesudahUrl) + '">Sesudah</a>');
    h += '<tr><td>' + (i+1) + '</td>'
      + '<td>' + _pdfEsc(r.tanggal) + '</td>'
      + '<td>' + _pdfEsc(r.tim) + '</td>'
      + '<td>' + _pdfEsc(r.penyulang) + '</td>'
      + '<td>' + _pdfEsc(r.section) + '</td>'
      + '<td>' + _pdfEsc(r.nomorTiang) + '</td>'
      + '<td class="num">' + _pdfEsc(r.diameter) + '</td>'
      + '<td>' + _pdfEsc(r.jenisPekerjaan) + '</td>'
      + '<td>' + _pdfEsc(r.kodeEksekusi) + '</td>'
      + '<td>' + (foto.length ? foto.join(' · ') : '-') + '</td></tr>';
  }
  h += '</tbody></table></body></html>';
  return h;
}

/* HTML PDF FILE 3: REKAP ROW (format Laporan Bulanan referensi, A4 portrait).
   Sumber data: db_ROW_Realisasi (via _pdfQueryRealisasiROW). Kolom:
   NO·TANGGAL·TIM·PENYULANG·SECTION·(PANGKAS/RABAS·TEBANG SEDANG·TEBANG BESAR)·KETERANGAN.
   Disesuaikan dgn referensi Excel (REKAP ROW): A4 portrait, margin 19mm/10mm, header & isi 7pt,
   tinggi baris isi 21pt (header 22pt), lebar kolom proporsional, #FFC000, baris JUMLAH total. */
/* ═══ PEJABAT PENANDA TANGAN REKAP ROW (disimpan global di ScriptProperties) ═══
   Nama Manager / Team Leader / Koordinator dipakai di blok tanda tangan PDF Rekap.
   Disimpan via ScriptProperties (bertahan sampai diinput ulang). Default = nama lama. */
var PEJABAT_ROW_PROP = 'PEJABAT_REKAP_ROW';
var PEJABAT_ROW_DEFAULT = { manager:'MARSHEL P.L TOBING', teamLeader:'ANDRYE FAHREZA', koordinator:'APRIANTO' };

function getPejabatRekapROW(){
  try{
    var raw = PropertiesService.getScriptProperties().getProperty(PEJABAT_ROW_PROP);
    var o = raw ? JSON.parse(raw) : {};
    return {
      manager:     String(o.manager     || '').trim() || PEJABAT_ROW_DEFAULT.manager,
      teamLeader:  String(o.teamLeader  || '').trim() || PEJABAT_ROW_DEFAULT.teamLeader,
      koordinator: String(o.koordinator || '').trim() || PEJABAT_ROW_DEFAULT.koordinator
    };
  }catch(e){
    return { manager:PEJABAT_ROW_DEFAULT.manager, teamLeader:PEJABAT_ROW_DEFAULT.teamLeader, koordinator:PEJABAT_ROW_DEFAULT.koordinator };
  }
}

function simpanPejabatRekapROW(payload){
  try{
    payload = payload || {};
    var cur = getPejabatRekapROW();
    // Field kosong -> pertahankan nilai lama (jangan menimpa dgn kosong agar PDF tak blank).
    var pick = function(v, fb){ v = (v==null) ? '' : String(v).trim(); return v || fb; };
    var data = {
      manager:     pick(payload.manager,     cur.manager),
      teamLeader:  pick(payload.teamLeader,  cur.teamLeader),
      koordinator: pick(payload.koordinator, cur.koordinator)
    };
    PropertiesService.getScriptProperties().setProperty(PEJABAT_ROW_PROP, JSON.stringify(data));
    return { success:true, pejabat:data };
  }catch(e){
    return { success:false, message:e.message };
  }
}

function _buildHtmlPdfRekapROW(rows, f){
  var pjb = getPejabatRekapROW();
  var bln = ['JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI','JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER'];
  function _tglIndo(iso){
    var s = _normTanggal(iso); if(!s) return '';
    var p = s.split('-'); var m = parseInt(p[1],10)||1;
    return p[2] + ' ' + bln[m-1] + ' ' + p[0];
  }
  function _tglDMY(iso){
    var s = _normTanggal(iso); if(!s) return '';
    var p = s.split('-'); return p[2] + '/' + p[1] + '/' + p[0];
  }

  var UP3 = 'BANGKA';
  var ULP = String(f.ulp || 'TOBOALI').toUpperCase();
  var periode = (f.tglDari || f.tglSampai)
    ? (_tglIndo(f.tglDari || f.tglSampai) + ' - ' + _tglIndo(f.tglSampai || f.tglDari))
    : '-';

  var logo = '';
  try { logo = _pdfLogoPlnB64_(); } catch(eL){ logo = ''; }
  var logoCell = logo
    ? '<td style="width:55px"><img class="logo" src="data:image/png;base64,' + logo + '"></td>'
    : '<td style="width:55px"></td>';

  var css = '<style>'
    + '@page { size: A4 portrait; margin: 19mm 10mm; }'
    + '* { font-family: "Times New Roman", Times, serif; }'
    + 'body { margin:0; color:#000; text-transform:uppercase; -webkit-print-color-adjust:exact; print-color-adjust:exact; }'
    + 'table.report-wrap { width:100%; border-collapse:separate; border-spacing:0; border:3px double #000; }'
    + 'table.report-wrap td.report-inner { border:none; padding:0; }'
    + 'table.kop { width:100%; border-collapse:separate; border-spacing:0; border:none; margin-bottom:0; }'
    + 'table.kop td.kop-inner { border:none; padding:0; }'
    + 'table.head { width:100%; border-collapse:collapse; margin-bottom:6px; }'
    + 'table.head td { vertical-align:middle; border:none; }'
    + '.logo { height:48px; }'
    + '.org { font-size:9pt; font-weight:bold; text-align:left; padding-left:0; }'
    + '.title { font-size:9pt; font-weight:bold; text-align:right; }'
    + 'table.info { width:100%; border-collapse:collapse; margin:0; border-top:3px double #000; }'
    + 'table.info td { font-size:8pt; font-weight:bold; border:none; padding:4px 4px 0 10px; }'
    + '.kop-spacer { border-top:3px double #000; height:12px; border-bottom:3px double #000; margin:6px 0 10px 0; }'
    + '.data-box { border:1px double #000; padding:0; margin:0 6px 6px 6px; }'
    + 'table.data { width:100%; border-collapse:collapse; table-layout:fixed; border:1px double #000; }'
    + 'table.data th { background-color:#FFC000 !important; font-weight:bold; text-align:center; vertical-align:middle; height:22pt; border:1px double #000; font-size:7pt; padding:1px 3px; word-wrap:break-word; -webkit-print-color-adjust:exact; print-color-adjust:exact; }'
    + 'table.data td { height:21pt; vertical-align:middle; border:1px double #000; font-size:7pt; padding:1px 3px; word-wrap:break-word; }'
    + 'table.data thead tr:first-child th { border-top:1px double #000 !important; }'
    + 'table.data thead tr:last-child th { border-bottom:1px double #000 !important; }'
    + 'table.data thead tr:first-child th:nth-child(1) { border-left:1px double #000 !important; }'
    + 'table.data thead tr:first-child th:nth-child(5) { border-right:1px double #000 !important; }'
    + 'table.data thead tr:first-child th:nth-child(6) { border-left:1px double #000 !important; border-right:1px double #000 !important; }'
    + 'table.data thead tr:first-child th:nth-child(7) { border-right:1px double #000 !important; }'
    + 'table.data thead tr:nth-child(2) th:nth-child(1) { border-left:1px double #000 !important; }'
    + 'table.data thead tr:nth-child(2) th:nth-child(3) { border-right:1px double #000 !important; }'
    + 'table.data tbody td:nth-child(1) { border-left:1px double #000 !important; }'
    + 'table.data tbody td:nth-child(5) { border-right:1px double #000 !important; }'
    + 'table.data tbody td:nth-child(8) { border-right:1px double #000 !important; }'
    + 'table.data tbody td:nth-child(9) { border-right:1px double #000 !important; }'
    + 'table.data tbody tr:first-child td { border-top:1px double #000 !important; }'
    + 'table.data tbody tr:last-child td { border-bottom:1px double #000 !important; }'
    + 'td.c { text-align:center; }'
    + 'td.l { text-align:left; }'
    + 'table.sign { width:calc(100% - 12px); border-collapse:collapse; table-layout:fixed; margin:14px 6px 8px 6px; }'
    + 'table.sign td { border:none; text-align:left; vertical-align:top; font-size:8pt; font-weight:normal; padding:0; }'
    + 'table.sign td.sign-first { text-align:left; padding-left:0; }'
    + 'table.sign td.sign-second { text-align:left; padding-left:20px; }'
    + '.sign-title { display:block; font-weight:bold; margin-bottom:22px; }'
    + '.sign-name { display:block; font-weight:bold; margin-top:0; white-space:nowrap; }'
    + '.sign-role { display:block; font-weight:normal; white-space:nowrap; }'
    + '.sign-gap { display:block; height:34px; }'
    + 'tr.total td { background-color:#D9D9D9 !important; font-weight:bold; text-align:center; font-size:7pt; -webkit-print-color-adjust:exact; print-color-adjust:exact; }'
    + '</style>';

  var h = '<!DOCTYPE html><html><head><meta charset="utf-8">' + css + '</head><body>';
  h += '<table class="report-wrap"><tr><td class="report-inner">'
    + '<table class="kop"><tr><td class="kop-inner">'
    + '<table class="head"><tr>'
    + logoCell
    + '<td class="org">PT. PLN (Persero)<br>Unit Induk Wilayah Bangka Belitung</td>'
    + '<td class="title">Laporan Bulanan<br>Perambasan Pohon ( ROW )</td>'
    + '</tr></table>'
    + '<table class="info">'
    + '<tr><td style="width:90px">UP3</td><td style="width:14px">:</td><td>' + _pdfEsc(UP3) + '</td></tr>'
    + '<tr><td>ULP</td><td>:</td><td>' + _pdfEsc(ULP) + '</td></tr>'
    + '<tr><td>PERIODE</td><td>:</td><td>' + _pdfEsc(periode) + '</td></tr>'
    + '</table>'
    + '<div class="kop-spacer"></div>'
    + '</td></tr></table>'
    + '<div class="data-box">';
  h += '<table class="data"><thead>'
    + '<tr>'
    + '<th rowspan="2" style="width:4%;border-left:1px double #000!important;border-top:1px double #000!important;border-bottom:1px double #000!important">NO</th>'
    + '<th rowspan="2" style="width:10%;border-top:1px double #000!important;border-bottom:1px double #000!important">TANGGAL</th>'
    + '<th rowspan="2" style="width:6%;border-top:1px double #000!important;border-bottom:1px double #000!important">TIM</th>'
    + '<th rowspan="2" style="width:12%;border-top:1px double #000!important;border-bottom:1px double #000!important">PENYULANG</th>'
    + '<th rowspan="2" style="width:30%;border-top:1px double #000!important;border-right:1px double #000!important;border-bottom:1px double #000!important">SECTION</th>'
    + '<th colspan="3" style="border-top:1px double #000!important;border-left:1px double #000!important;border-right:1px double #000!important">PEKERJAAN</th>'
    + '<th rowspan="2" style="width:11%;border-top:1px double #000!important;border-right:1px double #000!important;border-bottom:1px double #000!important">KETERANGAN</th>'
    + '</tr>'
    + '<tr>'
    + '<th style="width:9%;font-size:6pt;white-space:nowrap;word-wrap:normal;border-left:1px double #000!important;border-bottom:1px double #000!important">RABAS /<br>PANGKAS</th>'
    + '<th style="width:9%;font-size:6pt;white-space:nowrap;word-wrap:normal;border-bottom:1px double #000!important">TEBANG<br>SEDANG</th>'
    + '<th style="width:9%;font-size:6pt;white-space:nowrap;word-wrap:normal;border-right:1px double #000!important;border-bottom:1px double #000!important">TEBANG<br>BESAR</th>'
    + '</tr>'
    + '</thead><tbody>';

  if(!rows.length){
    h += '<tr><td class="c" colspan="9" style="height:60px">Tidak ada data untuk filter ini.</td></tr>';
  } else {
    var tR=0, tS=0, tB=0;
    for(var i=0;i<rows.length;i++){
      var r = rows[i];
      var rabas = Number(r.rabas)||0, sedang = Number(r.sedang)||0, besar = Number(r.besar)||0;
      tR+=rabas; tS+=sedang; tB+=besar;
      h += '<tr>'
        + '<td class="c">' + (i+1) + '</td>'
        + '<td class="c">' + _pdfEsc(_tglIndo(r.tanggal)) + '</td>'
        + '<td class="c">' + _pdfEsc(r.tim) + '</td>'
        + '<td class="c">' + _pdfEsc(r.penyulang) + '</td>'
        + '<td class="l">' + _pdfEsc(r.section) + '</td>'
        + '<td class="c">' + rabas + '</td>'
        + '<td class="c">' + sedang + '</td>'
        + '<td class="c">' + besar + '</td>'
        + '<td class="c">DATA TERLAMPIR</td>'
        + '</tr>';
    }
    h += '<tr class="total"><td colspan="5" style="border-left:1px double #000!important;border-right:1px double #000!important;border-bottom:1px double #000!important">JUMLAH</td>'
      + '<td style="border-bottom:1px double #000!important">' + tR + '</td>'
      + '<td style="border-bottom:1px double #000!important">' + tS + '</td>'
      + '<td style="border-right:1px double #000!important;border-bottom:1px double #000!important">' + tB + '</td>'
      + '<td style="border-right:1px double #000!important;border-bottom:1px double #000!important"></td></tr>';
  }
  h += '</tbody></table></div>'
    + '<table class="sign"><colgroup><col style="width:56%"><col style="width:8%"><col style="width:36%"></colgroup><tr>'
    + '<td class="sign-first"><span class="sign-title">PIHAK PERTAMA</span>'
    + '<span class="sign-name">' + _pdfEsc(pjb.manager) + '</span>'
    + '<span class="sign-role">MANAGER ULP TOBOALI ..........................</span>'
    + '<span class="sign-gap"></span>'
    + '<span class="sign-name">' + _pdfEsc(pjb.teamLeader) + '</span>'
    + '<span class="sign-role">TL TEKNIK ULP TOBOALI ..........................</span>'
    + '</td>'
    + '<td></td>'
    + '<td class="sign-second"><span class="sign-title">PIHAK KEDUA</span>'
    + '<span class="sign-name">' + _pdfEsc(pjb.koordinator) + '</span>'
    + '<span class="sign-role">KOORDINATOR ULP (OPERASI) ..........................</span>'
    + '</td>'
    + '</tr></table>'
    + '</td></tr></table></body></html>';
  return h;
}

/* Base64 logo PLN (PNG) utk header PDF Rekap ROW.
   OPSIONAL: string kosong = header tampil TANPA gambar logo (teks tetap muncul, PDF tetap jadi).
   Untuk menampilkan logo, tempel string base64 PNG (TANPA prefix "data:image/png;base64,")
   sebagai nilai return di bawah, mis: return 'iVBORw0KGgo...';  */
function _pdfLogoPlnB64_(){
  // URL gambar logo PLN (PNG publik). Ganti dgn link logo PLN milikmu bila perlu
  // (mis. file PNG di Drive yg di-share "anyone with link", atau URL gambar publik).
  var LOGO_PLN_URL = 'https://drive.google.com/uc?export=download&id=1z74dWaUyXH7EU02IAGn_GFCHaXePdUSE';
  try{
    if(!LOGO_PLN_URL) return '';
    var cache  = CacheService.getScriptCache();
    var cached = cache ? cache.get('PLN_LOGO_B64') : null;
    if(cached) return cached;
    var resp = UrlFetchApp.fetch(LOGO_PLN_URL, { muteHttpExceptions:true, followRedirects:true });
    if(resp.getResponseCode() !== 200) return '';
    var b64 = Utilities.base64Encode(resp.getBlob().getBytes());
    try { if(cache) cache.put('PLN_LOGO_B64', b64, 21600); } catch(eC){}
    return b64;
  }catch(e){
    Logger.log('[_pdfLogoPlnB64_] gagal ambil logo: ' + e.message);
    return '';
  }
}


/* ==========================================================================
   MIGRASI FOLDER FOTO ROW: folder kode-unik lama -> folder Kode Eksekusi benar
   --------------------------------------------------------------------------
   FAKTA (dikonfirmasi): kolom PATH foto (R/T/V = fotoSebelum/Pekerjaan/Sesudah)
   menyimpan PATH DRIVE mentah, mis:
     AppSheet SiSi - ULP Toboali/Pekerjaan ROW/2026/Juni/03/66320529/66320529.Foto Sebelum.044343.jpg
   Kolom URL (S/U/W) berisi URL AppSheet getimageurl (dipakai sbg fallback parse).
   Dari path didapat: folder lama + kode unik (66320529) + nama file asli.
   Kode Eksekusi yg BENAR diambil dari kolom D (sudah dikonversi).

   Alur per foto (pasangan kolom R->S, T->U, V->W):
     1) Parse path (R/T/V) -> kode unik + nama file.
     2) Cari file fisik di Drive (by nama file, cocokkan folder induk = kode unik).
     3) Pindahkan ke folder: ROW Eksekusi/YYYY/MM. Bulan/DD/<Kode Eksekusi>.
     4) Set share ANYONE_WITH_LINK, TULIS ULANG sel URL (S/U/W) jadi URL Drive
        (thumbnail?id=..) supaya tampil di web & terbaca PDF, DAN sel path
        (R/T/V) jadi path baru.
   Karena memindah file MEMUTUS link AppSheet, langkah (4) wajib.

   Default dryRun:true -> HANYA LAPORAN, tidak memindahkan apa pun.
   ========================================================================== */

// Apakah URL sudah URL Drive (bukan AppSheet)?
function _isDriveUrl_(u){ return /(?:drive|docs)\.google\.com/i.test(String(u || '')); }

// Ambil ID file dari URL Drive.
function _extractDriveId_(u){ var m = String(u || '').match(/[-\w]{25,}/); return m ? m[0] : ''; }

// Dari kolom foto (path mentah R/T/V, ATAU URL AppSheet getimageurl)
// -> { path, namaFile, kodeUnik }. Null bila tak bisa diurai.
function _appsheetFilePath_(val){
  var s = String(val || '').trim();
  if(!s) return null;
  var path = '';
  var m = s.match(/[?&]fileName=([^&]*)/i);
  if(m){
    var raw = m[1].replace(/\+/g, ' ');
    try{ path = decodeURIComponent(raw); }
    catch(e){ path = raw.replace(/%2F/gi, '/').replace(/%20/gi, ' '); }
  } else {
    // Path mentah langsung (kolom R/T/V).
    path = (s.indexOf('%2F') >= 0) ? s.replace(/%2F/gi, '/').replace(/%20/gi, ' ') : s;
  }
  var seg = path.split('/').filter(function(x){ return x !== ''; });
  if(seg.length < 2) return null;
  return { path:path, namaFile:seg[seg.length - 1], kodeUnik:seg[seg.length - 2] };
}

// Cari file Drive by nama + nama folder induk (kode unik). Fallback: file pertama senama.
function _findDriveFileByNameParent_(namaFile, namaFolderInduk){
  var it = DriveApp.getFilesByName(namaFile), cadangan = null;
  while(it.hasNext()){
    var f = it.next();
    if(!cadangan) cadangan = f;
    var ps = f.getParents();
    var pn = ps.hasNext() ? ps.next().getName() : '';
    if(pn === namaFolderInduk) return f;
  }
  return cadangan;
}

// Path folder tujuan berbasis KODE EKSEKUSI (1 folder / baris eksekusi).
function _folderRowEksekusiPathByEks(tanggal, kodeEksekusi){
  var p = _normTgl(tanggal).split('-');                 // [yyyy, mm, dd]
  var bl = parseInt(p[1], 10) || 1;
  var blFolder = ('0' + bl).slice(-2) + '. ' + _BULAN_ID_INS[bl - 1];
  return ['AppSheet SiSi - ULP Toboali','ROW Eksekusi', p[0], blFolder, p[2] || '', kodeEksekusi];
}

// Pindahkan file ke folder tujuan (moveTo baru, fallback add/removeFile).
function _moveFileToFolder_(file, folder){
  try{ file.moveTo(folder); return true; }
  catch(e1){
    folder.addFile(file);
    var ps = file.getParents();
    while(ps.hasNext()){ var p = ps.next(); if(p.getId() !== folder.getId()) p.removeFile(file); }
    return true;
  }
}

// URL gambar Drive yg bisa dipasang di <img> DAN dibaca extractor ID PDF.
function _driveImgUrl_(id){ return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1920'; }

/* Migrasi utama.
   opsi = {
     dryRun            : default TRUE (aman, hanya lapor),
     filterKode        : proses 1 Kode Eksekusi saja,
     filterTim         : proses tim tertentu (mis 'ROW 03'),
     filterTanggal     : 'yyyy-MM-dd' -> hanya tanggal itu,
     hapusFolderKosong : default FALSE, buang folder lama yg jadi kosong,
     limit             : batasi jumlah baris diproses (0 = semua)
   } */
function migrasiFolderEksekusiROW(opsi){
  opsi = opsi || {};
  var dryRun        = (opsi.dryRun !== false);            // default TRUE
  var filterKode    = String(opsi.filterKode || '').trim();
  var filterTim     = String(opsi.filterTim || '').trim().toLowerCase();
  var filterTanggal = opsi.filterTanggal ? _normTgl(opsi.filterTanggal) : '';
  var hapusKosong   = (opsi.hapusFolderKosong === true);
  var limit         = parseInt(opsi.limit, 10) || 0;

  var lap = { ok:true, dryRun:dryRun, totalBaris:0, diperiksa:0, filePindah:0,
              selDiupdate:0, folderDibuat:0, barisSudahBenar:0, tanpaFoto:0,
              fileTakDitemukan:0, gagal:0, folderKosongDihapus:0, detail:[] };
  try{
    var ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
    var shR = ss.getSheetByName('db_ROW_Eksekusi');
    if(!shR) return { ok:false, message:'Sheet db_ROW_Eksekusi tidak ditemukan' };
    if(shR.getLastRow() < 2) return { ok:false, message:'db_ROW_Eksekusi kosong' };

    var data = shR.getRange(2, 1, shR.getLastRow() - 1, COL_ROW_N).getValues();
    lap.totalBaris = data.length;

    var pasangan = [
      { path: COL_ROW.fotoSebelum,   url: COL_ROW.fotoSebelumUrl   },  // R -> S
      { path: COL_ROW.fotoPekerjaan, url: COL_ROW.fotoPekerjaanUrl },  // T -> U
      { path: COL_ROW.fotoSesudah,   url: COL_ROW.fotoSesudahUrl   }   // V -> W
    ];
    var cacheFolder = {};   // pathKey -> { folder, id }

    for(var i=0;i<data.length;i++){
      var r = data[i];
      var kodeEks = String(r[COL_ROW.kodeEksekusi] || '').trim();
      var tim     = String(r[COL_ROW.tim] || '').trim();
      var tglStr  = _normTanggal(r[COL_ROW.tanggal]);

      // Hanya baris Tim ROW dgn Kode Eksekusi yg SUDAH berformat berantai.
      if(!kodeEks || kodeEks.indexOf('-EKS.') < 0) continue;
      if(!_isTimROW_(tim)) continue;
      if(filterKode && kodeEks !== filterKode) continue;
      if(filterTim && tim.toLowerCase() !== filterTim) continue;
      if(filterTanggal && _normTgl(tglStr) !== filterTanggal) continue;
      if(limit && lap.diperiksa >= limit) break;
      lap.diperiksa++;

      var rowIdx  = i + 2;
      var pathArr = _folderRowEksekusiPathByEks(tglStr, kodeEks);
      var pathKey = pathArr.join('/');

      // Folder tujuan hanya dibuat saat eksekusi nyata (non-dryRun).
      var tujuan = null, tujuanId = '';
      if(!dryRun){
        try{
          if(!cacheFolder[pathKey]){
            var fo = _getOrCreateFolderByPath(pathArr);
            cacheFolder[pathKey] = { folder:fo, id:fo.getId() };
            lap.folderDibuat++;
          }
          tujuan = cacheFolder[pathKey].folder;
          tujuanId = cacheFolder[pathKey].id;
        }catch(eF){
          lap.gagal++; lap.detail.push({ kodeEksekusi:kodeEks, status:'gagal-folder', pesan:eF.message });
          continue;
        }
      }

      var adaFoto = false, pindahBaris = 0, updateBaris = 0, gagalBaris = 0, takKetemu = 0, asalDipantau = {};
      for(var c=0;c<pasangan.length;c++){
        var colPath = pasangan[c].path;   // R/T/V (path mentah)
        var colUrl  = pasangan[c].url;    // S/U/W (URL tampil)
        var valPath = String(r[colPath] || '').trim();
        var valUrl  = String(r[colUrl]  || '').trim();
        if(!valPath && !valUrl) continue;
        adaFoto = true;

        // Kolom URL sudah URL Drive -> data baru, dianggap beres, lewati.
        if(_isDriveUrl_(valUrl)) continue;

        // Ekstrak lokasi: utamakan path mentah (R/T/V), fallback URL AppSheet (S/U/W).
        var info = _appsheetFilePath_(valPath) || _appsheetFilePath_(valUrl);
        if(!info){ takKetemu++; continue; }

        if(dryRun){ pindahBaris++; continue; }   // laporan saja, tak menyentuh Drive/sheet

        try{
          var file = _findDriveFileByNameParent_(info.namaFile, info.kodeUnik);
          if(!file){ takKetemu++; continue; }

          // FOTO SEBELUM: file asalnya Foto Temuan (db_INS_Temuan) -> COPY (bukan move) agar
          // file temuan asli & folder Temuan Inspeksi tetap utuh. Tidak dicatat ke asalDipantau.
          if(colPath === COL_ROW.fotoSebelum){
            var salinanC = null, itC = tujuan.getFilesByName(info.namaFile);
            if(itC.hasNext()) salinanC = itC.next();
            if(!salinanC){ salinanC = file.makeCopy(info.namaFile, tujuan); pindahBaris++; }
            try{ salinanC.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }catch(eShC){}
            shR.getRange(rowIdx, colUrl  + 1).setValue(_driveImgUrl_(salinanC.getId()));
            shR.getRange(rowIdx, colPath + 1).setValue(pathKey + '/' + info.namaFile);
            updateBaris++;
            continue;
          }

          var ps = file.getParents();
          var parId = ps.hasNext() ? ps.next().getId() : '';
          if(parId) asalDipantau[parId] = true;

          if(parId !== tujuanId){ _moveFileToFolder_(file, tujuan); pindahBaris++; }
          try{ file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }catch(eSh){}

          // Tulis ulang: URL tampil (S/U/W) + path baru (R/T/V).
          shR.getRange(rowIdx, colUrl  + 1).setValue(_driveImgUrl_(file.getId()));
          shR.getRange(rowIdx, colPath + 1).setValue(pathKey + '/' + info.namaFile);
          updateBaris++;
        }catch(eK){ gagalBaris++; }
      }

      if(!adaFoto){ lap.tanpaFoto++; continue; }
      lap.filePindah += pindahBaris; lap.selDiupdate += updateBaris;
      lap.gagal += gagalBaris; lap.fileTakDitemukan += takKetemu;
      if(!pindahBaris && !updateBaris && !gagalBaris && !takKetemu) lap.barisSudahBenar++;

      lap.detail.push({ kodeEksekusi:kodeEks, tanggal:tglStr, folderTujuan:pathKey,
                        pindah:pindahBaris, updateSel:updateBaris, takKetemu:takKetemu, gagal:gagalBaris });

      // Bersihkan folder lama yg jadi kosong (opsional, hanya non-dryRun).
      if(hapusKosong && !dryRun){
        for(var pid in asalDipantau){
          if(pid === tujuanId) continue;
          try{
            var folderLama = DriveApp.getFolderById(pid);
            if(!folderLama.getFiles().hasNext() && !folderLama.getFolders().hasNext()){
              folderLama.setTrashed(true); lap.folderKosongDihapus++;
            }
          }catch(eO){}
        }
      }
    }

    lap.message = dryRun
      ? ('DRY-RUN. ' + lap.diperiksa + ' baris, ' + lap.filePindah + ' foto KANDIDAT pindah, ' +
         lap.fileTakDitemukan + ' tak terbaca. Jalankan jalankanMigrasiFolderEksekusiROW() utk eksekusi nyata.')
      : (lap.diperiksa + ' baris, ' + lap.filePindah + ' foto dipindah, ' + lap.selDiupdate +
         ' sel URL diupdate, ' + lap.fileTakDitemukan + ' tak ketemu, ' + lap.gagal + ' gagal.');
    return lap;
  }catch(e){
    return { ok:false, message:'Error: ' + e.message, sebagian:lap };
  }
}

// Eksekusi NYATA (dryRun:false). Panggil setelah puas dgn hasil dry-run.
function jalankanMigrasiFolderEksekusiROW(){
  return migrasiFolderEksekusiROW({ dryRun:false });
}

// Uji satu Kode Eksekusi saja (default dry-run).
function migrasiFolderEksekusiROWSatu(kodeEksekusi, dryRun){
  var key = String(kodeEksekusi || '').trim();
  if(!key) return { ok:false, message:'Kode Eksekusi kosong.' };
  return migrasiFolderEksekusiROW({ dryRun:(dryRun !== false), filterKode:key });
}


/* ==========================================================================
   PEMINDAHAN FOTO OTOMATIS — Antrian db_FotoRow_Queue (pola P0)
   --------------------------------------------------------------------------
   Menggantikan mekanisme lama fotoRowTick (1 Kode Header / menit) yang membuat
   60 sinkron ≈ 60 menit. Kini foto diproses lewat ANTRIAN BERBASIS SHEET
   (db_FotoRow_Queue), 1 baris antrian = 1 Kode Eksekusi (mirror db_WM_Queue P0).
   Alur (drainFotoRow, dipicu trigger tiap 1 menit) memakai 3 fase seperti
   drainAntreanP0 agar aman dari tabrakan & "data yang masuk saat proses berjalan
   diproses di ronde berikutnya":
     Fase 1 KLAIM     : di dalam getScriptLock, ambil s/d FOTOROW_QUEUE_BATCH (15)
                        baris 'pending' -> tandai 'processing' (snapshot ronde ini).
                        Baris baru yang masuk setelah klaim TIDAK ikut ronde ini.
     Fase 2 PROSES    : tanpa lock, pindahkan foto tiap Kode Eksekusi via
                        _pindahFotoEksekusiRow_ (idempoten).
     Fase 3 FINALISASI: hapus baris yang sukses; baris gagal -> kembalikan ke
                        'pending' + attempts++ (buang bila > MAX_ATTEMPTS).
   Backstop: TANPA kolom penanda (opsi A) — enqueue dilakukan di prosesEksekusiROW
   saat Kode Eksekusi final ditetapkan. Baris 'processing' yang macet (mis. eksekusi
   ter-timeout) dipulihkan otomatis lewat FOTOROW_QUEUE_STALE_MS.
   ========================================================================== */

var FOTOROW_QUEUE_SHEET        = 'db_FotoRow_Queue';
var FOTOROW_QUEUE_BATCH        = 15;               // maks Kode Eksekusi / drain (15 baris ≈ 45 foto ≈ ~45 dtk)
var FOTOROW_QUEUE_MAX_ATTEMPTS = 5;                // buang baris setelah gagal sekian kali
var FOTOROW_QUEUE_STALE_MS     = 10 * 60 * 1000;   // 'processing' > 10 mnt dianggap macet -> boleh diklaim ulang

// Kolom db_FotoRow_Queue (0-based): id | status | kodeEksekusi | enqueuedAt | lastTriedAt | attempts
var COL_FQ = { id:0, status:1, kodeEksekusi:2, enqueuedAt:3, lastTriedAt:4, attempts:5 };
var COL_FQ_N = 6;

// Ambil/buat sheet antrian + header.
function _fotoRowQueueSheet_(ss){
  ss = ss || SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName(FOTOROW_QUEUE_SHEET);
  if(!sh){
    sh = ss.insertSheet(FOTOROW_QUEUE_SHEET);
    sh.getRange(1, 1, 1, COL_FQ_N)
      .setValues([['id','status','kodeEksekusi','enqueuedAt','lastTriedAt','attempts']]);
  }
  return sh;
}

// Normalisasi timestamp antrian -> milidetik (angka). '' / invalid -> 0.
function _msFotoRow_(v){
  if(v === '' || v === null || v === undefined) return 0;
  if(v instanceof Date){ var t = v.getTime(); return isNaN(t) ? 0 : t; }
  var n = Number(v);
  if(!isNaN(n) && n > 0) return n;
  var d = new Date(v);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

// ENQUEUE: daftarkan 1 Kode Eksekusi ke antrian foto (dedup pending/processing).
// Hanya menerima Kode Eksekusi FINAL (berformat ...-EKS.nnn). Dibungkus getUserLock agar
// dua proses paralel tidak menulis baris kembar. markFotoRowDirty_ dipertahankan sbg ALIAS
// agar pemanggil lama tidak error, namun kini menerima KODE EKSEKUSI (bukan Kode Header).
function enqueueFotoRow_(kodeEksekusi){
  var key = String(kodeEksekusi || '').trim();
  if(!key || key.indexOf('-EKS.') < 0) return false;   // hanya kode final
  var lock = LockService.getUserLock();
  try{ lock.waitLock(15000); }catch(eL){ Logger.log('[enqueueFotoRow_] lock gagal: ' + eL.message); return false; }
  try{
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = _fotoRowQueueSheet_(ss);
    // Dedup: lewati bila sudah ada baris pending/processing utk Kode Eksekusi ini.
    if(sh.getLastRow() > 1){
      var ada = sh.getRange(2, 1, sh.getLastRow() - 1, COL_FQ_N).getValues();
      for(var i = 0; i < ada.length; i++){
        if(String(ada[i][COL_FQ.kodeEksekusi] || '').trim() !== key) continue;
        var st = String(ada[i][COL_FQ.status] || '').trim();
        if(st === 'pending' || st === 'processing') return true;   // sudah antri
      }
    }
    var now = Date.now();
    sh.appendRow(['fq_' + now + '_' + Math.floor(Math.random() * 1e6),
                  'pending', key, now, '', 0]);
    return true;
  }catch(e){
    Logger.log('[enqueueFotoRow_] ERROR: ' + e.message);
    return false;
  }finally{
    try{ lock.releaseLock(); }catch(eR){}
  }
}

// ALIAS kompatibilitas: pemanggil lama markFotoRowDirty_ kini meneruskan ke enqueueFotoRow_.
// CATATAN: argumen kini KODE EKSEKUSI (final), bukan Kode Header seperti versi lama.
function markFotoRowDirty_(kodeEksekusi){
  return enqueueFotoRow_(kodeEksekusi);
}

// Path folder tujuan FINAL (termasuk segmen Tim).
// Struktur: AppSheet SiSi - ULP Toboali/Eksekusi ROW/<yyyy>/<MM. Bulan>/<dd>/<Tim>/<KodeEksekusi>
function _folderRowEksekusiPathFinal_(tanggal, tim, kodeEksekusi){
  var p  = _normTgl(tanggal).split('-');   // [yyyy, mm, dd]
  var bl = parseInt(p[1], 10) || 1;
  var blFolder = ('0' + bl).slice(-2) + '. ' + _BULAN_ID_INS[bl - 1];
  return ['AppSheet SiSi - ULP Toboali', 'Eksekusi ROW', p[0], blFolder, p[2] || '',
          String(tim || '').trim(), kodeEksekusi];
}

/* Pindahkan foto satu baris eksekusi ke path final.
   Alur per pasangan kolom (R->S, T->U, V->W):
     1) Ambil file Drive (by ID dari URL Drive, atau by nama+folder dari path AppSheet).
     2) Guard idempoten: sudah di folder tujuan & nama benar -> skip.
     3) Pindahkan ke folder tujuan (Tim/KodeEksekusi).
     4) Rename: prefix lama diganti KodeEksekusi, sisa nama (.<Jenis>.<HHMMSS>.<ext>) dipertahankan.
     5) Set ANYONE_WITH_LINK, tulis ulang kolom URL (thumbnail Drive) & path.
     6) Folder unik lama: cek isi file -> kosong -> setTrashed.
   Mengembalikan { ok, pindah, rename, updateSel, takKetemu, gagal }. */
function _pindahFotoEksekusiRow_(ss, shR, rowIdx, r){
  var kodeEks = String(r[COL_ROW.kodeEksekusi] || '').trim();
  var tim     = String(r[COL_ROW.tim] || '').trim();
  var tglStr  = _normTanggal(r[COL_ROW.tanggal]);
  if(!kodeEks || !tim || !tglStr) return { ok:false, message:'Data tidak lengkap' };

  // Hanya baris yg Kode Eksekusi-nya sudah berformat berantai.
  if(kodeEks.indexOf('-EKS.') < 0) return { ok:false, message:'Kode Eksekusi belum final' };

  var pathArr = _folderRowEksekusiPathFinal_(tglStr, tim, kodeEks);
  var pathKey = pathArr.join('/');
  var tujuan;
  try{
    tujuan = _getOrCreateFolderByPath(pathArr);
  }catch(e){
    return { ok:false, message:'Gagal buat folder: ' + e.message };
  }
  var tujuanId = tujuan.getId();

  var pasangan = [
    { path: COL_ROW.fotoSebelum,   url: COL_ROW.fotoSebelumUrl   },  // R -> S
    { path: COL_ROW.fotoPekerjaan, url: COL_ROW.fotoPekerjaanUrl },  // T -> U
    { path: COL_ROW.fotoSesudah,   url: COL_ROW.fotoSesudahUrl   }   // V -> W
  ];

  var pindah = 0, rename = 0, updateSel = 0, takKetemu = 0, gagal = 0;
  var parentLama = {};   // { folderId: FolderObject } — dikumpulkan, dibersihkan di akhir

  for(var c = 0; c < pasangan.length; c++){
    var colPath = pasangan[c].path;
    var colUrl  = pasangan[c].url;
    var valPath = String(r[colPath] || '').trim();
    var valUrl  = String(r[colUrl]  || '').trim();
    if(!valPath && !valUrl) continue;

    var file = null;
    try{
      // Prioritas: ambil by ID dari URL Drive (sudah punya ID pasti).
      if(_isDriveUrl_(valUrl)){
        var fid = _extractDriveId_(valUrl);
        if(fid) file = DriveApp.getFileById(fid);
      }
      // Fallback: cari by nama + folder induk dari path AppSheet.
      if(!file){
        var info = _appsheetFilePath_(valPath) || _appsheetFilePath_(valUrl);
        if(info) file = _findDriveFileByNameParent_(info.namaFile, info.kodeUnik);
      }
    }catch(eF){ gagal++; continue; }
    if(!file){ takKetemu++; continue; }

    // FOTO SEBELUM: file asalnya = Foto Temuan (db_INS_Temuan). JANGAN dipindah/rename (agar
    // record temuan inspeksi + folder Temuan Inspeksi tetap utuh) -> COPY ke folder eksekusi.
    // Idempoten: bila kolom URL sudah menunjuk salinan di folder tujuan dgn nama benar -> skip.
    // Folder temuan TIDAK dicatat ke parentLama sehingga tidak akan di-trash.
    if(colPath === COL_ROW.fotoSebelum){
      try{
        var namaAsalSb = file.getName();
        var dotSb      = namaAsalSb.indexOf('.');
        var sisaSb     = dotSb >= 0 ? namaAsalSb.substring(dotSb) : ('.' + namaAsalSb);
        var namaTgtSb  = kodeEks + sisaSb;
        var parNowSb   = file.getParents().hasNext() ? file.getParents().next().getId() : '';
        // File yg ditemukan SUDAH salinan final di folder tujuan -> idempoten skip.
        if(parNowSb === tujuanId && namaAsalSb === namaTgtSb) continue;
        // Pakai ulang salinan yg mungkin sudah dibuat sebelumnya (hindari copy ganda).
        var salinanSb = null, itSb = tujuan.getFilesByName(namaTgtSb);
        if(itSb.hasNext()) salinanSb = itSb.next();
        if(!salinanSb){ salinanSb = file.makeCopy(namaTgtSb, tujuan); pindah++; }
        try{ salinanSb.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }catch(eShSb){}
        shR.getRange(rowIdx, colUrl  + 1).setValue(_driveImgUrl_(salinanSb.getId()));
        shR.getRange(rowIdx, colPath + 1).setValue(pathKey + '/' + namaTgtSb);
        updateSel++;
      }catch(eSb){
        Logger.log('[_pindahFotoEksekusiRow_] COPY Foto Sebelum gagal ' + kodeEks + ': ' + eSb.message);
        gagal++;
      }
      continue;   // jangan jalankan blok MOVE & jangan catat parentLama (folder temuan aman)
    }

    try{
      // Catat folder induk lama (untuk dibersihkan setelah semua foto dipindah).
      var parIter = file.getParents();
      var parOld  = parIter.hasNext() ? parIter.next() : null;
      if(parOld && parOld.getId() !== tujuanId) parentLama[parOld.getId()] = parOld;

      // Susun nama target: ganti prefix (sebelum titik pertama) dengan KodeEksekusi.
      // Contoh: "7e53ee6e.Foto Sebelum.042836.jpg" -> "R02-...-EKS.001.Foto Sebelum.042836.jpg"
      // Guard: bila nama sudah diawali KodeEksekusi -> hanya pindah folder bila perlu.
      var namaLama   = file.getName();
      var dotIdx     = namaLama.indexOf('.');
      var sisaNama   = dotIdx >= 0 ? namaLama.substring(dotIdx) : ('.' + namaLama);
      var namaTarget = kodeEks + sisaNama;
      // Idempoten guard: sudah di folder tujuan & nama sudah benar -> skip seluruh pasangan ini.
      var parIdNow = file.getParents().hasNext() ? file.getParents().next().getId() : '';
      if(parIdNow === tujuanId && namaLama === namaTarget) continue;

      // Pindahkan ke folder tujuan.
      if(parIdNow !== tujuanId){ _moveFileToFolder_(file, tujuan); pindah++; }

      // Rename.
      if(namaLama !== namaTarget){ file.setName(namaTarget); rename++; }

      // Set sharing.
      try{ file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }catch(eSh){}

      // Tulis ulang kolom URL (S/U/W) -> thumbnail Drive, kolom path (R/T/V) -> path baru.
      shR.getRange(rowIdx, colUrl  + 1).setValue(_driveImgUrl_(file.getId()));
      shR.getRange(rowIdx, colPath + 1).setValue(pathKey + '/' + namaTarget);
      updateSel++;
    }catch(eP){
      Logger.log('[_pindahFotoEksekusiRow_] ERROR ' + kodeEks + ': ' + eP.message);
      gagal++;
    }
  }

  SpreadsheetApp.flush();

  // Bersihkan folder unik lama yang tidak punya file lagi.
  // Cek FILE saja (bukan sub-folder) sesuai kesepakatan: folder punya sub-folder lain -> dibiarkan.
  for(var pid in parentLama){
    try{
      var folderLama = parentLama[pid];
      if(!folderLama.getFiles().hasNext()) folderLama.setTrashed(true);
    }catch(eO){}
  }

  return { ok:true, kodeEksekusi:kodeEks, pindah:pindah, rename:rename,
           updateSel:updateSel, takKetemu:takKetemu, gagal:gagal };
}

/* Ambil 1 Kode Eksekusi dari antrian, cari barisnya di db_ROW_Eksekusi, lalu pindahkan fotonya.
   Mengembalikan hasil _pindahFotoEksekusiRow_ (atau {ok:false,...} bila baris tak ditemukan). */
function _prosesFotoRowSatu_(ss, shR, kodeEksekusi){
  var key = String(kodeEksekusi || '').trim();
  if(!key) return { ok:false, message:'Kode Eksekusi kosong' };
  if(!shR) shR = ss.getSheetByName('db_ROW_Eksekusi');
  if(!shR || shR.getLastRow() < 2) return { ok:false, message:'db_ROW_Eksekusi kosong' };

  var data = shR.getRange(2, 1, shR.getLastRow() - 1, COL_ROW_N).getValues();
  for(var i = 0; i < data.length; i++){
    if(String(data[i][COL_ROW.kodeEksekusi] || '').trim() !== key) continue;
    return _pindahFotoEksekusiRow_(ss, shR, i + 2, data[i]);
  }
  return { ok:false, message:'Kode Eksekusi tidak ditemukan: ' + key, takKetemu:true };
}

/* DRAIN antrian foto (pola drainAntreanP0) — dipicu trigger tiap 1 menit.
   Fase 1 KLAIM (getScriptLock): ambil s/d FOTOROW_QUEUE_BATCH baris 'pending'
     (atau 'processing' yang sudah stale) -> tandai 'processing' + lastTriedAt.
     Snapshot ronde ini; baris yang masuk setelah klaim menunggu ronde berikutnya.
   Fase 2 PROSES (tanpa lock): pindahkan foto tiap Kode Eksekusi (idempoten).
   Fase 3 FINALISASI: baris sukses -> dihapus; gagal -> kembalikan 'pending' +
     attempts++ (dibuang bila attempts > FOTOROW_QUEUE_MAX_ATTEMPTS). */
function drainFotoRow(){
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = _fotoRowQueueSheet_(ss);
  if(sh.getLastRow() < 2){ Logger.log('[drainFotoRow] Antrian kosong.'); return; }

  var now = Date.now();
  var klaim = [];   // { rowSheet, id, kodeEksekusi, attempts }

  // ── Fase 1: KLAIM (di dalam lock) ──
  var lock = LockService.getScriptLock();
  if(!lock.tryLock(3000)){ Logger.log('[drainFotoRow] Skip: drain lain sedang berjalan.'); return; }
  try{
    var rows = sh.getRange(2, 1, sh.getLastRow() - 1, COL_FQ_N).getValues();
    for(var i = 0; i < rows.length && klaim.length < FOTOROW_QUEUE_BATCH; i++){
      var st  = String(rows[i][COL_FQ.status] || '').trim();
      var key = String(rows[i][COL_FQ.kodeEksekusi] || '').trim();
      if(!key) continue;
      var bolehKlaim = (st === 'pending') ||
                       (st === 'processing' && (now - _msFotoRow_(rows[i][COL_FQ.lastTriedAt])) > FOTOROW_QUEUE_STALE_MS);
      if(!bolehKlaim) continue;
      var rowSheet = i + 2;
      sh.getRange(rowSheet, COL_FQ.status + 1).setValue('processing');
      sh.getRange(rowSheet, COL_FQ.lastTriedAt + 1).setValue(now);
      klaim.push({ rowSheet: rowSheet, id: String(rows[i][COL_FQ.id] || ''),
                   kodeEksekusi: key, attempts: Number(rows[i][COL_FQ.attempts]) || 0 });
    }
    SpreadsheetApp.flush();
  }catch(eK){
    Logger.log('[drainFotoRow] KLAIM ERROR: ' + eK.message);
    try{ lock.releaseLock(); }catch(eR){}
    return;
  }finally{
    try{ lock.releaseLock(); }catch(eR2){}
  }

  if(!klaim.length){ Logger.log('[drainFotoRow] Tidak ada baris untuk diklaim.'); return; }

  // ── Fase 2: PROSES (tanpa lock) ──
  var shR = ss.getSheetByName('db_ROW_Eksekusi');
  var sukses = 0, gagal = 0;
  for(var k = 0; k < klaim.length; k++){
    var hasil;
    try{
      hasil = _prosesFotoRowSatu_(ss, shR, klaim[k].kodeEksekusi);
    }catch(eP){
      hasil = { ok:false, message:eP.message };
    }
    // Baris eksekusi hilang (takKetemu) dianggap "selesai" agar tidak menyumbat antrian.
    klaim[k]._ok = !!(hasil && (hasil.ok || hasil.takKetemu));
    if(klaim[k]._ok) sukses++; else { gagal++; Logger.log('[drainFotoRow] Gagal ' + klaim[k].kodeEksekusi + ': ' + JSON.stringify(hasil)); }
  }

  // ── Fase 3: FINALISASI (di dalam lock) ──
  var lock2 = LockService.getScriptLock();
  try{ lock2.waitLock(15000); }catch(eL2){ Logger.log('[drainFotoRow] finalisasi lock gagal: ' + eL2.message); return; }
  try{
    var kini = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, COL_FQ_N).getValues() : [];
    var idxById = {};
    for(var j = 0; j < kini.length; j++) idxById[String(kini[j][COL_FQ.id] || '')] = j + 2;

    var hapusRows = [];   // nomor baris sheet yang akan dihapus (sukses / attempts habis)
    for(var m = 0; m < klaim.length; m++){
      var rowSheet = idxById[klaim[m].id];
      if(!rowSheet) continue;   // baris sudah hilang
      if(klaim[m]._ok){
        hapusRows.push(rowSheet);
      } else {
        var att = klaim[m].attempts + 1;
        if(att > FOTOROW_QUEUE_MAX_ATTEMPTS){
          hapusRows.push(rowSheet);   // menyerah -> buang
          Logger.log('[drainFotoRow] Menyerah (attempts>' + FOTOROW_QUEUE_MAX_ATTEMPTS + '): ' + klaim[m].kodeEksekusi);
        } else {
          sh.getRange(rowSheet, COL_FQ.status + 1).setValue('pending');   // kembalikan utk ronde berikutnya
          sh.getRange(rowSheet, COL_FQ.attempts + 1).setValue(att);
        }
      }
    }
    // Hapus baris dari bawah ke atas agar indeks tidak bergeser.
    hapusRows.sort(function(a, b){ return b - a; });
    for(var d = 0; d < hapusRows.length; d++) sh.deleteRow(hapusRows[d]);
    SpreadsheetApp.flush();
  }catch(eF){
    Logger.log('[drainFotoRow] FINALISASI ERROR: ' + eF.message);
  }finally{
    try{ lock2.releaseLock(); }catch(eR3){}
  }

  Logger.log('[drainFotoRow] Selesai | diklaim=' + klaim.length + ' | sukses=' + sukses + ' | gagal=' + gagal);
}

// Pasang trigger periodik drainFotoRow (tiap 1 menit) + buang trigger fotoRowTick lama.
// Lepas trigger drainFotoRow (dan sisa fotoRowTick lama bila ada).
function hapusFotoRowDrainTrigger(){
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function(t){
    var fn = t.getHandlerFunction();
    if(fn === 'drainFotoRow' || fn === 'fotoRowTick'){ ScriptApp.deleteTrigger(t); n++; }
  });
  Logger.log('[hapusFotoRowDrainTrigger] ' + n + ' trigger dilepas.');
}


/* ══════════════════════════════════════════════════════════════════════════
   BACKSTOP: SWEEP TEMUAN ROW SELESAI -> db_ROW_Eksekusi
   --------------------------------------------------------------------------
   CADANGAN bila recalcTick (antrean db_Recalc_Queue) GAGAL / terlewat
   memindahkan hasil tindak lanjut inspeksi (temuan Selesai + kriteria ROW =
   Diameter terisi) ke db_ROW_Eksekusi. Fungsi ini MEMINDAI db_INS_Temuan
   berstatus 'Selesai' dalam rentang mundur (default 7 hari), mengumpulkan
   TANGGAL SELESAI unik, lalu memanggil recalcEksekusiROW(null, null, <tgl>)
   per tanggal. recalcEksekusiROW idempoten (anti-dobel via Kode Pekerjaan +
   Nomor Tiang & auto-buat induk/header), sehingga aman dijalankan berulang:
   yang sudah ada dilewati, yang belum terpindah akan dibuat.
   Dipicu trigger periodik (createEksekusiRowSweepTrigger), TERPISAH dari
   recalcTick sehingga tetap jalan walau antrean recalc bermasalah.
   ════════════════════════════════════════════════════════════════════════ */

var EKSROW_SWEEP_LOOKBACK_DAYS = 7;   // rentang mundur (hari) Tanggal Selesai yang disapu

function sweepEksekusiRowBacklog(){
  try{
    var ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
    var shT = ss.getSheetByName(SHEET_INS.TEMUAN);
    if(!shT || shT.getLastRow() < 2){
      Logger.log('[sweepEksekusiRowBacklog] Tidak ada temuan.');
      return { ok:true, tanggal:0, ditambah:0 };
    }

    var T = COL_INS.TEMUAN;

    // Batas bawah rentang (yyyy-MM-dd). PENTING: pakai _normTanggal — fungsi yang SAMA
    // dengan pembacaan sel Tanggal Selesai di bawah — agar TIDAK ada beda zona waktu.
    // _normTanggal & _normTgl sama-sama memaksa 'Asia/Jakarta', sedangkan
    // Session.getScriptTimeZone() bisa BEDA bila TZ proyek Apps Script belum di-set
    // Asia/Jakarta, sehingga tanggal batas & tanggal sel tak sinkron (tanggal 'tak terbaca').
    var batas = new Date();
    batas.setDate(batas.getDate() - (EKSROW_SWEEP_LOOKBACK_DAYS - 1));
    var batasStr = _normTanggal(batas);

    // Kumpulkan Tanggal Selesai UNIK dari temuan Selesai + kriteria ROW (Diameter terisi).
    // DUAL-READ (migrasi): db_INS_Temuan dibaca AKTIF + ARSIP (dedup by Kode Pekerjaan) — migrasi
    // Temuan TANPA kriteria tanggal bisa memindahkan temuan Selesai H/H-1 ke arsip lebih dulu.
    var data = _readSheetDual_(SHEET_INS.TEMUAN, COL_INS.TEMUAN.kodePekerjaan, COL_INS.TEMUAN.folderPath + 1);
    var tglSet = {};
    for(var i=0;i<data.length;i++){
      var row = data[i];
      if(String(row[T.status] || '').trim() !== STATUS_INS.SELESAI) continue;
      // KRITERIA ROW = kolom Diameter TERISI (bukan harus > 0). Rabas/Pangkas berdiameter 0
      // TETAP sah sbg pekerjaan ROW -> jangan dibuang. Hanya sel Diameter KOSONG (temuan non-ROW)
      // yang dilewati. Disamakan dgn recalcEksekusiROW.
      var rawDia = row[T.diameter];
      if(rawDia === '' || rawDia === null || rawDia === undefined) continue;   // Diameter kosong -> bukan ROW
      var diameter = parseFloat(rawDia);
      if(isNaN(diameter)) continue;                          // nilai Diameter tak valid (0 = Rabas OK)
      // ACUAN = kolom AL 'Tanggal Selesai' (indeks 37) yang DIINPUT PETUGAS; sumber tunggal,
      // TANPA fallback ke Timestamp Selesai (AP/40) atau Tanggal temuan (G/6) — sama dgn recalcEksekusiROW.
      var tglSel = _normTanggal(row[T.tglSelesai]);
      if(!tglSel || tglSel < batasStr) continue;            // di luar rentang mundur
      if(_tglSudahDiarsip_(tglSel)) continue;                 // GUARD MIGRASI: tanggal <= H-2 sudah di arsip — jangan proses ulang
      tglSet[tglSel] = true;
    }

    var tanggalList = Object.keys(tglSet).sort();
    if(tanggalList.length === 0){
      Logger.log('[sweepEksekusiRowBacklog] Tidak ada temuan Selesai ROW dalam ' + EKSROW_SWEEP_LOOKBACK_DAYS + ' hari.');
      return { ok:true, tanggal:0, ditambah:0 };
    }

    // Lock ringan agar tidak tumpang tindih dgn sweep/recalc lain yg sedang menulis.
    var lock = LockService.getScriptLock();
    if(!lock.tryLock(3000)){
      Logger.log('[sweepEksekusiRowBacklog] Skip: proses lain sedang berjalan.');
      return { ok:false, skipped:true };
    }

    var totalTambah = 0, totalDobel = 0, detail = [];
    try{
      for(var d=0; d<tanggalList.length; d++){
        var hasil = recalcEksekusiROW(null, null, tanggalList[d]);   // idempoten
        var tmb = (hasil && hasil.ditambah)      ? hasil.ditambah      : 0;
        var dbl = (hasil && hasil.dilewatiDobel) ? hasil.dilewatiDobel : 0;
        totalTambah += tmb; totalDobel += dbl;
        detail.push({ tanggal: tanggalList[d], ditambah: tmb, dilewatiDobel: dbl });
      }
    }finally{
      try{ lock.releaseLock(); }catch(eR){}
    }

    Logger.log('[sweepEksekusiRowBacklog] Selesai | tanggal=' + tanggalList.length +
               ' | ditambah=' + totalTambah + ' | dobel(dilewati)=' + totalDobel);
    return { ok:true, tanggal: tanggalList.length, ditambah: totalTambah,
             dilewatiDobel: totalDobel, detail: detail };
  }catch(e){
    Logger.log('[sweepEksekusiRowBacklog] ERROR: ' + e.message);
    return { ok:false, message: e.message };
  }
}

// Pasang 1 trigger periodik sweepEksekusiRowBacklog (default tiap 1 jam) + buang trigger lama senama.
// Lepas trigger sweepEksekusiRowBacklog.
function hapusEksekusiRowSweepTrigger(){
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function(t){
    if(t.getHandlerFunction() === 'sweepEksekusiRowBacklog'){ ScriptApp.deleteTrigger(t); n++; }
  });
  Logger.log('[hapusEksekusiRowSweepTrigger] ' + n + ' trigger dilepas.');
}


/* ═══ DIAGNOSA: kenapa baris tidak terproses sweep/recalc ═══
   Read-only. Menampilkan SEMUA baris db_INS_Temuan yang Tanggal Selesai-nya = <tanggal>
   (default hari ini) beserta hasil tiap filter, sehingga jelas filter mana yang membuang baris
   (Status bukan 'Selesai', Diameter kosong, atau Tanggal Selesai tak sinkron). Jalankan mis.
   diagnosaSweepROW() atau diagnosaSweepROW('2026-08-01') lalu lihat Log eksekusi. */
function diagnosaSweepROW(tanggal){
  var ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  var shT = ss.getSheetByName(SHEET_INS.TEMUAN);
  if(!shT || shT.getLastRow() < 2){ Logger.log('[diagnosaSweepROW] Tidak ada temuan.'); return { ok:true, jumlah:0, baris:[] }; }
  var T = COL_INS.TEMUAN;
  var target = tanggal ? _normTanggal(tanggal) : _normTanggal(new Date());
  var data = shT.getRange(2, 1, shT.getLastRow() - 1, shT.getLastColumn()).getValues();
  var out = [];
  for(var i=0;i<data.length;i++){
    var row = data[i];
    var tglNorm = _normTanggal(row[T.tglSelesai]);
    if(tglNorm !== target) continue;                 // hanya baris yg Tanggal Selesai = target
    var rawDia    = row[T.diameter];
    var diaKosong = (rawDia === '' || rawDia === null || rawDia === undefined);
    var diameter  = parseFloat(rawDia);
    var statusRaw = String(row[T.status] || '').trim();
    out.push({
      baris:             i + 2,
      kodePekerjaan:     String(row[T.kodePekerjaan] || ''),
      status:            statusRaw,
      lolosStatus:       (statusRaw === STATUS_INS.SELESAI),
      tglSelesaiMentah:  String(row[T.tglSelesai]),
      tglSelesaiNorm:    tglNorm,
      diameterMentah:    String(rawDia),
      lolosDiameterLama: (!isNaN(diameter) && diameter > 0),   // aturan LAMA (>0): rabas 0 GAGAL
      lolosDiameterBaru: (!diaKosong && !isNaN(diameter)),     // aturan BARU (terisi): rabas 0 LOLOS
      timEksekusi:       String(row[T.timEksekusi] || ''),
      penyulang:         String(row[T.penyulang] || '')
    });
  }
  Logger.log('[diagnosaSweepROW] target=' + target + ' | cocok=' + out.length + ' | ' + JSON.stringify(out));
  return { ok:true, target: target, jumlah: out.length, baris: out };
}


/* ═══ DIAGNOSA: kenapa baris DILEWATI sbg 'dobel' oleh recalcEksekusiROW ═══
   Read-only. Meniru pencocokan + anti-dobel recalcEksekusiROW untuk <tanggal> (default hari ini),
   lalu menampilkan per temuan: Kode Pekerjaan realisasi yg cocok, Nomor Tiang (& apakah kosong),
   dedupKey, dan DAFTAR Kode Eksekusi yg SUDAH ADA utk kunci itu. Cara baca:
     - sudahAdaEksekusi:true dgn kodeEksekusiAda berisi kode nyata & berbeda -> DUPLIKAT ASLI
       (data memang sudah di db_ROW_Eksekusi; backstop benar tidak menggandakan).
     - nomorTiangKosong:true untuk banyak baris berbagi kodePekerjaanRlz sama -> potensi FALSE
       POSITIVE (kunci dedup bertabrakan krn Nomor Tiang kosong).
   Jalankan mis. diagnosaDobelROW() atau diagnosaDobelROW('2026-08-01') lalu lihat Log eksekusi. */
function diagnosaDobelROW(tanggal){
  var ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  var shT = ss.getSheetByName(SHEET_INS.TEMUAN);
  var shR = ss.getSheetByName('db_ROW_Eksekusi');
  var shL = ss.getSheetByName('db_ROW_Realisasi');
  if(!shT || !shR || !shL){ Logger.log('[diagnosaDobelROW] Sheet tidak ditemukan (Temuan/Eksekusi/Realisasi).'); return { ok:false }; }
  var T = COL_INS.TEMUAN, RL = COL_ROW_RLZ;
  var target = tanggal ? _normTanggal(tanggal) : _normTanggal(new Date());

  // Index realisasi (Tim|Penyulang|Tanggal) -> kandidat Kode Pekerjaan (dipertajam Section).
  var rlzData = shL.getLastRow() > 1 ? shL.getRange(2, 1, shL.getLastRow() - 1, COL_ROW_RLZ_N).getValues() : [];
  var rlzIndex = {};
  for(var i=0;i<rlzData.length;i++){
    var rl = rlzData[i];
    var rlPeny = String(rl[RL.penyulang]||'').trim();
    var rlTgl  = _normTanggal(rl[RL.tanggal]);
    if(!rlPeny || !rlTgl) continue;
    var k = String(rl[RL.tim]||'').trim().toLowerCase()+'|'+rlPeny.toLowerCase()+'|'+rlTgl;
    if(!rlzIndex[k]) rlzIndex[k]=[];
    rlzIndex[k].push({ kodePekerjaan:String(rl[RL.kodePekerjaan]||'').trim(), section:String(rl[RL.section]||'').trim() });
  }

  // Index eksekusi existing: dedupKey (kodePekerjaan|KOORDINAT pekerjaan, fallback Nomor Tiang) -> daftar Kode Eksekusi.
  var exData = shR.getLastRow() > 1 ? shR.getRange(2, 1, shR.getLastRow() - 1, COL_ROW_N).getValues() : [];
  var exSeen = {};
  for(var e=0;e<exData.length;e++){
    var kp = String(exData[e][COL_ROW.kodePekerjaan]||'').trim();
    if(!kp) continue;
    var koordEx      = String(exData[e][COL_ROW.koordinatPekerjaan]||'').trim();
    var pembandingEx = koordEx || String(exData[e][COL_ROW.nomorTiang]||'').trim();
    var kk = kp+'|'+pembandingEx;
    if(!exSeen[kk]) exSeen[kk]=[];
    exSeen[kk].push(String(exData[e][COL_ROW.kodeEksekusi]||'').trim());
  }

  var tData = shT.getRange(2, 1, shT.getLastRow() - 1, shT.getLastColumn()).getValues();
  var out = [];
  for(var r=0;r<tData.length;r++){
    var row = tData[r];
    if(String(row[T.status]||'').trim() !== STATUS_INS.SELESAI) continue;
    var rawDia = row[T.diameter];
    if(rawDia==='' || rawDia===null || rawDia===undefined) continue;
    if(isNaN(parseFloat(rawDia))) continue;
    if(_normTanggal(row[T.tglSelesai]) !== target) continue;

    var peny   = String(row[T.penyulang]||'').trim();
    var timEks = String(row[T.timEksekusi]||'').trim();
    var sec    = String(row[T.section]||'').trim();
    var nt     = String(row[T.nomorTiang]||'').trim();
    var koord  = String(row[T.koordinat]||'').trim();
    var cand = rlzIndex[timEks.toLowerCase()+'|'+peny.toLowerCase()+'|'+target] || [];
    var match = null;
    for(var c=0;c<cand.length;c++){ if(cand[c].section && sec && cand[c].section===sec){ match=cand[c]; break; } }
    if(!match) match = cand[0] || null;
    var kp = match ? match.kodePekerjaan : '(induk realisasi tak ada)';
    var pembanding = koord || nt;   // acuan sama dgn recalc: Koordinat Pekerjaan, fallback Nomor Tiang
    var dedupKey = kp+'|'+pembanding;
    var adaEks = exSeen[dedupKey] || [];
    out.push({
      baris:              r + 2,
      kodeTemuan:         String(row[T.kodePekerjaan]||''),
      timEksekusi:        timEks,
      penyulang:          peny,
      section:            sec,
      nomorTiang:         nt,
      koordinat:          koord,
      koordinatKosong:    (koord===''),
      pakaiFallbackTiang: (koord===''),
      kodePekerjaanRlz:   kp,
      indukRealisasiAda:  (!!match),
      dedupKey:           dedupKey,
      sudahAdaEksekusi:   (adaEks.length>0),
      kodeEksekusiAda:    adaEks
    });
  }
  Logger.log('[diagnosaDobelROW] target=' + target + ' | cocok=' + out.length + ' | ' + JSON.stringify(out));
  return { ok:true, target: target, jumlah: out.length, baris: out };
}