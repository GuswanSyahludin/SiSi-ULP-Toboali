/* Section-volume aggregation for Data Pendukung CheckPoint.
   Volume is the number of finding rows. Tier comes from db_List_Temuan.
   Units: Tebang -> Btg, Pohon/Rabas/Pangkas/Vegetasi -> Gwg, others -> Titik. */
function _dpgTemuanTierMaster_() {
  var map = {};
  var sh = _ssIns().getSheetByName('db_List_Temuan');
  if (!sh || sh.getLastRow() < 2) return map;
  var data = sh.getDataRange().getValues();
  var headers = data[0].map(function (v) {
    return String(v || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  });
  function find(names, fallback) {
    for (var i = 0; i < names.length; i++) {
      var index = headers.indexOf(names[i]);
      if (index >= 0) return index;
    }
    return fallback;
  }
  var temuanCol = find(['temuan', 'namatemuan', 'jenisitemtemuan'], 3);
  var tierCol = find(['tier', 'kategoritier', 'inspeksi'], 1);
  for (var r = 1; r < data.length; r++) {
    var name = String(data[r][temuanCol] || '').trim();
    var rawTier = String(data[r][tierCol] || '').trim();
    if (!name) continue;
    var match = rawTier.match(/(?:tier\s*)?([12])/i);
    if (match) map[name.toLowerCase()] = 'Tier ' + match[1];
  }
  return map;
}

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
    var tierMaster = _dpgTemuanTierMaster_();
    var sections = {}, grouped = {}, total = 0;
    function unitFor(name) {
      var n = String(name || '').toLowerCase();
      if (/tebang/.test(n)) return 'Btg';
      if (/pohon|rabas|pangkas|vegetasi/.test(n)) return 'Gwg';
      return 'Titik';
    }
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (!String(row[C.kodePekerjaan] || '').trim()) continue;
      var date = _normTgl(row[C.tanggal]);
      if (!date || String(date).slice(0, 4) !== String(tahun)) continue;
      var penyulang = String(row[C.penyulang] || '').trim();
      var temuan = String(row[C.temuan] || '').trim();
      var section = String(row[C.section] || '').trim();
      var ulp = String(row[C.ulp] || '').trim();
      if (penyF && penyulang.toLowerCase() !== penyF) continue;
      if (temF && temuan.toLowerCase() !== temF) continue;
      if (ulpF && ulp.toLowerCase() !== ulpF) continue;
      if (secF && section.toLowerCase() !== secF) continue;
      if (!temuan || !section) continue;
      sections[section] = true;
      var key = temuan.toLowerCase();
      if (!grouped[key]) grouped[key] = {
        temuan: temuan,
        tier: tierMaster[key] || 'Belum dipetakan',
        unit: unitFor(temuan),
        volume: 0,
        bySection: {},
      };
      grouped[key].volume++;
      grouped[key].bySection[section] =
        (grouped[key].bySection[section] || 0) + 1;
      total++;
    }
    return {
      ok: true,
      tahun: tahun,
      totalVolume: total,
      sections: Object.keys(sections).sort(function (a, b) {
        return a.localeCompare(b);
      }),
      rows: Object.keys(grouped).map(function (key) {
        return grouped[key];
      }).sort(function (a, b) {
        var tierOrder = String(a.tier).localeCompare(String(b.tier));
        return tierOrder || a.temuan.localeCompare(b.temuan);
      }),
    };
  } catch (e) {
    return {
      ok: false,
      message: e.message,
      totalVolume: 0,
      sections: [],
      rows: [],
    };
  }
}
