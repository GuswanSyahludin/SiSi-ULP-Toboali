import 'package:drift/drift.dart' show Value;

import '../app_database.dart';
import '../db_provider.dart';

class LocalMasterMaterializer {
  final db = DbProvider.instance;

  Future<void> penyulang(List<dynamic> rawRows) async {
    final rows = <MasterPenyulangsCompanion>[];
    for (final raw in rawRows) {
      if (raw is! List) continue;
      final nama = raw.length > 2 ? '${raw[2]}'.trim() : '';
      final section = raw.length > 4 ? '${raw[4]}'.trim() : '';
      if (nama.isEmpty) continue;
      rows.add(MasterPenyulangsCompanion.insert(namaPenyulang: Value(nama), section: Value(section)));
    }
    if (rows.isNotEmpty) await db.masterDao.gantiSemuaPenyulang(rows);
  }

  Future<void> gardu(List<dynamic> rawRows, {String? ulpScope}) async {
    final rows = <MasterGardusCompanion>[];
    final revisions = <Map<String, dynamic>>[];
    final scopes = <String>{};
    if (ulpScope != null && ulpScope.trim().isNotEmpty) scopes.add(ulpScope.trim());
    for (final raw in rawRows) {
      if (raw is! Map) continue;
      final item = Map<String, dynamic>.from(raw);
      String value(String key) => '${item[key] ?? ''}';
      final gardu = value('gardu').trim();
      final ulp = value('ulp').trim();
      if (gardu.isEmpty) continue;
      if (ulp.isNotEmpty) scopes.add(ulp);
      rows.add(MasterGardusCompanion.insert(
        ulp: Value(ulp), gardu: gardu, alamat: Value(value('alamat')),
        latitude: Value(value('latitude')), longitude: Value(value('longitude')),
        penyulang: Value(value('penyulang')), section: Value(value('section')),
        jenisGardu: Value(value('jenisGardu')), merk: Value(value('merk')),
        kapasitasKva: Value(value('kapasitasKva')), noSeri: Value(value('noSeri')),
        tahunTrafo: Value(value('tahunTrafo')), typeSeal: Value(value('typeSeal')),
        beratTrafo: Value(value('beratTrafo')), volumeMinyak: Value(value('volumeMinyak')),
        merkPhbTr: Value(value('merkPhbTr')), nomorSeriPhbTr: Value(value('nomorSeriPhbTr')),
        tahunPhbTr: Value(value('tahunPhbTr')), jamUkurWbp: Value(value('jamUkurWbp')),
        tanggalPengukuran: Value(value('tanggalPengukuran')), kepemilikan: Value(value('kepemilikan')),
        wbpRs: Value(value('wbpRs')), wbpSt: Value(value('wbpSt')), wbpTr: Value(value('wbpTr')),
        wbpRn: Value(value('wbpRn')), wbpSn: Value(value('wbpSn')), wbpTn: Value(value('wbpTn')),
        wbpR: Value(value('wbpR')), wbpS: Value(value('wbpS')), wbpT: Value(value('wbpT')), wbpN: Value(value('wbpN')),
        lwbpRs: Value(value('lwbpRs')), lwbpSt: Value(value('lwbpSt')), lwbpTr: Value(value('lwbpTr')),
        lwbpRn: Value(value('lwbpRn')), lwbpSn: Value(value('lwbpSn')), lwbpTn: Value(value('lwbpTn')),
        lwbpR: Value(value('lwbpR')), lwbpS: Value(value('lwbpS')), lwbpT: Value(value('lwbpT')), lwbpN: Value(value('lwbpN')),
        arusMaxPerFasa: Value(value('arusMaxPerFasa')), pembebananKva: Value(value('pembebananKva')),
        pembebananKw: Value(value('pembebananKw')), persentaseBeban: Value(value('persentaseBeban')),
        kategoriBeban: Value(value('kategoriBeban')),
      ));
      if (item.containsKey('serverRevision')) {
        revisions.add({'gardu': gardu, 'ulp': ulp, 'serverRevision': item['serverRevision']});
      }
    }
    final scope = scopes.length == 1 ? scopes.first : null;
    await db.masterGarduDao.gantiSemua(rows, revisions: revisions, ulpScope: scope);
  }

  Future<void> listTemuan(List<dynamic> rawRows) async {
    final rows = <ListTemuansCompanion>[];
    for (final raw in rawRows) {
      if (raw is! List || raw.length < 4) continue;
      final temuan = '${raw[3]}'.trim();
      if (temuan.isEmpty) continue;
      rows.add(ListTemuansCompanion(no: Value(int.tryParse('${raw[0]}')), tier: Value('${raw[1]}'), objekInspeksi: Value('${raw[2]}'), temuan: Value(temuan)));
    }
    await db.inspeksiGarduDao.gantiListTemuan(rows);
  }
}
