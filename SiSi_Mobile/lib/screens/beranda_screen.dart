import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../services/jadwal_padam_service.dart';
import '../theme/app_colors.dart';
import 'gangguan_beranda_section.dart';
import 'kalender_jadwal_editor.dart';

class BerandaScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final VoidCallback? onOpenTim;
  final VoidCallback? onOpenPengukuran;
  final VoidCallback? onOpenTeknik;
  const BerandaScreen({super.key, required this.sesi, this.onOpenTim, this.onOpenPengukuran, this.onOpenTeknik});
  @override
  State<BerandaScreen> createState() => _BerandaScreenState();
}

class _BerandaScreenState extends State<BerandaScreen> {
  late DateTime _month;
  late DateTime _selected;
  List<Map<String, dynamic>> _events = [];
  bool _loading = true;
  bool _editing = false;
  String? _error;
  int _request = 0;
  String get _token => '${widget.sesi['token'] ?? ''}';
  String _key(DateTime value) => DateFormat('yyyy-MM-dd').format(value);
  bool get _bolehEdit => KalenderJadwalEditor.boleh(widget.sesi);

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _month = DateTime(now.year, now.month);
    _selected = DateTime(now.year, now.month, now.day);
    _load();
  }

  Future<void> _load() async {
    if (!mounted) return;
    final request = ++_request;
    setState(() { _loading = true; _error = null; });
    try {
      final result = await JadwalPadamService.calendar(token: _token, year: _month.year, month: _month.month);
      if (result['ok'] != true) throw Exception(result['message'] ?? 'Kalender kerja tidak tersedia');
      if (!mounted || request != _request) return;
      setState(() {
        _events = List<dynamic>.from(result['rows'] ?? []).whereType<Map>().map((r) => Map<String, dynamic>.from(r)).toList();
        _loading = false;
      });
    } catch (error) {
      if (!mounted || request != _request) return;
      setState(() { _loading = false; _events = []; _error = '$error'.replaceFirst('Exception: ', ''); });
    }
  }

  List<Map<String, dynamic>> get _selectedEvents => _events.where((r) => '${r['tanggal'] ?? ''}' == _key(_selected)).toList();

  Future<void> _changeMonth(int delta) async {
    if (_loading || _editing) return;
    setState(() {
      _month = DateTime(_month.year, _month.month + delta);
      _selected = DateTime(_month.year, _month.month, 1);
      _events = [];
    });
    await _load();
  }

  Future<void> _editAgenda(Map<String, dynamic> item) async {
    if (!_bolehEdit || _editing || _loading) return;
    if ('${item['kode'] ?? ''}'.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Kode jadwal tidak tersedia. Muat ulang kalender.')));
      return;
    }
    setState(() => _editing = true);
    try {
      final savedDate = await Navigator.push<DateTime>(context, MaterialPageRoute(
        builder: (_) => KalenderJadwalEditor(sesi: widget.sesi, row: Map<String, dynamic>.from(item)),
      ));
      if (!mounted || savedDate == null) return;
      setState(() {
        _selected = savedDate;
        _month = DateTime(savedDate.year, savedDate.month);
      });
      await _load();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(
        _error == null ? 'Jadwal diperbarui.' : 'Jadwal tersimpan, tetapi kalender gagal dimuat ulang. Tekan muat ulang.',
      )));
    } finally {
      if (mounted) setState(() => _editing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = '${widget.sesi['username'] ?? 'User'}';
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FB),
      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text('Beranda', style: TextStyle(fontWeight: FontWeight.w900)),
        actions: [IconButton(tooltip: 'Muat ulang kalender', onPressed: _loading || _editing ? null : _load, icon: const Icon(Icons.refresh_rounded))],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 112),
          children: [
            _profile(name),
            const SizedBox(height: 24),
            _sectionHeading('Akses cepat', 'sesuai role'),
            const SizedBox(height: 10),
            _quickActions(),
            const SizedBox(height: 28),
            GangguanBerandaSection(sesi: widget.sesi),
            const SizedBox(height: 30),
            Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Kalender kerja', style: TextStyle(color: AppColors.navy900, fontSize: 20, fontWeight: FontWeight.w900)),
                const SizedBox(height: 3),
                Text(_bolehEdit ? 'Pilih tanggal, lalu ketuk agenda untuk mengedit.' : 'Jadwal pekerjaan dan dampak pelanggan.', style: const TextStyle(color: Color(0xFF667085), fontSize: 12)),
              ])),
              _monthButton(Icons.chevron_left_rounded, () => _changeMonth(-1)),
              const SizedBox(width: 6),
              _monthButton(Icons.chevron_right_rounded, () => _changeMonth(1)),
            ]),
            const SizedBox(height: 12),
            _calendar(),
            const SizedBox(height: 22),
            Row(children: [
              Expanded(child: Text(DateFormat('dd MMMM yyyy', 'id_ID').format(_selected), style: const TextStyle(color: AppColors.navy900, fontSize: 16, fontWeight: FontWeight.w900))),
              Text('${_selectedEvents.length} pekerjaan', style: const TextStyle(color: Color(0xFF667085), fontSize: 12, fontWeight: FontWeight.w700)),
            ]),
            const SizedBox(height: 10),
            if (_loading) const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()))
            else if (_error != null) ...[
              _state(Icons.cloud_off_rounded, 'Kalender belum termuat', _error!),
              TextButton(onPressed: _load, child: const Text('Coba lagi')),
            ]
            else if (_selectedEvents.isEmpty) _state(Icons.event_available_rounded, 'Tidak ada pekerjaan', 'Pilih tanggal bertanda untuk melihat agenda.')
            else ..._selectedEvents.map(_agenda),
          ],
        ),
      ),
    );
  }

  Widget _profile(String name) {
    final now = DateTime.now();
    final greeting = now.hour < 11 ? 'Selamat pagi' : now.hour < 15 ? 'Selamat siang' : now.hour < 18 ? 'Selamat sore' : 'Selamat malam';
    return Container(
      width: double.infinity, padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: AppColors.navy700, borderRadius: BorderRadius.circular(24)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(DateFormat('EEEE, d MMMM', 'id_ID').format(now).toUpperCase(), style: const TextStyle(color: AppColors.amber600, fontSize: 10, letterSpacing: 1, fontWeight: FontWeight.w900)),
        const SizedBox(height: 8),
        Text('$greeting, $name.', style: const TextStyle(color: Colors.white, fontSize: 25, height: 1.12, fontWeight: FontWeight.w900)),
        const SizedBox(height: 8),
        const Text('Agenda, laporan, verifikasi, dan gangguan dirangkum di sini.', style: TextStyle(color: Color(0xFFC8D8E3), fontSize: 12, height: 1.45)),
        const SizedBox(height: 16),
        Wrap(spacing: 8, runSpacing: 8, children: [
          _heroChip(Icons.badge_outlined, '${widget.sesi['role'] ?? '-'}'),
          _heroChip(Icons.groups_outlined, '${widget.sesi['subTim'] ?? widget.sesi['tim'] ?? '-'}'),
        ]),
      ]),
    );
  }

  Widget _heroChip(IconData icon, String label) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
    decoration: BoxDecoration(color: const Color(0xFF315E73), borderRadius: BorderRadius.circular(999)),
    child: Row(mainAxisSize: MainAxisSize.min, children: [Icon(icon, size: 9, color: AppColors.amber600), const SizedBox(width: 5), Text(label, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800))]),
  );

  Widget _sectionHeading(String title, String meta) => Row(children: [
    Expanded(child: Text(title, style: const TextStyle(color: AppColors.navy900, fontSize: 18, fontWeight: FontWeight.w900))),
    Text(meta, style: const TextStyle(color: Color(0xFF667085), fontSize: 10)),
  ]);

  Widget _quickActions() {
    final actions = <Map<String, dynamic>>[
      if (widget.onOpenTim != null) {'title': 'Pekerjaan tim', 'subtitle': 'Laporan dan aktivitas', 'icon': Icons.assignment_outlined, 'action': widget.onOpenTim},
      if (widget.onOpenPengukuran != null) {'title': 'Pengukuran', 'subtitle': 'Gardu dan hasil ukur', 'icon': Icons.electrical_services_outlined, 'action': widget.onOpenPengukuran},
      if (widget.onOpenTeknik != null) {'title': 'Kontrol teknik', 'subtitle': 'Jadwal dan verifikasi', 'icon': Icons.verified_outlined, 'action': widget.onOpenTeknik},
    ];
    return GridView.builder(
      shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), itemCount: actions.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, crossAxisSpacing: 10, mainAxisSpacing: 10, mainAxisExtent: 140),
      itemBuilder: (_, index) {
        final item = actions[index];
        return Material(color: Colors.white, borderRadius: BorderRadius.circular(18), child: InkWell(
          onTap: item['action'] as VoidCallback?, borderRadius: BorderRadius.circular(18),
          child: Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(borderRadius: BorderRadius.circular(18), border: Border.all(color: const Color(0xFFDDE3EC))),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Container(width: 36, height: 36, decoration: BoxDecoration(color: const Color(0xFFE8F3F7), borderRadius: BorderRadius.circular(11)), child: Icon(item['icon'] as IconData, size: 19, color: AppColors.navy700)),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(item['title'] as String, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: AppColors.navy900)),
                Text(item['subtitle'] as String, style: const TextStyle(fontSize: 9, color: Color(0xFF667085))),
              ]),
            ])),
        ));
      },
    );
  }

  Widget _monthButton(IconData icon, VoidCallback action) => SizedBox.square(dimension: 40, child: OutlinedButton(
    onPressed: _loading || _editing ? null : action,
    style: OutlinedButton.styleFrom(padding: EdgeInsets.zero, foregroundColor: AppColors.navy700, side: const BorderSide(color: Color(0xFFDDE3EC)), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))), child: Icon(icon)));

  Widget _calendar() {
    final first = DateTime(_month.year, _month.month, 1);
    final days = DateTime(_month.year, _month.month + 1, 0).day;
    final offset = first.weekday % 7;
    final eventDates = _events.map((item) => '${item['tanggal']}').toSet();
    const weekdays = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];
    return Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(22), border: Border.all(color: const Color(0xFFDDE3EC))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(DateFormat('MMMM yyyy', 'id_ID').format(_month), style: const TextStyle(color: AppColors.navy900, fontSize: 15, fontWeight: FontWeight.w900)),
        const SizedBox(height: 13),
        Row(children: weekdays.map((day) => Expanded(child: Center(child: Text(day, style: const TextStyle(color: Color(0xFF98A2B3), fontSize: 9, fontWeight: FontWeight.w900))))).toList()),
        const SizedBox(height: 8),
        GridView.builder(shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), itemCount: offset + days,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 7, mainAxisExtent: 48),
          itemBuilder: (_, index) {
            if (index < offset) return const SizedBox();
            final day = index - offset + 1;
            final date = DateTime(_month.year, _month.month, day);
            final selected = _key(date) == _key(_selected);
            final today = _key(date) == _key(DateTime.now());
            return InkWell(onTap: () => setState(() => _selected = date), borderRadius: BorderRadius.circular(13),
              child: Container(margin: const EdgeInsets.all(2), decoration: BoxDecoration(color: selected ? AppColors.navy700 : Colors.transparent, borderRadius: BorderRadius.circular(13), border: today && !selected ? Border.all(color: AppColors.navy700, width: 1.4) : null),
                child: Stack(alignment: Alignment.center, children: [
                  Text('$day', style: TextStyle(color: selected ? Colors.white : AppColors.navy900, fontSize: 12, fontWeight: FontWeight.w800)),
                  if (eventDates.contains(_key(date))) Positioned(bottom: 5, child: Container(width: 5, height: 5, decoration: BoxDecoration(color: selected ? AppColors.cyan600 : AppColors.navy700, shape: BoxShape.circle))),
                ])),
            );
          }),
        const SizedBox(height: 10),
        const Text('Titik menandakan tanggal dengan jadwal.', style: TextStyle(color: Color(0xFF667085), fontSize: 11)),
      ]));
  }

  Widget _agenda(Map<String, dynamic> item) {
    final status = '${item['status'] ?? 'Terjadwal'}';
    final color = status == 'Terealisasi' ? AppColors.success700 : status.toLowerCase().contains('batal') ? AppColors.red600 : AppColors.navy700;
    return Padding(padding: const EdgeInsets.only(bottom: 10), child: Material(
      color: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(17), side: const BorderSide(color: Color(0xFFDDE3EC))),
      child: InkWell(onTap: _bolehEdit && !_editing ? () => _editAgenda(item) : null, borderRadius: BorderRadius.circular(17),
        child: Padding(padding: const EdgeInsets.all(14), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text('${item['jamPadam'] ?? '--:--'} - ${item['jamNyala'] ?? '--:--'} WIB', style: const TextStyle(color: AppColors.navy700, fontSize: 12, fontWeight: FontWeight.w900))),
            Text(status, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w800)),
          ]),
          const SizedBox(height: 8),
          Text('${item['jenis'] ?? 'Pekerjaan Teknik'}', style: const TextStyle(color: AppColors.navy900, fontSize: 14, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text('${item['penyulang'] ?? '-'} · ${item['section'] ?? '-'}', style: const TextStyle(color: Color(0xFF667085), fontSize: 12)),
          Text('${item['jumlahPelanggan'] ?? 0} pelanggan', style: const TextStyle(color: Color(0xFF667085), fontSize: 11)),
          if (_bolehEdit) Align(alignment: Alignment.centerRight, child: TextButton.icon(
            onPressed: _editing ? null : () => _editAgenda(item), icon: const Icon(Icons.edit_outlined, size: 18), label: const Text('Edit jadwal'))),
        ])),
      ),
    ));
  }

  Widget _state(IconData icon, String title, String message) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 30),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(17), border: Border.all(color: const Color(0xFFDDE3EC))),
    child: Column(children: [Icon(icon, color: const Color(0xFF98A2B3), size: 38), const SizedBox(height: 10), Text(title, style: const TextStyle(color: AppColors.navy900, fontWeight: FontWeight.w900)), const SizedBox(height: 4), Text(message, textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFF667085), fontSize: 12))]),
  );
}
