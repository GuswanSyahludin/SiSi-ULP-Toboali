/* SISI-REAUDIT-004: authenticated boundary for final BA uploads. */
(function(){
  var originalUpload=uploadBaFinal;
  var originalPage=getPageContent;

  getPageContent=function(token,pageName){
    var result=originalPage.apply(this,arguments);
    if(result&&result.success&&pageName==='SIE-BeritaAcara'){
      result.html+='<script>(function(g){var l=g.SISI_BUTUH_TOKEN;if(!Array.isArray(l)){l=[];g.SISI_BUTUH_TOKEN=l;}if(l.indexOf("uploadBaFinal")<0)l.push("uploadBaFinal");})(window);<\/script>';
    }
    return result;
  };

  uploadBaFinal=function(request){
    guard_(arguments,{ulp:true,aksi:'BA_FINAL_UPLOAD'});
    request=request||{};
    var secured={};
    Object.keys(request).forEach(function(key){if(key!=='token') secured[key]=request[key];});
    return originalUpload.call(this,secured);
  };
})();
