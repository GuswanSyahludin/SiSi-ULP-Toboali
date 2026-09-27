/* #################################################################
   Tek-LaporanUP3.js — SiSi ULP Toboali
   Generator "Laporan Harian Keandalan Distribusi" (format UP3).
   Output: 1 teks WA per ULP per tanggal (siap kirim).
   Refactored from Tek-LapUP3UIWHarian.js (27 Sep 2026)
   #################################################################

   SUMBER DATA (per ULP, tanggal laporan):
     B. ROW       -> db_ROW_Realisasi   (Rabas; Tebang = Sedang + Besar)
     C. Hartek    -> db_Hartek_PenyulangGardu (Jaringan = Jumlah Gawang; Gardu = jumlah baris)
     D. Inspeksi  -> db_InsJar_Realisasi (Jaringan), db_InsDu_Realisasi (Gardu)
     F. P0 Yantek -> db_Yandal_P0 (ROW Rabas/Pangkas, Shift 1)
     A. Gangguan  -> Tek-Gangguan.gs
     E. C4A       -> input MANUAL
     G. Tindak L. -> input MANUAL
   ################################################################# */

var LAP_UP3 = {
  ROW_RLZ: "db_ROW_Realisasi",
  HTK_PG: "db_Hartek_PenyulangGardu",
  INSJAR: "db_InsJar_Realisasi",
  INSDU: "db_InsDu_Realisasi",
  YANDAL_P0: "db_Yandal_P0",
  YANDAL_SHIFT: "db_Yandal_Shift",
  HEADER: "db_Global_Header",
};

var LAP_TARGET_ROW = { rabasPerHari: 20, tebangPerHari: 6 };
var LAP_TARGET_INSDU_GARDU = 5;

var _LAP_HARI = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];
var _LAP_BULAN = [
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

function _lapTglIndo(tglIso) {
  var d = new Date(tglIso + "T00:00:00");
  return (
    _LAP_HARI[d.getDay()] +
    ", " +
    d.getDate() +
    " " +
    _LAP_BULAN[d.getMonth()] +
    " " +
    d.getFullYear()
  );
}

function _lapUlpNama(ulp) {
  return String(ulp || "")
    .trim()
    .replace(/^ULP\s+/i, "");
}

function _lapTglBerikutnya_(tglIso) {
  var d = new Date(tglIso + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return Utilities.formatDate(d, "Asia/Jakarta", "yyyy-MM-dd");
}

function _lapAngka(v, satuan) {
  if (v === null || v === undefined || v === "" || Number(v) === 0)
    return "- " + satuan;
  return v + " " + satuan;
}

function _lapKom(v, satuan) {
  return (Number(v) || 0) + " " + satuan;
}

function _lapPenyBlok(nama, baris) {
  var L = [];
  if (nama) L.push("- Penyulang " + nama);
  L.push("Target / Realisasi");
  for (var i = 0; i < baris.length; i++) {
    var b = baris[i];
    L.push(
      "- " +
        b.label +
        " : " +
        _lapAngka(b.target, b.satuan) +
        " / " +
        _lapAngka(b.rlz, b.satuan),
    );
  }
  return L.join("\n");
}

function _lapBagiTarget(total, n) {
  var out = [];
  if (n <= 0) return out;
  var base = Math.floor(total / n),
    sisa = total - base * n;
  for (var i = 0; i < n; i++) out.push(base + (i < sisa ? 1 : 0));
  return out;
}

function _lapManual(text, withDash) {
  var s = String(text == null ? "" : text).trim();
  if (!s) return withDash ? "- Nihil" : "Nihil";
  return s;
}

function _lapC4A(c4a) {
  if (c4a == null) return "- Nihil";
  if (typeof c4a === "string") {
    var s = c4a.trim();
    return s ? s : "- Nihil";
  }
  var peny = String(c4a.penyulang || "").trim();
  var rlz = String(c4a.realisasi || "").trim();
  var tmn = String(c4a.temuan || "").trim();
  var eks = String(c4a.eksekusi || "").trim();
  if (!peny && !rlz && !tmn && !eks) return "- Nihil";
  var rlzTxt = rlz ? (/km/i.test(rlz) ? rlz : rlz + " kmS") : "-";
  return [
    "Penyulang " + (peny || "-"),
    "- Realisasi : " + rlzTxt,
    "- Temuan : " + (tmn || "-"),
    "- Eksekusi : " + (eks || "-"),
  ].join("\n");
}

function _lapTindakLanjutGangguan(list, tlArr) {
  if (!list || !list.length) return "Nihil";
  tlArr = tlArr || [];
  var blocks = [];
  for (var i = 0; i < list.length; i++) {
    var g = list[i];
    var tl = String(tlArr[i] == null ? "" : tlArr[i]).trim() || "-";
    blocks.push(
      "- Penyulang : " +
        (g.penyulang || "-") +
        "\n" +
        "- Temuan : " +
        (g.temuan || "-") +
        "\n" +
        "- Tindak Lanjut : " +
        tl,
    );
  }
  return blocks.join("\n\n");
}

function _lapUlpMap_(ss) {
  var sh = ss.getSheetByName(LAP_UP3.HEADER),
    H = COL_INS.HEADER,
    map = {};
  if (sh && sh.getLastRow() > 1) {
    var d = sh.getDataRange().getValues();
    for (var i = 1; i < d.length; i++) {
      var k = String(d[i][H.kodeHeader] || "").trim();
      if (k) map[k] = String(d[i][H.ulp] || "").trim();
    }
  }
  return map;
}

function _lapDataROW_(ss, ulp, tglIso) {
  var R = COL_ROW_RLZ;
  var ulpMap = _lapUlpMapDual_(),
    bulan = tglIso.substring(0, 7);
  var hari = {},
    kom = { rabas: 0, tebang: 0 };
  var d = _readSheetDual_(LAP_UP3.ROW_RLZ, R.kodePekerjaan, COL_ROW_RLZ_N);
  for (var i = 0; i < d.length; i++) {
    var kh = String(d[i][R.kodeHeader] || "").trim();
    if ((ulpMap[kh] || "") !== ulp) continue;
    var t = _normTgl(d[i][R.tanggal]);
    if (t.substring(0, 7) !== bulan) continue;
    var rabas = Number(d[i][R.rabas]) || 0;
    var tebang = (Number(d[i][R.sedang]) || 0) + (Number(d[i][R.besar]) || 0);
    kom.rabas += rabas;
    kom.tebang += tebang;
    if (t === tglIso) {
      var p = String(d[i][R.penyulang] || "").trim() || "-";
      if (!hari[p]) hari[p] = { rabas: 0, tebang: 0 };
      hari[p].rabas += rabas;
      hari[p].tebang += tebang;
    }
  }
  return { hari: hari, komulatif: kom };
}

function _lapDataHartek_(ss, ulp, tglIso) {
  var C = COL_HTK.PG;
  var bulan = tglIso.substring(0, 7);
  var hari = {},
    kom = { jaringan: 0, gardu: 0 };
  var d = _readSheetDual_(LAP_UP3.HTK_PG, C.kodePG, C.timeStamp + 1);
  if (d.length) {
    for (var i = 0; i < d.length; i++) {
      if (String(d[i][C.ulp] || "").trim() !== ulp) continue;
      var t = _normTgl(d[i][C.tanggal]);
      if (t.substring(0, 7) !== bulan) continue;
      var jenis = String(d[i][C.jenisPekerjaan] || "")
        .trim()
        .toLowerCase();
      var isJaringan = jenis === "jaringan";
      var isNonTeknik =
        jenis.indexOf("non") >= 0 && jenis.indexOf("teknik") >= 0;
      var p = String(d[i][C.penyulang] || "").trim() || "-";
      if (isJaringan) {
        var gw = Number(d[i][C.jumlahGawang]) || 0;
        kom.jaringan += gw;
        if (t === tglIso) {
          if (!hari[p]) hari[p] = { jaringan: 0, gardu: 0 };
          hari[p].jaringan += gw;
        }
      } else if (!isNonTeknik) {
        kom.gardu += 1;
        if (t === tglIso) {
          if (!hari[p]) hari[p] = { jaringan: 0, gardu: 0 };
          hari[p].gardu += 1;
        }
      }
    }
  }
  return { hari: hari, komulatif: kom };
}

function _lapDataInspeksi_(ss, ulp, tglIso) {
  var ulpMap = _lapUlpMapDual_(),
    bulan = tglIso.substring(0, 7);
  var hari = {},
    kom = { jaringan: 0, gardu: 0 };
  function _ensure(p) {
    if (!hari[p]) hari[p] = { jaringan: 0, gardu: 0 };
    return hari[p];
  }

  var RJ = COL_INS.REALISASI;
  var dj = _readSheetDual_(
    LAP_UP3.INSJAR,
    RJ.kodePekerjaanPeny,
    RJ.timestamp + 1,
  );
  if (dj.length) {
    for (var i = 0; i < dj.length; i++) {
      var kh = String(dj[i][RJ.kodeHeader] || "").trim();
      if ((ulpMap[kh] || "") !== ulp) continue;
      var t = _normTgl(dj[i][RJ.tanggal]);
      if (t.substring(0, 7) !== bulan) continue;
      var gw = Number(dj[i][RJ.totalTiang]) || 0;
      var isTier2 =
        String(dj[i][RJ.tier] || "")
          .trim()
          .toLowerCase()
          .indexOf("tier 2") >= 0;
      var effDay = isTier2 ? _lapTglBerikutnya_(t) : t;
      if (effDay.substring(0, 7) === bulan && effDay <= tglIso)
        kom.jaringan += gw;
      if (effDay === tglIso)
        _ensure(String(dj[i][RJ.penyulang] || "").trim() || "-").jaringan += gw;
    }
  }

  var RG = COL_INSDU.REALISASI;
  var dg = _readSheetDual_(
    LAP_UP3.INSDU,
    RG.kodePekerjaanGardu,
    RG.timestamp + 1,
  );
  if (dg.length) {
    for (var k = 0; k < dg.length; k++) {
      var kh2 = String(dg[k][RG.kodeHeader] || "").trim();
      if ((ulpMap[kh2] || "") !== ulp) continue;
      var t2 = _normTgl(dg[k][RG.tanggal]);
      if (t2.substring(0, 7) !== bulan) continue;
      if (
        !String(dg[k][RG.nomorGardu] || "").trim() &&
        !String(dg[k][RG.kodePekerjaanGardu] || "").trim()
      )
        continue;
      kom.gardu += 1;
      if (t2 === tglIso)
        _ensure(String(dg[k][RG.penyulang] || "").trim() || "-").gardu += 1;
    }
  }
  return { hari: hari, komulatif: kom };
}

function _lapP0KriteriaOk_(nama) {
  var s = String(nama || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  if (s.indexOf("row") < 0) return false;
  return s.indexOf("rabas") >= 0 || s.indexOf("pangkas") >= 0;
}

function _lapShiftTagMap_(ss) {
  var sh = ss.getSheetByName(LAP_UP3.YANDAL_SHIFT),
    S = COL_YANDAL_SHIFT,
    map = {};
  if (sh && sh.getLastRow() > 1) {
    var d = sh.getDataRange().getValues();
    for (var i = 1; i < d.length; i++) {
      var k = String(d[i][S.kodeShift] || "").trim();
      if (k) map[k] = _shiftTagY_(d[i][S.shift]);
    }
  }
  return map;
}

function _lapShiftTagDariP0_(rowP0, shiftMap) {
  var ks = String(rowP0[COL_P0.kodeShift] || "").trim();
  if (ks && shiftMap[ks]) return shiftMap[ks];
  var up = ks.toUpperCase();
  if (
    up.indexOf("SHF1") >= 0 ||
    up.indexOf("SHIFT-1") >= 0 ||
    up.indexOf("SHIFT1") >= 0
  )
    return "SHF1";
  if (
    up.indexOf("SHF2") >= 0 ||
    up.indexOf("SHIFT-2") >= 0 ||
    up.indexOf("SHIFT2") >= 0
  )
    return "SHF2";
  if (
    up.indexOf("SHF3") >= 0 ||
    up.indexOf("SHIFT-3") >= 0 ||
    up.indexOf("SHIFT3") >= 0
  )
    return "SHF3";
  return "";
}

function _lapDataP0_(ss, ulp, tglIso) {
  var sh = ss.getSheetByName(LAP_UP3.YANDAL_P0),
    C = COL_P0,
    n = 0;
  if (sh && sh.getLastRow() > 1) {
    var shiftMap = _lapShiftTagMap_(ss);
    var d = sh.getDataRange().getValues();
    for (var i = 1; i < d.length; i++) {
      if (!String(d[i][C.kodeP0] || "").trim()) continue;
      if (String(d[i][C.ulp] || "").trim() !== ulp) continue;
      if (_normTgl(d[i][C.tanggal]) !== tglIso) continue;
      if (!_lapP0KriteriaOk_(d[i][C.namaPekerjaan])) continue;
      if (_lapShiftTagDariP0_(d[i], shiftMap) !== "SHF1") continue;
      n++;
    }
  }
  return n;
}

function buildLaporanUP3(tanggal, ulp, opts) {
  opts = opts || {};
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var tglIso = _normTgl(tanggal) || _normTgl(new Date());

  var row = _lapDataROW_(ss, ulp, tglIso);
  var htk = _lapDataHartek_(ss, ulp, tglIso);
  var ins = _lapDataInspeksi_(ss, ulp, tglIso);
  var p0 = _lapDataP0_(ss, ulp, tglIso);
  var ggn = _glScan_(ulp, tglIso);

  var L = [];
  L.push("*Laporan Harian Keandalan Distribusi*");
  L.push("Hari " + _lapTglIndo(tglIso));
  L.push("");
  L.push("ULP " + _lapUlpNama(ulp));
  L.push("");

  L.push("*A. GANGGUAN PENYULANG* ⚡");
  L.push("");
  L.push("- PMT : " + ggn.daily.pmt + " Kali");
  L.push("- Section : " + ggn.daily.section + " kali");
  L.push("");
  L.push("*Komulatif*");
  L.push("- PMT : " + ggn.komulatif.pmt + " kali");
  L.push("- Section : " + ggn.komulatif.section + " kali");
  L.push("");

  L.push("*B. ROW* 🌴");
  L.push("");
  var rowPeny = Object.keys(row.hari).sort();
  var tgtRabas = _lapBagiTarget(LAP_TARGET_ROW.rabasPerHari, rowPeny.length);
  var tgtTebang = _lapBagiTarget(LAP_TARGET_ROW.tebangPerHari, rowPeny.length);
  for (var i = 0; i < rowPeny.length; i++) {
    var h = row.hari[rowPeny[i]];
    L.push(
      _lapPenyBlok(rowPeny[i], [
        { label: "Rabas", satuan: "Gawang", target: tgtRabas[i], rlz: h.rabas },
        {
          label: "Tebang",
          satuan: "Batang",
          target: tgtTebang[i],
          rlz: h.tebang,
        },
      ]),
    );
    L.push("");
  }
  if (rowPeny.length === 0) {
    L.push(
      _lapPenyBlok(null, [
        { label: "Rabas", satuan: "Gawang", target: null, rlz: null },
        { label: "Tebang", satuan: "Batang", target: null, rlz: null },
      ]),
    );
    L.push("");
  }
  L.push("*Komulatif*");
  L.push("- Rabas : " + _lapKom(row.komulatif.rabas, "Gawang"));
  L.push("- Tebang : " + _lapKom(row.komulatif.tebang, "Batang"));
  L.push("");

  L.push("*C. Hartek* 🔧");
  L.push("");
  var htkPeny = Object.keys(htk.hari).sort();
  for (var j = 0; j < htkPeny.length; j++) {
    var hh = htk.hari[htkPeny[j]];
    L.push(
      _lapPenyBlok(htkPeny[j], [
        { label: "Gardu", satuan: "Unit", target: hh.gardu, rlz: hh.gardu },
        {
          label: "Jaringan",
          satuan: "Gawang",
          target: hh.jaringan,
          rlz: hh.jaringan,
        },
      ]),
    );
    L.push("");
  }
  if (htkPeny.length === 0) {
    L.push(
      _lapPenyBlok(null, [
        { label: "Gardu", satuan: "Unit", target: null, rlz: null },
        { label: "Jaringan", satuan: "Gawang", target: null, rlz: null },
      ]),
    );
    L.push("");
  }
  L.push("*Komulatif*");
  L.push("- Gardu : " + _lapKom(htk.komulatif.gardu, "Unit"));
  L.push("- Jaringan : " + _lapKom(htk.komulatif.jaringan, "Gawang"));
  L.push("");

  L.push("*D. Inspeksi* 🔍");
  L.push("");
  var insPeny = Object.keys(ins.hari).sort();
  for (var k = 0; k < insPeny.length; k++) {
    var ih = ins.hari[insPeny[k]];
    var garduTgt = ih.gardu > 0 ? LAP_TARGET_INSDU_GARDU : null;
    L.push(
      _lapPenyBlok(insPeny[k], [
        { label: "Gardu", satuan: "Unit", target: garduTgt, rlz: ih.gardu },
        {
          label: "Jaringan",
          satuan: "Gawang",
          target: ih.jaringan,
          rlz: ih.jaringan,
        },
      ]),
    );
    L.push("");
  }
  if (insPeny.length === 0) {
    L.push(
      _lapPenyBlok(null, [
        { label: "Gardu", satuan: "Unit", target: null, rlz: null },
        { label: "Jaringan", satuan: "Gawang", target: null, rlz: null },
      ]),
    );
    L.push("");
  }
  L.push("*Komulatif*");
  L.push("- Jaringan : " + _lapKom(ins.komulatif.jaringan, "Gawang"));
  L.push("- Gardu : " + _lapKom(ins.komulatif.gardu, "Unit"));
  L.push("");

  L.push("*E. C4A* 🦘");
  L.push(_lapC4A(opts.c4a));
  L.push("");

  L.push("*F. P0 Yantek*");
  L.push("Realisasi " + (Number(p0) || 0) + " Titik");
  L.push("");

  L.push("*G. Tindak Lanjut*");
  L.push(_lapTindakLanjutGangguan(ggn.daily.list, opts.tindakLanjutGangguan));
  L.push("");

  L.push("#Jaringan Andal#");
  L.push("#Gaspol#");

  return L.join("\n");
}

function getLaporanUP3(params) {
  guard_(arguments, { ulp: true, aksi: "getLaporanUP3" });
  try {
    params = params || {};
    var ulp = String(params.ulp || "").trim();
    var tanggal = params.tanggal || "";
    if (!ulp) return { ok: false, message: "ULP wajib dipilih." };
    if (!tanggal) return { ok: false, message: "Tanggal wajib dipilih." };
    var waText = buildLaporanUP3(tanggal, ulp, {
      c4a: params.c4a,
      tindakLanjutGangguan: params.tindakLanjutGangguan,
    });
    return { ok: true, ulp: ulp, tanggal: _normTgl(tanggal), waText: waText };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

function debugLaporanUP3() {
  var tgl = _normTgl(new Date());
  Logger.log(
    buildLaporanUP3(tgl, "Toboali", { c4a: "Nihil", tindakLanjut: "Nihil" }),
  );
}
