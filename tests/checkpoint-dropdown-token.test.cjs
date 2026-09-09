const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync('SiSi_BackEnd/Core/Tek-Temuan-Code.js','utf8');
test('checkpoint dropdown endpoints accept injected token before filters',()=>{
  assert.match(source,/function getDataPenyulangByUlp\(token, ulp\)/);
  assert.match(source,/function getSectionByPenyulang\(token, penyulang\)/);
  assert.match(source,/function getTitikByPenyulang\(token, penyulang\)/);
  assert.match(source,/function getListTemuanByObjek\(token, objek\)/);
});
test('checkpoint dropdown endpoints are session and ULP scoped',()=>{
  assert.match(source,/aksi:'getDataPenyulangByUlp'/);
  assert.match(source,/var scope = ulpScope_\(g, ulp\) \|\| g\.ulp/);
  assert.match(source,/aksi:'getSectionByPenyulang'/);
});
