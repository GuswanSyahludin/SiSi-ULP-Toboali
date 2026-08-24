/* ═════════════════════════════════════
   Tek-Temuan.gs — SiSi ULP Toboali (MONITORING + MODUL TEMUAN)
   Fungsi: Monitoring Temuan (Jaringan+Gardu), dropdown temuan/penyulang/
           section, simpan/edit temuan, foto->Drive, FORMULA _sectionRange.
   Konstanta & helper bersama ada di Code.gs (Inti):
     _ssIns, _normTgl, SHEET_INS, COL_INS, COL_USERS, STATUS_INS, _readSheetIns,
     _indexBy, _insInRange, _findRowTemuan.
   Lintas-file: updateHeaderInsLangsung ada di Tek-InsJar.gs.
     - Rev 9 Agu 2026 — DUAL-READ (migrasi arsip): pembaca monitoring db_INS_Temuan
       (getMonitoringTemuanIns, getMonitoringTemuanDetailIns, getTitikPetaTemuanIns,
       getListTemuanTerpakaiIns, getTemuanByKodePekerjaanPeny, getTemuanByUlpTanggal)
       + penghitung _recalcRealisasiByKodePeny + generator nomor kode
       (_generateKodePekerjaanTemuanBerantai, _generateKodeTemuanPegMandiri) membaca
       AKTIF + ARSIP via _readSheetDual_() (Tek-Migrasi.gs). Fungsi TULIS
       (simpan/edit temuan, validasi & lengkapi kode) tetap AKTIF-saja.
═════════════════════════════════════ */

var _BULAN_ID_INS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];


/* ═══ MONITORING TEMUAN INSPEKSI (gabungan Jaringan + Gardu) ═══ */

// Normalisasi status TO -> label tampil. Status kosong = "Belum Ada Tim".
function _statusTemuanIns(raw) {
  var s = String(raw || '').trim();
  return s || 'Belum Ada Tim';
}

// Daftar temuan untuk halaman Temuan-Inspeksi (monitoring) + ringkasan.
// filter: { ulp, tglDari, tglSampai, penyulang, timInspeksi, tier, status }
function getMonitoringTemuanIns(filter) {
  try {
    filter = filter || {};
    var fUlp    = String(filter.ulp || '').trim();
    var fDari   = String(filter.tglDari || '').trim();
    var fSampai = String(filter.tglSampai || '').trim();
    var fPeny   = String(filter.penyulang || '').trim();
    var fTim    = String(filter.timInspeksi || '').trim();
    var fTier   = String(filter.tier || '').trim();
    var fStat   = String(filter.status || '').trim();

    var C = COL_INS.TEMUAN;
    // DUAL-READ (migrasi): monitoring membaca AKTIF + ARSIP, dedup by Kode Pekerjaan.
    var rows = _readSheetDual_(SHEET_INS.TEMUAN, C.kodePekerjaan, C.status + 1);
    var list = [];
    var sumTotal = 0, sumBelum = 0, sumProses = 0, sumSelesai = 0;

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var kode = String(r[C.kodePekerjaan] || '').trim();
      if (!kode) continue;

      var rUlp  = String(r[C.ulp] || '').trim();
      var rTgl  = _normTgl(r[C.tanggal]);
      var rPeny = String(r[C.penyulang] || '').trim();
      var rTim  = String(r[C.timInspeksi] || '').trim();
      var rTier = String(r[C.tier] || '').trim();
      var rStat = _statusTemuanIns(r[C.status]);

      if (fUlp && rUlp !== fUlp) continue;
      if (!_insInRange(rTgl, fDari, fSampai)) continue;
      if (fPeny && rPeny !== fPeny) continue;
      if (fTim && rTim !== fTim) continue;
      if (fTier && rTier !== fTier) continue;

      // Ringkasan mengikuti semua filter KECUALI Status TO
      sumTotal++;
      if (rStat === STATUS_INS.SELESAI) sumSelesai++;
      else if (rStat === 'Belum Ada Tim') sumBelum++;
      else sumProses++;

      if (fStat && rStat !== fStat) continue;

      list.push({
        kodePekerjaan: kode,
        kodeHeader:   String(r[C.kodeHeader] || ''),
        ulp:          rUlp,
        tanggal:      rTgl,
        timInspeksi:  rTim,
        objek:        String(r[C.objekInspeksi] || ''),
        penyulang:    rPeny,
        section:      String(r[C.section] || ''),
        segmen:       String(r[C.segmen] || ''),
        tier:         rTier,
        temuan:       String(r[C.temuan] || ''),
        status:       rStat,
        fotoUrl:      String(r[C.fotoTemuanUrl] || '')
      });
    }

    list.sort(function (a, b) {
      return String(b.tanggal).localeCompare(String(a.tanggal))
          || String(a.kodePekerjaan).localeCompare(String(b.kodePekerjaan));
    });

    return {
      ok: true,
      summary: { total: sumTotal, belum: sumBelum, proses: sumProses, selesai: sumSelesai },
      list: list
    };
  } catch (e) {
    return { ok: false, error: e.message, summary: { total:0, belum:0, proses:0, selesai:0 }, list: [] };
  }
}

// Detail satu temuan (untuk modal Detail di halaman Temuan-Inspeksi).
function getMonitoringTemuanDetailIns(kodePekerjaan) {
  try {
    var C = COL_INS.TEMUAN;
    var key = String(kodePekerjaan || '').trim();
    if (!key) return { ok: false, error: 'Kode pekerjaan kosong.' };
    // DUAL-READ (migrasi): detail temuan yg sudah pindah ke arsip tetap bisa dibuka.
    var rows = _readSheetDual_(SHEET_INS.TEMUAN, C.kodePekerjaan, C.folderPath + 1);
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (String(r[C.kodePekerjaan] || '').trim() !== key) continue;
      return {
        ok: true,
        data: {
          kodePekerjaan:    key,
          kodeHeader:       String(r[C.kodeHeader] || ''),
          ulp:              String(r[C.ulp] || ''),
          tanggal:          _normTgl(r[C.tanggal]),
          timInspeksi:      String(r[C.timInspeksi] || ''),
          objek:            String(r[C.objekInspeksi] || ''),
          penyulang:        String(r[C.penyulang] || ''),
          section:          String(r[C.section] || ''),
          segmen:           String(r[C.segmen] || ''),
          nomorTiang:       String(r[C.nomorTiang] || ''),
          nomorGardu:       String(r[C.nomorGardu] || ''),
          tier:             String(r[C.tier] || ''),
          temuan:           String(r[C.temuan] || ''),
          deskripsi:        String(r[C.deskripsi] || ''),
          koordinat:        String(r[C.koordinat] || ''),
          status:           _statusTemuanIns(r[C.status]),
          timEksekusi:      String(r[C.timEksekusi] || ''),
          catatan:          String(r[C.catatan] || ''),
          jenisPekerjaan:   String(r[C.jenisPekerjaan] || ''),
          tglSelesai:       _normTgl(r[C.tglSelesai]),
          fotoTemuanUrl:    String(r[C.fotoTemuanUrl] || ''),
          fotoTiangUrl:     String(r[C.fotoTiangUrl] || ''),
          fotoPekerjaanUrl: String(r[C.fotoPekerjaanUrl] || ''),
          fotoSesudahUrl:   String(r[C.fotoSesudahUrl] || '')
        }
      };
    }
    return { ok: false, error: 'Temuan tidak ditemukan: ' + key };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}


/* ---------- TITIK PETA TEMUAN INSPEKSI (db_INS_Temuan) ----------
   Sumber tunggal halaman Temuan-Inspeksi versi PETA: 1 panggilan mengembalikan
   titik peta + ringkasan + baris tabel sekaligus (hemat round-trip).
   OPTIMASI (disiapkan utk >1000 temuan):
     - getRange terbatas A..AA (bukan getDataRange) -> jauh lebih ringan.
     - Payload RAMPING: hanya field yang dipakai peta/tabel. Detail lengkap tetap
       lewat getMonitoringTemuanDetailIns saat popup/modal dibuka.
     - CacheService 5 menit per kombinasi filter (dilewati bila payload > 95 KB).
   filter: { ulp, tglDari, tglSampai, penyulang, temuan, status } */
function getTitikPetaTemuanIns(filter){
  try{
    filter = filter || {};
    var fUlp    = String(filter.ulp || '').trim();
    var fDari   = String(filter.tglDari || '').trim();
    var fSmp    = String(filter.tglSampai || '').trim();
    var fPeny   = String(filter.penyulang || '').trim();
    var fTemuan = String(filter.temuan || '').trim();
    var fStat   = String(filter.status || '').trim();

    var ck = 'ins_peta_' + [fUlp,fDari,fSmp,fPeny,fTemuan,fStat].join('|');
    var cache = CacheService.getScriptCache();
    var hit = cache.get(ck);
    if(hit) return JSON.parse(hit);

    var C = COL_INS.TEMUAN;
    var kosong = { ok:true, list:[], summary:{ total:0, belum:0, proses:0, selesai:0 },
                   jumlah:0, tanpaKoordinat:0 };

    // DUAL-READ (migrasi): baca A..AA dari AKTIF + ARSIP (dedup by Kode Pekerjaan) —
    // kolom setelah Status WO memang tidak dipakai peta, jadi tetap hemat.
    var vals = _readSheetDual_(SHEET_INS.TEMUAN, C.kodePekerjaan, C.status + 1);
    if(!vals.length) return kosong;
    var list = [], tanpaKoordinat = 0;
    var sumTotal = 0, sumBelum = 0, sumProses = 0, sumSelesai = 0;

    for(var i=0;i<vals.length;i++){
      var r = vals[i];
      var kode = String(r[C.kodePekerjaan] || '').trim();
      if(!kode) continue;

      var rUlp = String(r[C.ulp] || '').trim();
      var rTgl = _normTgl(r[C.tanggal]);
      var rPny = String(r[C.penyulang] || '').trim();
      var rTem = String(r[C.temuan] || '').trim();
      var rSta = _statusTemuanIns(r[C.status]);

      if(fUlp   && rUlp !== fUlp) continue;
      if(!_insInRange(rTgl, fDari, fSmp)) continue;
      if(fPeny  && rPny !== fPeny) continue;
      if(fTemuan && rTem !== fTemuan) continue;

      // Ringkasan mengikuti semua filter KECUALI Status (agar kartu tetap informatif).
      sumTotal++;
      if(rSta === STATUS_INS.SELESAI) sumSelesai++;
      else if(rSta === 'Belum Ada Tim') sumBelum++;
      else sumProses++;

      if(fStat && rSta !== fStat) continue;

      // Lat (W) / Long (X) tersimpan sebagai angka; fallback parse Koordinat (V).
      var lat = parseFloat(r[C.lat]), lng = parseFloat(r[C.long]);
      if(isNaN(lat) || isNaN(lng)){
        var sp = String(r[C.koordinat] || '').split(',');
        if(sp.length >= 2){ lat = parseFloat(sp[0]); lng = parseFloat(sp[1]); }
      }
      var adaKoordinat = !(isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0));
      if(!adaKoordinat) tanpaKoordinat++;

      var isGardu = String(r[C.objekInspeksi] || '').toLowerCase().indexOf('gardu') >= 0;
      list.push({
        k: kode,
        a: adaKoordinat ? lat : null,
        o: adaKoordinat ? lng : null,
        t: rTgl,
        p: rPny,
        s: String(r[C.section] || ''),
        m: rTem,
        r: String(r[C.tier] || ''),
        st: rSta,
        g: isGardu ? 1 : 0,
        n: isGardu ? String(r[C.nomorGardu] || '') : String(r[C.nomorTiang] || '')
      });
    }

    list.sort(function(a,b){
      return String(b.t).localeCompare(String(a.t)) || String(a.k).localeCompare(String(b.k));
    });

    var res = {
      ok: true,
      list: list,
      summary: { total:sumTotal, belum:sumBelum, proses:sumProses, selesai:sumSelesai },
      jumlah: list.length,
      tanpaKoordinat: tanpaKoordinat
    };
    try{
      var js = JSON.stringify(res);
      if(js.length < 95000) cache.put(ck, js, 300);   // batas cache 100 KB / key
    }catch(e){}
    return res;
  }catch(e){
    return { ok:false, error:e.message, list:[],
             summary:{ total:0, belum:0, proses:0, selesai:0 }, jumlah:0, tanpaKoordinat:0 };
  }
}

/* Daftar NAMA TEMUAN unik untuk dropdown filter halaman Temuan-Inspeksi.
   Diambil dari data nyata db_INS_Temuan (kolom P), bukan master db_List_Temuan,
   supaya opsi filter selalu selaras dengan data yang ada. Cache 10 menit. */
function getListTemuanTerpakaiIns(ulp){
  try{
    var u = String(ulp || '').trim().toLowerCase();
    var ck = 'ins_temuan_dipakai_' + (u || 'all');
    var cache = CacheService.getScriptCache();
    var hit = cache.get(ck);
    if(hit) return JSON.parse(hit);

    var C = COL_INS.TEMUAN;
    // DUAL-READ (migrasi): opsi dropdown dari AKTIF + ARSIP, dedup by Kode Pekerjaan.
    var vals = _readSheetDual_(SHEET_INS.TEMUAN, C.kodePekerjaan, C.temuan + 1);
    if(!vals.length) return { ok:true, list:[] };
    var seen = {}, out = [];
    for(var i=0;i<vals.length;i++){
      if(u && String(vals[i][C.ulp] || '').trim().toLowerCase() !== u) continue;
      var nm = String(vals[i][C.temuan] || '').trim();
      if(!nm || seen[nm]) continue;
      seen[nm] = 1; out.push(nm);
    }
    out.sort(function(a,b){ return a.localeCompare(b); });
    var res = { ok:true, list:out };
    try{ cache.put(ck, JSON.stringify(res), 600); }catch(e){}
    return res;
  }catch(e){ return { ok:false, error:String(e), list:[] }; }
}


/* ---------- Dropdown Temuan (db_List_Temuan: C=Objek Inspeksi, D=Temuan) ----------
   Temuan difilter berdasar Objek Inspeksi (kolom C); daftar nama temuan diambil dari kolom D. */
function getListTemuanByObjek(objek){
  try{
    var key = String(objek||'').trim().toLowerCase();
    var ck = 'ins_listtemuan_obj_' + (key || 'all');
    var cache = CacheService.getScriptCache();
    var hit = cache.get(ck);
    if(hit) return JSON.parse(hit);

    var sh = _ssIns().getSheetByName('db_List_Temuan');
    if(!sh) return { ok:false, error:'Sheet db_List_Temuan tidak ditemukan' };

    var data = sh.getDataRange().getValues();
    var seen = {}, list = [];
    for(var i=1;i<data.length;i++){
      var obj  = String(data[i][2]||'').trim();  // C = Objek Inspeksi
      var nama = String(data[i][3]||'').trim();  // D = Temuan
      if(!nama) continue;
      if(key && obj.toLowerCase() !== key) continue;
      if(seen[nama]) continue;
      seen[nama] = true; list.push(nama);
    }
    list.sort(function(a,b){ return a.localeCompare(b); });

    var res = { ok:true, objek:objek, list:list };
    cache.put(ck, JSON.stringify(res), 600);
    return res;
  }catch(e){ return { ok:false, error:String(e) }; }
}
// Alias kompatibilitas: argumen kini diperlakukan sebagai Objek Inspeksi.
function getListTemuanByTier(objek){ return getListTemuanByObjek(objek); }

/* ---------- Dropdown Penyulang (db_Penyulang: B=ULP, C=Nama, E=Section) ---------- */
function getDataPenyulangByUlp(ulp){
  try{
    var u = String(ulp||'').trim().toLowerCase();
    var ck = 'ins_peny_data_' + (u || 'all');
    var cache = CacheService.getScriptCache();
    var hit = cache.get(ck);
    if(hit) return JSON.parse(hit);

    var sh = _ssIns().getSheetByName(SHEET_INS.PENYULANG);
    if(!sh) return { ok:false, error:'Sheet db_Penyulang tidak ditemukan' };
    var data = sh.getDataRange().getValues();
    var seen = {}, list = [];
    for(var i=1;i<data.length;i++){
      var rowUlp = String(data[i][1]||'').trim().toLowerCase(); // B = ULP
      var nama   = String(data[i][2]||'').trim();               // C = Nama
      if(!nama) continue;
      if(u && rowUlp && rowUlp !== u) continue;
      if(seen[nama]) continue;
      seen[nama] = true;
      list.push({ nama: nama, section: String(data[i][4]||'').trim() }); // E = Section
    }
    list.sort(function(a,b){ return a.nama.localeCompare(b.nama); });

    var res = { ok:true, ulp:ulp, list:list };
    cache.put(ck, JSON.stringify(res), 600);
    return res;
  }catch(e){ return { ok:false, error:String(e) }; }
}

/* ---------- Section per Penyulang (db_Penyulang: C=Nama, E=Section) ---------- */
function getSectionByPenyulang(penyulang){
  try{
    var p = String(penyulang||'').trim().toLowerCase();
    if(!p) return { ok:true, penyulang:penyulang, list:[] };
    var ck = 'ins_section_peny_' + p;
    var cache = CacheService.getScriptCache();
    var hit = cache.get(ck);
    if(hit) return JSON.parse(hit);

    var sh = _ssIns().getSheetByName(SHEET_INS.PENYULANG);
    if(!sh) return { ok:false, error:'Sheet db_Penyulang tidak ditemukan' };
    var data = sh.getDataRange().getValues();
    var seen = {}, list = [];
    for(var i=1;i<data.length;i++){
      var nama = String(data[i][2]||'').trim();   // C = Nama
      if(nama.toLowerCase() !== p) continue;
      var sec = String(data[i][4]||'').trim();     // E = Section
      if(!sec || seen[sec]) continue;
      seen[sec] = true;
      list.push(sec);
    }
    list.sort(function(a,b){ return a.localeCompare(b); });
    var res = { ok:true, penyulang:penyulang, list:list };
    cache.put(ck, JSON.stringify(res), 600);
    return res;
  }catch(e){ return { ok:false, error:String(e) }; }
}

/* ---------- TITIK per Penyulang (pecah label section master jadi titik unik) ----------
   Label section master berformat "Induk - Anak"; fungsi ini memecah jadi daftar TITIK
   (induk + anak) unik, lalu mengurutkannya sesuai topologi (GI -> ujung), bukan alfabet.
   Dipakai dropdown Section Awal/Akhir pada form Realisasi Inspeksi Jaringan. */
function getTitikByPenyulang(penyulang){
  try{
    var sec = getSectionByPenyulang(penyulang);
    if(!sec || !sec.ok) return sec || { ok:false, error:'Gagal memuat section.' };
    var topo = _buildPenyulangTopologi(penyulang);
    var seen = {}, titik = [];
    (sec.list || []).forEach(function(label){
      var pr = _parseSectionLabel(label);
      [pr.parent].concat(pr.children || []).forEach(function(t){
        t = String(t || '').trim();
        if(t && !seen[t]){ seen[t] = 1; titik.push(t); }
      });
    });
    titik.sort(function(a,b){
      var oa = (a in topo.order) ? topo.order[a] : 999999;
      var ob = (b in topo.order) ? topo.order[b] : 999999;
      if(oa !== ob) return oa - ob;
      return a.localeCompare(b);
    });
    return { ok:true, penyulang:penyulang, list:titik };
  }catch(e){ return { ok:false, error:String(e) }; }
}

/* ---------- Helper umum ---------- */
function _userInfoIns(username){
  var out = { ulp:'', kodeUlp:'', tim:'', role:'', subTim:'' };
  var sh = _ssIns().getSheetByName('db_Users');
  if(!sh) return out;
  var data = sh.getDataRange().getValues();
  var u = String(username||'').trim().toLowerCase();
  for(var i=1;i<data.length;i++){
    if(String(data[i][2]||'').trim().toLowerCase() === u){ // C = userName
      out.role    = String(data[i][4]||'').trim();          // E = role
      out.ulp     = String(data[i][5]||'').trim();          // F = ulp
      out.kodeUlp = String(data[i][6]||'').trim();          // G = kodeUlp
      out.tim     = String(data[i][8]||'').trim();          // I = tim
      out.subTim  = String(data[i][9]||'').trim();          // J = sub-tim
      break;
    }
  }
  return out;
}
function _hariIndoIns(tgl){
  var d = (tgl instanceof Date) ? tgl : new Date(String(tgl).slice(0,10) + 'T00:00:00');
  if(isNaN(d.getTime())) return '';
  return ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][d.getDay()];
}
function _tsNowIns(){ return Utilities.formatDate(new Date(),'Asia/Jakarta','dd/MM/yyyy HH:mm:ss'); }

/* ---------- Kode Pekerjaan temuan SINTETIS (tanpa induk / Fitur 2 SIE Teknik) ----------
   Membuat rantai bergaya Inspeksi Jaringan dengan tag PEG, TANPA menulis baris
   db_Global_Header / db_InsJar_Realisasi. Hanya distempel di db_INS_Temuan:
     Kode Header    (kolom B) = PEG-<KodeULP><YYMMDD>001   (1 header BERSAMA per ULP+tanggal)
     Kode Pekerjaan (kolom D) = <KodeHeader>-PNY.<pnn>-TJR.<tnn>
   Aturan penomoran (semua temuan PEG di ULP+tanggal sama berbagi 1 header):
     - Penyulang SAMA -> PNY tetap, TJR naik (.001, .002, ...).
     - Penyulang BEDA -> PNY baru (.002, .003, ...), TJR mulai .001.
   Mengembalikan { kodeHeader, kodePekerjaanPeny, kodePekerjaan }. */
function _generateKodeTemuanPegMandiri(ss, info, tanggal, penyulang){
  var ymd = _normTgl(tanggal).replace(/-/g,'').slice(2);      // yymmdd (selaras IJR)
  var kodeHeader = 'PEG-' + String((info&&info.kodeUlp)||'').trim() + ymd + '001';
  var pnyPrefix = kodeHeader + '-PNY.';
  var pkey = String(penyulang||'').trim().toLowerCase();

  var pnyByPenyulang = {}, maxPny = 0, maxTgoByPny = {};
  // DUAL-READ (migrasi): nomor urut (PNY/TJR) dihitung dari AKTIF + ARSIP agar kode baru
  // TIDAK menabrak kode yang sudah pindah ke arsip (Kode Pekerjaan = kunci dedup migrasi).
  var T = COL_INS.TEMUAN;
  var vals = _readSheetDual_(SHEET_INS.TEMUAN, T.kodePekerjaan, T.penyulang + 1);
  if(vals.length > 0){
    for(var i=0;i<vals.length;i++){
      var kp = String(vals[i][T.kodePekerjaan]||'').trim();
      if(kp.indexOf(pnyPrefix) !== 0) continue;               // hanya rantai PEG header ini
      var mm = kp.substring(pnyPrefix.length).match(/^(\d+)-(?:TJR|TGO)\.(\d+)/);
      if(!mm) continue;
      var pn = parseInt(mm[1],10), tn = parseInt(mm[2],10);
      if(isNaN(pn)) continue;
      if(pn > maxPny) maxPny = pn;
      if(!isNaN(tn) && (!(pn in maxTgoByPny) || tn > maxTgoByPny[pn])) maxTgoByPny[pn] = tn;
      var pj = String(vals[i][T.penyulang]||'').trim().toLowerCase();
      if(pj && !(pj in pnyByPenyulang)) pnyByPenyulang[pj] = pn;
    }
  }

  var pny = (pkey && (pkey in pnyByPenyulang)) ? pnyByPenyulang[pkey] : (maxPny + 1);
  var tgo = ((pny in maxTgoByPny) ? maxTgoByPny[pny] : 0) + 1;
  var pnn = ('00' + pny).slice(-3), tnn = ('00' + tgo).slice(-3);
  return {
    kodeHeader: kodeHeader,
    kodePekerjaanPeny: pnyPrefix + pnn,
    kodePekerjaan: pnyPrefix + pnn + '-TJR.' + tnn
  };
}

/* ---------- Kode Pekerjaan temuan BERANTAI dari Kode Pekerjaan Penyulang (Jaringan) ----------
   Format: <KodePekerjaanPenyulang>-TJR.<nnn> ; nnn di-reset per Kode Pekerjaan Penyulang.
   Dipakai untuk temuan Jaringan yang lahir dari Realisasi (Fitur 1) sehingga rantai
   Header(IJR) -> Realisasi(PNY) -> Temuan(TJR) tetap terjaga. */
function _generateKodePekerjaanTemuanBerantai(ss, kodePekerjaanPeny){
  var key = String(kodePekerjaanPeny||'').trim();
  if(!key) return '';
  var prefix = key + '-TJR.';
  // DUAL-READ (migrasi): nomor urut TJR dihitung dari AKTIF + ARSIP agar kode baru TIDAK
  // menabrak kode temuan yang sudah pindah ke arsip (Kode Pekerjaan = kunci dedup migrasi).
  var maks = 0;
  var col = _readSheetDual_(SHEET_INS.TEMUAN, COL_INS.TEMUAN.kodePekerjaan, COL_INS.TEMUAN.kodePekerjaan + 1);
  if(col.length > 0){
    for(var i=0;i<col.length;i++){
      var v = String(col[i][COL_INS.TEMUAN.kodePekerjaan]||'').trim();
      if(v.indexOf(prefix) === 0){
        var num = parseInt(v.substring(prefix.length), 10);
        if(!isNaN(num) && num > maks) maks = num;
      }
    }
  }
  return prefix + ('00' + (maks+1)).slice(-3);
}

/* ---------- Prefix Kode Header mengikuti Role/Sub-Tim (selaras formula AppSheet) ----------
   Admin / Super User -> PEG ; Sub-Tim Inspeksi Jaringan -> INSJAR ; Inspeksi Gardu -> INSDU ;
   selain itu -> LAIN. Dipakai untuk menstempel Kode Header pada temuan yang dikirim TANPA
   header (mis. fitur "Tambah Temuan" di SIE Teknik). */
function _prefixHeaderByUserIns(info){
  var role = String((info && info.role) || '').trim().toLowerCase();
  if(role === 'admin' || role === 'super user') return 'PEG';
  var sub = String((info && info.subTim) || '').trim().toLowerCase();
  if(sub === 'inspeksi jaringan') return 'INSJAR';
  if(sub === 'inspeksi gardu')    return 'INSDU';
  return 'LAIN';
}

/* Kode Header utk temuan tanpa header (Fitur 2 / SIE Teknik):
   1 header BERSAMA per (prefix + Kode ULP + tanggal) -> selalu berakhir '001'.
   Hanya distempel di kolom Kode Header db_INS_Temuan; TIDAK menulis baris db_Global_Header. */
function _kodeHeaderTemuanKosong(info, tgl){
  var ymd = _normTgl(tgl).replace(/-/g,'');                 // yyyymmdd
  var prefix = _prefixHeaderByUserIns(info);
  return prefix + '-HDR-' + String((info && info.kodeUlp) || '').trim() + ymd + '001';
}

/* ---------- Resolusi info user dari email ATAU userName (db_Users: B=email, C=userName) ---------- */
function _infoUserInsAny(idUser){
  var key = String(idUser||'').trim().toLowerCase();
  var out = { ulp:'', kodeUlp:'', tim:'', role:'', subTim:'' };
  if(!key) return out;
  var sh = _ssIns().getSheetByName('db_Users');
  if(!sh) return out;
  var data = sh.getDataRange().getValues();
  for(var i=1;i<data.length;i++){
    var email = String(data[i][1]||'').trim().toLowerCase();   // B email
    var uname = String(data[i][2]||'').trim().toLowerCase();   // C userName
    if(email === key || uname === key){
      out.role    = String(data[i][4]||'').trim();             // E role
      out.ulp     = String(data[i][5]||'').trim();             // F ulp
      out.kodeUlp = String(data[i][6]||'').trim();             // G kodeUlp
      out.tim     = String(data[i][8]||'').trim();             // I tim
      out.subTim  = String(data[i][9]||'').trim();             // J sub-tim
      return out;
    }
  }
  return out;
}

/* Fallback kodeUlp dari NAMA ULP (db_Users: F=ulp -> G=kodeUlp). */
function _kodeUlpByNamaUlp(namaUlp){
  var key = String(namaUlp||'').trim().toLowerCase();
  if(!key) return '';
  var sh = _ssIns().getSheetByName('db_Users');
  if(!sh) return '';
  var data = sh.getDataRange().getValues();
  for(var i=1;i<data.length;i++){
    if(String(data[i][5]||'').trim().toLowerCase() === key) return String(data[i][6]||'').trim();
  }
  return '';
}

/* ---------- ISI OTOMATIS Kode Header & Kode Pekerjaan (AppSheet cukup isi data temuan) ----------
   Petugas via AppSheet cukup mengisi data temuan; kolom Kode Header & Kode Pekerjaan dibiarkan
   kosong, lalu DIISI fungsi ini (server = acuan, bebas masalah timing INITIAL VALUE).
     - Baris dgn Kode Pekerjaan Penyulang dari Jaringan -> rantai TJR ; dari Gardu (…-GDU.) -> rantai TGD ; Kode Header diambil dari induk.
     - Baris tanpa induk -> rantai sintetis PEG (PEG-<KodeULP><YYMMDD>001-PNY.<pnn>-TJR.<tnn>).
   Aman dijalankan berulang; dipanggil dari validasiUlangFotoTemuan() — yang sudah dipicu
   bot db_INS_Temuan (action 'validasiFoto') + trigger waktu tiap 1 jam — sehingga tak perlu
   trigger onChange terpisah yang berjalan bersamaan dgn bot. Hanya mengisi yang kosong. */
function lengkapiKodeTemuanKosong(){
  var lock = LockService.getScriptLock();
  try{ lock.waitLock(25000); }catch(e){ return { ok:false, error:'Sibuk, coba lagi.' }; }
  try{
    var ss = _ssIns();
    var sh = ss.getSheetByName(SHEET_INS.TEMUAN);
    if(!sh || sh.getLastRow() < 2) return { ok:true, terisi:0 };
    var T = COL_INS.TEMUAN;
    var last = sh.getLastRow();
    var vals = sh.getRange(2, 1, last - 1, T.inputBy + 1).getValues();  // A..Y
    var terisi = 0;

    for(var i=0;i<vals.length;i++){
      var r = vals[i];
      if(String(r[T.kodePekerjaan]||'').trim()) continue;        // D sudah terisi -> lewati
      if(!String(r[T.temuan]||'').trim()) continue;              // P kosong -> baris belum siap

      var kpPeny = String(r[T.kodePekerjaanPeny]||'').trim();    // C
      var tgl    = _normTgl(r[T.tanggal]);                       // G
      var kodeBaru = '', headerBaru = String(r[T.kodeHeader]||'').trim(); // B

      if(kpPeny){
        if(kpPeny.indexOf('-GDU.') > 0){
          // Gardu — berantai TGD dari Kode Pekerjaan Gardu.
          kodeBaru = _generateKodeTemuanGarduBerantai(ss, kpPeny);
          if(!headerBaru){
            var pg = kpPeny.indexOf('-GDU.');
            headerBaru = (pg > 0) ? kpPeny.substring(0, pg) : kpPeny;
          }
        }else{
          // Jaringan — berantai TJR dari Kode Pekerjaan Penyulang.
          kodeBaru = _generateKodePekerjaanTemuanBerantai(ss, kpPeny);
          if(!headerBaru){
            var p = kpPeny.indexOf('-PNY.');
            headerBaru = (p > 0) ? kpPeny.substring(0, p) : kpPeny;
          }
        }
      }else{
        var info = _infoUserInsAny(r[T.inputBy]);                // Y (email/userName)
        if(!info.kodeUlp) info.kodeUlp = _kodeUlpByNamaUlp(r[T.ulp]); // fallback dari nama ULP (E)
        var peg = _generateKodeTemuanPegMandiri(ss, info, tgl, String(r[T.penyulang]||'')); // J
        kodeBaru   = peg.kodePekerjaan;
        headerBaru = peg.kodeHeader;
      }
      if(!kodeBaru) continue;

      var rowNum = i + 2;
      if(headerBaru) sh.getRange(rowNum, T.kodeHeader + 1).setValue(headerBaru);     // B
      sh.getRange(rowNum, T.kodePekerjaan + 1).setValue(kodeBaru);                   // D
      sh.getRange(rowNum, T.folderPath + 1).setValue(_folderTemuanPathStr(tgl, kodeBaru)); // AR
      SpreadsheetApp.flush();   // agar baris berikutnya melihat nomor terbaru
      terisi++;
    }
    return { ok:true, terisi:terisi };
  }catch(e){
    return { ok:false, error:e.message };
  }finally{
    try{ lock.releaseLock(); }catch(e){}
  }
}

/* ---------- CEK & PERBAIKI FORMAT Kode Temuan (kolom D db_INS_Temuan) ----------
   Sejak INITIAL VALUE AppSheet mengisi Kode Temuan dgn UNIQUEID() utk input tanpa
   induk (Fitur 2), nilai itu BUKAN format rantai yang benar. Fungsi ini memindai
   db_INS_Temuan, mendeteksi Kode Temuan yang TIDAK sesuai format
   (…-PNY.<nnn>-TJR.<nnn> utk Jaringan / …-GDU.<nnn>-TGD.<nnn> utk Gardu), lalu MEMPERBAHARUI-nya dengan kode rantai yang benar:
     - Ada Kode Pekerjaan Penyulang (C): Jaringan -> <KPP>-TJR.<nnn> ; Gardu (…-GDU.) -> <KPG>-TGD.<nnn>.
     - Tanpa induk                     -> rantai sintetis PEG (Fitur 2).
   Kode yang SUDAH sesuai format TIDAK diubah (penomoran lama dipertahankan).
   Kode Header (B) & Folder Path (AR) ikut diperbarui utk baris yang diperbaiki.
   ⚠️ Bila Kode Temuan dijadikan KEY tabel, penulisan ulang ini MENGUBAH nilai KEY
      (UNIQUEID -> kode rantai) sehingga referensi/foto bisa terputus. Disarankan KEY
      tabel = kolom `ID` (UNIQUEID) terpisah, dan Kode Temuan kolom teks biasa.
   Aman dijalankan berulang. */
var _RE_KODE_TEMUAN_VALID = /(?:-PNY\.\d+-(?:TJR|TGO)\.\d+|-GDU\.\d+-TGD\.\d+)$/;

function _isFormatKodeTemuanValid(kode){
  return _RE_KODE_TEMUAN_VALID.test(String(kode || '').trim());
}

function perbaikiFormatKodeTemuan(){
  var lock = LockService.getScriptLock();
  try{ lock.waitLock(25000); }catch(e){ return { ok:false, error:'Sibuk, coba lagi.' }; }
  try{
    var ss = _ssIns();
    var sh = ss.getSheetByName(SHEET_INS.TEMUAN);
    if(!sh || sh.getLastRow() < 2) return { ok:true, diperbaiki:0, dicek:0 };
    var T = COL_INS.TEMUAN;
    var last = sh.getLastRow();
    var vals = sh.getRange(2, 1, last - 1, T.inputBy + 1).getValues();  // A..Y
    var diperbaiki = 0, dicek = 0;

    for(var i=0;i<vals.length;i++){
      var r = vals[i];
      if(!String(r[T.temuan]||'').trim()) continue;            // P kosong -> baris belum siap
      dicek++;
      var kodeLama = String(r[T.kodePekerjaan]||'').trim();    // D
      if(_isFormatKodeTemuanValid(kodeLama)) continue;         // format sudah benar -> jangan diubah

      var kpPeny = String(r[T.kodePekerjaanPeny]||'').trim();  // C
      var tgl    = _normTgl(r[T.tanggal]);                     // G
      var kodeBaru = '', headerBaru = String(r[T.kodeHeader]||'').trim(); // B

      if(kpPeny){
        if(kpPeny.indexOf('-GDU.') > 0){
          // Fitur Gardu — berantai TGD dari Kode Pekerjaan Gardu nyata.
          kodeBaru = _generateKodeTemuanGarduBerantai(ss, kpPeny);
          var pg = kpPeny.indexOf('-GDU.');
          headerBaru = (pg > 0) ? kpPeny.substring(0, pg) : kpPeny;
        }else{
          // Fitur 1 — berantai TJR dari Kode Pekerjaan Penyulang nyata.
          kodeBaru = _generateKodePekerjaanTemuanBerantai(ss, kpPeny);
          var p = kpPeny.indexOf('-PNY.');
          headerBaru = (p > 0) ? kpPeny.substring(0, p) : kpPeny;
        }
      }else{
        // Fitur 2 — rantai sintetis PEG.
        var info = _infoUserInsAny(r[T.inputBy]);                // Y (email/userName)
        if(!info.kodeUlp) info.kodeUlp = _kodeUlpByNamaUlp(r[T.ulp]); // fallback nama ULP (E)
        var peg = _generateKodeTemuanPegMandiri(ss, info, tgl, String(r[T.penyulang]||'')); // J
        kodeBaru   = peg.kodePekerjaan;
        headerBaru = peg.kodeHeader;
      }
      if(!kodeBaru || !_isFormatKodeTemuanValid(kodeBaru)) continue; // jangan tulis kode tak valid

      var rowNum = i + 2;
      if(headerBaru) sh.getRange(rowNum, T.kodeHeader + 1).setValue(headerBaru);      // B
      sh.getRange(rowNum, T.kodePekerjaan + 1).setValue(kodeBaru);                     // D
      sh.getRange(rowNum, T.folderPath + 1).setValue(_folderTemuanPathStr(tgl, kodeBaru)); // AR
      SpreadsheetApp.flush();   // agar baris berikutnya melihat nomor terbaru
      diperbaiki++;
    }
    return { ok:true, diperbaiki:diperbaiki, dicek:dicek };
  }catch(e){
    return { ok:false, error:e.message };
  }finally{
    try{ lock.releaseLock(); }catch(e){}
  }
}

/* ---------- Foto -> Google Drive ---------- */
function _getOrCreateFolderByPath(pathArr){
  // Akar penyimpanan foto: folder induk di SHARED DRIVE (bukan My Drive lagi).
  // Ganti ID di bawah ini bila folder induk Shared Drive berpindah.
  var DRIVE_ROOT_ID = '1lpZAbSVkHjceLJlDEWkiUl27I7O4nmGf';
  var folder = DriveApp.getFolderById(DRIVE_ROOT_ID);
  for(var i=0;i<pathArr.length;i++){
    var nm = String(pathArr[i]).trim();
    if(!nm) continue;
    var it = folder.getFoldersByName(nm);
    folder = it.hasNext() ? it.next() : folder.createFolder(nm);
  }
  return folder;
}
function _folderTemuanPath(tanggal, kodePekerjaan){
  var p = _normTgl(tanggal).split('-');          // [yyyy, mm, dd]
  var bl = parseInt(p[1],10);
  var blFolder = ('0'+bl).slice(-2) + '. ' + _BULAN_ID_INS[bl-1];
  return ['AppSheet SiSi - ULP Toboali','Temuan Inspeksi', p[0], blFolder, p[2], kodePekerjaan];
}
// Versi STRING dari path folder temuan (dipisah '/'). Disimpan ke kolom Folder Path (AR)
// db_INS_Temuan agar web app & AppSheet sepakat lokasi penyimpanan foto.
// Hasil: "AppSheet SiSi - ULP Toboali/Temuan Inspeksi/YYYY/NN. Bulan/DD/<kodePekerjaan>".
function _folderTemuanPathStr(tanggal, kodePekerjaan){
  return _folderTemuanPath(tanggal, kodePekerjaan).join('/');
}
function _uploadFotoTemuan(b64, mime, namaFile, folder){
  if(!b64) return { nama:'', url:'' };
  var bytes = Utilities.base64Decode(b64);
  var ext = (mime && mime.indexOf('png') >= 0) ? '.png' : '.jpg';
  var fname = namaFile.replace(/[\\/:*?"<>|]/g,'-') + ext;
  var file = folder.createFile(Utilities.newBlob(bytes, mime || 'image/jpeg', fname));
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e){}
  return { nama: fname, url: file.getUrl() };
}

/* ═══ FORMULA INTI — SECTION RANGE (berlaku untuk SEMUA tim/modul) ═══
   Dipakai bersama: Inspeksi, Hartek, ROW, Yantek, dst.
   ' - ' = pemisah AWAL & AKHIR.  ' / ' = penanda jalur bercabang (>=2 section).
   Topologi penyulang dibangun OTOMATIS dari label section (master db_Penyulang).
   Pemakaian:  var hasil = _sectionRange(namaPenyulang, [labelSection, ...]); */

// "A - B / C" -> { parent:'A', children:['B','C'] } ; "A - B" -> { parent:'A', children:['B'] }
function _parseSectionLabel(label){
  var s = String(label || '').trim();
  var i = s.indexOf(' - ');
  if (i === -1) return { parent: s, children: [] };
  var parent = s.substring(0, i).trim();
  var children = s.substring(i + 3).split('/').map(function(x){ return String(x).trim(); })
                  .filter(function(x){ return x; });
  return { parent: parent, children: children };
}

// Lipat relasi induk->anak sebuah label ke objek topologi (urut sesuai kemunculan)
function _foldSectionLabel(topo, label){
  var pr = _parseSectionLabel(label);
  if (!pr.parent) return;
  if (!(pr.parent in topo.order)) topo.order[pr.parent] = topo._seq++;
  if (!topo.childrenOf[pr.parent]) topo.childrenOf[pr.parent] = [];
  for (var c = 0; c < pr.children.length; c++){
    var ch = pr.children[c];
    if (topo.childrenOf[pr.parent].indexOf(ch) === -1) topo.childrenOf[pr.parent].push(ch);
    if (!(ch in topo.parentOf)) topo.parentOf[ch] = pr.parent;
    if (!(ch in topo.order)) topo.order[ch] = topo._seq++;
  }
}

// Bangun pohon 1 penyulang dari master db_Penyulang (C=nama, E=section; urut GI->ujung)
function _buildPenyulangTopologi(penyulang){
  var topo = { childrenOf:{}, parentOf:{}, order:{}, _seq:0 };
  var sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('db_Penyulang'); // master bersama
  if (sh && sh.getLastRow() > 1){
    var data = sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues();
    var p = String(penyulang || '').trim().toLowerCase();
    for (var i = 0; i < data.length; i++){
      if (String(data[i][2] || '').trim().toLowerCase() !== p) continue; // C = nama
      _foldSectionLabel(topo, String(data[i][4] || '').trim());        // E = section
    }
  }
  return topo;
}

// Gabungkan beberapa section temuan -> rentang cabang-aware "AWAL - ujung1 / ujung2 / ..."
function _sectionRange(penyulang, sections){
  if (!sections || !sections.length) return '';
  var uniq = {}, list = [];
  for (var i = 0; i < sections.length; i++){
    var t = String(sections[i] || '').trim();
    if (t && !uniq[t]){ uniq[t] = 1; list.push(t); }
  }
  if (!list.length) return '';
  if (list.length === 1) return list[0];

  var topo = _buildPenyulangTopologi(penyulang);
  for (var m = 0; m < list.length; m++) _foldSectionLabel(topo, list[m]); // jaga2 master belum lengkap

  // Titik tercakup = parent + anak dari tiap label temuan
  var covered = {};
  for (var j = 0; j < list.length; j++){
    var pr = _parseSectionLabel(list[j]);
    if (pr.parent) covered[pr.parent] = 1;
    for (var k = 0; k < pr.children.length; k++) covered[pr.children[k]] = 1;
  }
  var points = Object.keys(covered);
  if (!points.length) return list.join(' - ');

  function ord(pt){ return (pt in topo.order) ? topo.order[pt] : 999999; }

  // deepCovered(node): ada titik tercakup di node ATAU keturunannya (lewat topologi master)
  var _dc = {};
  function deepCovered(node){
    if (node in _dc) return _dc[node];
    _dc[node] = false;                          // cegah loop
    var r = !!covered[node];
    var ch = topo.childrenOf[node] || [];
    for (var x = 0; x < ch.length; x++){ if (deepCovered(ch[x])) r = true; }
    _dc[node] = r; return r;
  }
  // adaTercakupDiBawah(node): ada titik tercakup lebih dalam (mengisi celah / loncatan)
  function adaTercakupDiBawah(node){
    var ch = topo.childrenOf[node] || [];
    for (var x = 0; x < ch.length; x++){ if (deepCovered(ch[x])) return true; }
    return false;
  }
  // adaIndukTercakup(node): apakah ada leluhur (master) yang tercakup
  function adaIndukTercakup(node){
    var p = topo.parentOf[node];
    while (p){ if (covered[p]) return true; p = topo.parentOf[p]; }
    return false;
  }

  // AKAR = titik tercakup tanpa leluhur tercakup (tangani cabang terputus/loncat di master)
  var roots = points.filter(function(pt){ return !adaIndukTercakup(pt); });
  if (!roots.length) roots = points.slice();
  roots.sort(function(a,b){ return ord(a) - ord(b); });
  var awal = roots[0];

  // Telusuri pohon master dari tiap akar:
  //  - celah/loncatan (titik kosong di tengah) otomatis dilewati -> selubung penuh
  //  - di tiap titik: kalau ADA cabang yg berlanjut -> ikuti yg berlanjut saja (cabang buntu
  //    diabaikan -> jadi linear). Kalau tak ada -> semua anak jadi ujung (fork sejati).
  var tips = [], seen = {};
  function walk(pt){
    if (seen[pt]) return; seen[pt] = 1;
    var live = (topo.childrenOf[pt] || []).filter(function(c){ return deepCovered(c); });
    if (!live.length){ if (covered[pt]) tips.push(pt); return; }   // ujung jalur
    var lanjut = live.filter(function(c){ return adaTercakupDiBawah(c); });
    var ikuti = lanjut.length ? lanjut : live;
    for (var f = 0; f < ikuti.length; f++) walk(ikuti[f]);
  }
  for (var rr = 0; rr < roots.length; rr++) walk(roots[rr]);
  if (!tips.length) tips = [awal];
  tips.sort(function(a,b){ return ord(a) - ord(b); });

  return awal + ' - ' + tips.join(' / ');
}


/* ---------- Recalc Section & Jumlah Temuan realisasi (berdasar KODE PEKERJAAN PENYULANG) ----------
   Hanya temuan milik tim inspeksi (punya kodePekerjaanPeny) yang mempengaruhi realisasi petugas.
   Temuan tanpa kodePekerjaanPeny (mis. input SPV / Fitur 2 Temuan Inspeksi) DIABAIKAN — tidak
   memengaruhi realisasi petugas. */
function _recalcRealisasiByKodePeny(ss, kodePekerjaanPeny){
  var kp = String(kodePekerjaanPeny || '').trim();
  if(!kp) return { jumlahTemuan:0, section:'' }; // tanpa kode pekerjaan penyulang -> bukan realisasi petugas, abaikan

  var T = COL_INS.TEMUAN, R = COL_INS.REALISASI;

  // Kumpulkan temuan dengan Kode Pekerjaan Penyulang sama (kolom C db_INS_Temuan)
  // DUAL-READ (migrasi): temuan Selesai ber-foto lengkap bisa sudah pindah ke arsip —
  // tetap dihitung dari AKTIF + ARSIP agar Jumlah Temuan realisasi tidak menyusut.
  var tem = _readSheetDual_(SHEET_INS.TEMUAN, T.kodePekerjaan, T.fotoTiangUrl + 1);
  var n = 0, secSet = {};
  for(var i=0;i<tem.length;i++){
    if(String(tem[i][T.kodePekerjaanPeny] || '').trim() !== kp) continue;
    // Realisasi sah HANYA bila petugas sudah update URL foto: kolom R (Foto Temuan URL)
    // DAN kolom T (Foto Tiang URL) wajib terisi keduanya. Salah satu kosong -> tidak dihitung.
    var _urlTemuan = String(tem[i][T.fotoTemuanUrl] || '').trim();
    var _urlTiang  = String(tem[i][T.fotoTiangUrl]  || '').trim();
    if(!_urlTemuan || !_urlTiang) continue;
    n++;
    var _sec = String(tem[i][T.section] || '').trim();
    if(_sec) secSet[_sec] = true;
  }
  var sections = Object.keys(secSet);

  // Update baris db_INS_Realisasi yang Kode Pekerjaan Penyulang-nya cocok (kolom C)
  var shR = ss.getSheetByName(SHEET_INS.REALISASI);
  var r = shR.getDataRange().getValues();
  var lastSection = '';
  for(var k=1;k<r.length;k++){
    if(String(r[k][R.kodePekerjaanPeny] || '').trim() !== kp) continue;
    var penyulang = String(r[k][R.penyulang] || '').trim();
    shR.getRange(k+1, R.jumlahTemuan + 1).setValue(n);
    if(n > 0){
      // Ada temuan -> Section dirangkai otomatis dari section temuan.
      lastSection = _sectionRange(penyulang, sections);
      shR.getRange(k+1, R.section + 1).setValue(lastSection);
    }else{
      // Belum ada temuan -> JANGAN sentuh Section (biarkan input manual Awal/Akhir).
      lastSection = String(r[k][R.section] || '').trim();
    }
  }
  return { jumlahTemuan: n, section: lastSection };
}

/* ---------- Simpan Temuan (Fitur 1: dari Realisasi / Fitur 2: tab Temuan Inspeksi) ---------- */
function simpanTemuanInsJar(data){
  try{
    data = data || {};
    var ss = _ssIns();
    var username = String(data.username||'').trim();
    var info = _userInfoIns(username);

    var tgl  = _normTgl(data.tanggal || new Date());
    var hari = _hariIndoIns(tgl);
    // Kode Pekerjaan & Kode Header:
    //  - Fitur 1 (lahir dari Realisasi): rantai TJR menempel pada Kode Pekerjaan Penyulang NYATA.
    //  - Fitur 2 (input langsung SIE Teknik, tanpa induk): rantai SINTETIS bergaya InsJar tag PEG
    //    (PEG-<ULP><YYMMDD>001-PNY.<pnn>-TJR.<tnn>) TANPA menulis db_Global_Header & db_InsJar_Realisasi.
    var _kpPeny = String(data.kodePekerjaanPeny||'').trim();
    var kodePekerjaan, kodeHeaderFinal;
    if(_kpPeny){
      kodePekerjaan   = _generateKodePekerjaanTemuanBerantai(ss, _kpPeny);
      kodeHeaderFinal = String(data.kodeHeader||'').trim() || _kodeHeaderTemuanKosong(info, tgl);
    }else{
      var _peg = _generateKodeTemuanPegMandiri(ss, info, tgl, data.penyulang);
      kodePekerjaan   = _peg.kodePekerjaan;
      kodeHeaderFinal = _peg.kodeHeader;
    }

    // Koordinat -> Lat, Long (simpan sbg ANGKA; hindari "." dianggap pemisah ribuan oleh locale)
    var lat = '', lng = '', koord = String(data.koordinat||'').trim();
    if(koord){
      var sp = koord.split(',');
      if(sp.length >= 2){
        var _la = parseFloat(sp[0].trim());
        var _lo = parseFloat(sp[1].trim());
        lat = isNaN(_la) ? '' : _la;
        lng = isNaN(_lo) ? '' : _lo;
      }
    }

    // Foto -> Drive (folder dibuat hanya jika ada foto)
    var folder = null;
    function _f(){ if(!folder) folder = _getOrCreateFolderByPath(_folderTemuanPath(tgl, kodePekerjaan)); return folder; }
    var base = kodePekerjaan + '_' + (data.penyulang||'') + '_' + (data.temuan||'');
    var fT = { nama:'', url:'' }, fG = { nama:'', url:'' };
    if(data.fotoTemuanB64) fT = _uploadFotoTemuan(data.fotoTemuanB64, data.fotoTemuanMime, base + '_Foto Temuan', _f());
    if(data.fotoTiangB64)  fG = _uploadFotoTemuan(data.fotoTiangB64,  data.fotoTiangMime,  base + '_Foto Tiang',  _f());
    // LOKASI foto = path relatif (Folder Path + '/' + nama file) supaya AppSheet bisa menemukan & menampilkan foto.
    var folderPathStr = _folderTemuanPathStr(tgl, kodePekerjaan);

    var objek = String(data.objekInspeksi||'').trim();
    var isJar = objek.toLowerCase() === 'jaringan';

    // Tulis B..AA (26 kolom; kolom A dibiarkan)
    var arr = [
      kodeHeaderFinal,                             // B kodeHeader (Fitur 2: prefix PEG/INSJAR/INSDU)
      String(data.kodePekerjaanPeny||''),          // C kodePekerjaanPeny (kosong utk Fitur 2)
      kodePekerjaan,                               // D kodePekerjaan (auto)
      info.ulp,                                    // E ulp
      hari,                                        // F hari
      tgl,                                         // G tanggal
      info.tim,                                    // H tim inspeksi
      objek,                                       // I objek inspeksi
      String(data.penyulang||''),                  // J penyulang
      String(data.section||''),                    // K section
      String(data.segmen||''),                     // L segmen
      isJar ? String(data.nomorTiang||'') : '',    // M nomor tiang
      !isJar ? String(data.nomorGardu||'') : '',   // N nomor gardu
      String(data.tier||''),                       // O tier
      String(data.temuan||''),                     // P temuan
      (fT.nama ? folderPathStr + '/' + fT.nama : ''), // Q foto temuan (LOKASI path relatif utk AppSheet)
      fT.url,                                      // R foto temuan url
      (fG.nama ? folderPathStr + '/' + fG.nama : ''), // S foto tiang (LOKASI path relatif utk AppSheet)
      fG.url,                                      // T foto tiang url
      String(data.deskripsi||''),                  // U deskripsi
      koord,                                       // V koordinat
      lat,                                         // W lat
      lng,                                         // X long
      username,                                    // Y inputBy
      _tsNowIns(),                                 // Z timestamp
      STATUS_INS.PENUGASAN                         // AA status WO
    ];
    var shT = ss.getSheetByName(SHEET_INS.TEMUAN);
    var row = shT.getLastRow() + 1;
    shT.getRange(row, 2, 1, arr.length).setValues([arr]);
    // Folder Path (kolom AR) — path penyimpanan foto, dikunci berdasar Tanggal + Kode Pekerjaan.
    shT.getRange(row, COL_INS.TEMUAN.folderPath + 1).setValue(folderPathStr);

    // SIMPAN TEMUAN = PEMICU BUILD WA (fungsi 2 di Tek-InsJar.gs).
    // recalcWaInsJarByHeader merecalc Section + Jumlah Temuan SEMUA penyulang header ini,
    // lalu membangun ulang WA Text. Hanya untuk temuan yang menempel pada header nyata.
    if(data.kodeHeader){ try { recalcWaInsJarByHeader(data.kodeHeader); } catch(e){} }
    else if(data.kodePekerjaanPeny){ try { _recalcRealisasiByKodePeny(ss, data.kodePekerjaanPeny); } catch(e){} }

    return { ok:true, kodePekerjaan:kodePekerjaan, fotoTemuanUrl:fT.url, fotoTiangUrl:fG.url };
  }catch(e){ return { ok:false, error:String(e) }; }
}

/* ---------- Edit Temuan (ubah data dari modal Detail Temuan) ---------- */
function editTemuanInsJar(data){
  try{
    data = data || {};
    var kodePekerjaan = String(data.kodePekerjaan || '').trim();
    if(!kodePekerjaan) return { ok:false, error:'Kode Pekerjaan kosong.' };

    var ss = _ssIns();
    var loc = _findRowTemuan(kodePekerjaan);
    if(!loc) return { ok:false, error:'Temuan tidak ditemukan: ' + kodePekerjaan };

    var T = COL_INS.TEMUAN;
    var sh = loc.sheet, row = loc.row;
    var rowVals = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];

    var objek = (data.objekInspeksi != null && String(data.objekInspeksi).trim())
      ? String(data.objekInspeksi).trim()
      : String(rowVals[T.objekInspeksi] || '').trim();
    var isJar = objek.toLowerCase() === 'jaringan';

    var koord = String(data.koordinat || '').trim();
    var lat = '', lng = '';
    if(koord){
      var sp = koord.split(',');
      if(sp.length >= 2){
        var _la = parseFloat(sp[0].trim());
        var _lo = parseFloat(sp[1].trim());
        lat = isNaN(_la) ? '' : _la;
        lng = isNaN(_lo) ? '' : _lo;
      }
    }

    if(data.temuan  != null) sh.getRange(row, T.temuan  + 1).setValue(String(data.temuan));
    if(data.section != null) sh.getRange(row, T.section + 1).setValue(String(data.section));
    if(data.segmen  != null) sh.getRange(row, T.segmen  + 1).setValue(String(data.segmen));
    sh.getRange(row, T.objekInspeksi + 1).setValue(objek);
    sh.getRange(row, T.nomorTiang + 1).setValue(isJar ? String(data.nomorTiang || '') : '');
    sh.getRange(row, T.nomorGardu + 1).setValue(!isJar ? String(data.nomorGardu || '') : '');
    if(data.deskripsi != null) sh.getRange(row, T.deskripsi + 1).setValue(String(data.deskripsi));
    if(data.koordinat != null){
      sh.getRange(row, T.koordinat + 1).setValue(koord);
      sh.getRange(row, T.lat + 1).setValue(lat);
      sh.getRange(row, T.long + 1).setValue(lng);
    }
    SpreadsheetApp.flush();

    var kodePeny   = String(rowVals[T.kodePekerjaanPeny] || '').trim();
    var kodeHeader = String(rowVals[T.kodeHeader] || '').trim();
    // EDIT TEMUAN = PEMICU BUILD WA (fungsi 2 di Tek-InsJar.gs).
    if(kodeHeader){ try { recalcWaInsJarByHeader(kodeHeader); } catch(e){} }
    else if(kodePeny){ try { _recalcRealisasiByKodePeny(ss, kodePeny); } catch(e){} }

    return { ok:true, kodePekerjaan:kodePekerjaan };
  }catch(e){ return { ok:false, error:String(e) }; }
}

/* ---------- Detail temuan per Penyulang (Kode Pekerjaan Penyulang) ---------- */
function getTemuanByKodePekerjaanPeny(kodePekerjaanPeny){
  try{
    var kp = String(kodePekerjaanPeny||'').trim();
    if(!kp) return { ok:false, error:'Kode Pekerjaan Penyulang kosong.' };
    var T = COL_INS.TEMUAN;
    // DUAL-READ (migrasi): baca AKTIF + ARSIP, dedup by Kode Pekerjaan.
    var data = _readSheetDual_(SHEET_INS.TEMUAN, T.kodePekerjaan, T.status + 1);
    var out = [];
    for(var i=0;i<data.length;i++){
      if(String(data[i][T.kodePekerjaanPeny]||'').trim() !== kp) continue;
      out.push({
        kodePekerjaan: data[i][T.kodePekerjaan],
        objek:         data[i][T.objekInspeksi],
        section:       data[i][T.section],
        temuan:        data[i][T.temuan],
        segmen:        data[i][T.segmen],
        nomorTiang:    data[i][T.nomorTiang],
        nomorGardu:    data[i][T.nomorGardu],
        tier:          data[i][T.tier],
        deskripsi:     data[i][T.deskripsi],
        koordinat:     data[i][T.koordinat],
        fotoTemuanUrl: data[i][T.fotoTemuanUrl],
        fotoTiangUrl:  data[i][T.fotoTiangUrl],
        status:        data[i][T.status]
      });
    }
    return { ok:true, list: out.reverse() };
  }catch(e){ return { ok:false, error:String(e) }; }
}

/* ---------- Daftar temuan per ULP + RENTANG Tanggal (halaman Rekap Temuan Inspeksi) ----------
   ulp kosong  = semua ULP.
   tglDari/tglSampai kosong = batas terbuka (pakai _insInRange dari Code.gs/Inti). */
function getTemuanByUlpTanggal(ulp, tglDari, tglSampai){
  try{
    // DUAL-READ (migrasi): baca AKTIF + ARSIP, dedup by Kode Pekerjaan.
    var data = _readSheetDual_(SHEET_INS.TEMUAN, COL_INS.TEMUAN.kodePekerjaan, COL_INS.TEMUAN.status + 1);
    var u = String(ulp||'').trim().toLowerCase();
    var dari = String(tglDari||'').trim();
    var sampai = String(tglSampai||'').trim();
    var out = [];
    for(var i=0;i<data.length;i++){
      if(u && String(data[i][COL_INS.TEMUAN.ulp]||'').trim().toLowerCase() !== u) continue;
      if(!_insInRange(_normTgl(data[i][COL_INS.TEMUAN.tanggal]), dari, sampai)) continue;
      out.push({
        kodePekerjaan: data[i][COL_INS.TEMUAN.kodePekerjaan],
        ulp: data[i][COL_INS.TEMUAN.ulp],           // E ulp (berguna saat "Semua ULP")
        penyulang: data[i][COL_INS.TEMUAN.penyulang],
        objek: data[i][8],                          // I objek inspeksi
        tier: data[i][COL_INS.TEMUAN.tier],
        temuan: data[i][COL_INS.TEMUAN.temuan],
        segmen: data[i][11],                        // L segmen
        status: data[i][COL_INS.TEMUAN.status],     // AA status WO
        fotoUrl: data[i][COL_INS.TEMUAN.fotoTemuanUrl]
      });
    }
    return { ok:true, list: out.reverse() };
  }catch(e){ return { ok:false, error:String(e) }; }
}

/* ---------- Backfill Folder Path (kolom AR db_INS_Temuan) ----------
   Jalankan SEKALI setelah menambah kolom Folder Path untuk mengisi baris-baris LAMA
   yang masih kosong. Path dihitung dari Tanggal (kolom G) + Kode Pekerjaan (kolom D),
   sehingga konsisten dengan path yang dibuat web app & formula AppSheet.
   Aman dijalankan berulang: hanya mengisi yang kosong; baris terisi tidak disentuh. */
function isiFolderPathTemuanKosong(){
  try{
    var ss = _ssIns();
    var sh = ss.getSheetByName(SHEET_INS.TEMUAN);
    if(!sh || sh.getLastRow() < 2) return { ok:true, terisi:0, total:0 };
    var T = COL_INS.TEMUAN;
    var last = sh.getLastRow();
    var data = sh.getRange(2, 1, last - 1, T.folderPath + 1).getValues();
    var colOut = [], terisi = 0;
    for(var i=0;i<data.length;i++){
      var kode = String(data[i][T.kodePekerjaan] || '').trim();
      var cur  = String(data[i][T.folderPath] || '').trim();
      if(kode && !cur){
        colOut.push([ _folderTemuanPathStr(_normTgl(data[i][T.tanggal]), kode) ]);
        terisi++;
      }else{
        colOut.push([ data[i][T.folderPath] ]); // pertahankan nilai lama (atau kosong utk baris tanpa kode)
      }
    }
    sh.getRange(2, T.folderPath + 1, colOut.length, 1).setValues(colOut);
    SpreadsheetApp.flush();
    return { ok:true, terisi:terisi, total:data.length };
  }catch(e){ return { ok:false, message:e.message }; }
}


/* ---------- Validasi ulang URL foto temuan (jalur AppSheet, pengganti Bot) ----------
   Button "Upload Foto Temuan" mengisi: Foto Temuan URL (R) = [Foto Temuan] dan
   Foto Tiang Temuan URL (T) = [Foto Tiang Temuan]. AppSheet menyimpannya sebagai URL
   getimageurl yang MENANAM nama file foto di parameter fileName, mis:
     https://www.appsheet.com/image/getimageurl?...&fileName=...Foto Temuan.150430.png&...
   Nilai R/T ini STATIS (snapshot saat button ditekan) -> tidak ikut berubah saat foto diganti.

   Deteksi (tanpa Bot AppSheet):
     - kolom Q = path foto TERKINI (otomatis berubah saat foto diganti).
     - kolom R = snapshot nama file saat button terakhir ditekan (di dalam parameter fileName).
     - Bandingkan NAMA FILE kolom Q vs nama file di R; kalau beda -> foto sudah diganti
       -> kosongkan R & T. (Begitu juga S vs T untuk foto tiang.)
   Baris hasil input WEB DILEWATI: R/T-nya tautan Drive (drive.google.com) tanpa parameter
   fileName, sehingga tidak bisa dibandingkan dan TIDAK diutak-atik.

   Pasang sebagai trigger waktu lewat setupTriggerValidasiFotoTemuan(). */

// Ambil NAMA FILE foto dari sebuah referensi:
//  - path biasa (kolom Q/S)               -> segmen terakhir setelah '/'.
//  - URL getimageurl AppSheet (kolom R/T) -> ambil parameter fileName lalu segmen terakhir.
//  - URL lain (mis. Drive web)            -> '' (tak bisa dibandingkan -> jangan disentuh).
function _namaFileFotoRef(ref){
  var s = String(ref == null ? '' : ref).trim();
  if(!s) return '';
  var m = s.match(/[?&]fileName=([^&]*)/i);
  if(m){
    s = m[1];
  }else if(/^https?:\/\//i.test(s)){
    return '';
  }
  try { s = decodeURIComponent(s); } catch(e){}
  var parts = s.split('/');
  return String(parts[parts.length - 1] || '').trim();
}

function validasiUlangFotoTemuan(){
  try{
    // Menumpang bot db_INS_Temuan (action 'validasiFoto') + trigger waktu tiap 1 jam:
    // isi otomatis Kode Header & Kode Pekerjaan (kolom B & D) utk baris input AppSheet
    // yang masih kosong. Sheet-wide & tak butuh kodeHeader, jadi cocok utk temuan
    // input langsung (Fitur 2) yang Kode Header-nya belum ada saat baris dibuat.
    try { lengkapiKodeTemuanKosong(); } catch(e){}
    // Perbaiki Kode Temuan yang formatnya salah (mis. UNIQUEID dari INITIAL VALUE AppSheet
    // untuk input tanpa induk) -> ganti dengan kode rantai yang benar.
    try { perbaikiFormatKodeTemuan(); } catch(e){}

    var ss = _ssIns();
    var sh = ss.getSheetByName(SHEET_INS.TEMUAN);
    if(!sh || sh.getLastRow() < 2) return { ok:true, dibersihkan:0 };

    var T = COL_INS.TEMUAN;
    var first = 2, n = sh.getLastRow() - 1;
    var qCol = T.fotoTemuan + 1, rCol = T.fotoTemuanUrl + 1;
    var sCol = T.fotoTiang  + 1, tCol = T.fotoTiangUrl  + 1;

    var qv = sh.getRange(first, qCol, n, 1).getValues();
    var rv = sh.getRange(first, rCol, n, 1).getValues();
    var sv = sh.getRange(first, sCol, n, 1).getValues();
    var tv = sh.getRange(first, tCol, n, 1).getValues();

    var dibersihkan = 0;
    for(var i=0;i<n;i++){
      var rRaw = String(rv[i][0] == null ? '' : rv[i][0]).trim();
      var tRaw = String(tv[i][0] == null ? '' : tv[i][0]).trim();

      var qFile = _namaFileFotoRef(qv[i][0]);  // nama file foto temuan TERKINI (kolom Q)
      var rFile = _namaFileFotoRef(rRaw);       // nama file snapshot button (kolom R)
      var sFile = _namaFileFotoRef(sv[i][0]);  // nama file foto tiang TERKINI (kolom S)
      var tFile = _namaFileFotoRef(tRaw);       // nama file snapshot button (kolom T)

      // Hanya proses bila R/T memang snapshot button (rFile/tFile berhasil diambil).
      // Baris web (Drive) -> rFile/tFile = '' -> otomatis dilewati.
      var fotoTemuanGanti = (rFile !== '' && rFile !== qFile);
      var fotoTiangGanti  = (tFile !== '' && tFile !== sFile);

      if(fotoTemuanGanti || fotoTiangGanti){
        if(rRaw) sh.getRange(first + i, rCol).setValue('');
        if(tRaw) sh.getRange(first + i, tCol).setValue('');
        dibersihkan++;
      }
    }
    SpreadsheetApp.flush();
    Logger.log('[validasiUlangFotoTemuan] R/T dikosongkan pada ' + dibersihkan + ' baris.');
    return { ok:true, dibersihkan:dibersihkan };
  }catch(e){
    Logger.log('[validasiUlangFotoTemuan] ERROR: ' + e.message);
    return { ok:false, error:e.message };
  }
}

/* Pasang trigger waktu untuk validasiUlangFotoTemuan (default tiap 1 jam).
   Jalankan SEKALI dari editor Apps Script. Ganti everyHours(1) menjadi
   everyMinutes(30) bila ingin lebih cepat. */
/* DIAGNOSTIK — tidak mengubah data. Jalankan manual dari editor lalu lihat menu Eksekusi/Log.
   Menampilkan nama file foto yang dibaca dari kolom Q vs R (dan S vs T) per baris,
   serta apakah baris itu akan dianggap "foto diganti". */
function cekFotoTemuan(){
  var ss = _ssIns();
  var sh = ss.getSheetByName(SHEET_INS.TEMUAN);
  if(!sh || sh.getLastRow() < 2){ Logger.log('Tidak ada data temuan.'); return; }
  var T = COL_INS.TEMUAN;
  var first = 2, n = sh.getLastRow() - 1;
  var qv = sh.getRange(first, T.fotoTemuan + 1,    n, 1).getValues();
  var rv = sh.getRange(first, T.fotoTemuanUrl + 1, n, 1).getValues();
  var sv = sh.getRange(first, T.fotoTiang + 1,     n, 1).getValues();
  var tv = sh.getRange(first, T.fotoTiangUrl + 1,  n, 1).getValues();
  for(var i=0;i<n;i++){
    var rRaw = String(rv[i][0] == null ? '' : rv[i][0]).trim();
    var tRaw = String(tv[i][0] == null ? '' : tv[i][0]).trim();
    if(!rRaw && !tRaw) continue;
    var qFile = _namaFileFotoRef(qv[i][0]);
    var rFile = _namaFileFotoRef(rRaw);
    var sFile = _namaFileFotoRef(sv[i][0]);
    var tFile = _namaFileFotoRef(tRaw);
    Logger.log('Baris ' + (first + i)
      + ' | Qfile=' + qFile + ' | Rfile=' + rFile + ' | gantiTemuan=' + (rFile !== '' && rFile !== qFile)
      + ' || Sfile=' + sFile + ' | Tfile=' + tFile + ' | gantiTiang=' + (tFile !== '' && tFile !== sFile));
  }
  Logger.log('Selesai cekFotoTemuan. R/T mentah baris terakhir: ' + (rv[n-1][0] || ''));
}