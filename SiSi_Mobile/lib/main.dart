import 'package:flutter/material.dart';
import 'package:drift/drift.dart' show Value;

import 'screens/login_screen.dart';
import 'db/db_provider.dart';
import 'db/app_database.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ujiDrift(); // SEMENTARA — uji Fase 1, hapus setelah berhasil
  runApp(const SiSiApp());
}

// ═══ UJI DRIFT (Fase 1) — hapus blok ini setelah uji berhasil ═══
Future<void> ujiDrift() async {
  final db = DbProvider.instance;

  // 1) INSERT — ganti seluruh isi tabel dengan 1 baris uji
  await db.masterDao.gantiSemuaPenyulang([
    MasterPenyulangsCompanion.insert(
      namaPenyulang: const Value('PENYULANG UJI'),
      section: const Value('A - B'),
      ulp: const Value('ULP Toboali'),
    ),
  ]);

  // 2) BACA — harus memuat baris yang baru di-insert
  final daftar = await db.masterDao.daftarPenyulang();
  debugPrint('✅ UJI DRIFT BERHASIL — isi master_penyulang: $daftar');
}

class SiSiApp extends StatelessWidget {
  const SiSiApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SiSi Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(fontFamily: 'Inter', useMaterial3: true),
      home: const LoginScreen(),
    );
  }
}
