/* Laporan harian retry guard.
   Menjaga tanggal tetap dirty bila refreshLaporanHarian mengembalikan ok:false,
   dan membuang cache mobile setelah rebuild berhasil. */

function drainLaporanDirtySafe() {
  var props = PropertiesService.getScriptProperties();
  var map = {};
  try {
    map = JSON.parse(props.getProperty(LAPORAN_DIRTY_PROP) || "{}");
  } catch (e) {
    map = {};
  }
  if (!Object.keys(map).length) return { ok: true, processed: 0, failed: 0 };

  var claimed = {};
  var lock = LockService.getUserLock();
  try {
    lock.waitLock(10000);
  } catch (eLock) {
    return { ok: false, skipped: "lock", message: String(eLock) };
  }
  try {
    try {
      map = JSON.parse(props.getProperty(LAPORAN_DIRTY_PROP) || "{}");
    } catch (eJson) {
      map = {};
    }
    var keys = Object.keys(map);
    for (var i = 0; i < keys.length; i++) claimed[keys[i]] = map[keys[i]];
    props.deleteProperty(LAPORAN_DIRTY_PROP);
  } finally {
    try { lock.releaseLock(); } catch (eRelease) {}
  }

  var gagal = {};
  var dates = Object.keys(claimed);
  var processed = 0;
  for (var j = 0; j < dates.length; j++) {
    var tanggal = dates[j];
    try {
      var hasil = refreshLaporanHarian({ tanggal: tanggal });
      if (!hasil || hasil.ok !== true) {
        gagal[tanggal] = claimed[tanggal] || Date.now();
        Logger.log(
          "drainLaporanDirtySafe: rebuild gagal " + tanggal + " — " +
          String((hasil && hasil.message) || "hasil kosong"),
        );
        continue;
      }
      processed++;
      try {
        CacheService.getScriptCache().remove(_lapMobileCacheKey_(LH.ULP, tanggal));
      } catch (eCache) {
        Logger.log("drainLaporanDirtySafe: cache remove gagal " + tanggal + " — " + eCache);
      }
    } catch (eRun) {
      gagal[tanggal] = claimed[tanggal] || Date.now();
      Logger.log("drainLaporanDirtySafe: exception " + tanggal + " — " + eRun);
    }
  }

  if (Object.keys(gagal).length) {
    try {
      lock.waitLock(10000);
    } catch (eLock2) {
      // Jangan kehilangan antrean walau lock kedua gagal: best effort tanpa menimpa input baru.
      return { ok: false, processed: processed, failed: Object.keys(gagal).length, message: String(eLock2) };
    }
    try {
      var current = {};
      try {
        current = JSON.parse(props.getProperty(LAPORAN_DIRTY_PROP) || "{}");
      } catch (eJson2) {
        current = {};
      }
      var failedDates = Object.keys(gagal);
      for (var k = 0; k < failedDates.length; k++) {
        if (!current[failedDates[k]]) current[failedDates[k]] = gagal[failedDates[k]];
      }
      props.setProperty(LAPORAN_DIRTY_PROP, JSON.stringify(current));
    } finally {
      try { lock.releaseLock(); } catch (eRelease2) {}
    }
  }

  return {
    ok: Object.keys(gagal).length === 0,
    processed: processed,
    failed: Object.keys(gagal).length,
  };
}

// Arahkan scheduler pusat ke worker aman tanpa mengubah kontrak webhook lama.
if (typeof TRIGGER_SISI_TUGAS !== "undefined") {
  for (var _lhFixI = 0; _lhFixI < TRIGGER_SISI_TUGAS.length; _lhFixI++) {
    if (TRIGGER_SISI_TUGAS[_lhFixI].fn === "drainLaporanDirty") {
      TRIGGER_SISI_TUGAS[_lhFixI].fn = "drainLaporanDirtySafe";
      break;
    }
  }
}
