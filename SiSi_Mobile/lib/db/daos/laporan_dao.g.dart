// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'laporan_dao.dart';

// ignore_for_file: type=lint
mixin _$LaporanDaoMixin on DatabaseAccessor<AppDatabase> {
  $LaporanHariansTable get laporanHarians => attachedDatabase.laporanHarians;
  LaporanDaoManager get managers => LaporanDaoManager(this);
}

class LaporanDaoManager {
  final _$LaporanDaoMixin _db;
  LaporanDaoManager(this._db);
  $$LaporanHariansTableTableManager get laporanHarians =>
      $$LaporanHariansTableTableManager(
          _db.attachedDatabase, _db.laporanHarians);
}
