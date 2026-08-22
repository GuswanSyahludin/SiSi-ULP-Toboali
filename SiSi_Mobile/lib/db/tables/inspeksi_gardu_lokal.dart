import 'package:drift/drift.dart';

class InsGarduHeaders extends Table {
  @override String get tableName => 'ins_gardu_header';
  @override Set<Column> get primaryKey => {localId};
  TextColumn get localId => text()();
  TextColumn get kodeHeader => text().withDefault(const Constant(''))();
  TextColumn get ulp => text().withDefault(const Constant(''))();
  TextColumn get hari => text().withDefault(const Constant(''))();
  TextColumn get tanggal => text()();
  TextColumn get koordinatAwal => text()();
  TextColumn get koordinatAkhir => text()();
  TextColumn get kmAwal => text().withDefault(const Constant(''))();
  TextColumn get kmAkhir => text().withDefault(const Constant(''))();
  TextColumn get kendala => text().withDefault(const Constant(''))();
  TextColumn get inputBy => text().withDefault(const Constant(''))();
  TextColumn get dibuatPada => text()();
  TextColumn get status => text().withDefault(const Constant('draft'))();
  TextColumn get pesanGagal => text().withDefault(const Constant(''))();
}

class InsGarduRealisasis extends Table {
  @override String get tableName => 'ins_gardu_realisasi';
  @override Set<Column> get primaryKey => {localId};
  TextColumn get localId => text()();
  TextColumn get localHeaderId => text()();
  TextColumn get kodePekerjaanGardu => text().withDefault(const Constant(''))();
  TextColumn get nomorGardu => text()();
  TextColumn get tier => text().withDefault(const Constant(''))();
  TextColumn get snapshotJson => text()();
  TextColumn get status => text().withDefault(const Constant('draft'))();
}

class InsGarduTemuans extends Table {
  @override String get tableName => 'ins_gardu_temuan';
  @override Set<Column> get primaryKey => {localId};
  TextColumn get localId => text()();
  TextColumn get localRealisasiId => text()();
  TextColumn get kodeTemuan => text().withDefault(const Constant(''))();
  TextColumn get tier => text()();
  TextColumn get temuan => text()();
  TextColumn get deskripsi => text().withDefault(const Constant(''))();
  TextColumn get fotoTemuanPath => text().withDefault(const Constant(''))();
  TextColumn get fotoGarduPath => text().withDefault(const Constant(''))();
  TextColumn get status => text().withDefault(const Constant('draft'))();
}

class ListTemuans extends Table {
  @override String get tableName => 'list_temuan';
  IntColumn get no => integer().nullable()();
  TextColumn get tier => text()();
  TextColumn get objekInspeksi => text()();
  TextColumn get temuan => text()();
  @override Set<Column> get primaryKey => {tier, objekInspeksi, temuan};
}
