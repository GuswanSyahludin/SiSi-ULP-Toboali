/* PR63 local candidate: bounded, today-only recalculation.
 * No trigger, spreadsheet, property or network side effects at source load.
 * Private T11 owns scheduled entry; public entry requires an actual Super session.
 * A journal is a retry record, NOT a transaction against external AppSheet writers.
 */
function jalankanRecalcManual(params) {
  var g = guard_(arguments, { ulp: true, role: ['SUPER'], aksi: 'jalankanRecalcManual' });
  if (!g || !g.sesi || typeof g.sesi.ulp !== 'string' || typeof g.ulp !== 'string' ||
      !/^(ulp )?toboali$/.test(g.ulp.trim().toLowerCase().replace(/\s+/g, ' ')))
    throw new Error('T11_RECALC_CALLER_DENIED');
  return _t11RecalcToday_();
}
(function _installRecalcToday_(root) {
  var STATE = 'T11_RECALC_TODAY_V1', JOURNAL = 'T11_RECALC_JOURNAL_V1_';
  var active = false, phases = ['codes', 'raw', 'row', 'p0', 'headers', 'reports'];
  function _stop_(code) { throw new Error('T11_RECALC_' + code); }
  // Cooperative ScriptLock hand-off shared with Migration-Worker. The request is
  // only a hint; ownership, lease, journal and auth checks are unchanged.
  var YIELD = 'T11_SCRIPT_LOCK_YIELD_V1', YIELD_TTL = 180000, SELF = 'recalc';
  var YIELD_PARTIES = ['migration', 'recalc'];
  function _yieldRead_(p) {
    var raw = p.getProperty(YIELD), r;
    if (raw == null) return null;
    try { r = JSON.parse(raw); } catch (e) { return null; }
    if (!r || typeof r !== 'object' || YIELD_PARTIES.indexOf(r.by) < 0 ||
        typeof r.at !== 'number' || !isFinite(r.at)) return null;
    return r;
  }
  function _yieldFresh_(r) {
    var age = r ? Date.now() - r.at : NaN;
    return !!r && age >= -60000 && age <= YIELD_TTL;
  }
  function _yieldAsk_(p) {
    var r = _yieldRead_(p);
    if (_yieldFresh_(r) && r.by !== SELF) return;
    p.setProperty(YIELD, JSON.stringify({ by: SELF, at: Date.now() }));
  }
  function _yieldClearOwn_(p) {
    var r = _yieldRead_(p);
    if (r && r.by === SELF) p.deleteProperty(YIELD);
  }
  function _yieldOther_(p) {
    var r = _yieldRead_(p);
    return _yieldFresh_(r) && r.by !== SELF ? r.by : '';
  }
  function _text_(v) { return String(v == null ? '' : v).trim(); }
  function _owned_(v) {
    return typeof v === 'string' && /^(ulp )?toboali$/.test(v.trim().toLowerCase().replace(/\s+/g, ' '));
  }
  function _day_(v) {
    if (Object.prototype.toString.call(v) === '[object Date]') {
      if (isNaN(v.getTime())) _stop_('DATE_INVALID');
      return Utilities.formatDate(v, 'Asia/Jakarta', 'yyyy-MM-dd');
    }
    if (typeof v !== 'string') _stop_('DATE_INVALID');
    // Same business-date contract as migration and legacy _normTgl:
    // strings keep their written calendar date; Date instants use Jakarta.
    var s=v.trim(),m=/^(\d{4}-\d{2}-\d{2})(.*)$/.exec(s),tail='',day;
    if(m){day=m[1];tail=m[2];}
    else {
      m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})(.*)$/.exec(s);
      if(!m)_stop_('DATE_INVALID');
      day=m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2);tail=m[4];
    }
    var d=new Date(day+'T00:00:00Z');
    if(!isFinite(d.getTime())||d.toISOString().slice(0,10)!==day)_stop_('DATE_INVALID');
    if(tail){
      var t=/^[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?$/.exec(tail);
      if(!t||+t[1]>23||+t[2]>59||+(t[3]||0)>59)_stop_('DATE_INVALID');
      if(t[5]&&t[5]!=='Z'){
        var h=+t[5].slice(1,3),n=+t[5].slice(4);
        if(h>14||n>59||(h===14&&n!==0))_stop_('DATE_INVALID');
      }
    }
    return day;
  }
  function _encode_(v) {
    if (Object.prototype.toString.call(v) === '[object Date]') return {date:v.toISOString()};
    if (Array.isArray(v)) return v.map(_encode_);
    if (v && typeof v === 'object') {
      var o = {}; Object.keys(v).forEach(function(k){o[k]=_encode_(v[k]);}); return o;
    }
    return v;
  }
  function _decode_(v) {
    if (v && !Array.isArray(v) && typeof v === 'object' && Object.keys(v).length===1 && v.date)
      return new Date(v.date);
    if (Array.isArray(v)) return v.map(_decode_);
    if (v && typeof v === 'object') {
      var o={};Object.keys(v).forEach(function(k){o[k]=_decode_(v[k]);});return o;
    }
    return v;
  }
  function _json_(v) {
    // ASCII serialization makes character limits exact UTF-8 byte limits,
    // including Indonesian text, emoji and surrogate pairs.
    return JSON.stringify(_encode_(v)).replace(/[\u007f-\uffff]/g,function(c){
      return '\\u'+('000'+c.charCodeAt(0).toString(16)).slice(-4);
    });
  }
  function _clone_(v) { return _decode_(JSON.parse(_json_(v))); }
  function _hash_(v) {
    return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,_json_(v),Utilities.Charset.UTF_8)
      .map(function(b){return ('0'+(b&255).toString(16)).slice(-2);}).join('');
  }
  function _need_(name) { if(typeof root[name]!=='function') _stop_('DEPENDENCY_MISSING');return root[name]; }
  var QHEAD=['jenis','key','tim','tanggal','kodeHeader','dirtyAt','status','lastTriedAt','attempts'];
  function _queue_(app,create) {
    var sh=app.openById(root.SPREADSHEET_ID).getSheetByName('db_Recalc_Queue');
    if(!sh&&create){
      sh=app.openById(root.SPREADSHEET_ID).insertSheet('db_Recalc_Queue');
      sh.getRange(1,1,1,9).setValues([QHEAD]);sh.setFrozenRows(1);
    }
    if(!sh)return {sh:null,keys:Object.create(null)};
    if(!sh||sh.getLastColumn()!==9||sh.getLastRow()*9>250000)_stop_('QUEUE_SCHEMA');
    var rows=sh.getDataRange().getValues(),forms=sh.getDataRange().getFormulas(),keys=Object.create(null);
    if(_json_(rows[0])!==_json_(QHEAD))_stop_('QUEUE_SCHEMA');
    rows.slice(1).forEach(function(r,i){
      if(!r.some(function(v){return v!==''&&v!=null;}))return;
      var k=_text_(r[1]);if(!k||keys[k])_stop_('QUEUE_IDENTITY');
      if(forms[i+1].some(function(v){return !!v;}))_stop_('QUEUE_FORMULA');
      keys[k]={row:i+2,v:r};
    });
    return {sh:sh,keys:keys};
  }
  // Retain receipts as done, not delete them. A new enqueue reopens the same
  // receipt with a monotonic revision, even twice in the same millisecond.
  root._enqueueRecalc_=function(rec) {
    var lock=LockService.getScriptLock();
    try {
      lock.waitLock(10000);if(!lock.hasLock())return false;
      if(!rec||['row','wa','eksekusiRow'].indexOf(rec.jenis)<0||!_text_(rec.key))_stop_('QUEUE_INVALID');
      var q=_queue_(root.SpreadsheetApp,true),hit=q.keys[rec.key],now=Date.now();
      var identity=[rec.jenis,rec.key,rec.tim||'',rec.tanggal||'',rec.kodeHeader||''];
      if(hit){
        if(_json_(hit.v.slice(0,5))!==_json_(identity))_stop_('QUEUE_IDENTITY');
        var rev=Number(hit.v[5]);if(!Number.isSafeInteger(rev)||rev<1)_stop_('QUEUE_INVALID');
        now=Math.max(now,rev+1);
        if(_json_(q.sh.getRange(hit.row,1,1,9).getValues()[0])!==_json_(hit.v))_stop_('QUEUE_CHANGED');
        q.sh.getRange(hit.row,6,1,4).setValues([[now,'pending',hit.v[7],hit.v[8]]]);
      } else q.sh.appendRow(identity.concat([now,'pending','',0]));
      return true;
    } finally {try{if(lock.hasLock())lock.releaseLock();}catch(ignore){}}
  };
  function _claimable_(r) {
    return Number.isSafeInteger(r[5])&&r[5]>0&&
      (r[6]==='pending'||(r[6]==='processing'&&Number.isFinite(Number(r[7]))&&Date.now()-Number(r[7])>600000));
  }
  function _binding_(q,old,day,app) {
    var env=_schema_(),H=env.I.HEADER,E=root.COL_ROW;
    var kind=_text_(q[0]),key=_text_(q[1]),ref=old?old.ref:'',tim='';
    var ss=app.openById(root.SPREADSHEET_ID);
    function _data_(name){
      var sh=ss.getSheetByName(name);
      if(!sh||sh.getLastRow()*sh.getLastColumn()>250000)_stop_('SNAPSHOT_LIMIT');
      return sh.getDataRange().getValues().slice(1);
    }
    function _one_(name,col,k){
      var a=_data_(name).filter(function(r){return _text_(r[col])===k;});
      if(a.length!==1)return null;return a[0];
    }
    if(kind==='wa'){
      if(!q[4]||key!=='wa|'+q[4])return null;
      ref=ref||q[4];var h=_one_(env.S.HEADER,H.kodeHeader,ref);
      if(!h||!_owned_(h[H.ulp])||_day_(h[H.tanggal])!==day||!_need_('_findWaBuilder')(h[H.tim],h[H.subTim]))return null;
    } else if(kind==='row'){
      tim=_text_(q[2]);
      if(_day_(q[3])!==day||key!=='row|'+tim+'|'+day||!_need_('_isTimROW_')(tim))return null;
      var R=root.COL_ROW_RLZ,T=env.I.TEMUAN;
      var hasRows=[['db_ROW_Realisasi',R],['db_ROW_Eksekusi',E]].some(function(item){
        return _data_(item[0]).some(function(r){return _text_(r[item[1].tim])===tim&&_day_(r[item[1].tanggal])===day;});
      });
      if(!hasRows)hasRows=_data_(env.S.TEMUAN).some(function(r){
        return _text_(r[T.timEksekusi])===tim&&_text_(r[T.status])==='Selesai'&&
          _text_(r[T.tglSelesai])&&_day_(r[T.tglSelesai])===day&&r[T.diameter]!=='';
      });
      if(!hasRows)return null; // unresolved work is retained, not a claim that starves the batch
      ref=tim;
    } else if(kind==='eksekusiRow'){
      if(key.indexOf('eksekusiRow|')!==0)return null;
      ref=ref||key.slice(12);var e=_one_('db_ROW_Eksekusi',E.kodeEksekusi,ref);
      if(!e||!_owned_(e[E.ulp])||_day_(e[E.tanggal])!==day)return null;
      tim=_text_(e[E.tim]);
      if(!_need_('_isTimROW_')(tim)||(_text_(q[2])&&_text_(q[2])!==tim)||_day_(q[3])!==day)return null;
    } else return null;
    return {key:key,kind:kind,ref:ref,tim:tim,identity:_hash_(q.slice(0,5)),
      hash:_hash_(q),done:!!(old&&old.hash===_hash_(q)&&old.done)};
  }
  function _captureReceipts_(s,app) {
    var q=_queue_(app),out=[],old=Object.create(null);
    (s.receipts||[]).forEach(function(c){old[c.key]=c;});
    // Capture all supported pending identities before any key rename. A limit
    // fails BEFORE planning, never strands an unclaimed old-key receipt.
    // Existing mappings come only from successfully replayed journals.
    var keys=Object.keys(old).concat(Object.keys(q.keys).filter(function(k){return !old[k];}));
    keys.forEach(function(k){
      var hit=q.keys[k];
      if(!hit&&old[k])_stop_('QUEUE_CHANGED');
      if(!hit||!_claimable_(hit.v))return;
      var prior=old[k];
      if(prior&&prior.identity!==_hash_(hit.v.slice(0,5)))_stop_('QUEUE_CHANGED');
      var c=_binding_(hit.v,prior,s.day,app);if(c)out.push(c);
    });
    if(out.length>256||_json_(out).length>120000)_stop_('RECEIPT_LIMIT');
    return out;
  }
  function _dirtyRevision_(day,ack) {
    var lock=LockService.getUserLock();
    try {
      lock.waitLock(10000);if(!lock.hasLock())_stop_('QUEUE_LOCK_REQUIRED');
      var p=PropertiesService.getScriptProperties(),raw=p.getProperty('LAPORAN_DIRTY_DATES'),map;
      try{map=raw?JSON.parse(raw):{};}catch(e){_stop_('QUEUE_INVALID');}
      if(!map||typeof map!=='object'||Array.isArray(map))_stop_('QUEUE_INVALID');
      Object.keys(map).forEach(function(k){
        if(_day_(k)!==k||!Number.isSafeInteger(map[k])||map[k]<1)_stop_('QUEUE_INVALID');
      });
      var rev=map[day]||0;
      if(ack&&rev===ack){delete map[day];p.setProperty('LAPORAN_DIRTY_DATES',JSON.stringify(map));}
      return rev;
    } finally {try{if(lock.hasLock())lock.releaseLock();}catch(ignore){}}
  }
  function _watchChanged_(s) {
    return (s.watch||[]).some(function(a){
      var sh=SpreadsheetApp.openById(a.id).getSheetByName(a.name);
      return !sh||_hash_([sh.getDataRange().getValues(),sh.getDataRange().getFormulas()])!==a.hash;
    });
  }
  function _reset_(s,day) {
    var receipts=s.day===day?(s.receipts||[]):[];
    receipts.forEach(function(c){c.done=false;});
    return {day:day,phase:0,last:'',complete:false,skip:0,receipts:receipts};
  }
  function _finishReceipts_(s,started) {
    if(_watchChanged_(s))return false;
    var q=_queue_(root.SpreadsheetApp),retry=false;
    (s.receipts||[]).forEach(function(c){
      var hit=q.keys[c.key];
      if(!hit)_stop_('QUEUE_CHANGED');
      if(c.identity!==_hash_(hit.v.slice(0,5)))_stop_('QUEUE_CHANGED');
      if(hit.v[6]==='done')return; // retry after acknowledgement but before state save
      if(!_claimable_(hit.v))return; // failed/owned processing is never acknowledged
      if(!c.done||c.hash!==_hash_(hit.v)||Date.now()-started>=90000){retry=true;return;}
      var bound=_binding_(hit.v,c,s.day,root.SpreadsheetApp);
      if(!bound||bound.ref!==c.ref||bound.tim!==c.tim){retry=true;return;}
      if(_watchChanged_(s))_stop_('SOURCE_CHANGED');
      var range=q.sh.getRange(hit.row,1,1,9),v=range.getValues()[0];
      if(_hash_(v)!==c.hash||range.getFormulas()[0].some(function(x){return !!x;}))_stop_('QUEUE_CHANGED');
      var done=v.slice();done[6]='done';done[7]=Date.now();
      q.sh.getRange(hit.row,7,1,2).setValues([[done[6],done[7]]]);SpreadsheetApp.flush();
      if(_json_(range.getValues()[0])!==_json_(done))_stop_('QUEUE_VERIFY_FAILED');
    });
    return !retry;
  }
  function _schema_() {
    var I = typeof COL_INS !== 'undefined' ? COL_INS : root.COL_INS;
    var S = typeof SHEET_INS !== 'undefined' ? SHEET_INS : root.SHEET_INS;
    if(!I || !S || !root.COL_ROW || !root.COL_P0 || !root.COL_HTK || !root.COL_INSDU)
      _stop_('SCHEMA_MISSING');
    var out={};
    function _add_(name,c,key,ulp,parent,date) {
      if(!c || !Number.isInteger(c[key]) || !Number.isInteger(c[date||'tanggal'])) _stop_('SCHEMA_MISSING');
      out[name]={c:c,key:c[key],ulp:ulp?c[ulp]:null,parent:parent?c[parent]:null,date:c[date||'tanggal']};
    }
    _add_(S.HEADER,I.HEADER,'kodeHeader','ulp');
    _add_('db_ROW_Realisasi',root.COL_ROW_RLZ,'kodePekerjaan',null,'kodeHeader');
    _add_('db_ROW_Eksekusi',root.COL_ROW,'kodeEksekusi','ulp','kodeHeader');
    _add_(S.TEMUAN,I.TEMUAN,'kodePekerjaan','ulp');
    _add_(S.REALISASI,I.REALISASI,'kodePekerjaanPeny',null,'kodeHeader');
    _add_(root.SHEET_INSDU_REALISASI,root.COL_INSDU.REALISASI,'kodePekerjaanGardu',null,'kodeHeader');
    _add_(root.SHEET_YANDAL.P0,root.COL_P0,'kodeP0','ulp','kodeHeader');
    _add_(root.SHEET_YANDAL.SHIFT,root.COL_YANDAL_SHIFT,'kodeShift','ulp','kodeHeader');
    _add_(root.SHEET_HTK.PG,root.COL_HTK.PG,'kodePG','ulp','kodeHeader');
    _add_(root.SHEET_HTK.PEKERJAAN,root.COL_HTK.PEKERJAAN,'kodePekerjaan','ulp','kodeHeader');
    _add_(root.SHEET_HTK.MATERIAL,root.COL_HTK.MATERIAL,'kodeMaterial','ulp','kodeHeader');
    _add_(root.SHEET_HTK.HARGROUNDING,root.COL_HTK.HARGROUNDING,'kodeHarGrounding',null,'kodeHeader');
    _add_(root.SHEET_HTK.PEMERATAAN,root.COL_HTK.PEMERATAAN,'kodePemerataan',null,'kodeHeader');
    return {I:I,S:S,tables:out};
  }
  // Read-through snapshot / write-behind facade. All builder mutations remain
  // in memory until ownership, dates, dependencies and output have been checked.
  function _plan_(state) {
    var env=_schema_(), H=env.I.HEADER, E=root.COL_ROW, R=root.COL_ROW_RLZ, P=root.COL_P0;
    var realApp=root.SpreadsheetApp, bookId=root.SPREADSHEET_ID, seen={}, failed=false, totalCells=0;
    var phase=phases[state.phase], queue=[], touched={}, restore={}, result={skip:0}, key='';
    var receipts=_captureReceipts_(state,realApp),dirtyRevision=phase==='reports'?_dirtyRevision_(state.day):0;
    function _fail_(code) { failed=true;_stop_(code); }
    function _read_(id,name) {
      var k=id+'|'+name;if(seen[k])return seen[k];
      try {
        var sh=realApp.openById(id).getSheetByName(name);
        if(!sh)_fail_('SHEET_MISSING');
        var nr=Math.max(1,sh.getLastRow()),nc=Math.max(1,sh.getLastColumn());
        totalCells+=nr*nc;
        if(nr*nc>250000 || totalCells>600000) _fail_('SNAPSHOT_LIMIT');
        var b=sh.getRange(1,1,nr,nc).getValues(), f=sh.getRange(1,1,nr,nc).getFormulas();
        var s={id:id,name:name,sh:sh,b:b,f:f,v:_clone_(b),nr:nr,nc:nc,formats:{},writes:{}};
        seen[k]=s;return s;
      } catch(e) {failed=true;throw e;}
    }
    function _sheet_(name){return _read_(bookId,name);}
    function _rows_(name){return _sheet_(name).v;}
    function _pop_(r){return r.some(function(v,i){return i>0 && v!=='' && v!=null;});}
    function _unique_(rows,col,value) {
      var found=[];for(var i=1;i<rows.length;i++)if(_text_(rows[i][col])===value)found.push(i);
      if(found.length!==1)_fail_('IDENTITY_AMBIGUOUS');return found[0];
    }
    function _parent_(name,col,value) {
      if(!value)_fail_('RELATION_MISSING');
      var found=[];
      [bookId,root.SPREADSHEET_ID_ARSIP].forEach(function(id){
        var rows=_read_(id,name).v,local=[];
        rows.slice(1).forEach(function(r){if(_text_(r[col])===value)local.push(r);});
        if(local.length>1)_fail_('IDENTITY_AMBIGUOUS');
        if(local.length)found.push(local[0]);
      });
      if(!found.length || (found.length>1 && _json_(found[0].slice(1))!==_json_(found[1].slice(1))))_fail_('RELATION_MISSING');
      return found[0];
    }
    function _header_(kh) {
      var r=_parent_(env.S.HEADER,H.kodeHeader,kh);
      if(!_owned_(r[H.ulp]))_fail_('ULP_DENIED');return r;
    }
    function _check_(s,rows,allowRaw) {
      var spec=env.tables[s.name];if(!spec)return;
      var keys={};
      for(var i=1;i<rows.length;i++){
        var r=rows[i];if(!_pop_(r))continue;
        var k=_text_(r[spec.key]);
        if(!k || keys[k])_fail_('IDENTITY_AMBIGUOUS');keys[k]=true;
        if(spec.ulp!==null && !_owned_(r[spec.ulp]))_fail_('ULP_DENIED');
        var d=_day_(r[spec.date]);
        if(spec.parent!==null){
          var kh=_text_(r[spec.parent]);
          if(allowRaw && s.name==='db_ROW_Eksekusi' && !kh && k.indexOf('-EKS.')<0)continue;
          var h=_header_(kh);
          if(_day_(h[H.tanggal])!==d)_fail_('RELATION_DATE');
          var c=spec.c,parent=null,pc=null;
          if(s.name==='db_ROW_Eksekusi' && _text_(r[E.kodePekerjaan])){
            pc=R;parent=_parent_('db_ROW_Realisasi',R.kodePekerjaan,_text_(r[E.kodePekerjaan]));
          }
          if(s.name===root.SHEET_YANDAL.P0){
            pc=root.COL_YANDAL_SHIFT;parent=_parent_(root.SHEET_YANDAL.SHIFT,pc.kodeShift,_text_(r[P.kodeShift]));
          }
          if(s.name===root.SHEET_HTK.PEKERJAAN || s.name===root.SHEET_HTK.MATERIAL){
            pc=root.COL_HTK.PG;parent=_parent_(root.SHEET_HTK.PG,pc.kodePG,_text_(r[c.kodePG]));
          }
          if(parent && (_text_(parent[pc.kodeHeader])!==kh || _day_(parent[pc.tanggal])!==d ||
              (Number.isInteger(pc.ulp) && !_owned_(parent[pc.ulp]))))_fail_('RELATION_DATE');
          if(s.name===root.SHEET_HTK.MATERIAL || s.name===root.SHEET_HTK.HARGROUNDING || s.name===root.SHEET_HTK.PEMERATAAN){
            pc=root.COL_HTK.PEKERJAAN;parent=_parent_(root.SHEET_HTK.PEKERJAAN,pc.kodePekerjaan,_text_(r[c.kodePekerjaan]));
            if(_text_(parent[pc.kodeHeader])!==kh || _text_(parent[pc.kodePG])!==_text_(r[c.kodePG]) ||
                _day_(parent[pc.tanggal])!==d || !_owned_(parent[pc.ulp]))_fail_('RELATION_DATE');
          }
        }
      }
    }
    function _set_(s,r,c,v,format) {
      if(r<1 || c<0 || c>=s.nc || r>=s.sh.getMaxRows())_fail_('CAPACITY_OR_SCHEMA');
      while(s.v.length<=r)s.v.push(Array(s.nc).fill(''));
      if(s.name===env.S.HEADER && c===H.waText && typeof v==='string' && v.trim())
        touched[_text_(s.v[r][H.kodeHeader])]=true;
      if(_json_(s.v[r][c])===_json_(v))return;
      if(s.f[r] && s.f[r][c])_fail_('FORMULA_PROTECTED');
      if(typeof v==='string' && /^[=+@]/.test(v))_fail_('FORMULA_TEXT');
      if(v!==null && typeof v==='object' && Object.prototype.toString.call(v)!=='[object Date]')_fail_('CELL_INVALID');
      var spec=env.tables[s.name];
      if(s.id!==bookId || (!spec && s.name!==root.LH.SHEET))_fail_('WRITE_TARGET_DENIED');
      s.v[r][c]=_clone_(v);s.writes[r+':'+c]=true;if(format)s.formats[r+':'+c]=format;
    }
    function _range_(s,r,c,n,m) {
      r--;c--;n=n||1;m=m||1;
      if(r<0 || c<0 || n<1 || m<1 || c+m>s.nc || r+n>s.sh.getMaxRows())_fail_('RANGE_INVALID');
      var range={
        getValues:function(){
          var a=[];for(var i=0;i<n;i++){var row=[];for(var j=0;j<m;j++){
            var v=(s.v[r+i]||[])[c+j];v=v==null?'':v;
            // Only ephemeral report inputs are normalized; stored labels are never rewritten.
            var sp=env.tables[s.name];
            if(phase==='reports' && r+i>0 && sp && sp.ulp===c+j && _owned_(v))v=root.LH.ULP;
            row.push(_clone_(v));
          }a.push(row);}return a;
        },
        getFormulas:function(){return Array.from({length:n},function(_,i){return Array.from({length:m},function(_,j){return (s.f[r+i]||[])[c+j]||'';});});},
        getValue:function(){return this.getValues()[0][0];},
        getDisplayValues:function(){return this.getValues().map(function(row){return row.map(String);});},
        setValues:function(v){
          if(!Array.isArray(v)||v.length!==n||v.some(function(row){return row.length!==m;}))_fail_('SHAPE_INVALID');
          for(var i=0;i<n;i++)for(var j=0;j<m;j++)_set_(s,r+i,c+j,v[i][j]);return this;
        },
        setValue:function(v){return this.setValues([[v]]);},
        clearContent:function(){return this.setValues(Array.from({length:n},function(){return Array(m).fill('');}));},
        setNumberFormat:function(fmt){for(var i=0;i<n;i++)for(var j=0;j<m;j++)s.formats[(r+i)+':'+(c+j)]=fmt;return this;}
      };return range;
    }
    function _facadeSheet_(s) {
      return {getName:function(){return s.name;},getSheetId:function(){return s.sh.getSheetId();},
        getLastRow:function(){return s.v.length;},getLastColumn:function(){return s.nc;},
        getMaxRows:function(){return s.sh.getMaxRows();},
        getDataRange:function(){return _range_(s,1,1,s.v.length,s.nc);},
        getRange:function(r,c,n,m){return _range_(s,r,c,n,m);},
        appendRow:function(row){_range_(s,s.v.length+1,1,1,row.length).setValues([row]);return this;}
      };
    }
    function _book_(id) {
      return {getId:function(){return id;},getSheetByName:function(name){return _facadeSheet_(_read_(id,name));},
        getSheets:function(){return realApp.openById(id).getSheets().map(function(sh){return _facadeSheet_(_read_(id,sh.getName()));});}};
    }
    function _override_(name,value){restore[name]=root[name];root[name]=value;}
    function _next_(items) {
      items=items.filter(function(x){return x>state.last;}).sort();return items[0]||'';
    }
    function _select_(name,col,predicate) {
      var rows=_rows_(name),items=[];
      for(var i=1;i<rows.length;i++)if(predicate(rows[i]))items.push(_text_(rows[i][col]));
      return _next_(items);
    }
    function _recalcRow_() {
      var teams={}, names=['db_ROW_Realisasi','db_ROW_Eksekusi'];
      names.forEach(function(n){var C=n===names[0]?R:E;_rows_(n).slice(1).forEach(function(r){
        if(_pop_(r)&&_day_(r[C.tanggal])===state.day)teams[_text_(r[C.tim])]=true;
      });});
      var T=env.I.TEMUAN;
      _need_('_readSheetDual_')(env.S.TEMUAN,T.kodePekerjaan,T.folderPath+1).forEach(function(r){
        if(_text_(r[T.tglSelesai])&&_day_(r[T.tglSelesai])===state.day&&_text_(r[T.status])==='Selesai'&&r[T.diameter]!=='')
          teams[_text_(r[T.timEksekusi])]=true;
      });
      key=_next_(Object.keys(teams));if(!key)return;
      if(!_need_('_isTimROW_')(key))_fail_('ROW_TEAM_INVALID');
      var ans=_need_('originalrecalcEksekusiROW')(key,null,state.day);
      if(!ans || ans.success!==true || ans.tanpaRealisasi>0 || ans.skipped)_fail_('ROW_INCOMPLETE');
    }
    function _codes_() {
      key=_select_(env.S.HEADER,H.kodeHeader,function(r){
        return _pop_(r)&&_day_(r[H.tanggal])===state.day&&_text_(r[H.tim])==='ROW';
      });
      if(!key)return;
      var s=_sheet_(env.S.HEADER),i=_unique_(s.v,H.kodeHeader,key),sub=_text_(s.v[i][H.subTim]);
      if(!/\d{2}$/.test(sub)||key.indexOf('-')<1)_fail_('ROW_CODE_INVALID');
      var next='R'+sub.slice(-2)+key.slice(key.indexOf('-'));if(next===key)return;
      if(s.v.slice(1).some(function(r){return _text_(r[H.kodeHeader])===next;}))_fail_('ROW_CODE_CONFLICT');
      _set_(s,i,H.kodeHeader,next);
      [['db_ROW_Realisasi',R,[R.kodeHeader,R.kodePekerjaan]],['db_ROW_Eksekusi',E,[E.kodeHeader,E.kodePekerjaan,E.kodeEksekusi]]].forEach(function(item){
        var sh=_sheet_(item[0]),C=item[1];
        sh.v.forEach(function(r,n){if(!n)return;
          item[2].forEach(function(col,slot){var value=_text_(r[col]);
            if((slot===0&&value===key)||(slot>0&&value.indexOf(key+'-')===0)){
              if(_day_(r[C.tanggal])!==state.day)_fail_('RELATION_DATE');
              _set_(sh,n,col,next+value.slice(key.length));
            }
          });
        });
      });
      queue.push(['wa',next]);
    }
    function _p0_() {
      key=_select_(root.SHEET_YANDAL.P0,P.kodeP0,function(r){return _pop_(r)&&_day_(r[P.tanggal])===state.day;});
      if(!key)return;
      var s=_sheet_(root.SHEET_YANDAL.P0),i=_unique_(s.v,P.kodeP0,key),row=s.v[i],sh=_facadeSheet_(s);
      var shift=_text_(row[P.kodeShift]),C=root.COL_YANDAL_SHIFT,sy=_rows_(root.SHEET_YANDAL.SHIFT);
      var si=_unique_(sy,C.kodeShift,shift);
      if(_text_(sy[si][C.kodeHeader])!==_text_(row[P.kodeHeader])||_day_(sy[si][C.tanggal])!==state.day)_fail_('RELATION_DATE');
      if(_text_(row[P.fotoSesudah])) {
        var start=_need_('_toMillisY_')(row[P.timestampPembuatan]),end=_need_('_toMillisY_')(row[P.timestampSesudah]);
        if(!isFinite(start)||!isFinite(end))_fail_('P0_TIMESTAMP_PENDING');
        // Recalculate from the actual device timestamps, never invent a closing time.
        _set_(s,i,P.durasi,'');_need_('_recalcDurasiRowY_')(sh,i+1);
        if(!_text_(s.v[i][P.durasi]))_fail_('P0_DURATION_FAILED');
      }
      _need_('_recalcJarakRowY_')(sh,i+1);
      if(!isFinite(_need_('_seqP0Y_')(key)))_fail_('P0_SEQUENCE_INVALID');
      _need_('_recalcJarakAntarP0RowY_')(sh,i+1);
      var point=_need_('_hitungPoinDariRowY_')(s.v[i],_need_('_bobotPekerjaanMapY_')());
      if(point && point.ok && !point.skipped)_set_(s,i,P.point,point.point);
      else if(point && point.skipped)result.skip++;
      else _fail_('P0_POINT_FAILED');
    }
    function _headers_() {
      key=_select_(env.S.HEADER,H.kodeHeader,function(r){return _pop_(r)&&_day_(r[H.tanggal])===state.day;});
      if(!key)return;
      var s=_sheet_(env.S.HEADER),i=_unique_(s.v,H.kodeHeader,key),r=s.v[i];
      var b=_need_('_findWaBuilder')(r[H.tim],r[H.subTim]);
      if(!b){result.skip++;return;}
      if(_text_(r[H.tim]).toLowerCase()==='inspeksi'&&_text_(r[H.subTim]).toLowerCase()==='inspeksi gardu')
        _need_('originalrecalcRealisasiGarduByHeader')(_book_(bookId),key);
      else b.recalc(_book_(bookId),key);
      // A swallowed failure or unchanged stale WA is not success.
      if(!touched[key] && !Object.keys(s.writes).some(function(k){return k===i+':'+H.waText;})) {
        // InsJar legitimately skips an identical text write; run its pure builder for proof.
        if(_text_(r[H.tim])==='Inspeksi'&&_text_(r[H.subTim])==='Inspeksi Jaringan') {
          var wa=_need_('_buildWaTextIns')(_book_(bookId),key,{koordinatAwal:r[H.koordinatAwal],koordinatAkhir:r[H.koordinatAkhir],kmAwal:r[H.kmAwal],kmAkhir:r[H.kmAkhir]});
          if(typeof wa!=='string'||!wa.trim()||wa!==s.v[i][H.waText])_fail_('HEADER_BUILD_FAILED');
        } else _fail_('HEADER_BUILD_FAILED');
      }
      if(!_text_(s.v[i][H.waText]))_fail_('HEADER_BUILD_FAILED');
      _set_(s,i,H.timestampUpdate,new Date());_set_(s,i,H.statusTextWa,'Update');
    }
    function _reports_() {
      if(state.last)return;key=state.day;
      if(!root.LH || !_owned_(root.LH.ULP) || root.LH.SHEET!=='Teknik_Laporan Harian')_fail_('REPORT_SCOPE');
      var columns={no:0,tanggal:1,penyulang:2,panjang:3,temuan:4,eksekusi:5,lapUp3:6,lapUiw:7};
      Object.keys(columns).forEach(function(n){if(!root.LH.COL||root.LH.COL[n]!==columns[n])_fail_('REPORT_SCHEMA');});
      var s=_sheet_(root.LH.SHEET),headers=['no','tanggal','penyulang','panjangkmsinspeksi','temuan','eksekusi','laporanup3','laporanuiw'];
      if(_json_(s.v[0].slice(0,8).map(function(v){return _text_(v).toLowerCase().replace(/[^a-z0-9]/g,'');}))!==_json_(headers))_fail_('REPORT_SCHEMA');
      var match=[];s.v.slice(1).forEach(function(r,i){if(_text_(r[1])&&_day_(r[1])===state.day)match.push(i+1);});
      if(match.length>1)_fail_('REPORT_AMBIGUOUS');
      var idx=match.length?match[0]:s.v.length,old=match.length?s.v[idx]:['',state.day,'','','','','',''];
      var up3=_need_('originalbuildLaporanUP3')(state.day,root.LH.ULP,{c4a:_need_('_lhC4aFromRow')(old)});
      var uiw=_need_('originalbuildLaporanWilayah')(state.day,root.LH.ULP,{});
      if(typeof up3!=='string'||!up3.trim()||typeof uiw!=='string'||!uiw.trim())_fail_('REPORT_BUILD_FAILED');
      if(!match.length){_set_(s,idx,0,idx);_set_(s,idx,1,state.day);}
      _set_(s,idx,6,up3);_set_(s,idx,7,uiw);
    }
    active=true;
    try {
      _override_('SpreadsheetApp',{openById:_book_,flush:function(){}});
      // These legacy hooks must not run early or acknowledge any queue.
      ['markLaporanDirty_','markRecalcRowDirty_','markWaDirty_','enqueueFotoRow_'].forEach(function(n){
        _override_(n,function(){queue.push([n].concat(Array.prototype.slice.call(arguments)));return true;});
      });
      _override_('refreshLaporanHarianROW',function(){return {ok:true,deferred:true};});
      _override_('recalcWaByHeader',function(){return {ok:true,deferred:true};});
      _override_('_kodeUlpByUlp',function(ss,ulp){
        if(!_owned_(ulp))_fail_('ULP_DENIED');
        var users=_sheet_('db_Users').v,keys={};
        users.slice(1).forEach(function(r){
          if(_owned_(r[root.COL_USERS.ulp])){
            var code=_text_(r[root.COL_USERS.kodeUlp]);if(code)keys[code]=true;
          }
        });
        if(Object.keys(keys).length!==1)_fail_('ULP_CODE_AMBIGUOUS');
        return Object.keys(keys)[0];
      });
      var origDual=_need_('_readSheetDual_');
      _override_('_readSheetDual_',function(name,col,width){
        var rows=origDual(name,col,width);
        // Validate both active and archive ownership, rather than trusting dedup.
        [bookId,root.SPREADSHEET_ID_ARSIP].forEach(function(id){
          var s=_read_(id,name),spec=env.tables[name];
          if(spec && spec.ulp!==null)s.v.slice(1).forEach(function(r){if(_pop_(r)&&!_owned_(r[spec.ulp]))_fail_('ULP_DENIED');});
        });
        var a=_read_(bookId,name).v,b=_read_(root.SPREADSHEET_ID_ARSIP,name).v,seenKeys={};
        a.slice(1).forEach(function(r){var k=_text_(r[col]);if(k)seenKeys[k]=r;});
        b.slice(1).forEach(function(r){var k=_text_(r[col]);if(k&&seenKeys[k]&&_json_(seenKeys[k].slice(1))!==_json_(r.slice(1)))_fail_('ARCHIVE_CONFLICT');});
        return rows;
      });
      _override_('_garduMasterRows',function(){
        var s=_read_(root.GARDU_MASTER.spreadsheetId||bookId,root.GARDU_MASTER.tab),rows=s.v.slice(root.GARDU_MASTER.headerRows);
        var keys={};rows.forEach(function(r){
          var k=_text_(r[root.COL_GARDU.nomorGardu]).toLowerCase();if(!k)return;
          if(keys[k]||!_owned_(r[root.COL_GARDU.ulp]))_fail_('MASTER_OWNERSHIP');keys[k]=true;
        });return _clone_(rows);
      });
      // All active source chains used by this pipeline are checked before
      // legacy builders can choose a parent by team/date alone.
      (state.watch||[]).forEach(function(a){_read_(a.id,a.name);});
      [env.S.HEADER,'db_ROW_Realisasi','db_ROW_Eksekusi'].forEach(function(n){var s=_sheet_(n);_check_(s,s.v,true);});
      if(phase==='codes')_codes_();
      else if(phase==='raw'){
        key=_select_('db_ROW_Eksekusi',E.kodeEksekusi,function(r){return _pop_(r)&&_day_(r[E.tanggal])===state.day&&_text_(r[E.kodeEksekusi]).indexOf('-EKS.')<0;});
        if(key){var raw=_need_('prosesEksekusiROW')(key);if(!raw||raw.ok!==true||raw.queued!==true)_fail_('RAW_INCOMPLETE');}
      } else if(phase==='row')_recalcRow_();
      else if(phase==='p0')_p0_();
      else if(phase==='headers')_headers_();
      else if(phase==='reports')_reports_();
      if(failed)_fail_('BUILD_FAILED');
      var writes=[],snapshots=[];
      for(var vi=0;vi<Object.keys(seen).length;vi++){
        var vs=seen[Object.keys(seen)[vi]];if(env.tables[vs.name])_check_(vs,vs.v,true);
      }
      Object.keys(seen).forEach(function(k){
        var s=seen[k],masks=Object.keys(s.writes),spec=env.tables[s.name];
        if(s.id===bookId && spec)_check_(s,s.v,true);
        masks.forEach(function(pos){
          var rc=pos.split(':').map(Number),r=rc[0],c=rc[1],row=s.v[r];
          if(spec){
            if(_day_(row[spec.date])!==state.day)_fail_('WRITE_DATE_DENIED');
            if(spec.ulp!==null&&!_owned_(row[spec.ulp]))_fail_('ULP_DENIED');
          } else if(s.name===root.LH.SHEET && _day_(row[1])!==state.day)_fail_('WRITE_DATE_DENIED');
          var before=(s.b[r]||[])[c];before=before==null?'':before;
          if(_json_(before)!==_json_(row[c]))writes.push({id:s.id,name:s.name,r:r,c:c,b:before,a:row[c],fmt:s.formats[pos]||null});
        });
        var nr=Math.max(s.nr,s.v.length),base=[];
        for(var i=0;i<nr;i++)base.push(s.b[i]||Array(s.nc).fill(''));
        var copy=_clone_(base);masks.forEach(function(pos){var rc=pos.split(':').map(Number);copy[rc[0]][rc[1]]={masked:true};});
        var forms=_clone_(s.f);while(forms.length<nr)forms.push(Array(s.nc).fill(''));
        snapshots.push({id:s.id,name:s.name,nr:nr,nc:s.nc,oldRows:s.nr,hash:_hash_([copy,forms]),masks:masks});
      });
      if(writes.length>2000)_fail_('PLAN_LIMIT');
      receipts.forEach(function(c){
        if(key&&((c.kind==='row'&&phase==='row'&&c.tim===key)||
          (c.kind==='wa'&&phase==='headers'&&c.ref===key&&!result.skip)||
          (c.kind==='eksekusiRow'&&((phase==='raw'&&c.ref===key)||(phase==='row'&&c.tim===key)))))c.done=true;
        writes.forEach(function(w){
          if(w.id===bookId&&((c.kind==='wa'&&w.name===env.S.HEADER&&w.c===H.kodeHeader)||
            (c.kind==='eksekusiRow'&&w.name==='db_ROW_Eksekusi'&&w.c===E.kodeEksekusi))&&c.ref===w.b)c.ref=w.a;
        });
      });
      return {day:state.day,phase:state.phase,key:key,writes:writes,snapshots:snapshots,queue:queue,skip:result.skip,
        receipts:receipts,dirtyRevision:dirtyRevision};
    } finally {
      Object.keys(restore).forEach(function(n){root[n]=restore[n];});active=false;
    }
  }
  function _state_(p,day) {
    var raw=p.getProperty(STATE);if(!raw)return {day:day,phase:0,last:'',complete:false,skip:0};
    var s;try{s=JSON.parse(raw);}catch(e){_stop_('STATE_INVALID');}
    if(!s||_day_(s.day)!==s.day||!Number.isInteger(s.phase)||s.phase<0||s.phase>5||
        typeof s.last!=='string'||s.last.length>500||typeof s.complete!=='boolean')_stop_('STATE_INVALID');
    if((s.journal!==undefined && s.journal!==true) || (s.complete && (s.phase!==5 || s.journal)) ||
        !Number.isInteger(s.skip) || s.skip<0)_stop_('STATE_INVALID');
    if(s.watch && (!Array.isArray(s.watch)||s.watch.length>36||s.watch.some(function(a){
      return !a||typeof a.id!=='string'||typeof a.name!=='string'||!/^[a-f0-9]{64}$/.test(a.hash||'');
    })))_stop_('STATE_INVALID');
    if(s.journal && (s.journal!==true || !Number.isInteger(s.parts)||s.parts<1||s.parts>24 ||
        !Number.isInteger(s.pos)||s.pos<0 || !/^[a-f0-9]{64}$/.test(s.hash||'')))_stop_('STATE_INVALID');
    if(s.receiptStore){
      var a=s.receiptStore,rawReceipts='';
      if(!a||(a.bank!==0&&a.bank!==1)||!Number.isInteger(a.parts)||a.parts<1||a.parts>20||
        !/^[a-f0-9]{64}$/.test(a.hash||''))_stop_('STATE_INVALID');
      for(var ri=0;ri<a.parts;ri++){
        var part=p.getProperty('T11_RECALC_RECEIPTS_V1_'+a.bank+'_'+ri);
        if(part==null)_stop_('STATE_INVALID');rawReceipts+=part;
      }
      try{s.receipts=JSON.parse(rawReceipts);}catch(e){_stop_('STATE_INVALID');}
      if(_hash_(s.receipts)!==a.hash)_stop_('STATE_INVALID');
    }
    if(s.receipts&&(!Array.isArray(s.receipts)||s.receipts.length>256||s.receipts.some(function(c){
      return !c||typeof c.key!=='string'||typeof c.ref!=='string'||typeof c.tim!=='string'||
        ['row','wa','eksekusiRow'].indexOf(c.kind)<0||typeof c.done!=='boolean'||
        !/^[a-f0-9]{64}$/.test(c.hash||'')||!/^[a-f0-9]{64}$/.test(c.identity||'');
    })))_stop_('STATE_INVALID');
    if(s.day!==day){
      if(s.journal)_stop_('PREVIOUS_DAY_JOURNAL_PENDING');
      return {day:day,phase:0,last:'',complete:false,skip:0};
    }
    if(s.complete)return _reset_(s,day);
    return s;
  }
  function _save_(p,s){
    // Alternating receipt banks: never overwrite the bank referenced by the
    // durable state until the replacement bank and its checksum are published.
    var copy=_clone_(s),receipts=s.receipts||[],v=_json_(receipts),hash=_hash_(receipts);
    if(v.length>120000)_stop_('RECEIPT_LIMIT');
    var previous=p.getProperty(STATE),old;
    try{old=previous?JSON.parse(previous).receiptStore:null;}catch(e){_stop_('STATE_INVALID');}
    var store=old&&old.hash===hash?old:{bank:old&&old.bank===0?1:0,parts:Math.ceil(v.length/6000),hash:hash};
    delete copy.receipts;copy.receiptStore=store;
    var text=_json_(copy);if(text.length>8000)_stop_('STATE_LIMIT');
    if(!old||old.hash!==hash){
      var prefix='T11_RECALC_RECEIPTS_V1_'+store.bank+'_',props=p.getProperties(),size=text.length+STATE.length;
      Object.keys(props).forEach(function(k){if(k!==STATE&&k.indexOf(prefix)!==0)size+=_json_(props[k]).length+k.length;});
      size+=_json_(v).length+store.parts*(prefix.length+2);
      if(size>450000)_stop_('PROPERTY_CAPACITY');
      for(var i=0;i<store.parts;i++)p.setProperty(prefix+i,v.slice(i*6000,(i+1)*6000));
    }
    p.setProperty(STATE,text);
    // Cleanup is opportunistic, never a reason to lose the published receipt bank.
    try{
      var live='T11_RECALC_RECEIPTS_V1_'+store.bank+'_';
      Object.keys(p.getProperties()).forEach(function(k){
        if(k.indexOf('T11_RECALC_RECEIPTS_V1_')===0&&
          (k.indexOf(live)!==0||Number(k.slice(live.length))>=store.parts))p.deleteProperty(k);
      });
    }catch(ignore){}
  }
  function _journal_(p,s,plan) {
    var v=_json_(plan);if(v.length>144000)_stop_('JOURNAL_LIMIT');
    var props=p.getProperties(),size=0;Object.keys(props).forEach(function(k){size+=_json_(props[k]).length+k.length;});
    if(size+v.length>450000)_stop_('PROPERTY_CAPACITY');
    var n=Math.ceil(v.length/6000);
    for(var i=0;i<n;i++)p.setProperty(JOURNAL+i,v.slice(i*6000,(i+1)*6000));
    s.journal=true;s.parts=n;s.hash=_hash_(plan);s.pos=0;_save_(p,s);
  }
  function _loadJournal_(p,s) {
    var v='';for(var i=0;i<s.parts;i++){var part=p.getProperty(JOURNAL+i);if(part==null)_stop_('JOURNAL_INVALID');v+=part;}
    var j;try{j=_decode_(JSON.parse(v));}catch(e){_stop_('JOURNAL_INVALID');}
    if(_hash_(j)!==s.hash||j.day!==s.day||j.phase!==s.phase||s.pos>j.writes.length)_stop_('JOURNAL_INVALID');
    return j;
  }
  function _replay_(p,s,j,started) {
    var books={},map={};
    function _sheet_(id,name){if(!books[id])books[id]=SpreadsheetApp.openById(id);return books[id].getSheetByName(name);}
    j.snapshots.forEach(function(a){
      var sh=_sheet_(a.id,a.name);if(!sh || sh.getLastColumn()!==a.nc || sh.getLastRow()>a.nr)_stop_('SOURCE_CHANGED');
      var v=sh.getRange(1,1,a.nr,a.nc).getValues(),f=sh.getRange(1,1,a.nr,a.nc).getFormulas();
      map[a.id+'|'+a.name]={sh:sh,v:v,f:f};
      var copy=_clone_(v);a.masks.forEach(function(pos){var rc=pos.split(':').map(Number);copy[rc[0]][rc[1]]={masked:true};});
      if(_hash_([copy,f])!==a.hash)_stop_('SOURCE_CHANGED');
    });
    // Every proposed cell must still be old, or the exact retry value. A retry
    // never accepts arbitrary edits just because another cell was already set.
    j.writes.forEach(function(w,i){
      var m=map[w.id+'|'+w.name],v=m.v[w.r][w.c];
      if(m.f[w.r][w.c] || (_json_(v)!==_json_(w.a) && (i<s.pos || _json_(v)!==_json_(w.b))))_stop_('SOURCE_CHANGED');
    });
    var n=0;
    while(s.pos<j.writes.length && n<40 && Date.now()-started<90000) {
      var w=j.writes[s.pos],sh=map[w.id+'|'+w.name].sh,r=sh.getRange(w.r+1,w.c+1);
      var expected=map[w.id+'|'+w.name].v[w.r];
      if(_json_(sh.getRange(w.r+1,1,1,expected.length).getValues()[0])!==_json_(expected))_stop_('SOURCE_CHANGED');
      var v=r.getValue();if(r.getFormulas()[0][0] || (_json_(v)!==_json_(w.b)&&_json_(v)!==_json_(w.a)))_stop_('SOURCE_CHANGED');
      if(_json_(v)!==_json_(w.a)){if(w.fmt)r.setNumberFormat(w.fmt);r.setValue(w.a);SpreadsheetApp.flush();}
      if(_json_(r.getValue())!==_json_(w.a))_stop_('WRITE_VERIFY_FAILED');
      map[w.id+'|'+w.name].v[w.r][w.c]=_clone_(w.a);
      s.pos++;_save_(p,s);n++;
    }
    if(s.pos<j.writes.length)return false;
    // Existing durable downstream/photo work is added only after the journal's
    // Sheet writes are complete. Failure keeps the journal for idempotent retry.
    j.queue.forEach(function(q){
      var name=q[0]==='wa'?'markWaDirty_':q[0];
      if(['markWaDirty_','markRecalcRowDirty_','enqueueFotoRow_','markLaporanDirty_'].indexOf(name)<0)_stop_('QUEUE_INVALID');
      if(name!=='markLaporanDirty_'){
        var photo=name==='enqueueFotoRow_',queueName=photo?'db_FotoRow_Queue':'db_Recalc_Queue';
        var expectedHeader=photo?['id','status','kodeEksekusi','enqueuedAt','lastTriedAt','attempts']:
          ['jenis','key','tim','tanggal','kodeHeader','dirtyAt','status','lastTriedAt','attempts'];
        var qs=photo?_sheet_(root.SPREADSHEET_ID,queueName):_queue_(root.SpreadsheetApp,true).sh;
        if(!qs||_json_(qs.getRange(1,1,1,expectedHeader.length).getValues()[0])!==_json_(expectedHeader))_stop_('QUEUE_SCHEMA');
      }
      var answer=_need_(name).apply(root,q.slice(1));
      if(answer===false)_stop_('QUEUE_FAILED');
      LockService.getScriptLock().waitLock(15000);
      if(!LockService.getScriptLock().hasLock())_stop_('LOCK_REQUIRED');
    });
    if(phases[s.phase]==='reports'){
      try{CacheService.getScriptCache().remove(_need_('_lapMobileCacheKey_')(root.LH.ULP,s.day));}catch(e){Logger.log('T11_RECALC_CACHE_RETRY');}
    }
    s.watch=j.snapshots.map(function(a){
      var m=map[a.id+'|'+a.name];
      // Compare all input rows again after the final output/notification.
      if(_hash_([m.sh.getRange(1,1,a.nr,a.nc).getValues(),m.sh.getRange(1,1,a.nr,a.nc).getFormulas()])!==_hash_([m.v,m.f]))_stop_('SOURCE_CHANGED');
      return {id:a.id,name:a.name,hash:_hash_([m.v,m.f])};
    });
    if(phases[s.phase]==='reports'&&j.dirtyRevision)_dirtyRevision_(s.day,j.dirtyRevision);
    s.receipts=j.receipts||s.receipts||[];
    var parts=s.parts;s.last=j.key;s.skip=(s.skip||0)+(j.skip||0);
    delete s.journal;delete s.parts;delete s.hash;delete s.pos;_save_(p,s);
    for(var x=0;x<parts;x++)p.deleteProperty(JOURNAL+x);
    return true;
  }
  root._t11RecalcActive_=function(){return active;};
  root._t11RecalcOwnsJob_=function(name){
    return ['drainLaporanDirty','drainLaporanDirtySafe','refreshLaporanHarianHariIni','ensureLaporanHarianHariIni',
      'sweepPointP0Yandal','refreshWaHarian','sweepDurasiJarakYandalP0','sweepEksekusiRowBacklog','refreshLaporanHarianROW'].indexOf(name)>=0;
  };
  // The existing T11 ROW slot consumes receipts after the complete ordered
  // cycle. fastTick must not run a competing all-dates/no-exception consumer.
  root.recalcTick=function(){return {ok:true,deferred:'managed-by-private-t11',receiptsRetained:true};};
  root._t11RecalcToday_=function() {
    var started=Date.now(),day=_day_(new Date(started)),lock=LockService.getScriptLock();
    var p=PropertiesService.getScriptProperties(),lease='T11_RECALC_LEASE_V1',owner=Utilities.getUuid(),s;
    var leased=false,yielded='';
    // Re-acquire after downstream helpers. Contention is a distinct retry code.
    function _lock_(){if(!lock.tryLock(15000))_stop_('LOCK_BUSY');if(!lock.hasLock())_stop_('LOCK_REQUIRED');}
    function _acquire_(){
      if(!lock.tryLock(1000)){
        // Ask the current holder to stop at its next safe row boundary, then wait.
        try{_yieldAsk_(p);}catch(ignore){}
        if(!lock.tryLock(14000))_stop_('LOCK_BUSY');
      }
      if(!lock.hasLock())_stop_('LOCK_REQUIRED');
      _yieldClearOwn_(p);
    }
    try {
      _acquire_();var prior=p.getProperty(lease);
      if(prior){var old;try{old=JSON.parse(prior);}catch(e){_stop_('LEASE_INVALID');}
        if(!old||typeof old.until!=='number'||!isFinite(old.until)||old.until<=0||typeof old.owner!=='string')_stop_('LEASE_INVALID');
        if(old.until>Date.now())return {ok:true,pending:true,skipped:'busy',tanggal:day};
      }
      p.setProperty(lease,JSON.stringify({owner:owner,until:Date.now()+390000}));leased=true;
      s=_state_(p,day);
      var count=0;
      while(count++<6 && Date.now()-started<90000) {
        // Between completed work units only, never inside a journal chunk.
        if(count>1&&(yielded=_yieldOther_(p)))break;
        if(s.journal){
          var j=_loadJournal_(p,s);
          if(!_replay_(p,s,j,started))break;
        } else {
          // Restart the ordered cycle if input changed BETWEEN work units.
          // An already published partial journal is never silently discarded.
          var changed=_watchChanged_(s);
          if(changed){s=_reset_(s,day);_save_(p,s);}
          var plan=_plan_(s);_lock_();
          if(JSON.parse(p.getProperty(lease)||'{}').owner!==owner)_stop_('LEASE_LOST');
          if(!plan.key){
            s.receipts=plan.receipts;
            s.phase++;s.last='';
            if(s.phase>=phases.length){
              s.phase=5;
              if(_finishReceipts_(s,started)){s.complete=true;s.receipts=[];}
              else s=_reset_(s,day);
              _save_(p,s);break;
            }
            _save_(p,s);continue;
          }
          _journal_(p,s,plan);
        }
      }
      var out={ok:true,tanggal:day,pending:!s.complete,stage:phases[s.phase],unsupportedOrManual:s.skip||0,
        receiptsRetained:true,watermarkForced:false};
      if(yielded&&!s.complete)out.yielded=yielded;
      return out;
    } catch(e) {
      var msg=e&&e.message||'';
      if(!/^T11_RECALC_[A-Z0-9_]+$/.test(msg))msg='T11_RECALC_RETRY_REQUIRED';
      Logger.log(msg);throw new Error(msg);
    } finally {
      // No second wait when this execution never created a lease.
      if(leased){try{_lock_();var mine=JSON.parse(p.getProperty(lease)||'{}');if(mine.owner===owner)p.deleteProperty(lease);}catch(ignore){}}
      try{if(lock.hasLock())lock.releaseLock();}catch(ignore){}
    }
  };
})(typeof globalThis!=='undefined'?globalThis:this);
