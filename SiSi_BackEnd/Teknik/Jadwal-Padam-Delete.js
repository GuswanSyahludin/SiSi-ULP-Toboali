/* Single-row deletion for outage schedules. Never delete by date alone. */
function hapusJadwalPadam(payload) {
  var lock = LockService.getScriptLock();
  try {
    var g = guard_(arguments, { ulp: true, aksi: "hapusJadwalPadam" });
    payload = payload || {};

    var kode = _jpText_(payload.kode);
    if (!kode) return { ok: false, message: "Kode jadwal wajib diisi." };

    var sh = _jpSheet_(JADWAL_PADAM_SHEETS.rekap);
    if (!sh || sh.getLastRow() < 2)
      return { ok: false, message: "Data jadwal tidak ditemukan." };
    var headers = _jpHeaders_(sh), map = _jpHeaderMap_(headers),
      kodeIdx = map[_jpHeaderKey_("Kode Jadwal Padam")],
      ulpIdx = map[_jpHeaderKey_("ULP")],
      statusIdx = map[_jpHeaderKey_("Status Jadwal Padam")];
    if (statusIdx == null) statusIdx = map[_jpHeaderKey_("Status Jadwal Pekerjaan")];
    if (statusIdx == null) statusIdx = map[_jpHeaderKey_("Status")];
    if (kodeIdx == null || ulpIdx == null || statusIdx == null)
      return { ok: false, message: "Kolom kode, ULP, atau status tidak ditemukan." };

    lock.waitLock(10000);
    var values = sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getDisplayValues();
    var matches = [];
    for (var i = 0; i < values.length; i++) {
      if (_jpText_(values[i][kodeIdx]) === kode) matches.push({ row: i + 2, values: values[i] });
    }
    if (matches.length === 0) return { ok: false, message: "Jadwal tidak ditemukan." };
    if (matches.length !== 1) return { ok: false, message: "Kode jadwal tidak unik; penghapusan ditolak." };

    var target = matches[0], targetUlp = _jpText_(target.values[ulpIdx]);
    if (!g.isSuper && (!_jpUlpKey_(targetUlp) || _jpUlpKey_(targetUlp) !== _jpUlpKey_(g.ulp))) {
      if (typeof audit_ === "function") audit_(g.sesi, "hapusJadwalPadam", kode, "TOLAK", "jadwal milik ULP lain");
      return { ok: false, message: "Jadwal bukan milik ULP Anda." };
    }

    var status = _jpText_(target.values[statusIdx]) || "Terjadwal";
    if (status !== "Terjadwal")
      return { ok: false, message: "Jadwal berstatus " + status + " tidak dapat dihapus." };

    sh.deleteRow(target.row);
    SpreadsheetApp.flush();
    _jpBustCalendarCache_();
    return { ok: true, kode: kode, message: "Jadwal " + kode + " berhasil dihapus." };
  } catch (e) {
    return { ok: false, message: "Gagal menghapus jadwal: " + e.message };
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}
