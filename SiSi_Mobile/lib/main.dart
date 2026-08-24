import 'package:flutter/material.dart';

import 'services/auto_sync_service.dart';

import 'screens/splash_gate.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AutoSyncService.initialize();
  runApp(const SiSiApp());
}

class SiSiApp extends StatelessWidget {
  const SiSiApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SiSi Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(fontFamily: 'Inter', useMaterial3: true),
      // Rev 22 Agu 2026: halaman awal TIDAK lagi langsung LoginScreen.
      // SplashGate yang memutuskan: sesi tersimpan → Dashboard, sudah logout /
      // belum pernah login → LoginScreen.
      home: const SplashGate(),
    );
  }
}
