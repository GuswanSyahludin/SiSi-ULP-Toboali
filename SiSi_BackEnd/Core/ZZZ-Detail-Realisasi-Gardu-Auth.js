/*
 * Late-loaded auth override for the public Inspeksi Gardu detail reader.
 *
 * The legacy getDetailRealisasiGardu lives in
 * Inspeksi_Gardu/Tek-InsDu-Code.js.  Main.html lists this endpoint in
 * SISI_BUTUH_TOKEN, so SisiRun invokes it as
 * getDetailRealisasiGardu(token, kodeHeader).
 *
 * Keep this small ZZZ override last-loaded: it replaces the public global
 * without rewriting the large legacy module or changing its valid response
 * contract.
 */
function getDetailRealisasiGardu(token, kodeHeader){
  try{
    /* The guard is deliberately the first operation.  No helper, spreadsheet,
       header, realisasi, or master-gardu read may happen before it succeeds. */
    var gAks = guard_(arguments, { ulp:true, aksi:'getDetailRealisasiGardu' });
    var sesiUlp = String(gAks && gAks.ulp || '').trim();
    if(!sesiUlp){
      throw new Error('Akun belum terhubung ke ULP. Hubungi Super User untuk melengkapi data akun.');
    }

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var kh = String(kodeHeader || '').trim();
    var header = _getHeaderInsByKode(ss, kh);
    if(!header) return { ok:false, message:'Header tidak ditemukan.' };

    /* Resolve ownership from the header before touching either child data or
       live master-gardu data.  ulpSama_ is the canonical case/space-tolerant
       ULP comparison; unlike the legacy compatibility filter it is strict for
       this ID-bearing endpoint, including an empty header ULP. */
    if(typeof ulpSama_ === 'function'
       ? !ulpSama_(sesiUlp, header.ulp)
       : String(sesiUlp).toLowerCase() !== String(header.ulp || '').trim().toLowerCase()){
      audit_(gAks.sesi, 'getDetailRealisasiGardu', kh, 'TOLAK', 'header milik ULP lain');
      return { ok:false, message:'Header bukan milik ULP Anda.' };
    }

    var R = COL_INSDU.REALISASI;
    var rows = (typeof _readSheetDual_ === 'function')
      ? _readSheetDual_(SHEET_INSDU_REALISASI, R.kodePekerjaanGardu, 12)
      : (ss.getSheetByName(SHEET_INSDU_REALISASI) ? ss.getSheetByName(SHEET_INSDU_REALISASI).getDataRange().getValues() : []);
    var list = [];
    for(var i=0;i<rows.length;i++){
      if(String(rows[i][R.kodeHeader]||'').trim()!==kh) continue;
      var nomor = String(rows[i][R.nomorGardu]||'').trim();
      var g = _findGarduByNomor(nomor) || {};
      list.push({
        kodePekerjaan: String(rows[i][R.kodePekerjaanGardu]||'').trim(),
        nomorGardu:    nomor,
        penyulang:     String(rows[i][R.penyulang]||'').trim() || (g.penyulang||''),
        section:       String(rows[i][R.section]||'').trim() || (g.section||''),
        merkTrafo:     g.merkTrafo || '',
        dayaKva:       g.dayaKva || '',
        tier:          String(rows[i][R.tier]||'').trim(),
        jumlahTemuan:  Number(rows[i][R.jumlahTemuan]||0)
      });
    }
    return { ok:true, header:header, rows:list };
  }catch(e){
    /* Access failures must remain hard failures for google.script.run.  Only
       ordinary data/runtime errors retain the legacy {ok:false,message} shape. */
    if(typeof _guardErrorAkses_ === 'function' && _guardErrorAkses_(e)) throw e;
    return { ok:false, message:e.message };
  }
}
