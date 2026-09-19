/*
 * Adapter final OwnerId/External Reference untuk SisiRun.
 * UI memanggil getOwnerIdDanExternalReference(filter), lalu SisiRun mengubahnya
 * menjadi (token, filter). Implementasi satu-argumen sebelumnya membaca token
 * sebagai filter sehingga Penyulang selalu dianggap kosong.
 */
function _baOwnerKosongCompat_(message) {
  return {
    ok: true, found: false, ownerId: '', externalReference: '', referralId: '',
    message: message || 'Data OwnerId tidak ditemukan atau belum lengkap.'
  };
}

function getOwnerIdDanExternalReference(tokenOrFilter, filterArg) {
  try {
    var pola = typeof TOKEN_POLA !== 'undefined'
      ? TOKEN_POLA
      : /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    var pakaiToken = typeof tokenOrFilter === 'string' && pola.test(String(tokenOrFilter).trim());
    if (pakaiToken && typeof guard_ === 'function') {
      guard_(arguments, { aksi: 'getOwnerIdDanExternalReference' });
    }
    var filter = pakaiToken ? filterArg : tokenOrFilter;
    filter = filter && typeof filter === 'object' ? filter : {};
    var penyulang = String(filter.penyulang || '').trim();
    var section = String(filter.section || '').trim();
    if (!penyulang) return _baOwnerKosongCompat_('Penyulang harus terisi.');
    if (!section) return _baOwnerKosongCompat_('Section harus terisi.');

    var ss = SpreadsheetApp.openById(BA_OWNER_SOURCE.spreadsheetId);
    var sh = _baResolveSheet_(ss, BA_OWNER_SOURCE.sheetName);
    if (!sh) return _baOwnerKosongCompat_('Sheet OwnerId tidak ditemukan.');
    var values = sh.getDataRange().getDisplayValues();
    if (!values.length) return _baOwnerKosongCompat_('Sheet OwnerId belum berisi data.');

    var A=0, B=1, D=3, E=4, F=5, H=7, I=8, J=9, K=10, L=11, M=12;
    var pKey = _baKey_(penyulang);
    var hVal = '', idGI = '', idULP = '', idFeeder = '', idSection = '';
    var r;
    for (r=0; r<values.length; r++) {
      if (_baKey_(_baText_(values[r], I)) === pKey) { hVal = _baText_(values[r], H); break; }
    }
    if (hVal) {
      var hKey = _baKey_(hVal);
      for (r=0; r<values.length; r++) {
        if (_baKey_(_baText_(values[r], A)) === hKey) { idGI = _baText_(values[r], B); break; }
      }
    }
    for (r=0; r<values.length; r++) {
      if (_baKey_(_baText_(values[r], D)) === pKey) {
        idFeeder = _baText_(values[r], E);
        idULP = _baText_(values[r], F);
        break;
      }
    }

    function awal_(v) { return String(v == null ? '' : v).split(/\s+-\s+/)[0].trim(); }
    var secKey = _baKey_(awal_(section));
    var tepat = null, sebagian = null;
    for (r=0; r<values.length; r++) {
      var jKey = _baKey_(awal_(_baText_(values[r], J)));
      if (!jKey) continue;
      if (jKey === secKey) { tepat = values[r]; break; }
      if (!sebagian && (jKey.indexOf(secKey) >= 0 || secKey.indexOf(jKey) >= 0)) sebagian = values[r];
    }
    var barisSection = tepat || sebagian;
    if (barisSection) idSection = _baText_(barisSection, K);

    if (!idGI || !idULP || !idFeeder || !idSection) {
      var kurang=[];
      if(!idGI) kurang.push('id GI');
      if(!idULP) kurang.push('id ULP');
      if(!idFeeder) kurang.push('id Feeder');
      if(!idSection) kurang.push('id Section');
      return _baOwnerKosongCompat_('Komponen OwnerId belum lengkap: '+kurang.join(', ')+'.');
    }

    function pad2_(v) { var s=String(v==null?'':v).trim(); while(s.length<2) s='0'+s; return s; }
    var ownerId = pad2_(idGI)+pad2_(idULP)+pad2_(idFeeder)+pad2_(idSection);

    var sUp=section.toUpperCase();
    var token=sUp.indexOf('GI')===0?'PMT':sUp.indexOf('DS')===0?'DSC':'';
    var cocok=null, cocokToken=null, tokenSaja=null;
    for(r=0; r<values.length; r++) {
      var jVal=_baText_(values[r],J);
      if(!jVal) continue;
      var jk=_baKey_(awal_(jVal));
      var punyaToken=token && jVal.toUpperCase().indexOf(token)>=0;
      var sama=jk===secKey || jk.indexOf(secKey)>=0 || secKey.indexOf(jk)>=0;
      if(sama){ if(!cocok) cocok=values[r]; if(punyaToken){ cocokToken=values[r]; break; } }
      if(punyaToken && !tokenSaja) tokenSaja=values[r];
    }
    var barisPemutus=cocokToken || cocok || (token?tokenSaja:null) || barisSection;
    var jenisPemutus=barisPemutus?_baText_(barisPemutus,L):'';
    var namaPemutus=barisPemutus?_baText_(barisPemutus,M):'';
    var externalReference='SECTION';
    if(jenisPemutus || namaPemutus) externalReference='SECTION - '+jenisPemutus+' - '+namaPemutus;

    return {
      ok:true, found:true, ownerId:ownerId,
      externalReference:externalReference,
      referralId:externalReference,
      message:'OwnerId dan referralId ditemukan.'
    };
  } catch (error) {
    return _baOwnerKosongCompat_('Error lookup OwnerId: '+error.message);
  }
}
