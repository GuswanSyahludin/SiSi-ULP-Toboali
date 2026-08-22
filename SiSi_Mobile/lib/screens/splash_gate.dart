import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../services/sesi_store.dart';
import '../theme/app_colors.dart';
import 'dashboard_screen.dart';
import 'login_screen.dart';

/// SplashGate — halaman pertama aplikasi.
///
/// Rev 22 Agu 2026 (tahap 2 — DEVICE TOKEN): tujuan awal ditentukan SEBELUM
/// user melihat form login, cukup dengan SATU panggilan `cekPerangkat`.
/// Token perangkat tidak punya masa berlaku, jadi selama belum dicabut, user
/// tidak akan pernah melihat layar login lagi.
///
/// Urutan keputusan:
///   1. Ada deviceToken → cekPerangkat → dapat sesi segar → Dashboard.
///   2. Server mencabut perangkat (kode PERANGKAT_TIDAK_DIKENAL /
///      PASSWORD_BERUBAH / AKUN_TIDAK_ADA) → sesi dibersihkan → LoginScreen.
///   3. Tidak ada jaringan / server sedang bermasalah → TETAP masuk Dashboard
///      dengan sesi lokal (aplikasi punya mode offline lewat master data
///      lokal). Petugas lapangan tidak boleh terjebak di layar login hanya
///      karena sinyal hilang.
///   4. Belum pernah login → LoginScreen.
class SplashGate extends StatefulWidget {
  const SplashGate({super.key});

  @override
  State<SplashGate> createState() => _SplashGateState();
}

class _SplashGateState extends State<SplashGate> {
  /// Kode dari backend yang berarti perangkat memang sudah dicabut — hanya
  /// kode inilah yang boleh memaksa user login manual.
  static const _kodeDicabut = {
    'PERANGKAT_TIDAK_DIKENAL',
    'PASSWORD_BERUBAH',
    'AKUN_TIDAK_ADA',
    'TANPA_TOKEN',
  };

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _tentukanTujuan());
  }

  Future<void> _tentukanTujuan() async {
    final sesiLokal = await SesiStore.muat();
    final punyaDevice = await SesiStore.adaDeviceToken();

    // Belum pernah login (atau sudah logout): tidak ada apa pun untuk dipakai.
    if (sesiLokal == null && !punyaDevice) {
      _keLogin();
      return;
    }

    if (punyaDevice) {
      try {
        final hasil = await ApiService.cekPerangkat();
        if (hasil['success'] == true) {
          _keDashboard(Map<String, dynamic>.from(hasil));
          return;
        }

        // Perangkat dicabut server → baru boleh minta login manual.
        final kode = (hasil['kode'] ?? '').toString().toUpperCase();
        if (_kodeDicabut.contains(kode)) {
          await SesiStore.hapus();
          _keLogin();
          return;
        }
        // Galat lain (mis. kuota / gangguan sesaat): jangan usir user.
      } catch (_) {
        // Tidak ada jaringan → lanjut ke mode offline di bawah.
      }
    }

    if (sesiLokal != null) {
      _keDashboard(sesiLokal);
      return;
    }
    _keLogin();
  }

  void _keDashboard(Map<String, dynamic> sesi) {
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => DashboardScreen(sesi: sesi)),
    );
  }

  void _keLogin() {
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: 108,
                height: 108,
                child: Image.asset(
                  'assets/images/logo-sisi.png',
                  errorBuilder: (_, __, ___) => const Icon(
                    Icons.hub,
                    size: 90,
                    color: AppColors.navy900,
                  ),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'SiSi',
                style: TextStyle(
                  fontSize: 40,
                  fontWeight: FontWeight.w800,
                  color: AppColors.navy900,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Sistem Integrasi',
                style: TextStyle(fontSize: 15, color: AppColors.neutral500),
              ),
              const SizedBox(height: 36),
              const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2.4,
                  color: AppColors.navy700,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                'Menyiapkan sesi...',
                style: TextStyle(fontSize: 11, color: AppColors.neutral500),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
