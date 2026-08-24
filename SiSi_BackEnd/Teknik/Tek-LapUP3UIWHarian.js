/* #################################################################
   Tek-LapUP3UIWHarian.gs — SiSi ULP Toboali  (GABUNGAN 3 MODUL)
   Satu file utuh; di Apps Script semua .gs berbagi 1 global scope.
   Berisi 3 bagian:
     BAGIAN 1/3 — Laporan UP3      (buildLaporanUP3 / getLaporanUP3)
     BAGIAN 2/3 — Laporan Wilayah  (buildLaporanWilayah / getLaporanWilayah)
     BAGIAN 3/3 — Jembatan Sheet   (Teknik_Laporan Harian + trigger)
   #################################################################
   Rev 7 Agu 2026 — DUAL-READ (migrasi arsip): _lapDataROW_ & _wilDataRow_ membaca
   db_ROW_Realisasi dari AKTIF + ARSIP via _readSheetDual_(); map ULP memakai
   _lapUlpMapDual_(). Kedua helper ada di Tek-Migrasi.gs (wajib terpasang di project yg sama).
   Rev 10 Agu 2026 — Migrasi sheet "Teknik_Laporan Harian": _lhEnsureRow &
   refreshLaporanHarian diguard _tglSudahDiarsip_ (tanggal <= H-2 tidak dibuat ulang di
   aktif); getLaporanHarianRow diberi fallback ARSIP (Pola A) agar laporan lama tetap bisa
   dilihat read-only.
   Rev 24 Agu 2026 — FIX KOMULATIF: Hartek, Inspeksi Jaringan, dan Inspeksi Gardu
   kini DUAL-READ AKTIF+ARSIP via _readSheetDual_(), konsisten dengan ROW.
   Rev 20 Agu 2026 — OPTIMASI BACA mobile Laporan UP3/UIW: getMobileLaporanUp3Uiw
   di-cache (CacheService) 2 menit per (ULP, tanggal) + _statusTimLaporan_ hanya
   memindai 1000 baris terakhir tiap sheet (_lapRecentRows_). Cache dibuang
   otomatis saat simpanMobileLaporanC4A.
   ################################################################# */

/* =====================================================
   BAGIAN 1/3 — Tek-LaporanUP3.gs — SiSi ULP Toboali
   Generator "Laporan Harian Keandalan Distribusi" (format UP3).
   Output: 1 teks WA per ULP per tanggal (siap kirim).

   SUMBER DATA (per ULP, tanggal laporan):
     B. ROW       -> db_ROW_Realisasi   (Rabas; Tebang = Sedang + Besar)
     C. Hartek    -> db_Hartek_PenyulangGardu (Jaringan = Jumlah Gawang/kolom L; Gardu = jumlah baris)
     D. Inspeksi  -> Jaringan: db_InsJar_Realisasi (Total Tiang -> ditampilkan "Gawang").
                     Tier 2 dilaporkan H+1 (Tier 2 tgl X tampil di laporan tgl X+1);
                     Tier 1/tanpa tier tetap pada tanggalnya. Pergeseran ini berlaku
                     utk HARIAN & KOMULATIF; Tier 2 di tanggal akhir bulan tidak
                     terbawa ke bulan berikutnya. KOMULATIF: tgl 1 s/d tanggal laporan.
                     Gardu:    db_InsDu_Realisasi  (jumlah baris = Unit)
     F. P0 Yantek -> db_Yandal_P0 (HANYA kriteria "ROW (Rabas)"/"ROW (Pangkas)", Shift 1 (08:00-16:00), tanggal = Titik)
     A. Gangguan  -> modul terpisah (belum ada) -> placeholder/opsi manual
     E. C4A       -> input MANUAL
     G. Tindak L. -> input MANUAL

   KOMULATIF = akumulasi BULAN BERJALAN (tgl 1 s/d tanggal laporan).
   TARGET:
     - ROW   : Rabas 20/hari & Tebang 6/hari DIBAGI jumlah penyulang aktif
               (sisa dibulatkan ke atas utk penyulang pertama; total tetap).
     - Hartek: Target = Realisasi (tampil kembar).
     - Inspeksi Gardu    : Target tetap 5 Unit/penyulang (hanya bila ada realisasi gardu).
     - Inspeksi Jaringan : Target = Realisasi (tampil kembar).
   ===================================================== */

var LAP_UP3 = {
  ROW_RLZ: "db_ROW_Realisasi",
  HTK_PG: "db_Hartek_PenyulangGardu",
  INSJAR: "db_InsJar_Realisasi",
  INSDU: "db_InsDu_Realisasi",
  YANDAL_P0: "db_Yandal_P0",
  YANDAL_SHIFT: "db_Yandal_Shift",
  HEADER: "db_Global_Header",
};

var LAP_TARGET_ROW = { rabasPerHari: 20, tebangPerHari: 6 }; // total/hari, dibagi jumlah penyulang
var LAP_TARGET_INSDU_GARDU = 5; // Unit/penyulang (inspeksi gardu)

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

/* ===== Helper format ===== */
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

// Tanggal H+1 (yyyy-MM-dd) dari tanggal ISO — hari "dilaporkan" utk Tier 2 (digeser ke keesokan hari).
function _lapTglBerikutnya_(tglIso) {
  var d = new Date(tglIso + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return Utilities.formatDate(d, "Asia/Jakarta", "yyyy-MM-dd");
}

// Tampilkan angka + satuan; 0/kosong (tidak ada realisasi) -> "- <satuan>" (satuan TETAP ditampilkan).
function _lapAngka(v, satuan) {
  if (v === null || v === undefined || v === "" || Number(v) === 0)
    return "- " + satuan;
  return v + " " + satuan;
}

// Komulatif: angka + satuan; 0/kosong -> "0" + satuan.
function _lapKom(v, satuan) {
  return (Number(v) || 0) + " " + satuan;
}

// Blok satu penyulang: judul + Target/Realisasi tiap baris.
// nama null/'' -> tanpa baris "Penyulang" (dipakai saat suatu pekerjaan tidak ada realisasi).
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

// Bagi target harian ke n penyulang; sisa diberikan ke penyulang pertama (bulatkan ke atas). Total tetap = total.
function _lapBagiTarget(total, n) {
  var out = [];
  if (n <= 0) return out;
  var base = Math.floor(total / n),
    sisa = total - base * n;
  for (var i = 0; i < n; i++) out.push(base + (i < sisa ? 1 : 0));
  return out;
}

// Teks manual (C4A/Tindak Lanjut). Kosong -> 'Nihil' (E pakai dash, G tidak).
function _lapManual(text, withDash) {
  var s = String(text == null ? "" : text).trim();
  if (!s) return withDash ? "- Nihil" : "Nihil";
  return s;
}
// E. C4A terstruktur: { penyulang, realisasi, temuan, eksekusi }.
// Kosong semua -> '- Nihil'. String (kompat lama) -> tampil apa adanya.
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
  // Satuan kmS di-set otomatis di format; petugas cukup input angka (mis. "4,6").
  var rlzTxt = rlz ? (/km/i.test(rlz) ? rlz : rlz + " kmS") : "-";
  return [
    "Penyulang " + (peny || "-"),
    "- Realisasi : " + rlzTxt,
    "- Temuan : " + (tmn || "-"),
    "- Eksekusi : " + (eks || "-"),
  ].join("\n");
}

// G. Tindak Lanjut dari daftar gangguan harian (Bagian A & G saling terkait).
// list: [{penyulang, temuan] urut server; tlArr: teks tindak lanjut manual per indeks.
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

// Map Kode Header -> ULP (db_Global_Header) untuk join modul yang tak punya kolom ULP.
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

/* ===== Agregasi per bagian ===== */

// B. ROW: per penyulang (hari) {rabas, tebang} + komulatif bulan {rabas, tebang}.
// DUAL-READ (migrasi): db_ROW_Realisasi dibaca dari AKTIF + ARSIP (komulatif bulan butuh data lama).
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

// C. Hartek: per penyulang (hari) {jaringan, gardu} + komulatif bulan.
// Jaringan = Jumlah Gawang (kolom L PG, jenis 'Jaringan'); Gardu = jumlah baris objek gardu (bukan Jaringan/Non-Teknik).
function _lapDataHartek_(ss, ulp, tglIso) {
  var C = COL_HTK.PG;
  var bulan = tglIso.substring(0, 7);
  var hari = {},
    kom = { jaringan: 0, gardu: 0 };
  // DUAL-READ: data H-2 ke belakang sudah berpindah ke ARSIP. Tanpa gabungan
  // AKTIF+ARSIP, komulatif bulan Hartek turun/hilang setelah migrasi harian.
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
        kom.gardu += 1; // 1 baris gardu = 1 Unit
        if (t === tglIso) {
          if (!hari[p]) hari[p] = { jaringan: 0, gardu: 0 };
          hari[p].gardu += 1;
        }
      }
    }
  }
  return { hari: hari, komulatif: kom };
}

// D. Inspeksi: per penyulang (hari) {jaringan, gardu} + komulatif bulan.
// Jaringan = Total Tiang (db_InsJar_Realisasi); Gardu = jumlah baris db_InsDu_Realisasi.
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
  // DUAL-READ Inspeksi Jaringan: gabungkan AKTIF+ARSIP dan dedup berdasarkan
  // Kode Pekerjaan Penyulang agar baris in-flight migrasi tidak dihitung dua kali.
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
      if (t.substring(0, 7) !== bulan) continue; // hanya baris bertanggal di bulan berjalan
      var gw = Number(dj[i][RJ.totalTiang]) || 0;
      var isTier2 =
        String(dj[i][RJ.tier] || "")
          .trim()
          .toLowerCase()
          .indexOf("tier 2") >= 0;
      // Hari EFEKTIF tampil di laporan: Tier 2 dilaporkan keesokan hari (H+1);
      // Tier 1/tanpa tier tetap pada tanggalnya. Bila H+1 jatuh ke bulan berikutnya
      // (Tier 2 di tanggal akhir bulan), baris itu tidak terbawa ke bulan ini.
      var effDay = isTier2 ? _lapTglBerikutnya_(t) : t;
      // KOMULATIF: akumulasi tgl 1 s/d tanggal laporan (pakai hari efektif, tetap di bulan berjalan).
      if (effDay.substring(0, 7) === bulan && effDay <= tglIso)
        kom.jaringan += gw;
      // HARIAN: hari efektif == tanggal laporan.
      if (effDay === tglIso)
        _ensure(String(dj[i][RJ.penyulang] || "").trim() || "-").jaringan += gw;
    }
  }

  var RG = COL_INSDU.REALISASI;
  // DUAL-READ Inspeksi Gardu: data lama tetap ikut komulatif setelah sheet
  // realisasi gardu dimigrasikan ke file ARSIP.
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
      // 1 baris realisasi gardu = 1 Unit. Lewati baris tanpa identitas gardu.
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

// Kriteria P0 yang DIHITUNG di laporan UP3: hanya "ROW (Rabas)" & "ROW (Pangkas)".
// Cocokkan longgar (abaikan kapital/spasi) agar tahan variasi penulisan dropdown.
function _lapP0KriteriaOk_(nama) {
  var s = String(nama || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  if (s.indexOf("row") < 0) return false;
  return s.indexOf("rabas") >= 0 || s.indexOf("pangkas") >= 0;
}

// Peta Kode Pekerjaan Shift -> tag (SHF1/2/3) dari db_Yandal_Shift (kolom "Shift").
// _shiftTagY_ & COL_YANDAL_SHIFT berasal dari Tek-Yandal.gs (satu ruang lingkup global).
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

// Tag shift utk 1 baris P0: utamakan label db_Yandal_Shift; fallback parse dari Kode Pekerjaan Shift.
function _lapShiftTagDariP0_(rowP0, shiftMap) {
  var ks = String(rowP0[COL_P0.kodeShift] || "").trim();
  if (ks && shiftMap[ks]) return shiftMap[ks];
  var up = ks.toUpperCase(); // kode berantai memuat tag (…-SHF1.001) / format lama (…-SHIFT-1-…)
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

// F. P0 Yantek: jumlah baris db_Yandal_P0 utk tanggal+ULP — HANYA kriteria
// "ROW (Rabas)"/"ROW (Pangkas)" & HANYA Shift 1 (08:00 - 16:00). Hasil = Titik.
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
      if (!_lapP0KriteriaOk_(d[i][C.namaPekerjaan])) continue; // hanya ROW (Rabas)/(Pangkas)
      if (_lapShiftTagDariP0_(d[i], shiftMap) !== "SHF1") continue; // hanya Shift 1 (08:00 - 16:00)
      n++;
    }
  }
  return n;
}

/* ===== BUILDER UTAMA ===== */
// opts: { c4a, tindakLanjut, gangguan:{pmt,section,komPmt,komSection} }
function buildLaporanUP3(tanggal, ulp, opts) {
  opts = opts || {};
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var tglIso = _normTgl(tanggal) || _normTgl(new Date());

  var row = _lapDataROW_(ss, ulp, tglIso);
  var htk = _lapDataHartek_(ss, ulp, tglIso);
  var ins = _lapDataInspeksi_(ss, ulp, tglIso);
  var p0 = _lapDataP0_(ss, ulp, tglIso);
  var ggn = _glScan_(ulp, tglIso); // A. Gangguan Penyulang (Tek-Gangguan.gs / SiMonLang)

  var L = [];
  L.push("*Laporan Harian Keandalan Distribusi*");
  L.push("Hari " + _lapTglIndo(tglIso));
  L.push("");
  L.push("ULP " + _lapUlpNama(ulp));
  L.push("");

  // A. GANGGUAN PENYULANG (dari Tek-Gangguan.gs: jendela 19:00->19:00, akhir bulan reset ke 0)
  L.push("*A. GANGGUAN PENYULANG* \u26A1");
  L.push("");
  L.push("- PMT : " + ggn.daily.pmt + " Kali");
  L.push("- Section : " + ggn.daily.section + " kali");
  L.push("");
  L.push("*Komulatif*");
  L.push("- PMT : " + ggn.komulatif.pmt + " kali");
  L.push("- Section : " + ggn.komulatif.section + " kali");
  L.push("");

  // B. ROW
  L.push("*B. ROW* \uD83C\uDF34");
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
    // tidak ada realisasi -> tetap tampil, nilai "-"
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

  // C. Hartek
  L.push("*C. Hartek* \uD83D\uDD27");
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
    // tidak ada realisasi -> tetap tampil, nilai "-"
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

  // D. Inspeksi
  L.push("*D. Inspeksi* \uD83D\uDD2D");
  L.push("");
  var insPeny = Object.keys(ins.hari).sort();
  for (var k = 0; k < insPeny.length; k++) {
    var ih = ins.hari[insPeny[k]];
    var garduTgt = ih.gardu > 0 ? LAP_TARGET_INSDU_GARDU : null; // target gardu hanya bila ada realisasi
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
    // tidak ada realisasi -> tetap tampil, nilai "-"
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

  // E. C4A (terstruktur: penyulang/realisasi/temuan/eksekusi)
  L.push("*E. C4A* \uD83E\uDE7A");
  L.push(_lapC4A(opts.c4a));
  L.push("");

  // F. P0 Yantek
  L.push("*F. P0 Yantek*");
  L.push("Realisasi " + (Number(p0) || 0) + " Titik");
  L.push("");

  // G. Tindak Lanjut (daftar gangguan hari ini; teks TL manual via popup, indeks selaras _glScan_)
  L.push("*G. Tindak Lanjut*");
  L.push(_lapTindakLanjutGangguan(ggn.daily.list, opts.tindakLanjutGangguan));
  L.push("");

  L.push("#Jaringan Andal#");
  L.push("#Gaspol#");

  return L.join("\n");
}

/* ===== ENDPOINT WEB APP (dipanggil SIE-Teknik) ===== */
// params: { tanggal, ulp, c4a, tindakLanjut, gangguan }
function getLaporanUP3(params) {
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

// Uji cepat dari editor Apps Script: Logger menampilkan teks WA.
function debugLaporanUP3() {
  var tgl = _normTgl(new Date());
  Logger.log(
    buildLaporanUP3(tgl, "Toboali", { c4a: "Nihil", tindakLanjut: "Nihil" }),
  );
}

/* =====================================================
   BAGIAN 2/3 — Tek-LaporanWilayah.gs — SiSi ULP Toboali
   Generator "Laporan Harian Wilayah" (pendamping Laporan UP3).
   Output: 1 teks WA per ULP per tanggal (siap kirim).

   SUMBER DATA (per ULP, tanggal laporan):
     Header   -> Tim ROW   = jumlah Tim berbeda di db_ROW_Realisasi
                 Tim Hartek = 1 bila ADA realisasi Hartek hari itu, else 0
                 Cuaca      = input MANUAL
     CARE FOR ASSET -> loop tiap penyulang ber-Inspeksi Jaringan (db_InsJar_Realisasi):
                 Panjang = Total Tiang x 0,05 -> "x,yy kmS"
                 Temuan  = db_INS_Temuan (objek Jaringan, per penyulang):
                   ROW       = nama temuan memuat kata kunci (pohon/rabas/pangkas/tebang)
                   Peralatan = selain itu
     REALISASI ROW  -> db_ROW_Realisasi dikelompokkan per TIM (kolom Tim);
                 di tiap Tim, satu sub-blok per Penyulang.
                 Rabas = kolom Rabas (Gawang); Tebang = Sedang + Besar (Batang).
     HARTEK   -> teks WA jadi dari db_Global_Header kolom WA Text (M),
                 baris Tim = "Hartek", dicocokkan ULP + Tanggal. Ditempel apa adanya.

   Helper & konstanta global dari Code.gs / Tek-LaporanUP3.gs / Tek-Temuan.gs:
     SPREADSHEET_ID, _normTgl, COL_INS, COL_ROW_RLZ, COL_HTK,
     _lapTglIndo, _lapUlpNama, _lapUlpMap_, _sectionRange.
   ===================================================== */

var LAP_WIL = {
  ROW_RLZ: "db_ROW_Realisasi",
  INSJAR: "db_InsJar_Realisasi",
  HTK_PG: "db_Hartek_PenyulangGardu",
  TEMUAN: "db_INS_Temuan",
  HEADER: "db_Global_Header",
};

var _WIL_SEP = "════════════════════";

// Kata kunci penanda temuan ROW; sisanya dihitung sebagai Peralatan.
var _WIL_ROW_KEYWORDS = ["pohon", "rabas", "pangkas", "tebang"];
function _wilIsTemuanRow(namaTemuan) {
  var s = String(namaTemuan || "").toLowerCase();
  for (var i = 0; i < _WIL_ROW_KEYWORDS.length; i++) {
    if (s.indexOf(_WIL_ROW_KEYWORDS[i]) >= 0) return true;
  }
  return false;
}

// Total Tiang -> panjang kmS gaya Indonesia (2 desimal, koma). Mis. 87 -> "4,35kmS".
function _wilKmS(tiang) {
  var km = (Number(tiang) || 0) * 0.05;
  return km.toFixed(2).replace(".", ",") + "kmS";
}

// Nomor & label Tim ROW dari nilai kolom Tim (mis. "ROW 01"/"Tim ROW 1" -> "TIM ROW 01").
function _wilTimNum(tim) {
  var m = String(tim || "").match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 999999;
}
function _wilTimLabel(tim) {
  var m = String(tim || "").match(/(\d+)/);
  return m
    ? "TIM ROW " + ("0" + m[1]).slice(-2)
    : "TIM " + String(tim || "").toUpperCase();
}

/* ===== Agregasi ===== */

// Temuan Inspeksi Jaringan per penyulang -> { peralatan, row } (objek = Jaringan).
function _wilTemuanByPenyulang_(ss, ulp, tglIso) {
  var sh = ss.getSheetByName(LAP_WIL.TEMUAN),
    T = COL_INS.TEMUAN,
    map = {};
  if (sh && sh.getLastRow() > 1) {
    var d = sh.getDataRange().getValues();
    for (var i = 1; i < d.length; i++) {
      if (String(d[i][T.ulp] || "").trim() !== ulp) continue;
      if (_normTgl(d[i][T.tanggal]) !== tglIso) continue;
      if (
        String(d[i][T.objekInspeksi] || "")
          .trim()
          .toLowerCase() !== "jaringan"
      )
        continue;
      var nama = String(d[i][T.temuan] || "").trim();
      if (!nama) continue;
      var key = String(d[i][T.penyulang] || "")
        .trim()
        .toLowerCase();
      if (!map[key]) map[key] = { peralatan: 0, row: 0 };
      if (_wilIsTemuanRow(nama)) map[key].row++;
      else map[key].peralatan++;
    }
  }
  return map;
}

// CARE FOR ASSET: tiap penyulang ber-Inspeksi Jaringan hari itu.
function _wilDataCareForAsset_(ss, ulp, tglIso) {
  var sh = ss.getSheetByName(LAP_WIL.INSJAR),
    RJ = COL_INS.REALISASI;
  var ulpMap = _lapUlpMapDual_(),
    agg = {},
    order = [];
  if (sh && sh.getLastRow() > 1) {
    var d = sh.getDataRange().getValues();
    for (var i = 1; i < d.length; i++) {
      var kh = String(d[i][RJ.kodeHeader] || "").trim();
      if ((ulpMap[kh] || "") !== ulp) continue;
      if (_normTgl(d[i][RJ.tanggal]) !== tglIso) continue;
      var p = String(d[i][RJ.penyulang] || "").trim() || "-";
      if (!agg[p]) {
        agg[p] = { tiang: 0, sections: [], seen: {} };
        order.push(p);
      }
      agg[p].tiang += Number(d[i][RJ.totalTiang]) || 0;
      var sec = String(d[i][RJ.section] || "").trim();
      if (sec && !agg[p].seen[sec]) {
        agg[p].seen[sec] = 1;
        agg[p].sections.push(sec);
      }
    }
  }
  var temuanMap = _wilTemuanByPenyulang_(ss, ulp, tglIso);
  var out = [];
  for (var k = 0; k < order.length; k++) {
    var p = order[k],
      a = agg[p];
    var tem = temuanMap[p.toLowerCase()] || { peralatan: 0, row: 0 };
    out.push({
      penyulang: p,
      section:
        a.sections.length > 1
          ? _sectionRange(p, a.sections)
          : a.sections[0] || "-",
      tiang: a.tiang,
      peralatan: tem.peralatan,
      row: tem.row,
    });
  }
  return out;
}

// REALISASI ROW dikelompokkan per Tim, lalu per Penyulang.
// DUAL-READ (migrasi): db_ROW_Realisasi dibaca dari AKTIF + ARSIP.
function _wilDataRow_(ss, ulp, tglIso) {
  var R = COL_ROW_RLZ;
  var ulpMap = _lapUlpMapDual_(),
    tims = {},
    order = [];
  var d = _readSheetDual_(LAP_WIL.ROW_RLZ, R.kodePekerjaan, COL_ROW_RLZ_N);
  for (var i = 0; i < d.length; i++) {
    var kh = String(d[i][R.kodeHeader] || "").trim();
    if ((ulpMap[kh] || "") !== ulp) continue;
    if (_normTgl(d[i][R.tanggal]) !== tglIso) continue;
    var tim = String(d[i][R.tim] || "").trim() || "-";
    if (!tims[tim]) {
      tims[tim] = { peny: {}, order: [] };
      order.push(tim);
    }
    var p = String(d[i][R.penyulang] || "").trim() || "-";
    if (!tims[tim].peny[p]) {
      tims[tim].peny[p] = { rabas: 0, tebang: 0, sections: [], seen: {} };
      tims[tim].order.push(p);
    }
    var ob = tims[tim].peny[p];
    ob.rabas += Number(d[i][R.rabas]) || 0;
    ob.tebang += (Number(d[i][R.sedang]) || 0) + (Number(d[i][R.besar]) || 0);
    var sec = String(d[i][R.section] || "").trim();
    if (sec && !ob.seen[sec]) {
      ob.seen[sec] = 1;
      ob.sections.push(sec);
    }
  }
  order.sort(function (a, b) {
    var na = _wilTimNum(a),
      nb = _wilTimNum(b);
    return na !== nb ? na - nb : a.localeCompare(b);
  });
  return { tims: tims, order: order };
}

// Ada realisasi Hartek hari itu? (untuk hitung Tim Hartek)
function _wilHartekAda_(ss, ulp, tglIso) {
  var sh = ss.getSheetByName(LAP_WIL.HTK_PG),
    C = COL_HTK.PG;
  if (sh && sh.getLastRow() > 1) {
    var d = sh.getDataRange().getValues();
    for (var i = 1; i < d.length; i++) {
      if (String(d[i][C.ulp] || "").trim() !== ulp) continue;
      if (_normTgl(d[i][C.tanggal]) === tglIso) return true;
    }
  }
  return false;
}

// Data Hartek utk UIW (TANPA header). Ringkas Penyulang (distinct, urut tampil)
// + Section awal/pangkal per penyulang; pisah seksi Jaringan vs Gardu vs Non-Teknik.
// 12 Agu 2026: jenis Non-Teknik kini IKUT dilaporkan sebagai seksi tersendiri.
// Body pekerjaan+material di-REUSE dari kolom TextWA (db_Hartek_
// PenyulangGardu) — tidak digenerate ulang.
function _wilDataHartek_(ss, ulp, tglIso) {
  var sh = ss.getSheetByName(LAP_WIL.HTK_PG),
    C = COL_HTK.PG;
  var penyOrder = [],
    penySeen = {},
    sectionByPeny = {};
  var jaringan = [],
    gardu = [],
    nonTeknik = [];
  if (sh && sh.getLastRow() > 1) {
    var d = sh.getDataRange().getValues();
    for (var i = 1; i < d.length; i++) {
      if (String(d[i][C.ulp] || "").trim() !== ulp) continue;
      if (_normTgl(d[i][C.tanggal]) !== tglIso) continue;
      var jenis = String(d[i][C.jenisPekerjaan] || "")
        .trim()
        .toLowerCase();
      // UIW (12 Agu 2026): Jaringan, Gardu, DAN Non-Teknik semuanya dimasukkan
      // (Non-Teknik tampil di seksi tersendiri). Jenis kosong/tak dikenal tetap dilewati.
      var isNonTeknik =
        jenis.indexOf("non") >= 0 && jenis.indexOf("teknik") >= 0;
      if (jenis !== "jaringan" && jenis !== "gardu" && !isNonTeknik) continue;
      var pen = String(d[i][C.penyulang] || "").trim();
      var sec = String(d[i][C.section] || "").trim();
      var gar = String(d[i][C.gardu] || "").trim();
      var body = String(d[i][C.textWa] || "").trim(); // daftar pekerjaan + material (sudah jadi)

      if (pen) {
        var pk = pen.toLowerCase();
        if (!penySeen[pk]) {
          penySeen[pk] = true;
          penyOrder.push(pen);
        }
        if (sec && !sectionByPeny[pk]) sectionByPeny[pk] = sec; // section AWAL per penyulang
      }

      var entry = { gardu: gar, body: body };
      if (jenis === "jaringan") jaringan.push(entry);
      else if (isNonTeknik)
        nonTeknik.push(entry); // Non-Teknik -> seksi tersendiri
      else gardu.push(entry);
    }
  }
  var secList = [];
  for (var z = 0; z < penyOrder.length; z++) {
    var s = sectionByPeny[penyOrder[z].toLowerCase()];
    if (s) secList.push(s);
  }
  return {
    penyulang: penyOrder.join(", "),
    section: secList.join(", "),
    jaringan: jaringan,
    gardu: gardu,
    nonTeknik: nonTeknik,
  };
}

// Render satu seksi Hartek UIW. arr: [{gardu, body]. Kosong -> 'Pekerjaan : -' / 'Material : -'.
// withGardu=true menampilkan baris 'Gardu : *<no>*' (objek Gardu). Body (daftar
// pekerjaan+material) ditempel apa adanya dari kolom TextWA, diawali label 'Pekerjaan :'.
function _wilRenderHartekSeksi_(judul, arr, withGardu) {
  var L = [judul];
  if (!arr || !arr.length) {
    L.push("Pekerjaan : -");
    L.push("Material : -");
    return L.join("\n");
  }
  var blocks = [];
  for (var i = 0; i < arr.length; i++) {
    var e = arr[i],
      b = [];
    if (withGardu && e.gardu) b.push("Gardu : *" + e.gardu + "*");
    if (e.body) {
      b.push("Pekerjaan :");
      b.push(e.body);
    } else {
      b.push("Pekerjaan : -");
      b.push("Material : -");
    }
    blocks.push(b.join("\n"));
  }
  L.push(blocks.join("\n\n"));
  return L.join("\n");
}

/* ===== BUILDER UTAMA ===== */
// opts: { cuaca }
function buildLaporanWilayah(tanggal, ulp, opts) {
  opts = opts || {};
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var tglIso = _normTgl(tanggal) || _normTgl(new Date());

  var care = _wilDataCareForAsset_(ss, ulp, tglIso);
  var rowData = _wilDataRow_(ss, ulp, tglIso);
  var hartek = _wilDataHartek_(ss, ulp, tglIso);
  var hartekAda = _wilHartekAda_(ss, ulp, tglIso);
  var cuaca = String(opts.cuaca || "").trim() || "-";

  var L = [];
  L.push("*ULP " + _lapUlpNama(ulp).toUpperCase() + "*");
  L.push("");
  L.push("📅 Hari / Tanggal : " + _lapTglIndo(tglIso));
  L.push("👷 Tim ROW : " + rowData.order.length + " Tim");
  L.push("👷 Tim Hartek : " + (hartekAda ? 1 : 0) + " Tim");
  L.push("🌤️ Cuaca : " + cuaca);
  L.push(_WIL_SEP);

  // CARE FOR ASSET
  L.push("🌿 CARE FOR ASSET");
  if (care.length) {
    for (var i = 0; i < care.length; i++) {
      var c = care[i];
      L.push("");
      L.push("Penyulang : " + c.penyulang);
      L.push("Section : " + (c.section || "-"));
      L.push("Panjang : " + _wilKmS(c.tiang));
      L.push("");
      L.push("🔎 Temuan");
      L.push("");
      L.push("Peralatan : " + c.peralatan + " Titik");
      L.push("ROW : " + c.row + " Titik");
    }
  } else {
    L.push("");
    L.push("Penyulang : -");
    L.push("Section : -");
    L.push("Panjang : -");
    L.push("");
    L.push("🔎 Temuan");
    L.push("");
    L.push("Peralatan : - Titik");
    L.push("ROW : - Titik");
  }
  L.push(_WIL_SEP);

  // REALISASI ROW (per Tim -> per Penyulang)
  L.push("🌿 REALISASI ROW");
  if (rowData.order.length) {
    for (var t = 0; t < rowData.order.length; t++) {
      var timRaw = rowData.order[t],
        tim = rowData.tims[timRaw];
      L.push("");
      L.push("🔹 " + _wilTimLabel(timRaw));
      for (var p = 0; p < tim.order.length; p++) {
        if (p > 0) L.push("");
        var pn = tim.order[p],
          ob = tim.peny[pn];
        var sec =
          ob.sections.length > 1
            ? _sectionRange(pn, ob.sections)
            : ob.sections[0] || "-";
        L.push("- Penyulang : " + pn);
        L.push("- Section : " + sec);
        L.push("- Realisasi");
        L.push("> Rabas : " + ob.rabas + " Gawang");
        L.push("> Tebang : " + ob.tebang + " Batang");
      }
    }
  } else {
    L.push("");
    L.push("🔹 TIM ROW");
    L.push("- Penyulang : -");
    L.push("- Section : -");
    L.push("- Realisasi");
    L.push("> Rabas : - Gawang");
    L.push("> Tebang : - Batang");
  }
  L.push(_WIL_SEP);

  // HARTEK (UIW): TANPA header Hartek (judul/tanggal/koordinat/lokasi).
  // Penyulang/Section diringkas sekali di atas (distinct penyulang dipisah koma;
  // section = section awal/pangkal per penyulang). Body pekerjaan+material REUSE
  // kolom TextWA db_Hartek_PenyulangGardu (tidak digenerate ulang).
  // 12 Agu 2026: Non-Teknik DIMASUKKAN sebagai seksi ketiga (PEKERJAAN NON-TEKNIK).
  L.push("⚡ REALISASI PEKERJAAN HARTEK");
  L.push("Penyulang : " + (hartek.penyulang || "-"));
  L.push("Section : " + (hartek.section || "-"));
  L.push(_WIL_SEP);
  L.push(
    _wilRenderHartekSeksi_("🔧 PEKERJAAN JARINGAN", hartek.jaringan, false),
  );
  L.push(_WIL_SEP);
  L.push(_wilRenderHartekSeksi_("📌 PEKERJAAN GARDU", hartek.gardu, true));
  L.push(_WIL_SEP);
  L.push(
    _wilRenderHartekSeksi_("📋 PEKERJAAN NON-TEKNIK", hartek.nonTeknik, true),
  );
  L.push(_WIL_SEP);

  L.push("Demikian laporan disampaikan. Terima kasih. ⚡");

  return L.join("\n");
}

/* ===== ENDPOINT WEB APP (dipanggil SIE-Teknik) ===== */
// params: { tanggal, ulp, cuaca }
function getLaporanWilayah(params) {
  try {
    params = params || {};
    var ulp = String(params.ulp || "").trim();
    var tanggal = params.tanggal || "";
    if (!ulp) return { ok: false, message: "ULP wajib dipilih." };
    if (!tanggal) return { ok: false, message: "Tanggal wajib dipilih." };
    var waText = buildLaporanWilayah(tanggal, ulp, { cuaca: params.cuaca });
    return { ok: true, ulp: ulp, tanggal: _normTgl(tanggal), waText: waText };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

// Uji cepat dari editor Apps Script.
function debugLaporanWilayah() {
  var tgl = _normTgl(new Date());
  Logger.log(buildLaporanWilayah(tgl, "Toboali", { cuaca: "Cerah" }));
}

/* =====================================================
   BAGIAN 3/3 — Tek-LaporanHarianSheet.gs — SiSi ULP Toboali
   Jembatan WEB + APPSHEET untuk sheet "Teknik_Laporan Harian".
   Satu BARIS per TANGGAL (sistem single-ULP: Toboali).

   Kolom sheet (urut):
     A No | B Tanggal | C Penyulang | D Panjang kmS Inspeksi |
     E Temuan | F Eksekusi | G Laporan UP3 | H Laporan UIW
   - C..F = input MANUAL "E. C4A" (web / AppSheet):
            Penyulang, Panjang kmS Inspeksi (realisasi), Temuan, Eksekusi.
   - G,H  = TEKS WA hasil generate (UP3 & Wilayah/UIW) — otomatis.

   ALUR:
     1) ensureLaporanHarianHariIni() -> trigger 00:00: buat baris tanggal baru
        + generate awal G & H.
     2) simpanLaporanHarianWeb()     -> input web: tulis C4A (HANYA hari ini),
        regenerate G & H, kembalikan teks.
     3) refreshLaporanHarian()       -> AppSheet / saat tim ubah data: baca C4A
        dari sheet, regenerate G & H (logika SAMA dgn web).
     4) getLaporanHarianRow()        -> web memuat C4A + teks tersimpan +
        status editable (today() saja yang bisa diedit).

   Reuse global: SPREADSHEET_ID, _normTgl, WEBHOOK_SECRET, buildLaporanUP3,
                 buildLaporanWilayah (semua .gs satu ruang lingkup global).
   ===================================================== */

var LH = {
  SHEET: "Teknik_Laporan Harian",
  ULP: "Toboali", // sistem single-ULP; ubah di sini bila perlu
  TZ: "Asia/Jakarta",
  COL: {
    no: 0,
    tanggal: 1,
    penyulang: 2,
    panjang: 3,
    temuan: 4,
    eksekusi: 5,
    lapUp3: 6,
    lapUiw: 7,
  },
};

function _lhToday() {
  return Utilities.formatDate(new Date(), LH.TZ, "yyyy-MM-dd");
}

// Ambil sheet; buat + header bila belum ada.
function _lhSheet(ss) {
  ss = ss || SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName(LH.SHEET);
  if (!sh) {
    sh = ss.insertSheet(LH.SHEET);
    sh.appendRow([
      "No",
      "Tanggal",
      "Penyulang",
      "Panjang kmS Inspeksi",
      "Temuan",
      "Eksekusi",
      "Laporan UP3",
      "Laporan UIW",
    ]);
  }
  return sh;
}

// Cari nomor baris (1-based) utk tanggal; 0 bila tak ada.
function _lhFindRow(sh, tglIso) {
  if (sh.getLastRow() < 2) return 0;
  var col = sh
    .getRange(2, LH.COL.tanggal + 1, sh.getLastRow() - 1, 1)
    .getValues();
  for (var i = 0; i < col.length; i++) {
    if (_normTgl(col[i][0]) === tglIso) return i + 2;
  }
  return 0;
}

// Bangun objek C4A dari nilai baris.
function _lhC4aFromRow(v) {
  return {
    penyulang: String(v[LH.COL.penyulang] || "").trim(),
    realisasi: String(v[LH.COL.panjang] || "").trim(),
    temuan: String(v[LH.COL.temuan] || "").trim(),
    eksekusi: String(v[LH.COL.eksekusi] || "").trim(),
  };
}

// Pastikan ada baris utk tanggal; buat bila belum. Kembalikan nomor baris (0 = ditolak guard arsip).
function _lhEnsureRow(sh, tglIso) {
  var r = _lhFindRow(sh, tglIso);
  if (r) return r;
  // GUARD MIGRASI (10 Agu 2026): tanggal <= H-2 wilayah arsip — JANGAN buat ulang barisnya
  // di file aktif (sudah dipindah Tek-Migrasi; bila dibuat ulang -> baris hantu yg ikut
  // termigrasi berulang). Return 0 = caller wajib berhenti.
  if (typeof _tglSudahDiarsip_ === "function" && _tglSudahDiarsip_(tglIso))
    return 0;
  var no = sh.getLastRow(); // header baris 1 -> No berikutnya = lastRow
  sh.appendRow([no, tglIso, "", "", "", "", "", ""]);
  var rn = sh.getLastRow();
  // Kolom input C4A (C..F) di-set TEKS agar nilai seperti "4,1" tidak diubah jadi tanggal/angka.
  sh.getRange(rn, LH.COL.penyulang + 1, 1, 4).setNumberFormat("@");
  return rn;
}

// Regenerasi & tulis kolom G (UP3) + H (UIW) utk satu baris. Kembalikan teks.
function _lhRecalcRow(ss, sh, rowNum, opts) {
  opts = opts || {};
  var v = sh.getRange(rowNum, 1, 1, 8).getValues()[0];
  var tglIso = _normTgl(v[LH.COL.tanggal]);
  var ulp = opts.ulp || LH.ULP;
  var c4a = _lhC4aFromRow(v);
  var up3 = buildLaporanUP3(tglIso, ulp, {
    c4a: c4a,
    tindakLanjutGangguan: opts.tindakLanjutGangguan,
  });
  var uiw = buildLaporanWilayah(tglIso, ulp, { cuaca: opts.cuaca });
  sh.getRange(rowNum, LH.COL.lapUp3 + 1).setValue(up3);
  sh.getRange(rowNum, LH.COL.lapUiw + 1).setValue(uiw);
  return { tanggal: tglIso, up3: up3, uiw: uiw };
}

/* ===== 1) TRIGGER HARIAN 00:00 — baris tanggal baru ===== */
function ensureLaporanHarianHariIni() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID),
    sh = _lhSheet(ss);
  var rowNum = _lhEnsureRow(sh, _lhToday());
  var res = _lhRecalcRow(ss, sh, rowNum, { cuaca: "Cerah" });
  return { ok: true, tanggal: res.tanggal, row: rowNum };
}

/* ===== 2) WEB — simpan C4A (HARI INI saja) + regenerate ===== */
// params: { tanggal, ulp, c4a:{penyulang,realisasi,temuan,eksekusi}, cuaca, tindakLanjutGangguan }
function simpanLaporanHarianWeb(params) {
  try {
    params = params || {};
    var tglIso = _normTgl(params.tanggal) || _lhToday();
    var today = _lhToday();
    if (tglIso !== today) {
      return {
        ok: false,
        readOnly: true,
        message:
          "Pengeditan hanya untuk hari ini (" +
          today +
          "). Tanggal lain hanya dapat dilihat.",
      };
    }
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID),
      sh = _lhSheet(ss);
    var rowNum = _lhEnsureRow(sh, tglIso);
    var c = params.c4a || {};
    // Paksa kolom input C4A (C..F: Penyulang, Realisasi kmS, Temuan, Eksekusi) sebagai TEKS
    // agar nilai seperti "4,1" tidak diubah otomatis oleh Sheets menjadi tanggal/angka.
    sh.getRange(rowNum, LH.COL.penyulang + 1, 1, 4).setNumberFormat("@");
    sh.getRange(rowNum, LH.COL.penyulang + 1).setValue(
      String(c.penyulang || "").trim(),
    );
    sh.getRange(rowNum, LH.COL.panjang + 1).setValue(
      String(c.realisasi || "").trim(),
    );
    sh.getRange(rowNum, LH.COL.temuan + 1).setValue(
      String(c.temuan || "").trim(),
    );
    sh.getRange(rowNum, LH.COL.eksekusi + 1).setValue(
      String(c.eksekusi || "").trim(),
    );
    var res = _lhRecalcRow(ss, sh, rowNum, {
      ulp: params.ulp,
      cuaca: params.cuaca,
      tindakLanjutGangguan: params.tindakLanjutGangguan,
    });
    return { ok: true, tanggal: tglIso, waText: res.up3, waTextUiw: res.uiw };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

/* ===== WEB — muat baris (C4A + teks + status editable) ===== */
function getLaporanHarianRow(params) {
  try {
    params = params || {};
    var tglIso = _normTgl(params.tanggal) || _lhToday();
    var today = _lhToday();
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID),
      sh = _lhSheet(ss);
    var rowNum = _lhFindRow(sh, tglIso);
    var sumber = "aktif";
    // FALLBACK ARSIP (Pola A, 10 Agu 2026): tanggal <= H-2 sudah dipindah Tek-Migrasi ->
    // baca barisnya dari ARSIP agar laporan lama tetap bisa DILIHAT (read-only).
    if (
      !rowNum &&
      typeof SPREADSHEET_ID_ARSIP !== "undefined" &&
      SPREADSHEET_ID_ARSIP
    ) {
      try {
        var shA = SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP).getSheetByName(
          LH.SHEET,
        );
        if (shA) {
          var rA = _lhFindRow(shA, tglIso);
          if (rA) {
            sh = shA;
            rowNum = rA;
            sumber = "arsip";
          }
        }
      } catch (eA) {
        Logger.log("getLaporanHarianRow: fallback arsip gagal — " + eA);
      }
    }
    var c4a = { penyulang: "", realisasi: "", temuan: "", eksekusi: "" },
      up3 = "",
      uiw = "";
    if (rowNum) {
      var v = sh.getRange(rowNum, 1, 1, 8).getValues()[0];
      c4a = _lhC4aFromRow(v);
      up3 = String(v[LH.COL.lapUp3] || "");
      uiw = String(v[LH.COL.lapUiw] || "");
    }
    return {
      ok: true,
      tanggal: tglIso,
      editable: tglIso === today && sumber === "aktif",
      exists: !!rowNum,
      sumber: sumber,
      c4a: c4a,
      waText: up3,
      waTextUiw: uiw,
    };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

/* ===== 3) APPSHEET / TIM — regenerate (logika SAMA dgn web) ===== */
// params: { tanggal, ulp, cuaca }. Tak membatasi hari (boleh tanggal mana pun).
function refreshLaporanHarian(params) {
  try {
    params = params || {};
    var tglIso = _normTgl(params.tanggal) || _lhToday();
    // GUARD MIGRASI (10 Agu 2026): tanggal <= H-2 sudah di arsip -> jangan regen/buat baris di aktif.
    if (typeof _tglSudahDiarsip_ === "function" && _tglSudahDiarsip_(tglIso)) {
      return {
        ok: true,
        skipped: "diarsip",
        tanggal: tglIso,
        message:
          "Tanggal <= H-2 sudah diarsip — tidak dibuat ulang di file aktif.",
      };
    }
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID),
      sh = _lhSheet(ss);
    var rowNum = _lhEnsureRow(sh, tglIso);
    if (!rowNum) return { ok: true, skipped: "diarsip", tanggal: tglIso };
    var res = _lhRecalcRow(ss, sh, rowNum, {
      ulp: params.ulp,
      cuaca: params.cuaca,
    });
    return { ok: true, tanggal: tglIso, waText: res.up3, waTextUiw: res.uiw };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

// Refresh khusus HARI INI (utk trigger berkala "selalu update saat tim ubah data").
function refreshLaporanHarianHariIni() {
  return refreshLaporanHarian({ tanggal: _lhToday() });
}

/* ===== ANTREAN ASYNC LAPORAN (mark-dirty + trigger tiap 1 menit) =====
   doPost(action:'refreshLaporan') cuma MENANDAI tanggal "dirty" via PropertiesService
   (ringan, TANPA buka spreadsheet) lalu balas SEKETIKA -> sync AppSheet tidak menunggu.
   LOCK: markLaporanDirty_ & klaim drainLaporanDirty pakai getUserLock (BUKAN getScriptLock)
   supaya enqueue tak antre di belakang job berat (recalcTick/drainAntreanP0/refresh*) -> doPost ~0.2 dtk.
   Rebuild berat (buildLaporanUP3 + buildLaporanWilayah -> tulis kolom G/H) dikerjakan
   backend drainLaporanDirty (tiap 1 menit), dedup otomatis per tanggal.
   SETUP: ikut terpasang oleh pasangTriggerLaporanHarian(); manual: createLaporanDrainTrigger(). */
var LAPORAN_DIRTY_PROP = "LAPORAN_DIRTY_DATES"; // JSON: { "yyyy-MM-dd": dirtyAtMillis }

// Tandai 1 tanggal laporan "perlu rebuild" (dedup; aman dipanggil sangat sering).
// tglIso kosong -> pakai hari ini (Asia/Jakarta). Ringan: hanya tulis PropertiesService.
function markLaporanDirty_(tglIso) {
  tglIso = _normTgl(tglIso || "") || _lhToday();
  // LOCK TERPISAH (getUserLock, BUKAN getScriptLock): enqueue ringan ini tidak ikut antre
  // di belakang job berat (drainAntreanP0/recalcTick/refresh*) yang memakai getScriptLock.
  var lock = LockService.getUserLock();
  try {
    lock.waitLock(2000);
  } catch (e) {}
  try {
    var props = PropertiesService.getScriptProperties();
    var map = {};
    try {
      map = JSON.parse(props.getProperty(LAPORAN_DIRTY_PROP) || "{}");
    } catch (e2) {
      map = {};
    }
    map[tglIso] = Date.now();
    props.setProperty(LAPORAN_DIRTY_PROP, JSON.stringify(map));
    return tglIso;
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

// HANDLER TRIGGER (tiap 1 menit): rebuild semua tanggal yang ditandai "dirty".
function drainLaporanDirty() {
  var props = PropertiesService.getScriptProperties();
  var map = {};
  try {
    map = JSON.parse(props.getProperty(LAPORAN_DIRTY_PROP) || "{}");
  } catch (e) {
    map = {};
  }
  if (!Object.keys(map).length) return;

  // Klaim snapshot lalu kosongkan flag (input baru selama rebuild akan menandai ulang).
  var claimed = {};
  // getUserLock: sama dgn markLaporanDirty_ (saling-eksklusif utk flag), lepas dari getScriptLock job berat.
  var lock = LockService.getUserLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return;
  }
  try {
    map = {};
    try {
      map = JSON.parse(props.getProperty(LAPORAN_DIRTY_PROP) || "{}");
    } catch (e2) {
      map = {};
    }
    var ks = Object.keys(map);
    for (var i = 0; i < ks.length; i++) claimed[ks[i]] = map[ks[i]];
    props.deleteProperty(LAPORAN_DIRTY_PROP);
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }

  // Rebuild TANPA lock (refreshLaporanHarian buka spreadsheet sendiri).
  var gagal = {};
  var dd = Object.keys(claimed);
  for (var j = 0; j < dd.length; j++) {
    try {
      refreshLaporanHarian({ tanggal: dd[j] });
    } catch (eRun) {
      // build UP3 + UIW lalu tulis sheet
      gagal[dd[j]] = Date.now();
    }
  }

  // Kembalikan tanggal yang GAGAL ke flag dirty (best-effort) agar dicoba lagi tick berikutnya.
  if (Object.keys(gagal).length) {
    try {
      lock.waitLock(10000);
    } catch (e) {
      return;
    }
    try {
      var cur = {};
      try {
        cur = JSON.parse(props.getProperty(LAPORAN_DIRTY_PROP) || "{}");
      } catch (e3) {
        cur = {};
      }
      var gk = Object.keys(gagal);
      for (var g = 0; g < gk.length; g++)
        if (!cur[gk[g]]) cur[gk[g]] = gagal[gk[g]];
      props.setProperty(LAPORAN_DIRTY_PROP, JSON.stringify(cur));
    } finally {
      try {
        lock.releaseLock();
      } catch (e) {}
    }
  }
}

// SETUP sekali: pasang trigger drainLaporanDirty tiap 1 menit (idempoten).
// Batalkan trigger drain laporan.
function hapusLaporanDrainTrigger() {
  var all = ScriptApp.getProjectTriggers();
  var n = 0;
  for (var i = 0; i < all.length; i++) {
    if (all[i].getHandlerFunction() === "drainLaporanDirty") {
      ScriptApp.deleteTrigger(all[i]);
      n++;
    }
  }
  return "Trigger drainLaporanDirty dihapus: " + n;
}

// Handler webhook AppSheet (LEGACY route). Body JSON: { secret, action:'refreshLaporan', tanggal? }
// MODE ASYNC: hanya tandai tanggal "dirty" lalu balas seketika; rebuild oleh drainLaporanDirty.
function _lhHandleWebhook(body) {
  body = body || {};
  if (String(body.secret || "") !== WEBHOOK_SECRET)
    return { ok: false, message: "Unauthorized" };
  var tgl = markLaporanDirty_(body.tanggal);
  return { ok: true, mode: "queued", queued: true, tanggal: tgl };
}

/* ===== Pemasang trigger (jalankan SEKALI dari editor Apps Script) ===== */
/* =====================================================
   MOBILE "Laporan UP3 / UIW" — Rev 20 Agu 2026 (OPTIMASI BACA)
   Jembatan sub-menu mobile Laporan UP3 / UIW (SiSi Mobile):
     - getMobileLaporanUp3Uiw  : baca baris Teknik_Laporan Harian (default hari ini) —
                                 C4A (kolom C..F) + kolom G (UP3) + kolom H (UIW)
                                 + statusTim per tim (sudah/belum ada laporan hari ini).
     - simpanMobileLaporanC4A  : tulis kolom C..F (input C4A) HARI INI + regenerate kolom
                                 G (UP3) & H (UIW) — delegasi ke simpanLaporanHarianWeb.
   OPTIMASI Rev 20 Agu:
     1) Hasil baca di-cache (CacheService) per (ULP, tanggal) selama 2 menit —
        buka ulang sub-menu di bawah 1 detik. Cache dibuang otomatis saat C4A disimpan.
     2) statusTim hanya memindai 1000 baris TERAKHIR tiap sheet (data terbaru
        selalu di bawah) — tidak lagi getDataRange() penuh pada sheet yang
        terus membesar (inilah penyebab bacaan menembus 30 detik).
   ===================================================== */

var LAP_MOBILE_CACHE_TTL = 120; // detik — kesegaran data maks 2 menit
var LAP_MOBILE_STATUS_MAXROWS = 1000; // jendela baris terakhir utk statusTim

function _lapMobileCacheKey_(ulp, tglIso) {
  return "lapUp3Uiw_" + ulp + "_" + tglIso;
}

// Baca hanya N baris TERAKHIR sheet (data terbaru selalu di bawah) — jauh lebih
// cepat daripada memindai seluruh sheet yang terus membesar dari waktu ke waktu.
function _lapRecentRows_(sh, maxRows) {
  if (!sh) return [];
  var lastRow = sh.getLastRow();
  if (lastRow <= 1) return [];
  var startRow = Math.max(2, lastRow - maxRows + 1);
  return sh
    .getRange(startRow, 1, lastRow - startRow + 1, sh.getLastColumn())
    .getValues();
}

// Status per tim utk tanggal: true = tim tsb SUDAH punya data/laporan hari ini (masuk laporan).
// Sumber: ROW 01-04 = db_ROW_Realisasi (kolom Tim); Hartek = db_Hartek_PenyulangGardu;
// Inspeksi Jaringan = db_InsJar_Realisasi; Inspeksi Gardu = db_InsDu_Realisasi (baris ber-identitas gardu).
function _statusTimLaporan_(ss, ulp, tglIso) {
  var status = {
    "ROW 01": false,
    "ROW 02": false,
    "ROW 03": false,
    "ROW 04": false,
    Hartek: false,
    "Inspeksi Jaringan": false,
    "Inspeksi Gardu": false,
  };
  var ulpMap = _lapUlpMapDual_();
  // ROW per tim (db_ROW_Realisasi)
  try {
    var dR = _lapRecentRows_(
      ss.getSheetByName(LAP_UP3.ROW_RLZ),
      LAP_MOBILE_STATUS_MAXROWS,
    );
    for (var i = 0; i < dR.length; i++) {
      var kh = String(dR[i][COL_ROW_RLZ.kodeHeader] || "").trim();
      if ((ulpMap[kh] || "") !== ulp) continue;
      if (_normTgl(dR[i][COL_ROW_RLZ.tanggal]) !== tglIso) continue;
      var tim = String(dR[i][COL_ROW_RLZ.tim] || "").trim();
      if (Object.prototype.hasOwnProperty.call(status, tim)) status[tim] = true;
    }
  } catch (eR) {
    Logger.log("_statusTimLaporan_ ROW: " + eR);
  }
  // Hartek (db_Hartek_PenyulangGardu)
  try {
    var dH = _lapRecentRows_(
      ss.getSheetByName(LAP_UP3.HTK_PG),
      LAP_MOBILE_STATUS_MAXROWS,
    );
    for (var h = 0; h < dH.length; h++) {
      if (String(dH[h][COL_HTK.PG.ulp] || "").trim() !== ulp) continue;
      if (_normTgl(dH[h][COL_HTK.PG.tanggal]) !== tglIso) continue;
      status["Hartek"] = true;
      break;
    }
  } catch (eH) {
    Logger.log("_statusTimLaporan_ Hartek: " + eH);
  }
  // Inspeksi Jaringan (db_InsJar_Realisasi)
  try {
    var dJ = _lapRecentRows_(
      ss.getSheetByName(LAP_UP3.INSJAR),
      LAP_MOBILE_STATUS_MAXROWS,
    );
    for (var j = 0; j < dJ.length; j++) {
      var khJ = String(dJ[j][COL_INS.REALISASI.kodeHeader] || "").trim();
      if ((ulpMap[khJ] || "") !== ulp) continue;
      if (_normTgl(dJ[j][COL_INS.REALISASI.tanggal]) !== tglIso) continue;
      status["Inspeksi Jaringan"] = true;
      break;
    }
  } catch (eJ) {
    Logger.log("_statusTimLaporan_ InsJar: " + eJ);
  }
  // Inspeksi Gardu (db_InsDu_Realisasi) — hanya baris ber-identitas gardu (sama dgn builder)
  try {
    var dG = _lapRecentRows_(
      ss.getSheetByName(LAP_UP3.INSDU),
      LAP_MOBILE_STATUS_MAXROWS,
    );
    for (var g = 0; g < dG.length; g++) {
      var khG = String(dG[g][COL_INSDU.REALISASI.kodeHeader] || "").trim();
      if ((ulpMap[khG] || "") !== ulp) continue;
      if (_normTgl(dG[g][COL_INSDU.REALISASI.tanggal]) !== tglIso) continue;
      if (
        !String(dG[g][COL_INSDU.REALISASI.nomorGardu] || "").trim() &&
        !String(dG[g][COL_INSDU.REALISASI.kodePekerjaanGardu] || "").trim()
      )
        continue;
      status["Inspeksi Gardu"] = true;
      break;
    }
  } catch (eG) {
    Logger.log("_statusTimLaporan_ InsDu: " + eG);
  }
  return status;
}

// BACA utk mobile: baris Teknik_Laporan Harian (default hari ini) + statusTim.
// Rev 20 Agu: hasil di-cache 2 menit per (ULP, tanggal) — buka ulang di bawah 1 detik.
// params: { tanggal? } -> { ok, tanggal, editable, exists, c4a, waUp3, waUiw, statusTim }
function getMobileLaporanUp3Uiw(params) {
  try {
    params = params || {};
    var tglIso = _normTgl(params.tanggal) || _lhToday();
    var cache = CacheService.getScriptCache();
    var key = _lapMobileCacheKey_(LH.ULP, tglIso);
    var cached = cache.get(key);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (eParse) {
        /* cache rusak -> hitung ulang */
      }
    }
    var row = getLaporanHarianRow({ tanggal: tglIso });
    if (!row || row.ok !== true)
      return {
        ok: false,
        message: (row && row.message) || "Gagal membaca Teknik_Laporan Harian.",
      };
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var statusTim = _statusTimLaporan_(ss, LH.ULP, tglIso);
    var result = {
      ok: true,
      tanggal: row.tanggal,
      editable: row.editable,
      exists: row.exists,
      c4a: row.c4a,
      waUp3: row.waText, // kolom G — Laporan UP3
      waUiw: row.waTextUiw, // kolom H — Laporan UIW
      statusTim: statusTim,
    };
    try {
      cache.put(key, JSON.stringify(result), LAP_MOBILE_CACHE_TTL);
    } catch (ePut) {
      Logger.log("cache put: " + ePut);
    }
    return result;
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

// TULIS C4A (kolom C..F) dari mobile + regenerate kolom G & H (trigger laporan harian UIW/UP3).
// Rev 20 Agu: cache bacaan untuk tanggal tsb dibuang supaya status/teks berikutnya segar.
// params: { token, tanggal?, penyulang, realisasi, temuan, eksekusi }
function simpanMobileLaporanC4A(params) {
  try {
    params = params || {};
    var sesi = getSesiByToken(String(params.token || "").trim());
    if (!sesi)
      return { ok: false, message: "Sesi habis, silakan login ulang." };
    var res = simpanLaporanHarianWeb({
      tanggal: params.tanggal,
      c4a: {
        penyulang: params.penyulang,
        realisasi: params.realisasi,
        temuan: params.temuan,
        eksekusi: params.eksekusi,
      },
    });
    try {
      var tglIso = _normTgl(params.tanggal) || _lhToday();
      CacheService.getScriptCache().remove(_lapMobileCacheKey_(LH.ULP, tglIso));
    } catch (eRem) {
      Logger.log("cache remove: " + eRem);
    }
    return res;
  } catch (e) {
    return { ok: false, message: e.message };
  }
}
