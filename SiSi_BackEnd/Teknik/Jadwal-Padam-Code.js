/* Jadwal Padam: source spreadsheet eksternal */
var JADWAL_PADAM_SS_ID = "15YrBm8dNdaVZe_fIdSk4KCo3E5IXpXLAJ0A9vRjS0iI";
var JADWAL_PADAM_SHEETS = {
  rekap: "Rekap_Jadwal_Padam",
  daerah: "Master Daerah Padam",
  beban: "Master_Beban",
};
var JADWAL_PADAM_STATUSES = ["Terjadwal", "Terealisasi", "Batal Pemadaman"];
var JADWAL_PADAM_TARIF_KWH = 1444.7;
function _jpSs_() {
  return SpreadsheetApp.openById(JADWAL_PADAM_SS_ID);
}
function _jpText_(v) {
  return String(v == null ? "" : v).trim();
}
function _jpNorm_(v) {
  return _jpText_(v).toLowerCase().replace(/\s+/g, " ");
}
function _jpUlpKey_(v) {
  return _jpNorm_(v)
    .replace(/^ulp\s+/, "")
    .replace(/[^a-z0-9]/g, "");
}
function _jpSheetKey_(v) {
  return _jpText_(v)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
function _jpHeaderKey_(v) {
  return _jpNorm_(v).replace(/[^a-z0-9]/g, "");
}
function _jpSheet_(name) {
  var ss = _jpSs_(),
    direct = ss.getSheetByName(name);
  if (direct) return direct;
  var wanted = _jpSheetKey_(name),
    all = ss.getSheets();
  for (var i = 0; i < all.length; i++)
    if (_jpSheetKey_(all[i].getName()) === wanted) return all[i];
  return null;
}
function _jpRows_(name) {
  var sh = _jpSheet_(name);
  return !sh || sh.getLastRow() < 2
    ? []
    : sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
}
function _jpHeaders_(sh) {
  return sh && sh.getLastColumn()
    ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
    : [];
}
function _jpHeaderMap_(headers) {
  var m = {};
  headers.forEach(function (h, i) {
    m[_jpHeaderKey_(h)] = i;
  });
  return m;
}
function _jpGet_(row, map) {
  for (var i = 2; i < arguments.length; i++) {
    var idx = map[_jpHeaderKey_(arguments[i])];
    if (idx != null) return row[idx];
  }
  return "";
}
function _jpPut_(row, map, value) {
  for (var i = 3; i < arguments.length; i++) {
    var idx = map[_jpHeaderKey_(arguments[i])];
    if (idx != null) {
      row[idx] = value;
      return true;
    }
  }
  return false;
}
function _jpTgl_(v) {
  if (v instanceof Date && !isNaN(v.getTime()))
    return Utilities.formatDate(v, "Asia/Jakarta", "yyyy-MM-dd");
  var s = _jpText_(v),
    iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/),
    num = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (iso)
    return (
      iso[1] + "-" + ("0" + iso[2]).slice(-2) + "-" + ("0" + iso[3]).slice(-2)
    );
  if (num)
    return (
      num[3] + "-" + ("0" + num[2]).slice(-2) + "-" + ("0" + num[1]).slice(-2)
    );
  var bulan = {
    januari: 1,
    februari: 2,
    maret: 3,
    april: 4,
    mei: 5,
    juni: 6,
    juli: 7,
    agustus: 8,
    september: 9,
    oktober: 10,
    november: 11,
    desember: 12,
  };
  var lokal = s.toLowerCase().match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
  if (lokal && bulan[lokal[2]])
    return (
      lokal[3] +
      "-" +
      ("0" + bulan[lokal[2]]).slice(-2) +
      "-" +
      ("0" + lokal[1]).slice(-2)
    );
  var parsed = new Date(s);
  return isNaN(parsed.getTime())
    ? ""
    : Utilities.formatDate(parsed, "Asia/Jakarta", "yyyy-MM-dd");
}
function _jpDateObject_(value) {
  var iso = _jpTgl_(value),
    m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}
function _jpHari_(value) {
  var d = _jpDateObject_(value),
    names = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return d ? names[d.getDay()] : "";
}
function _jpTanggalLabel_(value) {
  var d = _jpDateObject_(value),
    months = [
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
  return d
    ? ("0" + d.getDate()).slice(-2) +
        " " +
        months[d.getMonth()] +
        " " +
        d.getFullYear()
    : _jpText_(value);
}
function _jpTimeText_(v) {
  if (v instanceof Date)
    return Utilities.formatDate(v, "Asia/Jakarta", "HH:mm");
  return _jpText_(v).slice(0, 5);
}
function _jpMasterContext_() {
  var sh = _jpSheet_(JADWAL_PADAM_SHEETS.daerah);
  if (!sh) throw new Error("Sheet Master Daerah Padam tidak ditemukan.");
  return { sh: sh, map: _jpHeaderMap_(_jpHeaders_(sh)) };
}
function _jpMasterRow_(row, map) {
  return {
    bebanMw: _jpGet_(row, map, "Beban MW", "Beban"),
    arus: _jpGet_(row, map, "Arus (A)", "Arus"),
    ulp: _jpText_(_jpGet_(row, map, "ULP")),
    up3: _jpText_(_jpGet_(row, map, "UP3")),
    gi: _jpText_(_jpGet_(row, map, "GI")),
    penyulang: _jpText_(_jpGet_(row, map, "Penyulang")),
    section: _jpText_(_jpGet_(row, map, "Section")),
    jumlahGardu: _jpGet_(row, map, "Jumlah Gardu"),
    jumlahPelanggan: _jpGet_(row, map, "Jumlah Pelanggan"),
    daerahSection: _jpText_(
      _jpGet_(row, map, "Daerah Section", "Daerah Padam", "Dearah Padam"),
    ),
    pelangganVip: _jpText_(
      _jpGet_(row, map, "Pelanggan VIP", "Pelanggan VIP Padam"),
    ),
  };
}
function _jpMaster_(peny, section) {
  var rows = _jpRows_(JADWAL_PADAM_SHEETS.daerah),
    ctx = _jpMasterContext_();
  for (var i = 0; i < rows.length; i++) {
    var x = _jpMasterRow_(rows[i], ctx.map);
    if (
      _jpNorm_(x.penyulang) === _jpNorm_(peny) &&
      (!section || _jpNorm_(x.section) === _jpNorm_(section))
    )
      return x;
  }
  return null;
}

function getJadwalPadamMaster(params) {
  params = params || {};
  var rows = _jpRows_(JADWAL_PADAM_SHEETS.daerah),
    ctx = _jpMasterContext_(),
    out = [];
  for (var i = 0; i < rows.length; i++) {
    var x = _jpMasterRow_(rows[i], ctx.map);
    if (!x.penyulang || !x.section) continue;
    if (params.ulp && _jpUlpKey_(x.ulp) !== _jpUlpKey_(params.ulp)) continue;
    out.push(x);
  }
  return { ok: true, rows: out };
}

function getJadwalPadamList(params) {
  params = params || {};
  var sh = _jpSheet_(JADWAL_PADAM_SHEETS.rekap);
  if (!sh)
    return {
      ok: false,
      message: "Sheet Rekap Jadwal Padam tidak ditemukan.",
      rows: [],
    };
  var rows = _jpRows_(JADWAL_PADAM_SHEETS.rekap),
    map = _jpHeaderMap_(_jpHeaders_(sh)),
    out = [],
    backfill = [];
  var idxStatusJadwal = map[_jpHeaderKey_("Status Jadwal Padam")];
  if (idxStatusJadwal == null)
    idxStatusJadwal = map[_jpHeaderKey_("Status Jadwal Pekerjaan")];
  if (idxStatusJadwal == null) idxStatusJadwal = map[_jpHeaderKey_("Status")];
  var idxStatusPekerjaan = map[_jpHeaderKey_("Status Pekerjaan")],
    idxHari = map[_jpHeaderKey_("Hari")],
    idxTanggal = map[_jpHeaderKey_("Tanggal")];
  if (idxTanggal != null && sh.getLastRow() >= 2)
    sh.getRange(2, idxTanggal + 1, sh.getLastRow() - 1, 1).setNumberFormat(
      "dd mmmm yyyy",
    );
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i],
      rawStatus = _jpText_(
        _jpGet_(
          r,
          map,
          "Status Jadwal Padam",
          "Status Jadwal Pekerjaan",
          "Status",
        ),
      ),
      rawWork = _jpText_(_jpGet_(r, map, "Status Pekerjaan")),
      status = rawStatus || "Terjadwal",
      tanggalIso = _jpTgl_(_jpGet_(r, map, "Tanggal")),
      rawHari = _jpText_(_jpGet_(r, map, "Hari")),
      hari = rawHari || _jpHari_(tanggalIso);
    if (!rawStatus && idxStatusJadwal != null)
      backfill.push({
        row: i + 2,
        col: idxStatusJadwal + 1,
        value: "Terjadwal",
      });
    if (!rawWork && idxStatusPekerjaan != null)
      backfill.push({
        row: i + 2,
        col: idxStatusPekerjaan + 1,
        value: "Padam",
      });
    if (!rawHari && hari && idxHari != null)
      backfill.push({ row: i + 2, col: idxHari + 1, value: hari });
    var item = {
      no: _jpGet_(r, map, "No"),
      kode: _jpGet_(r, map, "Kode Jadwal Padam"),
      ulp: _jpGet_(r, map, "ULP"),
      penyulang: _jpGet_(r, map, "Penyulang"),
      section: _jpGet_(r, map, "Section"),
      jenis: _jpGet_(r, map, "Jenis Pekerjaan", "Jenis Pekejaan"),
      hari: hari,
      tanggal: tanggalIso,
      tanggalLabel: _jpTanggalLabel_(tanggalIso),
      jamPadam: _jpTimeText_(_jpGet_(r, map, "Jam Padam")),
      jamNyala: _jpTimeText_(_jpGet_(r, map, "Jam Nyala")),
      durasi: _jpGet_(r, map, "Durasi"),
      jumlahGardu: _jpGet_(r, map, "Jumlah Gardu"),
      jumlahPelanggan: _jpGet_(r, map, "Jumlah Pelanggan"),
      daerah: _jpGet_(r, map, "Daerah Section", "Daerah Padam", "Dearah Padam"),
      bebanMw: _jpGet_(r, map, "Beban MW", "Beban"),
      ens: _jpGet_(r, map, "ENS"),
      vip: _jpGet_(r, map, "Pelanggan VIP", "Pelanggan VIP Padam"),
      lokasi: _jpGet_(r, map, "Lokasi Pekerjaan"),
      status: status,
      statusPekerjaan: _jpText_(_jpGet_(r, map, "Status Pekerjaan")) || "Padam",
    };
    var masterNow = _jpMaster_(item.penyulang, item.section);
    item.bebanA = masterNow ? masterNow.arus : "";
    item.ensRupiah = masterNow
      ? (Number(masterNow.bebanMw) || 0) *
        (Number(item.durasi) || 0) *
        JADWAL_PADAM_TARIF_KWH
      : "";
    if (params.ulp && _jpUlpKey_(item.ulp) !== _jpUlpKey_(params.ulp)) continue;
    if (
      params.penyulang &&
      _jpNorm_(item.penyulang) !== _jpNorm_(params.penyulang)
    )
      continue;
    if (params.section && _jpNorm_(item.section) !== _jpNorm_(params.section))
      continue;
    if (params.status && _jpNorm_(item.status) !== _jpNorm_(params.status))
      continue;
    if (
      params.statusPekerjaan &&
      _jpNorm_(item.statusPekerjaan) !== _jpNorm_(params.statusPekerjaan)
    )
      continue;
    if (params.tglDari && item.tanggal < params.tglDari) continue;
    if (params.tglSampai && item.tanggal > params.tglSampai) continue;
    out.push(item);
  }
  if (backfill.length) {
    for (var b = 0; b < backfill.length; b++)
      sh.getRange(backfill[b].row, backfill[b].col).setValue(backfill[b].value);
    SpreadsheetApp.flush();
  }
  out.sort(function (a, b) {
    return String(a.tanggal).localeCompare(String(b.tanggal));
  });
  var total = out.length,
    pageSize = Math.min(50, Math.max(1, Number(params.pageSize) || 50)),
    totalPages = Math.max(1, Math.ceil(total / pageSize)),
    page = Math.min(totalPages, Math.max(1, Number(params.page) || 1)),
    start = (page - 1) * pageSize;
  return {
    ok: true,
    rows: out.slice(start, start + pageSize),
    total: total,
    page: page,
    pageSize: pageSize,
    totalPages: totalPages,
  };
}

function getJadwalPadamMasterBeban(params) {
  params = params || {};
  var x = _jpMaster_(params.penyulang, params.section || "");
  return {
    ok: true,
    rows: x
      ? [
          {
            penyulang: x.penyulang,
            bebanMw: x.bebanMw,
            beban: x.bebanMw,
            arus: x.arus,
          },
        ]
      : [],
  };
}
function _jpParseTime_(value) {
  var m = _jpText_(value).match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  var h = Number(m[1]),
    n = Number(m[2]);
  return h < 24 && n < 60 ? h * 60 + n : null;
}
function _jpTimeDate_(value) {
  var mins = _jpParseTime_(value);
  if (mins == null) return "";
  var d = new Date(1899, 11, 30, 0, 0, 0, 0);
  d.setMinutes(mins);
  return d;
}
function simpanJadwalPadam(payload) {
  try {
    payload = payload || {};
    var token = _jpText_(payload.token),
      sesi =
        typeof getSesiByToken === "function" ? getSesiByToken(token) : null;
    if (!sesi)
      return { ok: false, message: "Sesi habis, silakan login ulang." };
    var peny = _jpText_(payload.penyulang),
      section = _jpText_(payload.section),
      jenis = _jpText_(payload.jenis),
      tanggal = _jpText_(payload.tanggal),
      jamPadam = _jpText_(payload.jamPadam),
      jamNyala = _jpText_(payload.jamNyala),
      statusPekerjaan = _jpText_(payload.statusPekerjaan);
    if (
      !peny ||
      !section ||
      !jenis ||
      !tanggal ||
      !jamPadam ||
      !jamNyala ||
      !statusPekerjaan
    )
      return {
        ok: false,
        message:
          "Penyulang, Section, jenis pekerjaan, tanggal, jam, dan status pekerjaan wajib diisi.",
      };
    if (["Padam", "Tanpa Padam"].indexOf(statusPekerjaan) === -1)
      return { ok: false, message: "Status Pekerjaan tidak valid." };
    var master = _jpMaster_(peny, section);
    if (!master)
      return {
        ok: false,
        message:
          "Penyulang dan Section tidak ditemukan di Master Daerah Padam.",
      };
    var mulai = _jpParseTime_(jamPadam),
      selesai = _jpParseTime_(jamNyala);
    if (mulai == null || selesai == null)
      return { ok: false, message: "Format jam tidak valid." };
    if (selesai < mulai) selesai += 1440;
    var durasi = (selesai - mulai) / 60,
      beban = Number(master.bebanMw) || 0,
      ensKwh = beban * durasi,
      ensRupiah = ensKwh * JADWAL_PADAM_TARIF_KWH;
    var sh = _jpSheet_(JADWAL_PADAM_SHEETS.rekap);
    if (!sh) throw new Error("Sheet Rekap Jadwal Padam tidak ditemukan.");
    var headers = _jpHeaders_(sh),
      map = _jpHeaderMap_(headers),
      row = new Array(headers.length).fill(""),
      kode =
        "JP-" +
        Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyyMMdd-HHmmss");
    _jpPut_(row, map, sh.getLastRow(), "No");
    _jpPut_(row, map, kode, "Kode Jadwal Padam");
    _jpPut_(row, map, master.ulp, "ULP");
    _jpPut_(row, map, master.penyulang, "Penyulang");
    _jpPut_(row, map, master.section, "Section");
    _jpPut_(row, map, jenis, "Jenis Pekerjaan", "Jenis Pekejaan");
    _jpPut_(row, map, _jpHari_(tanggal), "Hari");
    _jpPut_(row, map, new Date(tanggal + "T00:00:00"), "Tanggal");
    _jpPut_(row, map, _jpTimeDate_(jamPadam), "Jam Padam");
    _jpPut_(row, map, _jpTimeDate_(jamNyala), "Jam Nyala");
    _jpPut_(row, map, durasi, "Durasi");
    _jpPut_(row, map, master.jumlahGardu, "Jumlah Gardu");
    _jpPut_(row, map, master.jumlahPelanggan, "Jumlah Pelanggan");
    _jpPut_(
      row,
      map,
      master.daerahSection,
      "Daerah Section",
      "Daerah Padam",
      "Dearah Padam",
    );
    _jpPut_(row, map, master.arus, "Beban (A)", "Beban", "Arus (A)");
    _jpPut_(row, map, ensRupiah, "ENS", "ENS (Rupiah)");
    _jpPut_(
      row,
      map,
      master.pelangganVip,
      "Pelanggan VIP",
      "Pelanggan VIP Padam",
    );
    _jpPut_(row, map, _jpText_(payload.lokasi), "Lokasi Pekerjaan");
    _jpPut_(
      row,
      map,
      "Terjadwal",
      "Status Jadwal Padam",
      "Status Jadwal Pekerjaan",
      "Status",
    );
    _jpPut_(row, map, statusPekerjaan, "Status Pekerjaan");
    sh.appendRow(row);
    var savedRow = sh.getLastRow(),
      idxTgl = map[_jpHeaderKey_("Tanggal")],
      idxPadam = map[_jpHeaderKey_("Jam Padam")],
      idxNyala = map[_jpHeaderKey_("Jam Nyala")],
      idxSJ = map[_jpHeaderKey_("Status Jadwal Padam")],
      idxSP = map[_jpHeaderKey_("Status Pekerjaan")];
    if (idxSJ == null) idxSJ = map[_jpHeaderKey_("Status Jadwal Pekerjaan")];
    if (idxSJ == null) idxSJ = map[_jpHeaderKey_("Status")];
    if (idxSJ != null) sh.getRange(savedRow, idxSJ + 1).setValue("Terjadwal");
    if (idxSP != null)
      sh.getRange(savedRow, idxSP + 1).setValue(statusPekerjaan);
    if (idxTgl != null)
      sh.getRange(savedRow, idxTgl + 1).setNumberFormat("dd mmmm yyyy");
    if (idxPadam != null)
      sh.getRange(savedRow, idxPadam + 1).setNumberFormat("HH:mm");
    if (idxNyala != null)
      sh.getRange(savedRow, idxNyala + 1).setNumberFormat("HH:mm");
    SpreadsheetApp.flush();
    return { ok: true, kode: kode, message: "Jadwal padam berhasil disimpan." };
  } catch (e) {
    return { ok: false, message: "Gagal menyimpan: " + e.message };
  }
}

function updateStatusJadwalPadam(payload) {
  try {
    payload = payload || {};
    var token = _jpText_(payload.token),
      sesi =
        typeof getSesiByToken === "function" ? getSesiByToken(token) : null;
    if (!sesi)
      return { ok: false, message: "Sesi habis, silakan login ulang." };
    var kode = _jpText_(payload.kode),
      status = _jpText_(payload.status);
    if (!kode) return { ok: false, message: "Kode jadwal wajib diisi." };
    if (["Terealisasi", "Batal Pekerjaan"].indexOf(status) === -1)
      return { ok: false, message: "Status jadwal tidak valid." };
    var sh = _jpSheet_(JADWAL_PADAM_SHEETS.rekap);
    if (!sh || sh.getLastRow() < 2)
      return { ok: false, message: "Data jadwal tidak ditemukan." };
    var map = _jpHeaderMap_(_jpHeaders_(sh)),
      ik = map[_jpHeaderKey_("Kode Jadwal Padam")],
      is = map[_jpHeaderKey_("Status Jadwal Padam")];
    if (is == null) is = map[_jpHeaderKey_("Status Jadwal Pekerjaan")];
    if (is == null) is = map[_jpHeaderKey_("Status")];
    if (ik == null || is == null)
      return { ok: false, message: "Kolom kode atau status tidak ditemukan." };
    var vals = sh
        .getRange(2, ik + 1, sh.getLastRow() - 1, 1)
        .getDisplayValues(),
      row = -1;
    for (var i = 0; i < vals.length; i++) {
      if (_jpText_(vals[i][0]) === kode) {
        row = i + 2;
        break;
      }
    }
    if (row < 0) return { ok: false, message: "Jadwal tidak ditemukan." };
    sh.getRange(row, is + 1).setValue(status);
    SpreadsheetApp.flush();
    return { ok: true, message: "Status jadwal diperbarui." };
  } catch (e) {
    return { ok: false, message: "Gagal memperbarui status: " + e.message };
  }
}

function _jpWaDate_(iso) {
  return _jpTanggalLabel_(iso);
}
function _jpWaNumber_(value, digits) {
  var n = Number(value);
  if (!isFinite(n)) n = 0;
  return n.toLocaleString("id-ID", {
    minimumFractionDigits: digits || 0,
    maximumFractionDigits: digits || 0,
  });
}
function getJadwalPadamWaText(params) {
  try {
    params = params || {};
    var token = _jpText_(params.token),
      sesi =
        typeof getSesiByToken === "function" ? getSesiByToken(token) : null;
    if (!sesi)
      return { ok: false, message: "Sesi habis, silakan login ulang." };
    var dari = _jpText_(params.tglDari),
      sampai = _jpText_(params.tglSampai);
    if (!dari || !sampai || dari > sampai)
      return { ok: false, message: "Rentang tanggal tidak valid." };
    var query = {
        tglDari: dari,
        tglSampai: sampai,
        ulp: _jpText_(params.ulp),
        penyulang: _jpText_(params.penyulang),
        status: _jpText_(params.status),
        statusPekerjaan: "Padam",
        page: 1,
        pageSize: 50,
      },
      result = getJadwalPadamList(query),
      rows = result.rows || [],
      pages = Number(result.totalPages) || 1;
    for (var page = 2; page <= pages; page++) {
      query.page = page;
      rows = rows.concat(getJadwalPadamList(query).rows || []);
    }
    if (!rows.length)
      return {
        ok: false,
        message: "Tidak ada jadwal padam pada rentang tanggal tersebut.",
      };
    var lines = [
      "*RENCANA PADAM PEKERJAAN PEMELIHARAAN PENYULANG ULP TOBOALI*",
      "*Periode:* " + _jpWaDate_(dari) + " s.d. " + _jpWaDate_(sampai),
      "",
    ];
    rows.forEach(function (x, index) {
      lines.push(
        "*" +
          (index + 1) +
          ". Hari/Tanggal:* " +
          (_jpText_(x.hari) || _jpHari_(x.tanggal)) +
          ", " +
          _jpWaDate_(x.tanggal),
        "*ULP:* " + _jpText_(x.ulp),
        "*Penyulang:* " + _jpText_(x.penyulang),
        "*Section Pemadaman:* " + _jpText_(x.section),
        "*Jenis Pekerjaan:* " + _jpText_(x.jenis),
        "*Jam Padam:* " + _jpText_(x.jamPadam) + "WIB",
        "*Jam Nyala:* " + _jpText_(x.jamNyala) + "WIB",
        "*Durasi:* " +
          _jpWaNumber_((Number(_x_.durasi) || 0) * 60, 0) +
          " Menit",
        "*Daerah Padam:* " + _jpText_(x.daerah),
        "*Jumlah Gardu:* " + _jpWaNumber_(x.jumlahGardu, 0) + "Unit",
        "*Jumlah Pelanggan:* " +
          _jpWaNumber_(x.jumlahPelanggan, 0) +
          "Pelangan",
        "*Beban:* " + _jpWaNumber_(x.bebanA, 2) + " A",
        "*ENS:* Rp" + _jpWaNumber_(x.ensRupiah, 2),
        "",
      );
    });
    return {
      ok: true,
      text: lines.join("\n").replace(/\n+$/, ""),
      count: rows.length,
    };
  } catch (e) {
    return { ok: false, message: "Gagal membuat laporan WA: " + e.message };
  }
}
