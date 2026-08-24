from pathlib import Path

# Applies Android background sync wiring after the offline-first files land.
p=Path('SiSi_Mobile/pubspec.yaml'); s=p.read_text()
s=s.replace('  shared_preferences: ^2.5.5\n', '  shared_preferences: ^2.5.5\n  workmanager: ^0.5.2\n')
p.write_text(s)

p=Path('SiSi_Mobile/lib/main.dart'); s=p.read_text()
s=s.replace("import 'package:flutter/material.dart';\n", "import 'package:flutter/material.dart';\n\nimport 'services/auto_sync_service.dart';\n")
s=s.replace('void main() {\n  runApp(const SiSiApp());\n}', 'Future<void> main() async {\n  WidgetsFlutterBinding.ensureInitialized();\n  await AutoSyncService.initialize();\n  runApp(const SiSiApp());\n}')
p.write_text(s)

p=Path('SiSi_Mobile/android/app/src/main/AndroidManifest.xml'); s=p.read_text()
s=s.replace('    <uses-permission android:name="android.permission.INTERNET"/>', '    <uses-permission android:name="android.permission.INTERNET"/>\n    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>\n    <uses-permission android:name="android.permission.WAKE_LOCK"/>')
p.write_text(s)

p=Path('SiSi_Mobile/lib/db/app_database.dart'); s=p.read_text()
s=s.replace('int get schemaVersion => 7;', 'int get schemaVersion => 8;')
needle='''  @override\n  MigrationStrategy get migration => MigrationStrategy(\n        onUpgrade: (m, from, to) async {'''
replacement='''  Future<void> _ensureTeknikToTables() async {\n    await customStatement('CREATE TABLE IF NOT EXISTS teknik_to_cache (kode_pekerjaan TEXT NOT NULL, mode TEXT NOT NULL, tanggal TEXT NOT NULL DEFAULT "", payload TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (kode_pekerjaan, mode))');\n    await customStatement('CREATE INDEX IF NOT EXISTS idx_teknik_to_mode_tanggal ON teknik_to_cache(mode, tanggal DESC)');\n    await customStatement('CREATE TABLE IF NOT EXISTS teknik_to_team (nama TEXT PRIMARY KEY NOT NULL, updated_at TEXT NOT NULL)');\n    await customStatement('CREATE TABLE IF NOT EXISTS teknik_to_outbox (id INTEGER PRIMARY KEY AUTOINCREMENT, kode_pekerjaan TEXT NOT NULL, mode TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0)');\n  }\n\n  @override\n  MigrationStrategy get migration => MigrationStrategy(\n        beforeOpen: (_) async => _ensureTeknikToTables(),\n        onUpgrade: (m, from, to) async {'''
if needle not in s: raise SystemExit('database needle missing')
s=s.replace(needle,replacement)
p.write_text(s)

p=Path('SiSi_Mobile/lib/db/repositories/sync_repository.dart'); s=p.read_text()
s=s.replace("import 'p0_repository.dart';\n", "import 'p0_repository.dart';\nimport 'teknik_to_repository.dart';\n")
s=s.replace("      final master = await downloadMasterData(activeToken);\n\n      final p0Ok", "      final master = await downloadMasterData(activeToken);\n      Map<String, dynamic> teknikTo = {'ok': true};\n      try { await TeknikToRepository().syncAll(activeToken); }\n      catch (e) { teknikTo = {'ok': false, 'message': e.toString()}; }\n\n      final p0Ok")
s=s.replace("      final masterOk = master['ok'] == true;", "      final masterOk = master['ok'] == true;\n      final teknikToOk = teknikTo['ok'] == true;")
s=s.replace("        'Data: ${masterOk ? master['message'] ?? 'sinkron selesai' : master['message'] ?? 'gagal'}',", "        'Data: ${masterOk ? master['message'] ?? 'sinkron selesai' : master['message'] ?? 'gagal'}',\n        'TO: ${teknikToOk ? 'offline siap' : teknikTo['message'] ?? 'gagal'}',")
s=s.replace("        'ok': p0Ok && masterOk,", "        'ok': p0Ok && masterOk && teknikToOk,")
p.write_text(s)

p=Path('SiSi_Mobile/lib/widgets/sync_section_pengaturan.dart'); s=p.read_text()
s=s.replace("import '../theme/app_colors.dart';\n", "import '../theme/app_colors.dart';\nimport '../services/auto_sync_service.dart';\n")
s=s.replace("    final ok = hasil['ok'] == true;", "    final ok = hasil['ok'] == true;\n    if (ok) await AutoSyncService.activate();")
s=s.replace("                ? 'Data Sudah Sinkron'", "                ? 'Sinkron otomatis aktif · data siap offline'")
p.write_text(s)

p=Path('SiSi_Mobile/lib/screens/dashboard_screen.dart'); s=p.read_text()
s=s.replace("import '../services/api_service.dart';\n", "import '../services/api_service.dart';\nimport '../services/auto_sync_service.dart';\n")
s=s.replace('with SingleTickerProviderStateMixin {', 'with SingleTickerProviderStateMixin, WidgetsBindingObserver {')
s=s.replace('    _bubbleController = AnimationController(vsync: this);', '    WidgetsBinding.instance.addObserver(this);\n    _bubbleController = AnimationController(vsync: this);\n    unawaited(AutoSyncService.syncNow(widget.sesi));')
s=s.replace('    _onlineTimer?.cancel();', '    WidgetsBinding.instance.removeObserver(this);\n    _onlineTimer?.cancel();')
insert='''\n  @override\n  void didChangeAppLifecycleState(AppLifecycleState state) {\n    if (state == AppLifecycleState.resumed) {\n      unawaited(AutoSyncService.syncNow(widget.sesi));\n    }\n  }\n'''
pos=s.index('\n  bool get _isSuperUser')
s=s[:pos]+insert+s[pos:]
s=s.replace("    final prefs = await SharedPreferences.getInstance();", "    await AutoSyncService.deactivate();\n    final prefs = await SharedPreferences.getInstance();")
p.write_text(s)
