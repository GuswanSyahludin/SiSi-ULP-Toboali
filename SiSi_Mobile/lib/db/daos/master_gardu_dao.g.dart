// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'master_gardu_dao.dart';

// ignore_for_file: type=lint
mixin _$MasterGarduDaoMixin on DatabaseAccessor<AppDatabase> {
  $MasterGardusTable get masterGardus => attachedDatabase.masterGardus;
  $GarduOutboxesTable get garduOutboxes => attachedDatabase.garduOutboxes;
  MasterGarduDaoManager get managers => MasterGarduDaoManager(this);
}

class MasterGarduDaoManager {
  final _$MasterGarduDaoMixin _db;
  MasterGarduDaoManager(this._db);
  $$MasterGardusTableTableManager get masterGardus =>
      $$MasterGardusTableTableManager(_db.attachedDatabase, _db.masterGardus);
  $$GarduOutboxesTableTableManager get garduOutboxes =>
      $$GarduOutboxesTableTableManager(_db.attachedDatabase, _db.garduOutboxes);
}
