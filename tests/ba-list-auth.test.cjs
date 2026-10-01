'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','SiSi_BackEnd','Core','ZZZZ-BA-List-Auth.js'),'utf8');
function harness({session,switchingError,rows,switchingRows}={}){const counts={original:0,switching:0,sheets:0,helpers:0};let context;const original=filter=>{counts.original++;counts.sheets++;let merged=(rows||[]).slice();if(String(filter.peralatan||'').toLowerCase()!=='gardu'){try{const sw=context.getDataSwitching({});if(sw&&sw.ok)merged=merged.concat(sw.rows||[]);}catch(error){return{ok:false,message:'Error Berita Acara: '+error.message};}}merged.sort((a,b)=>String(b.tanggal||'').localeCompare(String(a.tanggal||'')));const status=String(filter.statusBA||'').toLowerCase();if(status)merged=merged.filter(r=>(r.baTtd?'selesai ttd':r.filePdfUrl?'proses ttd':'draft ba')===status);return{ok:true,rows:merged,total:merged.length};};context={getDataBeritaAcara:original,getPageContent:(token,page)=>({success:true,html:'<main>',sesi:{token}}),getDataSwitching(){counts.switching++;if(switchingError)throw new Error(switchingError);return{ok:true,rows:switchingRows||[]};},guard_(args){counts.helpers++;const f=args&&args[0],token=f&&f.token;if(token!=='valid-token')throw new Error(token?'Sesi habis atau tidak valid.':'Sesi tidak ditemukan.');if(!session)throw new Error('Sesi habis atau tidak valid.');if(!String(session.ulp||'').trim())throw new Error('Akun belum terhubung ke ULP.');return{sesi:session,ulp:session.ulp,token};},_guardErrorAkses_:e=>/Sesi|Akses ditolak|ULP|bukan milik/i.test(String(e&&e.message))};vm.createContext(context);vm.runInContext(source,context);return{context,counts};}
const gardu=[{idBA:'G1',tanggal:'2026-03-02',baTtd:'',filePdfUrl:'pdf'},{idBA:'G2',tanggal:'2026-03-01',baTtd:'signed',filePdfUrl:'pdf'}],switching=[{idBA:'S1',tanggal:'2026-03-03',baTtd:'',filePdfUrl:''}];
test('no token rejected before reads',()=>{const h=harness({session:{ulp:'ULP Toboali'},rows:gardu});assert.throws(()=>h.context.getDataBeritaAcara({}),/Sesi tidak/);assert.equal(h.counts.original,0);});
test('invalid token rejected',()=>{const h=harness({session:{ulp:'ULP Toboali'}});assert.throws(()=>h.context.getDataBeritaAcara({token:'bad'}),/Sesi habis/);});
test('blank ULP rejected',()=>{const h=harness({session:{ulp:''}});assert.throws(()=>h.context.getDataBeritaAcara({token:'valid-token'}),/ULP/);});
test('Gardu filters preserved',()=>{const h=harness({session:{ulp:'ULP Toboali'},rows:gardu});const r=h.context.getDataBeritaAcara({token:'valid-token',ulp:'OTHER',peralatan:'Gardu',statusBA:'Proses TTD'});assert.equal(r.total,1);assert.equal(r.rows[0].idBA,'G1');});
test('Switching merge and sort preserved',()=>{const h=harness({session:{ulp:'ULP Toboali'},rows:gardu,switchingRows:switching});assert.deepEqual(h.context.getDataBeritaAcara({token:'valid-token'}).rows.map(x=>x.idBA),['S1','G1','G2']);});
test('Switching access errors rethrown',()=>{const h=harness({session:{ulp:'ULP Toboali'},rows:gardu,switchingError:'Akses ditolak'});assert.throws(()=>h.context.getDataBeritaAcara({token:'valid-token'}),/Akses ditolak/);});
test('ordinary errors preserve shape',()=>{const h=harness({session:{ulp:'ULP Toboali'},rows:gardu,switchingError:'sheet unavailable'});assert.deepEqual(h.context.getDataBeritaAcara({token:'valid-token'}),{ok:false,message:'Error Berita Acara: sheet unavailable'});});
test('BA page registers token injection',()=>{const h=harness({session:{ulp:'ULP Toboali'}}),r=h.context.getPageContent('valid-token','SIE-BeritaAcara');assert.match(r.html,/getDataBeritaAcara/);assert.match(r.html,/SISI_BUTUH_TOKEN/);});

// Execute real Main transport, baCari, both legacy readers, and final auth
// boundaries. Only GAS services/session storage, DOM and RPC transport are mocks.
// No page-loader registration script is run: static Main registration must work.
const backend=path.join(__dirname,'..','SiSi_BackEnd');
const read=file=>fs.readFileSync(path.join(backend,file),'utf8').replace(/\r\n?/g,'\n');
const sessionToken='11111111-1111-4111-8111-111111111111';
const json=value=>JSON.parse(JSON.stringify(value));
function declaredFunction(text,name){
  const start=text.indexOf('function '+name+'('),end=text.indexOf('\n}',start);
  assert.ok(start>=0&&end>start,'real declaration available: '+name);
  return text.slice(start,end+2);
}
function searchFixture(options={}){
  const logs=[],calls=[],nestedCalls=[],reads=[];
  let active=options.active!==false;
  const session={username:'fixture',role:options.role||'Admin',
    ulp:options.ulp===undefined?'Toboali':options.ulp,kodeUlp:options.kodeUlp||''};
  const ctx={
    console:{log:message=>logs.push(String(message))},
    Logger:{log:message=>logs.push(String(message))},
    PropertiesService:{getScriptProperties:()=>({getProperty:()=>null})},
    getSesiByToken:token=>active&&token===sessionToken?session:null,
    getPageContent:()=>({success:true,html:'<main></main>'}),
    SpreadsheetApp:{openById:()=>({getSheetByName:name=>({
      getDataRange:()=>({getValues:()=>{
        reads.push(name);
        if(name==='Rekap Gardu'&&options.revokeAfterGardu)active=false;
        const rows=name==='Rekap Gardu'?garduValues:switchingValues;
        return rows.map(row=>row.slice());
      }})
    })})}
  };
  vm.createContext(ctx);
  vm.runInContext(read('Core/Guard.js'),ctx);
  vm.runInContext(read('Core/SIE-BA-Code.js'),ctx);
  const header=Array(90).fill('');
  const col=letter=>ctx._baColLetterToIndex_(letter);
  for(const [letter,label] of Object.entries({
    A:'idBA',B:'Nomor Trafo',C:'Tanggal BA',D:'Jenis Pekerjaan',
    E:'Peralatan',L:'Penyulang',M:'Section',CJ:'ULP'
  }))header[col(letter)]=label;
  const garduRow=Array(90).fill('');
  for(const [letter,value] of Object.entries({
    A:'G1',B:'PY0240',C:'2026-09-15',D:'Pengoperasian Trafo',
    E:'Gardu',L:'Penyulang Fixture',M:'Section Fixture',CJ:'ULP Toboali',
    CK:'https://example.invalid/gardu.pdf'
  }))garduRow[col(letter)]=value;
  const garduValues=[header,garduRow];
  const swHeader=Array(42).fill(''),swRow=Array(42).fill('');
  swHeader[col('AI')]='idBA';swHeader[col('F')]='Nama Switching';
  swHeader[col('AP')]='ULP';
  for(const [letter,value] of Object.entries({
    B:'2026-09-20',D:'Pengoperasian Trafo',F:'PY0240-SW',
    G:'Penyulang Fixture',H:'Section Fixture',AI:'S1',AP:'Toboali'
  }))swRow[col(letter)]=value;
  const switchingValues=[swHeader,swRow];
  const legacySwitching=ctx.getDataSwitching;
  ctx.getDataSwitching=function(filter){
    nestedCalls.push(json(filter));
    if(options.switchingError)throw new Error(options.switchingError);
    return legacySwitching.apply(this,arguments);
  };
  for(const file of [
    'Core/ZZZ-P0-BA-Mobile-Guards.js',
    'Core/ZZZZ-BA-List-Auth.js',
    'Core/ZZZZZZZZZZ-BA-Same-ULP-Auth.js',
    'Core/ZZZZZZZZZZZ-BA-Row-Ownership.js'
  ])vm.runInContext(read(file),ctx,{filename:file});
  const savedSwitching=ctx.getDataSwitching;
  const elements={};
  for(const [name,value] of Object.entries({
    baKataKunciPeralatan:' py0240 ',baTglDari:'2026-09-01',
    baTglSampai:'2026-10-01',baJenis:'Pengoperasian Trafo',
    baPeralatan:options.peralatan===undefined?'Gardu':options.peralatan,
    baStatusBA:options.statusBA||'',baInfo:'',baBody:'',baBtnCari:''
  }))elements[name]={value,textContent:'',innerHTML:'',disabled:false};
  function runner(success,failure){
    return new Proxy({},{
      get(_,name){
        if(name==='withSuccessHandler')return fn=>runner(fn,failure);
        if(name==='withFailureHandler')return fn=>runner(success,fn);
        if(name==='withUserObject')return()=>runner(success,failure);
        return(...args)=>{
          calls.push({name,args:json(args)});
          let result;
          try{
            result=name==='doLogin'?{ok:true}:ctx[name](...args);
          }catch(error){
            if(failure){failure(error);return;}
            throw error;
          }
          if(success)success(result);
          return result;
        };
      }
    });
  }
  const client={
    google:{script:{run:runner()}},
    _getToken:()=>options.clientToken===undefined?sessionToken:options.clientToken,
    _BA:{loading:false,rows:[]},_baSearchToken:0,_baSearchTimer:null,
    baEl:name=>elements[name],baEsc:value=>String(value),
    baSetLoading(value){client._BA.loading=!!value;},
    baRender(){client.rendered=true;},
    setTimeout:()=>1,clearTimeout(){},showToast(){}
  };
  vm.createContext(client);
  const main=read('Core/Main.html');
  const start=main.indexOf('var SISI_BUTUH_TOKEN = [');
  const end=main.indexOf('return proxy;\n      })();',start);
  assert.ok(start>=0&&end>start,'Main transport block available');
  vm.runInContext(main.slice(start,end+'return proxy;\n      })();'.length),client);
  vm.runInContext(declaredFunction(read('SIE-BeritaAcara.html'),'baCari'),client);
  return{ctx,client,elements,calls,nestedCalls,reads,logs,savedSwitching};
}
for(const ulp of ['Toboali',' ULP  Toboali ']){
  test('real Gardu baCari sends session without loader registration: '+ulp,()=>{
    const f=searchFixture({ulp,statusBA:'Proses TTD'});
    f.client.baCari();
    assert.equal(f.client.rendered,true);
    assert.deepEqual(json(f.client._BA.rows).map(row=>row.idBA),['G1']);
    assert.deepEqual(f.calls[0],{name:'getDataBeritaAcara',args:[{
      kataKunciPeralatan:'py0240',tglDari:'2026-09-01',tglSampai:'2026-10-01',
      jenisPekerjaan:'Pengoperasian Trafo',peralatan:'Gardu',
      statusBA:'Proses TTD',token:sessionToken
    }]});
    assert.deepEqual(f.reads,['Rekap Gardu']);
    assert.equal(f.nestedCalls.length,0);
    assert.equal(f.client._BA.loading,false);
  });
}
test('real all-equipment search forwards outer session to guarded Switching',()=>{
  const f=searchFixture({peralatan:''});
  f.client.baCari();
  assert.equal(f.client.rendered,true);
  assert.deepEqual(json(f.client._BA.rows).map(row=>row.idBA),['S1','G1']);
  assert.deepEqual(f.nestedCalls,[{kataKunci:'py0240',tglDari:'2026-09-01',
    tglSampai:'2026-10-01',jenisPekerjaan:'Pengoperasian Trafo',token:sessionToken}]);
  assert.deepEqual(f.reads,['Rekap Gardu','Rekap Switching']);
  assert.equal(f.ctx.getDataSwitching,f.savedSwitching);
  assert.doesNotMatch(JSON.stringify(f.client._BA.rows)+f.logs.join(''),new RegExp(sessionToken));
});
test('real Switching-only search and status filter retain results',()=>{
  const f=searchFixture({peralatan:'Switching',statusBA:'Draft BA'});
  f.client.baCari();
  assert.equal(f.client.rendered,true);
  assert.deepEqual(json(f.client._BA.rows).map(row=>row.idBA),['S1']);
});
test('Main injects token on standalone Switching without mutating caller filter',()=>{
  const f=searchFixture();
  const filter=Object.freeze({kataKunci:'py0240'});
  const result=f.client.SisiRun.getDataSwitching(filter);
  assert.equal(result.ok,true);
  assert.equal(result.rows[0].idBA,'S1');
  assert.deepEqual(filter,{kataKunci:'py0240'});
  assert.equal(f.calls[0].args[0].token,sessionToken);
});
test('nested filter is copied and only authenticated outer token is forwarded',()=>{
  const f=searchFixture();
  const nested=Object.freeze({kataKunci:'py0240',token:'untrusted-inner-token'});
  f.ctx.originalgetDataBeritaAcara=()=>f.ctx.getDataSwitching(nested);
  const outer=Object.freeze({token:sessionToken,peralatan:'Switching'});
  const result=f.ctx.getDataBeritaAcara(outer);
  assert.equal(result.ok,true);
  assert.equal(f.nestedCalls[0].token,sessionToken);
  assert.deepEqual(nested,{kataKunci:'py0240',token:'untrusted-inner-token'});
  assert.deepEqual(outer,{token:sessionToken,peralatan:'Switching'});
  assert.equal(f.ctx.getDataSwitching,f.savedSwitching);
});
for(const options of [
  {clientToken:'',error:/Sesi tidak ditemukan/},
  {clientToken:'expired-token',error:/Sesi habis/},
  {active:false,error:/Sesi habis/},
  {ulp:'',error:/ULP/},
  {ulp:'ULP Lain',role:'Super User',error:/hanya tersedia untuk ULP Toboali/}
]){
  test('real search rejects invalid authentication/ownership before reads: '+JSON.stringify(options),()=>{
    const f=searchFixture(options);
    f.client.baCari();
    assert.match(f.elements.baBody.innerHTML,options.error);
    assert.equal(f.client.rendered,undefined);
    assert.deepEqual(f.reads,[]);
    assert.deepEqual(f.nestedCalls,[]);
    assert.equal(f.ctx.getDataSwitching,f.savedSwitching);
    assert.equal(f.client._BA.loading,false);
  });
}
test('payload ULP cannot override a foreign authenticated session',()=>{
  const f=searchFixture({ulp:'ULP Lain'});
  assert.throws(()=>f.ctx.getDataBeritaAcara({token:sessionToken,ulp:'Toboali'}),/ULP Toboali/);
  assert.deepEqual(f.reads,[]);
});
test('expired session at nested guard is rethrown despite legacy swallowed error',()=>{
  const f=searchFixture({peralatan:'',revokeAfterGardu:true});
  f.client.baCari();
  assert.match(f.elements.baBody.innerHTML,/Sesi habis/);
  assert.equal(f.client.rendered,undefined);
  assert.deepEqual(f.reads,['Rekap Gardu']);
  assert.equal(f.ctx.getDataSwitching,f.savedSwitching);
  assert.throws(()=>f.ctx.getDataSwitching({}),/Sesi tidak ditemukan/);
});
test('nested access denial is not converted to partial successful results',()=>{
  const f=searchFixture({peralatan:'',switchingError:'Akses ditolak'});
  f.client.baCari();
  assert.match(f.elements.baBody.innerHTML,/Akses ditolak/);
  assert.equal(f.client.rendered,undefined);
  assert.equal(f.ctx.getDataSwitching,f.savedSwitching);
  assert.throws(()=>f.ctx.getDataSwitching({}),/Sesi tidak ditemukan/);
});
test('ordinary legacy Switching error keeps existing result shape and restores wrapper',()=>{
  const f=searchFixture({peralatan:'',switchingError:'fixture sheet unavailable'});
  f.client.baCari();
  assert.equal(f.client.rendered,true);
  assert.deepEqual(json(f.client._BA.rows).map(row=>row.idBA),['G1']);
  assert.equal(f.ctx.getDataSwitching,f.savedSwitching);
  assert.throws(()=>f.ctx.getDataSwitching({}),/Sesi tidak ditemukan/);
});
test('successful outer call leaves standalone Switching authentication intact',()=>{
  const f=searchFixture({peralatan:''});
  f.client.baCari();
  assert.equal(f.client.rendered,true);
  const count=f.reads.length;
  assert.throws(()=>f.ctx.getDataSwitching({}),/Sesi tidak ditemukan/);
  assert.equal(f.reads.length,count);
  assert.equal(f.ctx.getDataSwitching,f.savedSwitching);
});
test('outer reader throw also restores Switching without keeping session context',()=>{
  const f=searchFixture();
  f.ctx.originalgetDataBeritaAcara=()=>{throw new Error('fixture outer failure');};
  assert.throws(()=>f.ctx.getDataBeritaAcara({token:sessionToken}),/fixture outer failure/);
  assert.equal(f.ctx.getDataSwitching,f.savedSwitching);
  assert.throws(()=>f.ctx.getDataSwitching({}),/Sesi tidak ditemukan/);
});
test('Main login exemption and preexisting invalid token remain unchanged',()=>{
  const f=searchFixture();
  f.client.SisiRun.doLogin('fixture-user','fixture-password');
  assert.deepEqual(f.calls[0],{name:'doLogin',args:['fixture-user','fixture-password']});
  assert.throws(()=>f.client.SisiRun.getDataBeritaAcara({token:'expired-token'}),/Sesi habis/);
  assert.equal(f.calls[1].args[0].token,'expired-token');
  assert.deepEqual(f.reads,[]);
});
