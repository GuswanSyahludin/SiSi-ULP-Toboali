const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('SiSi_BackEnd/Core/ZZZ-BA-OwnerId-Compat.js','utf8');
const TOKEN='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

function build(){
  const rows=[];
  const row=()=>Array(13).fill('');
  let a=row(); a[8]='AIR BARA'; a[7]='GI TOBOALI'; rows.push(a);
  let b=row(); b[0]='GI TOBOALI'; b[1]='07'; rows.push(b);
  let c=row(); c[3]='AIR BARA'; c[4]='13'; c[5]='16'; rows.push(c);
  let d=row(); d[9]='ACR AIR BARA - TB0001'; d[10]='01'; d[11]='FCO'; d[12]='AIR BARA'; rows.push(d);
  let guarded=false;
  const ctx={
    TOKEN_POLA:/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    BA_OWNER_SOURCE:{spreadsheetId:'x',sheetName:'OwnerId'},
    guard_:()=>{guarded=true;},
    SpreadsheetApp:{openById:()=>({})},
    _baResolveSheet_:()=>({getDataRange:()=>({getDisplayValues:()=>rows})}),
    _baKey_:v=>String(v??'').trim().toLowerCase().replace(/\s+/g,' '),
    _baText_:(r,i)=>i>=0&&i<r.length?String(r[i]??'').trim():''
  };
  vm.createContext(ctx); vm.runInContext(source,ctx);
  return {ctx,guarded:()=>guarded};
}

test('SisiRun token does not replace OwnerId filter payload',()=>{
  const c=build();
  const res=c.ctx.getOwnerIdDanExternalReference(TOKEN,{penyulang:'AIR BARA',section:'ACR AIR BARA - LBS AIR SAMPIK'});
  assert.equal(c.guarded(),true);
  assert.equal(res.found,true);
  assert.equal(res.ownerId,'07161301');
  assert.equal(res.externalReference,'SECTION - FCO - AIR BARA');
  assert.equal(res.referralId,res.externalReference);
});

test('direct lookup stays compatible',()=>{
  const c=build();
  const res=c.ctx.getOwnerIdDanExternalReference({penyulang:'AIR BARA',section:'ACR AIR BARA'});
  assert.equal(res.ownerId,'07161301');
});
