from pathlib import Path

p=Path('SiSi_Mobile/lib/db/repositories/delta_sync_repository.dart')
s=p.read_text()
old="""    final decoded = jsonDecode(res.body);
    if (decoded is! Map) throw Exception('Respons delta sync tidak valid.');"""
new="""    final body = res.body.trim();
    if (body.isEmpty) {
      throw Exception(
        'Server tidak mengirim respons saat sinkron data. Deploy ulang Apps Script terbaru, lalu coba lagi.',
      );
    }
    dynamic decoded;
    try {
      decoded = jsonDecode(body);
    } on FormatException {
      final preview = body.length > 140 ? '${body.substring(0, 140)}…' : body;
      throw Exception('Respons sinkron bukan JSON valid (HTTP ${res.statusCode}): $preview');
    }
    if (decoded is! Map) throw Exception('Respons delta sync tidak valid.');"""
if old not in s: raise SystemExit('delta decode anchor missing')
s=s.replace(old,new,1)
p.write_text(s)

p=Path('SiSi_BackEnd/Core/Delta-Sync-Mobile.js')
s=p.read_text()
old="""  Object.keys(cfgs).forEach(function(name){
    var cfg=cfgs[name],rows=_deltaRows_(token,name,cfg);
    datasets.push({name:name,version:_deltaDigest_(rows),count:rows.length,kind:cfg.support?'support':'main'});
  });
  var result={success:true,apiVersion:1,generatedAt:new Date().toISOString(),datasets:datasets};"""
new="""  var warnings=[];
  Object.keys(cfgs).forEach(function(name){
    var cfg=cfgs[name];
    try{
      var rows=_deltaRows_(token,name,cfg);
      datasets.push({name:name,version:_deltaDigest_(rows),count:rows.length,kind:cfg.support?'support':'main'});
    }catch(err){
      warnings.push({name:name,message:String(err&&err.message||err)});
      Logger.log('Delta sync melewati '+name+': '+String(err&&err.message||err));
    }
  });
  var result={success:true,apiVersion:1,generatedAt:new Date().toISOString(),datasets:datasets,warnings:warnings};"""
if old not in s: raise SystemExit('manifest loop anchor missing')
s=s.replace(old,new,1)
p.write_text(s)
