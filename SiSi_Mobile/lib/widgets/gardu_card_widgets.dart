import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../db/app_database.dart';
import '../theme/app_colors.dart';

double garduPercent(String raw) {
  final value = double.tryParse(raw.replaceAll('%', '').replaceAll(',', '.').trim());
  if (value == null || value.isNaN || value.isInfinite) return 0;
  return value < 0 ? 0 : value;
}

Color garduLoadColor(double p) {
  if (p <= 25) return const Color(0xFF0284C7);
  if (p <= 50) return const Color(0xFF16A34A);
  if (p <= 80) return const Color(0xFFCA8A04);
  if (p <= 100) return const Color(0xFFEA580C);
  return const Color(0xFFDC2626);
}

String garduCategory(MasterGardu g) {
  if (g.kategoriBeban.trim().isNotEmpty) return g.kategoriBeban;
  final p = garduPercent(g.persentaseBeban);
  if (p <= 25) return 'Beban Rendah';
  if (p <= 50) return 'Beban Normal';
  if (p <= 80) return 'Waspada';
  if (p <= 100) return 'Tinggi';
  return 'Overload';
}

String _show(String v) => v.trim().isEmpty ? '-' : v.trim();

String _garduCoordinate(MasterGardu g) {
  final lat = g.latitude.trim();
  final lng = g.longitude.trim();
  if (lat.isEmpty && lng.isEmpty) return '-';
  return [lat, lng].where((value) => value.isNotEmpty).join(', ');
}

Future<void> _openGarduMaps(MasterGardu g) async {
  final lat = g.latitude.trim();
  final lng = g.longitude.trim();
  if (lat.isEmpty || lng.isEmpty) return;
  final uri = Uri.parse(
    'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent('$lat,$lng')}',
  );
  await launchUrl(uri, mode: LaunchMode.externalApplication);
}

class GarduLoadRing extends StatelessWidget {
  final String percentage;
  final double size;
  const GarduLoadRing({super.key, required this.percentage, this.size = 82});

  @override
  Widget build(BuildContext context) {
    final p = garduPercent(percentage);
    final color = garduLoadColor(p);
    return RepaintBoundary(
      child: SizedBox.square(
        dimension: size,
        child: CustomPaint(
          painter: _RingPainter(percent: p, color: color),
          child: Center(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Text(
                '${p.toStringAsFixed(p % 1 == 0 ? 0 : 1).replaceAll('.', ',')}%',
                style: TextStyle(
                  fontSize: size * .225,
                  height: 1,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF172554),
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
              SizedBox(height: size * .055),
              Text('BEBAN', style: TextStyle(
                fontSize: size * .085, letterSpacing: 1,
                fontWeight: FontWeight.w900, color: const Color(0xFF94A3B8))),
            ]),
          ),
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  final double percent; final Color color;
  const _RingPainter({required this.percent, required this.color});
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final stroke = math.max(7.0, size.shortestSide * .095);
    final radius = (size.shortestSide - stroke) / 2;
    final rect = Rect.fromCircle(center: center, radius: radius);
    final bg = Paint()..color = const Color(0xFFE8EDF5)..style = PaintingStyle.stroke
      ..strokeWidth = stroke..strokeCap = StrokeCap.round;
    final fg = Paint()..color = color..style = PaintingStyle.stroke
      ..strokeWidth = stroke..strokeCap = StrokeCap.round;
    canvas.drawCircle(center, radius, bg);
    canvas.drawArc(rect, -math.pi / 2,
      math.pi * 2 * (percent.clamp(0, 100) / 100), false, fg);
  }
  @override bool shouldRepaint(covariant _RingPainter old) =>
      old.percent != percent || old.color != color;
}

class GarduSummaryCard extends StatelessWidget {
  final MasterGardu gardu;
  final bool pending;
  final VoidCallback onTap;
  const GarduSummaryCard({super.key, required this.gardu, required this.pending, required this.onTap});

  @override Widget build(BuildContext context) {
    final color = garduLoadColor(garduPercent(gardu.persentaseBeban));
    return Material(
      color: const Color(0xFFFCFDFF), borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap, borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 14, 14),
          child: Column(children: [
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Expanded(child: Text(gardu.gardu, style: const TextStyle(
                    fontSize: 19, fontWeight: FontWeight.w900, color: Color(0xFF172554)))),
                  if (pending) const PendingGarduBadge(),
                ]),
                const SizedBox(height: 4),
                Text('${_show(gardu.merk)} · ${_show(gardu.kapasitasKva)} kVA',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF475569))),
                const SizedBox(height: 5),
                Text(_show(gardu.alamat), maxLines: 2, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12, height: 1.35, color: Color(0xFF7C879B))),
                const SizedBox(height: 7),
                InkWell(
                  onTap: gardu.latitude.trim().isNotEmpty && gardu.longitude.trim().isNotEmpty
                      ? () => _openGarduMaps(gardu)
                      : null,
                  borderRadius: BorderRadius.circular(8),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 3),
                    child: Row(children: [
                      const Icon(Icons.location_on_rounded, size: 14, color: AppColors.cyan600),
                      const SizedBox(width: 4),
                      Expanded(child: Text(
                        _garduCoordinate(gardu),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.cyan600),
                      )),
                      if (gardu.latitude.trim().isNotEmpty && gardu.longitude.trim().isNotEmpty)
                        const Icon(Icons.open_in_new_rounded, size: 12, color: AppColors.cyan600),
                    ]),
                  ),
                ),
                const SizedBox(height: 7),
                _Category(text: garduCategory(gardu), color: color),
              ])),
              const SizedBox(width: 14),
              GarduLoadRing(percentage: gardu.persentaseBeban),
            ]),
            const Padding(padding: EdgeInsets.symmetric(vertical: 13), child: Divider(height: 1, color: Color(0xFFE8ECF3))),
            Row(children: [
              Expanded(child: _Metric(label: 'BEBAN', value: '${_show(gardu.pembebananKva)} kVA')),
              Expanded(child: _Metric(label: 'DAYA', value: '${_show(gardu.pembebananKw)} kW')),
              Expanded(child: _Metric(label: 'ARUS MAX', value: '${_show(gardu.arusMaxPerFasa)} A')),
              const Icon(Icons.chevron_right_rounded, color: Color(0xFFA3ACBA)),
            ]),
          ]),
        ),
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  final String label, value; const _Metric({required this.label, required this.value});
  @override Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(label, style: const TextStyle(fontSize: 9, letterSpacing: .7, fontWeight: FontWeight.w900, color: Color(0xFF94A3B8))),
    const SizedBox(height: 2), Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF334155))),
  ]);
}

class _Category extends StatelessWidget {
  final String text; final Color color; const _Category({required this.text, required this.color});
  @override Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
    decoration: BoxDecoration(color: color.withOpacity(.12), borderRadius: BorderRadius.circular(20)),
    child: Text(text.toUpperCase(), style: TextStyle(fontSize: 9, letterSpacing: .5, fontWeight: FontWeight.w900, color: color)),
  );
}

class PendingGarduBadge extends StatelessWidget {
  const PendingGarduBadge({super.key});
  @override Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(20)),
    child: const Text('BELUM SINKRON', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: Color(0xFFB45309))),
  );
}

Future<void> showGarduDetailSheet(
  BuildContext context, MasterGardu g, {required bool pending, required VoidCallback onEdit}) {
  return showModalBottomSheet<void>(
    context: context, isScrollControlled: true, useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (sheetContext) => DraggableScrollableSheet(
      expand: false, initialChildSize: .92, minChildSize: .62, maxChildSize: .98,
      builder: (_, controller) => Material(
        color: const Color(0xFFF7F9FC),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        clipBehavior: Clip.antiAlias,
        child: Column(children: [
          Container(width: 42, height: 4, margin: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(8))),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 10, 12),
            child: Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(g.gardu, style: const TextStyle(fontSize: 25, height: 1.1, fontWeight: FontWeight.w900, color: Color(0xFF172554))),
                const SizedBox(height: 3), Text(g.ulp, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
              ])),
              if (pending) const PendingGarduBadge(),
              IconButton(onPressed: () => Navigator.pop(sheetContext), icon: const Icon(Icons.close_rounded)),
            ]),
          ),
          Expanded(
            child: ListView(controller: controller, padding: const EdgeInsets.fromLTRB(18, 4, 18, 24), children: [
              _LoadOverview(g: g),
              const SizedBox(height: 18),
              _DetailSection(
                title: 'Identitas',
                rows: [
                  ('ULP', g.ulp),
                  ('Gardu', g.gardu),
                  ('Alamat', g.alamat),
                  ('Koordinat', _garduCoordinate(g)),
                  ('Jenis Gardu', g.jenisGardu),
                  ('Kepemilikan', g.kepemilikan),
                ],
                coordinateTap: g.latitude.trim().isNotEmpty && g.longitude.trim().isNotEmpty
                    ? () => _openGarduMaps(g)
                    : null,
              ),
              _DetailSection(title: 'Data Trafo', rows: [
                ('Merk', g.merk), ('Kapasitas', '${_show(g.kapasitasKva)} kVA'),
                ('No. Seri', g.noSeri), ('Tahun Trafo', g.tahunTrafo), ('Type Seal', g.typeSeal)]),
              _DetailSection(title: 'Data PHB-TR', rows: [
                ('Merk PHB-TR', g.merkPhbTr), ('Nomor Seri', g.nomorSeriPhbTr), ('Tahun', g.tahunPhbTr)]),
              _DetailSection(title: 'Pengukuran', rows: [
                ('Jam Ukur WBP', g.jamUkurWbp), ('Tanggal', g.tanggalPengukuran)]),
              _ElectricalSection(title: 'WBP (17-21 WIB)', voltages: [g.wbpRs,g.wbpSt,g.wbpTr,g.wbpRn,g.wbpSn,g.wbpTn], currents: [g.wbpR,g.wbpS,g.wbpT,g.wbpN]),
              _ElectricalSection(title: 'LWBP', voltages: [g.lwbpRs,g.lwbpSt,g.lwbpTr,g.lwbpRn,g.lwbpSn,g.lwbpTn], currents: [g.lwbpR,g.lwbpS,g.lwbpT,g.lwbpN]),
            ]),
          ),
          // Footer struktural, tidak berada di Stack dan tidak menimpa ListView.
          SafeArea(top: false, child: Container(
            width: double.infinity, color: const Color(0xFFFCFDFF),
            padding: const EdgeInsets.fromLTRB(18, 12, 18, 14),
            child: SizedBox(height: 48, child: ElevatedButton.icon(
              onPressed: () { Navigator.pop(sheetContext); onEdit(); },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.navy700, foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(13))),
              icon: const Icon(Icons.edit_rounded),
              label: const Text('Edit Data Gardu', style: TextStyle(fontWeight: FontWeight.w900)),
            )),
          )),
        ]),
      ),
    ),
  );
}

class _LoadOverview extends StatelessWidget {
  final MasterGardu g; const _LoadOverview({required this.g});
  @override Widget build(BuildContext context) {
    final color = garduLoadColor(garduPercent(g.persentaseBeban));
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: const Color(0xFFFCFDFF), border: Border.all(color: const Color(0xFFE8ECF3)), borderRadius: BorderRadius.circular(18)),
      child: Row(children: [
        GarduLoadRing(percentage: g.persentaseBeban, size: 108),
        const SizedBox(width: 18),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _Category(text: garduCategory(g), color: color), const SizedBox(height: 10),
          _OverviewRow('Pembebanan', '${_show(g.pembebananKva)} kVA'),
          _OverviewRow('Daya aktif', '${_show(g.pembebananKw)} kW'),
          _OverviewRow('Arus max/fasa', '${_show(g.arusMaxPerFasa)} A'),
        ])),
      ]),
    );
  }
}

class _OverviewRow extends StatelessWidget {
  final String label, value; const _OverviewRow(this.label, this.value);
  @override Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 3),
    child: Row(children: [Expanded(child: Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)))), Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900))]),
  );
}

class _DetailSection extends StatelessWidget {
  final String title;
  final List<(String,String)> rows;
  final VoidCallback? coordinateTap;
  const _DetailSection({
    required this.title,
    required this.rows,
    this.coordinateTap,
  });
  @override Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 14), padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: const Color(0xFFFCFDFF), border: Border.all(color: const Color(0xFFE8ECF3)), borderRadius: BorderRadius.circular(18)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title.toUpperCase(), style: const TextStyle(fontSize: 10, letterSpacing: 1.2, fontWeight: FontWeight.w900, color: Color(0xFF0284C7))),
      const SizedBox(height: 9),
      ...rows.map((r) => Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(width: 118, child: Text(r.$1, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)))),
        Expanded(
          child: r.$1 == 'Koordinat' && coordinateTap != null
              ? InkWell(
                  onTap: coordinateTap,
                  child: Row(children: [
                    Flexible(child: Text(_show(r.$2), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.cyan600))),
                    const SizedBox(width: 4),
                    const Icon(Icons.open_in_new_rounded, size: 13, color: AppColors.cyan600),
                  ]),
                )
              : Text(_show(r.$2), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF1E293B))),
        ),
      ]))),
    ]),
  );
}

class _ElectricalSection extends StatelessWidget {
  final String title; final List<String> voltages, currents;
  const _ElectricalSection({required this.title, required this.voltages, required this.currents});
  @override Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 14), padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: const Color(0xFFFCFDFF), border: Border.all(color: const Color(0xFFE8ECF3)), borderRadius: BorderRadius.circular(18)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: const TextStyle(fontSize: 11, letterSpacing: 1, fontWeight: FontWeight.w900, color: Color(0xFF0284C7))),
      const SizedBox(height: 13), const Text('Tegangan (V)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
      const SizedBox(height: 8), _MeasureGrid(labels: const ['R-S','S-T','T-R','R-N','S-N','T-N'], values: voltages, columns: 3),
      const SizedBox(height: 14), const Text('Beban Arus Utama (A)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
      const SizedBox(height: 8), _MeasureGrid(labels: const ['R','S','T','N'], values: currents, columns: 4),
    ]),
  );
}

class _MeasureGrid extends StatelessWidget {
  final List<String> labels, values; final int columns;
  const _MeasureGrid({required this.labels, required this.values, required this.columns});
  @override Widget build(BuildContext context) => GridView.builder(
    shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), itemCount: labels.length,
    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: columns, mainAxisExtent: 55, crossAxisSpacing: 8, mainAxisSpacing: 8),
    itemBuilder: (_, i) => DecoratedBox(
      decoration: BoxDecoration(color: const Color(0xFFF3F6FA), borderRadius: BorderRadius.circular(10)),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Text(labels[i], style: const TextStyle(fontSize: 9, color: Color(0xFF64748B))),
        const SizedBox(height: 3), Text(_show(values[i]), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900)),
      ]),
    ),
  );
}
