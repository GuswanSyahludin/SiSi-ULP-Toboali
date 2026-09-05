import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'screens/splash_gate.dart';
import 'services/auto_sync_service.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('id_ID');
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
      locale: const Locale('id', 'ID'),
      supportedLocales: const [Locale('id', 'ID')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: const SplashGate(),
    );
  }
}
