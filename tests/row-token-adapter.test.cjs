const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('SiSi_BackEnd/ROW/Tek-ROW-TokenAdapter.js', 'utf8');
const TOKEN = '11111111-2222-4333-8444-555555555555';

function context(){
  const RL={no:0,kodeHeader:1,kodePekerjaan:2,hari:3,tanggal:4,tim:5,penyulang:6,section:7,rabas:8,sedang:9,besar:10,inputOleh:11,timestamp:12};
  const rows=[
    ['', 'HDR-1','KP-1','Senin','2026-09-14','ROW 01','AIR BARA','SEC A',2,1,0,'',''],
    ['', 'HDR-2','KP-2','Selasa','2026-09-15','ROW 02','SUKADAMAI','SEC B',1,0,1,'','']
  ];
  let guarded=false;
  const ctx={
    COL_ROW_RLZ:RL, COL_ROW_RLZ_N:13,
    TOKEN_POLA:/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    _readSheetDual_:()=>rows,
    _normTgl:v=>String(v||'').slice(0,10),
    guard_:()=>{ guarded=true; return {}; }
  };
  vm.createContext(ctx); vm.runInContext(source,ctx);
  return {ctx,guarded:()=>guarded};
}

test('token-injected ROW recap keeps all four business filters aligned',()=>{
  const c=context();
  const res=c.ctx.getSemuaLaporan(TOKEN,'2026-09-14','2026-09-14','ROW 01','AIR BARA');
  assert.equal(c.guarded(),true);
  assert.equal(res.success,true);
  assert.equal(res.rows.length,1);
  assert.equal(res.rows[0][1],'ROW 01');
  assert.equal(res.rows[0][12],'AIR BARA');
  assert.equal(res.rows[0][14],2);
});

test('direct/internal ROW recap remains backward compatible',()=>{
  const c=context();
  const res=c.ctx.getSemuaLaporan('2026-09-15','2026-09-15','ROW 02','SUKADAMAI');
  assert.equal(res.rows.length,1);
  assert.equal(res.rows[0][1],'ROW 02');
});
