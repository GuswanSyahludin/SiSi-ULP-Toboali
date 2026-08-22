import 'package:drift/drift.dart';
import '../app_database.dart';
import '../tables/inspeksi_gardu_lokal.dart';
part 'inspeksi_gardu_dao.g.dart';

@DriftAccessor(tables:[InsGarduHeaders,InsGarduRealisasis,InsGarduTemuans,ListTemuans])
class InspeksiGarduDao extends DatabaseAccessor<AppDatabase> with _$InspeksiGarduDaoMixin {
  InspeksiGarduDao(super.db);
  Future<void> simpanHeader(InsGarduHeadersCompanion v)=>into(insGarduHeaders).insertOnConflictUpdate(v);
  Stream<List<InsGarduHeader>> pantauHeader()=> (select(insGarduHeaders)..orderBy([(t)=>OrderingTerm.desc(t.dibuatPada)])).watch();
  Future<InsGarduHeader?> header(String id)=>(select(insGarduHeaders)..where((t)=>t.localId.equals(id))).getSingleOrNull();
  Future<void> simpanRealisasi(InsGarduRealisasisCompanion v)=>into(insGarduRealisasis).insertOnConflictUpdate(v);
  Future<List<InsGarduRealisasi>> realisasi(String h)=>(select(insGarduRealisasis)..where((t)=>t.localHeaderId.equals(h))).get();
  Future<void> simpanTemuan(List<InsGarduTemuansCompanion> rows)=>batch((b)=>b.insertAllOnConflictUpdate(insGarduTemuans,rows));
  Future<List<InsGarduTemuan>> temuan(String r)=>(select(insGarduTemuans)..where((t)=>t.localRealisasiId.equals(r))).get();
  Future<void> hapusTemuanRealisasi(String r)=>(delete(insGarduTemuans)..where((t)=>t.localRealisasiId.equals(r))).go();
  Future<List<ListTemuan>> pilihanTier(List<String> tiers)=>(select(listTemuans)..where((t)=>t.objekInspeksi.lower().equals('gardu') & t.tier.isIn(tiers))..orderBy([(t)=>OrderingTerm.asc(t.temuan)])).get();
  Future<void> gantiListTemuan(List<ListTemuansCompanion> rows)=>transaction(()async{await delete(listTemuans).go();if(rows.isNotEmpty)await batch((b)=>b.insertAll(listTemuans,rows));});
  Future<List<InsGarduHeader>> antrean()=> (select(insGarduHeaders)..where((t)=>t.status.isNotIn(['tersinkron']))..orderBy([(t)=>OrderingTerm.asc(t.dibuatPada)])).get();
  Future<void> setHeaderSync(String id,String kode,String status,{String pesan=''})=>(update(insGarduHeaders)..where((t)=>t.localId.equals(id))).write(InsGarduHeadersCompanion(kodeHeader:Value(kode),status:Value(status),pesanGagal:Value(pesan)));
  Future<void> setRealisasiSync(String id,String kode)=>(update(insGarduRealisasis)..where((t)=>t.localId.equals(id))).write(InsGarduRealisasisCompanion(kodePekerjaanGardu:Value(kode),status:const Value('tersinkron')));
  Future<void> setTemuanSync(String id,String kode)=>(update(insGarduTemuans)..where((t)=>t.localId.equals(id))).write(InsGarduTemuansCompanion(kodeTemuan:Value(kode),status:const Value('tersinkron')));
}
