/* =========================================================
   SIE-BeritaAcara-Code.gs — sumber data Berita Acara
   Spreadsheet sama dengan Master Gardu.
   - Rekap Gardu: pencarian data BA
   - OwnerId: lookup OwnerId dan External Reference
   - Upload foto BA
   - Jembatan PDF → Cloud Run ba-pdf-engine
   - Modul BA Switching (Rekap Switching): setup, simpan, cari, upload foto, PDF
   ========================================================= */
var BA_SOURCE = {
  spreadsheetId: '1TEC2iaxEcTCn0IXDZM1kHpAhKyBHuG90SMK48zEkeOw',
  sheetName: 'Rekap Gardu',
  maxRows: 500
};
var BA_OWNER_SOURCE = {
  spreadsheetId: '1TEC2iaxEcTCn0IXDZM1kHpAhKyBHuG90SMK48zEkeOw',
  sheetName: 'OwnerId'
};
// Sumber dropdown Penyulang & Section bertingkat.
// db_Penyulang: kolom "Nama Penyulang" (C) dan "Section" (E).
var BA_PENYULANG_SOURCE = {
  spreadsheetId: '16oA-oonlRK0XHaisQW_vNb1Pf1lK_-YTLO2rlh0EXNE',
  sheetName: 'db_Penyulang'
};
function _baFindPenyulangHeader_(values){
  var limit = Math.min(values.length, 30);
  for(var r=0;r<limit;r++){
    var map = {};
    for(var c=0;c<values[r].length;c++){
      var key = _baNormHeader_(values[r][c]);
      if(key && map[key] == null) map[key] = c;
    }
    var penyulang = _baPickIndex_(map, ['Nama Penyulang','Penyulang']);
    var section = _baPickIndex_(map, ['Section','Seksi','Nama Section']);
    if(penyulang >= 0 && section >= 0) return { row:r, penyulang:penyulang, section:section };
  }
  return null;
}
/* Daftar Penyulang + Section (bertingkat) dari db_Penyulang.
   Return { ok, penyulangList:[...], sectionByPenyulang:{ penyulang:[section,...] } }. */
function getPenyulangDanSection(){
  try{
    var ss = SpreadsheetApp.openById(BA_PENYULANG_SOURCE.spreadsheetId);
    var sh = _baResolveSheet_(ss, BA_PENYULANG_SOURCE.sheetName);
    if(!sh) return { ok:false, message:'Sheet db_Penyulang tidak ditemukan.' };
    var values = sh.getDataRange().getDisplayValues();
    if(!values.length) return { ok:true, penyulangList:[], sectionByPenyulang:{} };
    var found = _baFindPenyulangHeader_(values);
    if(!found) return { ok:false, message:'Header db_Penyulang belum dikenali (butuh kolom Nama Penyulang dan Section).' };
    var order = [], nameByKey = {}, sectionsByKey = {}, sectionSeen = {};
    for(var r=found.row+1;r<values.length;r++){
      var penyulang = _baText_(values[r], found.penyulang);
      var section = _baText_(values[r], found.section);
      if(!penyulang) continue;
      var pKey = _baKey_(penyulang);
      if(nameByKey[pKey] == null){
        nameByKey[pKey] = penyulang; sectionsByKey[pKey] = []; sectionSeen[pKey] = {}; order.push(pKey);
      }
      if(section){
        var sKey = _baKey_(section);
        if(!sectionSeen[pKey][sKey]){ sectionSeen[pKey][sKey] = true; sectionsByKey[pKey].push(section); }
      }
    }
    var penyulangList = [], sectionByPenyulang = {};
    order.forEach(function(pKey){ penyulangList.push(nameByKey[pKey]); sectionByPenyulang[nameByKey[pKey]] = sectionsByKey[pKey]; });
    return { ok:true, penyulangList:penyulangList, sectionByPenyulang:sectionByPenyulang };
  }catch(error){
    return { ok:false, message:'Gagal memuat db_Penyulang: '+error.message };
  }
}
// Parent awal di Shared Drive Teknik ULP Toboali.
// Sistem akan membuat folder Berita Acara di bawah folder ini bila belum ada.
var BA_DRIVE_SOURCE = {
  laporanUlpFolderId: '1lpZAbSVkHjceLJlDEWkiUl27I7O4nmGf',
  beritaAcaraFolderName: 'Berita Acara'
};
function _baNormHeader_(value){
  return String(value == null ? '' : value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
function _baKey_(value){
  return String(value == null ? '' : value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}
function _baText_(row, index){
  return index >= 0 && index < row.length ? String(row[index] == null ? '' : row[index]).trim() : '';
}
function _baPickIndex_(headerMap, aliases){
  for(var i=0;i<aliases.length;i++){
    var key = _baNormHeader_(aliases[i]);
    if(headerMap[key] != null) return headerMap[key];
  }
  return -1;
}
function _baDate_(value){
  if(!value) return '';
  if(value instanceof Date){
    if(isNaN(value.getTime())) return '';
    return Utilities.formatDate(value, 'Asia/Jakarta', 'yyyy-MM-dd');
  }
  var text = String(value).trim();
  var m = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m) return m[1]+'-'+m[2]+'-'+m[3];
  m = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if(m) return m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2);
  var date = new Date(text);
  return isNaN(date.getTime()) ? '' : Utilities.formatDate(date,'Asia/Jakarta','yyyy-MM-dd');
}
function _baCell_(row,index){
  return index >= 0 && index < row.length ? row[index] : '';
}
function _baFindHeader_(values){
  // Header Rekap Gardu ada di baris ~7-8 (bukan baris 1). Deteksi via skor,
  // sama seperti engine main.py: kolom idBA/Nomor BA paling menentukan.
  var limit = Math.min(values.length,40);
  var baAliases = ['idBA','ID BA','Id BA','Nomor BA','No BA','NO BA Full'];
  var best = null;
  for(var r=0;r<limit;r++){
    var map = {};
    for(var c=0;c<values[r].length;c++){
      var key = _baNormHeader_(values[r][c]);
      if(key && map[key] == null) map[key] = c;
    }
    if(!Object.keys(map).length) continue;
    var score = 0;
    if(_baPickIndex_(map,['Tanggal BA','Tanggal','Tanggal Pekerjaan','Tgl']) >= 0) score += 2;
    if(_baPickIndex_(map,['Penyulang']) >= 0) score += 2;
    if(_baPickIndex_(map,['Nomor Trafo','Nama Peralatan','Nomor Gardu','Nama Gardu','Gardu','Nama Switching','Switching']) >= 0) score += 2;
    if(_baPickIndex_(map,baAliases) >= 0) score += 6;
    if(score >= 6) return { row:r, map:map, headers:values[r] };
    if(!best || score > best.score) best = { score:score, row:r, map:map, headers:values[r] };
  }
  // Fallback 1: baris mana pun yang punya kolom idBA / Nomor BA.
  for(var r2=0;r2<limit;r2++){
    var map2 = {};
    for(var c2=0;c2<values[r2].length;c2++){
      var key2 = _baNormHeader_(values[r2][c2]);
      if(key2 && map2[key2] == null) map2[key2] = c2;
    }
    if(_baPickIndex_(map2,baAliases) >= 0) return { row:r2, map:map2, headers:values[r2] };
  }
  // Fallback 2: kandidat skor terbaik (minimal 2 kolom inti cocok).
  if(best && best.score >= 4) return { row:best.row, map:best.map, headers:best.headers };
  return null;
}
/* =========================================================
   OwnerId dan External Reference
   Hasil hanya diberikan jika SATU baris OwnerId cocok dan
   seluruh komponen OwnerId + External Reference lengkap.
   Jika satu data saja kosong, tidak cocok, atau hasil lookup
   ambigu, kedua nilai dikembalikan sebagai string kosong.
   ========================================================= */
function _baFindOwnerHeader_(values){
  var limit = Math.min(values.length,30);
  for(var r=0;r<limit;r++){
    var map = {};
    for(var c=0;c<values[r].length;c++){
      var key = _baNormHeader_(values[r][c]);
      if(key) map[key] = c;
    }
    var idx = {
      giId: _baPickIndex_(map,['GIid','GI Id']),
      ulp: _baPickIndex_(map,['ULP','Nama ULP']),
      feederId: _baPickIndex_(map,['Feederid','Feeder Id','GIFeederid','GI Feederid']),
      penyulang: _baPickIndex_(map,['Penyulang']),
      sectionId: _baPickIndex_(map,['SectionId','Section Id']),
      section: _baPickIndex_(map,['Section','Seksi']),
      jenisPemutus: _baPickIndex_(map,['Jenis Pemutus']),
      namaPemutus: _baPickIndex_(map,['Nama Pemutus']),
      ownerId: _baPickIndex_(map,['OwnerId','Owner Id'])
    };
    if(idx.ulp >= 0 && idx.penyulang >= 0 && idx.section >= 0
      && idx.jenisPemutus >= 0 && idx.namaPemutus >= 0){
      return { row:r, map:map, idx:idx };
    }
  }
  return null;
}
function _baEmptyOwnerReference_(message){
  return {
    ok:true,
    found:false,
    ownerId:'',
    externalReference:'',
    message:message || 'Data OwnerId tidak ditemukan atau belum lengkap.'
  };
}
function getOwnerIdDanExternalReference(filter){
  try{
    filter = filter || {};
    var penyulang = String(filter.penyulang || '').trim();
    var section = String(filter.section || '').trim();
    if(!penyulang){
      return _baEmptyOwnerReference_('Penyulang harus terisi.');
    }
    var ss = SpreadsheetApp.openById(BA_OWNER_SOURCE.spreadsheetId);
    var sh = _baResolveSheet_(ss, BA_OWNER_SOURCE.sheetName);
    if(!sh) return _baEmptyOwnerReference_('Sheet OwnerId tidak ditemukan.');
    // Display values menjaga nol di depan (mis. id GI 07, id Section 04).
    var values = sh.getDataRange().getDisplayValues();
    if(!values.length) return _baEmptyOwnerReference_('Sheet OwnerId belum berisi data.');

    // PENCARIAN LANGSUNG PER KOLOM (header boleh berganti, jadi tidak dipakai).
    // Indeks 0-based: A=0, B=1, D=3, E=4, F=5, H=7, I=8, K=10.
    var COL_A=0, COL_B=1, COL_D=3, COL_E=4, COL_F=5, COL_H=7, COL_I=8, COL_J=9, COL_K=10, COL_L=11, COL_M=12;
    var pKey = _baKey_(penyulang);

    // 1) Nilai penyulang dicari di kolom I -> ambil nilai kolom H.
    var hVal = '';
    for(var r1=0;r1<values.length;r1++){
      if(_baKey_(_baText_(values[r1], COL_I)) === pKey){ hVal = _baText_(values[r1], COL_H); break; }
    }
    // 2) Nilai H dicari di kolom A -> ambil kolom B = id GI.
    var idGI = '';
    if(hVal){
      var hKey = _baKey_(hVal);
      for(var r2=0;r2<values.length;r2++){
        if(_baKey_(_baText_(values[r2], COL_A)) === hKey){ idGI = _baText_(values[r2], COL_B); break; }
      }
    }
    // 3a) id Feeder (E) & id ULP (F): baris feeder yang NAMANYA sama dengan
    //     penyulang (kolom D = nama Feeder). Konvensi sheet: tiap penyulang punya
    //     baris feeder bernama sama -> itulah id feeder utama penyulang tsb.
    var idULP='', idFeeder='';
    for(var r3=0;r3<values.length;r3++){
      if(_baKey_(_baText_(values[r3], COL_D)) === pKey){
        idULP    = _baText_(values[r3], COL_F);
        idFeeder = _baText_(values[r3], COL_E);
        break;
      }
    }
    // 3b) id Section (K): baris yang Section-nya (kolom J) cocok dengan section
    //     terpilih, dicocokkan pada "section awal" (teks sebelum " - " pertama)
    //     supaya versi form ("FCO Jar Perumahan Arwana - Perumahan Arwana") &
    //     versi sheet ("FCO JAR PERUMAHAN ARWANA - TB0417") tetap cocok.
    //     (id Feeder tetap dari 3a; hanya id Section yang ikut section terpilih.)
    function _secAwalId_(v){ return String(v==null?'':v).split(/\s+-\s+/)[0].trim(); }
    var secKeyId = _baKey_(_secAwalId_(section));
    var idSection='';
    var barisSec = null, barisSecContains = null;
    if(secKeyId){
      for(var rs=0;rs<values.length;rs++){
        var jKeyId = _baKey_(_secAwalId_(_baText_(values[rs], COL_J)));
        if(!jKeyId) continue;
        if(jKeyId === secKeyId){ barisSec = values[rs]; break; }
        if(!barisSecContains && (jKeyId.indexOf(secKeyId) >= 0 || secKeyId.indexOf(jKeyId) >= 0)) barisSecContains = values[rs];
      }
    }
    var barisSecFinal = barisSec || barisSecContains;
    if(barisSecFinal){ idSection = _baText_(barisSecFinal, COL_K); }

    // Semua komponen wajib lengkap; bila ada yang kosong, kembalikan kosong.
    if(!idGI || !idULP || !idFeeder || !idSection){
      var kurang = [];
      if(!idGI) kurang.push('id GI (I->H->A->B)');
      if(!idULP) kurang.push('id ULP (D->F)');
      if(!idFeeder) kurang.push('id Feeder (D->E)');
      if(!idSection) kurang.push('id Section (D->K)');
      return _baEmptyOwnerReference_('Komponen OwnerId belum lengkap untuk penyulang "'+penyulang+'": '+kurang.join(', ')+'.');
    }

    // OwnerId = id GI + id ULP + id Feeder + id Section (masing-masing 2 digit).
    function _pad2_(v){ var s=String(v==null?'':v).trim(); while(s.length<2) s='0'+s; return s; }
    var ownerId = _pad2_(idGI) + _pad2_(idULP) + _pad2_(idFeeder) + _pad2_(idSection);

    // ---- External Reference ----
    // Nilai Section sudah tersedia dari form (template), jadi tidak dicari lagi.
    // Ambil Jenis Pemutus (kolom L) & Nama Pemutus (kolom M) dari sheet OwnerId.
    // Versi OwnerId & versi web beda panjang, jadi cocokkan hanya "SECTION AWAL":
    // teks sebelum " - " pertama. Contoh OwnerId "ACR AIR BARA - FCO ... - LBS AIR
    // SAMPIK" vs web "ACR Air Bara - LBS Air Sampik" -> sama-sama "ACR Air Bara".
    //   - bila Section diawali "GI" pilih baris yang mengandung "PMT",
    //     bila diawali "DS" pilih baris yang mengandung "DSC".
    function _baSectionAwal_(v){ return String(v==null?'':v).split(/\s+-\s+/)[0].trim(); }
    var sKey = _baKey_(_baSectionAwal_(section));
    var sUp = section.toUpperCase();
    var token = sUp.indexOf('GI') === 0 ? 'PMT' : (sUp.indexOf('DS') === 0 ? 'DSC' : '');
    var jenisPemutus = '', namaPemutus = '';
    var barisSection = null, barisToken = null, barisTokenSaja = null;
    if(sKey){
      for(var rj=0;rj<values.length;rj++){
        var jVal = _baText_(values[rj], COL_J);
        if(!jVal) continue;
        var jKey = _baKey_(_baSectionAwal_(jVal));
        var punyaToken = token && jVal.toUpperCase().indexOf(token) >= 0;
        var cocokSection = jKey === sKey || jKey.indexOf(sKey) >= 0 || sKey.indexOf(jKey) >= 0;
        if(cocokSection){
          if(!barisSection) barisSection = values[rj];
          if(punyaToken){ barisToken = values[rj]; break; }
        }
        if(punyaToken && !barisTokenSaja) barisTokenSaja = values[rj];
      }
    }
    // Prioritas: baris yang cocok Section + token > cocok Section saja > token saja.
    var barisPemutus = barisToken || barisSection || (token ? barisTokenSaja : null);
    if(barisPemutus){
      jenisPemutus = _baText_(barisPemutus, COL_L);
      namaPemutus  = _baText_(barisPemutus, COL_M);
    }
    // Struktur: "SECTION" - <Jenis Pemutus> - <Nama Pemutus>.
    // Kata "SECTION" adalah teks literal (murni tulisan), bukan nilai section apa pun.
    var externalReference = 'SECTION';
    if(jenisPemutus || namaPemutus){
      externalReference = 'SECTION - ' + jenisPemutus + ' - ' + namaPemutus;
    }

    return {
      ok:true,
      found:true,
      ownerId:ownerId,
      externalReference:externalReference,
      message:'OwnerId ditemukan.'
    };
  }catch(error){
    return _baEmptyOwnerReference_('Error lookup OwnerId: '+error.message);
  }
}
/* =========================================================
   Upload foto BA Gardu
   Foto disimpan langsung ke:
   Laporan ULP Toboali/Berita Acara/Gardu/<Jenis>/<Tahun>/<Bulan>/<Nomor Gardu>
   ========================================================= */
var BA_PHOTO_COLUMN = {
  nameplateTrafoAwal:'N', fotoFullGarduAwal:'AH',
  nameplatePhbAwal:'AB', fotoBoxPhbAwal:'AE',
  nameplateTrafoSesudah:'AP', fotoFullGarduSesudah:'BC',
  nameplatePhbSesudah:'AW', fotoBoxPhbSesudah:'AZ'
};
function _baFolder_(parent, name){
  var folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}
function _baSafeFolderName_(value){
  return String(value || '').trim().replace(/[\\/:*?"<>|]/g,'-') || 'Tanpa Nama';
}
function _baBulanIndonesia_(month){
  return ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][month-1] || '';
}
function _baPhotoFolder_(tanggalBA, jenisPekerjaan, nomorTrafo){
  var m = String(tanggalBA || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) throw new Error('Tanggal BA wajib diisi sebelum mengunggah foto.');
  if(!jenisPekerjaan) throw new Error('Jenis Pekerjaan wajib dipilih sebelum mengunggah foto.');
  if(!nomorTrafo) throw new Error('Nomor Gardu/Trafo wajib diisi sebelum mengunggah foto.');
  var root = DriveApp.getFolderById(BA_DRIVE_SOURCE.laporanUlpFolderId);
  var folder = _baFolder_(root, BA_DRIVE_SOURCE.beritaAcaraFolderName);
  folder = _baFolder_(folder, 'Gardu');
  folder = _baFolder_(folder, _baSafeFolderName_(jenisPekerjaan));
  folder = _baFolder_(folder, m[1]);
  folder = _baFolder_(folder, m[2]+'. '+_baBulanIndonesia_(Number(m[2])));
  return _baFolder_(folder, _baSafeFolderName_(nomorTrafo));
}
function uploadFotoBeritaAcara(request){
  try{
    request = request || {};
    var slot = String(request.slot || 'foto').trim();
    var dataUrl = String(request.dataUrl || '');
    var fileName = String(request.fileName || slot+'.jpg').replace(/[\\/:*?"<>|]/g,'-');
    var mimeType = String(request.mimeType || 'image/jpeg');
    if(!/^image\//.test(mimeType)) return {ok:false, message:'File harus berupa gambar.'};
    if(!dataUrl || dataUrl.indexOf(',') < 0) return {ok:false, message:'Data gambar tidak valid.'};
    var base64 = dataUrl.split(',')[1];
    // Batas 5 MB menjaga proses Apps Script dan request web tetap stabil.
    if(base64.length > 7000000) return {ok:false, message:'Ukuran gambar maksimal 5 MB.'};
    var folder = _baPhotoFolder_(request.tanggalBA, request.jenisPekerjaan, request.nomorTrafo);
    var timestamp = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd_HHmmss');
    var blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, slot+'_'+timestamp+'_'+fileName);
    var file = folder.createFile(blob);
    return {
      ok:true,
      slot:slot,
      url:file.getUrl(),
      fileId:file.getId(),
      folderId:folder.getId(),
      sheetColumn:BA_PHOTO_COLUMN[slot] || ''
    };
  }catch(error){
    return {ok:false, message:'Upload foto gagal: '+error.message};
  }
}
/* =========================================================
   Upload berkas BA final (hasil tanda tangan / scan) dari tab Pencarian Data.
   File disimpan ke folder BA (Berita Acara/Gardu/<Jenis>/<Tahun>/<Bulan>/<Nomor>)
   lalu link-nya ditulis ke kolom CG pada baris idBA terkait.
   Return { ok, idBA, url, fileId, folderId }.
   ========================================================= */
/* Tentukan lokasi penulisan link BA TTD berdasarkan idBA.
   - Gardu    : Rekap Gardu, kolom CG.
   - Switching: Rekap Switching, kolom linkBaTtd (AM).
   Bila peralatan tidak ditentukan, coba Rekap Gardu dulu lalu fallback Switching. */
function _swCariBarisBaTtd_(idBA){
  try{
    var ss = SpreadsheetApp.openById(SW_SOURCE.spreadsheetId);
    var sh = _baResolveSheet_(ss, SW_SOURCE.sheetName);
    if(!sh) return { ok:false, message:'Sheet Rekap Switching tidak ditemukan.' };
    var values = sh.getDataRange().getValues();
    var idxIdBA = _swColToIndex_(SW_COL.idBA);
    var key = _baNormHeader_(idBA);
    for(var r=0;r<values.length;r++){
      if(_baNormHeader_(String(values[r][idxIdBA]||'')) === key){
        return { ok:true, tipe:'switching', sheet:sh, sheetRow:r+1, col:_swColToIndex_(SW_COL.linkBaTtd) };
      }
    }
    return { ok:false };
  }catch(e){
    return { ok:false, message:'Gagal membaca Rekap Switching: '+e.message };
  }
}

function _baLokasiBaTtd_(idBA, peralatan){
  peralatan = String(peralatan||'').trim().toLowerCase();
  if(peralatan === 'switching'){
    var sw = _swCariBarisBaTtd_(idBA);
    if(sw.ok) return sw;
    return sw.message ? sw : { ok:false, message:'Baris BA Switching "'+idBA+'" tidak ditemukan di Rekap Switching.' };
  }
  try{
    var ss = SpreadsheetApp.openById(BA_SOURCE.spreadsheetId);
    var sh = ss.getSheetByName(BA_SOURCE.sheetName);
    if(sh){
      var values = sh.getDataRange().getValues();
      var found = _baFindHeader_(values);
      if(found){
        var rowIndex = _baCariBarisNomorBA_(sh, found, idBA);
        if(rowIndex >= 0) return { ok:true, tipe:'gardu', sheet:sh, sheetRow:rowIndex+1, col:_baColLetterToIndex_('CG') };
      }
    }
  }catch(eg){}
  var sw2 = _swCariBarisBaTtd_(idBA);
  if(sw2.ok) return sw2;
  return { ok:false, message:'Baris BA "'+idBA+'" tidak ditemukan di Rekap Gardu maupun Rekap Switching.' };
}

function uploadBaFinal(request){
  try{
    request = request || {};
    var idBA = String(request.idBA || '').trim();
    var dataUrl = String(request.dataUrl || '');
    var fileName = String(request.fileName || (idBA+'.pdf')).replace(/[\\/:*?"<>|]/g,'-');
    // Tentukan MIME: pakai file.type bila ada; bila kosong/tidak jelas (sering
    // terjadi di HP), deteksi dari ekstensi nama file. Ini penting agar PDF
    // multi-halaman tersimpan sebagai 'application/pdf' — bukan
    // 'application/octet-stream' yang membuat Google Drive hanya menampilkan 1
    // halaman pada pratinjau (gejala "file 2 lembar tapi terlihat 1 lembar").
    var mimeType = String(request.mimeType || '').trim().toLowerCase();
    if(!mimeType || mimeType === 'application/octet-stream'){
      var _ln = fileName.toLowerCase();
      if(_ln.slice(-4) === '.pdf') mimeType = 'application/pdf';
      else if(/\.(jpe?g)$/.test(_ln)) mimeType = 'image/jpeg';
      else if(_ln.slice(-4) === '.png') mimeType = 'image/png';
      else mimeType = 'application/pdf'; // default berkas BA TTD = PDF
    }
    if(!idBA) return { ok:false, message:'idBA wajib diisi.' };
    if(!dataUrl || dataUrl.indexOf(',') < 0) return { ok:false, message:'Data file tidak valid.' };
    var base64 = dataUrl.split(',')[1];
    // Batas ~10 MB.
    if(base64.length > 14000000) return { ok:false, message:'Ukuran file maksimal 10 MB.' };

    // Cari baris tujuan: Gardu (Rekap Gardu -> kolom CG) atau Switching (Rekap Switching -> kolom AM).
    var target = _baLokasiBaTtd_(idBA, request.peralatan);
    if(!target.ok) return target;

    // Folder tujuan sama dengan lokasi foto/PDF BA.
    var folder = _baPhotoFolder_(
      String(request.tanggalBA || ''),
      String(request.jenisPekerjaan || ''),
      String(request.nomorTrafo || idBA)
    );
    var timestamp = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd_HHmmss');
    var blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, 'BA-Upload_'+timestamp+'_'+fileName);
    var file = folder.createFile(blob);

    // Tulis link berkas BA TTD ke baris & kolom sesuai tipe (Gardu=CG, Switching=AM).
    target.sheet.getRange(target.sheetRow, target.col + 1).setValue(file.getUrl());
    SpreadsheetApp.flush();

    return { ok:true, idBA:idBA, tipe:target.tipe, url:file.getUrl(), fileId:file.getId(), folderId:folder.getId() };
  }catch(error){
    return { ok:false, message:'Upload BA gagal: '+error.message };
  }
}
/* =========================================================
Link WhatsApp Berita Acara — bangun teks pesan sesuai Jenis Pekerjaan lalu
kembalikan URL https://api.whatsapp.com/send?text=... (meniru formula sheet).
Kolom huruf TETAP: B Nomor Gardu, D Tanggal, E Jenis Pekerjaan, F Kapasitas,
G Merk, H Nomor Seri, I Tahun, J Konstruksi, K Alamat, L Penyulang, M Section,
Q Koord X, R Koord Y, S Jurusan, T Kepemilikan, U OwnerID, V External Ref,
W Perluasan SUTM, X Vendor, Y Seri PHB, Z Merk PHB, AA Tahun PHB, CG Link BA.
Penggantian: AK/AL/AM/AN = Kapasitas/Merk/Seri/Tahun dipasang, AO Asal Trafo.
Return { ok, waUrl, text, jenis, nomorGardu }.
========================================================= */
function getLinkWaBeritaAcara(idBA){
  try{
    var target = String(idBA || '').trim();
    if(!target) return { ok:false, message:'idBA wajib diisi.' };
    var ss = SpreadsheetApp.openById(BA_SOURCE.spreadsheetId);
    var sh = ss.getSheetByName(BA_SOURCE.sheetName);
    if(!sh) return { ok:false, message:'Sheet Rekap Gardu tidak ditemukan.' };
    var values = sh.getDataRange().getValues();
    var found = _baFindHeader_(values);
    if(!found) return { ok:false, message:'Header Rekap Gardu belum dikenali.' };
    var rowIndex = _baCariBarisNomorBA_(sh, found, target);
    if(rowIndex < 0) return { ok:false, message:'Baris BA "'+target+'" tidak ditemukan.' };
    var row = values[rowIndex];
    // Ambil nilai teks per huruf kolom (mengikuti referensi sel di formula sheet).
    function _c(letter){ return _baText_(row, _baColLetterToIndex_(letter)); }
    // Tanggal -> "DD MMMM YYYY" berbahasa Indonesia (mis. "14 Juli 2026").
    function _tgl(letter){
      var iso = _baDate_(_baCell_(row, _baColLetterToIndex_(letter)));
      if(!iso) return '';
      var p = iso.split('-');
      return String(parseInt(p[2],10)) + ' ' + _baBulanIndonesia_(Number(p[1])) + ' ' + p[0];
    }
    var NL = '\n';
    var jenis = _c('E');
    var nomorGardu = _c('B');
    var jl = jenis.toLowerCase();
    // Link BA = kolom CG (berkas BA ber-TTD hasil Upload BA). Jika belum diunggah
    // (CG kosong), tampilkan pesan agar penerima tahu BA belum tersedia.
    var linkBa = _c('CG') || 'BA belum diupload';
    var text = '';
    if(jl.indexOf('pengoperasian') >= 0){
      text = '*'+jenis.toUpperCase()+' ULP TOBOALI*'+NL+NL
        +'Tanggal : '+_tgl('D')+NL+NL
        +'*DATA TRAFO*'+NL
        +'Nomor Gardu : '+nomorGardu+NL
        +'Kapasitas : '+_c('F')+'kVA'+NL
        +'Merk : '+_c('G')+NL
        +'Nomor Seri : '+_c('H')+NL
        +'Tahun : '+_c('I')+NL
        +'Konstruksi : '+_c('J')+NL
        +'Alamat : '+_c('K')+NL
        +'Penyulang : '+_c('L')+NL
        +'Section : '+_c('M')+NL
        +'Koordinat : '+_c('Q')+', '+_c('R')+NL
        +'Kepemilikan : '+_c('T')+NL
        +'OwnerID : '+_c('U')+NL
        +'External Reference : '+_c('V')+NL
        +'Perluasan SUTM : '+_c('W')+'kmS'+NL
        +'Vendor Pelaksana : '+_c('X')+NL+NL
        +'*DATA PHB-TR*'+NL
        +'Merk : '+_c('Z')+NL
        +'Nomor Seri : '+_c('Y')+NL
        +'Tahun : '+_c('AA')+NL
        +'Jurusan : '+_c('S')+NL+NL
        +'Link BA : '+linkBa;
    } else if(jl.indexOf('penggantian') >= 0){
      text = '*Manajemen Trafo '+_tgl('D')+' ULP Toboali*'+NL
        +'Nomor Gardu : '+nomorGardu+NL+NL
        +'*Dibongkar*'+NL
        +'Kapasitas : '+_c('F')+'kVA'+NL
        +'Merk : '+_c('G')+NL
        +'Nomor Seri '+_c('H')+' Th '+_c('I')+NL
        +'Alamat : '+_c('K')+NL+NL
        +'*Dipasang*'+NL
        +'Kapasitas : '+_c('AK')+'kVA'+NL
        +'Merk : '+_c('AL')+NL
        +'Nomor Seri : '+_c('AM')+' Th '+_c('AN')+NL
        +'Alamat : '+_c('K')+NL
        +'Asal Trafo : '+_c('AO')+NL+NL
        +'Link BA : '+linkBa;
    } else if(jl.indexOf('bongkar') >= 0){
      text = '*'+jenis+' ULP Toboali*'+NL+NL
        +'Nomor Gardu : '+nomorGardu+NL
        +'Tanggal : '+_tgl('D')+NL
        +'Alamat : '+_c('K')+NL
        +'Kapasitas : '+_c('F')+'kVA'+NL
        +'Merk : '+_c('G')+'Nomor Seri : '+_c('H')+NL
        +'Tahun : '+_c('I')+NL+NL
        +'Link BA : '+linkBa;
    } else {
      return { ok:false, message:'Jenis Pekerjaan "'+jenis+'" belum didukung untuk kirim WA.' };
    }
    var waUrl = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
    return { ok:true, waUrl:waUrl, text:text, jenis:jenis, nomorGardu:nomorGardu };
  }catch(error){
    return { ok:false, message:'Gagal membuat link WA: '+error.message };
  }
}

/* Unduh isi file dari Drive sebagai base64 supaya frontend bisa memicu unduhan
   LANGSUNG (via data URL) tanpa membuka preview Google Drive.
   Return { ok, base64, mimeType, fileName }. */
function unduhFileBa(fileId){
  try{
    var id = String(fileId || '').trim();
    if(!id) return { ok:false, message:'File ID kosong.' };
    var file = DriveApp.getFileById(id);
    var blob = file.getBlob();
    return {
      ok:true,
      base64: Utilities.base64Encode(blob.getBytes()),
      mimeType: blob.getContentType() || 'application/pdf',
      fileName: file.getName()
    };
  }catch(error){
    return { ok:false, message:'Gagal mengunduh file: '+error.message };
  }
}
/* =========================================================
   Edit data BA — perbarui satu baris (by idBA) dari modal detail.
   Menulis ke kolom huruf TETAP (sinkron getDataBeritaAcara & engine PDF):
   D Tanggal Pekerjaan, F Kapasitas, G Merk, H Nomor Seri, J Konstruksi,
   K Alamat, L Penyulang, M Section, Q Koordinat X, R Koordinat Y,
   Y Nomor Seri PHB-TR, Z Merk PHB-TR. Tanggal BA & Nomor Trafo via alias.
   Return { ok, idBA, baris }.
   ========================================================= */
function updateBeritaAcaraDetail(request){
  try{
    request = request || {};
    var idBA = String(request.idBA || '').trim();
    if(!idBA) return { ok:false, message:'idBA wajib diisi.' };

    var ss = SpreadsheetApp.openById(BA_SOURCE.spreadsheetId);
    var sh = ss.getSheetByName(BA_SOURCE.sheetName);
    if(!sh) return { ok:false, message:'Sheet Rekap Gardu tidak ditemukan.' };
    var values = sh.getDataRange().getValues();
    var found = _baFindHeader_(values);
    if(!found) return { ok:false, message:'Header Rekap Gardu belum dikenali.' };
    var rowIndex = _baCariBarisNomorBA_(sh, found, idBA);
    if(rowIndex < 0) return { ok:false, message:'Baris BA "'+idBA+'" tidak ditemukan.' };
    var sheetRow = rowIndex + 1;

    function _set_(letter, value){
      sh.getRange(sheetRow, _baColLetterToIndex_(letter) + 1).setValue(value == null ? '' : value);
    }
    function _setText_(letter, value){
      var rng = sh.getRange(sheetRow, _baColLetterToIndex_(letter) + 1);
      rng.setNumberFormat('@');
      rng.setValue(String(value == null ? '' : value));
    }
    var has = function(k){ return Object.prototype.hasOwnProperty.call(request, k); };

    if(has('tanggalPekerjaan')) _set_('D', request.tanggalPekerjaan);
    if(has('kapasitas'))       _set_('F', request.kapasitas);
    if(has('merkTrafo'))       _set_('G', request.merkTrafo);
    if(has('nomorSeriTrafo'))  _set_('H', request.nomorSeriTrafo);
    if(has('konstruksi'))      _set_('J', request.konstruksi);
    if(has('alamat'))          _set_('K', request.alamat);
    if(has('penyulang'))       _set_('L', request.penyulang);
    if(has('section'))         _set_('M', request.section);
    // Koordinat: normalisasi + guard wilayah Bangka Belitung bila keduanya diedit.
    if(has('koordinatX') && has('koordinatY')){
      var kNorm = _baNormalisasiKoordinat_(request.koordinatX, request.koordinatY);
      _setText_('Q', kNorm.ok ? String(kNorm.lat) : '');
      _setText_('R', kNorm.ok ? String(kNorm.lng) : '');
    } else {
      if(has('koordinatX')) _setText_('Q', request.koordinatX);
      if(has('koordinatY')) _setText_('R', request.koordinatY);
    }
    if(has('phbSeri'))         _set_('Y', request.phbSeri);
    if(has('phbMerk'))         _set_('Z', request.phbMerk);
    if(has('jurusan'))         _set_('S', request.jurusan);
    if(has('phbTahun'))        _set_('AA', request.phbTahun);
    // BA Pemeriksaan Trafo: Kesimpulan (BX) & Catatan (BY).
    if(has('kesimpulan'))      _set_('BX', request.kesimpulan);
    if(has('catatan'))         _set_('BY', request.catatan);
    // Data Trafo Sesudah + PHB-TR Sesudah (khusus Penggantian Trafo) -> kolom huruf TETAP
    // (sinkron getDataBeritaAcara & engine PDF): AK/AL/AM/AN Kapasitas/Merk/Seri/Tahun,
    // AO Asal Trafo, AV Jumlah Jurusan, AS/AT/AU Seri/Merk/Tahun PHB-TR Sesudah.
    if(has('kapasitasSesudah'))     _set_('AK', request.kapasitasSesudah);
    if(has('merkSesudah'))          _set_('AL', request.merkSesudah);
    if(has('nomorSeriSesudah'))     _set_('AM', request.nomorSeriSesudah);
    if(has('tahunSesudah'))         _set_('AN', request.tahunSesudah);
    if(has('asalTrafo'))            _set_('AO', request.asalTrafo);
    if(has('jumlahJurusanSesudah')) _set_('AV', request.jumlahJurusanSesudah);
    if(has('phbSeriSesudah'))       _set_('AS', request.phbSeriSesudah);
    if(has('phbMerkSesudah'))       _set_('AT', request.phbMerkSesudah);
    if(has('phbTahunSesudah'))      _set_('AU', request.phbTahunSesudah);

    if(has('tanggalBA')){
      var cTgl = _baPickIndex_(found.map, ['Tanggal BA','Tanggal','Tgl']);
      if(cTgl >= 0) sh.getRange(sheetRow, cTgl + 1).setValue(request.tanggalBA == null ? '' : request.tanggalBA);
    }
    if(has('nomorTrafo')){
      var cNama = _baPickIndex_(found.map, ['Nomor Trafo','Nama Peralatan','Nomor Gardu','Nama Gardu','Gardu']);
      if(cNama >= 0) sh.getRange(sheetRow, cNama + 1).setValue(request.nomorTrafo == null ? '' : request.nomorTrafo);
    }

    // Hitung ulang OwnerId (kolom U, teks) & External Reference (kolom V) dari
    // Penyulang + Section terbaru bila salah satunya ikut diedit. Nilai yang tidak
    // cocok/tidak lengkap akan dikosongkan agar tetap sesuai (getOwnerIdDanExternalReference).
    var ownerHasil = null;
    if(has('penyulang') || has('section')){
      var penyulangNow = has('penyulang') ? String(request.penyulang || '').trim()
        : String(sh.getRange(sheetRow, _baColLetterToIndex_('L') + 1).getValue() || '').trim();
      var sectionNow = has('section') ? String(request.section || '').trim()
        : String(sh.getRange(sheetRow, _baColLetterToIndex_('M') + 1).getValue() || '').trim();
      ownerHasil = getOwnerIdDanExternalReference({ penyulang:penyulangNow, section:sectionNow });
      _setText_('U', (ownerHasil && ownerHasil.ownerId) || '');
      _set_('V', (ownerHasil && ownerHasil.externalReference) || '');
    }

    SpreadsheetApp.flush();
    return {
      ok:true, idBA:idBA, baris:sheetRow,
      ownerId:(ownerHasil && ownerHasil.ownerId) || '',
      externalReference:(ownerHasil && ownerHasil.externalReference) || ''
    };
  }catch(error){
    return { ok:false, message:'Gagal memperbarui data BA: '+error.message };
  }
}
/* =========================================================
   Re-upload foto BA (sebelum/sesudah) dari modal Edit di tab Pencarian Data.
   Upload gambar ke folder Drive BA lalu tulis link ke kolom foto tetap
   (BA_PHOTO_COLUMN[slot]) pada baris idBA terkait. Return { ok, url, sheetColumn }.
   ========================================================= */
/* Hapus (trash) file Drive berdasarkan URL Google Drive. Dipakai saat mengganti
   foto BA supaya file lama tidak menumpuk di Drive. Aman: URL kosong / id sama
   dengan file baru / file sudah tidak ada -> diabaikan. Return true bila terhapus. */
function _baHapusFileDriveByUrl_(url, keepId){
  var s = String(url || '');
  var m = s.match(/\/d\/([a-zA-Z0-9_-]+)/) || s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  var id = m ? m[1] : '';
  if(!id || id === String(keepId || '')) return false;
  try{
    DriveApp.getFileById(id).setTrashed(true);
    return true;
  }catch(e){
    return false;
  }
}
function updateFotoBeritaAcaraDetail(request){
  try{
    request = request || {};
    var idBA = String(request.idBA || '').trim();
    var slot = String(request.slot || '').trim();
    if(!idBA) return { ok:false, message:'idBA wajib diisi.' };
    // Slot foto BA biasa (BA_PHOTO_COLUMN) maupun foto megger BA Pemeriksaan
    // Trafo (BA_PRK_FOTO_COLUMN: megger1..megger6 -> BF, BI, BL, BO, BR, BU).
    var kolom = BA_PHOTO_COLUMN[slot] || (typeof BA_PRK_FOTO_COLUMN !== 'undefined' ? BA_PRK_FOTO_COLUMN[slot] : '');
    if(!kolom) return { ok:false, message:'Slot foto tidak dikenal: '+slot };
    var dataUrl = String(request.dataUrl || '');
    var fileName = String(request.fileName || slot+'.jpg').replace(/[\\/:*?"<>|]/g,'-');
    var mimeType = String(request.mimeType || 'image/jpeg');
    if(!/^image\//.test(mimeType)) return { ok:false, message:'File harus berupa gambar.' };
    if(!dataUrl || dataUrl.indexOf(',') < 0) return { ok:false, message:'Data gambar tidak valid.' };
    var base64 = dataUrl.split(',')[1];
    if(base64.length > 7000000) return { ok:false, message:'Ukuran gambar maksimal 5 MB.' };

    var ss = SpreadsheetApp.openById(BA_SOURCE.spreadsheetId);
    var sh = ss.getSheetByName(BA_SOURCE.sheetName);
    if(!sh) return { ok:false, message:'Sheet Rekap Gardu tidak ditemukan.' };
    var values = sh.getDataRange().getValues();
    var found = _baFindHeader_(values);
    if(!found) return { ok:false, message:'Header Rekap Gardu belum dikenali.' };
    var rowIndex = _baCariBarisNomorBA_(sh, found, idBA);
    if(rowIndex < 0) return { ok:false, message:'Baris BA "'+idBA+'" tidak ditemukan.' };
    var sheetRow = rowIndex + 1;

    // Link foto LAMA di kolom ini SEBELUM ditimpa (untuk dihapus dari Drive).
    var kolomIndex = _baColLetterToIndex_(kolom);
    var urlLama = String(sh.getRange(sheetRow, kolomIndex + 1).getValue() || '').trim();

    // Path folder Drive dari nomor/tanggal/jenis (dikirim dari frontend row terpilih).
    var folder = _baPhotoFolder_(request.tanggalBA, request.jenisPekerjaan, request.nomorTrafo);
    var timestamp = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd_HHmmss');
    var blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, slot+'_'+timestamp+'_'+fileName);
    var file = folder.createFile(blob);
    var url = file.getUrl();
    sh.getRange(sheetRow, kolomIndex + 1).setValue(url);
    SpreadsheetApp.flush();
    // Hapus foto LAMA dari Drive setelah link baru tertulis (aman bila kosong/gagal).
    var fileLamaDihapus = _baHapusFileDriveByUrl_(urlLama, file.getId());
    return { ok:true, idBA:idBA, slot:slot, url:url, fileId:file.getId(), sheetColumn:kolom, fileLamaDihapus:fileLamaDihapus };
  }catch(error){
    return { ok:false, message:'Gagal memperbarui foto BA: '+error.message };
  }
}
function getDataBeritaAcara(filter){
  try{
    filter = filter || {};
    var ss = SpreadsheetApp.openById(BA_SOURCE.spreadsheetId);
    var sh = ss.getSheetByName(BA_SOURCE.sheetName);
    if(!sh) return { ok:false, message:'Sheet Rekap Gardu tidak ditemukan.' };
    var values = sh.getDataRange().getValues();
    if(!values.length) return { ok:true, rows:[] };
    var found = _baFindHeader_(values);
    if(!found){
      return { ok:false, message:'Header Rekap Gardu belum dikenali. Diperlukan minimal kolom Tanggal BA, Penyulang, dan Nomor Trafo/Nomor Gardu.' };
    }
    var H = found.map;
    var IDX = {
      idBA: _baPickIndex_(H,['idBA','ID BA','Id BA','Nomor BA','No BA']),
      tanggal: _baPickIndex_(H,['Tanggal BA','Tanggal','Tanggal Pekerjaan','Tgl']),
      jenis: _baPickIndex_(H,['Jenis Pekerjaan','Pekerjaan','Kategori Pekerjaan']),
      peralatan: _baPickIndex_(H,['Peralatan','Jenis Peralatan','Objek Peralatan','Objek']),
      nama: _baPickIndex_(H,['Nomor Trafo','Nama Peralatan','Nomor Gardu','Nama Gardu','Gardu','Nama Switching','Switching']),
      penyulang: _baColLetterToIndex_('L'),
      section: _baColLetterToIndex_('M'),
      koordinat: _baPickIndex_(H,['Koordinat Trafo','Koordinat','Koordinat Peralatan','Lokasi Koordinat']),
      kapasitas: _baColLetterToIndex_('F'),
      merkTrafo: _baColLetterToIndex_('G'),
      nomorSeriTrafo: _baColLetterToIndex_('H'),
      konstruksi: _baColLetterToIndex_('J'),
      alamat: _baColLetterToIndex_('K'),
      koordinatX: _baColLetterToIndex_('Q'),
      koordinatY: _baColLetterToIndex_('R'),
      phbMerk: _baColLetterToIndex_('Z'),
      phbSeri: _baColLetterToIndex_('Y'),
      jurusan: _baColLetterToIndex_('S'),
      phbTahun: _baColLetterToIndex_('AA'),
      kapasitasSesudah: _baColLetterToIndex_('AK'),
      merkSesudah: _baColLetterToIndex_('AL'),
      nomorSeriSesudah: _baColLetterToIndex_('AM'),
      tahunSesudah: _baColLetterToIndex_('AN'),
      asalTrafo: _baColLetterToIndex_('AO'),
      jumlahJurusanSesudah: _baColLetterToIndex_('AV'),
      phbMerkSesudah: _baColLetterToIndex_('AT'),
      phbSeriSesudah: _baColLetterToIndex_('AS'),
      phbTahunSesudah: _baColLetterToIndex_('AU'),
      baTtd: _baColLetterToIndex_('CG'),
      filePdfUrl: _baColLetterToIndex_('CK'),
      kesimpulan: _baColLetterToIndex_('BX'),
      catatan: _baColLetterToIndex_('BY')
    };
    var peralatanFilter = String(filter.kataKunciPeralatan || filter.nomorGardu || '').trim().toLowerCase();
    var dari = _baDate_(filter.tglDari);
    var sampai = _baDate_(filter.tglSampai);
    var jenisFilter = String(filter.jenisPekerjaan || '').trim().toLowerCase();
    var alatFilter = String(filter.peralatan || '').trim().toLowerCase();
    var statusFilter = String(filter.statusBA || '').trim().toLowerCase();
    var rows = [];
    for(var i=found.row+1;i<values.length;i++){
      var row = values[i];
      var tanggal = _baDate_(_baCell_(row,IDX.tanggal));
      var jenis = String(_baCell_(row,IDX.jenis)||'').trim();
      var peralatan = IDX.peralatan >= 0 ? String(_baCell_(row,IDX.peralatan)||'').trim() : 'Gardu';
      var nama = String(_baCell_(row,IDX.nama)||'').trim();
      var penyulang = String(_baCell_(row,IDX.penyulang)||'').trim();
      if(!nama && !penyulang) continue;
      if(peralatanFilter && nama.toLowerCase().indexOf(peralatanFilter) === -1) continue;
      if(dari && (!tanggal || tanggal < dari)) continue;
      if(sampai && (!tanggal || tanggal > sampai)) continue;
      if(jenisFilter && jenis.toLowerCase() !== jenisFilter) continue;
      if(alatFilter){
        if(alatFilter === 'gardu'){
          // Filter Jenis Peralatan "Gardu": cocokkan baris yang Jenis Pekerjaan-nya
          // mengandung kata "trafo" atau "gardu" (mis. "Penggantian Trafo",
          // "Pengoperasian Gardu", "Bongkar Gardu"). Bukan lagi dari kolom Peralatan.
          var _jl = jenis.toLowerCase();
          if(_jl.indexOf('trafo') === -1 && _jl.indexOf('gardu') === -1) continue;
        } else if(peralatan.toLowerCase() !== alatFilter){
          continue;
        }
      }
      var detail = {};
      for(var c=0;c<found.headers.length;c++){
        var label = String(found.headers[c]||'').trim();
        var value = _baCell_(row,c);
        if(!label || value === '' || value == null) continue;
        detail[label] = value instanceof Date ? Utilities.formatDate(value,'Asia/Jakarta','dd/MM/yyyy') : String(value);
      }
      rows.push({
        idBA: String(_baCell_(row,IDX.idBA)||'').trim(),
        tanggal: tanggal,
        jenisPekerjaan: jenis,
        peralatan: peralatan,
        namaPeralatan: nama,
        penyulang: penyulang,
        section: String(_baCell_(row,IDX.section)||'').trim(),
        koordinat: String(_baCell_(row,IDX.koordinat)||'').trim(),
        kapasitas: String(_baCell_(row,IDX.kapasitas)||'').trim(),
        merkTrafo: String(_baCell_(row,IDX.merkTrafo)||'').trim(),
        nomorSeriTrafo: String(_baCell_(row,IDX.nomorSeriTrafo)||'').trim(),
        konstruksi: String(_baCell_(row,IDX.konstruksi)||'').trim(),
        alamat: String(_baCell_(row,IDX.alamat)||'').trim(),
        koordinatX: String(_baCell_(row,IDX.koordinatX)||'').trim(),
        koordinatY: String(_baCell_(row,IDX.koordinatY)||'').trim(),
        phbMerk: String(_baCell_(row,IDX.phbMerk)||'').trim(),
        phbSeri: String(_baCell_(row,IDX.phbSeri)||'').trim(),
        jurusan: String(_baCell_(row,IDX.jurusan)||'').trim(),
        phbTahun: String(_baCell_(row,IDX.phbTahun)||'').trim(),
        kapasitasSesudah: String(_baCell_(row,IDX.kapasitasSesudah)||'').trim(),
        merkSesudah: String(_baCell_(row,IDX.merkSesudah)||'').trim(),
        nomorSeriSesudah: String(_baCell_(row,IDX.nomorSeriSesudah)||'').trim(),
        tahunSesudah: String(_baCell_(row,IDX.tahunSesudah)||'').trim(),
        asalTrafo: String(_baCell_(row,IDX.asalTrafo)||'').trim(),
        jumlahJurusanSesudah: String(_baCell_(row,IDX.jumlahJurusanSesudah)||'').trim(),
        phbMerkSesudah: String(_baCell_(row,IDX.phbMerkSesudah)||'').trim(),
        phbSeriSesudah: String(_baCell_(row,IDX.phbSeriSesudah)||'').trim(),
        phbTahunSesudah: String(_baCell_(row,IDX.phbTahunSesudah)||'').trim(),
        baTtd: String(_baCell_(row,IDX.baTtd)||'').trim(),
        filePdfUrl: String(_baCell_(row,IDX.filePdfUrl)||'').trim(),
        kesimpulan: String(_baCell_(row,IDX.kesimpulan)||'').trim(),
        catatan: String(_baCell_(row,IDX.catatan)||'').trim(),
        megger: (function(){
          var out = {};
          Object.keys(BA_PRK_FOTO_COLUMN).forEach(function(slot){
            out[slot] = String(_baCell_(row, _baColLetterToIndex_(BA_PRK_FOTO_COLUMN[slot]))||'').trim();
          });
          return out;
        })(),
        detail: detail
      });
      if(rows.length >= BA_SOURCE.maxRows) break;
    }
    // Gabungkan data Switching (Rekap Switching) ke hasil pencarian, kecuali
    // filter Jenis Peralatan dibatasi ke "Gardu".
    if(alatFilter !== 'gardu'){
      try{
        var swData = getDataSwitching({
          kataKunci: filter.kataKunciPeralatan || filter.nomorGardu || '',
          tglDari: filter.tglDari,
          tglSampai: filter.tglSampai,
          jenisPekerjaan: filter.jenisPekerjaan
        });
        if(swData && swData.ok && swData.rows){
          swData.rows.forEach(function(s){
            if(rows.length >= BA_SOURCE.maxRows) return;
            rows.push({
              idBA: s.idBA,
              tanggal: s.tanggal,
              jenisPekerjaan: s.jenisPekerjaan,
              peralatan: 'Switching',
              namaPeralatan: s.namaSwitching,
              penyulang: s.penyulang,
              section: s.section,
              koordinat: s.koordinat,
              kapasitas: '',
              merkTrafo: s.merk,
              nomorSeriTrafo: s.nomorSeri,
              konstruksi: s.tipe,
              alamat: '',
              koordinatX: '',
              koordinatY: '',
              phbMerk: '',
              phbSeri: '',
              jurusan: '',
              phbTahun: '',
              filePdfUrl: s.filePdfUrl,
              baTtd: s.baTtd,
              detail: s.detail
            });
          });
        }
      }catch(swErr){}
    }
    rows.sort(function(a,b){
      return String(b.tanggal||'').localeCompare(String(a.tanggal||''))
        || String(a.namaPeralatan||'').localeCompare(String(b.namaPeralatan||''));
    });
    // Filter Status BA (Selesai TTD / Proses TTD / Draft BA). Status dihitung
    // dari kolom BA TTD (CG) & File PDF (CK), konsisten dengan badge frontend.
    if(statusFilter){
      rows = rows.filter(function(r){
        var st = r.baTtd ? 'selesai ttd' : (r.filePdfUrl ? 'proses ttd' : 'draft ba');
        return st === statusFilter;
      });
    }
    return { ok:true, rows:rows, total:rows.length };
  }catch(error){
    return { ok:false, message:'Error Berita Acara: '+error.message };
  }
}
/* =========================================================
   Simpan Berita Acara Gardu — dipanggil frontend bagSimpan()
   Menulis SATU baris BA baru ke Rekap Gardu:
   - Generate idBA (kolom CI) + NO BA Full (kolom CE)
   - Kolom lain dipetakan lewat alias (konsisten dengan engine PDF)
   - URL foto ditulis ke kolom huruf tetap (BA_PHOTO_COLUMN)
   Return { ok, idBA, nomorBA, nomorBAFull }. Frontend mengisi bagNomorBA
   dengan idBA supaya Generate PDF menemukan barisnya.
   ========================================================= */
var BA_SAVE_ALIASES = {
  idBA: ['idBA','ID BA','Id BA','Nomor BA','No BA'],
  nomorBAFull: ['NO BA Full','Nomor BA Full','No BA Full','NoBAFull'],
  nomorTrafo: ['Nomor Trafo','Nomor Gardu','Nama Gardu','Gardu'],
  tanggalBA: ['Tanggal BA','Tanggal','Tgl'],
  tanggalPekerjaan: ['Tanggal Pekerjaan','Tgl Pekerjaan'],
  jenisPekerjaan: ['Jenis Pekerjaan','Pekerjaan'],
  penyulang: ['Penyulang'],
  section: ['Section','Seksi'],
  koordinat: ['Koordinat Trafo','Koordinat'],
  alamat: ['Alamat'],
  kapasitas: ['Kapasitas','Kapasitas (kVA)','Daya','kVA'],
  merk: ['Merk','Merk Trafo'],
  nomorSeri: ['Nomor Seri','No Seri Trafo'],
  tahun: ['Tahun','Tahun Trafo'],
  konstruksi: ['Konstruksi','Konstruksi Trafo'],
  jurusan: ['Jurusan Terpasang','Jurusan'],
  kepemilikan: ['Kepemilikan'],
  ownerId: ['OwnerId','Owner Id'],
  externalRef: ['External Reference','External Ref'],
  perluasan: ['Panjang Perluasan SUTM','Perluasan SUTM','Perluasan'],
  vendor: ['Vendor Pekerja','Vendor'],
  phbMerk: ['Merk PHB-TR','Merk PHB'],
  phbSeri: ['Nomor Seri PHB-TR','No Seri PHB-TR','Seri PHB'],
  phbTahun: ['Tahun PHB-TR','Tahun PHB'],
  petugas1: ['Petugas 1','Petugas1'],
  jabatan1: ['Jabatan Petugas 1','Jabatan 1'],
  petugas2: ['Petugas 2','Petugas2'],
  jabatan2: ['Jabatan Petugas 2','Jabatan 2'],
  mengetahui: ['Mengetahui'],
  jabatanMengetahui: ['Jabatan Mengetahui']
};
function _baColLetterToIndex_(letter){
  var result = 0;
  var s = String(letter || '').toUpperCase();
  for(var i=0;i<s.length;i++){ result = result*26 + (s.charCodeAt(i)-64); }
  return result - 1;
}
function _baGenerateIdBA_(values, headerRow, idxIdBA, tanggalBA){
  var m = String(tanggalBA||'').match(/^(\d{4})-(\d{2})-(\d{2})/);
  var now = new Date();
  var year = m ? m[1] : Utilities.formatDate(now,'Asia/Jakarta','yyyy');
  var month = m ? m[2] : Utilities.formatDate(now,'Asia/Jakarta','MM');
  var prefix = 'BA-GRD-TBL-' + year + month + '-';
  var maxSeq = 0;
  for(var r=headerRow+1;r<values.length;r++){
    var v = String(_baText_(values[r], idxIdBA) || '');
    if(v.indexOf(prefix) === 0){
      var seq = parseInt(v.substring(prefix.length),10);
      if(!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  }
  return { idBA: prefix + ('00'+(maxSeq+1)).slice(-3), year: year, month: month };
}
function _baGenerateNoBaFull_(values, headerRow, idxNoFull, year, month){
  var bulan = String(parseInt(month,10)); // tanpa nol depan
  var maxSeq = 0;
  if(idxNoFull >= 0){
    for(var r=headerRow+1;r<values.length;r++){
      var v = String(_baText_(values[r], idxNoFull) || '');
      var mm = v.match(/No\.\s*(\d+)\s*\/\s*BA\s*-\s*TRF\s*\/\s*ULP\s*-\s*TBL\.?\s*\/\s*(\d+)\s*\/\s*(\d+)/i);
      if(mm && parseInt(mm[2],10)===parseInt(bulan,10) && String(mm[3])===String(year)){
        var seq = parseInt(mm[1],10);
        if(!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    }
  }
  var nnn = ('00'+(maxSeq+1)).slice(-3);
  return 'No. ' + nnn + ' / BA - TRF / ULP - TBL / ' + bulan + ' / ' + year;
}
function simpanBeritaAcaraGardu(payload){
  try{
    payload = payload || {};
    var identitas = payload.identitas || {};
    var trafoAwal = payload.trafoAwal || {};
    var phbTr = payload.phbTr || {};
    var pemeriksa = payload.pemeriksa || {};
    var foto = payload.foto || {};
    var trafoSesudah = payload.trafoSesudah || {};
    var phbTrSesudah = payload.phbTrSesudah || {};

    var nomorTrafo = String(identitas.nomorTrafo || '').trim();
    var tanggalBA = String(identitas.tanggalBA || '').trim();
    var jenis = String(payload.jenisPekerjaan || '').trim();
    if(!nomorTrafo) return { ok:false, message:'Nomor Gardu wajib diisi.' };
    if(!tanggalBA)  return { ok:false, message:'Tanggal BA wajib diisi.' };
    if(!jenis)      return { ok:false, message:'Jenis Pekerjaan wajib dipilih.' };

    var ss = SpreadsheetApp.openById(BA_SOURCE.spreadsheetId);
    var sh = ss.getSheetByName(BA_SOURCE.sheetName);
    if(!sh) return { ok:false, message:'Sheet Rekap Gardu tidak ditemukan.' };

    var values = sh.getDataRange().getValues();
    var found = _baFindHeader_(values);
    if(!found) return { ok:false, message:'Header Rekap Gardu belum dikenali.' };
    var H = found.map;

    // Resolusi index kolom tiap field (yang tidak ada -> -1, dilewati).
    var col = {};
    Object.keys(BA_SAVE_ALIASES).forEach(function(field){
      col[field] = _baPickIndex_(H, BA_SAVE_ALIASES[field]);
    });
    if(col.idBA < 0) return { ok:false, message:'Kolom idBA tidak ditemukan di Rekap Gardu.' };

    // Baris tujuan: tepat SETELAH baris data terakhir yang punya idBA atau Nomor
    // Trafo. Diambil dari baris berdata TERAKHIR (bukan baris kosong pertama) supaya
    // tidak nyangkut di baris kosong di tengah atau baris yang hanya berisi formula
    // (kolom No / Hyperlink / Link Drive / Link WA dsb yang di-spill ke bawah).
    var idxNama = col.nomorTrafo;
    var lastDataRow = found.row; // minimal tepat di bawah header
    for(var r=found.row+1;r<values.length;r++){
      var adaId = String(_baText_(values[r], col.idBA) || '') !== '';
      var adaNama = idxNama >= 0 ? String(_baText_(values[r], idxNama) || '') !== '' : false;
      if(adaId || adaNama) lastDataRow = r;
    }
    var targetRow = lastDataRow + 1; // baris baru tepat di bawah data terakhir

    // Generate idBA + NO BA Full.
    var gen = _baGenerateIdBA_(values, found.row, col.idBA, tanggalBA);
    var idBA = gen.idBA;
    var noBaFull = _baGenerateNoBaFull_(values, found.row, col.nomorBAFull, gen.year, gen.month);

    var nilai = {
      idBA: idBA,
      nomorBAFull: noBaFull,
      nomorTrafo: nomorTrafo,
      tanggalBA: tanggalBA,
      tanggalPekerjaan: String(identitas.tanggalPekerjaan || ''),
      jenisPekerjaan: jenis,
      penyulang: String(trafoAwal.penyulang || ''),
      section: String(trafoAwal.section || ''),
      koordinat: String(trafoAwal.koordinat || ''),
      alamat: String(trafoAwal.alamat || ''),
      kapasitas: String(trafoAwal.kapasitas || ''),
      merk: String(trafoAwal.merk || ''),
      nomorSeri: String(trafoAwal.nomorSeri || ''),
      tahun: String(trafoAwal.tahun || ''),
      konstruksi: String(trafoAwal.konstruksi || ''),
      jurusan: String(trafoAwal.jurusanTerpasang || ''),
      kepemilikan: String(phbTr.kepemilikan || ''),
      ownerId: String(phbTr.ownerId || ''),
      externalRef: String(phbTr.externalRef || ''),
      perluasan: String(phbTr.perluasanSutm || ''),
      vendor: String(phbTr.vendor || ''),
      phbMerk: String(phbTr.merk || ''),
      phbSeri: String(phbTr.nomorSeri || ''),
      phbTahun: String(phbTr.tahun || ''),
      petugas1: String(pemeriksa.petugas1 || ''),
      jabatan1: String(pemeriksa.jabatan1 || ''),
      petugas2: String(pemeriksa.petugas2 || ''),
      jabatan2: String(pemeriksa.jabatan2 || ''),
      mengetahui: String(pemeriksa.mengetahui || ''),
      jabatanMengetahui: String(pemeriksa.jabatanMengetahui || '')
    };

    var sheetRow = targetRow + 1; // 1-based

    // Koordinat "lat, long" DINORMALISASI + GUARD wilayah Indonesia sebelum
    // dipecah ke dua kolom (Q = Lat, R = Long). Format salah (koma desimal,
    // simbol derajat/arah, Lat-Long tertukar) diperbaiki otomatis; bila di luar
    // Bangka Belitung / tak terbaca, koordinat dikosongkan agar tidak menyimpan salah.
    var koordinatText = String(trafoAwal.koordinat || '').trim();
    var koordInput = _baNormalisasiKoordinat_(koordinatText, '');
    var koordinatLat  = koordInput.ok ? String(koordInput.lat) : '';
    var koordinatLong = koordInput.ok ? String(koordInput.lng) : '';

    // Penulisan by HURUF KOLOM TETAP (tidak bergantung nama header) supaya data
    // pasti masuk walau teks header di sheet berbeda dari alias.
    function _baSet_(letter, value){
      sh.getRange(sheetRow, _baColLetterToIndex_(letter) + 1).setValue(value);
    }
    // Set sebagai TEKS (format '@') supaya angka berawalan 0 (mis. OwnerId
    // "07161301601") tidak dikonversi jadi number sehingga nol depannya hilang.
    function _baSetText_(letter, value){
      var rng = sh.getRange(sheetRow, _baColLetterToIndex_(letter) + 1);
      rng.setNumberFormat('@');
      rng.setValue(String(value == null ? '' : value));
    }
    _baSet_('D',  nilai.tanggalPekerjaan); // Tanggal Pekerjaan
    _baSet_('F',  nilai.kapasitas);        // Kapasitas (kVA)
    _baSet_('G',  nilai.merk);             // Merk
    _baSet_('H',  nilai.nomorSeri);        // Nomor Seri
    _baSet_('I',  nilai.tahun);            // Tahun
    _baSet_('J',  nilai.konstruksi);       // Konstruksi
    _baSet_('K',  nilai.alamat);           // Alamat
    _baSet_('L',  nilai.penyulang);        // Penyulang
    _baSet_('M',  nilai.section);          // Section
    _baSetText_('Q', koordinatLat);           // Koordinat Trafo (Lat)
    _baSetText_('R', koordinatLong);          // Koordinat Trafo (Long)
    _baSet_('S',  nilai.jurusan);          // Jurusan Terpasang
    _baSet_('Y',  nilai.phbSeri);          // Nomor Seri PHB-TR
    _baSet_('Z',  nilai.phbMerk);          // Merk PHB-TR
    _baSet_('AA', nilai.phbTahun);         // Tahun PHB-TR
    _baSetText_('U', nilai.ownerId);       // OwnerId (teks, jaga nol depan)
    _baSet_('V',  nilai.externalRef);      // External Reference

    _baSet_('T',  nilai.kepemilikan);      // Kepemilikan
    _baSet_('W',  nilai.perluasan);        // Panjang Perluasan SUTM
    _baSet_('X',  nilai.vendor);           // Vendor Pekerja
    _baSet_('BZ', nilai.petugas1);         // TL (Petugas 1)
    _baSet_('CA', nilai.jabatan1);         // Jabatan TL
    _baSet_('CB', nilai.petugas2);         // Staff / TL Put (Petugas 2)
    _baSet_('CC', nilai.jabatan2);         // Jabatan Staff / TL Put

    // Data Trafo Sesudah + PHB-TR Sesudah (khusus Penggantian Trafo) -> kolom
    // huruf TETAP, sinkron dengan engine PDF (main.py) & getLinkWaBeritaAcara.
    // Trafo Sesudah: AK Kapasitas, AL Merk, AM Nomor Seri, AN Tahun, AO Asal Trafo.
    // Jumlah Jurusan PHB-TR Sesudah -> AV. PHB-TR Sesudah: AS Seri, AT Merk, AU Tahun.
    if(String(jenis).toLowerCase().indexOf('penggantian') >= 0){
      _baSet_('AK', String(trafoSesudah.kapasitas || ''));     // Kapasitas Sesudah
      _baSet_('AL', String(trafoSesudah.merk || ''));          // Merk Sesudah
      _baSet_('AM', String(trafoSesudah.nomorSeri || ''));     // Nomor Seri Sesudah
      _baSet_('AN', String(trafoSesudah.tahun || ''));         // Tahun Sesudah
      _baSet_('AO', String(trafoSesudah.asalTrafo || ''));     // Asal Trafo
      _baSet_('AV', String(trafoSesudah.jumlahJurusan || '')); // Jumlah Jurusan PHB-TR Sesudah
      _baSet_('AS', String(phbTrSesudah.nomorSeri || ''));     // Nomor Seri PHB-TR Sesudah
      _baSet_('AT', String(phbTrSesudah.merk || ''));          // Merk PHB-TR Sesudah
      _baSet_('AU', String(phbTrSesudah.tahun || ''));         // Tahun PHB-TR Sesudah
      // Status penggantian box PHB-TR (dipakai engine PDF untuk memutuskan
      // tampil/tidaknya blok foto PHB-TR di lampiran). Ditulis "Ya"/"Tidak" ke
      // kolom "PHB-TR Diganti" (dibuat otomatis di ujung kanan bila belum ada).
      var _cPhbDiganti = _baPastikanKolom_(sh, found, ['PHB-TR Diganti','Status PHB-TR','PHB Diganti']);
      sh.getRange(sheetRow, _cPhbDiganti + 1).setValue(phbTrSesudah.diganti ? 'Ya' : 'Tidak');
    }

    // Field yang SUDAH ditulis ke kolom tetap di atas -> jangan ditulis ulang via alias.
    var kolomTetap = {
      tanggalPekerjaan:1, kapasitas:1, merk:1, nomorSeri:1, tahun:1, konstruksi:1,
      alamat:1, penyulang:1, section:1, koordinat:1, jurusan:1,
      phbSeri:1, phbMerk:1, phbTahun:1, ownerId:1, externalRef:1,
      kepemilikan:1, perluasan:1, vendor:1,
      petugas1:1, jabatan1:1, petugas2:1, jabatan2:1
    };
    // Sisanya (idBA, NO BA Full, Nomor Trafo, Tanggal BA, Jenis, Mengetahui,
    // Jabatan Mengetahui) tetap via alias.
    Object.keys(nilai).forEach(function(field){
      if(kolomTetap[field]) return;
      var c = col[field];
      if(c != null && c >= 0) sh.getRange(sheetRow, c+1).setValue(nilai[field]);
    });

    // URL foto -> kolom huruf tetap (BA_PHOTO_COLUMN).
    Object.keys(BA_PHOTO_COLUMN).forEach(function(slot){
      var item = foto[slot];
      var url = item && (item.url || item.fileUrl);
      if(url){
        var cIdx = _baColLetterToIndex_(BA_PHOTO_COLUMN[slot]);
        sh.getRange(sheetRow, cIdx+1).setValue(url);
      }
    });

    SpreadsheetApp.flush();

    // Verifikasi tulis: pastikan idBA benar-benar ada di baris tujuan. Jika kosong,
    // besar kemungkinan kolom idBA/Nomor Trafo di Rekap Gardu berisi ARRAYFORMULA,
    // berada dalam Filter aktif, atau termasuk Range terproteksi -> laporkan jelas.
    var cek = String(sh.getRange(sheetRow, col.idBA + 1).getValue() || '').trim();
    if(cek !== idBA){
      return {
        ok:false,
        baris:sheetRow,
        idBA:idBA,
        message:'BA belum tersimpan di sheet: idBA "' + idBA + '" tidak muncul di baris ' + sheetRow + ' (kolom idBA). Cek apakah kolom idBA / Nomor Trafo di Rekap Gardu berisi ARRAYFORMULA, sedang difilter, atau termasuk Range terproteksi.'
      };
    }

    // Verifikasi khusus PHB-TR (Y=Nomor Seri, Z=Merk, AA=Tahun). Bila nilai yang
    // dikirim TIDAK muncul kembali di selnya, biasanya kolom Y/Z/AA terkena
    // ARRAYFORMULA (spill dari baris lain) atau termasuk Range terproteksi
    // sehingga setValue tidak tersimpan. Laporkan jelas agar mudah diperbaiki.
    var phbPeriksa = [
      { letter:'Y',  label:'Nomor Seri PHB-TR', nilai: nilai.phbSeri },
      { letter:'Z',  label:'Merk PHB-TR',       nilai: nilai.phbMerk },
      { letter:'AA', label:'Tahun PHB-TR',      nilai: nilai.phbTahun }
    ];
    var phbGagal = [];
    phbPeriksa.forEach(function(item){
      if(String(item.nilai == null ? '' : item.nilai).trim() === '') return; // input kosong -> abaikan
      var tersimpan = String(sh.getRange(sheetRow, _baColLetterToIndex_(item.letter) + 1).getValue() || '').trim();
      if(tersimpan !== String(item.nilai).trim()) phbGagal.push(item.label + ' (kolom ' + item.letter + ')');
    });
    if(phbGagal.length){
      return {
        ok:false,
        baris:sheetRow,
        idBA:idBA,
        message:'Data utama tersimpan, tetapi PHB-TR gagal tersimpan pada: ' + phbGagal.join(', ')
          + '. Kemungkinan kolom Y/Z/AA (PHB-TR) terkena ARRAYFORMULA (spill) atau Range terproteksi di sheet Rekap Gardu. '
          + 'Hapus formula/proteksi pada kolom tersebut lalu simpan ulang.'
      };
    }

    return { ok:true, idBA:idBA, nomorBA:idBA, nomorBAFull:noBaFull, baris:sheetRow };
  }catch(error){
    return { ok:false, message:'Gagal menyimpan BA: ' + error.message };
  }
}
/* =========================================================
   Nomor Gardu berikutnya — per Kode Gardu (TB / PY / TL / PG)
   Tiap kode gardu punya penghitung sendiri. Nomor = prefix 2 huruf + 4 digit
   (mis. TB0415). Frontend mengirim kodeGardu yang dipilih user, lalu:
     1) cari nomor tertinggi kode itu di Master Gardu (acuan utama),
     2) bandingkan dengan Rekap Gardu (nomor yang sudah dipakai BA),
     3) ambil yang tertinggi lalu +1. Deret kosong dimulai dari 0001.
   Frontend memanggil via google.script.run
     .withSuccessHandler(...).getNomorGarduBerikutnya(kodeGardu)
   ========================================================= */
var BA_MASTER_GARDU = {
  spreadsheetId: '1TEC2iaxEcTCn0IXDZM1kHpAhKyBHuG90SMK48zEkeOw',
  sheetName: 'Master Gardu'
};
// Daftar SEMUA spreadsheet Master yang harus di-update dari BA. Struktur tiap
// sheet dianggap IDENTIK dengan Master Gardu (MG_COL, kolom Nomor Gardu, kolom U
// sebagai gate), sehingga kolom yang di-update sama persis. updateMasterGarduDariBA
// menerapkan logika yang SAMA (gate tanggal, sisip per-prefix, update kolom,
// koordinat teks) ke tiap target secara berurutan. BA_MASTER_GARDU (di atas) tetap
// dipakai getNomorGarduBerikutnya & syncGarduKeMaster sebagai acuan utama.
var BA_MASTER_TARGETS = [
  { spreadsheetId: '1TEC2iaxEcTCn0IXDZM1kHpAhKyBHuG90SMK48zEkeOw', sheetName: 'Master Gardu' },
  { spreadsheetId: '1mfgj9Izkh3gy9Xf0LkxyIR8tETMwY2RbjQdZ_U4vN6w', sheetName: '1. DATA TRAFO' },
  // Spreadsheet #3 (inspeksi gardu) — struktur BEDA dari Master Gardu. Tahap awal:
  // hanya kolom identitas/trafo yang sama/mirip yang di-update. Tiap target boleh
  // punya: colMap (field -> index kolom 0-based; field di luar colMap TIDAK ditulis),
  // gateCol (index kolom gate "tanggal terakhir", hanya DIBACA), sheetGid (resolusi
  // tab by gid). Section ditulis ke kolom F (PTS/LBS); Box PHB (Q/R/S) tak ada padanan -> tak ditulis.
  {
    spreadsheetId: '1A7SvIoVbLhnn7g1cNaZ2ed38cNDEFLeB3SMHWKY8vm4',
    sheetName: 'INPUT TBL',
    sheetGid: 1401502183,
    gateCol: 17, // R = TANGGAL PENGUKURAN (baca-saja, tidak ditimpa)
    colMap: {
      nomorGardu: 2,       // C GARDU
      alamat: 3,           // D ALAMAT
      penyulang: 4,        // E PENYULANG
      section: 5,          // F PTS/LBS (Section dari Master Gardu)
      lat: 8,              // I KOORDINAT X
      lng: 9,              // J KOORDINAT Y
      konstruksi: 10,      // K JENIS GARDU
      merkTrafo: 11,       // L MERK
      dayaKva: 12,         // M KAPASITAS (kVA)
      nomorSeriTrafo: 13,  // N NO SERI
      tahunTrafo: 14,      // O TAHUN TRAFO
      jurusanTerpasang: 19 // T JURUSAN TR TERPASANG
    }
  }
];
// Kode gardu yang sah. Prefix di luar daftar ini ditolak (cegah salah ketik).
var BA_KODE_GARDU = ['TB','PY','TL','PG'];
var BA_GARDU_DIGITS = 4; // angka nomor gardu selalu 4 digit
// Alias header kolom nomor gardu (berlaku di Master Gardu maupun Rekap Gardu).
var BA_GARDU_ALIASES = ['Nomor Gardu','No Gardu','Nomor Trafo','Nama Gardu','Nama Trafo','Gardu','Kode Gardu','ID Gardu'];

// Pecah "TB0414" -> { prefix:'TB', num:414 }. Ketat: 2 huruf + digit, tanpa spasi.
function _baParseNomorGardu_(value){
  var text = String(value == null ? '' : value).trim().toUpperCase();
  var m = text.match(/^([A-Z]{2})(\d+)$/);
  if(!m) return null;
  return { prefix:m[1], num:parseInt(m[2],10) };
}

// Susun balik: prefix 2 huruf + angka 4 digit. Mis. ('TB',415) -> 'TB0415'.
function _baFormatNomorGardu_(prefix, num){
  var s = '' + num;
  while(s.length < BA_GARDU_DIGITS) s = '0' + s;
  return prefix + s;
}

// Cari kolom nomor gardu di sheet (scan header ~40 baris pertama).
function _baFindKolomGardu_(values){
  var limit = Math.min(values.length, 40);
  for(var r=0;r<limit;r++){
    var map = {};
    for(var c=0;c<values[r].length;c++){
      var key = _baNormHeader_(values[r][c]);
      if(key && map[key] == null) map[key] = c;
    }
    var idx = _baPickIndex_(map, BA_GARDU_ALIASES);
    if(idx >= 0) return { row:r, col:idx };
  }
  return null;
}

// Buka sheet by nama; toleran beda spasi/underscore/huruf besar-kecil.
// (mis. 'Master Gardu' cocok dengan tab 'Master_Gardu').
function _baResolveSheet_(ss, name){
  var sh = ss.getSheetByName(name);
  if(sh) return sh;
  var target = _baNormHeader_(name);
  var all = ss.getSheets();
  for(var i=0;i<all.length;i++){
    if(_baNormHeader_(all[i].getName()) === target) return all[i];
  }
  return null;
}

// Cari sheet by gid (sheetId angka). Dipakai target yang punya sheetGid supaya
// resolusi tab tidak bergantung nama tab. Return sheet atau null.
function _baSheetByGid_(ss, gid){
  var target = Number(gid);
  if(isNaN(target)) return null;
  var all = ss.getSheets();
  for(var i=0;i<all.length;i++){
    if(all[i].getSheetId() === target) return all[i];
  }
  return null;
}

// Angka tertinggi untuk SATU prefix di satu sheet. Return angka (int) atau -1.
function _baMaxNomorGardu_(spreadsheetId, sheetName, prefix){
  try{
    var ss = SpreadsheetApp.openById(spreadsheetId);
    var sh = _baResolveSheet_(ss, sheetName);
    if(!sh) return -1;
    var values = sh.getDataRange().getValues();
    if(!values.length) return -1;
    var found = _baFindKolomGardu_(values);
    if(!found) return -1;
    var max = -1;
    for(var r=found.row+1;r<values.length;r++){
      var parsed = _baParseNomorGardu_(_baCell_(values[r], found.col));
      if(!parsed || parsed.prefix !== prefix) continue; // hanya prefix yang diminta
      if(parsed.num > max) max = parsed.num;
    }
    return max;
  }catch(e){
    return -1;
  }
}

/* Dipanggil frontend saat "Pengoperasian Gardu" dipilih + kode gardu ditentukan. */
function getNomorGarduBerikutnya(kodeGardu){
  try{
    var kode = String(kodeGardu || '').trim().toUpperCase();
    if(!kode) return { ok:false, message:'Kode gardu wajib dipilih (TB / PY / TL / PG).' };
    if(BA_KODE_GARDU.indexOf(kode) === -1){
      return { ok:false, message:'Kode gardu "'+kode+'" tidak dikenal. Pilih salah satu: '+BA_KODE_GARDU.join(', ')+'.' };
    }

    // Nomor tertinggi untuk prefix ini di masing-masing sumber.
    var maxMaster = _baMaxNomorGardu_(BA_MASTER_GARDU.spreadsheetId, BA_MASTER_GARDU.sheetName, kode);
    var maxRekap  = _baMaxNomorGardu_(BA_SOURCE.spreadsheetId, BA_SOURCE.sheetName, kode);

    var terakhir = maxMaster;                          // acuan utama: Master Gardu
    var sumber = maxMaster >= 0 ? 'Master Gardu' : '';
    if(maxRekap > terakhir){ terakhir = maxRekap; sumber = 'Rekap Gardu'; } // Rekap bila lebih tinggi

    // Deret kosong -> mulai dari 0001 (terakhir === -1 berarti belum ada data).
    var nextNum = (terakhir < 0 ? 0 : terakhir) + 1;
    var nomorGardu    = _baFormatNomorGardu_(kode, nextNum);
    var nomorTerakhir = terakhir < 0 ? '' : _baFormatNomorGardu_(kode, terakhir);

    return {
      ok:true,
      kodeGardu: kode,
      nomorGardu: nomorGardu,            // otomatis diisi ke form, mis. TB0415
      nomorGarduTerakhir: nomorTerakhir, // nomor terakhir kode ini ('' bila belum ada)
      sumber: (sumber || 'Baru')         // 'Master Gardu' | 'Rekap Gardu' | 'Baru'
    };
  }catch(error){
    return { ok:false, message:'Gagal mengambil nomor gardu berikutnya: ' + error.message };
  }
}
/* =========================================================
   Sync SATU gardu (baris terpilih di Pencarian) ke Master Gardu.
   Aturan:
     - Cocokkan baris via kolom "Index" pada data BA = nomor baris (1-based) di Master Gardu.
     - Update HANYA bila Tanggal Pekerjaan BA > tanggal di Master Gardu.
     - Bila Index kosong/tidak ada -> tambah baris baru.
   Nilai ditulis ke kolom Master Gardu yang namanya SAMA dengan header data BA
   (dicocokkan lewat _baNormHeader_).
   request = { nomorGardu (opsional), detail:{ Index:<no baris MG>, <Header BA>:<nilai>, ... } }
   Return { ok, action:'update'|'insert'|'skip', message }.
   ========================================================= */
var BA_MG_TANGGAL_ALIASES = ['Tanggal Pekerjaan','Tgl Pekerjaan','Tanggal','Tanggal Update','Tgl Update','Tgl'];
var BA_MG_INDEX_ALIASES = ['Index','Index Master','Index Gardu','Index MG','Nomor Baris Master','Baris Master','No Baris Master','Row Master'];

function _baDetailPick_(detail, aliases){
  if(!detail) return '';
  var norm = {};
  Object.keys(detail).forEach(function(k){ var nk=_baNormHeader_(k); if(nk && norm[nk]==null) norm[nk]=detail[k]; });
  for(var i=0;i<aliases.length;i++){
    var v = norm[_baNormHeader_(aliases[i])];
    if(v!=null && String(v).trim()!=='') return v;
  }
  return '';
}

function syncGarduKeMaster(request){
  try{
    request = request || {};
    var nomorGardu = String(request.nomorGardu || '').trim();
    var detail = request.detail || {};

    // Baris tujuan di Master Gardu ditentukan oleh kolom "Index" pada data BA.
    var indexRaw = _baDetailPick_(detail, BA_MG_INDEX_ALIASES);
    var indexNum = parseInt(String(indexRaw).replace(/[^0-9-]/g,''), 10);
    var punyaIndex = !isNaN(indexNum) && indexNum > 0;

    var tglPekerjaanBA = _baDate_(_baDetailPick_(detail, BA_MG_TANGGAL_ALIASES));
    if(!tglPekerjaanBA) return { ok:false, message:'Tanggal Pekerjaan BA tidak ditemukan pada data baris ini.' };

    var ss = SpreadsheetApp.openById(BA_MASTER_GARDU.spreadsheetId);
    var sh = _baResolveSheet_(ss, BA_MASTER_GARDU.sheetName);
    if(!sh) return { ok:false, message:'Sheet Master Gardu tidak ditemukan.' };
    var values = sh.getDataRange().getValues();
    var found = _baFindKolomGardu_(values);
    if(!found) return { ok:false, message:'Kolom Nomor Gardu di Master Gardu tidak dikenali.' };

    var headers = values[found.row] || [];
    var mgHeaderIdx = {};
    for(var c=0;c<headers.length;c++){ var hk=_baNormHeader_(headers[c]); if(hk && mgHeaderIdx[hk]==null) mgHeaderIdx[hk]=c; }
    var mgTglCol = _baPickIndex_(mgHeaderIdx, BA_MG_TANGGAL_ALIASES);

    function bangunNilai(){
      var out = [];
      Object.keys(detail).forEach(function(k){
        var col = mgHeaderIdx[_baNormHeader_(k)];
        if(col == null) return;
        out.push([col, detail[k]]);
      });
      if(nomorGardu) out.push([found.col, nomorGardu]);
      return out;
    }

    var targetRow = -1;
    if(punyaIndex){
      var arrIdx = indexNum - 1; // "Index" = nomor baris absolut (1-based) di Master Gardu
      if(arrIdx <= found.row || arrIdx >= values.length){
        return { ok:false, message:'Index baris '+indexNum+' di luar jangkauan Master Gardu (baris data '+(found.row+2)+'..'+values.length+').' };
      }
      targetRow = arrIdx;
    }

    if(targetRow < 0){
      var newRow = [];
      for(var i=0;i<headers.length;i++) newRow.push('');
      bangunNilai().forEach(function(pair){ if(pair[0] < newRow.length) newRow[pair[0]] = pair[1]; });
      sh.appendRow(newRow);
      SpreadsheetApp.flush();
      return { ok:true, action:'insert', message:'Tidak ada Index tujuan — baris baru ditambahkan ke Master Gardu (Tanggal Pekerjaan '+tglPekerjaanBA+').' };
    }

    var tglMaster = mgTglCol>=0 ? _baDate_(_baCell_(values[targetRow], mgTglCol)) : '';
    if(tglMaster && tglPekerjaanBA <= tglMaster){
      return { ok:true, action:'skip', message:'Dilewati: Tanggal Pekerjaan BA ('+tglPekerjaanBA+') tidak lebih baru dari Master Gardu ('+tglMaster+').' };
    }

    var sheetRow = targetRow + 1;
    bangunNilai().forEach(function(pair){ sh.getRange(sheetRow, pair[0]+1).setValue(pair[1]); });
    SpreadsheetApp.flush();
    return { ok:true, action:'update', message:'Master Gardu baris '+sheetRow+(nomorGardu?(' ('+nomorGardu+')'):'')+' diperbarui'+(tglMaster?(' ('+tglMaster+' → '+tglPekerjaanBA+')'):(' (Tanggal Pekerjaan '+tglPekerjaanBA+')'))+'.' };
  }catch(error){
    return { ok:false, message:'Sync Master Gardu gagal: '+error.message };
  }
}

/* =========================================================
   UPDATE MASTER GARDU DARI BA (tombol per-BA di Pencarian Data)
   Logika: perbarui identitas gardu di Master_Gardu dari SATU baris BA,
   HANYA bila Tanggal BA > tanggal di Master Gardu (kolom U = Tanggal
   Pengukuran, 0-based index 20). Cocokkan baris via Nomor Gardu
   (BA kolom B = Master_Gardu kolom C).
   Jenis pekerjaan yang boleh update: Pengoperasian & Penggantian Trafo.
   Bila Nomor Gardu BELUM ADA di Master Gardu: khusus Pengoperasian Trafo
   -> TAMBAH baris baru; Penggantian tetap ditolak (butuh baris eksisting).
   Untuk Penggantian Trafo, data trafo diambil dari "Trafo Sesudah"
   (BA AK/AL/AM/AN) & PHB-TR Sesudah (AT/AS/AU); selain itu dari kolom awal.
   Kolom U (Tanggal Pengukuran) dipakai sebagai ACUAN gate saja dan TIDAK
   ditulis ulang, supaya Tanggal Pengukuran modul Inspeksi Gardu tidak tertimpa.
   Frontend memanggil via google.script.run.updateMasterGarduDariBA(idBA).
   Return { ok, action:'update'|'skip', message, nomorGardu, tanggalBA }.
   ========================================================= */
/* =========================================================
   GUARD & NORMALISASI KOORDINAT
   Dipakai semua jalur input koordinat (simpan BA, edit BA, update Master).
   - Perbaiki format otomatis: koma desimal -> titik, buang simbol derajat &
     huruf arah (N/S/E/W, LU/LS/BT/BB), pisah bila satu sel berisi "lat long".
   - Tukar otomatis bila Lat/Long tampak tertukar.
   - Guard wilayah Kepulauan Bangka Belitung: Lat -4.2..-0.8, Long 104.8..109.5.
     Di luar itu / tak terbaca -> ok:false; pemanggil mengosongkan koordinat.
   Return { ok, lat, lng, gabung, pesan }.
   ========================================================= */
var BA_KOORDINAT_BATAS = { latMin:-4.2, latMax:-0.8, lngMin:104.8, lngMax:109.5 };

// Bersihkan satu nilai (Lat atau Long) menjadi angka desimal bertitik.
// Arah Selatan/Barat (S/W) -> nilai negatif. Kembalikan '' bila tak terbaca.
function _baAngkaKoordinat_(value){
  var s = String(value == null ? '' : value).trim();
  if(!s) return '';
  var adaMinus     = s.indexOf('-') >= 0;
  var arahNegatif  = /[SW]/i.test(s);   // Selatan / West -> negatif
  s = s.replace(/,/g, '.');             // koma desimal -> titik
  var m = s.match(/-?\d+(?:\.\d+)?/);   // ambil angka pertama
  if(!m) return '';
  var num = parseFloat(m[0]);
  if(isNaN(num)) return '';
  if((adaMinus || arahNegatif) && num > 0) num = -num;
  return num;
}

function _baNormalisasiKoordinat_(latRaw, longRaw){
  var latStr = String(latRaw == null ? '' : latRaw).trim();
  var lngStr = String(longRaw == null ? '' : longRaw).trim();

  // Bila Long kosong tapi Lat berisi dua angka (mis. "-3.12, 106.45" atau
  // "-3.12 106.45"), pisahkan jadi Lat & Long dulu.
  if(!lngStr && latStr){
    var bag = latStr.split(/\s*[,;]\s*/);
    if(bag.length < 2) bag = latStr.split(/\s+/);
    if(bag.length >= 2){ latStr = bag[0]; lngStr = bag.slice(1).join(' '); }
  }

  var lat = _baAngkaKoordinat_(latStr);
  var lng = _baAngkaKoordinat_(lngStr);
  if(lat === '' || lng === ''){
    return { ok:false, lat:'', lng:'', gabung:'', pesan:'Koordinat tidak lengkap / tidak terbaca (butuh Lat dan Long).' };
  }

  var B = BA_KOORDINAT_BATAS;
  function _dlm(la, ln){ return la>=B.latMin && la<=B.latMax && ln>=B.lngMin && ln<=B.lngMax; }

  // Auto-tukar bila tampak tertukar (Lat berisi nilai Long & sebaliknya).
  if(!_dlm(lat, lng) && _dlm(lng, lat)){ var t=lat; lat=lng; lng=t; }

  if(!_dlm(lat, lng)){
    return { ok:false, lat:lat, lng:lng, gabung:'',
      pesan:'Koordinat ('+lat+', '+lng+') di luar wilayah Kepulauan Bangka Belitung (Lat '+B.latMin+'..'+B.latMax+', Long '+B.lngMin+'..'+B.lngMax+').' };
  }
  return { ok:true, lat:lat, lng:lng, gabung:lat+', '+lng, pesan:'' };
}

// Kolom Master_Gardu (0-based, absolut) — samakan dgn COL_GARDU di Tek-InsDu.gs.
var MG_COL = {
  nomorGardu:2, alamat:3, penyulang:4, section:5, lat:8, lng:9,
  konstruksi:10, merkTrafo:11, dayaKva:12, nomorSeriTrafo:13, tahunTrafo:14,
  merkBox:16, nomorSeriBox:17, tahunBox:18, tglPengukuran:20, jurusanTerpasang:23
};

function updateMasterGarduDariBA(idBA){
  try{
    var target = String(idBA || '').trim();
    if(!target) return { ok:false, message:'idBA wajib diisi.' };

    // 1) Baca baris BA dari Rekap Gardu.
    var ssBA = SpreadsheetApp.openById(BA_SOURCE.spreadsheetId);
    var shBA = ssBA.getSheetByName(BA_SOURCE.sheetName);
    if(!shBA) return { ok:false, message:'Sheet Rekap Gardu tidak ditemukan.' };
    var baValues = shBA.getDataRange().getValues();
    var foundBA = _baFindHeader_(baValues);
    if(!foundBA) return { ok:false, message:'Header Rekap Gardu belum dikenali.' };
    // Cari baris BA langsung dari data yang sudah dibaca (hindari baca ulang seluruh sheet).
    var idxNomorBA = _baPickIndex_(foundBA.map, ['idBA','ID BA','Nomor BA','No BA','NO BA Full']);
    if(idxNomorBA < 0) return { ok:false, message:'Kolom idBA / Nomor BA di Rekap Gardu tidak ditemukan.' };
    var keyBA = target.toLowerCase();
    var rowBA = -1;
    for(var rb=foundBA.row+1; rb<baValues.length; rb++){
      if(String(_baText_(baValues[rb], idxNomorBA)).toLowerCase() === keyBA){ rowBA = rb; break; }
    }
    if(rowBA < 0) return { ok:false, message:'Baris BA "'+target+'" tidak ditemukan.' };
    var ba = baValues[rowBA];
    function _b(letter){ return _baText_(ba, _baColLetterToIndex_(letter)); }

    // 2) Jenis pekerjaan harus Pengoperasian atau Penggantian Trafo.
    var jenis = _b('E');
    var jl = jenis.toLowerCase();
    var isPengoperasian = jl.indexOf('pengoperasian') >= 0;
    var isPenggantian   = jl.indexOf('penggantian') >= 0;
    if(!isPengoperasian && !isPenggantian){
      return { ok:true, action:'skip', message:'Dilewati: Jenis Pekerjaan "'+jenis+'" tidak meng-update Master Gardu (hanya Pengoperasian & Penggantian Trafo).' };
    }

    // 3) Nomor Gardu (BA kolom B) & Tanggal BA (via alias).
    var nomorGardu = _b('B');
    if(!nomorGardu) return { ok:false, message:'Nomor Gardu (kolom B) kosong pada baris BA ini.' };
    var idxTglBA = _baPickIndex_(foundBA.map, ['Tanggal BA','Tanggal','Tgl']);
    var tanggalBA = idxTglBA >= 0 ? _baDate_(_baCell_(ba, idxTglBA)) : '';
    if(!tanggalBA) return { ok:false, message:'Tanggal BA tidak ditemukan/kosong pada baris BA ini.' };

    // 4) Susun nilai identitas (BA -> Master) SEKALI — sama untuk semua target.
    //    Trafo dari "sesudah" bila Penggantian.
    var merkTrafo    = isPenggantian ? _b('AL') : _b('G');
    var dayaKva      = isPenggantian ? _b('AK') : _b('F');
    var nomorSeriTr  = isPenggantian ? _b('AM') : _b('H');
    var tahunTrafo   = isPenggantian ? _b('AN') : _b('I');
    var merkBox      = isPenggantian ? (_b('AT') || _b('Z'))  : _b('Z');
    var nomorSeriBox = isPenggantian ? (_b('AS') || _b('Y'))  : _b('Y');
    var tahunBox     = isPenggantian ? (_b('AU') || _b('AA')) : _b('AA');

    // Koordinat: NORMALISASI + GUARD wilayah Bangka Belitung. Format salah (koma
    // desimal, simbol derajat/arah, Lat-Long tertukar) diperbaiki otomatis lalu
    // DIPISAH ke dua kolom: Lat -> MG_COL.lat (kolom I), Long -> MG_COL.lng (kolom J).
    // Bila di luar Bangka Belitung / tak terbaca, koordinat TIDAK diupdate (guard) & dicatat di pesan.
    var koordNorm = _baNormalisasiKoordinat_(_b('Q'), _b('R'));
    var koordinatLat  = koordNorm.ok ? koordNorm.lat : '';
    var koordinatLong = koordNorm.ok ? koordNorm.lng : '';
    var koordinatPeringatan = koordNorm.ok ? '' : koordNorm.pesan;

    // Nilai identitas per FIELD (semantic). Pemetaan field -> kolom dilakukan
    // PER-TARGET di _baTerapkanUpdateMaster_ (pakai tgt.colMap || MG_COL), supaya
    // sheet berstruktur beda (mis. Spreadsheet #3) bisa punya kolom sendiri.
    var fields = {
      alamat:           _b('K'),
      penyulang:        _b('L'),
      section:          _b('M'),
      konstruksi:       _b('J'),
      merkTrafo:        merkTrafo,
      dayaKva:          dayaKva,
      nomorSeriTrafo:   nomorSeriTr,
      tahunTrafo:       tahunTrafo,
      merkBox:          merkBox,
      nomorSeriBox:     nomorSeriBox,
      tahunBox:         tahunBox,
      jurusanTerpasang: _b('S')
    };

    // 5) Terapkan update yang SAMA ke SEMUA spreadsheet target (Master Gardu +
    //    DATA TRAFO, dst). Tiap target diproses independen: gate Tanggal BA,
    //    sisip baris baru per-prefix, update kolom identitas, tulis koordinat teks.
    var ctx = {
      nomorGardu: nomorGardu,
      tanggalBA: tanggalBA,
      isPengoperasian: isPengoperasian,
      fields: fields,
      koordNorm: koordNorm,
      koordinatLat: koordinatLat,
      koordinatLong: koordinatLong
    };
    var hasil = [];
    var adaGagal = false;
    for(var ti=0; ti<BA_MASTER_TARGETS.length; ti++){
      var tgt = BA_MASTER_TARGETS[ti];
      var res;
      try { res = _baTerapkanUpdateMaster_(tgt, ctx); }
      catch(eT){ res = { ok:false, message:'Gagal: '+(eT && eT.message ? eT.message : eT) }; }
      if(!res.ok) adaGagal = true;
      res.sheetName = tgt.sheetName;
      hasil.push(res);
    }
    var pesanGabung = hasil.map(function(rr){
      var ket = rr.message ? rr.message
        : ((rr.action === 'insert' ? ('baris '+rr.baris+' ditambahkan (gardu baru)')
            : ('baris '+rr.baris+' diperbarui'))
           + (rr.jumlahFieldDiubah != null ? (', '+rr.jumlahFieldDiubah+' field') : ''));
      return '• '+rr.sheetName+': '+ket;
    });
    var utama = hasil[0] || {};

    return {
      ok: !adaGagal,
      action: utama.action || 'update',
      nomorGardu: nomorGardu,
      tanggalBA: tanggalBA,
      baris: utama.baris,
      hasil: hasil,
      message: 'Nomor Gardu '+nomorGardu+' (Tanggal BA '+tanggalBA+'):\n' + pesanGabung.join('\n')
        + (koordinatPeringatan ? ('\nCatatan koordinat: '+koordinatPeringatan) : '')
    };
  }catch(error){
    return { ok:false, message:'Gagal update Master Gardu dari BA: '+error.message };
  }
}

/* Terapkan logika update ke SATU spreadsheet Master (dipanggil berulang untuk
   tiap target di BA_MASTER_TARGETS). Struktur sheet dianggap IDENTIK dengan Master
   Gardu: MG_COL (0-based absolut), kolom Nomor Gardu via _baFindKolomGardu_, kolom
   U (tglPengukuran) sebagai gate & TIDAK ditulis ulang. Baris baru disisip fisik
   berkelanjutan per-prefix; koordinat ditulis sebagai teks (presisi penuh, titik).
   ctx = { nomorGardu, tanggalBA, isPengoperasian, updates, koordNorm, koordinatLat, koordinatLong }.
   Return { ok, action:'update'|'insert'|'skip', baris, jumlahFieldDiubah, tglMaster, message }. */
function _baTerapkanUpdateMaster_(tgt, ctx){
  var ssMG = SpreadsheetApp.openById(tgt.spreadsheetId);
  var COL = tgt.colMap || MG_COL;                                        // peta kolom target
  var gateCol = (tgt.gateCol != null) ? tgt.gateCol : COL.tglPengukuran; // gate baca-saja
  var shMG = (tgt.sheetGid != null) ? _baSheetByGid_(ssMG, tgt.sheetGid) : null;
  if(!shMG) shMG = _baResolveSheet_(ssMG, tgt.sheetName);
  if(!shMG) return { ok:false, message:'Sheet "'+tgt.sheetName+'" tidak ditemukan.' };
  var mgLastRow = shMG.getLastRow();
  var mgLastCol = shMG.getLastColumn();
  if(mgLastRow < 1 || mgLastCol < 1) return { ok:false, message:'"'+tgt.sheetName+'" kosong.' };
  var sampleRows = Math.min(mgLastRow, 40);
  var mgSample = shMG.getRange(1, 1, sampleRows, mgLastCol).getValues();
  var foundMG = _baFindKolomGardu_(mgSample);
  if(!foundMG) return { ok:false, message:'Kolom Nomor Gardu di "'+tgt.sheetName+'" tidak dikenali.' };
  var colNomorMG = foundMG.col; // umumnya kolom C (index 2)
  var nomorColValues = shMG.getRange(1, colNomorMG + 1, mgLastRow, 1).getValues();
  var keyNomor = ctx.nomorGardu.trim().toLowerCase();
  var targetRow = -1;
  for(var r=foundMG.row+1;r<nomorColValues.length;r++){
    if(String(nomorColValues[r][0]||'').trim().toLowerCase() === keyNomor){ targetRow = r; break; }
  }

  // Baris eksisting vs baru + gate Tanggal BA (kolom U = Tanggal Pengukuran).
  var barisBaru = false;
  var tglMaster = '';
  if(targetRow >= 0){
    tglMaster = _baDate_(shMG.getRange(targetRow + 1, gateCol + 1).getValue());
    if(tglMaster && ctx.tanggalBA <= tglMaster){
      return { ok:true, action:'skip', tglMaster:tglMaster,
        message:'Dilewati: Tanggal BA ('+ctx.tanggalBA+') tidak lebih baru ('+tglMaster+').' };
    }
  } else {
    if(!ctx.isPengoperasian){
      return { ok:false, message:'Nomor Gardu "'+ctx.nomorGardu+'" belum ada. Tambahkan dulu barisnya sebelum update (khusus BA Penggantian).' };
    }
    barisBaru = true;
  }

  // Baris baru DISISIPKAN FISIK BERKELANJUTAN PER PREFIX (di bawah Nomor Gardu
  // terakhir berprefix sama; bila prefix belum ada, di bawah baris data terakhir).
  // Kolom berformula DISALIN dari baris acuan; sel non-formula tidak disalin.
  var sheetRow;
  if(barisBaru){
    var prefixBaru = (_baParseNomorGardu_(ctx.nomorGardu) || {}).prefix || '';
    var lastPrefixRow = -1;          // 0-based, baris terakhir berprefix sama
    var lastDataRow0  = foundMG.row; // 0-based, baris data terakhir (fallback)
    for(var rr=foundMG.row+1; rr<nomorColValues.length; rr++){
      var nomorRr = String(nomorColValues[rr][0]||'').trim();
      if(nomorRr === '') continue;
      lastDataRow0 = rr;
      var parsedRr = _baParseNomorGardu_(nomorRr);
      if(parsedRr && parsedRr.prefix === prefixBaru) lastPrefixRow = rr;
    }
    var sumberRow0 = (lastPrefixRow >= 0) ? lastPrefixRow : lastDataRow0; // 0-based acuan
    var sumberSheetRow = sumberRow0 + 1; // 1-based baris acuan (sumber formula)
    shMG.insertRowsAfter(sumberSheetRow, 1); // sisip fisik -> baris di bawahnya bergeser turun
    sheetRow = sumberSheetRow + 1;           // 1-based baris baru hasil sisip
    var formulaBaris = shMG.getRange(sumberSheetRow, 1, 1, mgLastCol).getFormulas()[0];
    for(var ci=0; ci<formulaBaris.length; ci++){
      if(formulaBaris[ci]){
        shMG.getRange(sumberSheetRow, ci+1).copyTo(shMG.getRange(sheetRow, ci+1));
      }
    }
    shMG.getRange(sheetRow, COL.nomorGardu + 1).setValue(ctx.nomorGardu);
  } else {
    sheetRow = targetRow + 1; // 1-based
  }

  // Tulis field identitas ke kolom sesuai peta target (COL). Field yang TIDAK
  // ada di COL (mis. section / box PHB pada Spreadsheet #3) dilewati. Kolom gate
  // tidak pernah termasuk daftar field sehingga tidak ikut tertimpa.
  var FIELD_ORDER = ['alamat','penyulang','section','konstruksi','merkTrafo',
    'dayaKva','nomorSeriTrafo','tahunTrafo','merkBox','nomorSeriBox','tahunBox',
    'jurusanTerpasang'];
  var diubah = [];
  FIELD_ORDER.forEach(function(f){
    if(COL[f] == null) return;
    var val = ctx.fields[f];
    if(val == null || String(val).trim() === '') return;
    shMG.getRange(sheetRow, COL[f]+1).setValue(val);
    diubah.push(COL[f]);
  });

  // Koordinat ditulis sebagai TEKS (format '@'), pemisah desimal TITIK, presisi
  // penuh, dipisah ke kolom Lat (I) & Long (J). Hanya bila koordinat valid.
  if(ctx.koordNorm.ok && COL.lat != null && COL.lng != null){
    var rngLat = shMG.getRange(sheetRow, COL.lat+1);
    rngLat.setNumberFormat('@');
    rngLat.setValue(String(ctx.koordinatLat));
    var rngLng = shMG.getRange(sheetRow, COL.lng+1);
    rngLng.setNumberFormat('@');
    rngLng.setValue(String(ctx.koordinatLong));
    diubah.push(COL.lat, COL.lng);
  }

  // Kolom U (Tanggal Pengukuran) TIDAK ditulis ulang (gate saja).
  SpreadsheetApp.flush();
  return { ok:true, action:(barisBaru ? 'insert' : 'update'), baris:sheetRow, jumlahFieldDiubah:diubah.length, tglMaster:tglMaster };
}

/* =========================================================
   PDF BA Pengoperasian — jembatan ke Cloud Run
   Flow: generatePdfBaPengoperasian(nomorBA)
     → set Status=Proses di Rekap Gardu
     → POST Cloud Run /ba/pengoperasian
     → tulis balik Link PDF, File ID, Status, Waktu Selesai
   Script properties (opsional):
     BA_PDF_ENGINE_URL, BA_PDF_SECRET
   ========================================================= */
var BA_PDF_ENGINE = {
  url: PropertiesService.getScriptProperties().getProperty('BA_PDF_ENGINE_URL')
       || 'https://ba-pdf-engine-1011716929576.asia-southeast2.run.app',
  secret: PropertiesService.getScriptProperties().getProperty('BA_PDF_SECRET')
       || PropertiesService.getScriptProperties().getProperty('PDF_ENGINE_SECRET') || ''
};

// Alias kolom hasil PDF di Rekap Gardu. Dibuat otomatis bila belum ada.
var BA_HASIL_ALIAS = {
  fileUrl: ['File PDF URL','Link PDF','PDF URL'],
  fileId:  ['File ID','File PDF ID','ID File PDF'],
  status:  ['Status PDF','Status BA'],
  selesai: ['Waktu Selesai','Waktu PDF','Timestamp PDF']
};

function _baNow_(){
  return Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
}

// Cari index kolom by alias; jika tidak ada, buat header baru di kolom terakhir.
function _baPastikanKolom_(sh, found, aliases){
  var index = _baPickIndex_(found.map, aliases);
  if(index >= 0) return index;
  var newCol = found.headers.length;      // 0-based -> kolom berikutnya
  sh.getRange(found.row + 1, newCol + 1).setValue(aliases[0]);
  found.headers.push(aliases[0]);
  found.map[_baNormHeader_(aliases[0])] = newCol;
  return newCol;
}

// Key utama = kolom CI header "idBA". Fallback: NO BA Full (CE), Nomor BA, dll.
function _baCariBarisNomorBA_(sh, found, nomorBA){
  var idxNomor = _baPickIndex_(found.map, ['idBA','ID BA','Nomor BA','No BA','NO BA Full']);
  if(idxNomor < 0) throw new Error('Kolom idBA / Nomor BA tidak ditemukan.');
  var values = sh.getDataRange().getValues();
  var target = String(nomorBA).trim().toLowerCase();
  for(var r = found.row + 1; r < values.length; r++){
    if(String(_baText_(values[r], idxNomor)).toLowerCase() === target) return r; // 0-based
  }
  return -1;
}

function _baTulisHasilPdf_(nomorBA, hasil){
  var ss = SpreadsheetApp.openById(BA_SOURCE.spreadsheetId);
  var sh = ss.getSheetByName(BA_SOURCE.sheetName);
  if(!sh) throw new Error('Sheet Rekap Gardu tidak ditemukan.');
  var values = sh.getDataRange().getValues();
  var found = _baFindHeader_(values);
  if(!found) throw new Error('Header Rekap Gardu belum dikenali.');

  var rowIndex = _baCariBarisNomorBA_(sh, found, nomorBA);
  if(rowIndex < 0) throw new Error('Baris BA ' + nomorBA + ' tidak ditemukan.');

  var cols = {
    fileUrl: _baPastikanKolom_(sh, found, BA_HASIL_ALIAS.fileUrl),
    fileId:  _baPastikanKolom_(sh, found, BA_HASIL_ALIAS.fileId),
    status:  _baPastikanKolom_(sh, found, BA_HASIL_ALIAS.status),
    selesai: _baPastikanKolom_(sh, found, BA_HASIL_ALIAS.selesai)
  };
  var sheetRow = rowIndex + 1;
  if(hasil.fileUrl != null) sh.getRange(sheetRow, cols.fileUrl + 1).setValue(hasil.fileUrl);
  if(hasil.fileId  != null) sh.getRange(sheetRow, cols.fileId  + 1).setValue(hasil.fileId);
  if(hasil.status  != null) sh.getRange(sheetRow, cols.status  + 1).setValue(hasil.status);
  if(hasil.selesai != null) sh.getRange(sheetRow, cols.selesai + 1).setValue(hasil.selesai);
}

// Tulis hasil PDF ke kolom HURUF TETAP (struktur baru, zona aman setelah idBA):
//   CK = File PDF Non-TTD (URL), CL = File ID, CM = Status PDF, CN = Waktu Selesai.
// Baca File ID PDF lama (kolom tetap CL) untuk satu idBA; '' bila tidak ada.
// Dipakai saat generate ulang agar file lama di Drive dapat dihapus engine.
function _baBacaFileIdTetap_(nomorBA){
  try{
    var ss = SpreadsheetApp.openById(BA_SOURCE.spreadsheetId);
    var sh = ss.getSheetByName(BA_SOURCE.sheetName);
    if(!sh) return '';
    var values = sh.getDataRange().getValues();
    var found = _baFindHeader_(values);
    if(!found) return '';
    var rowIndex = _baCariBarisNomorBA_(sh, found, nomorBA);
    if(rowIndex < 0) return '';
    return String(sh.getRange(rowIndex + 1, _baColLetterToIndex_('CL') + 1).getValue() || '').trim();
  }catch(e){ return ''; }
}
function _baTulisHasilPdfTetap_(nomorBA, hasil){
  var ss = SpreadsheetApp.openById(BA_SOURCE.spreadsheetId);
  var sh = ss.getSheetByName(BA_SOURCE.sheetName);
  if(!sh) throw new Error('Sheet Rekap Gardu tidak ditemukan.');
  var values = sh.getDataRange().getValues();
  var found = _baFindHeader_(values);
  if(!found) throw new Error('Header Rekap Gardu belum dikenali.');
  var rowIndex = _baCariBarisNomorBA_(sh, found, nomorBA);
  if(rowIndex < 0) throw new Error('Baris BA ' + nomorBA + ' tidak ditemukan.');
  var sheetRow = rowIndex + 1;
  function _set_(letter, value){
    sh.getRange(sheetRow, _baColLetterToIndex_(letter) + 1).setValue(value);
  }
  if(hasil.fileUrl != null) _set_('CK', hasil.fileUrl); // File PDF Non-TTD
  if(hasil.fileId  != null) _set_('CL', hasil.fileId);  // File ID
  if(hasil.status  != null) _set_('CM', hasil.status);  // Status PDF
  if(hasil.selesai != null) _set_('CN', hasil.selesai); // Waktu Selesai
  SpreadsheetApp.flush();
}

// Ambil Jenis Pekerjaan (kolom E) untuk satu idBA -> menentukan endpoint PDF.
function _baJenisDariIdBA_(nomorBA){
  try{
    var ss = SpreadsheetApp.openById(BA_SOURCE.spreadsheetId);
    var sh = ss.getSheetByName(BA_SOURCE.sheetName);
    if(!sh) return '';
    var values = sh.getDataRange().getValues();
    var found = _baFindHeader_(values);
    if(!found) return '';
    var rowIndex = _baCariBarisNomorBA_(sh, found, nomorBA);
    if(rowIndex < 0) return '';
    return _baText_(values[rowIndex], _baColLetterToIndex_('E'));
  }catch(e){ return ''; }
}

/* Dipanggil dari frontend bagGeneratePdf() setelah BA tersimpan.
   Hasil PDF ditulis ke kolom HURUF TETAP: CK/CL/CM/CN.
   Endpoint dipilih otomatis sesuai Jenis Pekerjaan (Penggantian -> /ba/penggantian). */
function generatePdfBaPengoperasian(nomorBA){
  try{
    if(!nomorBA) return { ok:false, message:'Nomor BA wajib diisi.' };

    try { _baTulisHasilPdfTetap_(nomorBA, { status:'Proses', selesai:'' }); } catch(e){}

    // File ID PDF lama -> dikirim ke engine untuk dihapus saat generate ulang.
    var oldFileId = '';
    try { oldFileId = _baBacaFileIdTetap_(nomorBA); } catch(e){}

    // Tentukan endpoint & jenis param sesuai Jenis Pekerjaan (kolom E) baris BA.
    // Penggantian Trafo -> /ba/penggantian (2 kolom Sebelum/Sesudah + lampiran 6 foto);
    // selain itu -> /ba/pengoperasian (default).
    var jenisRow = (_baJenisDariIdBA_(nomorBA) || '').toLowerCase();
    var endpointPath = '/ba/pengoperasian';
    var jenisParam = 'pengoperasian';
    if(jenisRow.indexOf('penggantian') >= 0){ endpointPath = '/ba/penggantian'; jenisParam = 'penggantian'; }
    else if(jenisRow.indexOf('pemeriksaan') >= 0){ endpointPath = '/ba/pemeriksaan-trafo'; jenisParam = 'pemeriksaan'; }

    // Warm-up: ping endpoint health (/) supaya instance Cloud Run bangun dulu.
    // (min-instances=0 -> instance bisa tidur; request pertama sering 503.)
    try { UrlFetchApp.fetch(BA_PDF_ENGINE.url + '/', { method:'get', muteHttpExceptions:true }); } catch(e){}

    // Panggil engine dengan RETRY: Cloud Run bisa balas 502/503/504/429 saat
    // cold start atau instance belum siap. Coba beberapa kali dengan jeda menaik.
    var response = null, code = 0, data = {}, lastErr = '';
    var maksPercobaan = 3;
    for(var attempt=1; attempt<=maksPercobaan; attempt++){
      try{
        response = UrlFetchApp.fetch(BA_PDF_ENGINE.url + endpointPath, {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({ secret: BA_PDF_ENGINE.secret, jenis:jenisParam, idBA: String(nomorBA), oldFileId: String(oldFileId||'') }),
          muteHttpExceptions: true
        });
        code = response.getResponseCode();
        try { data = JSON.parse(response.getContentText() || '{}'); } catch(e){ data = {}; }
      }catch(err){
        code = 0; data = {}; lastErr = (err && err.message) || String(err);
      }
      // Sukses -> keluar.
      if(code === 200 && data && data.ok) break;
      // Error transient (cold start / overload) -> tunggu lalu coba lagi.
      var transient = (code === 0 || code === 429 || code === 502 || code === 503 || code === 504);
      if(transient && attempt < maksPercobaan){ Utilities.sleep(attempt * 4000); continue; } // 4s, lalu 8s
      break;
    }

    if(code !== 200 || !data || !data.ok){
      try { _baTulisHasilPdfTetap_(nomorBA, { status:'Gagal', selesai:_baNow_() }); } catch(e){}
      var pesan = (data && data.message)
        || (code === 0
          ? ('Tidak dapat menghubungi mesin PDF' + (lastErr ? (': '+lastErr) : '') + '.')
          : ('Cloud Run gagal (HTTP ' + code + ').'
             + ((code===503||code===502||code===504) ? ' Mesin PDF sedang tidak siap/menyala. Coba lagi beberapa saat; bila terus terjadi, periksa deploy & Logs Cloud Run ba-pdf-engine (kemungkinan container gagal start / kurang memori).' : '')));
      return { ok:false, message: pesan };
    }

    var selesai = data.selesai || _baNow_();
    try {
      _baTulisHasilPdfTetap_(nomorBA, {
        fileUrl: data.url || '',
        fileId:  data.fileId || '',
        status:  'Selesai',
        selesai: selesai
      });
    } catch(e){}
    return { ok:true, url:data.url, fileId:data.fileId, selesai:selesai, nomorBA:nomorBA };
  }catch(error){
    return { ok:false, message:'Gagal generate PDF: ' + error.message };
  }
}
function testPdfBa(){
  Logger.log(JSON.stringify(
    generatePdfBaPengoperasian('BA-GRD-TBL-202607-001')
  ));
}


/* =========================================================
   ==============  MODUL BERITA ACARA SWITCHING  ===========
   Digabung dari SIE-Switching-Code.gs. Spreadsheet sama,
   Sheet: Rekap Switching. getPenyulangDanSection() & unduhFileBa()
   dipakai bersama dari bagian atas file (tidak didefinisikan ulang).
   ========================================================= */
var SW_SOURCE = {
  spreadsheetId: '1TEC2iaxEcTCn0IXDZM1kHpAhKyBHuG90SMK48zEkeOw',
  sheetName: 'Rekap Switching',
  maxRows: 500
};
var SW_DRIVE_SOURCE = {
  laporanUlpFolderId: '1lpZAbSVkHjceLJlDEWkiUl27I7O4nmGf',
  beritaAcaraFolderName: 'Berita Acara'
};

var SW_COL = {
  no:'A', tanggalBA:'B', tanggalPekerjaan:'C', jenisPekerjaan:'D',
  jenisSwitching:'E', namaSwitching:'F', penyulang:'G', section:'H',
  merk:'I', tipe:'J', nomorSeri:'K', koordinat:'L',
  fotoNameplate:'M', fotoKonstruksi:'N',
  sldSebelum:'O', sldSesudah:'P',
  jenisSwitchingSesudah:'Q', namaSwitchingSesudah:'R', penyulangSesudah:'S', sectionSesudah:'T',
  merkSesudah:'U', tipeSesudah:'V', nomorSeriSesudah:'W', koordinatSesudah:'X',
  asalSwitching:'Y', fotoNameplateSesudah:'Z', fotoKonstruksiSesudah:'AA',
  keteranganTambahan:'AB', keteranganKerusakan:'AC',
  petugas1:'AD', jabatan1:'AE', petugas2:'AF', jabatan2:'AG', mengetahui:'AH',
  idBA:'AI', noBaFull:'AJ',
  filePdfUrl:'AK', fileId:'AL', statusPdf:'AM', waktuSelesai:'AN', linkBaTtd:'AO'
};

var SW_PHOTO_COLUMN = {
  nameplateAwal:'M', konstruksiAwal:'N',
  sldSebelum:'O', sldSesudah:'P',
  nameplateSesudah:'Z', konstruksiSesudah:'AA'
};

/* ---------------- Helpers Switching ---------------- */
function _swNormHeader_(value){ return String(value==null?'':value).trim().toLowerCase().replace(/[^a-z0-9]/g,''); }
function _swColToIndex_(letter){ var r=0,s=String(letter||'').toUpperCase(); for(var i=0;i<s.length;i++){ r=r*26+(s.charCodeAt(i)-64); } return r-1; }
function _swText_(row,index){ return index>=0&&index<row.length?String(row[index]==null?'':row[index]).trim():''; }
function _swCell_(row,letter){ return _swText_(row,_swColToIndex_(letter)); }
function _swSafeFolderName_(value){ return String(value||'').trim().replace(/[\\/:*?"<>|]/g,'-')||'Tanpa Nama'; }
function _swBulanIndonesia_(month){ return ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][month-1]||''; }
function _swFolder_(parent,name){ var f=parent.getFoldersByName(name); return f.hasNext()?f.next():parent.createFolder(name); }
function _swDate_(value){
  if(!value) return '';
  if(value instanceof Date){ if(isNaN(value.getTime())) return ''; return Utilities.formatDate(value,'Asia/Jakarta','yyyy-MM-dd'); }
  var text=String(value).trim();
  var m=text.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m) return m[1]+'-'+m[2]+'-'+m[3];
  m=text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/); if(m) return m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2);
  var d=new Date(text); return isNaN(d.getTime())?'':Utilities.formatDate(d,'Asia/Jakarta','yyyy-MM-dd');
}
function _swNow_(){ return Utilities.formatDate(new Date(),'Asia/Jakarta','yyyy-MM-dd HH:mm:ss'); }

/* ---------------- Setup sheet ---------------- */
function _swHeaderLabels_(){
  // Urutan header HARUS sinkron SW_COL (huruf tetap A..AO).
  // O/P = SLD Sebelum/Sesudah — jangan di-skip, kalau tidak kolom sesudah bergeser.
  return ['No','Tanggal BA','Tanggal Pekerjaan','Jenis Pekerjaan','Jenis Switching','Nama Switching','Penyulang','Section','Merk','Tipe','Nomor Seri','Koordinat Awal','Foto Nameplate Switching','Foto Konstruksi Switching','SLD Sebelum','SLD Sesudah','Jenis Switching Sesudah','Nama Switching Sesudah','Penyulang Sesudah','Section Sesudah','Merk Switching Sesudah','Tipe Switching Sesudah','Nomor Seri Switching Sesudah','Koordinat Sesudah','Asal Switching','Foto Nameplate Switching Sesudah','Foto Konstruksi Switching Sesudah','Keterangan Tambahan','Keterangan Kerusakan / Pemeriksaan','Petugas 1','Jabatan Petugas 1','Petugas 2','Jabatan Petugas 2','Mengetahui','idBA','NO BA Full','File PDF URL','File ID','Status PDF','Waktu Selesai','Link BA TTD'];
}
function _swEnsureSheet_(ss){
  var sh=ss.getSheetByName(SW_SOURCE.sheetName);
  if(!sh) sh=ss.insertSheet(SW_SOURCE.sheetName);
  var lastCol=Math.max(1,sh.getLastColumn());
  var firstRow=sh.getRange(1,1,1,lastCol).getValues()[0];
  var punyaHeader=false;
  for(var i=0;i<firstRow.length;i++){ if(_swNormHeader_(firstRow[i])==='idba'){ punyaHeader=true; break; } }
  if(!punyaHeader){
    var labels=_swHeaderLabels_();
    sh.getRange(1,1,1,labels.length).setValues([labels]);
    sh.setFrozenRows(1);
  }
  return sh;
}
function setupSheetSwitching(){
  try{
    var ss=SpreadsheetApp.openById(SW_SOURCE.spreadsheetId);
    _swEnsureSheet_(ss);
    return { ok:true, message:'Sheet Rekap Switching siap.' };
  }catch(error){ return { ok:false, message:'Gagal setup sheet: '+error.message }; }
}
function _swFindHeaderRow_(values){
  var limit=Math.min(values.length,15);
  for(var r=0;r<limit;r++){
    for(var c=0;c<values[r].length;c++){
      var key=_swNormHeader_(values[r][c]);
      if(key==='idba'||key==='namaswitching') return r;
    }
  }
  return 0;
}

/* ---------------- Generator nomor ---------------- */
function _swGenIdBA_(values,headerRow,idxIdBA,tanggalBA){
  var m=String(tanggalBA||'').match(/^(\d{4})-(\d{2})-(\d{2})/);
  var now=new Date();
  var year=m?m[1]:Utilities.formatDate(now,'Asia/Jakarta','yyyy');
  var month=m?m[2]:Utilities.formatDate(now,'Asia/Jakarta','MM');
  var prefix='BA-SWT-TBL-'+year+month+'-';
  var maxSeq=0;
  for(var r=headerRow+1;r<values.length;r++){
    var v=String(_swText_(values[r],idxIdBA)||'');
    if(v.indexOf(prefix)===0){ var seq=parseInt(v.substring(prefix.length),10); if(!isNaN(seq)&&seq>maxSeq) maxSeq=seq; }
  }
  return { idBA:prefix+('00'+(maxSeq+1)).slice(-3), year:year, month:month };
}
function _swGenNoFull_(values,headerRow,idxNoFull,year,month){
  var bulan=String(parseInt(month,10));
  var maxSeq=0;
  if(idxNoFull>=0){
    for(var r=headerRow+1;r<values.length;r++){
      var v=String(_swText_(values[r],idxNoFull)||'');
      var mm=v.match(/No\.\s*(\d+)\s*\/\s*BA\s*-\s*SWC\s*\/\s*ULP\s*-\s*TBL\.?\s*\/\s*(\d+)\s*\/\s*(\d+)/i);
      if(mm&&parseInt(mm[2],10)===parseInt(bulan,10)&&String(mm[3])===String(year)){ var seq=parseInt(mm[1],10); if(!isNaN(seq)&&seq>maxSeq) maxSeq=seq; }
    }
  }
  var nnn=('00'+(maxSeq+1)).slice(-3);
  return 'No. '+nnn+' / BA - SWC / ULP - TBL / '+bulan+' / '+year;
}

/* ---------------- Simpan BA Switching ---------------- */
function simpanBeritaAcaraSwitching(payload){
  try{
    payload=payload||{};
    var identitas=payload.identitas||{};
    var awal=payload.awal||{};
    var sesudah=payload.sesudah||{};
    var keterangan=payload.keterangan||{};
    var pemeriksa=payload.pemeriksa||{};
    var foto=payload.foto||{};
    var jenis=String(payload.jenisPekerjaan||'').trim();
    var nama=String(awal.namaSwitching||'').trim();
    var tanggalBA=String(identitas.tanggalBA||'').trim();
    if(!nama) return { ok:false, message:'Nama Switching wajib diisi.' };
    if(!tanggalBA) return { ok:false, message:'Tanggal BA wajib diisi.' };
    if(!jenis) return { ok:false, message:'Jenis Pekerjaan wajib dipilih.' };

    var ss=SpreadsheetApp.openById(SW_SOURCE.spreadsheetId);
    var sh=_swEnsureSheet_(ss);
    var values=sh.getDataRange().getValues();
    var headerRow=_swFindHeaderRow_(values);
    var idxIdBA=_swColToIndex_(SW_COL.idBA);
    var idxNama=_swColToIndex_(SW_COL.namaSwitching);
    var idxNoFull=_swColToIndex_(SW_COL.noBaFull);

    var lastData=headerRow;
    for(var r=headerRow+1;r<values.length;r++){
      var adaId=String(_swText_(values[r],idxIdBA)||'')!=='';
      var adaNama=String(_swText_(values[r],idxNama)||'')!=='';
      if(adaId||adaNama) lastData=r;
    }
    var targetRow=lastData+1;
    var sheetRow=targetRow+1; // 1-based

    var gen=_swGenIdBA_(values,headerRow,idxIdBA,tanggalBA);
    var idBA=gen.idBA;
    var noBaFull=_swGenNoFull_(values,headerRow,idxNoFull,gen.year,gen.month);

    var jl=jenis.toLowerCase();
    var perluSesudah=(jl.indexOf('penggantian')>=0||jl.indexOf('relokasi')>=0);

    function _set_(letter,value){ sh.getRange(sheetRow,_swColToIndex_(letter)+1).setValue(value==null?'':value); }
    function _setText_(letter,value){ var rng=sh.getRange(sheetRow,_swColToIndex_(letter)+1); rng.setNumberFormat('@'); rng.setValue(String(value==null?'':value)); }

    _set_(SW_COL.no, targetRow-headerRow);
    _set_(SW_COL.tanggalBA, tanggalBA);
    _set_(SW_COL.tanggalPekerjaan, String(identitas.tanggalPekerjaan||''));
    _set_(SW_COL.jenisPekerjaan, jenis);
    _set_(SW_COL.jenisSwitching, String(awal.jenisSwitching||''));
    _set_(SW_COL.namaSwitching, nama);
    _set_(SW_COL.penyulang, String(awal.penyulang||''));
    _set_(SW_COL.section, String(awal.section||''));
    _set_(SW_COL.merk, String(awal.merk||''));
    _set_(SW_COL.tipe, String(awal.tipe||''));
    _set_(SW_COL.nomorSeri, String(awal.nomorSeri||''));
    // SLD ditulis lewat loop SW_PHOTO_COLUMN di bawah (slot sldSebelum/sldSesudah),
    // bukan dari awal.sld* (frontend tidak mengirim field teks itu).
    _setText_(SW_COL.koordinat, String(awal.koordinat||''));
    _set_(SW_COL.keteranganTambahan, String(keterangan.tambahan||''));
    _set_(SW_COL.keteranganKerusakan, String(keterangan.kerusakan||''));
    _set_(SW_COL.petugas1, String(pemeriksa.petugas1||''));
    _set_(SW_COL.jabatan1, String(pemeriksa.jabatan1||''));
    _set_(SW_COL.petugas2, String(pemeriksa.petugas2||''));
    _set_(SW_COL.jabatan2, String(pemeriksa.jabatan2||''));
    _set_(SW_COL.mengetahui, String(pemeriksa.mengetahui||''));
    _setText_(SW_COL.idBA, idBA);
    _set_(SW_COL.noBaFull, noBaFull);
    _set_(SW_COL.statusPdf, 'Draft');

    if(perluSesudah){
      _set_(SW_COL.jenisSwitchingSesudah, String(sesudah.jenisSwitching||''));
      _set_(SW_COL.namaSwitchingSesudah, String(sesudah.namaSwitching||''));
      _set_(SW_COL.penyulangSesudah, String(sesudah.penyulang||''));
      _set_(SW_COL.sectionSesudah, String(sesudah.section||''));
      _set_(SW_COL.merkSesudah, String(sesudah.merk||''));
      _set_(SW_COL.tipeSesudah, String(sesudah.tipe||''));
      _set_(SW_COL.nomorSeriSesudah, String(sesudah.nomorSeri||''));
      _setText_(SW_COL.koordinatSesudah, String(sesudah.koordinat||''));
      _set_(SW_COL.asalSwitching, String(sesudah.asalSwitching||''));
    }

    Object.keys(SW_PHOTO_COLUMN).forEach(function(slot){
      var item=foto[slot];
      var url=item&&(item.url||item.fileUrl);
      if(url) sh.getRange(sheetRow,_swColToIndex_(SW_PHOTO_COLUMN[slot])+1).setValue(url);
    });

    SpreadsheetApp.flush();
    var cek=String(sh.getRange(sheetRow,idxIdBA+1).getValue()||'').trim();
    if(cek!==idBA){ return { ok:false, baris:sheetRow, idBA:idBA, message:'BA belum tersimpan: idBA tidak muncul di baris '+sheetRow+'. Cek proteksi/ARRAYFORMULA pada kolom AG.' }; }

    return { ok:true, idBA:idBA, nomorBA:idBA, nomorBAFull:noBaFull, baris:sheetRow };
  }catch(error){
    return { ok:false, message:'Gagal menyimpan BA Switching: '+error.message };
  }
}

/* ---------------- Pencarian data ---------------- */
function getDataSwitching(filter){
  try{
    filter=filter||{};
    var ss=SpreadsheetApp.openById(SW_SOURCE.spreadsheetId);
    var sh=ss.getSheetByName(SW_SOURCE.sheetName);
    if(!sh) return { ok:true, rows:[], total:0 };
    var values=sh.getDataRange().getValues();
    if(!values.length) return { ok:true, rows:[], total:0 };
    var headerRow=_swFindHeaderRow_(values);
    var headers=values[headerRow];
    var kata=String(filter.kataKunci||filter.namaSwitching||'').trim().toLowerCase();
    var dari=_swDate_(filter.tglDari), sampai=_swDate_(filter.tglSampai);
    var jenisFilter=String(filter.jenisPekerjaan||'').trim().toLowerCase();
    var rows=[];
    for(var i=headerRow+1;i<values.length;i++){
      var row=values[i];
      var nama=_swCell_(row,SW_COL.namaSwitching);
      var idBA=_swCell_(row,SW_COL.idBA);
      if(!nama&&!idBA) continue;
      var tanggal=_swDate_(row[_swColToIndex_(SW_COL.tanggalBA)]);
      var jenis=_swCell_(row,SW_COL.jenisPekerjaan);
      if(kata&&nama.toLowerCase().indexOf(kata)===-1) continue;
      if(dari&&(!tanggal||tanggal<dari)) continue;
      if(sampai&&(!tanggal||tanggal>sampai)) continue;
      if(jenisFilter&&jenis.toLowerCase()!==jenisFilter) continue;
      var detail={};
      for(var c=0;c<headers.length;c++){
        var label=String(headers[c]||'').trim();
        var value=row[c];
        if(!label||value===''||value==null) continue;
        detail[label]=value instanceof Date?Utilities.formatDate(value,'Asia/Jakarta','dd/MM/yyyy'):String(value);
      }
      rows.push({
        idBA:idBA, noBaFull:_swCell_(row,SW_COL.noBaFull),
        tanggal:tanggal, jenisPekerjaan:jenis,
        namaSwitching:nama, jenisSwitching:_swCell_(row,SW_COL.jenisSwitching),
        penyulang:_swCell_(row,SW_COL.penyulang), section:_swCell_(row,SW_COL.section),
        merk:_swCell_(row,SW_COL.merk), tipe:_swCell_(row,SW_COL.tipe), nomorSeri:_swCell_(row,SW_COL.nomorSeri),
        sldSebelum:_swCell_(row,SW_COL.sldSebelum), sldSesudah:_swCell_(row,SW_COL.sldSesudah),
        koordinat:_swCell_(row,SW_COL.koordinat),
        filePdfUrl:_swCell_(row,SW_COL.filePdfUrl), fileId:_swCell_(row,SW_COL.fileId),
        baTtd:_swCell_(row,SW_COL.linkBaTtd),
        detail:detail
      });
      if(rows.length>=SW_SOURCE.maxRows) break;
    }
    rows.sort(function(a,b){ return String(b.tanggal||'').localeCompare(String(a.tanggal||'')); });
    return { ok:true, rows:rows, total:rows.length };
  }catch(error){ return { ok:false, message:'Error Switching: '+error.message }; }
}

/* ---------------- Upload foto ---------------- */
function _swPhotoFolder_(tanggalBA,jenisPekerjaan,namaSwitching){
  var m=String(tanggalBA||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) throw new Error('Tanggal BA wajib diisi sebelum mengunggah foto.');
  if(!jenisPekerjaan) throw new Error('Jenis Pekerjaan wajib dipilih sebelum mengunggah foto.');
  if(!namaSwitching) throw new Error('Nama Switching wajib diisi sebelum mengunggah foto.');
  var root=DriveApp.getFolderById(SW_DRIVE_SOURCE.laporanUlpFolderId);
  var folder=_swFolder_(root,SW_DRIVE_SOURCE.beritaAcaraFolderName);
  folder=_swFolder_(folder,'Switching');
  folder=_swFolder_(folder,_swSafeFolderName_(jenisPekerjaan));
  folder=_swFolder_(folder,m[1]);
  folder=_swFolder_(folder,m[2]+'. '+_swBulanIndonesia_(Number(m[2])));
  return _swFolder_(folder,_swSafeFolderName_(namaSwitching));
}
function uploadFotoSwitching(request){
  try{
    request=request||{};
    var slot=String(request.slot||'foto').trim();
    var dataUrl=String(request.dataUrl||'');
    var fileName=String(request.fileName||slot+'.jpg').replace(/[\\/:*?"<>|]/g,'-');
    var mimeType=String(request.mimeType||'image/jpeg');
    if(!/^image\//.test(mimeType)) return { ok:false, message:'File harus berupa gambar.' };
    if(!dataUrl||dataUrl.indexOf(',')<0) return { ok:false, message:'Data gambar tidak valid.' };
    var base64=dataUrl.split(',')[1];
    if(base64.length>7000000) return { ok:false, message:'Ukuran gambar maksimal 5 MB.' };
    var folder=_swPhotoFolder_(request.tanggalBA,request.jenisPekerjaan,request.namaSwitching);
    var timestamp=Utilities.formatDate(new Date(),'Asia/Jakarta','yyyyMMdd_HHmmss');
    var blob=Utilities.newBlob(Utilities.base64Decode(base64),mimeType,slot+'_'+timestamp+'_'+fileName);
    var file=folder.createFile(blob);
    return { ok:true, slot:slot, url:file.getUrl(), fileId:file.getId(), folderId:folder.getId(), sheetColumn:SW_PHOTO_COLUMN[slot]||'' };
  }catch(error){ return { ok:false, message:'Upload foto gagal: '+error.message }; }
}

/* ---------------- Jembatan PDF (Cloud Run /ba/switching) ----------------
   Engine PDF menyusul pada tahap berikutnya. Fungsi ini sudah siap memanggil
   endpoint /ba/switching begitu engine di-deploy. Reuse Script properties
   BA_PDF_ENGINE_URL & BA_PDF_SECRET yang sama dengan ba-pdf-engine. */
var SW_PDF_ENGINE = {
  url: PropertiesService.getScriptProperties().getProperty('BA_PDF_ENGINE_URL')
       || 'https://ba-pdf-engine-1011716929576.asia-southeast2.run.app',
  secret: PropertiesService.getScriptProperties().getProperty('BA_PDF_SECRET')
       || PropertiesService.getScriptProperties().getProperty('PDF_ENGINE_SECRET') || ''
};
function _swCariBaris_(sh,idBA){
  var values=sh.getDataRange().getValues();
  var headerRow=_swFindHeaderRow_(values);
  var idx=_swColToIndex_(SW_COL.idBA);
  var target=String(idBA).trim().toLowerCase();
  for(var r=headerRow+1;r<values.length;r++){ if(String(_swText_(values[r],idx)).toLowerCase()===target) return r; }
  return -1;
}
function _swTulisHasil_(idBA,hasil){
  var ss=SpreadsheetApp.openById(SW_SOURCE.spreadsheetId);
  var sh=ss.getSheetByName(SW_SOURCE.sheetName);
  if(!sh) return;
  var rowIndex=_swCariBaris_(sh,idBA);
  if(rowIndex<0) return;
  var sheetRow=rowIndex+1;
  function _set_(letter,value){ sh.getRange(sheetRow,_swColToIndex_(letter)+1).setValue(value); }
  if(hasil.fileUrl!=null) _set_(SW_COL.filePdfUrl,hasil.fileUrl);
  if(hasil.fileId!=null) _set_(SW_COL.fileId,hasil.fileId);
  if(hasil.status!=null) _set_(SW_COL.statusPdf,hasil.status);
  if(hasil.selesai!=null) _set_(SW_COL.waktuSelesai,hasil.selesai);
  SpreadsheetApp.flush();
}
// Baca File ID PDF lama (kolom SW_COL.fileId) untuk satu idBA switching.
function _swBacaFileId_(idBA){
  try{
    var ss=SpreadsheetApp.openById(SW_SOURCE.spreadsheetId);
    var sh=ss.getSheetByName(SW_SOURCE.sheetName);
    if(!sh) return '';
    var rowIndex=_swCariBaris_(sh,idBA);
    if(rowIndex<0) return '';
    var values=sh.getDataRange().getValues();
    return String(_swCell_(values[rowIndex], SW_COL.fileId)||'').trim();
  }catch(e){ return ''; }
}
function generatePdfBaSwitching(idBA){
  try{
    if(!idBA) return { ok:false, message:'Nomor BA wajib diisi.' };
    try{ _swTulisHasil_(idBA,{ status:'Proses', selesai:'' }); }catch(e){}
    // File ID PDF lama -> dikirim ke engine untuk dihapus saat generate ulang.
    var oldFileId='';
    try{ oldFileId=_swBacaFileId_(idBA); }catch(e){}
    try{ UrlFetchApp.fetch(SW_PDF_ENGINE.url+'/',{ method:'get', muteHttpExceptions:true }); }catch(e){}
    var response=null, code=0, data={}, lastErr='';
    for(var attempt=1;attempt<=3;attempt++){
      try{
        response=UrlFetchApp.fetch(SW_PDF_ENGINE.url+'/ba/switching',{
          method:'post', contentType:'application/json',
          payload:JSON.stringify({ secret:SW_PDF_ENGINE.secret, jenis:'switching', idBA:String(idBA), oldFileId:String(oldFileId||'') }),
          muteHttpExceptions:true
        });
        code=response.getResponseCode();
        try{ data=JSON.parse(response.getContentText()||'{}'); }catch(e){ data={}; }
      }catch(err){ code=0; data={}; lastErr=(err&&err.message)||String(err); }
      if(code===200&&data&&data.ok) break;
      var transient=(code===0||code===429||code===502||code===503||code===504);
      if(transient&&attempt<3){ Utilities.sleep(attempt*4000); continue; }
      break;
    }
    if(code!==200||!data||!data.ok){
      try{ _swTulisHasil_(idBA,{ status:'Gagal', selesai:_swNow_() }); }catch(e){}
      var pesan=(data&&data.message)
        || (code===0
          ? ('Tidak dapat menghubungi mesin PDF'+(lastErr?(': '+lastErr):'')+'. Endpoint /ba/switching mungkin belum tersedia.')
          : ('Cloud Run gagal (HTTP '+code+'). Endpoint /ba/switching mungkin belum di-deploy.'));
      return { ok:false, message:pesan };
    }
    var selesai=data.selesai||_swNow_();
    try{ _swTulisHasil_(idBA,{ fileUrl:data.url||'', fileId:data.fileId||'', status:'Selesai', selesai:selesai }); }catch(e){}
    return { ok:true, url:data.url, fileId:data.fileId, selesai:selesai, idBA:idBA };
  }catch(error){ return { ok:false, message:'Gagal generate PDF: '+error.message }; }
}

/* =========================================================
   ==========  MODUL BA PEMERIKSAAN TRAFO  =================
   Sheet SAMA dengan BA lain: Rekap Gardu. Jenis Pekerjaan =
   "Pemeriksaan Trafo". Penomoran idBA & NO BA Full memakai
   generator yang sama (BA-GRD-TBL-<YYYYMM>-<NNN>).
   Kolom khusus pemeriksaan (grup "Kesimpulan (Hanya Untuk
   Pemeriksaan Trafo)") memakai kolom LINK FOTO MEGGER:
     BF megger1 | BI megger2 | BL megger3
     BO megger4 | BR megger5 | BU megger6
     BX Kesimpulan | BY Catatan
   Foto yang TIDAK diisi tidak dikirim ke PDF (lampiran
   menyesuaikan jumlah foto yang ada: 1 foto = 1 kotak).
   Data awal trafo di-prefill dari Master Gardu lewat
   getDataTrafoMaster(nomorGardu).
   ========================================================= */
var BA_PRK_JENIS = 'Pemeriksaan Trafo';
var BA_PRK_FOTO_COLUMN = {
  megger1:'BF', megger2:'BI', megger3:'BL',
  megger4:'BO', megger5:'BR', megger6:'BU'
};
var BA_PRK_KESIMPULAN_COL = 'BX';
var BA_PRK_CATATAN_COL = 'BY';

/* Prefill data trafo dari Master Gardu (dipakai form BA Pemeriksaan Trafo).
   Return { ok, found, nomorGardu, alamat, penyulang, section, konstruksi,
   merk, kapasitas, nomorSeri, tahun, koordinatX, koordinatY, phbMerk,
   phbSeri, phbTahun, jurusanTerpasang }. */
function getDataTrafoMaster(nomorGardu){
  try{
    var kunci = String(nomorGardu || '').trim().toLowerCase();
    if(!kunci) return { ok:false, message:'Nomor Gardu wajib diisi.' };
    var ss = SpreadsheetApp.openById(BA_MASTER_GARDU.spreadsheetId);
    var sh = _baResolveSheet_(ss, BA_MASTER_GARDU.sheetName);
    if(!sh) return { ok:false, message:'Sheet Master Gardu tidak ditemukan.' };
    var values = sh.getDataRange().getValues();
    var found = _baFindKolomGardu_(values);
    if(!found) return { ok:false, message:'Kolom Nomor Gardu di Master Gardu tidak dikenali.' };
    for(var r=found.row+1;r<values.length;r++){
      if(String(values[r][found.col] == null ? '' : values[r][found.col]).trim().toLowerCase() !== kunci) continue;
      var row = values[r];
      function _m(idx){ return String(row[idx] == null ? '' : row[idx]).trim(); }
      return {
        ok:true, found:true, baris:r+1,
        nomorGardu:       _m(MG_COL.nomorGardu),
        alamat:           _m(MG_COL.alamat),
        penyulang:        _m(MG_COL.penyulang),
        section:          _m(MG_COL.section),
        konstruksi:       _m(MG_COL.konstruksi),
        merk:             _m(MG_COL.merkTrafo),
        kapasitas:        _m(MG_COL.dayaKva),
        nomorSeri:        _m(MG_COL.nomorSeriTrafo),
        tahun:            _m(MG_COL.tahunTrafo),
        koordinatX:       _m(MG_COL.lat),
        koordinatY:       _m(MG_COL.lng),
        phbMerk:          _m(MG_COL.merkBox),
        phbSeri:          _m(MG_COL.nomorSeriBox),
        phbTahun:         _m(MG_COL.tahunBox),
        jurusanTerpasang: _m(MG_COL.jurusanTerpasang)
      };
    }
    return { ok:true, found:false, message:'Nomor Gardu "'+String(nomorGardu).trim()+'" belum ada di Master Gardu.' };
  }catch(error){
    return { ok:false, message:'Gagal membaca Master Gardu: '+error.message };
  }
}

/* Upload foto megger BA Pemeriksaan Trafo. slot = megger1..megger6.
   File masuk ke folder BA yang sama: Berita Acara/Gardu/Pemeriksaan Trafo/
   <Tahun>/<NN. Bulan>/<Nomor Gardu>. Return { ok, slot, url, sheetColumn }. */
function uploadFotoPemeriksaanTrafo(request){
  try{
    request = request || {};
    var slot = String(request.slot || '').trim();
    var kolom = BA_PRK_FOTO_COLUMN[slot];
    if(!kolom) return { ok:false, message:'Slot foto megger tidak dikenal: '+slot+' (gunakan megger1..megger6).' };
    var dataUrl = String(request.dataUrl || '');
    var fileName = String(request.fileName || slot+'.jpg').replace(/[\\/:*?"<>|]/g,'-');
    var mimeType = String(request.mimeType || 'image/jpeg');
    if(!/^image\//.test(mimeType)) return { ok:false, message:'File harus berupa gambar.' };
    if(!dataUrl || dataUrl.indexOf(',') < 0) return { ok:false, message:'Data gambar tidak valid.' };
    var base64 = dataUrl.split(',')[1];
    if(base64.length > 7000000) return { ok:false, message:'Ukuran gambar maksimal 5 MB.' };
    var folder = _baPhotoFolder_(request.tanggalBA, request.jenisPekerjaan || BA_PRK_JENIS, request.nomorTrafo);
    var timestamp = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd_HHmmss');
    var blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, slot+'_'+timestamp+'_'+fileName);
    var file = folder.createFile(blob);
    return { ok:true, slot:slot, url:file.getUrl(), fileId:file.getId(), folderId:folder.getId(), sheetColumn:kolom };
  }catch(error){
    return { ok:false, message:'Upload foto megger gagal: '+error.message };
  }
}

/* Simpan BA Pemeriksaan Trafo — satu baris baru di Rekap Gardu.
   payload = {
     identitas:{ nomorTrafo, tanggalBA, tanggalPekerjaan },
     trafoAwal:{ kapasitas, merk, nomorSeri, tahun, konstruksi, alamat,
                 penyulang, section, koordinat, jurusanTerpasang },
     phbTr:{ merk, nomorSeri, tahun },
     pemeriksa:{ petugas1, jabatan1, petugas2, jabatan2, mengetahui, jabatanMengetahui },
     foto:{ megger1:{url}, ... megger6:{url} },
     kesimpulan:'', catatan:''
   }
   Return { ok, idBA, nomorBA, nomorBAFull, baris }. */
function simpanBaPemeriksaanTrafo(payload){
  try{
    payload = payload || {};
    var identitas = payload.identitas || {};
    var trafo = payload.trafoAwal || {};
    var phbTr = payload.phbTr || {};
    var pemeriksa = payload.pemeriksa || {};
    var foto = payload.foto || {};

    var nomorTrafo = String(identitas.nomorTrafo || '').trim();
    var tanggalBA  = String(identitas.tanggalBA || '').trim();
    if(!nomorTrafo) return { ok:false, message:'Nomor Gardu wajib diisi.' };
    if(!tanggalBA)  return { ok:false, message:'Tanggal BA wajib diisi.' };

    var ss = SpreadsheetApp.openById(BA_SOURCE.spreadsheetId);
    var sh = ss.getSheetByName(BA_SOURCE.sheetName);
    if(!sh) return { ok:false, message:'Sheet Rekap Gardu tidak ditemukan.' };
    var values = sh.getDataRange().getValues();
    var found = _baFindHeader_(values);
    if(!found) return { ok:false, message:'Header Rekap Gardu belum dikenali.' };

    var col = {};
    Object.keys(BA_SAVE_ALIASES).forEach(function(field){
      col[field] = _baPickIndex_(found.map, BA_SAVE_ALIASES[field]);
    });
    if(col.idBA < 0) return { ok:false, message:'Kolom idBA tidak ditemukan di Rekap Gardu.' };

    // Baris tujuan: tepat setelah baris berdata terakhir (sama seperti simpanBeritaAcaraGardu).
    var idxNama = col.nomorTrafo, lastDataRow = found.row;
    for(var r=found.row+1;r<values.length;r++){
      var adaId = String(_baText_(values[r], col.idBA) || '') !== '';
      var adaNama = idxNama >= 0 ? String(_baText_(values[r], idxNama) || '') !== '' : false;
      if(adaId || adaNama) lastDataRow = r;
    }
    var sheetRow = lastDataRow + 2;   // 1-based, satu baris di bawah data terakhir

    var gen = _baGenerateIdBA_(values, found.row, col.idBA, tanggalBA);
    var idBA = gen.idBA;
    var noBaFull = _baGenerateNoBaFull_(values, found.row, col.nomorBAFull, gen.year, gen.month);

    function _set_(letter, value){
      sh.getRange(sheetRow, _baColLetterToIndex_(letter) + 1).setValue(value == null ? '' : value);
    }
    function _setText_(letter, value){
      var rng = sh.getRange(sheetRow, _baColLetterToIndex_(letter) + 1);
      rng.setNumberFormat('@');
      rng.setValue(String(value == null ? '' : value));
    }

    // Data awal trafo -> kolom huruf tetap (sinkron BA lain).
    _set_('D',  String(identitas.tanggalPekerjaan || ''));
    _set_('F',  String(trafo.kapasitas || ''));
    _set_('G',  String(trafo.merk || ''));
    _set_('H',  String(trafo.nomorSeri || ''));
    _set_('I',  String(trafo.tahun || ''));
    _set_('J',  String(trafo.konstruksi || ''));
    _set_('K',  String(trafo.alamat || ''));
    _set_('L',  String(trafo.penyulang || ''));
    _set_('M',  String(trafo.section || ''));
    var koordNorm = _baNormalisasiKoordinat_(String(trafo.koordinat || ''), '');
    _setText_('Q', koordNorm.ok ? String(koordNorm.lat) : '');
    _setText_('R', koordNorm.ok ? String(koordNorm.lng) : '');
    _set_('S',  String(trafo.jurusanTerpasang || ''));
    _set_('Y',  String(phbTr.nomorSeri || ''));
    _set_('Z',  String(phbTr.merk || ''));
    _set_('AA', String(phbTr.tahun || ''));
    _set_('BZ', String(pemeriksa.petugas1 || ''));
    _set_('CA', String(pemeriksa.jabatan1 || ''));
    _set_('CB', String(pemeriksa.petugas2 || ''));
    _set_('CC', String(pemeriksa.jabatan2 || ''));

    // Kolom khusus pemeriksaan: link foto megger + kesimpulan + catatan.
    Object.keys(BA_PRK_FOTO_COLUMN).forEach(function(slot){
      var item = foto[slot];
      var url = item && (item.url || item.fileUrl);
      if(url) _set_(BA_PRK_FOTO_COLUMN[slot], url);
    });
    _set_(BA_PRK_KESIMPULAN_COL, String(payload.kesimpulan || ''));
    _set_(BA_PRK_CATATAN_COL,    String(payload.catatan || ''));

    // Kolom by alias: idBA, NO BA Full, Nomor Trafo, Tanggal BA, Jenis, Mengetahui.
    var viaAlias = {
      idBA: idBA,
      nomorBAFull: noBaFull,
      nomorTrafo: nomorTrafo,
      tanggalBA: tanggalBA,
      jenisPekerjaan: BA_PRK_JENIS,
      mengetahui: String(pemeriksa.mengetahui || ''),
      jabatanMengetahui: String(pemeriksa.jabatanMengetahui || '')
    };
    Object.keys(viaAlias).forEach(function(field){
      var c = col[field];
      if(c != null && c >= 0) sh.getRange(sheetRow, c + 1).setValue(viaAlias[field]);
    });

    SpreadsheetApp.flush();

    var cek = String(sh.getRange(sheetRow, col.idBA + 1).getValue() || '').trim();
    if(cek !== idBA){
      return {
        ok:false, baris:sheetRow, idBA:idBA,
        message:'BA belum tersimpan: idBA "'+idBA+'" tidak muncul di baris '+sheetRow+'. Cek ARRAYFORMULA / filter / Range terproteksi di Rekap Gardu.'
      };
    }
    return { ok:true, idBA:idBA, nomorBA:idBA, nomorBAFull:noBaFull, baris:sheetRow };
  }catch(error){
    return { ok:false, message:'Gagal menyimpan BA Pemeriksaan Trafo: '+error.message };
  }
}

/* Perbarui Kesimpulan (BX) & Catatan (BY) satu baris BA Pemeriksaan Trafo. */
function updateKesimpulanPemeriksaanTrafo(request){
  try{
    request = request || {};
    var idBA = String(request.idBA || '').trim();
    if(!idBA) return { ok:false, message:'idBA wajib diisi.' };
    var ss = SpreadsheetApp.openById(BA_SOURCE.spreadsheetId);
    var sh = ss.getSheetByName(BA_SOURCE.sheetName);
    if(!sh) return { ok:false, message:'Sheet Rekap Gardu tidak ditemukan.' };
    var values = sh.getDataRange().getValues();
    var found = _baFindHeader_(values);
    if(!found) return { ok:false, message:'Header Rekap Gardu belum dikenali.' };
    var rowIndex = _baCariBarisNomorBA_(sh, found, idBA);
    if(rowIndex < 0) return { ok:false, message:'Baris BA "'+idBA+'" tidak ditemukan.' };
    var sheetRow = rowIndex + 1;
    if(Object.prototype.hasOwnProperty.call(request,'kesimpulan')){
      sh.getRange(sheetRow, _baColLetterToIndex_(BA_PRK_KESIMPULAN_COL) + 1).setValue(String(request.kesimpulan || ''));
    }
    if(Object.prototype.hasOwnProperty.call(request,'catatan')){
      sh.getRange(sheetRow, _baColLetterToIndex_(BA_PRK_CATATAN_COL) + 1).setValue(String(request.catatan || ''));
    }
    SpreadsheetApp.flush();
    return { ok:true, idBA:idBA, baris:sheetRow };
  }catch(error){
    return { ok:false, message:'Gagal memperbarui kesimpulan: '+error.message };
  }
}