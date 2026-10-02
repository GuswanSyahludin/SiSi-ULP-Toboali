const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../SiSi_BackEnd/Core/ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ-Migration-Worker.js','utf8').replace(/\r\n/g,'\n');
const legacy=fs.readFileSync(__dirname+'/../SiSi_BackEnd/Core/Tek-Migrasi.js','utf8').replace(/\r\n/g,'\n');
const cols={
 header:{kodeHeader:1,ulp:2,tanggal:4,statusTextWa:16},
 rlz:{kodeHeader:1,kodePekerjaan:2,tanggal:4,timestamp:12},
 eks:{kodeHeader:1,kodePekerjaan:2,kodeEksekusi:3,ulp:4,tanggal:6,timestamp:29},
 tmn:{kodeHeader:1,kodePekerjaanPeny:2,kodePekerjaan:3,ulp:4,tanggal:6,fotoTemuanUrl:17,fotoTiangUrl:19,status:26,fotoPekerjaanUrl:34,fotoSesudahUrl:36,folderPath:44},
 p0:{kodeHeader:1,kodeShift:2,kodeP0:3,ulp:4,tanggal:6,fotoSebelum:23,fotoPekerjaan:28,fotoSesudah:33,statusApproval:41,folderPath:49},
 lh:{tanggal:1},ijr:{kodeHeader:1,kodePekerjaanPeny:2,tanggal:4,timestamp:12},
 idr:{kodeHeader:1,kodePekerjaanGardu:2,tanggal:4,timestamp:11},
 hpg:{kodeHeader:1,kodePG:2,ulp:3,tanggal:5,timeStamp:14},
 hpkj:{kodeHeader:1,kodePG:2,kodePekerjaan:3,ulp:4,tanggal:6,timestamp:16},
 hmt:{kodeHeader:1,kodePG:2,kodePekerjaan:3,kodeMaterial:4,ulp:5,tanggal:7,timestamp:18},
 ysh:{kodeHeader:1,kodeShift:2,tanggal:4,ulp:5,timestamp:11},
 ysw:{kodeHeader:1,kodeShift:2,kodeP0:3,kodeSwitching:4,ulp:5,tanggal:7,folderPath:49}
};
const keys=Object.keys(cols),names=['db_Global_Header','db_ROW_Realisasi','db_ROW_Eksekusi','db_INS_Temuan','db_Yandal_P0','Teknik_Laporan Harian','db_InsJar_Realisasi','db_InsDu_Realisasi','db_Hartek_PenyulangGardu','db_Hartek_Pekerjaan','db_Hartek_Material','db_Yandal_Shift','db_Yandal_Pengecekan_Switching'];
const widths=[17,13,30,45,50,8,13,12,15,17,19,12,50];
const pk=['kodeHeader','kodePekerjaan','kodeEksekusi','kodePekerjaan','kodeP0','tanggal','kodePekerjaanPeny','kodePekerjaanGardu','kodePG','kodePekerjaan','kodeMaterial','kodeShift','kodeSwitching'];
const cursors=['MIGRASI_HEADER_CURSOR','MIGRASI_ROW_RLZ_CURSOR','MIGRASI_ROW_EKS_CURSOR','MIGRASI_TEMUAN_CURSOR','MIGRASI_YANDAL_P0_CURSOR','MIGRASI_LAP_HARIAN_CURSOR','MIGRASI_INSJAR_RLZ_CURSOR','MIGRASI_INSDU_RLZ_CURSOR','MIGRASI_HARTEK_PG_CURSOR','MIGRASI_HARTEK_PKJ_CURSOR','MIGRASI_HARTEK_MAT_CURSOR','MIGRASI_YANDAL_SHIFT_CURSOR','MIGRASI_YANDAL_SWC_CURSOR'];
const clone=x=>structuredClone(x);
function fixture(options={}){
 const f={writes:[],logs:[],properties:{},triggers:[],now:Date.parse(options.now||'2026-10-02T01:00:00Z'),hook:()=>{},failLock:false,active:{},archive:{}};
 class FakeDate extends Date{constructor(...a){super(...(a.length?a:[f.now]));}static now(){return f.now;}}
 class Sheet{
  constructor(key){this.key=key;this.width=widths[keys.indexOf(key)];this.capacity=1000;this.rows=[Array.from({length:this.width},(_,i)=>key+'-'+i)];this.formulas={};}
  getLastColumn(){return Math.max(this.width,...this.rows.map(r=>r.length));}
  getLastRow(){return this.rows.length;}getMaxRows(){return this.capacity;}
  getRange(row,col,n=1,m=1){const sh=this;assert.ok(row>=1&&col>=1&&n>=1&&m>=1);return{
   getValues(){f.hook('read',sh,{row,col,n,m});return Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>clone(sh.rows[row+i-1]?.[col+j-1]??'')));},
   getFormulas(){return Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>sh.formulas[(row+i)+':'+(col+j)]||''));},
   setValues(values){f.hook('before-write',sh,{row,col,values});for(let i=0;i<n;i++){while(sh.rows.length<row+i)sh.rows.push(Array(sh.width).fill(''));for(let j=0;j<m;j++)sh.rows[row+i-1][col+j-1]=clone(values[i][j]);}f.writes.push({kind:'copy',key:sh.key});f.hook('after-write',sh,{row,col,values});}
  };}
  deleteRow(row){f.hook('before-delete',this,{row});this.rows.splice(row-1,1);f.writes.push({kind:'delete',key:this.key});f.hook('after-delete',this,{row});}
 }
 for(const k of keys){f.active[k]=new Sheet(k);f.archive[k]=new Sheet(k);}
 const book=map=>({getSheetByName:name=>map[keys[names.indexOf(name)]]||null});
 const c={
  Date:FakeDate,
  Utilities:{formatDate(d,tz,fmt){assert.equal(tz,'Asia/Jakarta');const s=new Date(d.getTime()+7*3600000).toISOString();return fmt==='HH:mm'?s.slice(11,16):s.slice(0,10);}},
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>f.properties[k]??null,setProperty(k,v){f.hook('property',null,{k,v});f.properties[k]=v;},deleteProperty(k){f.hook('delete-property',null,{k});delete f.properties[k];}})},
  LockService:{getScriptLock:()=>({tryLock:()=>!f.failLock,releaseLock(){}})},
  Logger:{log:v=>f.logs.push(v)},SpreadsheetApp:{openById:id=>{if(id==='active')return book(f.active);if(id==='archive')return book(f.archive);throw Error('wrong workbook');},flush(){f.hook('flush');}},
  ScriptApp:{getProjectTriggers:()=>f.triggers.slice(),newTrigger:name=>({timeBased(){return this;},everyMinutes(n){assert.equal(n,1);return this;},create(){f.hook('create-trigger');const t={getHandlerFunction:()=>name};f.triggers.push(t);return t;}}),deleteTrigger(t){f.hook('delete-trigger');f.triggers.splice(f.triggers.indexOf(t),1);}},
  guard_(args,opts){assert.equal(opts.ulp,true);assert.equal(opts.role[0],'SUPER');const p=args[0];if(!p||p.token!=='real-test-session'||p.role==='staff')throw Error('AUTH_REQUIRED');return{ulp:p.ulp||'Toboali'};},
  SPREADSHEET_ID:'active',SPREADSHEET_ID_ARSIP:'archive',MIGRASI_H_MINUS:2,MIGRASI_BATCH:200,MIGRASI_DRY_RUN:false,
  COL_ROW_RLZ:cols.rlz,COL_ROW_RLZ_N:13,COL_ROW:cols.eks,COL_ROW_N:30,COL_P0:cols.p0,COL_YANDAL_SHIFT:cols.ysh,COL_SWITCHING:cols.ysw,
  COL_INSDU:{REALISASI:cols.idr},SHEET_INSDU_REALISASI:names[7],COL_HTK:{PG:cols.hpg,PEKERJAAN:cols.hpkj,MATERIAL:cols.hmt},
  SHEET_HTK:{PG:names[8],PEKERJAAN:names[9],MATERIAL:names[10]},SHEET_YANDAL:{P0:names[4],SHIFT:names[11],SWITCHING:names[12]},
  LH:{SHEET:names[5],ULP:'Toboali',COL:cols.lh}
 };
 vm.createContext(c);
 vm.runInContext(`const COL_INS=${JSON.stringify({HEADER:cols.header,REALISASI:cols.ijr,TEMUAN:cols.tmn})};const SHEET_INS=${JSON.stringify({HEADER:names[0],REALISASI:names[6],TEMUAN:names[3]})};const STATUS_INS={SELESAI:"Selesai"};`,c);
 if(options.legacy){vm.runInContext(legacy,c);c.SPREADSHEET_ID_ARSIP='archive';for(const item of c.MIGRASI_SEMUA_DAFTAR){const match=/return (\w+)\(/.exec(item.batch.toString());c[match[1]]=()=>{throw Error('Sesi tidak ditemukan. Silakan login ulang.');};}}
 f.c=c;f.load=()=>vm.runInContext(options.crlf?source.replace(/\n/g,'\r\n'):source,c);if(!options.noLoad)f.load();
 f.pending=(subset=keys)=>{f.properties.MIGRASI_SEMUA_STATE=JSON.stringify(Object.fromEntries(subset.map(k=>[k,true])));};
 f.row=(key,extra={})=>{
  const i=keys.indexOf(key),r=Array(widths[i]).fill(''),cc=cols[key];r[cc.tanggal]='2026-09-30';
  if(cc.ulp!==undefined)r[cc.ulp]='Toboali';if(cc.kodeHeader!==undefined)r[cc.kodeHeader]='H';if(cc.kodeShift!==undefined)r[cc.kodeShift]='S';if(cc.kodePG!==undefined)r[cc.kodePG]='G';
  if(key==='eks')r[cc.kodePekerjaan]='R';if(key==='hmt')r[cc.kodePekerjaan]='J';if(key==='ysw')r[cc.kodeP0]='P';
  r[cc[pk[i]]]=['H','R','E','T','P','2026-09-30','I','D','G','J','M','S','W'][i];
  if(key==='tmn'){r[cc.status]='Selesai';for(const p of['fotoTemuanUrl','fotoTiangUrl','fotoPekerjaanUrl','fotoSesudahUrl'])r[cc[p]]='https://photo.example/private';}
  for(const[k,v]of Object.entries(extra))r[Number.isInteger(+k)?+k:cc[k]]=v;return r;
 };
 f.populate=()=>{for(const k of keys)f.active[k].rows.push(f.row(k));};return f;
}
test('source load is inert; lexical schema constants supported',()=>{const f=fixture();assert.deepEqual(f.properties,{});assert.deepEqual(f.triggers,[]);assert.equal(f.writes.length,0);assert.equal(f.c.COL_INS,undefined);});
test('reproduce legacy auth failure then migrate all 13 privately',()=>{
 const f=fixture({legacy:true,noLoad:true});f.populate();f.pending();f.c.migrasiSemuaTick();assert.equal(f.writes.length,0);assert.ok(f.logs.some(v=>v.includes('Sesi tidak ditemukan')));
 f.load();assert.equal(f.c._t11MigrasiSemuaTick_().pending,false);for(const k of keys){assert.equal(f.active[k].rows.length,1,k);assert.equal(f.archive[k].rows.length,2,k);}assert.equal(f.properties.MIGRASI_SEMUA_STATE,undefined);
});
for(const key of keys)test('full-payload copy: '+key,()=>{const f=fixture();f.populate();f.pending([key]);const before=clone(f.active[key].rows[1]);if(key==='ysw')f.archive.p0.rows.push(f.row('p0'));f.c._t11MigrasiSemuaTick_();assert.equal(f.active[key].rows.length,1);assert.deepEqual(f.archive[key].rows[1].slice(key==='lh'?0:1),before.slice(key==='lh'?0:1));});
for(const arg of[undefined,{internal:true},{scheduled:true},{force:true},{triggerUid:'123'},{token:'fake'},{token:'real-test-session',role:'staff'},{token:'real-test-session',ulp:'ULP Lain'}])test('reject untrusted public runner/start '+JSON.stringify(arg),()=>{
 const f=fixture();f.populate();f.pending();const state=clone(f.properties);assert.throws(()=>f.c.migrasiSemuaTick(arg));assert.throws(()=>f.c.mulaiMigrasiSemua(arg));assert.equal(f.writes.length,0);assert.deepEqual(f.properties,state);assert.equal(f.triggers.length,0);
});
for(const ulp of['Toboali',' ULP  TOBOALI ','toboali'])test('local alias preserved '+ulp,()=>{const f=fixture();f.active.header.rows.push(f.row('header',{ulp}));f.pending(['header']);f.c._t11MigrasiSemuaTick_();assert.equal(f.archive.header.rows[1][2],ulp);});
for(const ulp of['','Lain','ULP ULP Toboali',['Toboali'],{}])test('reject foreign/unknown ownership '+JSON.stringify(ulp),()=>{const f=fixture();f.active.header.rows.push(f.row('header',{ulp}));f.pending(['header']);assert.throws(()=>f.c._t11MigrasiSemuaTick_(),/RETRY_REQUIRED/);assert.equal(f.writes.length,0);assert.equal(JSON.parse(f.properties.MIGRASI_SEMUA_STATE).header,true);});
test('ownerless child resolves archive parent',()=>{const f=fixture();f.archive.header.rows.push(f.row('header'));f.active.rlz.rows.push(f.row('rlz'));f.pending(['rlz']);f.c._t11MigrasiSemuaTick_();assert.equal(f.active.rlz.rows.length,1);});
test('ownerless child fails closed without parent',()=>{const f=fixture();f.active.rlz.rows.push(f.row('rlz'));f.pending(['rlz']);assert.throws(()=>f.c._t11MigrasiSemuaTick_(),/RETRY_REQUIRED/);assert.equal(f.writes.length,0);});
test('standalone Temuan retains synthetic header and uses stored ULP',()=>{const f=fixture();f.active.tmn.rows.push(f.row('tmn',{kodeHeader:'PEG-TBL260930001'}));f.pending(['tmn']);f.c._t11MigrasiSemuaTick_();assert.equal(f.archive.tmn.rows[1][1],'PEG-TBL260930001');});
test('matching archive key but different payload never deletes',()=>{const f=fixture();f.active.header.rows.push(f.row('header'));f.archive.header.rows.push(f.row('header',{11:'different'}));f.pending(['header']);assert.throws(()=>f.c._t11MigrasiSemuaTick_());assert.equal(f.writes.length,0);});
test('identical today duplicate remains active',()=>{const f=fixture(),r=f.row('header',{tanggal:'2026-10-02'});f.active.header.rows.push(r);f.archive.header.rows.push(clone(r));f.pending(['header']);f.c._t11MigrasiSemuaTick_();assert.equal(f.writes.length,0);assert.equal(f.active.header.rows.length,2);});
test('identical old duplicate deleted without another copy',()=>{const f=fixture();f.active.header.rows.push(f.row('header'));f.archive.header.rows.push(f.row('header'));f.pending(['header']);f.c._t11MigrasiSemuaTick_();assert.deepEqual(f.writes.map(x=>x.kind),['delete']);assert.equal(f.archive.header.rows.length,2);});
for(const stage of['before-write','after-write','before-delete','after-delete','property'])test('retry after '+stage,()=>{
 const f=fixture();f.active.header.rows.push(f.row('header'));f.pending(['header']);let fired=false;f.hook=op=>{if(op===stage&&!fired){fired=true;throw Error('injected');}};
 assert.throws(()=>f.c._t11MigrasiSemuaTick_());assert.ok(f.active.header.rows.length===2||f.archive.header.rows.length===2);f.hook=()=>{};f.c._t11MigrasiSemuaTick_();assert.equal(f.active.header.rows.length,1);assert.equal(f.archive.header.rows.length,2);
});
test('partial copy with intact key cannot delete source',()=>{const f=fixture();f.active.header.rows.push(f.row('header'));f.pending(['header']);f.hook=(op,sh)=>{if(op==='after-write')sh.rows[1][11]='corrupt';};assert.throws(()=>f.c._t11MigrasiSemuaTick_());assert.equal(f.active.header.rows.length,2);f.hook=()=>{};assert.throws(()=>f.c._t11MigrasiSemuaTick_());assert.equal(f.active.header.rows.length,2);});
test('concurrent source mutation leaves source pending',()=>{const f=fixture();f.active.header.rows.push(f.row('header'));f.pending(['header']);f.hook=op=>{if(op==='after-write')f.active.header.rows[1][11]='changed';};assert.throws(()=>f.c._t11MigrasiSemuaTick_());assert.equal(f.active.header.rows.length,2);});
test('unchanged source formula is materialized as value',()=>{const f=fixture();f.active.header.rows.push(f.row('header',{11:4}));f.active.header.formulas['2:12']='=2+2';f.pending(['header']);f.c._t11MigrasiSemuaTick_();assert.equal(f.archive.header.rows[1][11],4);});
test('changed source formula blocks deletion even with same value',()=>{const f=fixture();f.active.header.rows.push(f.row('header',{11:4}));f.active.header.formulas['2:12']='=2+2';f.pending(['header']);f.hook=op=>{if(op==='after-write')f.active.header.formulas['2:12']='=1+3';};assert.throws(()=>f.c._t11MigrasiSemuaTick_());assert.equal(f.active.header.rows.length,2);});
test('append preserves orphan archive content',()=>{const f=fixture();f.active.header.rows.push(f.row('header'));const r=Array(17).fill('');r[11]='KEEP';f.archive.header.rows.push(r);f.pending(['header']);f.c._t11MigrasiSemuaTick_();assert.equal(f.archive.header.rows[1][11],'KEEP');assert.equal(f.archive.header.rows[2][1],'H');});
test('capacity failure leaves source',()=>{const f=fixture();f.active.header.rows.push(f.row('header'));f.archive.header.capacity=1;f.pending(['header']);assert.throws(()=>f.c._t11MigrasiSemuaTick_());assert.equal(f.writes.length,0);});
test('dry-run preserves state/cursors',()=>{const f=fixture();f.populate();f.pending();f.c.MIGRASI_DRY_RUN=true;const before=clone(f.properties);assert.equal(f.c._t11MigrasiSemuaTick_().skipped,'dry-run');assert.equal(f.writes.length,0);assert.deepEqual(f.properties,before);});
test('lock contention preserves work',()=>{const f=fixture();f.populate();f.pending();f.failLock=true;const before=clone(f.properties);assert.equal(f.c._t11MigrasiSemuaTick_().skipped,'lock');assert.equal(f.writes.length,0);assert.deepEqual(f.properties,before);});
for(const date of['2026-10-01','2026-10-02','2026-10-03'])test('ineligible date '+date,()=>{const f=fixture();f.active.header.rows.push(f.row('header',{tanggal:date}));f.pending(['header']);f.c._t11MigrasiSemuaTick_();assert.equal(f.writes.length,0);});
for(const date of['2026-02-30','garbage','','2026-09-30T24:00:00Z','2026-09-30T12:60:00Z','2026-09-30T12:00:60Z','2026-09-30T12:00:00+14:01','2026-09-30anything'])
test('invalid date remains pending, not successfully skipped: '+date,()=>{
 const f=fixture();f.active.header.rows.push(f.row('header',{tanggal:date}));f.pending(['header']);
 assert.throws(()=>f.c._t11MigrasiSemuaTick_(),/RETRY_REQUIRED/);assert.equal(f.writes.length,0);
 assert.equal(JSON.parse(f.properties.MIGRASI_SEMUA_STATE).header,true);
 assert.ok(f.logs.join('').includes('DATE_INVALID'));
});
for(const date of['2026-09-30T00:00:00Z','2026-09-30T23:59:59.999-05:00','2026-09-30T00:00+14:00','30/09/2026 23:59:59','2026-09-30 08:15:00','30/9/2026'])
test('business date timestamp H-2 migrates without rewriting value: '+date,()=>{
 const f=fixture();f.active.header.rows.push(f.row('header',{tanggal:date}));f.pending(['header']);
 assert.equal(f.c._t11MigrasiSemuaTick_().pending,false);
 assert.equal(f.active.header.rows.length,1);assert.equal(f.archive.header.rows[1][4],date);
});
test('real Date uses Jakarta while timestamp string keeps declared business date',()=>{
 const f=fixture();
 f.active.header.rows.push(f.row('header',{kodeHeader:'INSTANT',tanggal:new Date('2026-09-30T18:00:00Z')}),
   f.row('header',{kodeHeader:'CALENDAR',tanggal:'2026-09-30T18:00:00Z'}));
 f.pending(['header']);f.c._t11MigrasiSemuaTick_();
 assert.equal(f.active.header.rows[1][1],'INSTANT');assert.equal(f.archive.header.rows[1][1],'CALENDAR');
});
test('Date payload preserved exactly',()=>{const f=fixture(),d=new Date('2026-09-29T17:00:00Z');f.active.header.rows.push(f.row('header',{tanggal:d}));f.pending(['header']);f.c._t11MigrasiSemuaTick_();assert.equal(f.archive.header.rows[1][4].getTime(),d.getTime());});
test('P0 Shift Switching preserve time window',()=>{const f=fixture({now:'2026-10-02T00:18:00Z'});f.populate();f.pending(['p0','ysh','ysw']);for(const k of['p0','ysh','ysw'])f.properties[cursors[keys.indexOf(k)]]='2';const before=clone(f.properties);assert.equal(f.c._t11MigrasiSemuaTick_().pending,true);assert.equal(f.writes.length,0);assert.deepEqual(f.properties,before);});
test('P0 with photo and no approval remains active',()=>{const f=fixture();f.populate();f.active.p0.rows[1][23]='photo.jpg';f.pending(['p0']);f.c._t11MigrasiSemuaTick_();assert.equal(f.writes.length,0);});
test('Temuan keeps status/photo policy instead of H-2',()=>{const f=fixture();f.active.tmn.rows.push(f.row('tmn',{tanggal:'2026-10-02'}));f.pending(['tmn']);f.c._t11MigrasiSemuaTick_();assert.equal(f.active.tmn.rows.length,1);});
test('start preserves cursors and only replaces combined handler',()=>{const f=fixture();f.pending(['header']);f.properties.MIGRASI_HEADER_CURSOR='7';f.properties.MIGRASI_ROW_RLZ_CURSOR='9';const old={getHandlerFunction:()=> 'migrasiSemuaTick'},other={getHandlerFunction:()=> '_t11TickPusatSiSi_'};f.triggers.push(old,other);const before=clone(f.properties);f.c._t11MulaiMigrasiSemua_();assert.deepEqual(f.properties,before);assert.equal(f.triggers.includes(other),true);assert.deepEqual(f.triggers.map(t=>t.getHandlerFunction()),['_t11TickPusatSiSi_','_t11MigrasiSemuaTick_']);});
test('trigger create failure preserves old handler and state',()=>{const f=fixture();f.pending(['header']);f.properties.MIGRASI_HEADER_CURSOR='7';const old={getHandlerFunction:()=> 'migrasiSemuaTick'};f.triggers.push(old);const before=clone(f.properties);f.hook=op=>{if(op==='create-trigger')throw Error('quota');};assert.throws(()=>f.c._t11MulaiMigrasiSemua_());assert.deepEqual(f.properties,before);assert.deepEqual(f.triggers,[old]);});
test('25-row cap resumes without skipping shifted rows',()=>{const f=fixture();for(let i=0;i<30;i++)f.active.header.rows.push(f.row('header',{kodeHeader:'H'+i}));f.pending(['header']);assert.equal(f.c._t11MigrasiSemuaTick_().pending,true);assert.equal(f.active.header.rows.length,6);assert.equal(f.properties.MIGRASI_HEADER_CURSOR,'2');f.c._t11MigrasiSemuaTick_();assert.equal(f.archive.header.rows.length,31);assert.equal(f.active.header.rows.length,1);});
test('sanitized log excludes provider secrets',()=>{const f=fixture();f.active.header.rows.push(f.row('header'));f.pending(['header']);f.hook=op=>{if(op==='before-write')throw Error('secret-photo-token');};assert.throws(()=>f.c._t11MigrasiSemuaTick_());assert.ok(!f.logs.join('').includes('secret-photo-token'));});
test('CRLF source all-batch regression',()=>{const f=fixture({crlf:true});f.populate();f.pending();f.c._t11MigrasiSemuaTick_();assert.equal(f.writes.filter(x=>x.kind==='delete').length,13);});
for(const val of ['{bad','[]','null','{"header":1}','{"unknown":true}'])
test('corrupt pending state never silently resets '+val,()=>{
 const f=fixture();f.properties.MIGRASI_SEMUA_STATE=val;const before=clone(f.properties);
 assert.throws(()=>f.c._t11MigrasiSemuaTick_(),/STATE_INVALID/);
 assert.deepEqual(f.properties,before);assert.equal(f.writes.length,0);assert.equal(f.triggers.length,0);
});
for(const val of ['0','-1','2.5','abc'])
test('invalid cursor stays pending '+val,()=>{
 const f=fixture();f.active.header.rows.push(f.row('header'));f.pending(['header']);f.properties.MIGRASI_HEADER_CURSOR=val;
 assert.throws(()=>f.c._t11MigrasiSemuaTick_(),/RETRY_REQUIRED/);
 assert.equal(f.properties.MIGRASI_HEADER_CURSOR,val);assert.equal(f.writes.length,0);
});
test('duplicate active keys cannot delete either row',()=>{
 const f=fixture();f.active.header.rows.push(f.row('header'),f.row('header'));f.pending(['header']);
 assert.throws(()=>f.c._t11MigrasiSemuaTick_());assert.equal(f.writes.length,0);
});
test('duplicate archived keys cannot delete source',()=>{
 const f=fixture();f.active.header.rows.push(f.row('header'));f.archive.header.rows.push(f.row('header'),f.row('header'));f.pending(['header']);
 assert.throws(()=>f.c._t11MigrasiSemuaTick_());assert.equal(f.writes.length,0);
});
test('extra formula column blocks deletion even when value is empty',()=>{
 const f=fixture();const r=f.row('header');r.push('');f.active.header.rows.push(r);f.active.header.formulas['2:18']='=""';f.pending(['header']);
 assert.throws(()=>f.c._t11MigrasiSemuaTick_());assert.equal(f.writes.length,0);
});
test('unknown private dispatch cannot select arbitrary work',()=>{
 const f=fixture();assert.throws(()=>f.c._t11MigrationDispatch_('force'),/UNKNOWN_HANDLER/);assert.equal(f.writes.length,0);
});
test('archive header mismatch fails before copy',()=>{
 const f=fixture();f.active.header.rows.push(f.row('header'));f.archive.header.rows[0][2]='wrong-column';f.pending(['header']);
 assert.throws(()=>f.c._t11MigrasiSemuaTick_());assert.equal(f.writes.length,0);
});
test('same active and archive workbook fails closed',()=>{
 const f=fixture();f.pending(['header']);f.c.SPREADSHEET_ID_ARSIP='active';
 assert.throws(()=>f.c._t11MigrasiSemuaTick_(),/WORKBOOK_INVALID/);assert.equal(f.writes.length,0);
});
test('failed trigger cleanup retains completed state for retry',()=>{
 const f=fixture();f.pending(['header']);const t={getHandlerFunction:()=> '_t11MigrasiSemuaTick_'};f.triggers.push(t);
 f.hook=op=>{if(op==='delete-trigger')throw Error('failure');};assert.throws(()=>f.c._t11MigrasiSemuaTick_());
 assert.equal(JSON.parse(f.properties.MIGRASI_SEMUA_STATE).header,false);
 f.hook=()=>{};f.c._t11MigrasiSemuaTick_();assert.equal(f.properties.MIGRASI_SEMUA_STATE,undefined);assert.equal(f.triggers.length,0);
});
test('failing one batch does not erase another batch success',()=>{
 const f=fixture();f.active.header.rows.push(f.row('header',{ulp:'foreign'}));f.active.tmn.rows.push(f.row('tmn'));f.pending(['header','tmn']);
 assert.throws(()=>f.c._t11MigrasiSemuaTick_());const state=JSON.parse(f.properties.MIGRASI_SEMUA_STATE);
 assert.equal(state.header,true);assert.equal(state.tmn,false);assert.equal(f.archive.tmn.rows.length,2);
});
test('start with absent combined state preserves existing per-sheet cursors',()=>{
 const f=fixture();f.properties.MIGRASI_HEADER_CURSOR='7';f.c._t11MulaiMigrasiSemua_();
 assert.equal(f.properties.MIGRASI_HEADER_CURSOR,'7');assert.equal(Object.keys(JSON.parse(f.properties.MIGRASI_SEMUA_STATE)).length,13);
});
