const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.resolve(__dirname, '../SiSi_BackEnd/ROW/Tek-ROW-TokenAdapter.js'),
  'utf8',
);
const TOKEN = '11111111-2222-4333-8444-555555555555';

function context(options={}){
  const RL={no:0,kodeHeader:1,kodePekerjaan:2,hari:3,tanggal:4,tim:5,penyulang:6,section:7,rabas:8,sedang:9,besar:10,inputOleh:11,timestamp:12};
  const rows=[
    ['', 'HDR-1','KP-1','Senin','2026-09-14','ROW 01','AIR BARA','SEC A',2,1,0,'',''],
    ['', 'HDR-2','KP-2','Selasa','2026-09-15','ROW 02','SUKADAMAI','SEC B',1,0,1,'','']
  ];
  let guarded=0, reads=0;
  const ctx={
    COL_ROW_RLZ:RL, COL_ROW_RLZ_N:13,
    _readSheetDual_:()=>{ reads++; return rows; },
    _normTgl:v=>String(v||'').slice(0,10),
    _guardErrorAkses_:e=>/Sesi/.test(String(e&&e.message)),
    guard_:args=>{
      guarded++;
      if(options.reject || args.length!==5 || args[0]!==TOKEN)
        throw new Error('Sesi tidak ditemukan. Silakan login ulang.');
      return {};
    }
  };
  vm.createContext(ctx); vm.runInContext(source,ctx);
  return {ctx,guarded:()=>guarded,reads:()=>reads};
}

test('token-injected ROW recap keeps all four business filters aligned',()=>{
  const c=context();
  const res=c.ctx.getSemuaLaporan(TOKEN,'2026-09-14','2026-09-14','ROW 01','AIR BARA');
  assert.equal(c.guarded(),1);
  assert.equal(res.success,true);
  assert.equal(res.rows.length,1);
  assert.equal(res.rows[0][1],'ROW 01');
  assert.equal(res.rows[0][12],'AIR BARA');
  assert.equal(res.rows[0][14],2);
});

test('legacy four-argument ROW recap is rejected before reading data',()=>{
  const c=context();
  assert.throws(
    ()=>c.ctx.getSemuaLaporan('2026-09-15','2026-09-15','ROW 02','SUKADAMAI'),
    /Sesi tidak ditemukan/,
  );
  assert.equal(c.guarded(),1);
  assert.equal(c.reads(),0);
});

test('invalid session is rejected before reading data',()=>{
  const c=context({reject:true});
  assert.throws(
    ()=>c.ctx.getSemuaLaporan(TOKEN,'2026-09-14','2026-09-14','',''),
    /Sesi tidak ditemukan/,
  );
  assert.equal(c.reads(),0);
});
