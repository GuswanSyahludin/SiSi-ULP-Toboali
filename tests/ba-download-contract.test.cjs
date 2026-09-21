const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync(require('node:path').resolve(__dirname,'../SiSi_BackEnd/Core/ZZZZ-BA-Download-Contract.js'),'utf8');

const IDS={garduPdf:'gardu-pdf-123456',garduTtd:'gardu-ttd-123456',swPdf:'switch-pdf-123456',swTtd:'switch-ttd-123456',unknown:'unknown-123456'};
function row(){return Array(90).fill('');}
function harness({session={username:'alice'},bytes=[1,2,3],sheetFailure=false}={}){
  const g=row(); g[0]='idBA'; g[1]='BA-GRD-1'; g[84]='https://drive.google.com/file/d/'+IDS.garduTtd+'/view'; g[88]='https://drive.google.com/file/d/'+IDS.garduPdf+'/view'; g[89]=IDS.garduPdf;
  const s=[['idBA','File PDF URL','BA TTD','File ID'],['BA-SW-1','https://drive.google.com/file/d/'+IDS.swPdf+'/view','https://drive.google.com/open?id='+IDS.swTtd,IDS.swPdf]];
  const state={drive:0,sheets:0,ids:[]};
  const sheet=values=>({getDataRange:()=>({getValues:()=>values})});
  const context={String,BA_SOURCE:{spreadsheetId:'gardu-sheet',sheetName:'Rekap Gardu'},SW_SOURCE:{spreadsheetId:'switch-sheet',sheetName:'Rekap Switching'},SW_COL:{idBA:'A',filePdfUrl:'B',linkBaTtd:'C'},getSesiByToken:t=>t==='valid-token'?session:null,_bolehAksesMenu:()=>true,PAGE_FILE_ALIASES:{'SIE-BeritaAcara':'SIE-BeritaAcara'},HtmlService:{createHtmlOutputFromFile:n=>({getContent:()=>'<'+n+'>'})},SpreadsheetApp:{openById:id=>{state.sheets++; if(sheetFailure) throw new Error('sheet unavailable'); return {getSheetByName:name=>sheet(name==='Rekap Gardu'? [g]:s)};}},DriveApp:{getFileById:id=>{state.drive++;state.ids.push(id);return {getBlob:()=>({getBytes:()=>bytes,getContentType:()=>'application/pdf'}),getName:()=> 'BA-Test.pdf'};}},Utilities:{base64Encode:v=>Buffer.from(v).toString('base64')}};
  vm.createContext(context);vm.runInContext(src,context);return {context,state};
}

test('invalid session before sheet/Drive',()=>{const h=harness({session:null});const r=h.context.unduhFileBa('bad',IDS.garduPdf);assert.equal(r.code,'SESSION_EXPIRED');assert.equal(h.state.sheets,0);assert.equal(h.state.drive,0);});
test('unknown file ID denied before Drive',()=>{const h=harness();const r=h.context.unduhFileBa('valid-token',IDS.unknown);assert.equal(r.code,'FILE_NOT_AUTHORIZED');assert.equal(h.state.drive,0);});
test('matching Gardu non-TTD PDF ID allowed',()=>{const h=harness();const r=h.context.unduhFileBa('valid-token',IDS.garduPdf);assert.equal(r.ok,true);assert.deepEqual(h.state.ids,[IDS.garduPdf]);});
test('matching Gardu TTD URL allowed',()=>{const h=harness();const r=h.context.unduhFileBa('valid-token','https://drive.google.com/file/d/'+IDS.garduTtd+'/view');assert.equal(r.ok,true);assert.deepEqual(h.state.ids,[IDS.garduTtd]);});
test('matching Switching PDF and TTD allowed',()=>{for(const value of [IDS.swPdf,'https://drive.google.com/open?id='+IDS.swTtd]){const h=harness();const r=h.context.unduhFileBa('valid-token',value);assert.equal(r.ok,true);assert.deepEqual(h.state.ids,[value===IDS.swPdf?IDS.swPdf:IDS.swTtd]);}});
test('size cap remains 12 MiB',()=>{const h=harness({bytes:{length:12*1024*1024+1}});const r=h.context.unduhFileBa('valid-token',IDS.garduPdf);assert.equal(r.code,'FILE_TOO_LARGE');assert.equal(h.state.drive,1);});
test('ordinary sheet failures fail closed before Drive',()=>{const h=harness({sheetFailure:true});const r=h.context.unduhFileBa('valid-token',IDS.garduPdf);assert.equal(r.code,'FILE_VALIDATION_FAILED');assert.equal(h.state.drive,0);});
test('page contract remains token-first and appends WebFix',()=>{const h=harness();const r=h.context.getPageContent('valid-token','SIE-BeritaAcara');assert.equal(r.success,true);assert.equal(r.html,'<SIE-BeritaAcara><Core/SIE-BeritaAcara-WebFix>');});
test('source contract has strict token/file signature',()=>{assert.match(src,/unduhFileBa\s*=\s*function\(token,fileId\)/);assert.match(src,/DriveApp\.getFileById\(id\)/);assert.match(src,/FILE_NOT_AUTHORIZED/);});
