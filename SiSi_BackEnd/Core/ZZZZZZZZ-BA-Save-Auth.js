/* SISI-REAUDIT-001/004: authenticated boundary for BA Gardu creation. */
(function(){
  var originalSave=simpanBeritaAcaraGardu;
  var originalPage=getPageContent;

  getPageContent=function(token,pageName){
    var result=originalPage.apply(this,arguments);
    if(result&&result.success&&pageName==='SIE-BeritaAcara'){
      result.html+='<script>(function(g){var l=g.SISI_BUTUH_TOKEN;if(!Array.isArray(l)){l=[];g.SISI_BUTUH_TOKEN=l;}if(l.indexOf("simpanBeritaAcaraGardu")<0)l.push("simpanBeritaAcaraGardu");})(window);<\/script>';
    }
    return result;
  };

  simpanBeritaAcaraGardu=function(payload){
    guard_(arguments,{ulp:true,aksi:'BA_GARDU_CREATE'});
    payload=payload||{};
    var secured={};
    Object.keys(payload).forEach(function(key){if(key!=='token') secured[key]=payload[key];});
    if(typeof _stage4SafePayload_==='function') secured=_stage4SafePayload_(secured);
    return originalSave.call(this,secured);
  };
})();
