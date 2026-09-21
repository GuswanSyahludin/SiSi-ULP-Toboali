/* SISI-REAUDIT-004: authenticated boundary for the BA list reader. */
(function(){
  var originalList=getDataBeritaAcara;
  var originalPage=getPageContent;
  getPageContent=function(token,pageName){
    var result=originalPage.apply(this,arguments);
    if(result&&result.success&&pageName==='SIE-BeritaAcara'){
      result.html+='<script>(function(g){var l=g.SISI_BUTUH_TOKEN;if(!Array.isArray(l)){l=[];g.SISI_BUTUH_TOKEN=l;}if(l.indexOf("getDataBeritaAcara")<0)l.push("getDataBeritaAcara");})(window);<\/script>';
    }
    return result;
  };
  function accessError(error){
    if(typeof _guardErrorAkses_==='function') return _guardErrorAkses_(error);
    return /Sesi|Akses ditolak|ULP|bukan milik|LOCK_SIBUK/i.test(String(error&&error.message||error));
  }
  getDataBeritaAcara=function(filter){
    var g=guard_(arguments,{ulp:true,aksi:'BA_LIST'});
    if(!String(g&&g.sesi&&g.sesi.ulp||'').trim()) throw new Error('Akun belum terhubung ke ULP.');
    var pending=null;
    var switching=typeof getDataSwitching==='function'?getDataSwitching:null;
    if(switching){
      getDataSwitching=function(){
        try{return switching.apply(this,arguments);}
        catch(error){if(accessError(error)){pending=error;return{ok:false,rows:[]};}throw error;}
      };
    }
    try{
      var result=originalList(filter||{});
      if(pending) throw pending;
      return result;
    }catch(error){
      if(accessError(error)) throw error;
      throw error;
    }finally{
      if(switching) getDataSwitching=switching;
    }
  };
})();
