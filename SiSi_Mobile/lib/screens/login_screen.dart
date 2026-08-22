import 'dart:async';

import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../services/sesi_store.dart';
import '../theme/app_colors.dart';
import 'dashboard_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Stack(
          children: [
            Positioned(top: 12, right: 20, child: _PlnBadge()),
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
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
                      style: TextStyle(
                        fontSize: 15,
                        color: AppColors.neutral500,
                      ),
                    ),
                    const SizedBox(height: 20),
                    Container(
                      padding: const EdgeInsets.fromLTRB(8, 6, 12, 6),
                      decoration: BoxDecoration(
                        color: AppColors.navy100,
                        borderRadius: BorderRadius.circular(100),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.location_on,
                            size: 12,
                            color: AppColors.amber600,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'PLN ULP TOBOALI',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.5,
                              color: AppColors.navy700,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 44),
                    SizedBox(
                      width: 260,
                      height: 54,
                      child: ElevatedButton.icon(
                        onPressed: () => _showLoginSheet(context),
                        icon: const Icon(Icons.login, size: 18),
                        label: const Text(
                          'Login',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.navy700,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(15),
                          ),
                          elevation: 4,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Positioned(
              bottom: 20,
              left: 0,
              right: 0,
              child: Text(
                'Sistem Integrasi © 2026 · PLN ULP Toboali',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 11, color: AppColors.neutral500),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showLoginSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _LoginSheet(
        // Callback ini dijalankan oleh LOGIN SCREEN (context yang masih hidup),
        // bukan oleh si popup yang bakal ditutup duluan.
        onLoginSuccess: (result) => _showWelcomeDialog(result),
      ),
    );
  }

  void _showWelcomeDialog(Map<String, dynamic> sesi) {
    if (!mounted) return;
    showDialog(
      context: context,
      barrierColor: AppColors.navy950.withOpacity(0.72),
      builder: (_) => _WelcomeDialog(
        sesi: sesi,
        onContinue: () {
          Navigator.pop(context); // tutup dialog welcome
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => DashboardScreen(sesi: sesi)),
          );
        },
      ),
    );
  }
}

class _PlnBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 42,
      height: 42,
      decoration: BoxDecoration(
        // Rev 21 Agu sore: kuning PLN → abu lembut agar logo PLN tampil dominan
        color: AppColors.neutral100,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.neutral200, width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.15),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: Image.asset(
          'assets/images/logo-pln.png',
          fit: BoxFit.contain,
          errorBuilder: (_, __, ___) =>
              const Icon(Icons.bolt, color: AppColors.plnRed),
        ),
      ),
    );
  }
}

// ============ POPUP LOGIN ============
class _LoginSheet extends StatefulWidget {
  final void Function(Map<String, dynamic> result) onLoginSuccess;
  const _LoginSheet({required this.onLoginSuccess});

  @override
  State<_LoginSheet> createState() => _LoginSheetState();
}

class _LoginSheetState extends State<_LoginSheet> {
  final _userCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _obscure = true;
  bool _loading = false;
  String? _error;

  Future<void> _handleLogin() async {
    final username = _userCtrl.text.trim();
    final password = _passCtrl.text;
    if (username.isEmpty || password.isEmpty) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      // Rev 22 Agu 2026 (tahap 2): loginPerangkat menerbitkan deviceToken tanpa
      // masa berlaku. Ini SATU-SATUNYA tempat password disentuh — ia tidak
      // pernah ikut disimpan ke perangkat.
      final result = await ApiService.loginPerangkat(username, password);
      if (!mounted) return;

      if (result['success'] == true) {
        // Simpan SELURUH field sesi (termasuk ulp/tim/subTim yang dipakai
        // dashboard) + deviceToken. Sesi inilah yang dipakai SplashGate agar
        // aplikasi tidak meminta login lagi sampai user benar-benar menekan
        // "Keluar dari Akun".
        await SesiStore.simpan(Map<String, dynamic>.from(result));

        if (!mounted) return;
        Navigator.pop(context); // tutup popup login DULU

        // Panggil callback ke LoginScreen, JANGAN setState apapun setelah ini.
        widget.onLoginSuccess(result);
        return; // stop di sini, jangan lanjut ke bawah
      } else {
        setState(() {
          _error = result['message'] ?? 'Login gagal';
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Gagal: $e';
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
        ),
        padding: const EdgeInsets.fromLTRB(24, 14, 24, 24),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: AppColors.neutral300,
                    borderRadius: BorderRadius.circular(100),
                  ),
                ),
              ),
              // HEADER: judul & tombol ✕ kini benar-benar sejajar tengah
              // (tombol ✕ fix 32px tanpa padding bawaan IconButton)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const Text(
                    'Masuk ke akun',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.neutral900,
                    ),
                  ),
                  InkWell(
                    onTap: () => Navigator.pop(context),
                    borderRadius: BorderRadius.circular(100),
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: const BoxDecoration(
                        color: AppColors.neutral100,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.close, size: 18),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                'Gunakan akun yang terdaftar di ULP kamu.',
                style: TextStyle(fontSize: 13, color: AppColors.neutral500),
              ),
              const SizedBox(height: 20),
              if (_error != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.red100,
                    borderRadius: BorderRadius.circular(11),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.error_outline,
                        color: AppColors.red600,
                        size: 16,
                      ),
                      const SizedBox(width: 9),
                      Expanded(
                        child: Text(
                          _error!,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.red600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],
              _buildLabel('Username (Kode Unit.Tim)'),
              const SizedBox(height: 6),
              _buildTextField(
                controller: _userCtrl,
                hint: 'cth. 16130.ROW01',
                icon: Icons.person_outline,
                accentColor: AppColors.navy700,
              ),
              const SizedBox(height: 16),
              _buildLabel('Kata sandi'),
              const SizedBox(height: 6),
              _buildTextField(
                controller: _passCtrl,
                hint: 'Masukkan kata sandi',
                icon: Icons.lock_outline,
                accentColor: AppColors.amber600,
                obscure: _obscure,
                // Tombol mata: InkWell ringan (bukan IconButton 48px) supaya
                // tidak mendesak isi kolom — rata dgn kolom Username
                suffix: InkWell(
                  onTap: () => setState(() => _obscure = !_obscure),
                  borderRadius: BorderRadius.circular(100),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Icon(
                      _obscure
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined,
                      size: 17,
                      color: AppColors.amber600,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: _loading ? null : _handleLogin,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.amber600,
                    foregroundColor: AppColors.navy950,
                    disabledBackgroundColor: AppColors.neutral300,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(13),
                    ),
                    elevation: 0,
                  ),
                  child: _loading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.4,
                            color: AppColors.navy950,
                          ),
                        )
                      : const Text(
                          'Masuk',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 16),
              Center(
                child: Text(
                  'Data kamu terenkripsi & hanya bisa diakses oleh tim yang berwenang.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 11, color: AppColors.neutral500),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLabel(String text) => Text(
        text,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: Colors.black87,
        ),
      );

  // Rev 21 Agu sore: tiap kolom punya WARNA aksen sendiri (latar lembut +
  // border + icon senada) — Username navy, Kata sandi amber.
  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    required Color accentColor,
    bool obscure = false,
    Widget? suffix,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: accentColor.withOpacity(0.06),
        borderRadius: BorderRadius.circular(11),
        border: Border.all(color: accentColor.withOpacity(0.35), width: 1.5),
      ),
      // PERBAIKAN RATA & TENGAH: tinggi kolom mengikuti isi (tanpa height fix)
      // + padding atas-bawah sama besar → teks & icon selalu tepat di tengah
      // vertikal, baik kolom polos maupun yang ada tombol mata
      child: TextField(
        controller: controller,
        obscureText: obscure,
        onChanged: (_) => setState(() {}),
        textAlignVertical: TextAlignVertical.center,
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: TextStyle(color: AppColors.neutral500, fontSize: 13),
          prefixIcon: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Icon(icon, size: 17, color: accentColor),
          ),
          prefixIconConstraints:
              const BoxConstraints(minWidth: 40, minHeight: 24),
          suffixIcon: suffix,
          suffixIconConstraints:
              const BoxConstraints(minWidth: 40, minHeight: 24),
          isDense: true,
          border: InputBorder.none,
          // Padding atas-bawah sama besar = teks benar-benar di tengah kolom
          contentPadding: const EdgeInsets.symmetric(vertical: 13),
        ),
      ),
    );
  }
}

// ============ POPUP SELAMAT DATANG (auto-redirect 2 detik) ============
class _WelcomeDialog extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final VoidCallback onContinue;
  const _WelcomeDialog({required this.sesi, required this.onContinue});

  @override
  State<_WelcomeDialog> createState() => _WelcomeDialogState();
}

class _WelcomeDialogState extends State<_WelcomeDialog> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    // Auto lanjut ke dashboard setelah 2 detik, gak perlu diklik
    _timer = Timer(const Duration(seconds: 2), () {
      if (mounted) widget.onContinue();
    });
  }

  @override
  void dispose() {
    _timer
        ?.cancel(); // penting: batalin timer kalau widget ditutup manual duluan
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final username = widget.sesi['username'] ?? 'Pengguna';
    final role = widget.sesi['role'] ?? '-';
    final ulp = widget.sesi['ulp'] ?? 'ULP Toboali';

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 28),
      child: Container(
        padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 76,
              height: 76,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [AppColors.success600, AppColors.success700],
                ),
              ),
              child: const Icon(Icons.check, color: Colors.white, size: 38),
            ),
            const SizedBox(height: 20),
            Text(
              'LOGIN BERHASIL',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 1,
                color: AppColors.success700,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Selamat Datang! 👋',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: AppColors.neutral900,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Kamu berhasil masuk ke SiSi. Yuk mulai kerjaan hari ini.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: AppColors.neutral500),
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.neutral100,
                borderRadius: BorderRadius.circular(13),
              ),
              child: Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: AppColors.navy700,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Center(
                      child: Text(
                        username.substring(0, 1).toUpperCase(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          username,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Text(
                          '$role · $ulp',
                          style: TextStyle(
                            fontSize: 11,
                            color: AppColors.neutral500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(
                strokeWidth: 2.4,
                color: AppColors.navy700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Mengalihkan ke dashboard...',
              style: TextStyle(fontSize: 11, color: AppColors.neutral500),
            ),
          ],
        ),
      ),
    );
  }
}
