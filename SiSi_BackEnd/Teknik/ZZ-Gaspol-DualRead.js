/* ===============================================================
   GASPOL UP3 FULL DUAL-READ — 26 Agu 2026
   Override agregator GASPOL agar seluruh sumber yang sudah dimigrasi
   membaca spreadsheet AKTIF + ARSIP melalui _readSheetDual_.
   Dedup memakai kode unik masing-masing sheet.
=============================================================== */

function _gaspolFromInspeksiJar(f){
  var map = {};
  try{
    var C = { kodePekerjaanPeny:2, tanggal:4, penyulang:5, section:6, tier:8, totalTiang:9 };
    var data = _readSheetDual_('db_InsJar_Realisasi', C.kodePekerjaanPeny, 13);
    for(var i=0;i<data.length;i++){
      var peny = String(data[i][C.penyulang]||'').trim();
      if(!peny) continue;
      var tgl = _sieNormTgl(data[i][C.tanggal]);
      if(!_sieTglLolos(tgl, f)) continue;
      var tier = String(data[i][C.tier]||'');
      var tiang = Number(data[i][C.totalTiang]) || 0;
      var sec = String(data[i][C.section]||'').trim();
      var k = _sieKey(peny, tgl);
      if(!map[k]) map[k] = { kms:0, tier1:0, tier2:0, section:'' };
      if(sec && !map[k].section) map[k].section = sec;
      map[k].kms += tiang * 0.05;
      if(tier.indexOf('1') >= 0) map[k].tier1 += tiang;
      if(tier.indexOf('2') >= 0) map[k].tier2 += tiang;
    }
  }catch(e){ Logger.log('[_gaspolFromInspeksiJar dual] ' + e.message); }
  return map;
}

function _gaspolFromInspeksiGardu(f){
  var map = {};
  try{
    var C = { kodePekerjaanGardu:2, tanggal:4, penyulang:5, section:6, nomorGardu:7, tier:8 };
    var data = _readSheetDual_('db_InsDu_Realisasi', C.kodePekerjaanGardu, 12);
    for(var i=0;i<data.length;i++){
      var peny = String(data[i][C.penyulang]||'').trim();
      var nomor = String(data[i][C.nomorGardu]||'').trim();
      if(!peny || !nomor) continue;
      var tgl = _sieNormTgl(data[i][C.tanggal]);
      if(!_sieTglLolos(tgl, f)) continue;
      var tier = String(data[i][C.tier]||'');
      var sec = String(data[i][C.section]||'').trim();
      var k = _sieKey(peny, tgl);
      if(!map[k]) map[k] = { noGardu:[], tier1:0, tier2:0, section:'' };
      if(sec && !map[k].section) map[k].section = sec;
      if(map[k].noGardu.indexOf(nomor) < 0) map[k].noGardu.push(nomor);
      if(tier.indexOf('1') >= 0) map[k].tier1 += 1;
      if(tier.indexOf('2') >= 0) map[k].tier2 += 1;
    }
  }catch(e){ Logger.log('[_gaspolFromInspeksiGardu dual] ' + e.message); }
  return map;
}

function _gaspolFromHartek(f){
  var map = {};
  try{
    var hmap = _gaspolReadHartekMap();
    var C = { kodePekerjaan:3, tanggal:6, jenis:7, penyulang:8, pekerjaan:11, jumlahPekerjaan:12 };
    var data = _readSheetDual_('db_Hartek_Pekerjaan', C.kodePekerjaan, 17);
    for(var i=0;i<data.length;i++){
      var peny = String(data[i][C.penyulang]||'').trim();
      if(!peny) continue;
      var tgl = _sieNormTgl(data[i][C.tanggal]);
      if(!_sieTglLolos(tgl, f)) continue;
      var col = _gaspolHartekColFor(hmap, data[i][C.pekerjaan], data[i][C.jenis]);
      if(!col) continue;
      var jml = Number(data[i][C.jumlahPekerjaan]) || 0;
      var k = _sieKey(peny, tgl);
      if(!map[k]) map[k] = {};
      map[k][col] = (map[k][col]||0) + jml;
    }
  }catch(e){ Logger.log('[_gaspolFromHartek dual] ' + e.message); }
  return map;
}

function _gaspolFromYandal(f){
  var map = {};
  try{
    var C = { kodeShift:2, kodeP0:3, tanggal:6, namaPekerjaan:7, penyulang:9, section:10 };
    var data = _readSheetDual_('db_Yandal_P0', C.kodeP0, 11);
    for(var i=0;i<data.length;i++){
      if(!String(data[i][C.kodeP0]||'').trim()) continue;
      var kodeShift = String(data[i][C.kodeShift]||'');
      var kodeP0 = String(data[i][C.kodeP0]||'');
      if(!/-SHF1\./.test(kodeShift) && !/-SHF1\./.test(kodeP0)) continue;
      var namaP0 = String(data[i][C.namaPekerjaan]||'').toLowerCase();
      if(!/(row|perbaikan|penggantian)/.test(namaP0)) continue;
      var peny = String(data[i][C.penyulang]||'').trim();
      if(!peny) continue;
      var tgl = _sieNormTgl(data[i][C.tanggal]);
      if(!_sieTglLolos(tgl, f)) continue;
      var sec = String(data[i][C.section]||'').trim();
      var k = _sieKey(peny, tgl);
      if(!map[k]) map[k] = { nilai:0, section:'' };
      if(sec && !map[k].section) map[k].section = sec;
      map[k].nilai += 1;
    }
  }catch(e){ Logger.log('[_gaspolFromYandal dual] ' + e.message); }
  return map;
}
