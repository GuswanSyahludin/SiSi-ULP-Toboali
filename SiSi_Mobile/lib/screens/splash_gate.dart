import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../services/sesi_store.dart';
import '../theme/app_colors.dart';
import 'dashboard_screen.dart';
import 'login_screen.dart';

/// SplashGate — halaman pertama aplikasi (Rev 22 Agu 2026).
///
/// Menentukan tujuan awal SEBELUM user melihat form login, sehingga halaman
/// login hanya muncul kalau memang belum ada sesi (baru install / sudah
/// logout). Urutan usaha:
///
///   1. Token tersimpan masih hidup di server (cekSesi) → langsung Dashboard.
///      Panggilan ini sekaligus memperpanjang sesi di CacheService backend.
///   2. Token basi (masa berlaku server 15 menit) → login senyap memakai
///      kredensial tersimpan → Dashboard, tanpa mengetik apa pun.
///   3. Tidak ada koneksi → tetap masuk Dashboard dengan sesi lokal (aplikasi
///      sudah punya mode offline lewat master data lokal).
///   4. Akun/password sudah diubah admin → sesi dibersihkan → LoginScreen.
class SplashGate extends StatefulWidget {
  const SplashGate({super.key});

  @override
  State<SplashGate> createState() => _SplashGateState();
}

class _SplashGateState extends State<SplashGate> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _tentukanTujuan());
  }

  Future<void> _tentukanTujuan() async {
    final sesiLokal = await SesiStore.muat();
    if (sesiLokal == null) {
      _keLogin();
      return;
    }

    // 1) Token masih hidup di server?
    final token = (sesiLokal['token'] ?? '').toString();
    if (token.isNotEmpty) {
      try {
        final cek = await ApiService.cekSesi(token);
        if (cek['success'] == true) {
          final sesi = Map<String, dynamic>.from(sesiLokal);
          final dariServer = cek['sesi'];
          if (dariServer is Map) {
            sesi.addAll(Map<String, dynamic>.from(dariServer));
          }
          await SesiStore.simpan(sesi);
          _keDashboard(sesi);
          return;
        }
      } catch (_) {
        // Server lambat / tidak ada jaringan → coba jalur berikutnya.
      }
    }

    // 2) Token basi → login senyap dengan kredensial tersimpan.
    if (await SesiStore.adaKredensial()) {
      try {
        final hasil = await ApiService.loginTersimpan();
        if (hasil != null && hasil['success'] == true) {
          _keDashboard(hasil);
          return;
        }
        // Ditolak server: hanya paksa login manual bila memang soal akun,
        // bukan gangguan server sesaat.
        final pesan = (hasil?['message'] ?? '').toString().toLowerCase();
        final soalAkun = pesan.contains('salah') ||
            pesan.contains('tidak ditemukan') ||
            pesan.contains('wajib diisi');
        if (soalAkun) {
          await SesiStore.hapus();
          _keLogin();
          return;
        }
      } catch (_) {
        // 3) Offline → masuk dengan sesi lokal.
        _keDashboard(sesiLokal);
        return;
      }
    }

    // Sesi lokal masih ada tapi server tak bisa dipastikan → jangan usir user.
    _keDashboard(sesiLokal);
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
