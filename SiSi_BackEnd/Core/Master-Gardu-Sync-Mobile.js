/* Sinkron edit Master Gardu dari outbox Flutter ke tiga gsheet lewat updateHiUp3. */
function updateMasterGarduMobile(token, payload) {
  try {
    var sesi = getSesiByToken(String(token || '').trim());
    if (!sesi) return { success:false, message:'Sesi habis, buka aplikasi ulang.' };
    var role = String(sesi.role || '').trim().toLowerCase();
    var sub = String(sesi.subTim || '').trim().toLowerCase();
    if (role !== 'super user' && role !== 'admin' && sub !== 'inspeksi gardu')
      return { success:false, message:'Akses edit Gardu ditolak.' };

    payload = payload || {};
    var g = String(payload.gardu || '').trim();
    if (!g) return { success:false, message:'Nomor Gardu wajib.' };
    var d = payload.data || {};

    // Peta field Flutter -> kolom Master_Gardu (mg). updateHiUp3 meneruskan
    // nilai yang sama ke Master HI Toboali, Master HI HP, dan INPUT TBL.
    var map = {
      alamat:'D', jenisGardu:'K', merk:'L', kapasitasKva:'M', noSeri:'N',
      tahunTrafo:'O', typeSeal:'P', merkPhbTr:'Q', nomorSeriPhbTr:'R',
      tahunPhbTr:'S', jamUkurWbp:'T', tanggalPengukuran:'U', kepemilikan:'V',
      wbpRs:'AB', wbpSt:'AC', wbpTr:'AD', wbpRn:'AE', wbpSn:'AF', wbpTn:'AG',
      wbpR:'AH', wbpS:'AI', wbpT:'AJ', wbpN:'AK',
      lwbpRs:'BE', lwbpSt:'BF', lwbpTr:'BG', lwbpRn:'BH', lwbpSn:'BI', lwbpTn:'BJ',
      lwbpR:'BK', lwbpS:'BL', lwbpT:'BM', lwbpN:'BN'
    };
    var mg = {}, it = {};
    Object.keys(map).forEach(function(k){
      if (d[k] === undefined) return;
      mg[map[k]] = d[k];
      // INPUT TBL memakai layout lama yang sama untuk field huruf.
      it[map[k]] = d[k];
    });
    var res = updateHiUp3({ nomorGardu:g, ulp:String(payload.ulp || sesi.ulp || ''), mg:mg, sf:{}, it:it });
    return res && res.ok
      ? { success:true, message:res.message || 'Master Gardu tersinkron.' }
      : { success:false, message:(res && res.message) || 'Sinkron Master Gardu gagal.' };
  } catch(e) {
    return { success:false, message:'Gagal sinkron Gardu: '+e.message };
  }
}
