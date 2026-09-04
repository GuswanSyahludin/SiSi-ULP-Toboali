import 'package:flutter/material.dart';

/// Palet SiSi yang diturunkan dari identitas logo: biru-cyan sebagai warna
/// utama, biru tinta untuk struktur, dan kuning sebagai aksen terbatas.
/// Nama lama dipertahankan agar seluruh flow dan layar existing tetap kompatibel.
class AppColors {
  AppColors._();

  // Brand SiSi
  static const brand950 = Color(0xFF102A36);
  static const brand900 = Color(0xFF123847);
  static const brand800 = Color(0xFF135268);
  static const brand700 = Color(0xFF086D8A);
  static const brand600 = Color(0xFF0788AA);
  static const brand500 = Color(0xFF14A6C7);
  static const brand100 = Color(0xFFDDF4F7);
  static const brand50 = Color(0xFFF1FAFB);

  // Aksen logo, dipakai hemat untuk status penting dan fokus.
  static const accent700 = Color(0xFFB47A00);
  static const accent600 = Color(0xFFE3A600);
  static const accent400 = Color(0xFFF2C94C);
  static const accent100 = Color(0xFFFFF3C4);

  // Neutral yang ditint ke hue brand agar antarlayar terasa satu keluarga.
  static const neutral950 = Color(0xFF10252E);
  static const neutral900 = Color(0xFF17313B);
  static const neutral700 = Color(0xFF405A63);
  static const neutral500 = Color(0xFF667D85);
  static const neutral400 = Color(0xFF8EA1A7);
  static const neutral300 = Color(0xFFBCC9CD);
  static const neutral200 = Color(0xFFD8E2E5);
  static const neutral150 = Color(0xFFE5ECEE);
  static const neutral100 = Color(0xFFF0F5F6);
  static const neutral50 = Color(0xFFF7FAFA);
  static const surface = Color(0xFFFCFEFE);

  // Semantic
  static const red700 = Color(0xFFB4232F);
  static const red600 = Color(0xFFD13B46);
  static const red100 = Color(0xFFFFE8EA);
  static const success700 = Color(0xFF167451);
  static const success600 = Color(0xFF219064);
  static const success100 = Color(0xFFE3F5EC);
  static const info100 = brand100;

  // Alias kompatibilitas. Semua layar lama otomatis memakai palet baru.
  static const navy950 = brand950;
  static const navy900 = brand900;
  static const navy700 = brand700;
  static const navy600 = brand600;
  static const navy500 = brand500;
  static const navy100 = brand100;
  static const cyan600 = brand500;
  static const cyan100 = brand100;
  static const amber700 = accent700;
  static const amber600 = accent600;

  // Warna resmi PLN tetap utuh untuk logo dan konteks resmi.
  static const plnYellow = Color(0xFFFFDE00);
  static const plnRed = Color(0xFFE30613);
  static const plnBlue = Color(0xFF00A0DC);
}
