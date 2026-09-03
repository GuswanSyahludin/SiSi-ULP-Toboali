/*
 * Berita Acara: samakan sumber Penyulang dan Section dengan Jadwal Padam,
 * perbaikan token-argument compatibility untuk fungsi Switching & BA.
 *
 * SisiRun di frontend otomatis menyisipkan token sesi sebagai argumen pertama.
 * File ini memastikan getNomorGarduBerikutnya, getLinkWaBeritaAcara,
 * generatePdfBaSwitching, dan generatePdfBaPengoperasian menerima token
 * dengan aman tanpa error 'idBA wajib diisi'.
 */

// --- 1. getPenyulangDanSection ---
function getPenyulangDanSection(token) {
  try {
    var sesi = null;
    var tokenText = String(token || "").trim();
    if (tokenText && typeof getSesiByToken === "function") {
      sesi = getSesiByToken(tokenText);
      if (!sesi) {
        return {
          ok: false,
          penyulangList: [],
          sectionByPenyulang: {},
          message: "Sesi habis atau tidak valid. Silakan login ulang.",
        };
      }
    }

    if (typeof getJadwalPadamMaster !== "function") {
      return {
        ok: false,
        penyulangList: [],
        sectionByPenyulang: {},
        message: "Master Jadwal Padam belum tersedia.",
      };
    }

    var ulp = sesi ? String(sesi.ulp || "").trim() : "";
    var master = getJadwalPadamMaster({ ulp: ulp });
    if (!master || !master.ok) {
      return {
        ok: false,
        penyulangList: [],
        sectionByPenyulang: {},
        message: (master && master.message) || "Gagal memuat Master Daerah Padam.",
      };
    }

    var penyulangList = [];
    var sectionByPenyulang = {};
    var namaPenyulangByKey = {};
    var sectionSeenByKey = {};

    function norm(value) {
      return String(value == null ? "" : value)
        .normalize("NFKC")
        .replace(/\u00a0/g, " ")
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase();
    }

    (master.rows || []).forEach(function (row) {
      var penyulang = String((row && row.penyulang) || "")
        .replace(/\u00a0/g, " ")
        .trim()
        .replace(/\s+/g, " ");
      var section = String((row && row.section) || "")
        .replace(/\u00a0/g, " ")
        .trim()
        .replace(/\s+/g, " ");
      var pKey = norm(penyulang);
      var sKey = norm(section);
      if (!pKey || !sKey) return;

      if (!namaPenyulangByKey[pKey]) {
        namaPenyulangByKey[pKey] = penyulang;
        penyulangList.push(penyulang);
        sectionByPenyulang[penyulang] = [];
        sectionSeenByKey[pKey] = {};
      }

      if (!sectionSeenByKey[pKey][sKey]) {
        sectionSeenByKey[pKey][sKey] = true;
        sectionByPenyulang[namaPenyulangByKey[pKey]].push(section);
      }
    });

    penyulangList.sort(function (a, b) {
      return a.localeCompare(b, "id", { sensitivity: "base" });
    });
    penyulangList.forEach(function (penyulang) {
      sectionByPenyulang[penyulang].sort(function (a, b) {
        return a.localeCompare(b, "id", { sensitivity: "base" });
      });
    });

    return {
      ok: true,
      penyulangList: penyulangList,
      sectionByPenyulang: sectionByPenyulang,
      source: "Master Daerah Padam",
    };
  } catch (error) {
    return {
      ok: false,
      penyulangList: [],
      sectionByPenyulang: {},
      message: "Gagal memuat Penyulang dan Section: " + error.message,
    };
  }
}

// --- 2. getNomorGarduBerikutnya ---
function getNomorGarduBerikutnya(tokenOrKode, kodeGardu) {
  try {
    var kode;

    if (arguments.length >= 2) {
      var token = String(tokenOrKode || "").trim();
      if (!token || !getSesiByToken(token)) {
        return {
          ok: false,
          message: "Sesi habis atau tidak valid. Silakan login ulang.",
        };
      }
      kode = String(kodeGardu || "").trim().toUpperCase();
    } else {
      kode = String(tokenOrKode || "").trim().toUpperCase();
    }

    var daftarKode =
      typeof BA_KODE_GARDU !== "undefined" && BA_KODE_GARDU.length
        ? BA_KODE_GARDU
        : ["TB", "PY", "TL", "PG"];

    if (!kode) {
      return {
        ok: false,
        message: "Kode gardu wajib dipilih (" + daftarKode.join(" / ") + ").",
      };
    }
    if (daftarKode.indexOf(kode) === -1) {
      return {
        ok: false,
        message: 'Kode gardu "' + kode + '" tidak dikenal. Pilih: ' + daftarKode.join(", ") + ".",
      };
    }

    var maxMaster = _baMaxNomorGardu_(
      BA_MASTER_GARDU.spreadsheetId,
      BA_MASTER_GARDU.sheetName,
      kode,
    );
    var maxRekap = _baMaxNomorGardu_(
      BA_SOURCE.spreadsheetId,
      BA_SOURCE.sheetName,
      kode,
    );

    var terakhir = Math.max(maxMaster, maxRekap);
    var sumber =
      maxRekap > maxMaster
        ? "Rekap Gardu"
        : maxMaster >= 0
          ? "Master Gardu"
          : "Baru";
    var nextNum = (terakhir < 0 ? 0 : terakhir) + 1;

    return {
      ok: true,
      kodeGardu: kode,
      nomorGardu: _baFormatNomorGardu_(kode, nextNum),
      nomorGarduTerakhir:
        terakhir < 0 ? "" : _baFormatNomorGardu_(kode, terakhir),
      sumber: sumber,
    };
  } catch (error) {
    return {
      ok: false,
      message: "Gagal mengambil nomor gardu berikutnya: " + error.message,
    };
  }
}

// --- 3. getLinkWaBeritaAcara (Support Gardu & Switching + Token SisiRun) ---
function getLinkWaBeritaAcara(tokenOrId, idBA) {
  try {
    var target = "";
    if (arguments.length >= 2 && idBA) {
      var token = String(tokenOrId || "").trim();
      if (!token || !getSesiByToken(token)) {
        return { ok: false, message: "Sesi habis atau tidak valid. Silakan login ulang." };
      }
      target = String(idBA || "").trim();
    } else {
      target = String(tokenOrId || "").trim();
    }

    if (!target) return { ok: false, message: "idBA wajib diisi." };

    // Cek apakah data ada di Rekap Switching dulu jika target diawali SW atau cari di Rekap Switching
    var swRow = _swCariBarisDanDataSwitching_(target);
    if (swRow && swRow.ok) {
      return _buildLinkWaSwitching_(swRow.row);
    }

    // Jika bukan switching, jalankan logika bawaan Gardu (Rekap Gardu)
    return _buildLinkWaGardu_(target);
  } catch (error) {
    return { ok: false, message: "Gagal membuat link WA: " + error.message };
  }
}

function _swCariBarisDanDataSwitching_(idBA) {
  try {
    if (typeof SW_SOURCE === "undefined") return { ok: false };
    var ss = SpreadsheetApp.openById(SW_SOURCE.spreadsheetId);
    var sh = _baResolveSheet_(ss, SW_SOURCE.sheetName);
    if (!sh) return { ok: false };
    var values = sh.getDataRange().getValues();
    var idxIdBA = _swColToIndex_(SW_COL.idBA);
    var key = _baNormHeader_(idBA);
    for (var r = 0; r < values.length; r++) {
      if (_baNormHeader_(String(values[r][idxIdBA] || "")) === key) {
        return { ok: true, row: values[r] };
      }
    }
    return { ok: false };
  } catch (e) {
    return { ok: false };
  }
}

function _buildLinkWaSwitching_(row) {
  function _sw(colLetter) {
    var idx = _swColToIndex_(colLetter);
    return idx >= 0 && idx < row.length ? String(row[idx] == null ? "" : row[idx]).trim() : "";
  }
  function _tgl(colLetter) {
    var iso = _baDate_(_sw(colLetter));
    if (!iso) return "";
    var p = iso.split("-");
    return String(parseInt(p[2], 10)) + " " + _baBulanIndonesia_(Number(p[1])) + " " + p[0];
  }

  var NL = "\n";
  var jenis = _sw(SW_COL.jenisPekerjaan) || "Switching";
  var nama = _sw(SW_COL.namaSwitching) || "-";
  var linkBa = _sw(SW_COL.linkBaTtd) || "BA belum diupload";
  var tglKerja = _tgl(SW_COL.tanggalPekerjaan) || _tgl(SW_COL.tanggalBA);

  var text = "*" + jenis.toUpperCase() + " ULP TOBOALI*" + NL + NL
    + "Tanggal : " + tglKerja + NL + NL
    + "*DATA SWITCHING*" + NL
    + "Nama Switching : " + nama + NL
    + "Jenis Switching : " + _sw(SW_COL.jenisSwitching) + NL
    + "Merk : " + _sw(SW_COL.merk) + NL
    + "Tipe : " + _sw(SW_COL.tipe) + NL
    + "Nomor Seri : " + _sw(SW_COL.nomorSeri) + NL
    + "Penyulang : " + _sw(SW_COL.penyulang) + NL
    + "Section : " + _sw(SW_COL.section) + NL
    + "Koordinat : " + _sw(SW_COL.koordinat) + NL;

  var jl = jenis.toLowerCase();
  if (jl.indexOf("penggantian") >= 0 || jl.indexOf("relokasi") >= 0) {
    text += NL + "*DATA SWITCHING SESUDAH*" + NL
      + "Nama Switching : " + _sw(SW_COL.namaSwitchingSesudah) + NL
      + "Merk : " + _sw(SW_COL.merkSesudah) + NL
      + "Tipe : " + _sw(SW_COL.tipeSesudah) + NL
      + "Nomor Seri : " + _sw(SW_COL.nomorSeriSesudah) + NL
      + "Asal Switching : " + _sw(SW_COL.asalSwitching) + NL;
  }

  if (_sw(SW_COL.keteranganTambahan)) {
    text += NL + "Keterangan : " + _sw(SW_COL.keteranganTambahan) + NL;
  }

  text += NL + "Link BA : " + linkBa;

  return {
    ok: true,
    waUrl: "https://api.whatsapp.com/send?text=" + encodeURIComponent(text),
    text: text,
    jenis: jenis,
    nomorGardu: nama,
  };
}

function _buildLinkWaGardu_(target) {
  var ss = SpreadsheetApp.openById(BA_SOURCE.spreadsheetId);
  var sh = ss.getSheetByName(BA_SOURCE.sheetName);
  if (!sh) return { ok: false, message: "Sheet Rekap Gardu tidak ditemukan." };
  var values = sh.getDataRange().getValues();
  var found = _baFindHeader_(values);
  if (!found) return { ok: false, message: "Header Rekap Gardu belum dikenali." };
  var rowIndex = _baCariBarisNomorBA_(sh, found, target);
  if (rowIndex < 0) return { ok: false, message: 'Baris BA "' + target + '" tidak ditemukan.' };
  var row = values[rowIndex];

  function _c(letter) {
    return _baText_(row, _baColLetterToIndex_(letter));
  }
  function _tgl(letter) {
    var iso = _baDate_(_baCell_(row, _baColLetterToIndex_(letter)));
    if (!iso) return "";
    var p = iso.split("-");
    return String(parseInt(p[2], 10)) + " " + _baBulanIndonesia_(Number(p[1])) + " " + p[0];
  }

  var NL = "\n";
  var jenis = _c("E");
  var nomorGardu = _c("B");
  var jl = jenis.toLowerCase();
  var linkBa = _c("CG") || "BA belum diupload";
  var text = "";

  if (jl.indexOf("pengoperasian") >= 0) {
    text = "*" + jenis.toUpperCase() + " ULP TOBOALI*" + NL + NL
      + "Tanggal : " + _tgl("D") + NL + NL
      + "*DATA TRAFO*" + NL
      + "Nomor Gardu : " + nomorGardu + NL
      + "Kapasitas : " + _c("F") + "kVA" + NL
      + "Merk : " + _c("G") + NL
      + "Nomor Seri : " + _c("H") + NL
      + "Tahun : " + _c("I") + NL
      + "Konstruksi : " + _c("J") + NL
      + "Alamat : " + _c("K") + NL
      + "Penyulang : " + _c("L") + NL
      + "Section : " + _c("M") + NL
      + "Koordinat : " + _c("Q") + ", " + _c("R") + NL
      + "Kepemilikan : " + _c("T") + NL
      + "OwnerID : " + _c("U") + NL
      + "External Reference : " + _c("V") + NL
      + "Perluasan SUTM : " + _c("W") + "kmS" + NL
      + "Vendor Pelaksana : " + _c("X") + NL + NL
      + "*DATA PHB-TR*" + NL
      + "Merk : " + _c("Z") + NL
      + "Nomor Seri : " + _c("Y") + NL
      + "Tahun : " + _c("AA") + NL
      + "Jurusan : " + _c("S") + NL + NL
      + "Link BA : " + linkBa;
  } else if (jl.indexOf("penggantian") >= 0) {
    text = "*Manajemen Trafo " + _tgl("D") + " ULP Toboali*" + NL
      + "Nomor Gardu : " + nomorGardu + NL + NL
      + "*Dibongkar*" + NL
      + "Kapasitas : " + _c("F") + "kVA" + NL
      + "Merk : " + _c("G") + NL
      + "Nomor Seri " + _c("H") + " Th " + _c("I") + NL
      + "Alamat : " + _c("K") + NL + NL
      + "*Dipasang*" + NL
      + "Kapasitas : " + _c("AK") + "kVA" + NL
      + "Merk : " + _c("AL") + NL
      + "Nomor Seri : " + _c("AM") + " Th " + _c("AN") + NL
      + "Alamat : " + _c("K") + NL
      + "Asal Trafo : " + _c("AO") + NL + NL
      + "Link BA : " + linkBa;
  } else if (jl.indexOf("bongkar") >= 0) {
    text = "*" + jenis + " ULP Toboali*" + NL + NL
      + "Nomor Gardu : " + nomorGardu + NL
      + "Tanggal : " + _tgl("D") + NL
      + "Alamat : " + _c("K") + NL
      + "Kapasitas : " + _c("F") + "kVA" + NL
      + "Merk : " + _c("G") + NL
      + "Nomor Seri : " + _c("H") + NL
      + "Tahun : " + _c("I") + NL + NL
      + "Link BA : " + linkBa;
  } else {
    text = "*" + jenis.toUpperCase() + " ULP TOBOALI*" + NL + NL
      + "Nomor Gardu : " + nomorGardu + NL
      + "Tanggal : " + _tgl("D") + NL
      + "Alamat : " + _c("K") + NL
      + "Link BA : " + linkBa;
  }

  return {
    ok: true,
    waUrl: "https://api.whatsapp.com/send?text=" + encodeURIComponent(text),
    text: text,
    jenis: jenis,
    nomorGardu: nomorGardu,
  };
}

// --- 4. generatePdfBaSwitching & generatePdfBaPengoperasian (Support Token SisiRun) ---
function generatePdfBaSwitching(tokenOrId, idBA) {
  var id = arguments.length >= 2 && idBA ? String(idBA).trim() : String(tokenOrId || "").trim();
  if (!id) return { ok: false, message: "idBA wajib diisi." };

  try {
    var ss = SpreadsheetApp.openById(SW_SOURCE.spreadsheetId);
    var sh = _baResolveSheet_(ss, SW_SOURCE.sheetName);
    if (!sh) return { ok: false, message: "Sheet Rekap Switching tidak ditemukan." };

    var values = sh.getDataRange().getValues();
    var idxIdBA = _swColToIndex_(SW_COL.idBA);
    var key = _baNormHeader_(id);
    var foundRow = -1;
    for (var r = 0; r < values.length; r++) {
      if (_baNormHeader_(String(values[r][idxIdBA] || "")) === key) {
        foundRow = r + 1;
        break;
      }
    }
    if (foundRow < 0) return { ok: false, message: 'idBA Switching "' + id + '" tidak ditemukan.' };

    var oldFileId = String(values[foundRow - 1][_swColToIndex_(SW_COL.fileId)] || "").trim();
    sh.getRange(foundRow, _swColToIndex_(SW_COL.statusPdf) + 1).setValue("Proses");
    SpreadsheetApp.flush();

    var payload = { idBA: id, secret: BA_PDF_ENGINE.secret };
    if (oldFileId) payload.oldFileId = oldFileId;

    var resp = UrlFetchApp.fetch(BA_PDF_ENGINE.url + "/ba/switching", {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });

    var resJson = {};
    try { resJson = JSON.parse(resp.getContentText()); } catch (errParse) {
      return { ok: false, message: "Gagal membaca respons engine PDF: " + resp.getContentText() };
    }

    if (!resJson || !resJson.ok) {
      sh.getRange(foundRow, _swColToIndex_(SW_COL.statusPdf) + 1).setValue("Gagal");
      SpreadsheetApp.flush();
      return { ok: false, message: (resJson && resJson.message) || "Engine PDF gagal memproses Switching." };
    }

    sh.getRange(foundRow, _swColToIndex_(SW_COL.filePdfUrl) + 1).setValue(resJson.url || "");
    sh.getRange(foundRow, _swColToIndex_(SW_COL.fileId) + 1).setValue(resJson.fileId || "");
    sh.getRange(foundRow, _swColToIndex_(SW_COL.statusPdf) + 1).setValue("Selesai");
    sh.getRange(foundRow, _swColToIndex_(SW_COL.waktuSelesai) + 1).setValue(resJson.selesai || _baNow_());
    SpreadsheetApp.flush();

    return {
      ok: true,
      idBA: id,
      fileId: resJson.fileId,
      url: resJson.url,
      fileName: resJson.fileName,
    };
  } catch (error) {
    return { ok: false, message: "Generate PDF Switching gagal: " + error.message };
  }
}

function generatePdfBaPengoperasian(tokenOrId, idBA) {
  var id = arguments.length >= 2 && idBA ? String(idBA).trim() : String(tokenOrId || "").trim();
  if (!id) return { ok: false, message: "idBA wajib diisi." };

  try {
    var ss = SpreadsheetApp.openById(BA_SOURCE.spreadsheetId);
    var sh = ss.getSheetByName(BA_SOURCE.sheetName);
    if (!sh) return { ok: false, message: "Sheet Rekap Gardu tidak ditemukan." };
    var values = sh.getDataRange().getValues();
    var found = _baFindHeader_(values);
    if (!found) return { ok: false, message: "Header Rekap Gardu belum dikenali." };

    var rowIndex = _baCariBarisNomorBA_(sh, found, id);
    if (rowIndex < 0) return { ok: false, message: 'Baris BA "' + id + '" tidak ditemukan.' };
    var sheetRow = rowIndex + 1;
    var row = values[rowIndex];

    var idxJenis = _baPickIndex_(found.map, ["Jenis Pekerjaan", "Pekerjaan"]);
    var jenis = idxJenis >= 0 ? String(row[idxJenis] || "").toLowerCase() : "";

    var endpoint = "/ba/pengoperasian";
    if (jenis.indexOf("penggantian") >= 0) endpoint = "/ba/penggantian";
    else if (jenis.indexOf("pemeriksaan") >= 0) endpoint = "/ba/pemeriksaan-trafo";

    var oldFileId = _baBacaFileIdTetap_(id);
    _baTulisHasilPdf_(id, { status: "Proses" });
    SpreadsheetApp.flush();

    var payload = { idBA: id, secret: BA_PDF_ENGINE.secret };
    if (oldFileId) payload.oldFileId = oldFileId;

    var resp = UrlFetchApp.fetch(BA_PDF_ENGINE.url + endpoint, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });

    var resJson = {};
    try { resJson = JSON.parse(resp.getContentText()); } catch (errParse) {
      return { ok: false, message: "Gagal membaca respons engine PDF: " + resp.getContentText() };
    }

    if (!resJson || !resJson.ok) {
      _baTulisHasilPdf_(id, { status: "Gagal" });
      SpreadsheetApp.flush();
      return { ok: false, message: (resJson && resJson.message) || "Engine PDF gagal memproses Gardu." };
    }

    _baTulisHasilPdf_(id, {
      fileUrl: resJson.url || "",
      fileId: resJson.fileId || "",
      status: "Selesai",
      selesai: resJson.selesai || _baNow_(),
    });
    SpreadsheetApp.flush();

    return {
      ok: true,
      idBA: id,
      fileId: resJson.fileId,
      url: resJson.url,
      fileName: resJson.fileName,
    };
  } catch (error) {
    return { ok: false, message: "Generate PDF Gardu gagal: " + error.message };
  }
}
