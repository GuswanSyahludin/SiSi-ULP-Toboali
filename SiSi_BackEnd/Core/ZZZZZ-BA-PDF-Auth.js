/* SISI-REAUDIT-004: authenticated boundary for BA PDF generation. */
(function(){
  var originalSwitching=generatePdfBaSwitching;
  var originalGardu=generatePdfBaPengoperasian;
  var originalPage=getPageContent;

  getPageContent=function(token,pageName){
    var result=originalPage.apply(this,arguments);
    if(result&&result.success&&pageName==='SIE-BeritaAcara'){
      result.html+='<script>(function(g){var l=g.SISI_BUTUH_TOKEN;if(!Array.isArray(l)){l=[];g.SISI_BUTUH_TOKEN=l;}["generatePdfBaSwitching","generatePdfBaPengoperasian"].forEach(function(n){if(l.indexOf(n)<0)l.push(n);});})(window);<\/script>';
    }
    return result;
  };

  function generate(original,args,action){
    var g=guard_(args,{ulp:true,aksi:action});
    var id=String(args.length>=2?args[1]:'').trim();
    if(!id) return {ok:false,message:'idBA wajib diisi.'};
    return original.call(this,g.token,id);
  }

  generatePdfBaSwitching=function(token,idBA){
    return generate.call(this,originalSwitching,arguments,'BA_PDF_SWITCHING');
  };
  generatePdfBaPengoperasian=function(token,idBA){
    return generate.call(this,originalGardu,arguments,'BA_PDF_GARDU');
  };
})();
