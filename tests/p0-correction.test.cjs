// Run: node --test tests/p0-correction.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const legacy = fs.readFileSync(path.join(root, 'SiSi_BackEnd/Yandal/Tek-Yandal-Code.js'), 'utf8');
const extension = fs.readFileSync(path.join(root, 'SiSi_BackEnd/Core/ZZ-P0-Correction.js'), 'utf8');
function fixture() {
  const columns = ['kodeP0', 'ulp', 'namaPekerjaan', 'statusApproval', 'durasi', 'timestampPembuatan', 'point'];
  const C = Object.fromEntries(columns.map((k,i)=>[k,i]));
  const rows = [columns.slice(), ['P0-1','Toboali','ROW','Approved','45 menit','23:00',12]];
  const session = { username:'admin',role:'Admin',ulp:'Toboali',token:'valid' };
  let locked=false, failWrite=false, approvals=0;
  const sh = {
    getLastColumn:()=>rows[0].length,getMaxColumns:()=>100,
    getDataRange:()=>({getValues:()=>rows.map(r=>r.slice())}),
    getRange:(r,c,n=1,w=1)=>({
      getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:w},(_,j)=>rows[r-1+i]?.[c-1+j]??'')),
      setNumberFormat(){return this;},
      setValue(v){if(failWrite&&r===2&&c===3){failWrite=false;throw Error('interrupted');}rows[r-1][c-1]=v;return this;}
    })
  };
  const ctx={console, COL_P0:C,SHEET_YANDAL:{P0:'p0'},
    guard_:(args,opts)=>{const p=args[0];if(p?.token!=='valid')throw Error('Sesi invalid');if(opts.role&&session.role!=='Admin'&&session.role!=='Super User')throw Error('Akses ditolak');return {isSuper:session.role==='Super User',isAdmin:session.role==='Admin',username:session.username,token:'valid',sesi:session};},
    barisUlpCocok_:(_,ulp)=>ulp===session.ulp,
    _shY_:()=>sh,_findRowY_:(_,col,key)=>rows[1][col]===key?{rowNum:2,row:rows[1].slice()}:null,
    _setTextY_:(s,r,c,v)=>s.getRange(r,c+1).setValue(v),_setY_:(s,r,c,v)=>s.getRange(r,c+1).setValue(v),
    safeCell_:s=>s,audit_:()=>{},SpreadsheetApp:{flush:()=>{}},Utilities:{getUuid:()=> 'web-id'},
    LockService:{getScriptLock:()=>({tryLock:()=>{if(locked)return false;locked=true;return true;},releaseLock:()=>{locked=false;}})},
    _bobotPekerjaanMapY_:()=>({'row':4,'normal':2}),
    getListPekerjaanP0:()=>({ok:true,list:['ROW','Normal','Lain - Lain','Tanpa Bobot']}),
    getApprovalP0List:p=>({ok:true,list:[{kodeP0:'P0-1',status:p.status}]}),
    setApprovalP0:()=>{approvals++;return {ok:true,queued:true};},
    _jamHHmm_:v=>v,
  };
  vm.createContext(ctx);
  // Use the production duration parsing and scoring functions, not a test reimplementation.
  const score=legacy.slice(legacy.indexOf('function _skorDurasiY_('),legacy.indexOf('// Hitung & set Point'));
  vm.runInContext(score,ctx);
  vm.runInContext(extension,ctx);
  const payload=(extra={})=>({token:'valid',kodeP0:'P0-1',namaPekerjaan:'Lain - Lain',bobotManual:3,alasanKoreksi:'Salah pilih jenis',requestId:'request-1',expectedNama:'ROW',expectedRevision:0,...extra});
  return {ctx,rows,C,session,payload,interrupt:()=>{failWrite=true;},approvals:()=>approvals};
}
test('normal and night ROW scoring remain unchanged',()=>{const f=fixture();const a=f.ctx._hitungPoinDariRowY_(f.rows[1],{row:4});assert.equal(a.point,12);f.rows[1][5]='12:00';assert.equal(f.ctx._hitungPoinDariRowY_(f.rows[1],{row:4}).point,10);});
test('manual work weight is combined with existing duration, not treated as total points',()=>{const f=fixture();const r=f.ctx.updateNamaPekerjaanP0(f.payload());assert.equal(r.ok,true);assert.equal(r.point,8);assert.equal(f.rows[1][6],8);assert.equal(f.rows[0][7],'Koreksi P0 Metadata');assert.equal(r.history[0].username,'admin');});
test('manual weight boundary validation',()=>{for(const w of [null,'',0,6,'abc',Infinity]){const f=fixture();assert.equal(f.ctx.updateNamaPekerjaanP0(f.payload({bobotManual:w})).ok,false);assert.equal(f.rows[1][2],'ROW');}for(const w of [1,5,2.5,'2,5']){const f=fixture();assert.equal(f.ctx.updateNamaPekerjaanP0(f.payload({bobotManual:w})).ok,true);}});
test('other roles, missing session and foreign or blank ULP cannot edit',()=>{for(const role of ['Petugas','Staff']){const f=fixture();f.session.role=role;assert.throws(()=>f.ctx.updateNamaPekerjaanP0(f.payload()));}const f=fixture();assert.throws(()=>f.ctx.updateNamaPekerjaanP0(f.payload({token:''})));for(const ulp of ['Other','']){f.rows[1][1]=ulp;assert.equal(f.ctx.updateNamaPekerjaanP0(f.payload()).ok,false);}});
test('retry is idempotent; request reuse with different payload is rejected',()=>{const f=fixture();assert.equal(f.ctx.updateNamaPekerjaanP0(f.payload()).ok,true);const r=f.ctx.updateNamaPekerjaanP0(f.payload());assert.equal(r.replayed,true);assert.equal(r.history.length,1);assert.equal(f.ctx.updateNamaPekerjaanP0(f.payload({bobotManual:5})).ok,false);});
test('stale revision and stale type are rejected',()=>{const f=fixture();assert.equal(f.ctx.updateNamaPekerjaanP0(f.payload({expectedRevision:9})).ok,false);assert.equal(f.ctx.updateNamaPekerjaanP0(f.payload({expectedNama:'Normal'})).ok,false);});
test('interrupted write resumes using same request and audit entry',()=>{const f=fixture();f.interrupt();assert.equal(f.ctx.updateNamaPekerjaanP0(f.payload()).ok,false);const r=f.ctx.updateNamaPekerjaanP0(f.payload());assert.equal(r.ok,true);assert.equal(r.point,8);assert.equal(r.history.length,1);});
test('switch back to a master category ignores the old manual weight',()=>{const f=fixture();f.ctx.updateNamaPekerjaanP0(f.payload());const r=f.ctx.updateNamaPekerjaanP0(f.payload({requestId:'request-2',namaPekerjaan:'Normal',expectedRevision:1,expectedNama:'Lain - Lain',bobotManual:5}));assert.equal(r.point,6);assert.equal(r.bobotManual,null);});
test('correction does not approve a waiting job',()=>{const f=fixture();f.rows[1][3]='';const r=f.ctx.updateNamaPekerjaanP0(f.payload());assert.equal(r.ok,true);assert.equal(f.rows[1][3],'');assert.equal(f.approvals(),0);});
test('unweighted normal category clears old approved points',()=>{const f=fixture();const r=f.ctx.updateNamaPekerjaanP0(f.payload({namaPekerjaan:'Tanpa Bobot'}));assert.equal(r.ok,true);assert.equal(r.point,'');assert.ok(r.warning);});
test('approval requires manual weight for Other and is ULP scoped',()=>{const f=fixture();f.rows[1][2]='Lain - Lain';assert.equal(f.ctx.setApprovalP0({token:'valid',kodeP0:'P0-1',keputusan:'Approved'}).ok,false);f.rows[1][1]='Other';assert.throws(()=>f.ctx.setApprovalP0({token:'valid',kodeP0:'P0-1',keputusan:'Rejected'}));assert.equal(f.approvals(),0);});
test('list and master advertise correction metadata',()=>{const f=fixture();assert.equal(f.ctx.getListPekerjaanP0({token:'valid'}).correctionVersion,2);const r=f.ctx.getApprovalP0List({token:'valid',status:''});assert.equal(r.list[0].status,' ');assert.equal(r.list[0].koreksiRevision,0);});
