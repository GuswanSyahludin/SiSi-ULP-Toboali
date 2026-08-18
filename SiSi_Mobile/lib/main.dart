import 'package:flutter/material.dart';

import 'screens/login_screen.dart';

void main() {
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
      home: const LoginScreen(),
    );
  }
}
