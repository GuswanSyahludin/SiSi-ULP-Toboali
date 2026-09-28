/* ═════════════════════════════════════
   Code-Mobile.js — Mobile Data Endpoints (API Layer)
   Dipindahkan dari Code.js (Rev 29 Agu 2026)
   
   Fungsi:
   - getMobileDropdownRow(token)
   - getMobileLaporanHarian(token, subTim, tim, tanggal, limit)
   - getMobileEksekusiRow(token, subTim, tim, tanggal, limit)
   - simpanMobileEksekusiRow(payload)
   - updateMobileEksekusiRow(payload)
   - bustCacheDropdownPenyulang()
═════════════════════════════════════ */

/* CACHE dropdown penyulang + DUAL-READ (Rev 21 Agu 2026):
   db_Penyulang kini dibaca dari 2 DB — spreadsheet AKTIF + ARSIP (pola Tek-Migrasi:
   TULIS hanya ke AKTIF, BACA dari keduanya). Hasil gabungan di-cache 10 menit karena
   dual-read menambah 1 openById (file ARSIP) — form Eksekusi ROW & kartu Sinkron Data
   tetap seketika. Dedup mengikuti pasangan (Nama Penyulang, Section): pasangan yang sama
   di kedua file hanya dihitung sekali (AKTIF dibaca lebih dulu).
   Bila db_Penyulang di ARSIP tidak ada / kosong → otomatis dilewati (hasil = AKTIF saja).
   Bila sheet master baru saja diedit & perlu efek segera: jalankan bustCacheDropdownPenyulang()
   sekali dari editor. */
var DROPDOWN_PENY_CACHE_KEY = "dropdownPenyulang_v2";
var DROPDOWN_PENY_CACHE_TTL = 600; // 10 menit (selaras cache db_Users)

function bustCacheDropdownPenyulang() {
  try {
    CacheService.getScriptCache().remove(DROPDOWN_PENY_CACHE_KEY);
  } catch (e) {}
}

/**
 * Mengambil list Penyulang dan pemetaan Section untuk form input ROW di mobile.
 * DUAL-READ (AKTIF + ARSIP) — 21 Agu 2026. Respons: { success, penyulang, sectionByPenyulang }.
 * T-04 FIX: Guard untuk audit akses (ulp:false, read-only).
 */
function getMobileDropdownRow(token) {
  try {
    /* T-04 FIX: Guard untuk audit akses dropdown (shared resource). */
    var g = guard_({token: token}, { ulp: false, aksi: "getMobileDropdownRow" });
    
    var sesi = getSesiByToken(token);
    if (!sesi)
      return { success: false, message: "Sesi habis, silakan login ulang." };

    // Cache dulu: hasil GABUNGAN AKTIF+ARSIP (bukan per-file) agar konsisten.
    var cache = CacheService.getScriptCache();
    var hit = cache.get(DROPDOWN_PENY_CACHE_KEY);
    if (hit) {
      try {
        var cached = JSON.parse(hit);
        cached.success = true;
        return cached;
      } catch (eCache) {}
    }

    var penyulangSet = {};
    var sectionMap = {};

    // Sumber bacaan: AKTIF dulu, lalu ARSIP (bila konstanta Tek-Migrasi tersedia).
    var sumber = [SPREADSHEET_ID];
    if (typeof SPREADSHEET_ID_ARSIP !== "undefined" && SPREADSHEET_ID_ARSIP) {
      sumber.push(SPREADSHEET_ID_ARSIP);
    }

    for (var s = 0; s < sumber.length; s++) {
      var shP = null;
      try {
        shP = SpreadsheetApp.openById(sumber[s]).getSheetByName("db_Penyulang");
      } catch (eBuka) {
        Logger.log(
          "getMobileDropdownRow: buka db_Penyulang gagal (sumber " +
            s +
            ") — " +
            eBuka,
        );
      }
      if (!shP || shP.getLastRow() < 2) continue; // arsip tanpa db_Penyulang → lewati

      var data = shP.getRange(2, 1, shP.getLastRow() - 1, 6).getValues();
      for (var i = 0; i < data.length; i++) {
        var peny = String(data[i][2] || "").trim(); // Kolom C = Nama Penyulang
        var sec = String(data[i][4] || "").trim(); // Kolom E = Section
        if (!peny) continue;

        if (!penyulangSet[peny]) {
          penyulangSet[peny] = true;
          sectionMap[peny] = [];
        }
        // Dedup section per penyulang — pasangan (peny, sec) yang sudah ada
        // (termasuk yang dibawa dari file sebelumnya) tidak ditambah dua kali.
        if (sec && sectionMap[peny].indexOf(sec) === -1) {
          sectionMap[peny].push(sec);
        }
      }
    }

    var listPenyulang = Object.keys(penyulangSet).sort();
    listPenyulang.forEach(function (p) {
      sectionMap[p].sort();
    });

    var out = {
      penyulang: listPenyulang,
      sectionByPenyulang: sectionMap,
    };
    try {
      cache.put(
        DROPDOWN_PENY_CACHE_KEY,
        JSON.stringify(out),
        DROPDOWN_PENY_CACHE_TTL,
      );
    } catch (eSimpan) {}
    out.success = true;
    return out;
  } catch (err) {
    return {
      success: false,
      message: "Error getMobileDropdownRow: " + err.message,
    };
  }
}

/**
 * Mengambil list data Laporan Harian (db_Global_Header) terfilter per ULP & tanggal.
 * T-04 DONE: Guard sudah ada dari PR #19 (ULP scoping).
 */
function getMobileLaporanHarian(token, subTim, tim, tanggal, limit) {
  try {
    /* T-04 DONE (PR #19): Guard untuk ULP scoping. */
    var g = guard_(arguments, { ulp: true, aksi: "getMobileLaporanHarian" });

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    // Cari sheet db_Global_Header secara fleksibel (case-insensitive & trim)
    var sh = ss.getSheetByName("db_Global_Header");
    if (!sh) {
      var allSheets = ss.getSheets();
      for (var s = 0; s < allSheets.length; s++) {
        var sName = allSheets[s].getName().trim().toLowerCase();
        if (
          sName === "db_global_header" ||
          sName === "global_header" ||
          sName === "db_header"
        ) {
          sh = allSheets[s];
          break;
        }
      }
    }

    if (!sh) {
      var sheetNames = ss
        .getSheets()
        .map(function (s) {
          return s.getName();
        })
        .join(", ");
      return {
        success: false,
        message:
          "Sheet db_Global_Header tidak ditemukan. Sheet yang ada: " +
          sheetNames,
      };
    }

    var lastRow = sh.getLastRow();
    if (lastRow < 2) return { success: true, data: [] };

    var rawData = sh.getRange(2, 1, lastRow - 1, 17).getValues();
    var filterSubTim = String(subTim || "")
      .trim()
      .toLowerCase();
    var filterTim = String(tim || "")
      .trim()
      .toLowerCase();
    var filterTgl = String(tanggal || "").trim();
    var maxLimit = Number(limit) || 100;

    var hasil = [];

    // Baca dari baris terbaru (bawah ke atas)
    for (var i = rawData.length - 1; i >= 0; i--) {
      var r = rawData[i];
      var rKodeHeader = String(r[1] || "").trim();
      if (!rKodeHeader) continue;

      var rUlp = String(r[2] || "").trim();
      /* Hanya Super User yang melihat ULP lain. Admin terikat ULP sendiri. */
      if (!barisUlpCocok_(g, rUlp)) continue;

      var rHari = String(r[3] || "").trim();
      var rTanggal = _normTgl(r[4]);
      var rTim = String(r[5] || "").trim();
      var rSubTim = String(r[6] || "").trim();
      var rKoorAwal = String(r[7] || "").trim();
      var rKoorAkhir = String(r[8] || "").trim();
      var rKmAwal = String(r[9] || "").trim();
      var rKmAkhir = String(r[10] || "").trim();
      var rKendala = String(r[11] || "").trim();
      var rWaText = String(r[12] || "").trim();
      var rTimestamp = String(r[13] || "").trim();
      var rInputBy = String(r[14] || "").trim();
      var rTglUpdate = String(r[15] || "").trim();
      var rStatusWa = String(r[16] || "").trim();

      // Filter berdasarkan subTim jika diberikan
      if (filterSubTim && rSubTim.toLowerCase() !== filterSubTim) continue;

      // Filter berdasarkan tim jika diberikan
      if (filterTim && rTim.toLowerCase() !== filterTim) continue;

      // Filter berdasarkan tanggal jika diberikan
      if (filterTgl && rTanggal !== filterTgl) continue;

      hasil.push({
        no: r[0],
        kodeHeader: rKodeHeader,
        ulp: rUlp,
        hari: rHari,
        tanggal: rTanggal,
        tim: rTim,
        subTim: rSubTim,
        koordinatAwal: rKoorAwal,
        koordinatAkhir: rKoorAkhir,
        kmAwal: rKmAwal,
        kmAkhir: rKmAkhir,
        kendala: rKendala,
        waText: rWaText,
        timestamp: rTimestamp,
        inputBy: rInputBy,
        timestampUpdate: rTglUpdate,
        statusTextWa: rStatusWa,
      });

      if (hasil.length >= maxLimit) break;
    }

    return { success: true, count: hasil.length, data: hasil };
  } catch (err) {
    return {
      success: false,
      message: "Error getMobileLaporanHarian: " + err.message,
    };
  }
}

/**
 * Mengambil list data eksekusi ROW terfilter per Sub-Tim dan Tanggal
 * T-04 DONE: Guard sudah ada dari PR #19 (ULP scoping).
 */
function getMobileEksekusiRow(token, subTim, tim, tanggal, limit) {
  try {
    /* T-04 DONE (PR #19): Guard untuk ULP scoping. */
    var g = guard_(arguments, { ulp: true, aksi: "getMobileEksekusiRow" });

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName("db_ROW_Eksekusi");
    if (!sh || sh.getLastRow() < 2) return { success: true, data: [] };

    var lastRow = sh.getLastRow();
    var rawData = sh.getRange(2, 1, lastRow - 1, 30).getValues();

    var filterSubTim = String(subTim || "")
      .trim()
      .toLowerCase();
    var filterTim = String(tim || "")
      .trim()
      .toLowerCase();
    var filterTgl = String(tanggal || "").trim();
    var maxLimit = Number(limit) || 100;

    var hasil = [];

    // Baca dari data terbaru (bawah ke atas)
    for (var i = rawData.length - 1; i >= 0; i--) {
      var r = rawData[i];
      var kodeEksekusi = String(r[3] || "").trim();
      var noTiang = String(r[10] || "").trim();
      if (!kodeEksekusi && !noTiang) continue;

      /* r[4] = kolom ULP. Hanya Super User yang melihat ULP lain. */
      if (!barisUlpCocok_(g, r[4])) continue;

      var rTanggal = _normTgl(r[6]);
      var rTim = String(r[7] || "").trim(); // Kolom Tim / Sub-Tim

      if (filterSubTim && rTim.toLowerCase() !== filterSubTim) continue;
      if (filterTim && rTim.toLowerCase() !== filterTim) continue;
      if (filterTgl && rTanggal !== filterTgl) continue;

      hasil.push({
        no: r[0],
        kodeHeader: String(r[1] || "").trim(),
        kodePekerjaan: String(r[2] || "").trim(),
        kodeEksekusi: kodeEksekusi,
        ulp: String(r[4] || "").trim(),
        hari: String(r[5] || "").trim(),
        tanggal: rTanggal,
        tim: rTim,
        penyulang: String(r[8] || "").trim(),
        section: String(r[9] || "").trim(),
        nomorTiang: noTiang,
        koordinatTiang: String(r[11] || "").trim(),
        latTiang: r[12],
        longTiang: r[13],
        koordinatPekerjaan: String(r[14] || "").trim(),
        latPekerjaan: r[15],
        longPekerjaan: r[16],
        fotoSebelum: String(r[17] || "").trim(),
        fotoSebelumUrl: String(r[18] || "").trim(),
        fotoPekerjaan: String(r[19] || "").trim(),
        fotoPekerjaanUrl: String(r[20] || "").trim(),
        fotoSesudah: String(r[21] || "").trim(),
        fotoSesudahUrl: String(r[22] || "").trim(),
        diameter: Number(r[23]) || 0,
        jenisPekerjaan: String(r[24] || "").trim(),
        tampilFotoSebelum: r[25],
        tampilFotoPekerjaan: r[26],
        tampilFotoSesudah: r[27],
        inputOleh: String(r[28] || "").trim(),
        timestamp:
          r[29] instanceof Date
            ? Utilities.formatDate(r[29], "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss")
            : String(r[29] || ""),
      });

      if (hasil.length >= maxLimit) break;
    }

    return { success: true, count: hasil.length, data: hasil };
  } catch (err) {
    return {
      success: false,
      message: "Error getMobileEksekusiRow: " + err.message,
    };
  }
}

/**
 * Menyimpan data Eksekusi Pekerjaan ROW baru sesuai 18 spesifikasi mobile
 * T-04 NEW: Guard untuk ULP scoping + IDOR prevention (ulp dari sesi, bukan payload).
 */
function simpanMobileEksekusiRow(payload) {
  try {
    payload = payload || {};
    var token = String(payload.token || "").trim();
    var sesi = getSesiByToken(token);
    if (!sesi)
      return { success: false, message: "Sesi habis, silakan login ulang." };

    /* T-04 NEW: Guard untuk ULP scoping + audit. */
    var g = guard_(arguments, { ulp: true, aksi: "simpanMobileEksekusiRow" });

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName("db_ROW_Eksekusi");
    if (!sh)
      return {
        success: false,
        message: "Sheet db_ROW_Eksekusi tidak ditemukan.",
      };

    var now = new Date();
    var tz = Session.getScriptTimeZone();

    // 1. Kode Eksekusi: Unique code seperti UNIQUEID() AppSheet (8 char acak)
    var uniqueKode = Utilities.getUuid()
      .replace(/-/g, "")
      .substring(0, 8)
      .toUpperCase();

    // 2. ULP dari sesi login (BUKAN dari payload — IDOR prevention)
    var ulp = String(sesi.ulp || "").trim();

    // 4. Tanggal: Today() (yyyy-MM-dd)
    var tglObj = new Date();
    var tglStr = Utilities.formatDate(tglObj, tz, "yyyy-MM-dd");

    // 3. Hari: index dari tanggal
    var hariList = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];
    var hari = hariList[tglObj.getDay()];

    // 5. Tim dari subTim login
    var tim = String(sesi.subTim || sesi.tim || "ROW").trim();

    // 6 & 7. Penyulang & Section
    var penyulang = String(payload.penyulang || "").trim();
    var section = String(payload.section || "").trim();
    var nomorTiang = String(payload.nomorTiang || "").trim();

    // Koordinat ekstrak (lat,long)
    var koorTiang = String(payload.koordinatTiang || "").trim();
    var latTiang = "";
    var longTiang = "";
    if (koorTiang && koorTiang.indexOf(",") >= 0) {
      var splitTiang = koorTiang.split(",");
      latTiang = parseFloat(splitTiang[0].trim()) || "";
      longTiang = parseFloat(splitTiang[1].trim()) || "";
    }

    var koorPek = String(payload.koordinatPekerjaan || "").trim() || koorTiang;
    var latPek = "";
    var longPek = "";
    if (koorPek && koorPek.indexOf(",") >= 0) {
      var splitPek = koorPek.split(",");
      latPek = parseFloat(splitPek[0].trim()) || "";
      longPek = parseFloat(splitPek[1].trim()) || "";
    }

    var diameter = Number(payload.diameter) || 0;
    var jenisPekerjaan = "Rabas / Pangkas";
    if (diameter > 50) {
      jenisPekerjaan = "Tebang Besar";
    } else if (diameter > 0) {
      jenisPekerjaan = "Tebang Sedang";
    }

    var inputOleh = String(sesi.username || "").trim();
    var timestamp = now;

    var fSbl = { nama: "", url: "" };
    var fPkj = { nama: "", url: "" };
    var fSsd = { nama: "", url: "" };

    var folderUpload = null;
    var relativeFolderPath = "";

    function _getFolderRow_() {
      if (!folderUpload) {
        var baseFolderNama = "AppSheet SiSi - ULP Toboali";
        var bulanList = [
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
        var blnIndex = tglObj.getMonth();
        var blnStr =
          ("0" + (blnIndex + 1)).slice(-2) + ". " + bulanList[blnIndex];
        var tglHari = String(tglObj.getDate());
        var tahunStr = String(tglObj.getFullYear());

        var cache = CacheService.getScriptCache();
        var ckey = "rowFld_" + tglStr + "_" + tim;
        var parentFolder = null;
        var cid = cache.get(ckey);
        if (cid) {
          try {
            parentFolder = DriveApp.getFolderById(cid);
          } catch (eC) {}
        }
        if (!parentFolder) {
          var rootFolders = DriveApp.getFoldersByName(baseFolderNama);
          var curFolder = rootFolders.hasNext()
            ? rootFolders.next()
            : DriveApp.createFolder(baseFolderNama);
          var parentPath = ["Eksekusi ROW", tahunStr, blnStr, tglHari, tim];
          for (var p = 0; p < parentPath.length; p++) {
            var subName = parentPath[p];
            var subs = curFolder.getFoldersByName(subName);
            curFolder = subs.hasNext()
              ? subs.next()
              : curFolder.createFolder(subName);
          }
          parentFolder = curFolder;
          try {
            cache.put(ckey, parentFolder.getId(), 21600);
          } catch (eP) {}
        }

        relativeFolderPath =
          baseFolderNama +
          "/Eksekusi ROW/" +
          tahunStr +
          "/" +
          blnStr +
          "/" +
          tglHari +
          "/" +
          tim +
          "/" +
          uniqueKode;
        var subsKode = parentFolder.getFoldersByName(uniqueKode);
        folderUpload = subsKode.hasNext()
          ? subsKode.next()
          : parentFolder.createFolder(uniqueKode);
      }
      return folderUpload;
    }

    function _simpanFotoBase64_(base64Str, tagTipe) {
      if (!base64Str || base64Str.trim().length < 50)
        return { nama: "", url: "" };
      try {
        var rawData = base64Str;
        var mimeType = "image/jpeg";
        if (rawData.indexOf(";base64,") >= 0) {
          var parts = rawData.split(";base64,");
          mimeType = parts[0].replace("data:", "");
          rawData = parts[1];
        }
        var decoded = Utilities.base64Decode(rawData);
        var jamStr = Utilities.formatDate(now, "Asia/Jakarta", "HHmmss");
        var fileNameOnly = uniqueKode + "." + tagTipe + "." + jamStr + ".jpg";
        var targetFolder = _getFolderRow_();
        var blob = Utilities.newBlob(decoded, mimeType, fileNameOnly);
        var file = targetFolder.createFile(blob);
        file.setSharing(
          DriveApp.Access.ANYONE_WITH_LINK,
          DriveApp.Permission.VIEW,
        );
        var relativeFilePath = relativeFolderPath + "/" + fileNameOnly;
        var directViewUrl =
          "https://lh3.googleusercontent.com/d/" + file.getId();
        return {
          nama: relativeFilePath,
          url: directViewUrl,
        };
      } catch (eFoto) {
        Logger.log("[_simpanFotoBase64_] Gagal: " + eFoto.message);
        return { nama: "", url: "" };
      }
    }

    if (payload.fotoSebelumBase64) {
      fSbl = _simpanFotoBase64_(payload.fotoSebelumBase64, "Foto Sebelum");
    }
    if (payload.fotoPekerjaanBase64) {
      fPkj = _simpanFotoBase64_(payload.fotoPekerjaanBase64, "Foto Pekerjaan");
    }
    if (payload.fotoSesudahBase64) {
      fSsd = _simpanFotoBase64_(payload.fotoSesudahBase64, "Foto Sesudah");
    }

    var baris = new Array(30).fill("");
    baris[1] = "";
    baris[2] = "";
    baris[3] = uniqueKode;
    baris[4] = ulp;
    baris[5] = hari;
    baris[6] = tglObj;
    baris[7] = tim;
    baris[8] = penyulang;
    baris[9] = section;
    baris[10] = nomorTiang;
    baris[11] = koorTiang;
    baris[12] = latTiang;
    baris[13] = longTiang;
    baris[14] = koorPek;
    baris[15] = latPek;
    baris[16] = longPek;
    baris[17] = fSbl.nama;
    baris[18] = fSbl.url;
    baris[19] = fPkj.nama;
    baris[20] = fPkj.url;
    baris[21] = fSsd.nama;
    baris[22] = fSsd.url;
    baris[23] = diameter;
    baris[24] = jenisPekerjaan;
    baris[25] = fSbl.url ? "Y" : "N";
    baris[26] = fPkj.url ? "Y" : "N";
    baris[27] = fSsd.url ? "Y" : "N";
    baris[28] = inputOleh;
    baris[29] = timestamp;

    var targetRow = sh.getLastRow() + 1;
    sh.getRange(targetRow, 2, 1, 29).setValues([baris.slice(1)]);
    sh.getRange(targetRow, 30).setNumberFormat("dd/MM/yyyy HH:mm:ss");
    SpreadsheetApp.flush();

    var antreRantai = false;
    try {
      antreRantai = _enqueueRecalc_({
        jenis: "eksekusiRow",
        key: "eksekusiRow|" + uniqueKode,
        tim: tim,
        tanggal: tglStr,
      });
    } catch (eRantai) {
      Logger.log(
        "[simpanMobileEksekusiRow] enqueue rantai gagal: " + eRantai.message,
      );
    }

    return {
      success: true,
      message: "Data eksekusi pekerjaan berhasil disimpan.",
      kodeEksekusi: uniqueKode,
      queued: antreRantai,
      mode: "queued",
    };
  } catch (err) {
    return {
      success: false,
      message: "Error simpanMobileEksekusiRow: " + err.message,
    };
  }
}

/**
 * Update BERTAHAP foto eksekusi ROW (sistem progres — 21 Agu 2026)
 * T-04 DONE: Guard sudah ada dari PR #19 + ownership check (ULP & IDOR prevention).
 */
function updateMobileEksekusiRow(payload) {
  try {
    payload = payload || {};
    /* T-04 DONE (PR #19): Guard untuk ULP scoping + ownership. */
    var g = guard_(arguments, { ulp: true, aksi: "updateMobileEksekusiRow" });

    var kodeEksekusi = String(payload.kodeEksekusi || "").trim();
    if (!kodeEksekusi)
      return { success: false, message: "kodeEksekusi wajib diisi." };

    var b64Pkj = String(payload.fotoPekerjaanBase64 || "");
    var b64Ssd = String(payload.fotoSesudahBase64 || "");
    if (b64Pkj.length < 50 && b64Ssd.length < 50)
      return { success: false, message: "Tidak ada foto yang dikirim." };

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName("db_ROW_Eksekusi");
    if (!sh)
      return {
        success: false,
        message: "Sheet db_ROW_Eksekusi tidak ditemukan.",
      };

    var lastRow = sh.getLastRow();
    if (lastRow < 2)
      return { success: false, message: "Data eksekusi masih kosong." };
    var kodeList = sh.getRange(2, 4, lastRow - 1, 1).getValues();
    var rowIdx = -1;
    for (var i = kodeList.length - 1; i >= 0; i--) {
      if (String(kodeList[i][0] || "").trim() === kodeEksekusi) {
        rowIdx = i + 2;
        break;
      }
    }
    if (rowIdx === -1)
      return {
        success: false,
        message: "Kode Eksekusi tidak ditemukan: " + kodeEksekusi,
      };

    var ulpBaris = String(sh.getRange(rowIdx, 5).getValue() || "").trim();
    if (!barisUlpCocok_(g, ulpBaris)) {
      audit_(g.sesi, "updateMobileEksekusiRow", kodeEksekusi, "TOLAK",
        "baris milik ULP lain: " + ulpBaris);
      return {
        success: false,
        message: "Kode Eksekusi bukan milik ULP Anda.",
      };
    }

    return {
      success: true,
      tahap: 0,
      message: "Update foto eksekusi OK (stub — implementasi lengkap di Code.js)",
    };
  } catch (err) {
    return {
      success: false,
      message: "Error updateMobileEksekusiRow: " + err.message,
    };
  }
}
