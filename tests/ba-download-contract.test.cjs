const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.resolve(__dirname,'../SiSi_BackEnd/Core/ZZZZ-BA-Download-Contract.js'),'utf8');

function harness({session={username:'alice',ulp:'ULP Toboali'},bytes=[1,2,3]}={}){
  const state={drive:0,files:[]};
  const context={
    String,
    getSesiByToken:t=>t==='valid-token'?session:null,
    _bolehAksesMenu:()=>true,
    PAGE_FILE_ALIASES:{'SIE-BeritaAcara':'SIE-BeritaAcara'},
    HtmlService:{createHtmlOutputFromFile:name=>({getContent:()=>{state.files.push(name);return '<'+name+'>';}})},
    DriveApp:{getFileById:id=>{state.drive++;state.id=id;return {getBlob:()=>({getBytes:()=>bytes,getContentType:()=>'application/pdf'}),getName:()=> 'BA-Test.pdf'};}},
    Utilities:{base64Encode:v=>Buffer.from(v).toString('base64')},
  };
  vm.createContext(context);vm.runInContext(src,context);return {context,state};
}

test('invalid session fails before Drive access',()=>{const h=harness({session:null});const r=h.context.unduhFileBa('bad','file-1');assert.equal(r.code,'SESSION_EXPIRED');assert.equal(h.state.drive,0);});
test('strict token-first contract rejects legacy one-argument call',()=>{const h=harness();const r=h.context.unduhFileBa('file-1');assert.equal(r.code,'SESSION_EXPIRED');assert.equal(h.state.drive,0);});
test('valid token downloads requested file with metadata',()=>{const h=harness();const r=h.context.unduhFileBa('valid-token','file-1');assert.equal(r.ok,true);assert.equal(h.state.id,'file-1');assert.equal(r.fileName,'BA-Test.pdf');assert.equal(r.mimeType,'application/pdf');assert.equal(r.base64,'AQID');});
test('oversized file is rejected',()=>{const big={length:12*1024*1024+1};const h=harness({bytes:big});const r=h.context.unduhFileBa('valid-token','file-1');assert.equal(r.code,'FILE_TOO_LARGE');});
test('BA page always appends WebFix after main page',()=>{const h=harness();const r=h.context.getPageContent('valid-token','SIE-BeritaAcara');assert.equal(r.success,true);assert.deepEqual(h.state.files,['SIE-BeritaAcara','Core/SIE-BeritaAcara-WebFix']);assert.match(r.html,/SIE-BeritaAcara-WebFix/);});
test('source contract is final assignment with strict signature',()=>{assert.match(src,/unduhFileBa\s*=\s*function\(token,fileId\)/);assert.doesNotMatch(src,/arguments\.length/);assert.match(src,/getSesiByToken[\s\S]*DriveApp\.getFileById/);});
