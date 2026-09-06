import 'package:flutter/material.dart';
import '../db/app_database.dart';
import '../theme/app_colors.dart';

/// Matches the daily team-report visual language without implying that
/// a local inspection report has a generated WhatsApp message.
class InsGarduReportCard extends StatelessWidget {
  final InsGarduHeader header;
  final String subTim;
  final int? total;
  final int? filled;
  final bool loading;
  final String? summaryError;
  final VoidCallback onTap;
  final VoidCallback onRetry;

  const InsGarduReportCard({
    super.key,
    required this.header,
    required this.subTim,
    required this.onTap,
    required this.onRetry,
    this.total,
    this.filled,
    this.loading = false,
    this.summaryError,
  });

  static String formatDate(String raw) {
    final d = DateTime.tryParse(raw);
    if (d == null) return raw;
    return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
  }

  String get statusLabel {
    switch (header.status.trim().toLowerCase()) {
      case 'tersinkron': return 'TERSINKRON';
      case 'mengirim': return 'MENGIRIM';
      case 'gagal': return 'GAGAL KIRIM';
      case 'draft': return 'DRAF LOKAL';
      default: return header.status.isEmpty ? 'STATUS BELUM ADA' : header.status.toUpperCase();
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = header.status.trim().toLowerCase();
    final color = status == 'gagal'
        ? AppColors.red600
        : status == 'tersinkron'
            ? AppColors.success700
            : status == 'mengirim'
                ? AppColors.cyan600
                : AppColors.amber700;
    final tint = status == 'gagal'
        ? const Color(0xFFFDEBEC)
        : status == 'tersinkron'
            ? const Color(0xFFECF8F1)
            : status == 'mengirim'
                ? const Color(0xFFE8F6FA)
                : const Color(0xFFFFF6D9);
    final summary = loading
        ? 'Memuat ringkasan gardu…'
        : summaryError != null
            ? 'Ringkasan gardu belum dapat dimuat'
            : total == 0
                ? 'Belum ada gardu dalam laporan'
                : '$filled dari $total gardu sudah diisi';
    final ratio = total != null && total! > 0 && filled != null
        ? (filled! / total!).clamp(0.0, 1.0).toDouble()
        : null;

    return Material(
      color: const Color(0xFFFCFDFF),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: AppColors.neutral200),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
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
                      color: const Color(0xFFE4F3FA),
                      borderRadius: BorderRadius.circular(13),
                    ),
                    child: const Icon(Icons.electrical_services_rounded,
                        color: AppColors.cyan600, size: 23),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          header.kodeHeader.isEmpty ? 'Laporan Lokal' : header.kodeHeader,
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: AppColors.navy900),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          [header.hari, formatDate(header.tanggal)].where((s) => s.isNotEmpty).join(', '),
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.neutral500),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
                    decoration: BoxDecoration(color: tint, borderRadius: BorderRadius.circular(20)),
                    child: Text(statusLabel, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: color)),
                  ),
                  if (header.ulp.isNotEmpty)
                    Text(header.ulp, style: const TextStyle(fontSize: 12, color: AppColors.neutral500)),
                ],
              ),
              const SizedBox(height: 16),
              Text(summary, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.navy900)),
              if (loading) ...[
                const SizedBox(height: 10),
                const LinearProgressIndicator(minHeight: 4, color: AppColors.cyan600),
              ] else if (summaryError == null && ratio != null) ...[
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: ratio,
                    minHeight: 5,
                    backgroundColor: const Color(0xFFE3EDF4),
                    color: AppColors.cyan600,
                    // Human-readable counts belong in the label. Leave the
                    // value to Flutter's numeric percentage semantics.
                    semanticsLabel: 'Gardu yang telah diisi tier: $filled dari $total',
                  ),
                ),
              ],
              const SizedBox(height: 10),
              Text('$subTim · Input: ${header.inputBy.isEmpty ? 'Belum tersedia' : header.inputBy}',
                  style: const TextStyle(fontSize: 12, color: AppColors.neutral500)),
              if (summaryError != null) ...[
                const SizedBox(height: 8),
                Text(summaryError!, style: const TextStyle(fontSize: 12, color: AppColors.red600)),
                TextButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh_rounded, size: 16), label: const Text('Muat ulang ringkasan')),
              ],
              if (header.pesanGagal.trim().isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(header.pesanGagal, style: const TextStyle(fontSize: 12, color: AppColors.red600)),
              ],
              const SizedBox(height: 14),
              const Divider(height: 1),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: onTap,
                  icon: const Icon(Icons.visibility_outlined, size: 17),
                  label: const Text('Detail Laporan'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.navy700,
                    minimumSize: const Size.fromHeight(44),
                    side: const BorderSide(color: AppColors.navy100),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
