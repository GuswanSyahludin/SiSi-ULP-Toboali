/*
 * Kontrak stabil getSemuaLaporan untuk SisiRun.
 * SisiRun menyisipkan token sesi sebagai argumen pertama. Implementasi lama
 * membungkus fungsi lewat (this), tetapi global Apps Script bukan object biasa,
 * sehingga wrapper dapat tidak pernah terpasang. Definisi top-level ini sengaja
 * menjadi implementasi final dan menerima dua bentuk:
 *   UI     : getSemuaLaporan(token, dari, sampai, tim, penyulang)
 *   internal/test: getSemuaLaporan(dari, sampai, tim, penyulang)
 */
function getSemuaLaporan(tokenOrDari, dariOrSampai, sampaiOrTim, timOrPenyulang, penyulangArg) {
  try {
    var pola = typeof TOKEN_POLA !== 'undefined'
      ? TOKEN_POLA
      : /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    var pakaiToken = typeof tokenOrDari === 'string' && pola.test(String(tokenOrDari).trim());

    if (pakaiToken && typeof guard_ === 'function') {
      guard_(arguments, { aksi: 'getSemuaLaporan' });
    }

    var tglMulai = pakaiToken ? dariOrSampai : tokenOrDari;
    var tglAkhir = pakaiToken ? sampaiOrTim : dariOrSampai;
    var tim = pakaiToken ? timOrPenyulang : sampaiOrTim;
    var penyulang = pakaiToken ? penyulangArg : timOrPenyulang;

    var RL = COL_ROW_RLZ;
    var data = _readSheetDual_('db_ROW_Realisasi', RL.kodePekerjaan, COL_ROW_RLZ_N) || [];
    var fDari = tglMulai ? _normTgl(tglMulai) : '';
    var fSampai = tglAkhir ? _normTgl(tglAkhir) : '';
    var fTim = tim ? String(tim).trim().toLowerCase() : '';
    var fPeny = penyulang ? String(penyulang).trim().toLowerCase() : '';

    var totBul = {};
    for (var b = 0; b < data.length; b++) {
      var rb = data[b];
      if (!String(rb[RL.kodePekerjaan] || '').trim() && !String(rb[RL.kodeHeader] || '').trim()) continue;
      var tB = _normTgl(rb[RL.tanggal]);
      if (!tB) continue;
      var k = String(rb[RL.tim] || '').trim().toLowerCase() + '|' + tB.substring(0, 7);
      if (!totBul[k]) totBul[k] = { r: 0, s: 0, b: 0 };
      totBul[k].r += Number(rb[RL.rabas]) || 0;
      totBul[k].s += Number(rb[RL.sedang]) || 0;
      totBul[k].b += Number(rb[RL.besar]) || 0;
    }

    var rows = [], no = 1;
    for (var i = 0; i < data.length; i++) {
      var r = data[i];
      if (!String(r[RL.kodePekerjaan] || '').trim() && !String(r[RL.kodeHeader] || '').trim()) continue;

      var tglStr = _normTgl(r[RL.tanggal]);
      var timR = String(r[RL.tim] || '').trim();
      var penyR = String(r[RL.penyulang] || '').trim();
      if (fDari && (!tglStr || tglStr < fDari)) continue;
      if (fSampai && (!tglStr || tglStr > fSampai)) continue;
      if (fTim && timR.toLowerCase() !== fTim) continue;
      if (fPeny && penyR.toLowerCase() !== fPeny) continue;

      var rabas = Number(r[RL.rabas]) || 0;
      var sedang = Number(r[RL.sedang]) || 0;
      var besar = Number(r[RL.besar]) || 0;
      var tb = totBul[timR.toLowerCase() + '|' + (tglStr ? tglStr.substring(0, 7) : '')] || { r: 0, s: 0, b: 0 };
      rows.push([
        no++, timR, String(r[RL.hari] || ''), tglStr,
        '-', '-', '-', '-', rabas + sedang + besar,
        tb.r, tb.s, tb.b, penyR, String(r[RL.section] || ''),
        rabas, sedang, besar, ''
      ]);
    }
    return { success: true, rows: rows };
  } catch (e) {
    return { success: false, rows: [], message: e.message };
  }
}
