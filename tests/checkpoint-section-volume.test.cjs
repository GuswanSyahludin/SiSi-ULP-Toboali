const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const backend = path.join(__dirname, '../SiSi_BackEnd');
const source = fs.readFileSync(path.join(backend, 'Teknik/ZZ-Data-Checkpoint-Section-Volume.js'), 'utf8');
const guard = fs.readFileSync(path.join(backend, 'Core/Guard.js'), 'utf8');
test('section volume endpoint groups rows and maps units', () => {
  assert.match(source, /function getDpgRekapTemuanSectionVolume/);
  assert.match(source, /Titik/);
  assert.match(source, /Gwg/);
  assert.match(source, /Btg/);
  assert.match(source, /bySection/);
  assert.match(source, /_readSheetDual_/);
});
test('section volume uses server-session alias scope, excluding foreign and blank owners', () => {
  const c=vm.createContext({});
  vm.runInContext(guard,c);vm.runInContext(source,c);
  c.guard_=()=>({ulp:' Toboali '});
  c.COL_INS={TEMUAN:{kodePekerjaan:0,tanggal:1,penyulang:2,temuan:3,section:4,ulp:5,status:6}};
  c.SHEET_INS={TEMUAN:'findings'};c._normTgl=v=>v;c._dpgTemuanTierMaster_=()=>({});
  c._readSheetDual_=()=>[
    ['A','2026-10-01','P','Pohon','S',' ULP   TOBOALI ',''],
    ['B','2026-10-01','P','Pohon','S','Toboali',''],
    ['C','2026-10-01','P','SECRET','S','ULP Lain',''],
    ['D','2026-10-01','P','UNKNOWN','S','',''],
  ];
  const result=c.getDpgRekapTemuanSectionVolume({ulp:'ULP Lain',tahun:2026});
  assert.equal(result.ok,true);assert.equal(result.totalVolume,2);
  assert.equal(result.rows[0].unit,'Gwg');
  assert.doesNotMatch(JSON.stringify(result),/SECRET|UNKNOWN/);
  c.guard_=()=>({ulp:''});
  assert.throws(()=>c.getDpgRekapTemuanSectionVolume({tahun:2026}),/belum terhubung/);
  c.guard_=()=>{throw Error('UNAUTHENTICATED');};
  assert.equal(c.getDpgRekapTemuanSectionVolume({tahun:2026}).ok,false);
});
