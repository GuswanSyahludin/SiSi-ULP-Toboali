const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.resolve(__dirname, '../SiSi_BackEnd/Teknik/Tek-Gangguan.js'),
  'utf8',
);

function load(options = {}){
  let scanArgs = null;
  let guardCalls = 0;
  const context = {
    Date,
    guard_: () => {
      guardCalls++;
      if(options.reject) throw new Error('Sesi tidak ditemukan. Silakan login ulang.');
      return { ulp: options.sessionUlp === undefined ? 'ULP Toboali' : options.sessionUlp };
    },
    _guardErrorAkses_: e => /Sesi tidak/.test(String(e && e.message)),
    _normTgl: v => String(v || '').slice(0, 10),
    _glScan_: (ulp, tanggal) => {
      scanArgs = { ulp, tanggal };
      return { daily:{pmt:1,section:0,list:[]}, komulatif:{pmt:2,section:0} };
    },
    Utilities:{formatDate:()=>''},
    Session:{getScriptTimeZone:()=> 'Asia/Jakarta'},
    SpreadsheetApp:{openById:()=>{throw new Error('not used');}},
    Logger:{log:()=>{}},
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  context._glScan_ = (ulp, tanggal) => {
    scanArgs = { ulp, tanggal };
    return { daily:{pmt:1,section:0,list:[]}, komulatif:{pmt:2,section:0} };
  };
  return {context, scanArgs:()=>scanArgs, guardCalls:()=>guardCalls};
}

test('anonymous Gangguan reader is rejected before scanning the source sheet',()=>{
  const c=load({reject:true});
  assert.throws(
    ()=>c.context.getGangguanList({tanggal:'2026-09-19',ulp:'FORGED'}),
    /Sesi tidak ditemukan/,
  );
  assert.equal(c.guardCalls(),1);
  assert.equal(c.scanArgs(),null);
});

test('Gangguan reader ignores client ULP and uses canonical session ULP',()=>{
  const c=load({sessionUlp:'ULP Toboali'});
  const result=c.context.getGangguanList({token:'valid',tanggal:'2026-09-19',ulp:'ULP PALSU'});
  assert.equal(result.ok,true);
  assert.equal(c.scanArgs().ulp,'ULP Toboali');
  assert.equal(c.scanArgs().tanggal,'2026-09-19');
});

test('session without canonical ULP fails closed',()=>{
  const c=load({sessionUlp:''});
  const result=c.context.getGangguanList({token:'valid',tanggal:'2026-09-19'});
  assert.equal(result.ok,false);
  assert.match(result.message,/ULP/);
  assert.equal(c.scanArgs(),null);
});
