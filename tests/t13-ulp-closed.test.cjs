'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const backend = path.join(__dirname, '../SiSi_BackEnd');
const read = p => fs.readFileSync(path.join(backend, p), 'utf8');
const guardSource = read('Core/Guard.js');
const aliases = ['Toboali', 'ULP Toboali', '  tObOaLi  ', ' \tULP   ToBoAlI\n'];
const invalid = ['', ' ', null, undefined, 16130, '16130', 'ULP Lain',
  'ULP ULP Toboali', 'Toboali Timur', 'ToboaliULP', {}, ['Toboali']];
function context(extra = {}) {
  const ctx = vm.createContext({ Logger: { log() {} }, ...extra });
  vm.runInContext(guardSource, ctx);
  return ctx;
}
function load(ctx, file) { vm.runInContext(read(file), ctx, { filename: file }); }
module.exports = { guardSource, aliases, invalid, context, load };

test('ULP normalizer equates only the exact two Toboali spellings', () => {
  const c = context();
  for (const a of aliases) for (const b of aliases) assert.equal(c.ulpSama_(a, b), true);
  for (const value of invalid) {
    assert.equal(c.ulpSama_(value, 'ULP Toboali'), false);
    assert.equal(c.ulpSama_('Toboali', value), false);
  }
  assert.equal(c.ulpSama_('', ''), false);
  assert.equal(c._normUlp_('ULP Lain'), 'ulp lain');
  assert.equal(c.ulpSama_('Lain', 'ULP Lain'), false, 'no generic prefix removal');
  assert.equal(c.ulpSama_(16130, '16130'), true, 'preserve legacy code comparisons');
});

test('T13 closure follows Guard in clasp; stored sessions and role policy are unchanged', () => {
  const clasp = JSON.parse(read('.clasp.json'));
  const manifest = JSON.parse(read('appsscript.json'));
  assert.equal(Object.hasOwn(manifest, 'filePushOrder'), false);
  const order = clasp.filePushOrder;
  const gi = order.indexOf('Core/Guard.js'), ci = order.indexOf('Core/ZZ-T13-ULP-Closed.js');
  assert.ok(gi >= 0 && ci > gi);
  const c = context(); load(c, 'Core/ZZ-T13-ULP-Closed.js');
  const g = Object.freeze({ ulp: ' Toboali ', kodeUlp: '16130', isSuper: false });
  for (const a of aliases) assert.equal(c.barisUlpCocok_(g, a), true);
  for (const a of ['', ' ', null, 'ULP Lain']) assert.equal(c.barisUlpCocok_(g, a), false);
  assert.equal(c.ulpScope_(g, 'ULP Lain'), ' Toboali ');
  assert.equal(c.bolehLintasUlp_(g), false);
  assert.equal(c.bolehLintasUlp_({ isSuper: true }), true);
  assert.equal(g.ulp, ' Toboali ');
  assert.equal(g.kodeUlp, '16130');
});

test('trigger installer accepts aliases but rejects foreign/blank and unauthorized roles first', () => {
  for (const ulp of [...aliases, ...invalid]) {
    const c = context(); load(c, 'Core/Trigger-Manager.js');
    let installed = 0;
    c.guard_ = (_args, opts) => {
      assert.deepEqual(Array.from(opts.role), ['SUPER']);
      return { ulp };
    };
    c._pasangSemuaTriggerSiSi_ = () => { installed++; return 'installed'; };
    if (aliases.includes(ulp)) assert.equal(c.pasangSemuaTriggerSiSi({token:'valid'}), 'installed');
    else assert.throws(() => c.pasangSemuaTriggerSiSi({token:'valid'}), /ULP_DENIED/);
    assert.equal(installed, aliases.includes(ulp) ? 1 : 0);
    c.guard_ = () => { throw Error('ROLE_OR_SESSION_DENIED'); };
    assert.throws(() => c.pasangSemuaTriggerSiSi({}), /ROLE_OR_SESSION_DENIED/);
  }
});

test('Master Gardu mobile payload comparison preserves stored ULP and rejects foreign payload', () => {
  const c = context(); load(c, 'Core/Master-Gardu-Sync-Mobile.js');
  const session = Object.freeze({ ulp: ' Toboali ', role: 'Admin' });
  c.getSesiByToken = token => token === 'valid' ? session : null;
  const writes = [];
  c.updateHiUp3 = p => { writes.push(p); return { ok: true }; };
  for (const ulp of aliases) {
    const result = c.updateMasterGarduMobile('valid', { gardu: 'TB1', ulp, data: { alamat: 'A' } });
    assert.equal(result.success, true);
    assert.equal(writes.at(-1).ulp, 'Toboali');
  }
  const n = writes.length;
  assert.equal(c.updateMasterGarduMobile('valid', { gardu: 'TB1', ulp: 'ULP Lain', data: { alamat: 'X' } }).success, false);
  assert.equal(c.updateMasterGarduMobile('expired', { gardu: 'TB1', ulp: 'Toboali' }).success, false);
  assert.equal(writes.length, n);
  assert.equal(session.ulp, ' Toboali ');
});

test('Master Gardu read uses session scope and returns original ULP labels', () => {
  const c = context(); load(c, 'Core/Master-Gardu-Mobile.js');
  const ulps = [...aliases, 'ULP Lain', ''];
  const identity = ulps.map((u,i) => { const row=Array(21).fill(''); row[0]=u; row[1]='G'+i; return row; });
  c.getSesiByToken = t => t === 'valid' ? { role:'Admin', ulp:'Toboali' } : null;
  c.guard_ = args => {
    if (args[0] !== 'valid') throw Error('UNAUTHENTICATED');
    return {token:'valid',ulp:'Toboali'};
  };
  c.SpreadsheetApp = { openById: () => ({ getSheetByName: () => ({
    getLastRow: () => 11 + ulps.length,
    getRange: (_start,col,n,width) => ({ getDisplayValues: () =>
      col === 2 ? identity : Array.from({length:n},()=>Array(width).fill('')) }),
  }) }) };
  const result = c.getMasterGarduMobile('valid', 'ULP Lain');
  assert.equal(result.success, true);
  assert.equal(result.list.length, aliases.length);
  assert.equal(result.list[1].ulp, 'ULP Toboali');
  assert.equal(c.getMasterGarduMobile('expired','Toboali').success, false);
});

test('Inspeksi Gardu packet and master ownership accept aliases without changing local keys', () => {
  const c = context(); load(c, 'Core/Inspeksi-Gardu-Mobile.js');
  c.getSesiByToken = token => token === 'valid' ? { role:'Admin', ulp:'Toboali' } : null;
  const keys = [];
  c._insLocalGet_ = id => { keys.push(id); return id === 'local-H' ? 'H1' : 'G1'; };
  c.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
  let masterUlp = 'ULP Toboali';
  c._findGarduByNomor = () => ({ ulp: masterUlp });
  const packet = { header:{localId:'local-H',ulp:' ULP   TOBOALI '},
    gardus:[{localId:'local-G',nomorGardu:'TB1',tier:'1',temuan:[]}] };
  assert.equal(c.syncPaketInsGarduMobile_('valid',packet).success,true);
  assert.ok(keys.includes('local-H') && keys.includes('local-G'));
  masterUlp = 'ULP Lain';
  assert.equal(c.syncPaketInsGarduMobile_('valid',packet).success,false);
  assert.equal(c.syncPaketInsGarduMobile_('expired',packet).success,false);
  assert.equal(packet.header.ulp,' ULP   TOBOALI ');
});

test('Temuan dropdown keeps existing cache namespace while comparing aliases', () => {
  const c = context(); load(c, 'Core/ZZ-Temuan-Filter-Compat.js');
  c.guard_ = () => ({ulp:'Toboali',isSuper:false});
  const keys = [];
  c.CacheService = { getScriptCache:()=>({get:k=>{keys.push(k);return null;},put(){}}) };
  c.COL_INS = { TEMUAN:{kodePekerjaan:0,ulp:1,temuan:2} };
  c.SHEET_INS = {TEMUAN:'findings'};
  c._readSheetDual_ = () => [['a',' ULP   TOBOALI ','Allowed'],['b','ULP Lain','Secret'],['c','','Unknown']];
  const result = c.getListTemuanTerpakaiIns('valid','ULP Lain');
  assert.deepEqual(Array.from(result.list), ['Allowed']);
  assert.equal(keys[0], 'ins_temuan_dipakai_v3_toboali');
  c.guard_ = () => { throw Error('UNAUTHENTICATED'); };
  assert.equal(c.getListTemuanTerpakaiIns('', 'Toboali').ok, false);
});

test('Yandal approval list keeps the guard and matches row aliases only within requested scope', () => {
  const c = context(); load(c, 'Yandal/Tek-Yandal-Code.js');
  c.guard_ = () => ({ulp:'Toboali',isSuper:false});
  c._normTgl = v => String(v || '');
  c.CacheService = {getScriptCache:()=>({getAll:()=>({})})};
  const C=c.COL_P0;
  const rows=[Array(50).fill('header'),...['ULP Toboali','Toboali','ULP Lain',''].map((u,i)=>{
    const r=Array(50).fill('');r[C.kodeP0]='P'+i;r[C.ulp]=u;
    r[C.statusApproval]='Approved';r[C.tanggal]='2026-10-01';return r;
  })];
  c._shY_=()=>({getLastRow:()=>rows.length});c._allY_=()=>rows;
  const result=c.getApprovalP0List({ulp:'ULP Lain',status:'Approved'});
  assert.equal(result.ok,true);assert.equal(result.list.length,2);
  assert.equal(result.list[0].ulp,'ULP Toboali');
  c.guard_=()=>{throw Error('UNAUTHENTICATED');};
  assert.throws(()=>c.getApprovalP0List({}),/UNAUTHENTICATED/);
});

test('Gardu measurement write matches alias on the guarded target row, not foreign rows', () => {
  const c=context();load(c,'Inspeksi_Gardu/Tek-InsDu-Code.js');
  let guarded=0;const writes=[];
  c.guard_=()=>{guarded++;return {ulp:'Toboali',isSuper:false};};
  const start=c.GARDU_MASTER.headerRows+1;
  const ulps=['ULP Lain',' ULP   TOBOALI '];
  c.SpreadsheetApp={openById:()=>({getSheetByName:()=>({
    getLastRow:()=>start+1,
    getRange:(r,col)=>({
      getValues:()=>col===c.COL_GARDU.nomorGardu+1 ? [['TB1'],['TB1']] : ulps.map(u=>[u]),
      setValue:v=>writes.push({row:r,col,value:v}),
    }),
  })})};
  c.SPREADSHEET_ID='fixture';
  const result=c.updatePengukuranGardu({nomorGardu:'TB1',ulp:'Toboali',data:{coverFcoAtas:'Lengkap'}});
  assert.equal(result.ok,true);assert.equal(guarded,1);
  assert.equal(writes.length,1);assert.equal(writes[0].row,start+1);
  assert.equal(ulps[1],' ULP   TOBOALI ');
  c.guard_=()=>{throw Error('UNAUTHENTICATED');};
  assert.throws(()=>c.updatePengukuranGardu({}),/UNAUTHENTICATED/);
  assert.equal(writes.length,1);
});

test('monitoring scope matches aliases without rewriting verified scope or row labels', () => {
  const c=context();load(c,'Teknik/SIE-Teknik-Code.js');
  const T={kodePekerjaan:0,ulp:1,tanggal:2,status:3};
  c.COL_INS={TEMUAN:T};c.SHEET_INS={TEMUAN:'findings'};c._normTgl=v=>v||'';
  c._verifikasiUserDb_=()=>({ok:true,role:'Staff',ulp:'Toboali'});
  const rows=[['header'],['A',' ULP   Toboali ','2026-10-01',''],['B','ULP Lain','2026-10-01','']];
  c._ssIns=()=>({getSheetByName:()=>({getLastRow:()=>rows.length,getDataRange:()=>({getValues:()=>rows})})});
  const result=c.getMonitoringTlTemuan({username:'real-user',ulp:'ULP Lain'});
  assert.equal(result.ok,true);assert.equal(result.list.length,1);
  assert.equal(result.list[0].kodePekerjaan,'A');
  assert.equal(result.list[0].ulp,'ULP   Toboali');
  assert.equal(result.ulp,'toboali');
  c._verifikasiUserDb_=()=>({ok:false,error:'DENIED'});
  assert.equal(c.getMonitoringTlTemuan({username:'unknown'}).ok,false);
});

// Both suites run via the already-CI-wired mobile report test entry.
require('./checkpoint-section-volume.test.cjs');
