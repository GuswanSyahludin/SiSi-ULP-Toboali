'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const vm=require('node:vm'),{test}=require('node:test');
const os=require('node:os'),{spawnSync}=require('node:child_process');
const core=path.join(__dirname,'../SiSi_BackEnd/Core');
const read=name=>fs.readFileSync(path.join(core,name),'utf8');
const reportFile='ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ-Report-Write-Auth.js';
const today='2026-10-01', token='report-fixture-token';
// Actual Guard, P0, scheduler and T11 capability are executed.
// GAS services, report aggregators, legacy report helpers and session store
// are mocked. This is not a live Sheet or full builder aggregation test.
function fixture(options={}){
  let held=false,userHeld=false,userAttempts=0;
  const writes=[],logs=[],builds=[],props=new Map(),cache=[],events=[],sheetOpens=[];
  const headers=['No','Tanggal','Penyulang','Panjang kmS Inspeksi','Temuan','Eksekusi','Laporan UP3','Laporan UIW'];
  const rows=[headers,[1,today,'old feeder','4,1','old finding','old action','old up3','old uiw']];
  const formulas={};
  if(options.empty) rows.pop();
  if(options.duplicate) rows.push(rows[1].slice());
  if(options.badHeader)rows[0][6]='wrong';
  if(options.formula)formulas['2:7']='=fixture()';
  const scriptLock={
    waitLock(){if(options.lockFails)throw Error('fixture lock');held=true;},
    hasLock:()=>held,releaseLock(){held=false;}
  };
  const userLock={
    waitLock(){
      userAttempts++;
      if(options.userLockFails || options.ackLockFails&&userAttempts>1)throw Error('fixture queue lock');
      userHeld=true;
    },hasLock:()=>userHeld,releaseLock(){userHeld=false;}
  };
  const sh={
    getLastColumn:()=>8,getLastRow:()=>rows.length,
    getRange(r,c,nr=1,nc=1){
      return{
        getValues:()=>Array.from({length:nr},(_,i)=>
          Array.from({length:nc},(_,j)=>rows[r+i-1]?.[c+j-1]??'')),
        getFormulas:()=>Array.from({length:nr},(_,i)=>
          Array.from({length:nc},(_,j)=>formulas[(r+i)+':'+(c+j)]||'')),
        setNumberFormat(){assert.ok(held);},
        setValue(v){this.setValues([[v]]);},
        setValues(values){
          assert.ok(held,'all Sheet writes require script lock');
          if(options.writeFails)throw Error('fixture write failure');
          for(let i=0;i<nr;i++)for(let j=0;j<nc;j++)rows[r+i-1][c+j-1]=values[i][j];
          writes.push({r,c,nr,nc,values:JSON.parse(JSON.stringify(values))});
        }
      };
    }
  };
  const store={
    getProperty:k=>props.has(k)?props.get(k):null,
    setProperty(k,v){props.set(k,String(v));},
    deleteProperty(k){props.delete(k);}
  };
  const ctx={
    console:{log:x=>logs.push(x)},Logger:{log:x=>logs.push(String(x))},
    PropertiesService:{getScriptProperties:()=>store},
    LockService:{getScriptLock:()=>scriptLock,getUserLock:()=>userLock},
    CacheService:{getScriptCache:()=>({remove:key=>{
      if(options.cacheFails)throw Error('fixture cache');
      cache.push(key);
    }})},
    SpreadsheetApp:{openById:id=>{sheetOpens.push(id);return {};},flush(){}},SPREADSHEET_ID:'fixture-only',
    LH:{SHEET:'Teknik_Laporan Harian',ULP:options.configUlp??'Toboali',
      COL:{no:0,tanggal:1,penyulang:2,panjang:3,temuan:4,eksekusi:5,lapUp3:6,lapUiw:7}},
    _normTgl:v=>String(v),_lhToday:()=>today,
    _tglSudahDiarsip_:day=>day<='2026-09-29',
    _lhSheet:()=>sh,
    _lhEnsureRow(sheet,day){
      assert.ok(held);
      events.push('ensure');
      const i=rows.findIndex(row=>row[1]===day);
      if(i>=0)return i+1;
      rows.push([rows.length,day,'','','','','','']);
      return rows.length;
    },
    _lhC4aFromRow:v=>({penyulang:v[2],realisasi:v[3],temuan:v[4],eksekusi:v[5]}),
    _lapMobileCacheKey_:(ulp,day)=>'lapUp3Uiw_'+ulp+'_'+day,
    getSesiByToken:t=>t===token&&!options.expired?
      {username:'fixture',role:options.role??'Admin',ulp:options.ulp??'Toboali'}:null,
    buildLaporanUP3(day,ulp,opts){
      assert.ok(held);
      builds.push({kind:'up3',day,ulp,opts:JSON.parse(JSON.stringify(opts))});
      if(options.builderFails)throw Error('fixture builder');
      if(options.race)rows[1][2]='external edit';
      if(options.enqueueDuring)ctx.markLaporanDirty_(day);
      if(options.enqueueOther)ctx.markLaporanDirty_('2026-09-30');
      return 'UP3 '+day+' '+opts.c4a.penyulang;
    },
    buildLaporanWilayah(day,ulp,opts){
      builds.push({kind:'uiw',day,ulp,opts});
      if(options.uiwFails)throw Error('fixture uiw');
      return options.emptyBuild?'':'UIW '+day+' '+(opts.cuaca||'-');
    },
    simpanLaporanHarianWeb(){throw Error('legacy save should not run');},
    refreshLaporanHarian(){throw Error('legacy refresh should not run');},
    ensureLaporanHarianHariIni(){throw Error('legacy daily should not run');},
    drainLaporanDirty(){throw Error('legacy queue should not run');},
    drainLaporanDirtySafe(){throw Error('legacy safe queue should not run');},
    refreshLaporanHarianHariIni(){throw Error('legacy periodic should not run');},
    simpanMobileLaporanC4A(){throw Error('legacy mobile should not run');},
    apiRouter_:()=>({ok:true}),doPost:()=>({ok:true}),drainAntreanP0:()=>({ok:true}),
    prosesP0Yandal(){},prosesSwitchingYandal(){}
  };
  vm.createContext(ctx);
  for(const file of ['Guard.js','Trigger-Manager.js','ZZZZ-P0-Remaining-Guards.js',
    'ZZ-T11-Yandal-Watermark-ACL.js',reportFile]){
    vm.runInContext(read(file),ctx,{filename:file});
  }
  ctx.TRIGGER_SISI_TUGAS=[{fn:'drainLaporanDirtySafe',tiapMenit:1}];
  ctx.TRIGGER_SISI_HARIAN=['ensureLaporanHarianHariIni'];
  return {ctx,rows,writes,builds,logs,props,cache,events,formulas,sheetOpens,
    get held(){return held;},get userHeld(){return userHeld;},
    dirty:()=>JSON.parse(props.get('LAPORAN_DIRTY_DATES')||'{}')};
}
function request(extra={}){
  return {token,tanggal:today,ulp:'ULP Lain',c4a:{
    penyulang:'new feeder',realisasi:'4,1',temuan:'new finding',eksekusi:'new action'
  },cuaca:'Hujan',tindakLanjutGangguan:['fixture follow-up'],...extra};
}
test('web save builds both reports before one C4A/report write; fixed internal scope',()=>{
  const f=fixture();
  const r=f.ctx.simpanLaporanHarianWeb(request());
  assert.equal(r.ok,true);
  assert.deepEqual(f.writes.map(w=>[w.c,w.nc]),[[3,6]]);
  assert.equal(f.rows[1][3],'4,1');
  assert.equal(f.rows[1][6],'UP3 '+today+' new feeder');
  assert.equal(f.rows[1][7],'UIW '+today+' Hujan');
  assert.ok(f.builds.every(b=>b.ulp==='Toboali'));
  assert.deepEqual(f.builds[0].opts.tindakLanjutGangguan,['fixture follow-up']);
  assert.deepEqual(f.cache,['lapUp3Uiw_Toboali_'+today]);
  assert.equal(f.held,false);
});
test('mobile save preserves authenticated identity and C4A contract',()=>{
  const f=fixture();
  const r=f.ctx.simpanMobileLaporanC4A({token,tanggal:today,penyulang:'mobile',
    realisasi:'2,5',temuan:'1',eksekusi:'2'});
  assert.equal(r.ok,true);
  assert.deepEqual(f.rows[1].slice(2,6),['mobile','2,5','1','2']);
});
test('new row is created only after both builders succeed',()=>{
  const f=fixture({empty:true});
  assert.equal(f.ctx.simpanLaporanHarianWeb(request()).ok,true);
  assert.deepEqual(f.events,['ensure']);
  assert.equal(f.rows.length,2);
  assert.equal(f.rows[1][1],today);
});
for(const opts of [{builderFails:true},{uiwFails:true},{emptyBuild:true}]){
  test('failed build preserves existing C4A and reports: '+JSON.stringify(opts),()=>{
    const f=fixture(opts),before=JSON.stringify(f.rows);
    assert.throws(()=>f.ctx.simpanLaporanHarianWeb(request()));
    assert.equal(JSON.stringify(f.rows),before);
    assert.equal(f.writes.length,0);
    assert.equal(f.held,false);
  });
}
test('new report date is not appended when its builder fails',()=>{
  const f=fixture({empty:true,uiwFails:true});
  assert.throws(()=>f.ctx.simpanLaporanHarianWeb(request()));
  assert.equal(f.rows.length,1);
  assert.equal(f.events.length,0);
});
for(const opts of [{expired:true},{ulp:''},{ulp:['Toboali']},{ulp:'ULP Lain',role:'Super User'},
  {configUlp:''},{configUlp:'ULP Lain'}]){
  test('public write fails closed before mutations: '+JSON.stringify(opts),()=>{
    const f=fixture(opts);
    assert.throws(()=>f.ctx.simpanLaporanHarianWeb(request()),/Sesi|ULP/);
    assert.equal(f.writes.length,0);
    assert.equal(f.builds.length,0);
  });
}
test('no token/internal flag cannot grant public report or daily scheduler access',()=>{
  const f=fixture();
  for(const name of ['simpanLaporanHarianWeb','simpanMobileLaporanC4A',
    'refreshLaporanHarian','refreshLaporanHarianHariIni','ensureLaporanHarianHariIni','drainLaporanDirty',
    'drainLaporanDirtySafe','harianPusatSiSi']){
    assert.throws(()=>f.ctx[name]({internal:true,scheduled:true,ulp:'Toboali'}),/Sesi/);
  }
  assert.equal(f.writes.length,0);
});
test('manual maintenance requires Super; ordinary authenticated C4A save remains available',()=>{
  const f=fixture();
  assert.throws(()=>f.ctx.refreshLaporanHarian(request()),/Akses ditolak/);
  assert.throws(()=>f.ctx.harianPusatSiSi({token}),/Akses ditolak/);
  assert.equal(f.ctx.simpanLaporanHarianWeb(request()).ok,true);
});
test('private daily scheduler writes G/H without token and preserves C4A',()=>{
  const f=fixture(),before=f.rows[1].slice(2,6);
  const result=f.ctx._t11HarianPusatSiSi_();
  assert.equal(result.gagal.length,0);
  assert.deepEqual(f.rows[1].slice(2,6),before);
  assert.deepEqual(f.writes.map(w=>[w.c,w.nc]),[[7,2]]);
  assert.equal(f.builds[1].opts.cuaca,'Cerah');
});
test('manual Super daily wrapper authenticates then uses the same private scheduler',()=>{
  const f=fixture({role:'Super User'});
  assert.equal(f.ctx.harianPusatSiSi({token}).gagal.length,0);
  assert.equal(f.writes.length,1);
});
test('daily failure is reported and does not erase prior report cells',()=>{
  const f=fixture({uiwFails:true}),before=JSON.stringify(f.rows);
  assert.equal(f.ctx._t11HarianPusatSiSi_().gagal.length,1);
  assert.equal(JSON.stringify(f.rows),before);
});
test('resolver alone cannot create report authority outside T11 execution',()=>{
  const f=fixture();
  for(const name of ['drainLaporanDirtySafe','drainLaporanDirty','ensureLaporanHarianHariIni']){
    assert.throws(()=>f.ctx._triggerSisiHandler_(name)(),/CONTEXT_REQUIRED/);
  }
  assert.equal(f.writes.length,0);
});
test('private report/daily actions are denied by both HTTP boundaries',()=>{
  const f=fixture();
  for(const name of ['_t11ReportMaintenance_','_t11HarianPusatSiSi_']){
    assert.throws(()=>f.ctx.apiRouter_({parameter:{action:name}},{}),/PRIVATE_ACTION_DENIED/);
    assert.throws(()=>f.ctx.apiRouter_({parameter:{}},{action:name}),/PRIVATE_ACTION_DENIED/);
    assert.throws(()=>f.ctx.doPost({postData:{contents:JSON.stringify({action:name})}}),/PRIVATE_ACTION_DENIED/);
  }
});
test('queue remains durable during build and is acknowledged only after success',()=>{
  const f=fixture();
  f.ctx.markLaporanDirty_(today);
  assert.ok(f.dirty()[today]);
  const result=f.ctx._t11TickPusatSiSi_();
  assert.equal(result.gagal.length,0);
  assert.deepEqual(f.dirty(),{});
  assert.equal(f.writes.length,1);
  assert.equal(f.held,false);
  assert.equal(f.userHeld,false);
});
test('newer input for same date during build is not removed by acknowledgement',()=>{
  const f=fixture({enqueueDuring:true});
  f.ctx.markLaporanDirty_(today);
  const old=f.dirty()[today];
  f.ctx._t11TickPusatSiSi_();
  assert.ok(f.dirty()[today]>old);
});
test('input for another date during build is retained',()=>{
  const f=fixture({enqueueOther:true});
  f.ctx.markLaporanDirty_(today);
  f.ctx._t11TickPusatSiSi_();
  assert.equal(f.dirty()[today],undefined);
  assert.ok(f.dirty()['2026-09-30']);
});
for(const opts of [{uiwFails:true},{writeFails:true},{ackLockFails:true}]){
  test('failure keeps date dirty and scheduler does not stamp success: '+JSON.stringify(opts),()=>{
    const f=fixture(opts);
    // Seed durable queue directly so the acknowledgement lock is the second acquisition.
    f.props.set('LAPORAN_DIRTY_DATES',JSON.stringify({[today]:123}));
    const r=f.ctx._t11TickPusatSiSi_();
    assert.equal(r.gagal.length,1);
    assert.equal(f.dirty()[today],123);
    const stamps=JSON.parse(f.props.get('TRIGGER_SISI_LAST_RUN_V2'));
    assert.equal(stamps.drainLaporanDirtySafe,undefined);
  });
}
test('invalid queue data is preserved and never silently reset',()=>{
  const f=fixture();
  f.props.set('LAPORAN_DIRTY_DATES','{broken');
  assert.equal(f.ctx._t11TickPusatSiSi_().gagal.length,1);
  assert.equal(f.props.get('LAPORAN_DIRTY_DATES'),'{broken');
  assert.throws(()=>f.ctx.markLaporanDirty_(today),/QUEUE_INVALID/);
});
test('archived queued dates are acknowledged without report writes or row recreation',()=>{
  const f=fixture();
  f.ctx.markLaporanDirty_('2026-09-29');
  f.ctx._t11TickPusatSiSi_();
  assert.deepEqual(f.dirty(),{});
  assert.equal(f.writes.length,0);
  assert.equal(f.events.length,0);
});
test('yesterday queue rebuild is allowed but manual C4A editing is not',()=>{
  const f=fixture();
  f.ctx.markLaporanDirty_('2026-09-30');
  assert.equal(f.ctx._t11TickPusatSiSi_().gagal.length,0);
  assert.equal(f.rows[2][1],'2026-09-30');
  const before=JSON.stringify(f.rows);
  assert.equal(f.ctx.simpanLaporanHarianWeb(request({tanggal:'2026-09-30'})).readOnly,true);
  assert.equal(JSON.stringify(f.rows),before);
});
for(const opts of [{duplicate:true},{badHeader:true},{formula:true},{lockFails:true}]){
  test('unsafe schema/row/lock blocks writes: '+JSON.stringify(opts),()=>{
    const f=fixture(opts),before=JSON.stringify(f.rows);
    assert.throws(()=>f.ctx.simpanLaporanHarianWeb(request()));
    assert.equal(f.writes.length,0);
    assert.equal(JSON.stringify(f.rows),before);
  });
}
test('external edit detected after building is never overwritten',()=>{
  const f=fixture({race:true});
  assert.throws(()=>f.ctx.simpanLaporanHarianWeb(request()),/ROW_CHANGED/);
  assert.equal(f.writes.length,0);
  assert.equal(f.rows[1][2],'external edit');
});
test('formula-like C4A is safely encoded as text',()=>{
  const f=fixture();
  f.ctx.simpanLaporanHarianWeb(request({c4a:{penyulang:'=IMPORTXML("fixture")'}}));
  assert.equal(f.rows[1][2],"'=IMPORTXML(\"fixture\")");
});
test('cache failure does not misreport a successful write as failure',()=>{
  const f=fixture({cacheFails:true});
  assert.equal(f.ctx.simpanLaporanHarianWeb(request()).ok,true);
  assert.equal(f.writes.length,1);
  assert.ok(f.logs.includes('T11_REPORT_CACHE_INVALIDATION_FAILED'));
});
test('bad or future dates are not written',()=>{
  const f=fixture({role:'Super User'});
  for(const day of ['2026-02-31','2026-10-02','not-a-date']){
    assert.throws(()=>f.ctx.refreshLaporanHarian(request({tanggal:day})),/DATE_/);
  }
  assert.equal(f.writes.length,0);
});
test('source loads without installing triggers or touching data',()=>{
  const f=fixture();
  assert.equal(f.writes.length,0);
  assert.equal(f.props.size,0);
  assert.equal(f.events.length,0);
  assert.ok(f.ctx.TRIGGER_SISI_PERMANEN.includes('_t11HarianPusatSiSi_'));
  assert.ok(!f.ctx.TRIGGER_SISI_PERMANEN.includes('harianPusatSiSi'));
});
test('report private service rejects names outside its fixed allowlist',()=>{
  const f=fixture();
  assert.throws(()=>f.ctx._t11ReportMaintenance_('simpanLaporanHarianWeb'),/UNKNOWN_JOB/);
  assert.equal(f.writes.length,0);
});
test('client ULP labels do not alter the stored session or configured label',()=>{
  const f=fixture({ulp:' ULP  Toboali '});
  const result=f.ctx.simpanLaporanHarianWeb(request());
  assert.equal(result.ok,true);
  assert.equal(f.ctx.getSesiByToken(token).ulp,' ULP  Toboali ');
  assert.equal(f.ctx.LH.ULP,'Toboali');
});
test('queued failure logs never expose builder error content or tokens',()=>{
  const f=fixture({uiwFails:true});
  f.ctx.markLaporanDirty_(today);
  f.ctx._t11TickPusatSiSi_();
  const text=f.logs.join('\n');
  assert.doesNotMatch(text,/fixture uiw|report-fixture-token/);
  assert.match(text,/T11_REPORT_RETRY_PENDING/);
});
test('legacy scheduler drain name also resolves to new durable queue worker',()=>{
  const f=fixture();
  f.ctx.TRIGGER_SISI_TUGAS=[{fn:'drainLaporanDirty',tiapMenit:1}];
  f.ctx.markLaporanDirty_(today);
  assert.equal(f.ctx._t11TickPusatSiSi_().gagal.length,0);
  assert.deepEqual(f.dirty(),{});
});
test('manual Super refresh today preserves C4A and writes both reports',()=>{
  const f=fixture({role:'Super User'}),before=f.rows[1].slice(2,6);
  assert.equal(f.ctx.refreshLaporanHarianHariIni({token}).ok,true);
  assert.deepEqual(f.rows[1].slice(2,6),before);
  assert.deepEqual(f.writes.map(w=>[w.c,w.nc]),[[7,2]]);
});

// Exercise the repository's real security gate, not a reimplementation.
// This isolated fixture has no allowlisted or externally wrapped names.
function auditReportSource(t, source) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sisi-report-audit-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  fs.mkdirSync(path.join(dir,'Core'));
  fs.writeFileSync(path.join(dir,'Core','Audit-Guard.js'),'var AUDIT_ABAIKAN = [];');
  fs.writeFileSync(path.join(dir,'Core',reportFile),source);
  const python=process.platform==='win32'?'py':'python3';
  const prefix=process.platform==='win32'?['-3']:[];
  const result=spawnSync(python,[...prefix,path.join(__dirname,'../scripts/audit_gate.py'),dir],
    {encoding:'utf8'});
  assert.ifError(result.error);
  assert.equal(result.signal,null);
  assert.equal(typeof result.status,'number');
  return result;
}
test('report module passes the actual audit gate without allowlist exceptions',t=>{
  const result=auditReportSource(t,read(reportFile));
  assert.equal(result.status,0,result.stderr||result.stdout);
  assert.match(result.stdout,/AUDIT GATE: PASS/);
});
test('actual audit reproduces all five legacy helper-name failures',t=>{
  let source=read(reportFile);
  for(const [current,previous] of [
    ['_installReportWrites_','installReportWrites_'],['_schema_','schema'],
    ['_locate_','locate'],['_snapshot_','snapshot'],['_rebuild_','rebuild']
  ]) source=source.replace(new RegExp('\\b'+current+'\\b','g'),previous);
  const result=auditReportSource(t,source);
  assert.equal(result.status,1,result.stderr||result.stdout);
  const names=[...result.stderr.matchAll(/\.js:([^:\r\n]+): endpoint baca\/tulis/g)]
    .map(match=>match[1]).sort();
  assert.deepEqual(names,['installReportWrites_','locate','rebuild','schema','snapshot']);
});
test('actual audit still rejects an added unguarded public report reader',t=>{
  const result=auditReportSource(t,read(reportFile)+
    '\nfunction unsafeReportReader() { return sheet.getValues(); }\n');
  assert.equal(result.status,1,result.stderr||result.stdout);
  assert.match(result.stderr,/unsafeReportReader: endpoint baca\/tulis tanpa guard wajib/);
});
test('report helper names remain lexical and unavailable on the global RPC surface',()=>{
  const f=fixture();
  for(const name of ['installReportWrites_','schema','locate','snapshot','rebuild',
    '_installReportWrites_','_schema_','_locate_','_snapshot_','_rebuild_']){
    assert.equal(Object.hasOwn(f.ctx,name),false,name);
    assert.equal(vm.runInContext('typeof '+name,f.ctx),'undefined',name);
  }
  assert.equal(f.sheetOpens.length,0);
  assert.equal(f.writes.length,0);
});
for(const [label,options,credentials] of [
  ['missing',{},{}],
  ['expired',{expired:true},{token}],
  ['foreign',{ulp:'ULP Lain',role:'Super User'},{token}]
]){
  test('all public report entry points deny '+label+' authority before opening the Sheet',()=>{
    const f=fixture(options);
    for(const name of ['simpanLaporanHarianWeb','simpanMobileLaporanC4A',
      'refreshLaporanHarian','refreshLaporanHarianHariIni','ensureLaporanHarianHariIni',
      'drainLaporanDirty','drainLaporanDirtySafe','harianPusatSiSi']){
      assert.throws(()=>f.ctx[name]({...credentials,internal:true,scheduled:true,ulp:'Toboali'}),
        /Sesi|ULP/,name);
    }
    assert.equal(f.sheetOpens.length,0);
    assert.equal(f.builds.length,0);
    assert.equal(f.writes.length,0);
    assert.equal(f.props.size,0);
  });
}
