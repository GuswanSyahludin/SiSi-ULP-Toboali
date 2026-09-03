/* ═════════════════════════════════════
   Tek-InsJar.gs — SiSi ULP Toboali (MODUL INSPEKSI JARINGAN)
   Fungsi: Dropdown, Tambah Realisasi, Header (simpan/edit), WO/Penerusan,
           builder WA Text, refresh header berkala. + getSessionUser (sesi bersama).
   Konstanta & helper bersama ada di Code.gs (Inti).
   Lintas-file (global scope, tanpa import):
     - _recalcRealisasiByKodePeny ada di Tek-Temuan.gs
     - _hariFromTanggal / _kodeUlpByUlp juga dipakai Tek-InsDu.gs (gardu)
═════════════════════════════════════ */


/* ═══ INSPEKSI JARINGAN — DROPDOWN ═══ */
function getListUlpIns() {
  return _cacheIns('ins_ulp', 600, function () {
    const H = COL_INS.HEADER;
    const rows = (typeof _readSheetDual_ === 'function')
      ? _readSheetDual_(SHEET_INS.HEADER, H.kodeHeader, H.statusTextWa + 1)
      : _readSheetIns(SHEET_INS.HEADER);
    const filtered = rows.filter(function (h) {
      return String(h[H.tim] || '').trim() === 'Inspeksi';
    });
    return _distinct(filtered, H.ulp);
  });
}

function getListUlpUsers() {
  return _cacheIns('ulp_users', 600, function () {
    var sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('db_Users');
    if (!sh || sh.getLastRow() < 2) return [];
    var data = sh.getRange(2, COL_USERS.ulp + 1, sh.getLastRow() - 1, 1).getValues();
    var seen = {}, out = [];
    for (var i = 0; i < data.length; i++) {
      var u = String(data[i][0] || '').trim();
      if (u && !seen[u]) { seen[u] = true; out.push(u); }
    }
    out.sort(function (a, b) { return a.localeCompare(b); });
    return out;
  });
}

function getListPenyulangIns(ulp) {
  return _cacheIns('ins_peny_' + (ulp || 'ALL'), 600, function () {
    const H = COL_INS.HEADER, R = COL_INS.REALISASI;
    const headers = (typeof _readSheetDual_ === 'function')
      ? _readSheetDual_(SHEET_INS.HEADER, H.kodeHeader, H.statusTextWa + 1)
      : _readSheetIns(SHEET_INS.HEADER);
    const kodeSet = {};
    headers.forEach(function (h) {
      if (String(h[H.tim] || '').trim() !== 'Inspeksi') return;
      if (!ulp || String(h[H.ulp]).trim() === String(ulp).trim())
        kodeSet[String(h[H.kodeHeader]).trim()] = true;
    });
    const realisasi = (typeof _readSheetDual_ === 'function')
      ? _readSheetDual_(SHEET_INS.REALISASI, R.kodePekerjaanPeny, R.timestamp + 1)
      : _readSheetIns(SHEET_INS.REALISASI);
    const rows = realisasi.filter(function (r) { return kodeSet[String(r[R.kodeHeader]).trim()]; });
    return _distinct(rows, R.penyulang);
  });
}

function getListPenyulangMaster(){
  return _cacheIns('ins_peny_master', 600, function(){
    var rows = _readSheetIns(SHEET_INS.PENYULANG);
    return _distinct(rows, 2)
      .sort(function(a, b){ return a.localeCompare(b); });
  });
}

function getListTimByUlp(ulp) {
  return _cacheIns('ins_tim_' + (ulp || 'ALL'), 600, function () {
    const rows = _readSheetIns(SHEET_INS.TIM).filter(function (r) {
      if (!ulp) return true;
      return String(r[1]).trim() === String(ulp).trim();
    });
    return _distinct(rows, 3).map(function (nama) { return { namaTim: nama }; });
  });
}


/* ═══ GIS JARINGAN ═══ */
var GIS_TIANG_SPREADSHEET_ID = '1Xyu6L_SeVc4sck5NoNxOGwkMFfgWK52wWR_a0_j49vs';
var GIS_TIANG_SHEET_NAME     = 'db_TiangMaster';
var GIS_MAX_SEGMEN_M         = 600;

function getGisJaringanLines(params){
  params = params || {};
  try{
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
    return { ok:false, error:String(e && e.message || e), segmen:[], total:0 };
  }
}


/* ═══ INSPEKSI JARINGAN — REALISASI & LAPORAN ═══ */

function getListHeaderInsJar(ulp){
  var H = COL_INS.HEADER;
  var data = (typeof _readSheetDual_ === 'function')
    ? _readSheetDual_(SHEET_INS.HEADER, H.kodeHeader, H.statusTextWa + 1)
    : _readSheetIns(SHEET_INS.HEADER);
  var out = [];
  for(var i=0;i<data.length;i++){
    var kode = String(data[i][H.kodeHeader] || '').trim();
    if(!kode) continue;
    if(String(data[i][H.tim] || '').trim() !== 'Inspeksi') continue;
    var ulpRow = String(data[i][H.ulp] || '').trim();
    if(ulp && ulpRow !== String(ulp).trim()) continue;
    out.push({
      kodeHeader: kode,
      ulp:        ulpRow,
      tanggal:    _normTgl(data[i][H.tanggal])
    });
  }
  out.reverse();
  return out;
}

var INSJAR_MODUL = 'IJR';

function _tglHeaderIns(ss, kodeHeader){
  var H = COL_INS.HEADER, key = String(kodeHeader || '').trim();
  if(!key) return '';
  var data = (typeof _readSheetDual_ === 'function')
    ? _readSheetDual_(SHEET_INS.HEADER, H.kodeHeader, H.statusTextWa + 1)
    : ss.getSheetByName(SHEET_INS.HEADER).getDataRange().getValues();
  for(var i=0;i<data.length;i++){
    if(String(data[i][H.kodeHeader] || '').trim() === key) return _normTgl(data[i][H.tanggal]);
  }
  return '';
}

function _generateKodePekerjaanPenyulangIns(ss, kodeHeader){
  var key = String(kodeHeader || '').trim();
  if(!key) return '';
  var shR = ss.getSheetByName(SHEET_INS.REALISASI);
  var prefix = key + '-PNY.';
  var max = 0;
  if(shR && shR.getLastRow() > 1){
    var R = COL_INS.REALISASI;
    var col = shR.getRange(2, R.kodePekerjaanPeny + 1, shR.getLastRow() - 1, 1).getValues();
    for(var i=0;i<col.length;i++){
      var v = String(col[i][0] || '').trim();
      if(v.indexOf(prefix) === 0){
        var n = parseInt(v.substring(prefix.length), 10);
        if(!isNaN(n) && n > max) max = n;
      }
    }
  }
  return prefix + ('00' + (max + 1)).slice(-3);
}

function simpanRealisasiInsJar(data){
  var gAks = guard_(arguments, { ulp: true, aksi: 'simpanRealisasiInsJar' });
  try{
    data = data || {};
    var kodeHeader = String(data.kodeHeader || '').trim();
    var penyulang  = String(data.penyulang  || '').trim();
    if(!kodeHeader) return { ok:false, message:'Kode Header wajib dipilih.' };
    if(!penyulang)  return { ok:false, message:'Penyulang wajib dipilih.' };
    if(!barisUlpCocok_(gAks, ulpDariKodeHeader_(kodeHeader))){
      audit_(gAks.sesi, 'simpanRealisasiInsJar', kodeHeader, 'TOLAK', 'header milik ULP lain');
      return { ok:false, message:'Kode Header bukan milik ULP Anda.' };
    }

    var ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
    var shR = ss.getSheetByName(SHEET_INS.REALISASI);
    if(!shR) return { ok:false, message:'Sheet db_INS_Realisasi tidak ditemukan.' };

    var R = COL_INS.REALISASI;
    var tierInput = String(data.tier || '').trim();
    if(shR.getLastRow() > 1){
      var _ex = shR.getRange(2, 1, shR.getLastRow() - 1, shR.getLastColumn()).getValues();
      for(var iDup=0; iDup<_ex.length; iDup++){
        if(String(_ex[iDup][R.kodeHeader] || '').trim() === kodeHeader
           && String(_ex[iDup][R.penyulang] || '').trim() === penyulang
           && String(_ex[iDup][R.tier] || '').trim() === tierInput){
          return { ok:false, message:'Penyulang "' + penyulang + '" dengan ' + (tierInput || '(tanpa tier)') + ' sudah ada di Kode Header ini.' };
        }
      }
    }

    var sectionAwal  = String(data.sectionAwal  || '').trim();
    var sectionAkhir = String(data.sectionAkhir || '').trim();
    var _titik = [sectionAwal, sectionAkhir].filter(function(x){ return x; });
    var section = '', jumlahTemuan = 0;
    if(_titik.length){
      try { section = _sectionRange(penyulang, _titik); } catch(eS){ section = _titik.join(' - '); }
    }

    var kodePeny = _generateKodePekerjaanPenyulangIns(ss, kodeHeader);
    var ts = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss');

    var tglIsoReal = _tglHeaderIns(ss, kodeHeader) || _normTgl(new Date());
    var hariReal = _hariFromTanggal(tglIsoReal);
    var row = shR.getLastRow() + 1;
    shR.getRange(row, 2, 1, 12).setValues([[
      kodeHeader,
      kodePeny,
      hariReal,
      tglIsoReal,
      penyulang,
      section,
      String(data.segmen || ''),
      tierInput,
      Number(data.totalTiang) || 0,
      jumlahTemuan,
      String(data.username || ''),
      ts
    ]]);

    var rk = { jumlahTemuan:0, section:'' };
    try { rk = _recalcRealisasiByKodePeny(ss, kodePeny); } catch(eR){}
    try { updateHeaderInsLangsung(kodeHeader); } catch(eH){}

    return { ok:true, kodePekerjaanPenyulang:kodePeny, section:rk.section, jumlahTemuan:rk.jumlahTemuan };
  }catch(e){
    return { ok:false, message:e.message };
  }
}

// DUAL-READ REKAP DATA REALISASI INSPEKSI JARINGAN
function getDataRealisasiInsJar(params) {
  params = params || {};
  const H = COL_INS.HEADER, R = COL_INS.REALISASI, T = COL_INS.TEMUAN;
  const dari = params.tglDari || '', sampai = params.tglSampai || '', fUlp = params.ulp || '';

  const headers = (typeof _readSheetDual_ === 'function')
    ? _readSheetDual_(SHEET_INS.HEADER, H.kodeHeader, H.statusTextWa + 1)
    : _readSheetIns(SHEET_INS.HEADER);
  const realisasi = (typeof _readSheetDual_ === 'function')
    ? _readSheetDual_(SHEET_INS.REALISASI, R.kodePekerjaanPeny, R.timestamp + 1)
    : _readSheetIns(SHEET_INS.REALISASI);
  const temuan = (typeof _readSheetDual_ === 'function')
    ? _readSheetDual_(SHEET_INS.TEMUAN, T.kodePekerjaan, T.folderPath + 1)
    : _readSheetIns(SHEET_INS.TEMUAN);

  const hdrByKode = {};
  headers.forEach(function (h) {
    const k = String(h[H.kodeHeader] || '').trim();
    if (k) hdrByKode[k] = { ulp: String(h[H.ulp] || '').trim(), tgl: _normTgl(h[H.tanggal]) };
  });

  const temuanByPeny = _indexBy(temuan, T.kodePekerjaanPeny);

  const out = [];
  realisasi.forEach(function (r) {
    const hdr = hdrByKode[String(r[R.kodeHeader] || '').trim()];
    if (!hdr) return;
    if (fUlp && hdr.ulp !== fUlp) return;
    if (!_insInRange(hdr.tgl, dari, sampai)) return;
    const kodePeny = String(r[R.kodePekerjaanPeny] || '').trim();
    out.push({
      kodePekerjaanPenyulang: kodePeny,
      ulp:          hdr.ulp,
      tanggal:      hdr.tgl,
      penyulang:    r[R.penyulang],
      section:      r[R.section],
      tier:         String(r[R.tier] || '').trim(),
      jumlahTemuan: (temuanByPeny[kodePeny] || []).length
    });
  });
  return out;
}

function editHeaderInsJar(data){
  var gAks = guard_(arguments, { ulp: true, aksi: 'editHeaderInsJar' });
  data = data || {};
  var kode = String(data.kodeHeader || '').trim();
  if(!kode) return { ok:false, message:'Kode header tidak boleh kosong.' };

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName(SHEET_INS.HEADER);
  if(!sh) return { ok:false, message:'Sheet header tidak ditemukan.' };

  var H = COL_INS.HEADER;
  var values = sh.getDataRange().getValues();
  var rowIdx = -1;
  for(var i=1;i<values.length;i++){
    if(String(values[i][H.kodeHeader] || '').trim() === kode){ rowIdx = i; break; }
  }
  if(rowIdx < 0) return { ok:false, message:'Data tidak ditemukan: ' + kode };
  if(!barisUlpCocok_(gAks, values[rowIdx][H.ulp])){
    audit_(gAks.sesi, 'editHeaderInsJar', kode, 'TOLAK', 'header milik ULP lain');
    return { ok:false, message:'Header bukan milik ULP Anda.' };
  }

  var rowNo = rowIdx + 1;
  var koordinatAwal  = safeCell_((data.koordinatAwal  != null) ? String(data.koordinatAwal)  : String(values[rowIdx][H.koordinatAwal]  || ''));
  var koordinatAkhir = safeCell_((data.koordinatAkhir != null) ? String(data.koordinatAkhir) : String(values[rowIdx][H.koordinatAkhir] || ''));
  var kmAwal  = safeCell_((data.kmAwal  != null) ? String(data.kmAwal)  : String(values[rowIdx][H.kmAwal]  || ''));
  var kmAkhir = safeCell_((data.kmAkhir != null) ? String(data.kmAkhir) : String(values[rowIdx][H.kmAkhir] || ''));

  sh.getRange(rowNo, H.koordinatAwal  + 1).setValue(koordinatAwal);
  sh.getRange(rowNo, H.koordinatAkhir + 1).setValue(koordinatAkhir);
  sh.getRange(rowNo, H.kmAwal  + 1).setValue(kmAwal);
  sh.getRange(rowNo, H.kmAkhir + 1).setValue(kmAkhir);

  var total  = _hitungTotalTiangIns(ss, kode);
  var waText = _buildWaTextIns(ss, kode, {
    koordinatAwal:  koordinatAwal,
    koordinatAkhir: koordinatAkhir,
    kmAwal:  kmAwal,
    kmAkhir: kmAkhir
  });

  sh.getRange(rowNo, H.waText + 1).setValue(waText);
  sh.getRange(rowNo, H.timestampUpdate + 1).setValue(
    Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss')
  );

  return { ok:true, kodeHeader:kode, waText:waText, totalTiang:total };
}

// DUAL-READ LAPORAN HARIAN / REKAP INSPEKSI JARINGAN
function getDataLapHarianInsJar(params) {
  params = params || {};
  const ss = _ssIns();
  const H = COL_INS.HEADER, R = COL_INS.REALISASI;
  const norm = function (v) { return String(v == null ? '' : v).trim().toLowerCase(); };
  const dari = params.tglDari || '', sampai = params.tglSampai || '',
        fUlp = norm(params.ulp), fTier = norm(params.tier), fTim = norm(params.tim);

  const realisasi = (typeof _readSheetDual_ === 'function')
    ? _readSheetDual_(SHEET_INS.REALISASI, R.kodePekerjaanPeny, R.timestamp + 1)
    : _readSheetIns(SHEET_INS.REALISASI);
  const realByHeader = _indexBy(realisasi, R.kodeHeader);
  const tierHeader = function (kode) {
    const rows = realByHeader[String(kode || '').trim()] || [];
    const seen = {}, out = [];
    rows.forEach(function (r) {
      const t = String(r[R.tier] || '').trim();
      if (t && !seen[t]) { seen[t] = true; out.push(t); }
    });
    return out;
  };

  const headers = (typeof _readSheetDual_ === 'function')
    ? _readSheetDual_(SHEET_INS.HEADER, H.kodeHeader, H.statusTextWa + 1)
    : _readSheetIns(SHEET_INS.HEADER);

  return headers
    .filter(function (h) {
      if (norm(h[H.tim]) !== 'inspeksi') return false;
      const ulp  = norm(h[H.ulp]);
      const tim  = norm(h[H.subTim]);
      if (fUlp  && ulp  !== fUlp)  return false;
      if (fTim  && tim  !== fTim)  return false;
      if (fTier) {
        const tiers = tierHeader(h[H.kodeHeader]).map(norm);
        if (tiers.indexOf(fTier) === -1) return false;
      }
      return _insInRange(_normTgl(h[H.tanggal]), dari, sampai);
    })
    .map(function (h) {
      const kode = String(h[H.kodeHeader] || '').trim();
      return {
        kodeHeader: h[H.kodeHeader],
        ulp:        String(h[H.ulp] || '').trim(),
        tim:        String(h[H.subTim] || '').trim(),
        tanggal:    _normTgl(h[H.tanggal]),
        tier:       tierHeader(kode).join(', '),
        totalTiang: _hitungTotalTiangIns(ss, kode),
        waText:     String(h[H.waText] || ''),
        koordinatAwal:  String(h[H.koordinatAwal]  || '').trim(),
        koordinatAkhir: String(h[H.koordinatAkhir] || '').trim(),
        kmAwal:         String(h[H.kmAwal]  || '').trim(),
        kmAkhir:        String(h[H.kmAkhir] || '').trim()
      };
    });
}

function getDataDaftarTemuan(params) {
  params = params || {};
  const T = COL_INS.TEMUAN;
  const dari = params.tglDari || '', sampai = params.tglSampai || '',
        fUlp = String(params.ulp || '').trim().toLowerCase(),
        fStatus = String(params.status || '').trim().toLowerCase(),
        fPeny = String(params.penyulang || '').trim().toLowerCase(),
        fTier = String(params.tier || '').trim().toLowerCase();
  const rows = (typeof _readSheetDual_ === 'function')
    ? _readSheetDual_(SHEET_INS.TEMUAN, T.kodePekerjaan, T.folderPath + 1)
    : _readSheetIns(SHEET_INS.TEMUAN);
  return rows
    .filter(function (t) {
      const ulp    = String(t[T.ulp] || '').trim().toLowerCase();
      const status = String(t[T.status] || '').trim().toLowerCase();
      const peny   = String(t[T.penyulang] || '').trim().toLowerCase();
      const tier   = String(t[T.tier] || '').trim().toLowerCase();
      if (fUlp    && ulp    !== fUlp)    return false;
      if (fStatus && status !== fStatus) return false;
      if (fPeny   && peny   !== fPeny)   return false;
      if (fTier   && tier   !== fTier)   return false;
      return _insInRange(_normTgl(t[T.tanggal]), dari, sampai);
    })
    .map(function (t) {
      return {
        kodePekerjaan:   t[T.kodePekerjaan],
        ulp:             String(t[T.ulp] || '').trim(),
        hari:            String(t[T.hari] || '').trim(),
        tanggal:         _normTgl(t[T.tanggal]),
        timInspeksi:     String(t[T.timInspeksi] || '').trim(),
        objek:           String(t[T.objekInspeksi] || '').trim(),
        penyulang:       String(t[T.penyulang] || '').trim(),
        section:         String(t[T.section] || '').trim(),
        segmen:          String(t[T.segmen] || '').trim(),
        nomorTiang:      String(t[T.nomorTiang] || '').trim(),
        nomorGardu:      String(t[T.nomorGardu] || '').trim(),
        tier:            String(t[T.tier] || '').trim(),
        temuan:          t[T.temuan],
        deskripsi:       String(t[T.deskripsi] || '').trim(),
        koordinat:       String(t[T.koordinat] || '').trim(),
        fotoSblUrl:      t[T.fotoTemuanUrl],
        fotoTiangUrl:    t[T.fotoTiangUrl],
        timEksekusi:     String(t[T.timEksekusi] || '').trim(),
        catatanSpv:      String(t[T.catatan] || '').trim(),
        statusPenerusan: String(t[T.status] || '').trim()
      };
    });
}

function getDataRekapTemuan(params) {
  params = params || {};
  const T = COL_INS.TEMUAN;
  const dari = params.tglDari || '', sampai = params.tglSampai || '',
        fUlp = String(params.ulp || '').trim().toLowerCase(),
        fPeny = String(params.penyulang || '').trim().toLowerCase();
  const rekap = { total: 0, belumTim: 0, proses: 0, selesai: 0, rows: [] };
  const rows = (typeof _readSheetDual_ === 'function')
    ? _readSheetDual_(SHEET_INS.TEMUAN, T.kodePekerjaan, T.folderPath + 1)
    : _readSheetIns(SHEET_INS.TEMUAN);
  rows.forEach(function (t) {
    const ulp    = String(t[T.ulp] || '').trim().toLowerCase();
    const peny   = String(t[T.penyulang] || '').trim().toLowerCase();
    const status = String(t[T.status] || '').trim();
    if (fUlp  && ulp  !== fUlp)  return;
    if (fPeny && peny !== fPeny) return;
    if (!_insInRange(_normTgl(t[T.tanggal]), dari, sampai)) return;

    rekap.total++;
    if      (status === STATUS_INS.PENUGASAN) rekap.belumTim++;
    else if (status === STATUS_INS.PROGRESS)  rekap.proses++;
    else if (status === STATUS_INS.SELESAI)   rekap.selesai++;

    rekap.rows.push({
      kodePekerjaan:   t[T.kodePekerjaan],
      penyulang:       peny,
      section:         String(t[T.section] || '').trim(),
      temuan:          t[T.temuan],
      statusPenerusan: status
    });
  });
  return rekap;
}

function setPilihTimTemuan(params) {
  params = params || {};
  const T = COL_INS.TEMUAN;
  const kodePekerjaan = params.kodePekerjaan;
  const timEksekusi   = params.timPelaksana || params.timEksekusi;
  const forwardBy     = params.username || params.forwardBy || '';
  const catatan       = params.catatanSpv || '';

  if (!kodePekerjaan) throw new Error('kodePekerjaan kosong');
  if (!timEksekusi)   throw new Error('Tim pelaksana kosong');

  const loc = _findRowTemuan(kodePekerjaan);
  if (!loc) throw new Error('Temuan tidak ditemukan: ' + kodePekerjaan);

  loc.sheet.getRange(loc.row, T.timEksekusi + 1).setValue(timEksekusi);
  loc.sheet.getRange(loc.row, T.forwardBy   + 1).setValue(forwardBy);
  loc.sheet.getRange(loc.row, T.tglForward  + 1).setValue(new Date());
  loc.sheet.getRange(loc.row, T.status      + 1).setValue(STATUS_INS.PROGRESS);
  if (catatan) loc.sheet.getRange(loc.row, T.catatan + 1).setValue(catatan);

  CacheService.getScriptCache().remove('ins_tim_' + (params.ulp || 'ALL'));
  return true;
}

function getPenerusanWO(ulp) {
  const T = COL_INS.TEMUAN;
  const rows = (typeof _readSheetDual_ === 'function')
    ? _readSheetDual_(SHEET_INS.TEMUAN, T.kodePekerjaan, T.folderPath + 1)
    : _readSheetIns(SHEET_INS.TEMUAN);
  return rows
    .filter(function (t) {
      if (ulp && String(t[T.ulp]).trim() !== String(ulp).trim()) return false;
      return String(t[T.status] || '').trim() === STATUS_INS.PENUGASAN;
    })
    .map(function (t) {
      return {
        kodePekerjaan:   t[T.kodePekerjaan],
        ulp:             t[T.ulp],
        tanggal:         _normTgl(t[T.tanggal]),
        penyulang:       t[T.penyulang],
        section:         t[T.section],
        temuan:          t[T.temuan],
        statusPenerusan: t[T.status]
      };
    });
}

function getNotifikasiWOBelumDiteruskan(token){
  try{
    var sesi = getSesiByToken(token);
    if(!sesi) return { ok:false, redirect:'login', count:0, list:[] };
    if(!_bolehAksesMenu(sesi, 'SIE-Teknik')) return { ok:true, count:0, list:[] };

    var isSuper = typeof _normRole_ === 'function'
      ? _normRole_(sesi.role) === 'SUPER'
      : String(sesi.role || '').trim() === 'Super User';
    var ulpUser = String(sesi.ulp || '').trim().toLowerCase();
    if (!isSuper && !ulpUser)
      return { ok:false, message:'Akun belum terhubung ke ULP.', count:0, list:[] };

    var T = COL_INS.TEMUAN;
    var rows = (typeof _readSheetDual_ === 'function')
      ? _readSheetDual_(SHEET_INS.TEMUAN, T.kodePekerjaan, T.folderPath + 1)
      : _readSheetIns(SHEET_INS.TEMUAN);
    var list = [];
    for(var i=0;i<rows.length;i++){
      var r = rows[i];
      if(String(r[T.status] || '').trim() !== STATUS_INS.PENUGASAN) continue;
      var ulpRow = String(r[T.ulp] || '').trim();
      if(!isSuper && ulpRow.toLowerCase() !== ulpUser) continue;
      list.push({
        kodePekerjaan: String(r[T.kodePekerjaan] || '').trim(),
        ulp:           ulpRow,
        tanggal:       _normTgl(r[T.tanggal]),
        penyulang:     String(r[T.penyulang] || '').trim(),
        section:       String(r[T.section] || '').trim(),
        objek:         String(r[T.objekInspeksi] || '').trim(),
        tier:          String(r[T.tier] || '').trim(),
        temuan:        String(r[T.temuan] || '').trim()
      });
    }
    list.sort(function(a,b){ return String(b.tanggal).localeCompare(String(a.tanggal)); });
    return { ok:true, count:list.length, list:list };
  }catch(e){
    return { ok:false, error:String(e), count:0, list:[] };
  }
}

function getTemuanByKodePekerjaan(kodePekerjaan){
  try{
    var key = String(kodePekerjaan || '').trim();
    if(!key) return { ok:false, error:'Kode pekerjaan kosong' };
    var T = COL_INS.TEMUAN;
    var rows = (typeof _readSheetDual_ === 'function')
      ? _readSheetDual_(SHEET_INS.TEMUAN, T.kodePekerjaan, T.folderPath + 1)
      : _readSheetIns(SHEET_INS.TEMUAN);
    for(var i=0;i<rows.length;i++){
      var r = rows[i];
      if(String(r[T.kodePekerjaan] || '').trim() !== key) continue;
      return { ok:true, data:{
        kodePekerjaan:     String(r[T.kodePekerjaan] || ''),
        kodePekerjaanPeny: String(r[T.kodePekerjaanPeny] || ''),
        kodeHeader:        String(r[T.kodeHeader] || ''),
        ulp:               String(r[T.ulp] || ''),
        tanggal:           _normTgl(r[T.tanggal]),
        hari:              String(r[T.hari] || ''),
        timInspeksi:       String(r[T.timInspeksi] || ''),
        objek:             String(r[T.objekInspeksi] || ''),
        penyulang:         String(r[T.penyulang] || ''),
        section:           String(r[T.section] || ''),
        segmen:            String(r[T.segmen] || ''),
        nomorTiang:        String(r[T.nomorTiang] || ''),
        nomorGardu:        String(r[T.nomorGardu] || ''),
        tier:              String(r[T.tier] || ''),
        temuan:            String(r[T.temuan] || ''),
        koordinat:         String(r[T.koordinat] || ''),
        deskripsi:         String(r[T.deskripsi] || ''),
        fotoTemuanUrl:     String(r[T.fotoTemuanUrl] || ''),
        fotoTiangUrl:      String(r[T.fotoTiangUrl] || ''),
        fotoPekerjaanUrl:  String(r[T.fotoPekerjaanUrl] || ''),
        fotoSesudahUrl:    String(r[T.fotoSesudahUrl] || ''),
        status:            String(r[T.status] || ''),
        forwardBy:         String(r[T.forwardBy] || ''),
        tglForward:        (r[T.tglForward] ? _normTgl(r[T.tglForward]) : ''),
        timEksekusi:       String(r[T.timEksekusi] || ''),
        catatan:           String(r[T.catatan] || ''),
        diameter:          String(r[T.diameter] || ''),
        jenisPekerjaan:    String(r[T.jenisPekerjaan] || ''),
        tglSelesai:        (r[T.tglSelesai] ? _normTgl(r[T.tglSelesai]) : ''),
        inputBy:           String(r[T.inputBy] || '')
      }};
    }
    return { ok:false, error:'Temuan tidak ditemukan' };
  }catch(e){
    return { ok:false, error:String(e) };
  }
}

function getSessionUser(token) {
  try {
    var t = String(token || "").trim();
    if (!t) return {};
    var sesi = getSesiByToken(t);
    if (!sesi) return {};
    return {
      token: t,
      username: sesi.username || "",
      email: sesi.email || "",
      role: sesi.role || "",
      ulp: sesi.ulp || "",
      kodeUlp: sesi.kodeUlp || "",
      bidang: sesi.bidang || "",
      tim: sesi.tim || "",
      subTim: sesi.subTim || "",
      aksesMenu: sesi.aksesMenu || "",
    };
  } catch(e) {
    return {};
  }
}

function simpanHeaderInsJar(data){
  var gAks = guard_(arguments, { ulp: true, aksi: 'simpanHeaderInsJar' });
  try{
    data = data || {};
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    var ulp     = String(gAks.ulp || '').trim();
    var kodeUlp = String(gAks.kodeUlp || '').trim();
    var tim     = String(gAks.tim || '').trim();
    var ulpPilih = ulpScope_(gAks, data.ulp) || ulp;
    if(String(ulpPilih).toLowerCase() !== ulp.toLowerCase()){
      ulp     = String(ulpPilih).trim();
      kodeUlp = _kodeUlpByUlp(ss, ulpPilih);
    }
    if(!kodeUlp) kodeUlp = _kodeUlpByUlp(ss, ulp);
    if(!ulp)     return { ok:false, message:'ULP untuk user tidak ditemukan di db_Users.' };
    if(!kodeUlp) return { ok:false, message:'Kode ULP untuk ULP terpilih kosong di db_Users.' };

    var kodeHeader = _generateKodeHeaderIns(ss, kodeUlp, data.tanggal);
    var hari       = _hariFromTanggal(data.tanggal);
    var now        = new Date();
    var koordAwal  = safeCell_(data.koordinatAwal  || '');
    var koordAkhir = safeCell_(data.koordinatAkhir || '');
    var kmAwal     = safeCell_(data.kmAwal         || '');
    var kmAkhir    = safeCell_(data.kmAkhir        || '');
    var kendala    = safeCell_(data.kendala        || '');
    var waText     = _buildWaTextIns(ss, kodeHeader, {
      koordinatAwal:  koordAwal,
      koordinatAkhir: koordAkhir,
      kmAwal:         kmAwal,
      kmAkhir:        kmAkhir
    });

    var sh  = ss.getSheetByName(SHEET_INS.HEADER);
    var row = sh.getLastRow() + 1;
    sh.getRange(row, 2, 1, 15).setValues([[
      kodeHeader,
      ulp,
      hari,
      data.tanggal,
      'Inspeksi',
      tim,
      koordAwal,
      koordAkhir,
      kmAwal,
      kmAkhir,
      kendala,
      waText,
      now,
      String(gAks.username||''),
      now
    ]]);

    return { ok:true, kodeHeader:kodeHeader };
  }catch(e){
    return { ok:false, message:e.message };
  }
}

function _hariFromTanggal(tgl){
  var h = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  return h[new Date(_normTgl(tgl) + 'T00:00:00').getDay()];
}

function _generateKodeHeaderIns(ss, kodeUlp, tanggal){
  var tgl    = _normTgl(tanggal).replace(/-/g,'').slice(2);
  var prefix = INSJAR_MODUL + '-' + (kodeUlp||'').toString().trim() + tgl;
  var data   = ss.getSheetByName(SHEET_INS.HEADER).getDataRange().getValues();
  var n = 0;
  for(var i=1;i<data.length;i++){
    if((data[i][COL_INS.HEADER.kodeHeader]||'').toString().indexOf(prefix) === 0) n++;
  }
  return prefix + ('00'+(n+1)).slice(-3);
}

function _kodeUlpByUlp(ss, ulp){
  var u = String(ulp||'').trim().toLowerCase();
  if(!u) return '';
  var data = ss.getSheetByName('db_Users').getDataRange().getValues();
  for(var i=1;i<data.length;i++){
    if(String(data[i][COL_USERS.ulp]||'').trim().toLowerCase() === u)
      return String(data[i][COL_USERS.kodeUlp]||'').trim();
  }
  return '';
}

function _hitungTotalTiangIns(ss, kodeHeader){
  var key = String(kodeHeader || '').trim();
  if(!key) return 0;
  var R = COL_INS.REALISASI;
  var real = (typeof _readSheetDual_ === 'function')
    ? _readSheetDual_(SHEET_INS.REALISASI, R.kodePekerjaanPeny, R.timestamp + 1)
    : ss.getSheetByName(SHEET_INS.REALISASI).getDataRange().getValues();
  var total = 0;
  for(var j=0;j<real.length;j++){
    if((real[j][R.kodeHeader]||'').toString().trim() === key)
      total += Number(real[j][R.totalTiang]) || 0;
  }
  return total;
}

var _NAMA_HARI  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
var _NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli',
                   'Agustus','September','Oktober','November','Desember'];

function _tglIndo(tgl){
  var d = new Date(_normTgl(tgl) + 'T00:00:00');
  return _NAMA_HARI[d.getDay()] + ', ' + d.getDate() + ' ' + _NAMA_BULAN[d.getMonth()] + ' ' + d.getFullYear();
}

function _buildWaTextIns(ss, kodeHeader, opt){
  opt = opt || {};
  var H = COL_INS.HEADER, R = COL_INS.REALISASI, T = COL_INS.TEMUAN;
  var key = String(kodeHeader || '').trim();

  var head = (typeof _readSheetDual_ === 'function')
    ? _readSheetDual_(SHEET_INS.HEADER, H.kodeHeader, H.statusTextWa + 1)
    : ss.getSheetByName(SHEET_INS.HEADER).getDataRange().getValues();
  var tglStr = '';
  for(var i=0;i<head.length;i++){
    if((head[i][H.kodeHeader]||'').toString().trim() === key){
      tglStr = _normTgl(head[i][H.tanggal]); break;
    }
  }

  var real = (typeof _readSheetDual_ === 'function')
    ? _readSheetDual_(SHEET_INS.REALISASI, R.kodePekerjaanPeny, R.timestamp + 1)
    : ss.getSheetByName(SHEET_INS.REALISASI).getDataRange().getValues();
  var temu = (typeof _readSheetDual_ === 'function')
    ? _readSheetDual_(SHEET_INS.TEMUAN, T.kodePekerjaan, T.folderPath + 1)
    : ss.getSheetByName(SHEET_INS.TEMUAN).getDataRange().getValues();

  var realRows = [];
  for(var j=0;j<real.length;j++){
    if((real[j][R.kodeHeader]||'').toString().trim() === key) realRows.push(real[j]);
  }

  var tierOrder = [], tierMap = {};
  for(var y=0;y<realRows.length;y++){
    var tKey = (realRows[y][R.tier]||'').toString().trim() || '-';
    if(!(tKey in tierMap)){ tierMap[tKey] = []; tierOrder.push(tKey); }
    tierMap[tKey].push(realRows[y]);
  }
  tierOrder.sort(function(a,b){ return a.localeCompare(b); });

  var L = [];
  L.push('*Realisasi Inspeksi Jaringan*');
  L.push('-------------------------------------------------------------------');
  L.push('Hari / Tanggal : ' + (tglStr ? _tglIndo(tglStr) : '-'));
  L.push('Koordinat Awal : ' + (opt.koordinatAwal || '-'));
  L.push('Koordinat Akhir : ' + (opt.koordinatAkhir || '-'));
  L.push('Stand KM Awal / Akhir : ' + (opt.kmAwal||'-') + ' / ' + (opt.kmAkhir||'-'));
  L.push('');

  var GARIS = '—————————————————————';
  var total = 0;

  for(var ti=0; ti<tierOrder.length; ti++){
    var tier = tierOrder[ti];
    var grup = tierMap[tier];

    L.push(GARIS);
    L.push('—- Inspeksi *' + tier + '* —-');

    var tierTiang = 0;
    for(var x=0;x<grup.length;x++){
      var rr = grup[x];
      var kodePeny = (rr[R.kodePekerjaanPeny]||'').toString().trim();
      var tiang    = Number(rr[R.totalTiang]) || 0;
      tierTiang += tiang;
      total     += tiang;

      L.push((x+1) + '. Penyulang : *' + (rr[R.penyulang] || '-') + '*');
      L.push('Section : ' + (rr[R.section] || '-'));

      var segmenRr = (rr[R.segmen]||'').toString().trim();
      if(segmenRr) L.push('Segmen : ' + segmenRr);

      var temuanOrder = [], temuanCount = {};
      for(var k=0;k<temu.length;k++){
        if((temu[k][T.kodeHeader]||'').toString().trim()===key
           && (temu[k][T.kodePekerjaanPeny]||'').toString().trim()===kodePeny){
          var _urlT = (temu[k][T.fotoTemuanUrl]||'').toString().trim();
          var _urlG = (temu[k][T.fotoTiangUrl] ||'').toString().trim();
          if(!_urlT || !_urlG) continue;
          var tm = (temu[k][T.temuan]||'').toString().trim();
          if(tm){
            if(!(tm in temuanCount)){ temuanCount[tm] = 0; temuanOrder.push(tm); }
            temuanCount[tm]++;
          }
        }
      }
      L.push('Temuan');
      if(temuanOrder.length){ temuanOrder.forEach(function(t){ L.push('- ' + t + ' : ' + temuanCount[t] + ' Titik'); }); }
      else { L.push('- Nihil'); }
      L.push('');

      L.push('Jumlah Tiang yang di Inspeksi : *' + tiang + ' Tiang*');
      L.push('');
    }

    var labelTier = (tier === '-') ? 'Total Tiang yang di Inspeksi'
                                   : ('Total Tiang yang di Inspeksi ' + tier);
    L.push(labelTier + ' : *' + tierTiang + ' Tiang*');
    L.push('');
  }

  if(tierOrder.length > 1){
    var labelGabung;
    if(tierOrder.length === 2){
      labelGabung = tierOrder[0] + ' dan ' + tierOrder[1];
    } else {
      labelGabung = tierOrder.slice(0, -1).join(', ') + ' dan ' + tierOrder[tierOrder.length - 1];
    }
    L.push(GARIS);
    L.push('Total Tiang hasil Inspeksi ' + labelGabung + ' : *' + total + ' Tiang*');
  }

  return L.join('\n').replace(/\n+$/, '');
}

function refreshHeaderInsBerkala(){
  var ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh  = ss.getSheetByName(SHEET_INS.HEADER);
  var data = sh.getDataRange().getValues();
  var H = COL_INS.HEADER, now = new Date();

  for(var i=1;i<data.length;i++){
    var r = data[i];
    if(!r[H.kodeHeader]) continue;
    if((r[H.tim]||'').toString().trim() !== 'Inspeksi') continue;
    var kode = (r[H.kodeHeader]||'').toString().trim();

    var tsInput = r[H.timestamp];
    if(!tsInput || (tsInput instanceof Date && tsInput.getFullYear() < 2000)){
      sh.getRange(i+1, H.timestamp+1).setValue(now);
    }

    var subTim = (r[H.subTim]||'').toString().trim().toLowerCase();
    var waBaru;
    if(subTim === 'inspeksi gardu'){
      waBaru = _buildWaTextInsGardu(ss, kode);
    } else {
      waBaru = _buildWaTextIns(ss, kode, {
        koordinatAwal:r[H.koordinatAwal], koordinatAkhir:r[H.koordinatAkhir],
        kmAwal:r[H.kmAwal], kmAkhir:r[H.kmAkhir]
      });
    }

    if((r[H.waText]||'') !== waBaru){
      sh.getRange(i+1, H.waText+1).setValue(waBaru);
      sh.getRange(i+1, H.timestampUpdate+1).setValue(now);
    }
  }
}

function _isHeaderInsJar(r){
  var H = COL_INS.HEADER;
  if(!r[H.kodeHeader]) return false;
  if(String(r[H.tim]||'').trim() !== 'Inspeksi') return false;
  return String(r[H.subTim]||'').trim().toLowerCase() !== 'inspeksi gardu';
}

function _recalcRealisasiHeaderInsJar(ss, kodeHeader){
  var R = COL_INS.REALISASI;
  var shR = ss.getSheetByName(SHEET_INS.REALISASI);
  if(!shR || shR.getLastRow() < 2) return;
  var key = String(kodeHeader||'').trim();
  var data = shR.getRange(2, 1, shR.getLastRow()-1, shR.getLastColumn()).getValues();
  for(var i=0;i<data.length;i++){
    if(String(data[i][R.kodeHeader]||'').trim() !== key) continue;
    var kodePeny = String(data[i][R.kodePekerjaanPeny]||'').trim();
    if(kodePeny){ try { _recalcRealisasiByKodePeny(ss, kodePeny); } catch(e){} }
  }
}

function _tulisWaHeaderInsJar(ss, sh, rowIdx, rowValues){
  var H = COL_INS.HEADER;
  var kode = String(rowValues[H.kodeHeader]||'').trim();
  var wa = _buildWaTextIns(ss, kode, {
    koordinatAwal:  rowValues[H.koordinatAwal],
    koordinatAkhir: rowValues[H.koordinatAkhir],
    kmAwal:         rowValues[H.kmAwal],
    kmAkhir:        rowValues[H.kmAkhir]
  });
  if(String(rowValues[H.waText]||'') !== wa){
    sh.getRange(rowIdx, H.waText+1).setValue(wa);
    sh.getRange(rowIdx, H.timestampUpdate+1).setValue(new Date());
  }
  return wa;
}

function refreshSemuaWaInsJar(){
  try{
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName(SHEET_INS.HEADER);
    var data = sh.getDataRange().getValues();
    var H = COL_INS.HEADER, n = 0;
    for(var i=1;i<data.length;i++){
      if(!_isHeaderInsJar(data[i])) continue;
      var kode = String(data[i][H.kodeHeader]).trim();
      _recalcRealisasiHeaderInsJar(ss, kode);
      _tulisWaHeaderInsJar(ss, sh, i+1, data[i]);
      n++;
    }
    return { ok:true, diproses:n };
  }catch(e){ return { ok:false, message:e.message }; }
}

function recalcWaInsJarByHeader(kodeHeader){
  try{
    var key = String(kodeHeader||'').trim();
    if(!key) return { ok:false, message:'Kode Header kosong.' };
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName(SHEET_INS.HEADER);
    var data = sh.getDataRange().getValues();
    var H = COL_INS.HEADER, rowIdx = -1;
    for(var i=1;i<data.length;i++){
      if(String(data[i][H.kodeHeader]||'').trim() === key){ rowIdx = i; break; }
    }
    if(rowIdx < 0) return { ok:false, message:'Header tidak ditemukan: '+key };
    _recalcRealisasiHeaderInsJar(ss, key);
    var wa = _tulisWaHeaderInsJar(ss, sh, rowIdx+1, data[rowIdx]);
    return { ok:true, kodeHeader:key, waText:wa };
  }catch(e){ return { ok:false, message:e.message }; }
}

function refreshWaInsJarHarian(){
  try{
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName(SHEET_INS.HEADER);
    var data = sh.getDataRange().getValues();
    var H = COL_INS.HEADER;
    var tz = 'Asia/Jakarta';
    var hariIni = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    var kemarin = Utilities.formatDate(new Date(Date.now() - 86400000), tz, 'yyyy-MM-dd');
    var n = 0;
    for(var i=1;i<data.length;i++){
      if(!_isHeaderInsJar(data[i])) continue;
      var tgl = _normTgl(data[i][H.tanggal]);
      if(tgl !== hariIni && tgl !== kemarin) continue;
      _recalcRealisasiHeaderInsJar(ss, String(data[i][H.kodeHeader]).trim());
      _tulisWaHeaderInsJar(ss, sh, i+1, data[i]);
      n++;
    }
    return { ok:true, diproses:n };
  }catch(e){ return { ok:false, message:e.message }; }
}

function updateHeaderInsLangsung(kodeHeader){
  var gAks = guard_(arguments, { ulp: true, aksi: 'updateHeaderInsLangsung' });
  try{
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName(SHEET_INS.HEADER);
    var data = sh.getDataRange().getValues();
    var H = COL_INS.HEADER, now = new Date();
    for(var i=1;i<data.length;i++){
      if(String(data[i][H.kodeHeader]||'').trim() !== String(kodeHeader).trim()) continue;
      if(!barisUlpCocok_(gAks, data[i][H.ulp])){
        audit_(gAks.sesi, 'updateHeaderInsLangsung', String(kodeHeader), 'TOLAK', 'header milik ULP lain');
        return { ok:false, message:'Header bukan milik ULP Anda.' };
      }
      var r = data[i];
      var kode = String(r[H.kodeHeader]||'').trim();
      var totalBaru = _hitungTotalTiangIns(ss, kode);
      var waBaru = _buildWaTextIns(ss, kode, {
        koordinatAwal:  r[H.koordinatAwal],
        koordinatAkhir: r[H.koordinatAkhir],
        kmAwal:         r[H.kmAwal],
        kmAkhir:        r[H.kmAkhir]
      });
      sh.getRange(i+1, H.waText+1).setValue(waBaru);
      sh.getRange(i+1, H.timestampUpdate+1).setValue(now);
      SpreadsheetApp.flush();
      return { ok:true, kodeHeader:kodeHeader, waText:waBaru, totalTiang:totalBaru };
    }
    return { ok:false, message:'Kode Header tidak ditemukan: ' + kodeHeader };
  }catch(e){
    return { ok:false, message:e.message };
  }
}

function getDetailRealisasiByHeader(kodeHeader){
  try{
    kodeHeader = String(kodeHeader || '').trim();
    if(!kodeHeader) return { ok:false, message:'Kode Header kosong.' };

    var R = COL_INS.REALISASI;
    var realisasi = (typeof _readSheetDual_ === 'function')
      ? _readSheetDual_(SHEET_INS.REALISASI, R.kodePekerjaanPeny, R.timestamp + 1)
      : _readSheetIns(SHEET_INS.REALISASI);
    var rows = realisasi.filter(function(r){
      return String(r[R.kodeHeader] || '').trim() === kodeHeader;
    }).map(function(r){
      return {
        kodePekerjaanPeny: String(r[R.kodePekerjaanPeny] || '').trim(),
        penyulang:         String(r[R.penyulang] || '').trim(),
        section:           String(r[R.section] || '').trim(),
        segmen:            String(r[R.segmen] || '').trim(),
        tier:              String(r[R.tier] || '').trim(),
        totalTiang:        Number(r[R.totalTiang]) || 0,
        jumlahTemuan:      Number(r[R.jumlahTemuan]) || 0,
        inputBy:           String(r[R.inputBy] || '').trim(),
        timestamp:         String(r[R.timestamp] || '').trim()
      };
    });

    var _tierSeen = {}, _tierArr = [];
    rows.forEach(function(d){
      if(d.tier && !_tierSeen[d.tier]){ _tierSeen[d.tier] = true; _tierArr.push(d.tier); }
    });

    var H = COL_INS.HEADER, hdr = null;
    var heads = (typeof _readSheetDual_ === 'function')
      ? _readSheetDual_(SHEET_INS.HEADER, H.kodeHeader, H.statusTextWa + 1)
      : _readSheetIns(SHEET_INS.HEADER);
    for(var i=0;i<heads.length;i++){
      if(String(heads[i][H.kodeHeader] || '').trim() === kodeHeader){
        hdr = {
          ulp:     String(heads[i][H.ulp] || '').trim(),
          tanggal: _normTgl(heads[i][H.tanggal]),
          tier:    _tierArr.join(', '),
          tim:     String(heads[i][H.subTim] || '').trim()
        };
        break;
      }
    }

    var totalTiang  = rows.reduce(function(s,d){ return s + d.totalTiang; }, 0);
    var totalTemuan = rows.reduce(function(s,d){ return s + d.jumlahTemuan; }, 0);

    return { ok:true, kodeHeader:kodeHeader, header:hdr, rows:rows,
             totalPenyulang:rows.length, totalTiang:totalTiang, totalTemuan:totalTemuan };
  }catch(e){
    return { ok:false, message:e.message };
  }
}

function editRealisasiInsJar(data){
  var gAks = guard_(arguments, { ulp: true, aksi: 'editRealisasiInsJar' });
  try{
    data = data || {};
    var kodePeny = String(data.kodePekerjaanPenyulang || data.kodePekerjaanPeny || '').trim();
    if(!kodePeny) return { ok:false, message:'Kode Pekerjaan Penyulang kosong.' };

    var ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
    var shR = ss.getSheetByName(SHEET_INS.REALISASI);
    if(!shR) return { ok:false, message:'Sheet ' + SHEET_INS.REALISASI + ' tidak ditemukan.' };

    var R = COL_INS.REALISASI;
    var vals = shR.getDataRange().getValues();
    var rowIdx = -1;
    for(var i=1;i<vals.length;i++){
      if(String(vals[i][R.kodePekerjaanPeny] || '').trim() === kodePeny){ rowIdx = i; break; }
    }
    if(rowIdx < 0) return { ok:false, message:'Realisasi tidak ditemukan: ' + kodePeny };

    var rowNo      = rowIdx + 1;
    var kodeHeader = String(vals[rowIdx][R.kodeHeader] || '').trim();
    var penyulang  = String(vals[rowIdx][R.penyulang] || '').trim();
    if(!barisUlpCocok_(gAks, ulpDariKodeHeader_(kodeHeader))){
      audit_(gAks.sesi, 'editRealisasiInsJar', kodePeny, 'TOLAK', 'realisasi milik ULP lain');
      return { ok:false, message:'Realisasi bukan milik ULP Anda.' };
    }

    var n = Number(vals[rowIdx][R.jumlahTemuan]) || 0;
    try { n = (_recalcRealisasiByKodePeny(ss, kodePeny) || {}).jumlahTemuan || 0; } catch(eR){}

    if(data.segmen != null){
      shR.getRange(rowNo, R.segmen + 1).setValue(String(data.segmen || '').trim());
    }

    if(n === 0 && (data.sectionAwal != null || data.sectionAkhir != null)){
      var awal  = String(data.sectionAwal  || '').trim();
      var akhir = String(data.sectionAkhir || '').trim();
      var titik = [awal, akhir].filter(function(x){ return x; });
      var section = '';
      if(titik.length){
        try { section = _sectionRange(penyulang, titik); } catch(eS){ section = titik.join(' - '); }
      }
      shR.getRange(rowNo, R.section + 1).setValue(section);
    }

    SpreadsheetApp.flush();
    try { updateHeaderInsLangsung(kodeHeader); } catch(eH){}

    return { ok:true, kodePekerjaanPenyulang:kodePeny, sectionLocked:(n>0), jumlahTemuan:n };
  }catch(e){
    return { ok:false, message:e.message };
  }
}
