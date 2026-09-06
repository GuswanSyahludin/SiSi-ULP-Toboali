const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const audit = fs.readFileSync(path.join(root, 'SiSi_BackEnd/Core/Predeploy-Audit.js'), 'utf8');
const delta = fs.readFileSync(path.join(root, 'SiSi_BackEnd/Core/Delta-Sync-Mobile.js'), 'utf8');
function sheet(name, rows) {
  return { getName: () => name, getLastRow: () => rows.length,
    getLastColumn: () => rows[0]?.length || 0,
    getRange: (r,c,n,w) => ({getValues: () => rows.slice(r-1,r-1+n).map(row => row.slice(c-1,c-1+w))}) };
}
function run(sheets, change) {
  const logs = [];
  const ss = {getName: () => 'test', getSheets: () => sheets,
    getSheetByName: name => sheets.find(s => s.getName() === name) || null};
  const ctx = {SPREADSHEET_ID: 'test', SpreadsheetApp: {openById: () => ss}, Logger: {log: s => logs.push(s)}};
  vm.createContext(ctx); vm.runInContext(delta, ctx); vm.runInContext(audit, ctx);
  if (change) change(ctx);
  return {checks: ctx._auditPetugasYandalPredeploy_(), logs, ctx};
}
const valid = () => sheet('db_List_Petugas_Yandal', [['No','Nama Petugas'],[1,'Petugas A'],[2,'Petugas B']]);
test('real delta reader accepts crew and audit does not log names', () => {
  const r = run([valid()]);
  assert.equal(r.checks.length, 4); assert.ok(r.checks.every(c => c.ok));
  assert.ok(!JSON.stringify(r.checks).includes('Petugas A')); assert.equal(r.logs.length,0);
});
test('missing exact sheet fails even when an alias exists', () => {
  const r=run([sheet('List Petugas Yandal',[['Nama'],['A'],['B']])]);
  assert.equal(r.checks[0].ok,false); assert.equal(r.checks.at(-1).ok,false);
});
test('empty, header-only and one-person data fail', () => {
  for(const rows of [[],[['No','Nama']], [['No','Nama'],[1,'A']]]) {
    const r=run([sheet('db_List_Petugas_Yandal',rows)]);
    assert.equal(r.checks.find(c=>c.name.startsWith('isi petugas')).ok,false);
  }
});
test('unrecognized headers cannot silently become crew names', () => {
  const r=run([sheet('db_List_Petugas_Yandal',[['No','ULP'],[1,'Toboali'],[2,'Other']])]);
  assert.equal(r.checks.find(c=>c.name.startsWith('kolom nama')).ok,false);
});
test('duplicate and multi-person cells match mobile parser', () => {
  const r=run([sheet('db_List_Petugas_Yandal',[['No','Nama Petugas'],[1,'A; B'],[2,'a']])]);
  assert.ok(r.checks.every(c=>c.ok));
});
test('alias selected before canonical sheet fails source parity', () => {
  const r=run([sheet('List Petugas Yandal',[['Nama'],['Different A'],['Different B']]),valid()]);
  assert.equal(r.checks.at(-1).ok,false);
});
test('missing reader and malformed dataset fail closed', () => {
  assert.equal(run([valid()],c=>{c._deltaYandalPetugasRows_=undefined;}).checks.at(-1).ok,false);
  assert.equal(run([valid()],c=>{c._deltaYandalPetugasRows_=()=>[['bad','A']];}).checks.at(-1).ok,false);
});
test('checks are included in main predeploy totals', () => {
  const r=run([valid()]);
  r.ctx.loginPerangkat=()=>({success:false,message:'empty'});
  const all=r.ctx.auditPredeployMobile_();
  assert.equal(all.checks.filter(c=>c.name.includes('db_List_Petugas_Yandal')).length,4);
  assert.equal(all.total,all.checks.length);
  assert.equal(all.gagal,all.checks.filter(c=>!c.ok).length);
});
