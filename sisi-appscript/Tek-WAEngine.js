/* ════════════════════════════════════════════════════════════
   Tek-WaEngine.gs — MESIN BUILD WA TERPUSAT (semua tim/laporan)
   ────────────────────────────────────────────────────────────
   - Semua header di db_Global_Header (kolom Tim + Sub-Tim).
   - REGISTRY memetakan (Tim [+ Sub-Tim]) -> fungsi recalc tim itu.
   - 1 trigger harian (refreshWaHarian) memproses SEMUA tim.

   Menambah tim baru = tulis builder-nya + tambah 1 baris di
   _waBuilderRegistry(). TANPA trigger / fungsi orkestrasi baru.

   Kontrak fungsi recalc tiap tim:  recalc(ss, kodeHeader)
   -> hitung ulang child (jumlah temuan dll) LALU tulis WA Text.
   ════════════════════════════════════════════════════════════ */

// ── REGISTRY: daftar pusat semua laporan ──
// subTim opsional: jika dikosongkan, cocok utk SEMUA sub-tim pada Tim itu.
function _waBuilderRegistry(){
  return [
    { label:'Inspeksi Jaringan', tim:'Inspeksi', subTim:'Inspeksi Jaringan', recalc:recalcWaInsJar_ },
    { label:'Inspeksi Gardu',    tim:'Inspeksi', subTim:'Inspeksi Gardu',    recalc:recalcRealisasiGarduByHeader },
    { label:'ROW (4 tim)',       tim:'ROW',                                  recalc:recalcWaRow_ }, // 1 format utk 4 sub-tim ROW
    { label:'Hartek',            tim:'Hartek',                               recalc:recalcWaHartek_ }, // 1 format Hartek (aktif)

    /* ─── BELUM DIPASANG — buka komentar & isi nama builder saat tim siap ───
    { label:'Yantek (4 tim)', tim:'Yantek', recalc:recalcWaYantek_ }, // 1 format utk 4 sub-tim
    { label:'Admin - Lap 1',  tim:'Admin',  subTim:'ISI_SUBTIM_1', recalc:recalcWaAdmin1_ },
    { label:'Admin - Lap 2',  tim:'Admin',  subTim:'ISI_SUBTIM_2', recalc:recalcWaAdmin2_ },
    */
  ];
}

// Cari plugin yg cocok utk satu baris header.
// Prioritas: kecocokan Tim+SubTim; kalau tak ada, pakai entri Tim-saja.
function _findWaBuilder(tim, subTim){
  var t = String(tim||'').trim().toLowerCase();
  var s = String(subTim||'').trim().toLowerCase();
  var reg = _waBuilderRegistry();
  var fallback = null;
  for(var i=0;i<reg.length;i++){
    var e = reg[i];
    if(String(e.tim||'').trim().toLowerCase() !== t) continue;
    if(e.subTim==null || e.subTim===''){ if(!fallback) fallback=e; continue; }
    if(String(e.subTim).trim().toLowerCase() === s) return e;
  }
  return fallback;
}

// ── ADAPTER Inspeksi Jaringan (signature seragam ss,kode) ──
// Gardu tak perlu adapter: recalcRealisasiGarduByHeader sudah (ss,kode)+tulis WA.
function recalcWaInsJar_(ss, kodeHeader){
  var H = COL_INS.HEADER;
  var key = String(kodeHeader||'').trim();
  var sh = ss.getSheetByName(SHEET_INS.HEADER);
  _recalcRealisasiHeaderInsJar(ss, key);        // hitung ulang realisasi
  var data = sh.getDataRange().getValues();      // baca ulang nilai terbaru
  for(var i=1;i<data.length;i++){
    if(String(data[i][H.kodeHeader]||'').trim()===key){
      _tulisWaHeaderInsJar(ss, sh, i+1, data[i]);  // build + tulis WA Text (i+1 = nomor baris sheet, BUKAN index 0-based)
      return;
    }
  }
}

// ── (A) recalc + build 1 header. Dipakai saat SIMPAN/EDIT temuan. ──
function recalcWaByHeader(kodeHeader){
  try{
    var key = String(kodeHeader||'').trim();
    if(!key) return { ok:false, message:'Kode Header kosong.' };
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var H = COL_INS.HEADER;
    var data = ss.getSheetByName(SHEET_INS.HEADER).getDataRange().getValues();
    var row = null;
    for(var i=1;i<data.length;i++){ if(String(data[i][H.kodeHeader]||'').trim()===key){ row=data[i]; break; } }
    if(!row) return { ok:false, message:'Header tak ditemukan: '+key };
    var b = _findWaBuilder(row[H.tim], row[H.subTim]);
    if(!b) return { ok:false, message:'Belum ada builder utk Tim="'+row[H.tim]+'" Sub-Tim="'+row[H.subTim]+'"' };
    b.recalc(ss, key);
    var shH = ss.getSheetByName(SHEET_INS.HEADER);
    data = shH.getDataRange().getValues();
    var wa='';
    for(var j=1;j<data.length;j++){
      if(String(data[j][H.kodeHeader]||'').trim()===key){
        wa=String(data[j][H.waText]||'');
        // WA Text baru saja dibangun ulang -> stempel Timestamp Update (P) + Status TextWA (Q)='Update'.
        shH.getRange(j+1, H.timestampUpdate+1).setValue(new Date());
        shH.getRange(j+1, H.statusTextWa+1).setValue('Update');
        break;
      }
    }
    return { ok:true, kodeHeader:key, builder:b.label, waText:wa };
  }catch(e){ return { ok:false, message:e.message }; }
}

// ── (B) TRIGGER HARIAN — semua tim, tgl hari ini & kemarin. ──
// Pasang SATU trigger time-driven ke fungsi ini (cukup utk 12 tim).
function refreshWaHarian(){
  try{
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var H = COL_INS.HEADER;
    var shH = ss.getSheetByName(SHEET_INS.HEADER);
    var data = shH.getDataRange().getValues();
    var tz='Asia/Jakarta';
    var hariIni=Utilities.formatDate(new Date(),tz,'yyyy-MM-dd');
    var kemarin=Utilities.formatDate(new Date(Date.now()-86400000),tz,'yyyy-MM-dd');
    var n=0, lewat=0, gagal=0;
    for(var i=1;i<data.length;i++){
      var r=data[i];
      if(!r[H.kodeHeader]) continue;
      var tgl=_normTgl(r[H.tanggal]);
      if(tgl!==hariIni && tgl!==kemarin) continue;
      var b=_findWaBuilder(r[H.tim], r[H.subTim]);
      if(!b){ lewat++; continue; }
      try{
        b.recalc(ss, String(r[H.kodeHeader]).trim()); n++;
        // WA dibangun ulang -> stempel Timestamp Update (P) + Status TextWA (Q)='Update'.
        shH.getRange(i+1, H.timestampUpdate+1).setValue(new Date());
        shH.getRange(i+1, H.statusTextWa+1).setValue('Update');
      }
      catch(e){ gagal++; }
    }
    return { ok:true, diproses:n, tanpaBuilder:lewat, gagal:gagal };
  }catch(e){ return { ok:false, message:e.message }; }
}

// ── (C) WEB APP — rebuild SEMUA header semua tim (berat; tombol manual). ──
function refreshSemuaWa(){
  try{
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var H = COL_INS.HEADER;
    var shH = ss.getSheetByName(SHEET_INS.HEADER);
    var data = shH.getDataRange().getValues();
    var n=0, lewat=0, gagal=0;
    for(var i=1;i<data.length;i++){
      var r=data[i];
      if(!r[H.kodeHeader]) continue;
      var b=_findWaBuilder(r[H.tim], r[H.subTim]);
      if(!b){ lewat++; continue; }
      try{
        b.recalc(ss, String(r[H.kodeHeader]).trim()); n++;
        // WA dibangun ulang -> stempel Timestamp Update (P) + Status TextWA (Q)='Update'.
        shH.getRange(i+1, H.timestampUpdate+1).setValue(new Date());
        shH.getRange(i+1, H.statusTextWa+1).setValue('Update');
      }
      catch(e){ gagal++; }
    }
    return { ok:true, diproses:n, tanpaBuilder:lewat, gagal:gagal };
  }catch(e){ return { ok:false, message:e.message }; }
}