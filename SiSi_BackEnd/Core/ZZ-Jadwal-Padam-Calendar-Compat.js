/* Calendar compatibility: use the same master-backed load and ENS calculation as the schedule list. */
function getJadwalPadamCalendarMonth(params) {
  try {
    params = params || {};
    var year = Number(params.year),
      month = Number(params.month),
      ulp = _jpText_(params.ulp);
    if (year < 2000 || year > 2100 || month < 1 || month > 12)
      return { ok: false, rows: [], message: "Bulan kalender tidak valid." };

    var monthKey = year + "-" + ("0" + month).slice(-2),
      cacheKey =
        "jpCal|" +
        _jpCalendarVersion_() +
        "|" +
        monthKey +
        "|" +
        _jpUlpKey_(ulp),
      cache = CacheService.getScriptCache(),
      hit = cache.get(cacheKey);
    if (hit) {
      try {
        var cached = JSON.parse(hit);
        cached.cached = true;
        return cached;
      } catch (ignore) {}
    }

    var firstDay = year + "-" + ("0" + month).slice(-2) + "-01",
      lastDayNumber = new Date(year, month, 0).getDate(),
      lastDay =
        year +
        "-" +
        ("0" + month).slice(-2) +
        "-" +
        ("0" + lastDayNumber).slice(-2),
      pageSize = 100,
      first = getJadwalPadamList({
        tglDari: firstDay,
        tglSampai: lastDay,
        ulp: ulp,
        page: 1,
        pageSize: pageSize,
      });

    if (!first || first.ok !== true)
      return {
        ok: false,
        rows: [],
        month: monthKey,
        message: (first && first.message) || "Gagal memuat jadwal kalender.",
      };

    var sourceRows = first.rows || [],
      totalPages = Number(first.totalPages) || 1;
    for (var page = 2; page <= totalPages; page++) {
      var next = getJadwalPadamList({
        tglDari: firstDay,
        tglSampai: lastDay,
        ulp: ulp,
        page: page,
        pageSize: pageSize,
      });
      if (!next || next.ok !== true) break;
      sourceRows = sourceRows.concat(next.rows || []);
    }

    var rows = sourceRows.map(function (item) {
      return {
        kode: _jpText_(item.kode),
        tanggal: _jpTgl_(item.tanggal),
        hari: _jpText_(item.hari) || _jpHari_(item.tanggal),
        ulp: _jpText_(item.ulp),
        penyulang: _jpText_(item.penyulang),
        section: _jpText_(item.section),
        jenis: _jpText_(item.jenis),
        jamPadam: _jpTimeText_(item.jamPadam),
        jamNyala: _jpTimeText_(item.jamNyala),
        durasi: Number(item.durasi) || 0,
        jumlahGardu: Number(item.jumlahGardu) || 0,
        jumlahPelanggan: Number(item.jumlahPelanggan) || 0,
        daerah: _jpText_(item.daerah),
        lokasi: _jpText_(item.lokasi),
        bebanA: item.bebanA == null ? "" : item.bebanA,
        ensRupiah: item.ensRupiah == null ? "" : item.ensRupiah,
        status: _jpText_(item.status) || "Terjadwal",
        statusPekerjaan: _jpText_(item.statusPekerjaan) || "Padam",
      };
    });

    var result = { ok: true, rows: rows, month: monthKey, cached: false };
    try {
      cache.put(cacheKey, JSON.stringify(result), JADWAL_CALENDAR_CACHE_TTL);
    } catch (ignorePut) {}
    return result;
  } catch (e) {
    return {
      ok: false,
      rows: [],
      message: "Gagal memuat kalender: " + e.message,
    };
  }
}
