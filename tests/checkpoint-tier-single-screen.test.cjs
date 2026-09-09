const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const b=fs.readFileSync('SiSi_BackEnd/Teknik/ZZ-Data-Checkpoint-Section-Volume.js','utf8');
const h=fs.readFileSync('SiSi_BackEnd/Teknik/Tek-Data-Checkpoint.html','utf8');
test('Tier comes from finding master',()=>{assert.match(b,/_dpgTemuanTierMaster_/);assert.match(b,/db_List_Temuan/);assert.match(b,/tierMaster\[key\]/);});
test('one Tier column replaces Tier 1 and Tier 2',()=>{assert.match(h,/<th>Tier<\/th>/);assert.doesNotMatch(h,/<th>Tier 1<\/th><th>Tier 2<\/th>/);assert.match(h,/r\.tier/);});
test('matrix fits viewport without horizontal scrolling',()=>{assert.match(h,/table-layout:fixed/);assert.match(h,/width:100%/);assert.match(h,/overflow:visible/);});
