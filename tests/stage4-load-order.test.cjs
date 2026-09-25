'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test'),vm=require('node:vm');
const repoRoot=path.join(__dirname,'..');
const root=path.join(repoRoot,'SiSi_BackEnd','Core');
const clasp=JSON.parse(fs.readFileSync(path.join(repoRoot,'SiSi_BackEnd','.clasp.json'),'utf8'));
const files=[
  'ZZZZZZ-BA-Final-Upload-Auth.js',
  'ZZZZZZZZ-BA-Save-Auth.js',
  'ZZZZZZZZZ-BA-Atomicity.js',
  'ZZZZZZZZZZ-BA-Same-ULP-Auth.js',
  'ZZZZZZZZZZZ-BA-Row-Ownership.js',
  'ZZZZZZZZZZZZ-Stage4-Sheet-Write-Safety.js',
  'ZZZZZZZZZZZZZ-BA-Detail-Edit-Auth.js',
  'ZZZZZZZZZZZZZZ-BA-Photo-Upload-Auth.js',
  'ZZZZZZZZZZZZZZZ-BA-Master-Write-Safety.js',
];
function source(name){return fs.readFileSync(path.join(root,name),'utf8');}
function productionOrder(){
  assert.deepEqual(clasp.filePushOrder,[
    'Core/Code.js',
    'Core/PageLoader-Compat.js',
    'Core/ZZZZZZZZZZZZZZZZZZ-PageLoader-Dashboard-Delete.js',
  ]);
  return files.slice().sort();
}
function context(){
  const sheet={getDataRange(){return{getValues(){return[['idBA','ULP'],['BA-1','ULP Toboali']];}};}};
  const base={
    BA_SOURCE:{spreadsheetId:'ba',sheetName:'Rekap Gardu'},
    SW_SOURCE:{spreadsheetId:'sw',sheetName:'Rekap Switching'},
    SpreadsheetApp:{openById(id){return{getSheetByName(){return id==='ba'?sheet:null;}};}},
    LockService:{getScriptLock(){return{tryLock(){return true;},releaseLock(){}};}},
    withLock_(fn){return fn();},
    simpanBeritaAcaraGardu(r){return{ok:true,r};},
    uploadBaFinal(r){return{ok:true,r};},
    getPageContent(){return{success:true,html:''};},
    updateBeritaAcaraDetail(r){return{ok:true,r};},
    uploadFotoBeritaAcara(r){return{ok:true,r};},
    updateFotoBeritaAcaraDetail(r){return{ok:true,r};},
    getDataBeritaAcara(){return{ok:true,rows:[]};},
    generatePdfBaPengoperasian(){return{ok:true};},
    generatePdfBaSwitching(){return{ok:true};},
    updateMasterGarduDariBA(){return{ok:true};},
    unduhFileBa(){return{ok:true};},
    syncGarduKeMaster(r){return{ok:true,r};},
    _baTerapkanUpdateMaster_(t,c){return{ok:true,t,c};},
    guard_(){return{token:'t',ulp:'ULP Toboali',sesi:{token:'t'}};}, audit_(){},
  };
  vm.createContext(base); return base;
}
test('production clasp order is used, and Stage 4 delegates once without recursion',()=>{
  const order=productionOrder();
  const h=context();
  order.forEach(file=>vm.runInContext(source(file),h,{filename:file}));
  assert.equal(typeof h._stage4SafePayload_,'function');
  assert.equal(typeof h._stage3RequireBaRow_,'function');
  const final=h.uploadBaFinal({token:'t',idBA:'BA-1',fileName:'=bad.pdf'});
  assert.equal(final.ok,true); assert.equal(final.r.fileName,"'=bad.pdf");
  const save=h.simpanBeritaAcaraGardu({token:'t',identitas:{alamat:'=bad'}});
  assert.equal(save.ok,true); assert.equal(save.r.identitas.alamat,"'=bad");
  const detail=h.updateBeritaAcaraDetail({token:'t',idBA:'BA-1',value:'=bad'});
  assert.equal(detail.ok,true); assert.equal(detail.r.value,"'=bad");
  const photo=h.uploadFotoBeritaAcara({token:'t',idBA:'BA-1',fileName:'@bad'});
  assert.equal(photo.ok,true); assert.equal(photo.r.fileName,"'@bad");
  const sync=h.syncGarduKeMaster({detail:{Alamat:'=bad'}});
  assert.equal(sync.ok,true); assert.equal(sync.r.detail.Alamat,"'=bad");
});
test('all live Stage 4 writers are represented in the production-order fixture',()=>{
  const text=files.map(source).join('\n');
  for(const symbol of ['simpanBeritaAcaraGardu','updateBeritaAcaraDetail','uploadFotoBeritaAcara','updateFotoBeritaAcaraDetail','uploadBaFinal','syncGarduKeMaster','_baTerapkanUpdateMaster_']) {
    assert.match(text,new RegExp(symbol));
  }
});
