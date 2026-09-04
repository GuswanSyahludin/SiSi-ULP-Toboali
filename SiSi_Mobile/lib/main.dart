import 'package:flutter/material.dart';

import 'screens/splash_gate.dart';
import 'services/auto_sync_service.dart';
import 'theme/app_theme.dart';

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
      theme: AppTheme.light,
      // Flow autentikasi tetap: sesi perangkat valid menuju Dashboard,
      // sedangkan sesi kosong atau logout menuju LoginScreen.
      home: const SplashGate(),
    );
  }
}
