// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'header_dao.dart';

// ignore_for_file: type=lint
mixin _$HeaderDaoMixin on DatabaseAccessor<AppDatabase> {
  $GlobalHeadersTable get globalHeaders => attachedDatabase.globalHeaders;
  HeaderDaoManager get managers => HeaderDaoManager(this);
}

class HeaderDaoManager {
  final _$HeaderDaoMixin _db;
  HeaderDaoManager(this._db);
  $$GlobalHeadersTableTableManager get globalHeaders =>
      $$GlobalHeadersTableTableManager(_db.attachedDatabase, _db.globalHeaders);
}
