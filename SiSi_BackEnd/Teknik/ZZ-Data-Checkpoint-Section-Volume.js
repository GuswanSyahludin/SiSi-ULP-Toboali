/* Section-volume aggregation for Data Pendukung CheckPoint.
   Volume is the number of finding rows. Units follow the agreed C4A rules:
   Tebang -> Btg, Pohon/Rabas/Pangkas/Vegetasi -> Gwg, other Har findings -> Titik.
   This endpoint is additive so the existing recap remains backward compatible. */
function getDpgRekapTemuanSectionVolume(opts) {
  try {
    opts = opts || {};
    var penyF = String(opts.penyulang || '').trim().toLowerCase();
    var temF = String(opts.temuan || '').trim().toLowerCase();
    var ulpF = String(opts.ulp || '').trim().toLowerCase();
    var secF = String(opts.section || '').trim().toLowerCase();
    var tahun = parseInt(opts.tahun, 10) || new Date().getFullYear();
    var C = COL_INS.TEMUAN;
    var rows = _readSheetDual_(SHEET_INS.TEMUAN, C.kodePekerjaan, C.status + 1);
    var sections = {}, grouped = {}, total = 0;
    function unitFor(name) {
      var n = String(name || '').toLowerCase();
      if (/tebang/.test(n)) return 'Btg';
      if (/pohon|rabas|pangkas|vegetasi/.test(n)) return 'Gwg';
      return 'Titik';
    }
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var code = String(r[C.kodePekerjaan] || '').trim();
      if (!code) continue;
      var date = _normTgl(r[C.tanggal]);
      if (!date || String(date).slice(0, 4) !== String(tahun)) continue;
      var penyulang = String(r[C.penyulang] || '').trim();
      var temuan = String(r[C.temuan] || '').trim();
      var section = String(r[C.section] || '').trim();
      var ulp = String(r[C.ulp] || '').trim();
      if (penyF && penyulang.toLowerCase() !== penyF) continue;
      if (temF && temuan.toLowerCase() !== temF) continue;
      if (ulpF && ulp.toLowerCase() !== ulpF) continue;
      if (secF && section.toLowerCase() !== secF) continue;
      if (!temuan || !section) continue;
      sections[section] = true;
      var key = temuan.toLowerCase();
      if (!grouped[key]) grouped[key] = { temuan: temuan, unit: unitFor(temuan), volume: 0, tier1: 0, tier2: 0, bySection: {} };
      grouped[key].volume++;
      grouped[key].bySection[section] = (grouped[key].bySection[section] || 0) + 1;
      var tier = String(r[C.tier] || '').toLowerCase();
      if (tier.indexOf('1') >= 0) grouped[key].tier1++;
      if (tier.indexOf('2') >= 0) grouped[key].tier2++;
      total++;
    }
    return { ok: true, tahun: tahun, totalVolume: total, sections: Object.keys(sections).sort(function (a, b) { return a.localeCompare(b); }), rows: Object.keys(grouped).map(function (key) { return grouped[key]; }).sort(function (a, b) { return a.temuan.localeCompare(b.temuan); }) };
  } catch (e) {
    return { ok: false, message: e.message, totalVolume: 0, sections: [], rows: [] };
  }
}
