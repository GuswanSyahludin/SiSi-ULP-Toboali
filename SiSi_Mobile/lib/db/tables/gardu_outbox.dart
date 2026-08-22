import 'package:drift/drift.dart';

@DataClassName('GarduOutbox')
class GarduOutboxes extends Table {
  @override
  String get tableName => 'gardu_outbox';

  @override
  Set<Column> get primaryKey => {gardu};

  TextColumn get gardu => text()();
  TextColumn get ulp => text().withDefault(const Constant(''))();
  TextColumn get perubahanJson => text().withDefault(const Constant('{}'))();
  TextColumn get diubahOleh => text().withDefault(const Constant(''))();
  TextColumn get diubahPada => text().withDefault(const Constant(''))();
  TextColumn get status => text().withDefault(const Constant('pending'))();
  IntColumn get percobaan => integer().withDefault(const Constant(0))();
  TextColumn get pesanGagal => text().withDefault(const Constant(''))();
}
