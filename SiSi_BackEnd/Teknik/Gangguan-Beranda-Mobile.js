/* Beranda Mobile: grafik dan detail 3 sumber gangguan eksternal. */
var GANGGUAN_BERANDA_SS_ID = "1LQJP5WIc1vBSyBrd8ai0Y8549VBi0qjD-2nwRT-Nhp4";
var GANGGUAN_BERANDA_SHEETS = [
  { key:"gangguan", title:"Data Gangguan", sheet:"Tarikan_SiMonLang", date:["Tanggal/Jam Padam","Tgl"], fields:["ID","ULP","Penyulang","Nama PMT/OG/LBS/ACR","Jenis Peralatan","Tanggal/Jam Padam","Tanggal/Jam Nyala","Durasi Padam","Indikasi","Penyebab Gangguan","Lokasi Gangguan","Cuaca","Beban (A)","ENS (kWh)","Jumlah ENS (Rp.)","KOORDINAT","Koordinat_Fix"] },
  { key:"ar", title:"Data Gangguan AR", sheet:"Tarikan_AR", date:["Tgl AR","Tanggal/Jam AR"], fields:["ID","ULP","Penyulang","Nama PMT/OG/ACR","Jenis Peralatan","Tanggal/Jam AR","Indikasi","Penyebab AR","Lokasi Gangguan","Cuaca","Beban (A)","Scada","Lintang","Bujur"] },
  { key:"pickup", title:"Data Gangguan Pick Up", sheet:"Tarikan_PickUp_UP3", date:["TANGGAL EVENT"], fields:["UIW","UP3","ULP","TANGGAL EVENT","JAM EVENT","PENYULANG","RECLOSER","INDIKASI RELAY","PHASE","TANGGAL TINDAK LANJUT","TEMUAN","STATUS","KOORDINAT TEMUAN","PETUGAS EKSEKUSI","BLTH","Penyulang_Fix"] }
];
function _gbNorm_(v){return String(v==null?"":v).trim().replace(/\s+/g," ").toUpperCase();}
function _gbIso_(v){
  if(v instanceof Date&&!isNaN(v.getTime()))return Utilities.formatDate(v,"Asia/Jakarta","yyyy-MM-dd");
  var s=String(v||"").trim(),m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if(m)return m[3]+"-"+("0"+m[2]).slice(-2)+"-"+("0"+m[1]).slice(-2);
  m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return m[1]+"-"+m[2]+"-"+m[3];
  var d=new Date(s);return isNaN(d.getTime())?"":Utilities.formatDate(d,"Asia/Jakarta","yyyy-MM-dd");
}
function _gbDisplay_(v){return v instanceof Date?Utilities.formatDate(v,"Asia/Jakarta","dd/MM/yyyy HH:mm"):String(v==null?"":v);}
function _gbHeaderMap_(row){var m={};for(var i=0;i<row.length;i++)m[_gbNorm_(row[i])]=i;return m;}
function _gbValue_(row,map,names){for(var i=0;i<names.length;i++){var x=map[_gbNorm_(names[i])];if(x!=null)return row[x];}return "";}
function _gbRead_(ss,cfg,from,to,ulp){
  var sh=ss.getSheetByName(cfg.sheet),series={},details=[];if(!sh||sh.getLastRow()<2)return {key:cfg.key,title:cfg.title,series:[],details:[]};
  var data=sh.getDataRange().getValues(),map=_gbHeaderMap_(data[0]);
  for(var r=1;r<data.length;r++){
    var row=data[r],date=_gbIso_(_gbValue_(row,map,cfg.date));if(!date||date<from||date>to)continue;
    var rowUlp=_gbNorm_(_gbValue_(row,map,["ULP"]));if(ulp&&rowUlp&&rowUlp!==_gbNorm_(ulp)&&rowUlp!==_gbNorm_("ULP "+ulp))continue;
    series[date]=(series[date]||0)+1;var item={date:date};
    for(var f=0;f<cfg.fields.length;f++){var name=cfg.fields[f],val=_gbValue_(row,map,[name]);if(val!==""&&val!=null)item[name]=_gbDisplay_(val);}
    details.push(item);
  }
  var points=Object.keys(series).sort().map(function(d){return {date:d,count:series[d]};});
  details.sort(function(a,b){return String(b.date).localeCompare(String(a.date));});
  return {key:cfg.key,title:cfg.title,total:details.length,series:points,details:details};
}
function getMobileGangguanBeranda(params){
  try{
    params=params||{};var g=guard_(arguments,{ulp:true,aksi:"getMobileGangguanBeranda"});
    var to=_normTgl(params.to||new Date()),from=_normTgl(params.from||new Date(new Date().getFullYear(),new Date().getMonth(),1));
    if(!from||!to||from>to)return {ok:false,message:"Rentang tanggal tidak valid."};
    var max=new Date(from+"T00:00:00");max.setDate(max.getDate()+93);if(_gbIso_(max)<to)return {ok:false,message:"Rentang maksimal 93 hari."};
    var ulp=ulpScope_(g,params.ulp),cache=CacheService.getScriptCache(),key="gb|"+from+"|"+to+"|"+ulp,hit=cache.get(key);if(hit)return JSON.parse(hit);
    var ss=SpreadsheetApp.openById(GANGGUAN_BERANDA_SS_ID),sets=[];
    for(var i=0;i<GANGGUAN_BERANDA_SHEETS.length;i++)sets.push(_gbRead_(ss,GANGGUAN_BERANDA_SHEETS[i],from,to,ulp));
    var out={ok:true,from:from,to:to,datasets:sets};try{cache.put(key,JSON.stringify(out),300);}catch(e){}
    return out;
  }catch(e){return {ok:false,message:e.message};}
}
function gangguanBerandaMobileRouter_(e,body){var p=(e&&e.parameter)||{},d=body||p,a=String(d.action||p.action||"");if(a!=="getMobileGangguanBeranda")return null;return getMobileGangguanBeranda(d);}
