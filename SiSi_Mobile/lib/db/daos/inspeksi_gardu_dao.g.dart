// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'inspeksi_gardu_dao.dart';

// ignore_for_file: type=lint
mixin _$InspeksiGarduDaoMixin on DatabaseAccessor<AppDatabase> {
  $InsGarduHeadersTable get insGarduHeaders => attachedDatabase.insGarduHeaders;
  $InsGarduRealisasisTable get insGarduRealisasis =>
      attachedDatabase.insGarduRealisasis;
  $InsGarduTemuansTable get insGarduTemuans => attachedDatabase.insGarduTemuans;
  $ListTemuansTable get listTemuans => attachedDatabase.listTemuans;
  InspeksiGarduDaoManager get managers => InspeksiGarduDaoManager(this);
}

class InspeksiGarduDaoManager {
  final _$InspeksiGarduDaoMixin _db;
  InspeksiGarduDaoManager(this._db);
  $$InsGarduHeadersTableTableManager get insGarduHeaders =>
      $$InsGarduHeadersTableTableManager(
          _db.attachedDatabase, _db.insGarduHeaders);
  $$InsGarduRealisasisTableTableManager get insGarduRealisasis =>
      $$InsGarduRealisasisTableTableManager(
          _db.attachedDatabase, _db.insGarduRealisasis);
  $$InsGarduTemuansTableTableManager get insGarduTemuans =>
      $$InsGarduTemuansTableTableManager(
          _db.attachedDatabase, _db.insGarduTemuans);
  $$ListTemuansTableTableManager get listTemuans =>
      $$ListTemuansTableTableManager(_db.attachedDatabase, _db.listTemuans);
}
