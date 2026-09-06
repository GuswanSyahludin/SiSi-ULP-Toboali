import 'package:flutter/material.dart';

/// Explicit warning for OS-reported mocked locations, not an app-package scan.
/// Dismissing this dialog never accepts a rejected position or retries capture.
class MockGpsWarningDialog extends StatelessWidget {
  const MockGpsWarningDialog({super.key});

  static Future<void>? _visible;

  /// Share the active popup across GPS buttons; repeated detections don't stack.
  static Future<void> show(BuildContext context) {
    final existing = _visible;
    if (existing != null) return existing;
    final future = _open(context);
    _visible = future;
    return future;
  }

  static Future<void> _open(BuildContext context) async {
    try {
      await showDialog<void>(
        context: context,
        useRootNavigator: true,
        barrierDismissible: false,
        builder: (_) => const MockGpsWarningDialog(),
      );
    } finally {
      _visible = null;
    }
  }

  @override
  Widget build(BuildContext context) {
    const ink = Color(0xFF18334D);
    const muted = Color(0xFF52687C);
    const red = Color(0xFFBD363F);
    return Dialog(
      backgroundColor: const Color(0xFFFAFCFE),
      surfaceTintColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 380),
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Align(
                  alignment: Alignment.centerRight,
                  child: IconButton(
                    tooltip: 'Tutup peringatan',
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close_rounded, color: muted),
                  ),
                ),
                Container(
                  width: 80,
                  height: 80,
                  decoration: const BoxDecoration(
                    color: Color(0xFFFBE7E9),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.cancel_outlined, size: 48, color: red),
                ),
                const SizedBox(height: 24),
                Semantics(
                  header: true,
                  child: const Text(
                    'Silahkan Matikan Aplikasi Pihak Ke-3 GPS',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 22,
                      height: 1.3,
                      fontWeight: FontWeight.w700,
                      color: ink,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Lokasi terdeteksi sebagai lokasi simulasi. '
                  'Nonaktifkan aplikasi pengubah GPS, lalu ambil lokasi kembali.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14, height: 1.5, color: muted),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF225FC2),
                      foregroundColor: const Color(0xFFFAFCFE),
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Mengerti'),
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Lokasi dari percobaan ini tidak digunakan.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, color: muted),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
