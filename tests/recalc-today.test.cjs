'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url'),crypto=require('node:crypto');
const backend=path.resolve(__dirname,'../SiSi_BackEnd');
const clone=x=>structuredClone(x),today='2026-10-02';
async function fixture(options={}){
 const {loadBackend}=await import(pathToFileURL(path.join(__dirname,'harness/loader.js')));
 const loaded=loadBackend({backendRoot:backend});
 assert.deepEqual(loaded.errors,[],'all real backend modules must load');
 const c=loaded.context;
 const f={c,loaded,props:{},books:{},writes:[],formats:{},logs:[],now:Date.parse('2026-10-02T01:00:00Z'),hook(){},locked:false};
 class FakeDate extends Date{constructor(...a){super(...(a.length?a:[f.now]));}static now(){return f.now;}}
 c.Date=FakeDate;
 class Sheet{
  constructor(id,name,width,head){this.id=id;this.name=name;this.width=width;this.rows=[head||Array.from({length:width},(_,i)=>'c'+i)];this.formulas={};}
  getName(){return this.name;}getSheetId(){return Object.keys(f.books[this.id]).indexOf(this.name)+1;}
  getLastRow(){return this.rows.length;}getLastColumn(){return this.width;}getMaxRows(){return 10000;}
  setFrozenRows(){return this;}
  getDataRange(){return this.getRange(1,1,this.rows.length,this.width);}
  getRange(r,c,n=1,m=1){const sh=this;return{
   getValues(){f.hook('read',sh,{r,c,n,m});return Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>clone(sh.rows[r+i-1]?.[c+j-1]??'')));},
   getValue(){return this.getValues()[0][0];},
   getFormulas(){return Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>sh.formulas[(r+i)+':'+(c+j)]||''));},
   getDisplayValues(){return this.getValues().map(r=>r.map(String));},
   setNumberFormat(fmt){assert.ok(f.locked);f.formats[sh.name+':'+r+':'+c]=fmt;return this;},
   setValues(v){
    assert.ok(f.locked,'script lock required');f.hook('before-write',sh,{r,c,n,m,v});
    for(let i=0;i<n;i++){while(sh.rows.length<r+i)sh.rows.push(Array(sh.width).fill(''));for(let j=0;j<m;j++)sh.rows[r+i-1][c+j-1]=clone(v[i][j]);}
    f.writes.push({id:sh.id,name:sh.name,r,c,n,m,v:clone(v)});f.hook('after-write',sh,{r,c,n,m,v});return this;
   },setValue(v){return this.setValues([[v]]);},clearContent(){return this.setValues(Array.from({length:n},()=>Array(m).fill('')));}
  };}
  appendRow(r){return this.getRange(this.rows.length+1,1,1,r.length).setValues([r]);}
 }
 f.sheet=(id,name,width,head)=>{f.books[id]??={};return f.books[id][name]??=new Sheet(id,name,width,head);};
 c.SPREADSHEET_ID='active';c.SPREADSHEET_ID_ARSIP='archive';
 c.SPREADSHEET_ID_HTK_GROUNDING='master';c.SPREADSHEET_ID_HTK_PEMERATAAN='master';c.GARDU_MASTER.spreadsheetId='master';
 c.GANGGUAN_SS_ID='gangguan';
 c.SpreadsheetApp={
  openById(id){if(!f.books[id])throw Error('unknown fixture book '+id);return {getId:()=>id,getSheetByName:n=>f.books[id][n]||null,getSheets:()=>Object.values(f.books[id]),
   insertSheet(n){assert.equal(n,'db_Recalc_Queue');assert.ok(f.locked);return f.sheet(id,n,9,Array.from(c.RECALC_QUEUE_HEADER));}};},
  flush(){f.hook('flush');}
 };
 const lock={waitLock(){if(options.lockFail)throw Error('lock unavailable');f.locked=true;},hasLock:()=>f.locked,releaseLock(){f.locked=false;},tryLock(){f.locked=true;return true;}};
 c.LockService={getScriptLock:()=>lock,getUserLock:()=>({waitLock(){},hasLock:()=>true,releaseLock(){}})};
 c.PropertiesService={getScriptProperties:()=>({
  getProperty:k=>f.props[k]??null,getProperties:()=>({...f.props}),
  setProperty(k,v){f.hook('property',null,{k,v});f.props[k]=String(v);return this;},
  deleteProperty(k){f.hook('delete-property',null,{k});delete f.props[k];return this;}
 })};
 c.Logger={log:s=>f.logs.push(String(s))};
 c.CacheService={getScriptCache:()=>({get:()=>null,put(){},remove(){}})};
 c.Session={getScriptTimeZone:()=> 'Asia/Jakarta'};
 c.Utilities={
  getUuid:()=>crypto.randomUUID(),DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},
  computeDigest:(algo,s)=>Array.from(crypto.createHash('sha256').update(s).digest()),
  formatDate(d,tz,fmt){
   const date=new Date(new Date(d).getTime()+7*3600000),s=date.toISOString();
   if(fmt==='yyyy-MM-dd')return s.slice(0,10);
   if(fmt==='yyyy-MM')return s.slice(0,7);
   if(fmt==='HH:mm')return s.slice(11,16);
   if(fmt==='H')return String(date.getUTCHours());
   if(fmt==='yyMMdd')return s.slice(2,10).replace(/-/g,'');
   if(fmt==='dd/MM/yyyy HH:mm:ss')return s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4)+' '+s.slice(11,19);
   return s;
  }
 };
 c.audit_=()=>{};
 c.getSesiByToken=t=>t==='real-fixture-session'?{role:options.role||'Super User',ulp:options.ulp??'Toboali',username:'fixture'}:null;
 f.I=loaded.evalInVm('COL_INS');f.S=loaded.evalInVm('SHEET_INS');
 const specs=[
  [f.S.HEADER,17,f.I.HEADER],[f.S.TEMUAN,45,f.I.TEMUAN],['db_ROW_Realisasi',13,c.COL_ROW_RLZ],['db_ROW_Eksekusi',30,c.COL_ROW],
  [f.S.REALISASI,13,f.I.REALISASI],[c.SHEET_INSDU_REALISASI,12,c.COL_INSDU.REALISASI],
  [c.SHEET_YANDAL.P0,50,c.COL_P0],[c.SHEET_YANDAL.SHIFT,12,c.COL_YANDAL_SHIFT],
  [c.SHEET_HTK.PG,15,c.COL_HTK.PG],[c.SHEET_HTK.PEKERJAAN,17,c.COL_HTK.PEKERJAAN],[c.SHEET_HTK.MATERIAL,19,c.COL_HTK.MATERIAL]
 ];
 f.spec=Object.fromEntries(specs.map(([n,w,C])=>[n,{w,C}]));
 for(const id of ['active','archive'])for(const [n,w]of specs)f.sheet(id,n,w);
 for(const id of ['active','archive'])f.sheet(id,c.LH.SHEET,8,['No','Tanggal','Penyulang','Panjang kmS Inspeksi','Temuan','Eksekusi','Laporan UP3','Laporan UIW']);
 f.sheet('active',c.LH.SHEET,8).rows.push([1,today,'C4A keep','4,1','keep temuan','keep eksekusi','old UP3','old UIW']);
 f.sheet('active','db_Penyulang',10).rows.push(['', 'Toboali','P','', 'S','','','','','']);
 f.sheet('active','db_Tim',4).rows.push(['','Toboali','TBL','ROW 02']);
 f.sheet('active','db_Users',11).rows.push([1,'fixture@example.invalid','fixture','not-a-real-password','Super User','Toboali','TBL','Teknik','ROW','ROW 02','ALL']);
 f.sheet('active',c.SHEET_YANDAL.LIST_P0,3).rows.push([1,'ROW (Rabas)',2]);
 f.sheet('active','db_Recalc_Queue',9,Array.from(c.RECALC_QUEUE_HEADER));
 f.sheet('active','db_FotoRow_Queue',6,['id','status','kodeEksekusi','enqueuedAt','lastTriedAt','attempts']);
 f.sheet('master',c.SHEET_HTK.HARGROUNDING,18);
 f.sheet('master',c.SHEET_HTK.PEMERATAAN,29);
 const master=f.sheet('master',c.GARDU_MASTER.tab,178);while(master.rows.length<11)master.rows.push(Array(178).fill(''));
 f.sheet('gangguan',c.GANGGUAN_SHEET,30);
 f.add=(name,values={},id='active')=>{
  const {w,C}=f.spec[name],row=Array(w).fill('');
  for(const[k,v]of Object.entries(values)){assert.ok(k in C,k+' missing in '+name);row[C[k]]=clone(v);}
  f.books[id][name].rows.push(row);return row;
 };
 f.header=(key,tim,subTim=tim,day=today)=>f.add(f.S.HEADER,{kodeHeader:key,ulp:'Toboali',tanggal:day,tim,subTim,hari:'Jumat'});
 f.h=f.header('R01-X','ROW','ROW 02');
 f.r=f.add('db_ROW_Realisasi',{kodeHeader:'R01-X',kodePekerjaan:'R01-X-PNY.001',tanggal:today,tim:'ROW 02',penyulang:'P',section:'S',rabas:99});
 f.e=f.add('db_ROW_Eksekusi',{kodeHeader:'R01-X',kodePekerjaan:'R01-X-PNY.001',kodeEksekusi:'R01-X-PNY.001-EKS.001',ulp:'ULP Toboali',tanggal:today,tim:'ROW 02',penyulang:'P',section:'S',jenisPekerjaan:'Rabas',fotoSebelumUrl:'s',fotoPekerjaanUrl:'p',fotoSesudahUrl:'f'});
 f.header('Y-X','Yantek','Yantek 01');
 f.shift=f.add(c.SHEET_YANDAL.SHIFT,{kodeHeader:'Y-X',kodeShift:'Y-X-S.001',ulp:'Toboali',tanggal:today});
 f.p=f.add(c.SHEET_YANDAL.P0,{kodeHeader:'Y-X',kodeShift:'Y-X-S.001',kodeP0:'Y-X-S.001-P0.001',ulp:'Toboali',tanggal:today,namaPekerjaan:'ROW (Rabas)',fotoSesudah:'private/photo',timestampPembuatan:'2026-10-02T00:00:00Z',timestampSesudah:'2026-10-02T01:00:00Z',statusApproval:'Approved',lat:-2,long:106,latClosing:-2.01,longClosing:106.01,durasi:'old'});
 f.tick=()=>c.jalankanRecalcManual({token:'real-fixture-session'});
 f.until=(predicate,limit=100)=>{let r;for(let i=0;i<limit;i++){r=f.tick();if(predicate(r))return r;}throw Error('pipeline did not reach state: '+JSON.stringify(f.props));};
 f.complete=()=>f.until(r=>!r.pending);
 f.state=()=>JSON.parse(f.props.T11_RECALC_TODAY_V1||'{}');
 return f;
}
test('full modules load, source load itself is inert',async()=>{const f=await fixture();assert.deepEqual(f.props,{});assert.equal(f.writes.length,0);assert.equal(typeof f.c.jalankanRecalcManual,'function');});
test('real ROW, P0 and UP3/UIW builders complete ordered cycle',async()=>{
 const f=await fixture(),r=f.complete();
 assert.equal(r.tanggal,today);assert.equal(f.h[f.I.HEADER.kodeHeader],'R02-X');
 assert.equal(f.r[f.c.COL_ROW_RLZ.rabas],1);assert.equal(f.r[f.c.COL_ROW_RLZ.sedang],0);
 assert.equal(f.p[f.c.COL_P0.durasi],'1 jam');assert.equal(f.p[f.c.COL_P0.point],6);
 assert.match(f.h[f.I.HEADER.waText],/Realisasi/);
 const report=f.books.active[f.c.LH.SHEET].rows[1];assert.deepEqual(report.slice(2,6),['C4A keep','4,1','keep temuan','keep eksekusi']);
 assert.notEqual(report[6],'old UP3');assert.notEqual(report[7],'old UIW');
 assert.ok(f.writes.every(w=>w.id==='active'));assert.equal(r.watermarkForced,false);assert.ok(r.unsupportedOrManual>=1);
});
for(const opts of[{role:'Admin'},{role:'Operator'},{ulp:'Lain'},{ulp:''}])test('real Guard rejects '+JSON.stringify(opts),async()=>{
 const f=await fixture(opts);assert.throws(f.tick);assert.equal(f.writes.length,0);assert.deepEqual(f.props,{});
});
test('fake caller authority and absent token fail closed',async()=>{
 const f=await fixture();for(const p of[undefined,{}, {scheduled:true,internal:true,force:true},{token:'fake'}])assert.throws(()=>f.c.jalankanRecalcManual(p));
 assert.equal(f.writes.length,0);assert.deepEqual(f.props,{});
});
test('T11 capability routes existing ROW slot to pipeline; private slot cannot be called directly',async()=>{
 const f=await fixture();assert.throws(()=>f.c._t11PerbaikanKodeROW_(),/CONTEXT_REQUIRED/);
 f.c.TRIGGER_SISI_TUGAS=[{fn:'_t11PerbaikanKodeROW_',tiapMenit:1,berat:true}];
 const r=f.c._t11TickPusatSiSi_();assert.equal(r.gagal.length,0);assert.ok(f.props.T11_RECALC_TODAY_V1);
});
test('downstream scheduler jobs deferred and legacy receipts retained',async()=>{
 const f=await fixture();const q=f.books.active.db_Recalc_Queue;q.rows.push(['row','row|ROW 02|'+today,'ROW 02',today,'',123,'failed','',4]);
 const old=clone(q.rows);f.c.recalcTick();assert.deepEqual(q.rows,old);
 f.c.TRIGGER_SISI_TUGAS=[{fn:'drainLaporanDirty',tiapMenit:1},{fn:'refreshWaHarian',tiapMenit:1}];
 assert.equal(f.c._t11TickPusatSiSi_().gagal.length,0);assert.equal(f.writes.length,0);assert.deepEqual(q.rows,old);
});
for(const ulp of['Lain','','ULP ULP Toboali',['Toboali'],{}])test('stored owner denied '+JSON.stringify(ulp),async()=>{
 const f=await fixture();f.h[f.I.HEADER.ulp]=ulp;assert.throws(f.tick,/ULP_DENIED/);assert.equal(f.writes.length,0);
});
test('yesterday and future values are not written',async()=>{
 const f=await fixture();for(const day of['2026-10-01','2026-10-03']){
  f.header('R03-'+day,'ROW','ROW 03',day);
  f.add('db_ROW_Realisasi',{kodeHeader:'R03-'+day,kodePekerjaan:'R03-'+day+'-PNY.001',tanggal:day,tim:'ROW 03',rabas:123});
 }
 const old=clone(f.books.active.db_ROW_Realisasi.rows.slice(2));f.complete();assert.deepEqual(f.books.active.db_ROW_Realisasi.rows.slice(2),old);
});
test('journal retries a crash after a cell write without duplicating rows',async()=>{
 const f=await fixture();let once=true;f.hook=op=>{if(op==='after-write'&&once){once=false;throw Error('crash token secret');}};
 assert.throws(f.tick,/RETRY_REQUIRED/);assert.equal(f.state().journal,true);f.hook=()=>{};f.complete();
 assert.equal(f.books.active.db_ROW_Eksekusi.rows.length,2);assert.equal(f.h[f.I.HEADER.kodeHeader],'R02-X');
 assert.ok(!f.logs.join('').includes('token secret'));
});
test('pending previous-day journal refuses new-day writes',async()=>{
 const f=await fixture();f.hook=op=>{if(op==='before-write')throw Error('stop');};assert.throws(f.tick);
 f.hook=()=>{};f.now+=86400000;const old=clone(f.writes);assert.throws(f.tick,/PREVIOUS_DAY_JOURNAL_PENDING/);assert.deepEqual(f.writes,old);
});
test('formula protected and original value preserved',async()=>{
 const f=await fixture();f.books.active.db_Global_Header.formulas['2:2']='=test()';assert.throws(f.tick,/FORMULA_PROTECTED/);assert.equal(f.writes.length,0);
});
test('UIW failure cannot overwrite UP3 or C4A',async()=>{
 const f=await fixture();f.c.originalbuildLaporanWilayah=()=>{throw Error('fixture failure');};
 assert.throws(f.complete);const r=f.books.active[f.c.LH.SHEET].rows[1];assert.deepEqual(r.slice(2),['C4A keep','4,1','keep temuan','keep eksekusi','old UP3','old UIW']);
});
test('snapshot conflict retains journal and never overwrites external edit',async()=>{
 const f=await fixture();let once=true;f.hook=op=>{if(op==='after-write'&&once){once=false;throw Error('crash');}};assert.throws(f.tick);
 f.hook=()=>{};f.h[f.I.HEADER.kendala]='external edit';assert.throws(f.tick,/SOURCE_CHANGED/);assert.equal(f.h[f.I.HEADER.kendala],'external edit');assert.equal(f.state().journal,true);
});
test('authenticated run does not force any photo or WM processor',async()=>{
 const f=await fixture();for(const n of['_wmFotoY_','prosesP0Yandal','prosesSwitchingYandal','drainAntreanP0','_h07WatermarkImpl_'])f.c[n]=()=>{throw Error('must not run WM');};
 f.complete();
});
test('state corruption is not reset',async()=>{
 const f=await fixture();f.props.T11_RECALC_TODAY_V1='bad';assert.throws(f.tick,/STATE_INVALID/);assert.equal(f.props.T11_RECALC_TODAY_V1,'bad');
});
module.exports={fixture};
test('real raw ROW parent linking and photo queue, without touching photo content',async()=>{
 const f=await fixture();const e=f.add('db_ROW_Eksekusi',{kodeEksekusi:'raw-key',ulp:'Toboali',tanggal:today,tim:'ROW 02',penyulang:'P',fotoSebelum:'keep.jpg'});
 f.complete();assert.match(e[f.c.COL_ROW.kodeEksekusi],/^R02-X-PNY\.001-EKS\./);
 assert.equal(e[f.c.COL_ROW.kodeHeader],'R02-X');assert.equal(e[f.c.COL_ROW.fotoSebelum],'keep.jpg');
 assert.equal(f.books.active.db_FotoRow_Queue.rows.length,2);
});
test('real InsJar, Gardu and Hartek builders, including child recalculation',async()=>{
 const f=await fixture(),c=f.c;
 const hi=f.header('I-X','Inspeksi','Inspeksi Jaringan'),hg=f.header('G-X','Inspeksi','Inspeksi Gardu'),hh=f.header('H-X','Hartek');
 const ir=f.add(f.S.REALISASI,{kodeHeader:'I-X',kodePekerjaanPeny:'I-X-PNY.001',tanggal:today,penyulang:'P',section:'S',totalTiang:5,jumlahTemuan:8});
 const gr=f.add(c.SHEET_INSDU_REALISASI,{kodeHeader:'G-X',kodePekerjaanGardu:'G-X-GRD.001',tanggal:today,nomorGardu:'G001',penyulang:'P',section:'S',jumlahTemuan:9});
 const master=Array(178).fill('');master[c.COL_GARDU.ulp]='ULP Toboali';master[c.COL_GARDU.nomorGardu]='G001';master[c.COL_GARDU.penyulang]='P';master[c.COL_GARDU.section]='S';master[c.COL_GARDU.alamat]='test address';
 f.books.master.Master_Gardu.rows.push(master);
 const pg=f.add(c.SHEET_HTK.PG,{kodeHeader:'H-X',kodePG:'H-X-PNY.001',ulp:'Toboali',tanggal:today,jenisPekerjaan:'Jaringan',penyulang:'P',section:'S',jumlahGawang:1});
 f.add(c.SHEET_HTK.PEKERJAAN,{kodeHeader:'H-X',kodePG:'H-X-PNY.001',kodePekerjaan:'H-X-PNY.001-PKJ.001',ulp:'Toboali',tanggal:today,jenisPekerjaan:'Jaringan',pekerjaan:'Perbaikan',jumlahPekerjaan:1,satuanPekerjaan:'buah'});
 f.complete();
 for(const h of[hi,hg,hh]){assert.ok(h[f.I.HEADER.waText].length>20);assert.equal(h[f.I.HEADER.statusTextWa],'Update');}
 assert.equal(ir[f.I.REALISASI.jumlahTemuan],0);assert.equal(gr[c.COL_INSDU.REALISASI.jumlahTemuan],0);
 assert.match(pg[c.COL_HTK.PG.textWa],/Perbaikan/);
});
test('read-only archive contributes cumulative report without any archive write',async()=>{
 const f=await fixture();f.add(f.S.HEADER,{kodeHeader:'HIST','ulp':'ULP Toboali',tanggal:'2026-10-01',tim:'ROW',subTim:'ROW 02'},'archive');
 f.add('db_ROW_Realisasi',{kodeHeader:'HIST',kodePekerjaan:'HIST-PNY.001',tanggal:'2026-10-01',tim:'ROW 02',penyulang:'P',rabas:7},'archive');
 const old=clone(f.books.archive.db_ROW_Realisasi.rows);f.complete();assert.deepEqual(f.books.archive.db_ROW_Realisasi.rows,old);
 assert.match(f.h[f.I.HEADER.waText],/Total Bulanan Rabas \/ Pangkas : 8/);
});
test('foreign archived header cannot taint cumulative report',async()=>{
 const f=await fixture();f.add(f.S.HEADER,{kodeHeader:'HIST',ulp:'Lain',tanggal:'2026-10-01',tim:'ROW'},'archive');
 assert.throws(f.complete,/ULP_DENIED/);assert.equal(f.books.active[f.c.LH.SHEET].rows[1][6],'old UP3');
});
test('non-overlapping work-unit input change restarts upstream before reports',async()=>{
 const f=await fixture();let changed=false;
 f.hook=(op,sh,a)=>{if(op==='property'&&a.k==='T11_RECALC_TODAY_V1'){
  const s=JSON.parse(a.v);if(!changed&&s.phase===2&&!s.journal&&s.last==='ROW 02'){changed=true;f.e[f.c.COL_ROW.fotoSesudahUrl]='';}
 }};
 f.complete();assert.equal(changed,true);assert.equal(f.r[f.c.COL_ROW_RLZ.rabas],0);
});
test('midnight during one invocation retains original date',async()=>{
 const f=await fixture();f.now=Date.parse('2026-10-02T16:59:59Z');
 let once=true;f.hook=op=>{if(op==='after-write'&&once){once=false;f.now+=3000;}};
 const r=f.tick();assert.equal(r.tanggal,today);assert.equal(f.state().day,today);
});
test('40-cell journal batch resumes and never advances downstream early',async()=>{
 const f=await fixture();for(let i=2;i<=25;i++)f.add('db_ROW_Eksekusi',{kodeHeader:'R01-X',kodePekerjaan:'R01-X-PNY.001',kodeEksekusi:'R01-X-PNY.001-EKS.'+i,ulp:'Toboali',tanggal:today,tim:'ROW 02',penyulang:'P'});
 f.tick();assert.equal(f.state().phase,0);assert.equal(f.state().journal,true);assert.equal(f.state().pos,40);
 assert.equal(f.books.active[f.c.LH.SHEET].rows[1][6],'old UP3');f.complete();
 assert.ok(f.books.active.db_ROW_Eksekusi.rows.slice(1).every(r=>r[f.c.COL_ROW.kodeHeader]==='R02-X'));
});
test('queue failure retains complete journal for retry',async()=>{
 const f=await fixture(),orig=f.c.markWaDirty_;f.c.markWaDirty_=()=>false;
 assert.throws(f.tick,/QUEUE_FAILED/);assert.equal(f.state().journal,true);
 f.c.markWaDirty_=orig;f.complete();assert.equal(f.h[f.I.HEADER.kodeHeader],'R02-X');
});
test('bad queue schema never clears stored receipts',async()=>{
 const f=await fixture();const q=f.books.active.db_Recalc_Queue;q.rows[0][0]='unexpected';const old=clone(q.rows);
 assert.throws(f.tick,/QUEUE_SCHEMA/);assert.deepEqual(q.rows,old);
});
test('no-op builder cannot stamp stale WA as fresh',async()=>{
 const f=await fixture();f.h[f.I.HEADER.waText]='stale';f.c.recalcWaRow_=()=>{};
 assert.throws(f.complete,/HEADER_BUILD_FAILED/);assert.notEqual(f.h[f.I.HEADER.statusTextWa],'Update');
});
test('P0 missing device closing time keeps previous duration and reports pending',async()=>{
 const f=await fixture();f.p[f.c.COL_P0.timestampSesudah]='';
 assert.throws(f.complete,/P0_TIMESTAMP_PENDING/);assert.equal(f.p[f.c.COL_P0.durasi],'old');
 assert.equal(f.books.active[f.c.LH.SHEET].rows[1][6],'old UP3');
});
test('manual points without configured weight preserved and counted',async()=>{
 const f=await fixture();f.p[f.c.COL_P0.namaPekerjaan]='Lain - Lain';f.p[f.c.COL_P0.point]=77;
 const r=f.complete();assert.equal(f.p[f.c.COL_P0.point],77);assert.ok(r.unsupportedOrManual>=2);
});
test('large Unicode report journal respects 6000-byte chunks and preserves text',async()=>{
 const f=await fixture(),up3='é🧠 '.repeat(1700);
 f.c.originalbuildLaporanUP3=()=>up3;let max=0;f.hook=(op,sh,a)=>{if(op==='property'&&a.k.startsWith('T11_RECALC_JOURNAL_V1_')){max=Math.max(max,Buffer.byteLength(a.v));assert.ok(Buffer.byteLength(a.v)<=6000);}};
 f.complete();assert.equal(f.books.active[f.c.LH.SHEET].rows[1][6],up3);assert.equal(max,6000);
});
for(const stage of['journal-write','publish','progress','cleanup'])test('fault injection at '+stage+' preserves resumability',async()=>{
 const f=await fixture();let hit=false;f.hook=(op,sh,a)=>{
  const match=stage==='journal-write'?op==='property'&&a.k==='T11_RECALC_JOURNAL_V1_0':
   stage==='publish'?op==='property'&&a.k==='T11_RECALC_TODAY_V1'&&JSON.parse(a.v).journal:
   stage==='progress'?op==='property'&&a.k==='T11_RECALC_TODAY_V1'&&JSON.parse(a.v).pos===1:
   op==='delete-property'&&a.k==='T11_RECALC_JOURNAL_V1_0';
  if(match&&!hit){hit=true;throw Error('injected');}
 };assert.throws(f.tick);assert.equal(hit,true);f.hook=()=>{};f.complete();assert.equal(f.h[f.I.HEADER.kodeHeader],'R02-X');
});
test('new report row only appears after BOTH actual builders succeed',async()=>{
 const f=await fixture();f.books.active[f.c.LH.SHEET].rows.pop();f.complete();
 assert.equal(f.books.active[f.c.LH.SHEET].rows.length,2);assert.equal(f.books.active[f.c.LH.SHEET].rows[1][1],today);
});
test('UP3 input aliases normalized in memory, stored ULP untouched',async()=>{
 const f=await fixture();f.h[f.I.HEADER.ulp]=' ULP  TOBOALI ';
 f.complete();assert.equal(f.h[f.I.HEADER.ulp],' ULP  TOBOALI ');
 const up3=f.books.active[f.c.LH.SHEET].rows[1][6];assert.match(up3,/Rabas/);
});
test('same-value formula edits block journal replay',async()=>{
 const f=await fixture();let hit=false;f.hook=op=>{if(op==='after-write'&&!hit){hit=true;throw Error('crash');}};assert.throws(f.tick);
 f.hook=()=>{};f.books.active.db_ROW_Realisasi.formulas['2:8']='=1';assert.throws(f.tick,/SOURCE_CHANGED/);
});
test('source ownership race immediately before a cell read cannot overwrite it',async()=>{
 const f=await fixture();let reads=0;f.hook=(op,sh,a)=>{
  if(op==='read'&&sh.name==='db_Global_Header'&&a.r===2&&a.c===1&&++reads===1)f.h[f.I.HEADER.ulp]='Lain';
 };assert.throws(f.tick,/SOURCE_CHANGED/);assert.equal(f.h[f.I.HEADER.ulp],'Lain');
});
test('recalc and migration coexist with real Guard wrappers and no live trigger changes on load',async()=>{
 const f=await fixture();assert.equal(typeof f.c._t11MigrasiSemuaTick_,'function');
 assert.throws(()=>f.c.migrasiSemuaTick({internal:true}));assert.throws(()=>f.c.mulaiMigrasiSemua());
 assert.equal(f.writes.length,0);
});
test('raw ROW can create missing parent/header with exact ULP aliases',async()=>{
 const f=await fixture(),E=f.c.COL_ROW;
 const e=f.add('db_ROW_Eksekusi',{kodeEksekusi:'raw-new-team',ulp:'ULP Toboali',tanggal:today,tim:'ROW 03',penyulang:'P'});
 f.complete();assert.match(e[E.kodeHeader],/^R03-TBL/);assert.match(e[E.kodeEksekusi],/-PNY\.001-EKS\.001$/);
 assert.equal(f.books.active.db_Global_Header.rows.length,4);assert.equal(f.books.active.db_ROW_Realisasi.rows.length,3);
});
test('completed Temuan copies into ROW once, preserving photo URLs and identity',async()=>{
 const f=await fixture(),T=f.I.TEMUAN;
 f.add(f.S.TEMUAN,{kodeHeader:'synthetic',kodePekerjaan:'TMN-1',ulp:'Toboali',tanggal:'2026-10-01',tglSelesai:today,status:'Selesai',timEksekusi:'ROW 02',penyulang:'P',section:'S',diameter:0,jenisPekerjaan:'Rabas',koordinat:'-2,106',fotoTemuanUrl:'before-private',fotoPekerjaanUrl:'work-private',fotoSesudahUrl:'after-private'});
 f.complete();const rows=f.books.active.db_ROW_Eksekusi.rows;
 assert.equal(rows.length,3);assert.equal(rows[2][f.c.COL_ROW.fotoSebelumUrl],'before-private');
 f.complete();assert.equal(rows.length,3);assert.equal(f.books.active[f.S.TEMUAN].rows[1][T.kodePekerjaan],'TMN-1');
});
function receipt(f,kind,key,tim='',day='',header=''){
 const r=[kind,key,tim,day,header,f.now,'pending','',0];f.books.active.db_Recalc_Queue.rows.push(r);return r;
}
for(const date of['2026-10-02T00:00:00Z','2026-10-02T23:59:59.999-05:00','2026-10-02T00:00+14:00','2/10/2026 08:15:00','2026-10-02 08:15:00'])
test('ISO/slash business-date strings recalc and remain unchanged: '+date,async()=>{
 const f=await fixture();f.h[f.I.HEADER.tanggal]=date;
 f.complete();assert.equal(f.h[f.I.HEADER.tanggal],date);assert.match(f.h[f.I.HEADER.waText],/Realisasi/);
});
for(const date of['2026-02-30T00:00:00Z','2026-10-02T24:00:00Z','2026-10-02T12:60:00Z','2026-10-02T12:00:60Z','2026-10-02T00:00:00+14:01','2026-10-02garbage'])
test('invalid timestamp cannot be normalized into writable today: '+date,async()=>{
 const f=await fixture();f.h[f.I.HEADER.tanggal]=date;
 assert.throws(f.tick,/DATE_INVALID/);assert.equal(f.writes.length,0);
});
test('supported receipts marked done only after whole pipeline, retained and reopenable',async()=>{
 const f=await fixture(),r=receipt(f,'row','row|ROW 02|'+today,'ROW 02',today);
 const wa=receipt(f,'wa','wa|R01-X','','','R01-X');
 f.tick();assert.equal(r[6],'pending');assert.equal(wa[6],'pending');
 f.complete();assert.equal(r[6],'done');assert.equal(wa[6],'done');
 const first=r[5];f.c.markRecalcRowDirty_('ROW 02',today);
 assert.equal(r[6],'pending');assert.ok(r[5]>first);
 const rev=r[5];f.c.markRecalcRowDirty_('ROW 02',today);assert.ok(r[5]>rev);
 f.complete();assert.equal(r[6],'done');
});
test('canonical execution receipt survives mass code rename and completes',async()=>{
 const f=await fixture(),r=receipt(f,'eksekusiRow','eksekusiRow|R01-X-PNY.001-EKS.001','ROW 02',today);
 f.complete();assert.equal(r[6],'done');assert.equal(r[1],'eksekusiRow|R01-X-PNY.001-EKS.001');
 assert.equal(f.e[f.c.COL_ROW.kodeEksekusi],'R02-X-PNY.001-EKS.001');
});
test('raw execution receipt follows new identity without duplicate data',async()=>{
 const f=await fixture();
 f.add('db_ROW_Eksekusi',{kodeEksekusi:'raw-receipt',ulp:'Toboali',tanggal:today,tim:'ROW 02',penyulang:'P'});
 const r=receipt(f,'eksekusiRow','eksekusiRow|raw-receipt','ROW 02',today);
 f.complete();assert.equal(r[6],'done');assert.equal(f.books.active.db_ROW_Eksekusi.rows.length,3);
 f.complete();assert.equal(f.books.active.db_ROW_Eksekusi.rows.length,3);
});
test('pipeline failure retains all pending receipts including renamed WA',async()=>{
 const f=await fixture(),r=receipt(f,'wa','wa|R01-X','','','R01-X');
 const orig=f.c.originalbuildLaporanWilayah;f.c.originalbuildLaporanWilayah=()=>{throw Error('report failed');};
 assert.throws(f.complete);assert.equal(r[6],'pending');
 f.c.originalbuildLaporanWilayah=orig;f.complete();assert.equal(r[6],'done');
});
test('new revision after successful header cannot be acknowledged by old result',async()=>{
 const f=await fixture(),r=receipt(f,'wa','wa|R01-X','','','R01-X');let changed=false,passes=0;
 const builder=f.c.recalcWaRow_;f.c.recalcWaRow_=function(){passes++;return builder.apply(this,arguments);};
 f.hook=(op,sh,a)=>{
  if(op==='property'&&a.k==='T11_RECALC_TODAY_V1'){
   const s=JSON.parse(a.v);
   if(!changed&&s.phase===5&&!s.journal){changed=true;r[5]+=1;assert.equal(r[6],'pending');}
  }
 };
 f.complete();assert.equal(changed,true);assert.ok(passes>=2);assert.equal(r[6],'done');
});
test('today report revision acknowledged, historical/future dirty dates retained',async()=>{
 const f=await fixture();f.props.LAPORAN_DIRTY_DATES=JSON.stringify({[today]:5,'2026-10-01':4,'2026-10-03':6});
 f.complete();assert.deepEqual(JSON.parse(f.props.LAPORAN_DIRTY_DATES),{'2026-10-01':4,'2026-10-03':6});
});
test('new report revision during replay is retained for next cycle',async()=>{
 const f=await fixture();f.props.LAPORAN_DIRTY_DATES=JSON.stringify({[today]:5});let changed=false;
 f.hook=(op,sh)=>{if(op==='after-write'&&sh.name===f.c.LH.SHEET&&!changed){
  changed=true;f.props.LAPORAN_DIRTY_DATES=JSON.stringify({[today]:6});
 }};
 f.complete();assert.equal(JSON.parse(f.props.LAPORAN_DIRTY_DATES)[today],6);
 f.hook=()=>{};f.complete();assert.equal(JSON.parse(f.props.LAPORAN_DIRTY_DATES)[today],undefined);
});
test('historical future failed unsupported and unknown receipts remain untouched',async()=>{
 const f=await fixture(),kept=[
  receipt(f,'row','row|ROW 02|2026-10-01','ROW 02','2026-10-01'),
  receipt(f,'row','row|ROW 02|2026-10-03','ROW 02','2026-10-03'),
  receipt(f,'wa','wa|Y-X','','','Y-X'),
  receipt(f,'eksekusiRow','eksekusiRow|missing','ROW 02',today),
  receipt(f,'other','other|test')
 ];
 const fail=receipt(f,'row','row|ROW 02|'+today,'ROW 02',today);fail[6]='failed';fail[8]=5;kept.push(fail);
 const before=clone(kept);f.complete();assert.deepEqual(kept,before);
});
test('queue acknowledgement crash is idempotent and preserves completed receipt',async()=>{
 const f=await fixture(),r=receipt(f,'wa','wa|R01-X','','','R01-X');let crash=true;
 f.hook=(op,sh,a)=>{if(op==='after-write'&&sh.name==='db_Recalc_Queue'&&a.c===7&&crash){crash=false;throw Error('crash');}};
 assert.throws(f.complete);assert.equal(r[6],'done');f.hook=()=>{};f.complete();
 assert.equal(r[6],'done');assert.equal(f.books.active.db_Recalc_Queue.rows.filter(x=>x[1]===r[1]).length,1);
});
test('duplicate or formula queue cannot clear or acknowledge receipts',async()=>{
 for(const mode of['duplicate','formula']){
  const f=await fixture(),r=receipt(f,'wa','wa|R01-X','','','R01-X');
  if(mode==='duplicate')f.books.active.db_Recalc_Queue.rows.push(clone(r));
  else f.books.active.db_Recalc_Queue.formulas['2:7']='="pending"';
  const before=clone(f.books.active.db_Recalc_Queue.rows);assert.throws(f.tick,/QUEUE_/);
  assert.deepEqual(f.books.active.db_Recalc_Queue.rows,before);
 }
});
test('more than eight renamed receipts retain provenance and all complete',async()=>{
 const f=await fixture(),receipts=[];
 for(let i=0;i<12;i++){
  const key='R01-X'+i;f.header(key,'ROW','ROW 02');
  receipts.push(receipt(f,'wa','wa|'+key,'','',key));
 }
 f.complete();assert.ok(receipts.every(r=>r[6]==='done'));
 assert.ok(receipts.every(r=>f.books.active.db_Recalc_Queue.rows.includes(r)));
});
test('missing captured receipt fails closed, never recreates or silently acknowledges',async()=>{
 const f=await fixture(),r=receipt(f,'wa','wa|R01-X','','','R01-X');let removed=false;
 f.hook=(op,sh,a)=>{if(op==='property'&&a.k==='T11_RECALC_TODAY_V1'){
  const s=JSON.parse(a.v);if(!removed&&s.phase===5){removed=true;
   f.books.active.db_Recalc_Queue.rows.splice(f.books.active.db_Recalc_Queue.rows.indexOf(r),1);
  }
 }};
 assert.throws(f.complete,/QUEUE_CHANGED/);assert.equal(removed,true);assert.notEqual(f.state().complete,true);
 assert.equal(f.books.active.db_Recalc_Queue.rows.includes(r),false);
});
test('unresolved ROW team receipt does not starve supported work',async()=>{
 const f=await fixture(),unknown=receipt(f,'row','row|ROW 99|'+today,'ROW 99',today);
 const good=receipt(f,'wa','wa|R01-X','','','R01-X');f.complete();
 assert.equal(unknown[6],'pending');assert.equal(good[6],'done');
});
for(const fault of['chunk','state'])test('receipt bank '+fault+' failure retains previous durable provenance',async()=>{
 const f=await fixture(),r=receipt(f,'wa','wa|R01-X','','','R01-X');let failed=false;
 f.hook=(op,sh,a)=>{
  const hit=op==='property'&&(fault==='chunk'?a.k.startsWith('T11_RECALC_RECEIPTS_V1_'):
   a.k==='T11_RECALC_TODAY_V1'&&JSON.parse(a.v).receiptStore);
  if(hit&&!failed){failed=true;throw Error('receipt storage failed');}
 };
 assert.throws(f.complete);assert.equal(r[6],'pending');f.hook=()=>{};f.complete();assert.equal(r[6],'done');
});
test('corrupt receipt bank cannot be ignored and reset',async()=>{
 const f=await fixture();receipt(f,'wa','wa|R01-X','','','R01-X');f.tick();
 const a=f.state().receiptStore,key='T11_RECALC_RECEIPTS_V1_'+a.bank+'_0';
 f.props[key]='bad';const before=clone(f.writes);assert.throws(f.tick,/STATE_INVALID/);assert.deepEqual(f.writes,before);
});
test('missing queue is empty for capture and safely bootstrapped on real enqueue',async()=>{
 const f=await fixture();delete f.books.active.db_Recalc_Queue;
 f.complete();assert.ok(f.books.active.db_Recalc_Queue);
 assert.ok(f.books.active.db_Recalc_Queue.rows.slice(1).every(r=>r[6]==='done'));
});
test('receipt cap fails before code renames, never strands unclaimed identities',async()=>{
 const f=await fixture();
 for(let i=0;i<257;i++){
  const key='R01-CAP'+i;f.header(key,'ROW','ROW 02');receipt(f,'wa','wa|'+key,'','',key);
 }
 assert.throws(f.tick,/RECEIPT_LIMIT/);assert.equal(f.writes.length,0);
 assert.equal(f.h[f.I.HEADER.kodeHeader],'R01-X');
});
