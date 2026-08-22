// lib/db/tables/master_gardu.dart
// ───────────────────────────────────────────────────
// Cermin lokal Master_Gardu — field operasional yang disepakati 22 Agu 2026.
// Label DATA TRAFO, DATA PHB-TR, TEGANGAN, dan BEBAN adalah kelompok UI,
// bukan kolom tersendiri.
// ───────────────────────────────────────────────────

import 'package:drift/drift.dart';

@TableIndex(name: 'idx_master_gardu_ulp', columns: {#ulp})
@TableIndex(name: 'idx_master_gardu_nomor', columns: {#gardu})
class MasterGardus extends Table {
  @override
  String get tableName => 'master_gardu';

  @override
  Set<Column> get primaryKey => {gardu};

  TextColumn get ulp => text().withDefault(const Constant(''))();
  TextColumn get gardu => text()();
  TextColumn get alamat => text().withDefault(const Constant(''))();

  // DATA TRAFO
  TextColumn get jenisGardu => text().withDefault(const Constant(''))();
  TextColumn get merk => text().withDefault(const Constant(''))();
  TextColumn get kapasitasKva => text().withDefault(const Constant(''))();
  TextColumn get noSeri => text().withDefault(const Constant(''))();
  TextColumn get tahunTrafo => text().withDefault(const Constant(''))();
  TextColumn get typeSeal => text().withDefault(const Constant(''))();

  // DATA PHB-TR
  TextColumn get merkPhbTr => text().withDefault(const Constant(''))();
  TextColumn get nomorSeriPhbTr => text().withDefault(const Constant(''))();
  TextColumn get tahunPhbTr => text().withDefault(const Constant(''))();

  TextColumn get jamUkurWbp => text().withDefault(const Constant(''))();
  TextColumn get tanggalPengukuran => text().withDefault(const Constant(''))();
  TextColumn get kepemilikan => text().withDefault(const Constant(''))();

  // TEGANGAN WBP (V)
  TextColumn get wbpRs => text().withDefault(const Constant(''))();
  TextColumn get wbpSt => text().withDefault(const Constant(''))();
  TextColumn get wbpTr => text().withDefault(const Constant(''))();
  TextColumn get wbpRn => text().withDefault(const Constant(''))();
  TextColumn get wbpSn => text().withDefault(const Constant(''))();
  TextColumn get wbpTn => text().withDefault(const Constant(''))();

  // BEBAN ARUS UTAMA WBP (A)
  TextColumn get wbpR => text().withDefault(const Constant(''))();
  TextColumn get wbpS => text().withDefault(const Constant(''))();
  TextColumn get wbpT => text().withDefault(const Constant(''))();
  TextColumn get wbpN => text().withDefault(const Constant(''))();

  // TEGANGAN LWBP (V)
  TextColumn get lwbpRs => text().withDefault(const Constant(''))();
  TextColumn get lwbpSt => text().withDefault(const Constant(''))();
  TextColumn get lwbpTr => text().withDefault(const Constant(''))();
  TextColumn get lwbpRn => text().withDefault(const Constant(''))();
  TextColumn get lwbpSn => text().withDefault(const Constant(''))();
  TextColumn get lwbpTn => text().withDefault(const Constant(''))();

  // BEBAN ARUS UTAMA LWBP (A)
  TextColumn get lwbpR => text().withDefault(const Constant(''))();
  TextColumn get lwbpS => text().withDefault(const Constant(''))();
  TextColumn get lwbpT => text().withDefault(const Constant(''))();
  TextColumn get lwbpN => text().withDefault(const Constant(''))();
}
