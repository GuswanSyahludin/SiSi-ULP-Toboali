/*
 * Late-loaded auth override for the public Inspeksi Gardu header reader.
 *
 * The legacy getDataHeaderInsGardu lives in
 * Inspeksi_Gardu/Tek-InsDu-Code.js. Main.html lists this endpoint in
 * SISI_BUTUH_TOKEN. Its current SisiRun call passes one params object and
 * injects the session token into that object, so this override deliberately
 * keeps the one-argument params contract.
 *
 * Keep this file last (ZZZ convention): it replaces the public global without
 * rewriting the large legacy module or changing any frontend call site.
 */
function getDataHeaderInsGardu(params){
  /* The guard must be the first operation. In particular, do not normalize
     params, resolve helpers, or touch a spreadsheet before authentication. */
  var gAks = guard_(arguments, { ulp:true, aksi:'getDataHeaderInsGardu' });

  try{
    var sesiUlp = String(gAks && gAks.ulp || '').trim();
    if(!sesiUlp){
      throw new Error('Akun belum terhubung ke ULP. Hubungi Super User untuk melengkapi data akun.');
    }

    /* SisiRun injects token into the first object argument. Supporting a
       positional second argument as well keeps direct server-side callers
       compatible without changing the browser contract. */
    params = (arguments.length > 1) ? arguments[1] : (params || {});
    params = params || {};

    var H = COL_INS.HEADER;
    var norm = function(v){ return String(v==null?'':v).trim().toLowerCase(); };
    var dari = params.tglDari || '';
    var sampai = params.tglSampai || '';
    /* params.ulp is intentionally ignored. This endpoint is single-ULP:
       authorization and filter scope always come from the authenticated
       session, never from client input. */
    var headers = (typeof _readSheetDual_ === 'function')
      ? _readSheetDual_(SHEET_INS.HEADER, H.kodeHeader, H.statusTextWa + 1)
      : _readSheetIns(SHEET_INS.HEADER);

    return headers
      .filter(function(h){
        if(norm(h[H.tim]) !== 'inspeksi') return false;
        if(norm(h[H.subTim]) !== 'inspeksi gardu') return false;

        /* Blank-Ulp rows are never visible to this authenticated reader. */
        var rowUlp = String(h[H.ulp]==null?'':h[H.ulp]).trim();
        if(!rowUlp) return false;
        var sameUlp = (typeof ulpSama_ === 'function')
          ? ulpSama_(sesiUlp, rowUlp)
          : norm(sesiUlp) === norm(rowUlp);
        if(!sameUlp) return false;

        return _insInRange(_normTgl(h[H.tanggal]), dari, sampai);
      })
      .map(function(h){
        return {
          kodeHeader:     String(h[H.kodeHeader] || '').trim(),
          ulp:            String(h[H.ulp] || '').trim(),
          hari:           String(h[H.hari] || '').trim(),
          tanggal:        _normTgl(h[H.tanggal]),
          koordinatAwal:  String(h[H.koordinatAwal] || '').trim(),
          koordinatAkhir: String(h[H.koordinatAkhir] || '').trim(),
          kmAwal:         String(h[H.kmAwal] || '').trim(),
          kmAkhir:        String(h[H.kmAkhir] || '').trim(),
          kendala:        String(h[H.kendala] || '').trim(),
          waText:         String(h[H.waText] || '').trim()
        };
      })
      .sort(function(a,b){
        return String(b.tanggal).localeCompare(String(a.tanggal))
            || String(b.kodeHeader).localeCompare(String(a.kodeHeader));
      });
  }catch(e){
    /* The legacy endpoint has no response wrapper for ordinary failures, so
       preserve its thrown-error semantics. Access failures are explicitly
       rethrown rather than converted into a data response. */
    if(typeof _guardErrorAkses_ === 'function' && _guardErrorAkses_(e)) throw e;
    throw e;
  }
}
