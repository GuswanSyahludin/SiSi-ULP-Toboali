// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'master_dao.dart';

// ignore_for_file: type=lint
mixin _$MasterDaoMixin on DatabaseAccessor<AppDatabase> {
  $MasterPenyulangsTable get masterPenyulangs =>
      attachedDatabase.masterPenyulangs;
  MasterDaoManager get managers => MasterDaoManager(this);
}

class MasterDaoManager {
  final _$MasterDaoMixin _db;
  MasterDaoManager(this._db);
  $$MasterPenyulangsTableTableManager get masterPenyulangs =>
      $$MasterPenyulangsTableTableManager(
          _db.attachedDatabase, _db.masterPenyulangs);
}
