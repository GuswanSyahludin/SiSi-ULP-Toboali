'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test'),vm=require('node:vm');
const root=path.join(__dirname,'..','SiSi_BackEnd','Core');
const adapter=fs.readFileSync(path.join(root,'ZZZZZZZZZZZZZ-BA-Detail-Edit-Auth.js'),'utf8');
const helper=fs.readFileSync(path.join(root,'ZZZZZZZZZZZZ-Stage4-Sheet-Write-Safety.js'),'utf8');
const TOKEN='11111111-1111-4111-8111-111111111111';
function harness(){
  const calls=[],guards=[],rows=[];
  const context={
    updateBeritaAcaraDetail(request){calls.push(request);return{ok:true,idBA:request.idBA};},
    guard_(args,opts){guards.push(opts);return{token:TOKEN,ulp:'ULP Toboali',sesi:{token:TOKEN}};},
    audit_(){},
    _stage3RequireBaRow_(args,idBA,action){rows.push({idBA,action});},
  };
  vm.createContext(context); vm.runInContext(helper,context); vm.runInContext(adapter,context);
  return {context,calls,guards,rows};
}
test('detail edit strips token, checks row ownership, and sanitizes nested Sheet values',()=>{
  const h=harness();
  const request={token:TOKEN,idBA:'BA-GRD-1',alamat:'=IMPORTDATA("x")',tanggalBA:'2026-09-21',koordinatX:'-2.1',koordinatY:'106.1',meta:{catatan:'@cmd'}};
  const result=h.context.updateBeritaAcaraDetail(request);
  assert.equal(result.ok,true);
  assert.equal(h.rows.length,1);
  assert.deepEqual(h.rows[0],{idBA:'BA-GRD-1',action:'BA_DETAIL_EDIT_ROW_OWNERSHIP'});
  assert.equal(h.calls.length,1);
  assert.equal(Object.prototype.hasOwnProperty.call(h.calls[0],'token'),false);
  assert.equal(h.calls[0].alamat,"'=IMPORTDATA(\"x\")");
  assert.equal(h.calls[0].meta.catatan,"'@cmd");
  assert.equal(h.calls[0].tanggalBA,request.tanggalBA);
});
test('detail edit rejects missing idBA before row or Sheet work',()=>{
  const h=harness();
  const result=h.context.updateBeritaAcaraDetail({token:TOKEN,alamat:'=bad'});
  assert.equal(result.ok,false); assert.match(result.message,/idBA/); assert.equal(h.rows.length,0); assert.equal(h.calls.length,0);
});
