import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

class LaporanHeaderCard extends StatelessWidget {
  final Map<String, dynamic> item;
  final IconData icon;
  final Color accent;
  final String summary;
  final VoidCallback onTap;
  final VoidCallback? onWa;

  const LaporanHeaderCard({
    super.key,
    required this.item,
    required this.icon,
    required this.accent,
    required this.summary,
    required this.onTap,
    this.onWa,
  });

  bool get _readyWa {
    final text = (item['waText'] ?? '').toString().trim();
    final status = (item['statusTextWa'] ?? '').toString().trim().toLowerCase();
    return text.isNotEmpty || status == 'update';
  }

  @override
  Widget build(BuildContext context) {
    final kode = (item['kodeHeader'] ?? '-').toString();
    final hari = (item['hari'] ?? '').toString();
    final tanggal = (item['tanggal'] ?? '-').toString();
    final subTim = (item['subTim'] ?? item['tim'] ?? '-').toString();
    final petugas = (item['inputBy'] ?? item['petugas'] ?? '-').toString();

    return Material(
      color: const Color(0xFFFCFDFF),
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.neutral200),
            boxShadow: [
              BoxShadow(
                color: AppColors.navy950.withValues(alpha: .035),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: .12),
                      borderRadius: BorderRadius.circular(13),
                    ),
                    child: Icon(icon, color: accent, size: 23),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          kode,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            color: AppColors.navy900,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          '$hari, $tanggal',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.neutral500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                    decoration: BoxDecoration(
                      color: _readyWa
                          ? const Color(0xFFECFDF5)
                          : const Color(0xFFFFFBEB),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      _readyWa ? 'SIAP WA' : 'PROSES',
                      style: TextStyle(
                        fontSize: 9,
                        letterSpacing: .5,
                        fontWeight: FontWeight.w900,
                        color: _readyWa
                            ? AppColors.success700
                            : AppColors.amber700,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 13),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(11),
                decoration: BoxDecoration(
                  color: AppColors.neutral100,
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      summary,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: AppColors.navy900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$subTim  •  Input: $petugas',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.neutral500,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 11),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: onTap,
                      icon: const Icon(Icons.visibility_outlined, size: 17),
                      label: const Text('Detail'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.navy700,
                        side: const BorderSide(color: AppColors.navy100),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _readyWa ? onWa : null,
                      icon: Icon(
                        _readyWa ? Icons.send_rounded : Icons.lock_clock_rounded,
                        size: 16,
                      ),
                      label: Text(_readyWa ? 'Kirim WA' : 'Belum Siap'),
                      style: ElevatedButton.styleFrom(
                        elevation: 0,
                        backgroundColor: const Color(0xFF25D366),
                        foregroundColor: Colors.white,
                        disabledBackgroundColor: AppColors.neutral200,
                        disabledForegroundColor: AppColors.neutral500,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
