/*
 * Late-loaded auth compatibility override for GIS Jaringan.
 *
 * The original getGisJaringanLines lives in Inspeksi_Jaringan/Tek-InsJar-Code.js.
 * Keep this file last (ZZZ convention) so the public global resolves to this
 * guard-first copy without rewriting the large legacy module.
 */
function getGisJaringanLines(params){
  try{
    var gAks = guard_(arguments, { ulp:true, aksi:'getGisJaringanLines' });
    if(!String(gAks && gAks.ulp || '').trim()){
      throw new Error('Akun belum terhubung ke ULP. Hubungi Super User untuk melengkapi data akun.');
    }

    params = params || {};
    var ss = SpreadsheetApp.openById(GIS_TIANG_SPREADSHEET_ID);
    var sh = ss.getSheetByName(GIS_TIANG_SHEET_NAME);
    if(!sh || sh.getLastRow() < 2) return { ok:true, segmen:[], total:0 };

    var data = sh.getDataRange().getValues();
    function _normH(s){ return String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9]/g,''); }
    var head = data[0].map(function(h){ return String(h == null ? '' : h).trim().toUpperCase(); });
    var headNorm = head.map(_normH);
    function col(name){
      var i = head.indexOf(name);
      if(i >= 0) return i;
      return headNorm.indexOf(_normH(name));
    }
    function colAny(){ for(var a=0;a<arguments.length;a++){ var ci=col(arguments[a]); if(ci>=0) return ci; } return -1; }
    var cSot=colAny('SSOTNUMBER','SOTNUMBER'),
        cPenyNama=col('NAMA_PENYULANG'), cPeny=colAny('CXPENYULANG','PENYULANG'),
        cLat=col('LATITUDEY'), cLng=col('LONGITUDEX'),
        cJenis=col('JENIS_TIANG'), cUkur=col('UKURAN_TIANG_TM'),
        cMilik=col('STATUS_KEPEMILIKAN'),
        cAlmtF=col('FORMATTEDADDRESS'), cAlmtS=col('STREETADDRESS'), cCity=col('CITY'),
        cSlo=col('NO_SLO'), cSloDt=col('SLOACTIVEDATE'), cKodeH=col('KODE_HANTARAN');

    function num(v){
      if(v === null || v === undefined || v === '') return null;
      var n = parseFloat(String(v).trim().replace(/\s/g,'').replace(',','.'));
      return isNaN(n) ? null : n;
    }
    function sah(la, lo){ return la !== null && lo !== null && la >= -11 && la <= 6 && lo >= 95 && lo <= 141; }
    function get(r, i){ return i >= 0 ? String(r[i] == null ? '' : r[i]).trim() : ''; }

    var fPeny = String(params.penyulang || '').trim().toLowerCase();

    function distM(la1, lo1, la2, lo2){
      var R = 6371000, toR = Math.PI/180;
      var dLa = (la2-la1)*toR, dLo = (lo2-lo1)*toR;
      var h = Math.sin(dLa/2)*Math.sin(dLa/2) + Math.cos(la1*toR)*Math.cos(la2*toR)*Math.sin(dLo/2)*Math.sin(dLo/2);
      return 2*R*Math.asin(Math.min(1, Math.sqrt(h)));
    }

    var grup = {}, urut = [], nBaris = 0, nKoord = 0, nDuplikat = 0;
    for(var i=1;i<data.length;i++){
      var r = data[i]; nBaris++;
      var la = num(cLat >= 0 ? r[cLat] : null), lo = num(cLng >= 0 ? r[cLng] : null);
      if(!sah(la, lo)) continue;
      nKoord++;
      var peny = ((cPenyNama >= 0 ? get(r, cPenyNama) : '') || get(r, cPeny)) || '(Tanpa Penyulang)';
      if(fPeny && peny.toLowerCase() !== fPeny) continue;
      var alamat = get(r, cAlmtF);
      if(!alamat){ alamat = [get(r, cAlmtS), get(r, cCity)].filter(function(x){ return x; }).join(', '); }
      var o = {
        la:la, lo:lo, sot:get(r, cSot), jenis:get(r, cJenis), ukuran:get(r, cUkur),
        milik:get(r, cMilik), alamat:alamat, slo:get(r, cSlo),
        sloDt:(cSloDt >= 0 && r[cSloDt]) ? _normTgl(r[cSloDt]) : '', kh:get(r, cKodeH), peny:peny
      };
      if(!grup[peny]){ grup[peny] = { list:[], seen:{} }; urut.push(peny); }
      var kLaLo = la.toFixed(6) + ',' + lo.toFixed(6);
      if(grup[peny].seen[kLaLo]){ nDuplikat++; continue; }
      grup[peny].seen[kLaLo] = 1;
      grup[peny].list.push(o);
    }

    var seg = [], nPutus = 0, jmlJarak = 0;
    for(var g=0;g<urut.length;g++){
      var pts = grup[urut[g]].list, n = pts.length;
      if(n < 2) continue;

      var done = new Array(n), minD = new Array(n), parent = new Array(n);
      for(var k=0;k<n;k++){ done[k]=false; minD[k]=Infinity; parent[k]=-1; }
      minD[0] = 0;

      for(var it=0;it<n;it++){
        var v=-1, bv=Infinity;
        for(var a=0;a<n;a++){ if(!done[a] && minD[a]<bv){ bv=minD[a]; v=a; } }
        if(v<0) break;
        done[v]=true;

        if(parent[v]>=0){
          var p=parent[v], d=minD[v];
          if(d<=GIS_MAX_SEGMEN_M){
            var c=pts[v], ind=pts[p];
            jmlJarak+=d;
            seg.push({ a:[c.la,c.lo], b:[ind.la,ind.lo], s:c.sot, p:c.peny,
              j:c.jenis, u:c.ukuran, k:c.milik, al:c.alamat, slo:c.slo, sloD:c.sloDt,
              d:c.kh, pd:ind.sot });
          }else{
            nPutus++;
          }
        }
        var pv=pts[v];
        for(var b=0;b<n;b++){
          if(done[b]) continue;
          var dd=distM(pv.la,pv.lo,pts[b].la,pts[b].lo);
          if(dd<minD[b]){ minD[b]=dd; parent[b]=v; }
        }
      }
    }

    var diag = {
      baris: nBaris,
      metode: 'MST titik tiang (Prim, per penyulang)',
      maksJarakM: GIS_MAX_SEGMEN_M,
      kolom: { SSOTNUMBER:cSot, NAMA_PENYULANG:cPenyNama, LATITUDEY:cLat, LONGITUDEX:cLng },
      koordValid: nKoord,
      titikDuplikatDibuang: nDuplikat,
      jumlahPenyulang: urut.length,
      segmenTergambar: seg.length,
      sisiDibuangTerlaluJauh: nPutus,
      rataPanjangM: seg.length ? Math.round(jmlJarak / seg.length) : 0
    };
    return { ok:true, segmen:seg, total:seg.length, diag:diag };
  }catch(e){
    if(typeof _guardErrorAkses_ === 'function' && _guardErrorAkses_(e)) throw e;
    return { ok:false, error:String(e && e.message || e), segmen:[], total:0 };
  }
}
