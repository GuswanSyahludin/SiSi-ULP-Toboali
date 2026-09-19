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
