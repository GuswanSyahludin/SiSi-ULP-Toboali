'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test'),vm=require('node:vm');
const root=path.join(__dirname,'..','SiSi_BackEnd','Core');
const source=fs.readFileSync(path.join(root,'ZZZZZZZZZZZZZZ-BA-Photo-Upload-Auth.js'),'utf8');
const helper=fs.readFileSync(path.join(root,'ZZZZZZZZZZZZ-Stage4-Sheet-Write-Safety.js'),'utf8');
function harness(){const calls=[],rows=[];const context={uploadFotoBeritaAcara(request){calls.push({kind:'upload',request});return{ok:true};},updateFotoBeritaAcaraDetail(request){calls.push({kind:'update',request});return{ok:true};},_stage3RequireBaRow_(args,idBA,action){rows.push({idBA,action});}};vm.createContext(context);vm.runInContext(helper,context);vm.runInContext(source,context);return{context,calls,rows};}
test('photo upload checks row ownership and sanitizes filename and URL',()=>{const h=harness();const r=h.context.uploadFotoBeritaAcara({token:'t',idBA:'BA-1',fileName:'=evil.jpg',dataUrl:'data:image/jpeg;base64,AA==',meta:{url:'@url'}});assert.equal(r.ok,true);assert.deepEqual(h.rows,[{idBA:'BA-1',action:'BA_PHOTO_UPLOAD_ROW_OWNERSHIP'}]);assert.equal(h.calls[0].request.fileName,"'=evil.jpg");assert.equal(h.calls[0].request.meta.url,"'@url");assert.equal(Object.prototype.hasOwnProperty.call(h.calls[0].request,'token'),false);});
test('photo detail update checks row ownership and sanitizes nested payload',()=>{const h=harness();const r=h.context.updateFotoBeritaAcaraDetail({token:'t',idBA:'BA-2',slot:'foto',fileName:'@name.jpg',meta:{url:'=url'}});assert.equal(r.ok,true);assert.deepEqual(h.rows,[{idBA:'BA-2',action:'BA_PHOTO_UPDATE_ROW_OWNERSHIP'}]);assert.equal(h.calls[0].request.fileName,"'@name.jpg");assert.equal(h.calls[0].request.meta.url,"'=url");});
test('photo upload rejects missing idBA before writer',()=>{const h=harness();const r=h.context.uploadFotoBeritaAcara({token:'t',fileName:'x.jpg'});assert.equal(r.ok,false);assert.match(r.message,/idBA/);assert.equal(h.calls.length,0);});

// Behavioral create/upload/link tests use the REAL three legacy save functions,
// generators, P0 installer, row resolver and served HTML. Google services only
// are mocked. These are not staging/Drive ACL/real-device acceptance tests.
const crypto = require('node:crypto');
const flowSource = fs.readFileSync(path.join(root, 'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ-BA-Web-Create-Flow.js'), 'utf8');
const baHtml = fs.readFileSync(path.join(root, '..', 'SIE-BeritaAcara.html'), 'utf8');
const token = 'test-session', requestId = '123456781234123412341234567890ab';
const photo = 'data:image/jpeg;base64,' + Buffer.from([255,216,255,224,1,2,255,217]).toString('base64');
function fixture(options = {}) {
  const properties = new Map(), files = [], writes = [], sheets = {};
  let locked = false, flushes = 0;
  function sheet(name, headers) {
    const values = [headers.slice()], notes = {}, formulas = {};
    const width = headers.length;
    function range(r, c, nr = 1, nc = 1) {
      const matrix = read => Array.from({length:nr}, (_,y) => Array.from({length:nc}, (_,x) => read(r+y,c+x)));
      return {
        getValues: () => matrix((y,x) => (values[y-1] || [])[x-1] ?? ''),
        getValue: () => (values[r-1] || [])[c-1] ?? '',
        getNotes: () => matrix((y,x) => notes[y+':'+x] || ''),
        getNote: () => notes[r+':'+c] || '',
        getFormulas: () => matrix((y,x) => formulas[y+':'+x] || ''),
        getFormula: () => formulas[r+':'+c] || '',
        setNote(value) { if(options.noteFails) throw Error('note failed'); notes[r+':'+c]=value; return this; },
        setNumberFormat() { return this; },
        setValue(value) {
          assert.equal(locked,true,'every Sheet write holds the script lock');
          if(options.writeFails) throw Error('write failed');
          if(options.photoWriteFails && String(value).startsWith('https://drive.google.com/')) throw Error('link failed');
          while(values.length<r) values.push(Array(width).fill(''));
          values[r-1][c-1]=value; writes.push([name,r,c,value]); return this;
        },
        setValues(rows) { rows.forEach((row,y)=>row.forEach((v,x)=>range(r+y,c+x).setValue(v))); return this; }
      };
    }
    return sheets[name] = {
      values, notes, formulas, getRange:range, getName:()=>name,
      getDataRange:()=>range(1,1,values.length,width),
      getLastColumn:()=>width, getLastRow:()=>values.length
    };
  }
  const folder = {
    getSharingAccess:()=>options.publicFolder?'ANYONE':'PRIVATE',
    getFilesByName(name) { let i=0; const selected=files.filter(f=>f.name===name); return {hasNext:()=>i<selected.length,next:()=>selected[i++]}; },
    createFile(blob) {
      assert.equal(locked,true);
      if(options.uploadFails) throw Error('upload failed');
      const id='file_'+(files.length+1), file={ name:blob.name, bytes:blob.bytes, access:'PRIVATE',
        getId:()=>id, getUrl:()=>`https://drive.google.com/file/d/${id}/view`,
        getSize:()=>file.bytes.length, getBlob:()=>({getBytes:()=>file.bytes}), isTrashed:()=>false,
        setSharing(access) { if(options.aclFails) throw Error('ACL failed'); file.access=access; },
        getSharingAccess:()=>file.access };
      files.push(file);
      if(options.afterCreate) options.afterCreate();
      return file;
    }
  };
  const ctx = {
    console, Date, JSON, Math,
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>properties.get(k)||null,setProperty:(k,v)=>properties.set(k,v),deleteProperty:k=>properties.delete(k)})},
    Utilities:{
      DigestAlgorithm:{SHA_256:'sha256'},
      computeDigest:(_alg,value)=>[...crypto.createHash('sha256').update(typeof value==='string'?value:Buffer.from(value)).digest()],
      base64Decode:s=>[...Buffer.from(s,'base64')],
      newBlob:(bytes,mime,name)=>({bytes,mime,name}),
      formatDate:()=> '2026-09-30'
    },
    SpreadsheetApp:{
      openById:()=>({getSheetByName:name=>sheets[name]||null,getSheets:()=>Object.values(sheets)}),
      flush() { flushes++; }
    },
    DriveApp:{Access:{PRIVATE:'PRIVATE'},Permission:{VIEW:'VIEW'}},
    guard_(args) {
      if(!args[0] || args[0].token!==token || options.expired) throw Error('Sesi habis');
      return {username:options.user||'alice',ulp:options.ulp??'ULP Toboali',sesi:{}};
    },
    audit_(){},
    withLock_(fn) {
      if(options.lockBusy) throw Error('LOCK_SIBUK');
      locked=true;
      if(options.onLock) options.onLock();
      try{return fn();}finally{locked=false;}
    },
    getPageContent:()=>({success:true,html:baHtml})
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'SIE-BA-Code.js'),'utf8'),ctx);
  const headers=Array(100).fill('');
  Object.entries({B:'Nomor Trafo',C:'Tanggal BA',D:'Tanggal Pekerjaan',E:'Jenis Pekerjaan',L:'Penyulang',CD:'idBA',CE:'NO BA Full',CF:'Mengetahui',CH:'Jabatan Mengetahui',CI:'ULP'}).forEach(([col,v])=>headers[ctx._baColLetterToIndex_(col)]=v);
  sheet('Rekap Gardu',headers);
  sheet('Rekap Switching',ctx._swHeaderLabels_().concat('ULP'));
  ctx._baPhotoFolder_=ctx._swPhotoFolder_=()=>folder;
  vm.runInContext(fs.readFileSync(path.join(root,'ZZZ-P0-BA-Mobile-Guards.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'ZZZZZZZZ-BA-Save-Auth.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'ZZZZZZZZZZZ-BA-Row-Ownership.js'),'utf8'),ctx);
  vm.runInContext(helper,ctx);
  vm.runInContext(source,ctx);
  vm.runInContext(flowSource,ctx);
  function request(kind='gardu') {
    return {token,requestId,kind,payload:{
      jenisPekerjaan:kind==='pemeriksaan'?'Pemeriksaan Trafo':kind==='switching'?'Pengoperasian Switching':'Pengoperasian Trafo',
      identitas:{nomorTrafo:'TB0001',tanggalBA:'2026-09-30'},awal:{namaSwitching:'LBS-1'},
      trafoAwal:{merk:' \n=EVIL()'},phbTr:{},pemeriksa:{},foto:{forged:{url:'https://attacker.invalid'}}
    }};
  }
  function upload(result,kind='gardu',extra={}) {
    return ctx.uploadFotoDraftBaWeb({token,requestId,idBA:result.idBA,
      slot:kind==='switching'?'nameplateAwal':kind==='pemeriksaan'?'megger1':'nameplateTrafoAwal',dataUrl:photo,...extra});
  }
  return {ctx,options,properties,files,writes,sheets,request,upload,get flushes(){return flushes;}};
}
for(const kind of ['gardu','pemeriksaan','switching']) {
  test(`BA ${kind}: server ID, same-ULP row, upload/link and lost-response retry create no duplicates`,()=>{
    const f=fixture(), req=f.request(kind), saved=f.ctx.simpanDraftBaWeb(req);
    assert.equal(saved.ok,true); assert.match(saved.idBA,/^BA-(GRD|SWT)-TBL-202609-001$/);
    const count=f.writes.length, again=f.ctx.simpanDraftBaWeb(req);
    assert.equal(again.idBA,saved.idBA); assert.equal(f.writes.length,count);
    const uploaded=f.upload(saved,kind); assert.equal(uploaded.ok,true); assert.equal(f.files.length,1);
    assert.equal(f.upload(saved,kind).fileId,uploaded.fileId); assert.equal(f.files.length,1);
    const checked=f.ctx._stage3RequireBaRow_([req],saved.idBA);
    assert.ok(checked.row.values.includes(uploaded.url)); assert.equal(f.properties.size,0);
    if(kind!=='switching') assert.equal(checked.row.values[6],"' \n=EVIL()");
    assert.equal(f.ctx.uploadFotoBeritaAcara({token}).ok,false,'old missing-id guard still enforced');
  });
}
test('anonymous, expired and foreign ULP including Super-style session cannot create',()=>{
  for(const opts of [{expired:true},{ulp:''},{ulp:'ULP Other'}]) {
    const f=fixture(opts); assert.throws(()=>f.ctx.simpanDraftBaWeb(f.request()));
    assert.equal(f.writes.length,0); assert.equal(f.files.length,0);
  }
  const f=fixture(); assert.throws(()=>f.ctx.simpanDraftBaWeb({...f.request(),token:''})); assert.equal(f.writes.length,0);
});
test('session/ULP rechecked after waiting for lock',()=>{
  const f=fixture(); f.options.onLock=()=>{f.options.ulp='ULP Other';};
  assert.throws(()=>f.ctx.simpanDraftBaWeb(f.request())); assert.equal(f.writes.length,0);
});
test('missing/duplicate ULP headers and prepared/formula rows fail before write',()=>{
  for(const mutate of [
    s=>{s.values[0][86]='';},s=>{s.values[0][87]='ULP';},
    s=>{s.formulas['2:1']='=ROW()';},s=>{s.values.push(Array(100).fill(''));s.values[1][0]='prepared';}
  ]) {
    const f=fixture(); mutate(f.sheets['Rekap Gardu']);
    assert.throws(()=>f.ctx.simpanDraftBaWeb(f.request())); assert.equal(f.writes.length,0);
  }
});
test('create success needs no photos and no client idBA; payload URLs are ignored',()=>{
  const f=fixture(),req=f.request();req.payload.idBA='ATTACKER-ID';
  const res=f.ctx.simpanDraftBaWeb(req); assert.notEqual(res.idBA,'ATTACKER-ID');
  assert.equal(f.files.length,0);assert.ok(!f.writes.some(w=>String(w[3]).includes('attacker.invalid')));
});
test('changed payload and other account cannot replay or upload a draft',()=>{
  const f=fixture(),req=f.request(),res=f.ctx.simpanDraftBaWeb(req);
  req.payload.identitas.nomorTrafo='CHANGED'; assert.throws(()=>f.ctx.simpanDraftBaWeb(req),/retry/);
  f.options.user='bob';assert.throws(()=>f.ctx.simpanDraftBaWeb(f.request()),/akun/);
  assert.throws(()=>f.upload(res),/akun/);assert.equal(f.files.length,0);
});
test('foreign, blank, unknown and duplicate row identity deny photo side effects',()=>{
  for(const mode of ['foreign','blank','unknown','duplicate']) {
    const f=fixture(),res=f.ctx.simpanDraftBaWeb(f.request()),s=f.sheets['Rekap Gardu'];
    if(mode==='foreign')s.values[1][86]='ULP Other';
    if(mode==='blank')s.values[1][86]='';
    if(mode==='unknown')res.idBA='BA-MISSING';
    if(mode==='duplicate')s.values.push(s.values[1].slice());
    assert.throws(()=>f.upload(res));assert.equal(f.files.length,0);
  }
});
test('partial legacy save and failed receipt persist a latch, never append on retry',()=>{
  for(const opts of [{writeFails:true},{noteFails:true}]) {
    const f=fixture(opts),req=f.request();assert.throws(()=>f.ctx.simpanDraftBaWeb(req));
    const count=f.writes.length;f.options.writeFails=f.options.noteFails=false;
    assert.throws(()=>f.ctx.simpanDraftBaWeb(req),/belum terverifikasi/);assert.equal(f.writes.length,count);
  }
});
test('upload failure and partial link write retry against same BA and same file',()=>{
  const f=fixture(),res=f.ctx.simpanDraftBaWeb(f.request());
  f.options.uploadFails=true;assert.throws(()=>f.upload(res));assert.equal(f.files.length,0);
  f.options.uploadFails=false;f.options.photoWriteFails=true;assert.throws(()=>f.upload(res));assert.equal(f.files.length,1);
  f.options.photoWriteFails=false;assert.equal(f.upload(res).ok,true);assert.equal(f.files.length,1);
});
test('crash after Drive creation/ACL failure reuses deterministic file before receipt',()=>{
  const f=fixture(),res=f.ctx.simpanDraftBaWeb(f.request());
  f.options.aclFails=true;assert.throws(()=>f.upload(res));assert.equal(f.files.length,1);
  f.options.aclFails=false;assert.equal(f.upload(res).ok,true);assert.equal(f.files.length,1);
});
test('public folder, invalid slot, forged type and changed retry image are rejected',()=>{
  const f=fixture(),res=f.ctx.simpanDraftBaWeb(f.request());
  f.options.publicFolder=true;assert.throws(()=>f.upload(res),/privat/);assert.equal(f.files.length,0);
  f.options.publicFolder=false;
  for(const extra of [{slot:'__proto__'},{dataUrl:'data:image/svg+xml;base64,AA=='},{dataUrl:'data:image/png;base64,YWJj'}]) assert.throws(()=>f.upload(res,'gardu',extra));
  f.upload(res);assert.throws(()=>f.upload(res,'gardu',{dataUrl:'data:image/jpeg;base64,'+Buffer.from([255,216,255,224,3,4,255,217]).toString('base64')}));assert.equal(f.files.length,1);
});
test('ownership changes during Drive upload block link and receipt writes',()=>{
  const f=fixture(),res=f.ctx.simpanDraftBaWeb(f.request());const count=f.writes.length;
  f.options.afterCreate=()=>{f.sheets['Rekap Gardu'].values[1][86]='ULP Other';};
  assert.throws(()=>f.upload(res));assert.equal(f.writes.length,count);
});
test('sequence overflow is rejected rather than wrapping to 000',()=>{
  const f=fixture(),s=f.sheets['Rekap Gardu'];s.values.push(Array(100).fill(''));
  s.values[1][81]='BA-GRD-TBL-202609-999';s.values[1][86]='ULP Toboali';
  assert.throws(()=>f.ctx.simpanDraftBaWeb(f.request()),/batas/);assert.equal(f.writes.length,0);
});
test('served page preserves payload builders but removes upload-before-create callers',()=>{
  const f=fixture(),served=f.ctx.getPageContent(token,'SIE-BeritaAcara').html;
  for(const match of served.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)) new vm.Script(match[1]);
  assert.equal((served.match(/function bagUploadFoto\(slot,input\)/g)||[]).length,1);
  assert.ok(served.includes("_baWebStart_(payload,_BAG"));
  assert.ok(served.includes("_baWebStart_(payload,_SW"));
  assert.ok(!served.includes('bagUploadFotoSaatSimpan(payload,function()'));
  assert.ok(!served.includes('swUploadFotoSaatSimpan(payload,function()'));
  assert.throws(()=>f.ctx._baWebPatchPage_('<p>changed</p>'),/Kontrak/);
});
function browserFixture() {
  const calls=[],errors=[],elements={};
  for(const prefix of ['bag','sw'])for(const suffix of ['BtnSimpan','BtnPdf','NomorBA'])elements[prefix+suffix]={disabled:suffix==='BtnPdf',setAttribute(k,v){this[k]=v;}};
  const ctx={console,Uint8Array,JSON,Array,Math,document:{getElementById:id=>elements[id]||null},
    crypto:{getRandomValues:a=>{a.fill(1);return a;}},showToast:(m,t)=>errors.push([m,t]),
    _BAG:{foto:{}},_SW:{foto:{}},bagResetForm(){},swResetForm(){},
    FileReader:class{readAsDataURL(){this.onload({target:{result:photo}});}},
    SisiRun:{withSuccessHandler(success){return{withFailureHandler(failure){return new Proxy({}, {get:(_,method)=>request=>calls.push({method,request,success,failure})});}};}}
  };
  ctx.window=ctx;vm.createContext(ctx);
  const f=fixture();vm.runInContext('('+f.ctx._baWebClient_.toString()+')()',ctx);
  return{ctx,calls,errors,elements};
}
test('browser calls create before photo, blocks double-click, waits for URL receipt before PDF',()=>{
  const f=browserFixture();f.ctx._BAG.foto.nameplateTrafoAwal={file:{type:'image/jpeg',size:8}};const payload={jenisPekerjaan:'Pengoperasian Trafo'};
  f.ctx._baWebStart_(payload,f.ctx._BAG,'gardu','bag');f.ctx._baWebStart_(payload,f.ctx._BAG,'gardu','bag');
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].method,'simpanDraftBaWeb');
  f.calls[0].success({ok:true,idBA:'SERVER-1'});assert.equal(f.calls[1].method,'uploadFotoDraftBaWeb');
  assert.equal(f.calls[1].request.idBA,'SERVER-1');assert.equal(f.elements.bagBtnPdf.disabled,true);
  f.calls[1].success({ok:true,idBA:'SERVER-1',slot:'nameplateTrafoAwal',fileId:'f',url:'u'});
  assert.equal(f.elements.bagBtnPdf.disabled,false);assert.equal(f.elements.bagBtnPdf['data-idba'],'SERVER-1');
});
test('browser retry preserves request ID and completed slot receipts; reset cannot silently duplicate a partial BA',()=>{
  const f=browserFixture();f.ctx._BAG.foto={nameplateTrafoAwal:{file:{type:'image/jpeg',size:8}},fotoFullGarduAwal:{file:{type:'image/jpeg',size:8}}};
  f.ctx._baWebStart_({},f.ctx._BAG,'gardu','bag');f.calls[0].success({ok:true,idBA:'SERVER-1'});
  f.calls[1].success({ok:true,idBA:'SERVER-1',slot:'nameplateTrafoAwal'});
  f.calls[2].failure(Error('timeout'));f.ctx.bagResetForm();assert.ok(f.ctx._BAG.baWebFlow);
  f.ctx._baWebStart_({},f.ctx._BAG,'gardu','bag');assert.equal(f.calls[3].request.requestId,f.calls[0].request.requestId);
  f.calls[3].success({ok:true,idBA:'SERVER-1'});assert.equal(f.calls[4].request.slot,'fotoFullGarduAwal');
});
test('browser stale-page callback and FileReader failure do not report success',()=>{
  const f=browserFixture();f.ctx._SW.foto.nameplateAwal={file:{type:'image/jpeg',size:8}};
  f.ctx._baWebStart_({},f.ctx._SW,'switching','sw');f.elements.swBtnSimpan={};
  f.calls[0].success({ok:true,idBA:'OLD'});assert.equal(f.calls.length,1);
  const g=browserFixture();g.ctx.FileReader=class{readAsDataURL(){this.onerror();}};
  g.ctx._BAG.foto.nameplateTrafoAwal={file:{type:'image/jpeg',size:8}};g.ctx._baWebStart_({},g.ctx._BAG,'gardu','bag');
  g.calls[0].success({ok:true,idBA:'SERVER-2'});assert.equal(g.elements.bagBtnPdf.disabled,true);
  assert.ok(g.errors.some(([m])=>m.includes('gagal dibaca')));
});
test('operation key cannot create again in the other equipment sheet',()=>{
  const f=fixture();f.ctx.simpanDraftBaWeb(f.request());const count=f.writes.length;
  assert.throws(()=>f.ctx.simpanDraftBaWeb(f.request('switching')),/retry/);assert.equal(f.writes.length,count);
});
test('browser rejects unsupported photos before any server draft is created',()=>{
  const f=browserFixture();f.ctx._BAG.foto.nameplateTrafoAwal={file:{type:'image/svg+xml',size:8}};
  f.ctx._baWebStart_({},f.ctx._BAG,'gardu','bag');assert.equal(f.calls.length,0);assert.ok(!f.ctx._BAG.baWebFlow);
});
