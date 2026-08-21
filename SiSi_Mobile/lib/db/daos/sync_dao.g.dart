// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'sync_dao.dart';

// ignore_for_file: type=lint
mixin _$SyncDaoMixin on DatabaseAccessor<AppDatabase> {
  $SyncInfosTable get syncInfos => attachedDatabase.syncInfos;
  SyncDaoManager get managers => SyncDaoManager(this);
}

class SyncDaoManager {
  final _$SyncDaoMixin _db;
  SyncDaoManager(this._db);
  $$SyncInfosTableTableManager get syncInfos =>
      $$SyncInfosTableTableManager(_db.attachedDatabase, _db.syncInfos);
}
