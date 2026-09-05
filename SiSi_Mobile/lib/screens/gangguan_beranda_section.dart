import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../services/gangguan_beranda_service.dart';
import '../theme/app_colors.dart';

class GangguanBerandaSection extends StatefulWidget {
  final Map<String, dynamic> sesi;

  const GangguanBerandaSection({super.key, required this.sesi});

  @override
  State<GangguanBerandaSection> createState() =>
      _GangguanBerandaSectionState();
}

class _GangguanBerandaSectionState extends State<GangguanBerandaSection> {
  late DateTime from;
  late DateTime to;
  bool loading = true;
  String? error;
  List<Map<String, dynamic>> sets = [];
  int active = 0;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    from = DateTime(now.year, now.month, 1);
    to = now;
    load();
  }

  String iso(DateTime date) => DateFormat('yyyy-MM-dd').format(date);

  Future<void> load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final response = await GangguanBerandaService.load(
        token: '${widget.sesi['token'] ?? ''}',
        from: iso(from),
        to: iso(to),
        ulp: '${widget.sesi['ulp'] ?? ''}',
      );
      if (!mounted) return;
      if (response['ok'] != true) {
        throw Exception(response['message'] ?? 'Gagal memuat data');
      }
      setState(() {
        sets = List<dynamic>.from(response['datasets'] ?? const [])
            .map((item) => Map<String, dynamic>.from(item as Map))
            .toList();
        loading = false;
        if (active >= sets.length) active = 0;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        loading = false;
        error = '$e'.replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> pick() async {
    final range = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 1)),
      initialDateRange: DateTimeRange(start: from, end: to),
      helpText: 'Rentang data gangguan',
    );
    if (range == null) return;
    from = range.start;
    to = range.end;
    load();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'Data gangguan',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  color: AppColors.navy900,
                ),
              ),
            ),
            OutlinedButton.icon(
              onPressed: pick,
              icon: const Icon(Icons.date_range_rounded, size: 17),
              label: Text(
                '${DateFormat('dd MMM').format(from)} - '
                '${DateFormat('dd MMM').format(to)}',
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (loading)
          const _ChartSkeleton()
        else if (error != null)
          _errorState()
        else if (sets.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 30),
            child: Center(child: Text('Tidak ada dataset gangguan.')),
          )
        else ...[
          _tabs(),
          const SizedBox(height: 12),
          _chart(),
        ],
      ],
    );
  }

  Widget _tabs() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: List.generate(sets.length, (index) {
          final selected = index == active;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              selected: selected,
              label: Text(
                '${sets[index]['title']} (${sets[index]['total'] ?? 0})',
              ),
              onSelected: (_) => setState(() => active = index),
            ),
          );
        }),
      ),
    );
  }

  Widget _chart() {
    final dataset = sets[active];
    final points = List<dynamic>.from(dataset['series'] ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
    if (points.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 30),
        child: Center(child: Text('Tidak ada data pada rentang ini.')),
      );
    }

    final maxCount = points.fold<int>(1, (current, item) {
      final count = (item['count'] as num?)?.toInt() ?? 0;
      return count > current ? count : current;
    });
    final colors = [
      AppColors.brand600,
      AppColors.amber600,
      AppColors.success600,
    ];

    return Container(
      height: 220,
      padding: const EdgeInsets.fromLTRB(12, 18, 12, 10),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.neutral200),
      ),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: points.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, index) {
          final point = points[index];
          final count = (point['count'] as num?)?.toInt() ?? 0;
          final height = 150.0 * count / maxCount;
          final date = '${point['date'] ?? ''}';
          final dayLabel = date.length >= 10 ? date.substring(8, 10) : date;
          return InkWell(
            onTap: date.isEmpty ? null : () => detail(dataset, date),
            borderRadius: BorderRadius.circular(10),
            child: SizedBox(
              width: 42,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text(
                    '$count',
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    height: height,
                    width: 24,
                    decoration: BoxDecoration(
                      color: colors[active % colors.length],
                      borderRadius: BorderRadius.circular(7),
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    dayLabel,
                    style: const TextStyle(
                      fontSize: 9,
                      color: AppColors.neutral500,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  void detail(Map<String, dynamic> dataset, String date) {
    final rows = List<dynamic>.from(dataset['details'] ?? const [])
        .where((item) => item is Map && '${item['date']}' == date)
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: .78,
        maxChildSize: .95,
        builder: (_, controller) => ListView(
          controller: controller,
          padding: const EdgeInsets.all(20),
          children: [
            Text(
              '${dataset['title']}',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
            ),
            Text(
              DateFormat('dd MMMM yyyy', 'id_ID').format(DateTime.parse(date)),
              style: const TextStyle(color: AppColors.neutral500),
            ),
            const SizedBox(height: 16),
            ...rows.map(_detailRow),
          ],
        ),
      ),
    );
  }

  Widget _detailRow(Map<String, dynamic> row) {
    final title =
        '${row['Penyulang'] ?? row['PENYULANG'] ?? row['Penyulang_Fix'] ?? '-'}';
    final subtitle =
        '${row['Nama PMT/OG/LBS/ACR'] ?? row['Nama PMT/OG/ACR'] ?? row['RECLOSER'] ?? ''}';
    const skipped = {
      'date',
      'Penyulang',
      'PENYULANG',
      'Penyulang_Fix',
      'Nama PMT/OG/LBS/ACR',
      'Nama PMT/OG/ACR',
      'RECLOSER',
    };
    return ExpansionTile(
      tilePadding: EdgeInsets.zero,
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
      subtitle: subtitle.isEmpty ? null : Text(subtitle),
      children: row.entries
          .where((entry) =>
              !skipped.contains(entry.key) && '${entry.value}'.isNotEmpty)
          .map(
            (entry) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 125,
                    child: Text(
                      entry.key,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.neutral500,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      '${entry.value}',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          )
          .toList(),
    );
  }

  Widget _errorState() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.red100,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          const Icon(Icons.cloud_off_rounded, color: AppColors.red600),
          const SizedBox(width: 10),
          Expanded(child: Text(error!)),
          TextButton(onPressed: load, child: const Text('Coba lagi')),
        ],
      ),
    );
  }
}

class _ChartSkeleton extends StatelessWidget {
  const _ChartSkeleton();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 220,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.neutral200),
      ),
      child: const Center(child: CircularProgressIndicator()),
    );
  }
}
