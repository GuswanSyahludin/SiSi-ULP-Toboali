/*
 * Late-loaded auth override for the public Inspeksi Gardu findings reader.
 *
 * SisiRun injects the session token as the first positional argument, so the
 * effective public contract is getTemuanGardu(token, kodeHeader, nomorGardu).
 * Keeping this copy in ZZZ-*.js lets the original large module remain intact.
 */
function getTemuanGardu(token, kodeHeader, nomorGardu){
  try{
    /* Must be the first operation: no helper, SpreadsheetApp, or findings read
       may occur before the session has been authenticated and scoped. */
    var gAks = guard_(arguments, { ulp:true, aksi:'getTemuanGardu' });
    var sesiUlp = String(gAks && gAks.ulp || '').trim();
    if(!sesiUlp){
      throw new Error('Akun belum terhubung ke ULP. Hubungi Super User untuk melengkapi data akun.');
    }

    var kh = String(kodeHeader || '').trim();
    var ng = String(nomorGardu || '').trim().toLowerCase();
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var header = _getHeaderInsByKode(ss, kh);
    if(!header) return { ok:false, message:'Header tidak ditemukan.', list:[] };

    if(!barisUlpCocok_(gAks, header.ulp)){
      audit_(gAks.sesi, 'getTemuanGardu', kh, 'TOLAK', 'header milik ULP lain');
      return { ok:false, message:'Header bukan milik ULP Anda.', list:[] };
    }

    var T = COL_INS.TEMUAN;
    var data = (typeof _readSheetDual_ === 'function')
      ? _readSheetDual_(SHEET_INS.TEMUAN, T.kodePekerjaan, T.folderPath + 1)
      : (ss.getSheetByName(SHEET_INS.TEMUAN).getDataRange().getValues());
    var out = [];
    for(var i=0;i<data.length;i++){
      if(String(data[i][T.kodeHeader] || '').trim() !== kh) continue;
      if(String(data[i][T.nomorGardu] || '').trim().toLowerCase() !== ng) continue;
      out.push({
        kodePekerjaan:String(data[i][T.kodePekerjaan] || '').trim(),
        temuan:String(data[i][T.temuan] || '').trim(),
        deskripsi:String(data[i][T.deskripsi] || '').trim(),
        koordinat:String(data[i][T.koordinat] || '').trim(),
        section:String(data[i][T.section] || '').trim(),
        tier:String(data[i][T.tier] || '').trim(),
        status:String(data[i][T.status] || '').trim(),
        nomorGardu:String(data[i][T.nomorGardu] || '').trim(),
        fotoTemuanUrl:String(data[i][T.fotoTemuanUrl] || '').trim(),
        fotoGarduUrl:String(data[i][T.fotoTiangUrl] || '').trim()
      });
    }
    return { ok:true, list:out.reverse() };
  }catch(e){
    if(typeof _guardErrorAkses_ === 'function' && _guardErrorAkses_(e)) throw e;
    return { ok:false, message:e.message, list:[] };
  }
}
