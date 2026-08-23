// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'p0_dao.dart';

// ignore_for_file: type=lint
mixin _$P0DaoMixin on DatabaseAccessor<AppDatabase> {
  $P0LokalsTable get p0Lokals => attachedDatabase.p0Lokals;
  $P0OutboxesTable get p0Outboxes => attachedDatabase.p0Outboxes;
  P0DaoManager get managers => P0DaoManager(this);
}

class P0DaoManager {
  final _$P0DaoMixin _db;
  P0DaoManager(this._db);
  $$P0LokalsTableTableManager get p0Lokals =>
      $$P0LokalsTableTableManager(_db.attachedDatabase, _db.p0Lokals);
  $$P0OutboxesTableTableManager get p0Outboxes =>
      $$P0OutboxesTableTableManager(_db.attachedDatabase, _db.p0Outboxes);
}
