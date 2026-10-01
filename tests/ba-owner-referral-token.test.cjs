const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.resolve(__dirname,'../SiSi_BackEnd/Core/ZZZ-BA-OwnerId-Compat.js'),'utf8');
const TOKEN='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

function build(options={}){
  const rows=[]; const row=()=>Array(13).fill('');
  let a=row(); a[8]='AIR BARA'; a[7]='GI TOBOALI'; rows.push(a);
  let b=row(); b[0]='GI TOBOALI'; b[1]='07'; rows.push(b);
  let c=row(); c[3]='AIR BARA'; c[4]='13'; c[5]='16'; rows.push(c);
  let d=row(); d[9]='ACR AIR BARA - TB0001'; d[10]='01'; d[11]='FCO'; d[12]='AIR BARA'; rows.push(d);
  let guarded=0, opened=0;
  const ctx={
    BA_OWNER_SOURCE:{spreadsheetId:'x',sheetName:'OwnerId'},
    guard_:args=>{ guarded++; if(options.reject||args.length!==2||args[0]!==TOKEN) throw new Error('Sesi tidak ditemukan. Silakan login ulang.'); },
    _guardErrorAkses_:e=>/Sesi/.test(String(e&&e.message)),
    SpreadsheetApp:{openById:()=>{opened++; return {};}},
    _baResolveSheet_:()=>({getDataRange:()=>({getDisplayValues:()=>rows})}),
    _baKey_:v=>String(v??'').trim().toLowerCase().replace(/\s+/g,' '),
    _baText_:(r,i)=>i>=0&&i<r.length?String(r[i]??'').trim():''
  };
  vm.createContext(ctx); vm.runInContext(source,ctx);
  return {ctx,guarded:()=>guarded,opened:()=>opened};
}

test('token-first OwnerId lookup preserves filter payload',()=>{
  const c=build();
  const res=c.ctx.getOwnerIdDanExternalReference(TOKEN,{penyulang:'AIR BARA',section:'ACR AIR BARA - LBS AIR SAMPIK'});
  assert.equal(c.guarded(),1); assert.equal(res.found,true);
  assert.equal(res.ownerId,'07161301');
  assert.equal(res.externalReference,'SECTION - FCO - AIR BARA');
  assert.equal(res.referralId,res.externalReference);
});

test('legacy one-argument lookup is rejected before opening spreadsheet',()=>{
  const c=build();
  assert.throws(()=>c.ctx.getOwnerIdDanExternalReference({penyulang:'AIR BARA',section:'ACR AIR BARA'}),/Sesi tidak ditemukan/);
  assert.equal(c.opened(),0);
});

test('invalid session is rejected before opening spreadsheet',()=>{
  const c=build({reject:true});
  assert.throws(()=>c.ctx.getOwnerIdDanExternalReference(TOKEN,{penyulang:'AIR BARA',section:'ACR AIR BARA'}),/Sesi tidak ditemukan/);
  assert.equal(c.opened(),0);
});

// Exercise the actual Guard/P0 boundary, Main.html SisiRun transport and BA
// callback. Google services, sessions and DOM elements are mocked; these are
// not live Apps Script, browser or production Sheet acceptance tests.
const core=path.resolve(__dirname,'../SiSi_BackEnd/Core');
const read=name=>fs.readFileSync(path.join(core,name),'utf8');
const guardSource=read('Guard.js');
const p0Source=read('ZZZ-P0-BA-Mobile-Guards.js');
const flowSource=read('ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ-BA-Web-Create-Flow.js');
const mainHtml=read('Main.html');
const baHtml=fs.readFileSync(path.join(core,'../SIE-BeritaAcara.html'),'utf8');
const selection={penyulang:'AIR BARA',section:'ACR AIR BARA - LBS AIR SAMPIK'};
const plain=value=>JSON.parse(JSON.stringify(value));

function realBoundary(options={}){
  const c=build();
  vm.runInContext(guardSource,c.ctx);
  c.ctx.audit_=()=>{};
  c.ctx.getSesiByToken=value=>value===TOKEN&&!options.expired
    ?{username:'fixture',role:'Admin',ulp:options.ulp??'Toboali'}:null;
  if(options.wrapped!==false) vm.runInContext(p0Source,c.ctx);
  return c;
}

test('authenticated object and token-first filters give identical lookup results',()=>{
  const c=realBoundary();
  const request=Object.freeze({token:TOKEN,...selection});
  const res=c.ctx.getOwnerIdDanExternalReference(request);
  assert.equal(res.found,true);
  assert.equal(res.ownerId,'07161301');
  assert.equal(res.externalReference,'SECTION - FCO - AIR BARA');
  assert.equal(res.referralId,res.externalReference);
  assert.deepEqual(plain(res),plain(c.ctx.getOwnerIdDanExternalReference(TOKEN,selection)));
  assert.deepEqual(request,{token:TOKEN,...selection});
  assert.equal(c.opened(),2);
});

for(const wrapped of [false,true]){
  test(`missing, invalid and expired object tokens reject before Sheet reads (P0=${wrapped})`,()=>{
    for(const token of [undefined,'','invalid','11111111-1111-4111-8111-111111111111',TOKEN]){
      const c=realBoundary({wrapped,expired:token===TOKEN});
      assert.throws(()=>c.ctx.getOwnerIdDanExternalReference({token,...selection}),
        /Sesi (tidak|habis)/);
      assert.equal(c.opened(),0);
    }
  });
}

test('P0 still rejects sessions without ULP despite client-supplied ULP',()=>{
  const c=realBoundary({ulp:''});
  assert.throws(()=>c.ctx.getOwnerIdDanExternalReference({
    token:TOKEN,ulp:'ULP Toboali',...selection
  }),/belum terhubung ke ULP/);
  assert.equal(c.opened(),0);
});

test('missing selection reports the missing field without opening the Sheet',()=>{
  for(const [filter,expected] of [[{section:selection.section},/Penyulang/],
    [{penyulang:selection.penyulang},/Section/]]){
    const c=realBoundary();
    const res=c.ctx.getOwnerIdDanExternalReference({token:TOKEN,...filter});
    assert.equal(res.found,false);
    assert.match(res.message,expected);
    assert.equal(res.ownerId,'');
    assert.equal(res.externalReference,'');
    assert.equal(c.opened(),0);
  }
});

test('unmatched feeder or section never fabricates OwnerId or external reference',()=>{
  for(const filter of [{...selection,penyulang:'NO SUCH FEEDER'},
    {...selection,section:'NO SUCH SECTION'}]){
    const c=realBoundary();
    const res=c.ctx.getOwnerIdDanExternalReference({token:TOKEN,...filter});
    assert.equal(c.opened(),1);
    assert.equal(res.found,false);
    assert.equal(res.ownerId,'');
    assert.equal(res.externalReference,'');
    assert.match(res.message,/Komponen OwnerId belum lengkap/);
  }
});

test('token-first second filter remains authoritative; arrays are not filters',()=>{
  const c=realBoundary();
  assert.equal(c.ctx.getOwnerIdDanExternalReference(TOKEN,[]).found,false);
  assert.equal(c.ctx.getOwnerIdDanExternalReference({token:TOKEN,...selection},{}).found,false);
  assert.equal(c.opened(),0);
});

function between(text,start,end){
  const a=text.indexOf(start),b=text.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a,`source markers must exist: ${start}`);
  return text.slice(a,b);
}

function browserFixture(options={}){
  const c=realBoundary(options),calls=[],toasts=[],captured=[];
  const elements={};
  function el(id){return elements[id]||(elements[id]={value:''});}
  el('bagPenyulang').value=selection.penyulang;
  el('bagSection').value=selection.section;
  el('bagNomorTrafo').value='TB0001';
  el('bagTanggalBA').value='2026-10-01';
  el('bagJenisPekerjaan').value='Pengoperasian Trafo';
  function runner(success,failure){
    return {
      withSuccessHandler:fn=>runner(fn,failure),
      withFailureHandler:fn=>runner(success,fn),
      getOwnerIdDanExternalReference(...args){
        calls.push(plain(args));
        let result;
        try {result=c.ctx.getOwnerIdDanExternalReference(...args);}
        catch(error){if(failure) return failure(error); throw error;}
        if(success) success(result);
      }
    };
  }
  const ui=vm.createContext({
    google:{script:{run:runner()}},_getToken:()=>TOKEN,
    bagEl:el,_BAG:{foto:{},sumber:'Manual'},
    showToast:(message,type)=>toasts.push({message,type}),
    _baWebStart_:(payload,state,kind)=>captured.push({payload:plain(payload),kind})
  });
  const transport=between(mainHtml,'      var SISI_BUTUH_TOKEN =',
    '\n      })();')+'\n      })();';
  vm.runInContext(transport,ui);
  vm.runInContext(between(baHtml,'function bagIsiOwnerExternal(){',
    '// Set nilai Penyulang + Section'),ui);
  c.ctx.getPageContent=()=>({success:true,html:baHtml});
  vm.runInContext(flowSource,c.ctx);
  const served=c.ctx.getPageContent(TOKEN,'SIE-BeritaAcara').html;
  vm.runInContext(between(served,'function bagSimpan(){','function bagGeneratePdf(){'),ui);
  return {c,ui,el,calls,toasts,captured};
}

test('real BA form + SisiRun object token populate both fields and the create payload',()=>{
  const f=browserFixture();
  f.ui.bagIsiOwnerExternal();
  assert.equal(f.calls.length,1);
  assert.equal(f.calls[0].length,1,'SisiRun must keep the object-call contract');
  assert.deepEqual(f.calls[0][0],{...selection,token:TOKEN});
  assert.equal(f.el('bagOwnerId').value,'07161301');
  assert.equal(f.el('bagExternalRef').value,'SECTION - FCO - AIR BARA');
  assert.equal(f.ui._BAG.ownerWarn,'');
  assert.equal(f.toasts.length,0);
  f.ui.bagSimpan();
  assert.equal(f.captured.length,1);
  assert.equal(f.captured[0].kind,'gardu');
  assert.equal(f.captured[0].payload.phbTr.ownerId,'07161301');
  assert.equal(f.captured[0].payload.phbTr.externalRef,'SECTION - FCO - AIR BARA');
});

test('expired session surfaces lookup failure and never fills fabricated values',()=>{
  const f=browserFixture({expired:true});
  f.ui.bagIsiOwnerExternal();
  assert.equal(f.c.opened(),0);
  assert.equal(f.el('bagOwnerId').value,'');
  assert.equal(f.el('bagExternalRef').value,'');
  assert.equal(f.toasts.length,1);
  assert.match(f.toasts[0].message,/Sesi habis/);
});
