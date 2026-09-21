/* SISI-REAUDIT-004: authenticated boundary for BA-to-Master synchronization. */
(function(){
  var originalUpdate=updateMasterGarduDariBA;
  var originalPage=getPageContent;

  getPageContent=function(token,pageName){
    var result=originalPage.apply(this,arguments);
    if(result&&result.success&&pageName==='SIE-BeritaAcara'){
      result.html+='<script>(function(g){var l=g.SISI_BUTUH_TOKEN;if(!Array.isArray(l)){l=[];g.SISI_BUTUH_TOKEN=l;}if(l.indexOf("updateMasterGarduDariBA")<0)l.push("updateMasterGarduDariBA");})(window);<\/script>';
    }
    return result;
  };

  updateMasterGarduDariBA=function(token,idBA){
    guard_(arguments,{ulp:true,aksi:'BA_MASTER_SYNC'});
    var id=String(arguments.length>=2?idBA:'').trim();
    if(!id) return {ok:false,message:'idBA wajib diisi.'};
    return originalUpdate.call(this,id);
  };
})();
