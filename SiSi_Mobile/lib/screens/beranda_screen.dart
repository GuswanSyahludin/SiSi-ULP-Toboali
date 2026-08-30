import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../services/jadwal_padam_service.dart';
import '../theme/app_colors.dart';

class BerandaScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  const BerandaScreen({super.key, required this.sesi});

  @override
  State<BerandaScreen> createState() => _BerandaScreenState();
}

class _BerandaScreenState extends State<BerandaScreen> {
  late DateTime _month;
  late DateTime _selected;
  List<Map<String, dynamic>> _events = [];
  bool _loading = true;
  String? _error;

  String get _token => '${widget.sesi['token'] ?? ''}';
  String _key(DateTime value) => DateFormat('yyyy-MM-dd').format(value);

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _month = DateTime(now.year, now.month);
    _selected = DateTime(now.year, now.month, now.day);
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await JadwalPadamService.calendar(
        token: _token,
        year: _month.year,
        month: _month.month,
      );
      if (result['ok'] != true) {
        throw Exception(result['message'] ?? 'Kalender kerja tidak tersedia');
      }
      if (!mounted) return;
      setState(() {
        _events = List.from(result['rows'] ?? const [])
            .map((item) => Map<String, dynamic>.from(item as Map))
            .toList();
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = '$error'.replaceFirst('Exception: ', '');
      });
    }
  }

  List<Map<String, dynamic>> get _selectedEvents => _events
      .where((item) => '${item['tanggal'] ?? ''}' == _key(_selected))
      .toList();

  Future<void> _changeMonth(int delta) async {
    setState(() {
      _month = DateTime(_month.year, _month.month + delta);
      _selected = DateTime(_month.year, _month.month, 1);
    });
    await _load();
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
        title: const Text(
          'Beranda',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        actions: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              IconButton(
                tooltip: 'Notifikasi',
                onPressed: () {},
                icon: const Icon(Icons.notifications_outlined),
              ),
              Positioned(
                right: 7,
                top: 7,
                child: IgnorePointer(
                  child: Container(
                    width: 16,
                    height: 16,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: AppColors.red600,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.navy700, width: 2),
                    ),
                    child: const Text(
                      '0',
                      style: TextStyle(fontSize: 8, fontWeight: FontWeight.w900),
                    ),
                  ),
                ),
              ),
              IconButton(
                tooltip: 'Muat ulang',
                onPressed: _loading ? null : _load,
                icon: const Icon(Icons.refresh_rounded),
              ),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 112),
          children: [
            _profile(name),
            const SizedBox(height: 26),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Kalender kerja', style: TextStyle(color: AppColors.navy900, fontSize: 20, fontWeight: FontWeight.w900)),
                      SizedBox(height: 3),
                      Text('Jadwal pekerjaan dan dampak pelanggan.', style: TextStyle(color: Color(0xFF667085), fontSize: 12)),
                    ],
                  ),
                ),
                _monthButton(Icons.chevron_left_rounded, () => _changeMonth(-1)),
                const SizedBox(width: 6),
                _monthButton(Icons.chevron_right_rounded, () => _changeMonth(1)),
              ],
            ),
            const SizedBox(height: 12),
            _calendar(),
            const SizedBox(height: 22),
            Row(
              children: [
                Expanded(child: Text(DateFormat('dd MMMM yyyy', 'id_ID').format(_selected), style: const TextStyle(color: AppColors.navy900, fontSize: 16, fontWeight: FontWeight.w900))),
                Text('${_selectedEvents.length} pekerjaan', style: const TextStyle(color: Color(0xFF667085), fontSize: 12, fontWeight: FontWeight.w700)),
              ],
            ),
            const SizedBox(height: 10),
            if (_loading) ...List.generate(3, (_) => const _AgendaSkeleton())
            else if (_error != null) _state(Icons.cloud_off_rounded, 'Kalender belum termuat', _error!)
            else if (_selectedEvents.isEmpty) _state(Icons.event_available_rounded, 'Tidak ada pekerjaan', 'Pilih tanggal bertanda untuk melihat agenda.')
            else ..._selectedEvents.map(_agenda),
          ],
        ),
      ),
    );
  }

  Widget _profile(String name) {
    final initials = name.split(RegExp(r'\s+')).where((part) => part.isNotEmpty).take(2).map((part) => part[0].toUpperCase()).join();
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(22), border: Border.all(color: const Color(0xFFDDE3EC)), boxShadow: const [BoxShadow(color: Color(0x0D172554), blurRadius: 24, offset: Offset(0, 10))]),
      child: Column(children: [
        Row(children: [
          Container(width: 54, height: 54, alignment: Alignment.center, decoration: BoxDecoration(color: const Color(0xFFE0F2FE), borderRadius: BorderRadius.circular(17)), child: Text(initials.isEmpty ? 'S' : initials, style: const TextStyle(color: AppColors.navy700, fontSize: 18, fontWeight: FontWeight.w900))),
          const SizedBox(width: 13),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Selamat datang, $name', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.navy900, fontSize: 18, height: 1.2, fontWeight: FontWeight.w900)),
            const SizedBox(height: 5),
            const Text('Semangat pagi, pekerjaan hari ini sudah disiapkan.', style: TextStyle(color: Color(0xFF667085), fontSize: 12)),
          ])),
          const Column(children: [Icon(Icons.circle, size: 8, color: AppColors.success700), SizedBox(height: 3), Text('Online', style: TextStyle(color: AppColors.success700, fontSize: 10, fontWeight: FontWeight.w800))]),
        ]),
        const SizedBox(height: 16),
        const Divider(height: 1, color: Color(0xFFE4E9F0)),
        const SizedBox(height: 14),
        Row(children: [_fact('Role', '${widget.sesi['role'] ?? '-'}'), _divider(), _fact('Unit', '${widget.sesi['ulp'] ?? '-'}'), _divider(), _fact('Tim', '${widget.sesi['subTim'] ?? widget.sesi['tim'] ?? '-'}')]),
      ]),
    );
  }

  Widget _fact(String label, String value) => Expanded(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 8), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label.toUpperCase(), style: const TextStyle(color: Color(0xFF98A2B3), fontSize: 9, letterSpacing: .8, fontWeight: FontWeight.w900)), const SizedBox(height: 4), Text(value, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.navy900, fontSize: 11, fontWeight: FontWeight.w800))])));
  Widget _divider() => Container(width: 1, height: 34, color: const Color(0xFFE4E9F0));
  Widget _monthButton(IconData icon, VoidCallback action) => SizedBox.square(dimension: 40, child: OutlinedButton(onPressed: _loading ? null : action, style: OutlinedButton.styleFrom(padding: EdgeInsets.zero, foregroundColor: AppColors.navy700, side: const BorderSide(color: Color(0xFFDDE3EC)), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))), child: Icon(icon)));

  Widget _calendar() {
    final first = DateTime(_month.year, _month.month, 1);
    final days = DateTime(_month.year, _month.month + 1, 0).day;
    final offset = first.weekday % 7;
    final eventDates = _events.map((item) => '${item['tanggal']}').toSet();
    const weekday = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];
    return Container(padding: const EdgeInsets.fromLTRB(14, 16, 14, 14), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(22), border: Border.all(color: const Color(0xFFDDE3EC))), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(DateFormat('MMMM yyyy', 'id_ID').format(_month), style: const TextStyle(color: AppColors.navy900, fontSize: 15, fontWeight: FontWeight.w900)),
      const SizedBox(height: 13),
      GridView.count(shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), crossAxisCount: 7, childAspectRatio: 1.2, children: weekday.map((day) => Center(child: Text(day, style: const TextStyle(color: Color(0xFF98A2B3), fontSize: 9, letterSpacing: .7, fontWeight: FontWeight.w900)))).toList()),
      GridView.builder(shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), itemCount: offset + days, gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 7, childAspectRatio: 1), itemBuilder: (_, index) { if (index < offset) return const SizedBox(); final day = index - offset + 1; final date = DateTime(_month.year, _month.month, day); final selected = _key(date) == _key(_selected); final today = _key(date) == _key(DateTime.now()); final hasEvent = eventDates.contains(_key(date)); return InkWell(onTap: () => setState(() => _selected = date), borderRadius: BorderRadius.circular(13), child: Container(margin: const EdgeInsets.all(2), decoration: BoxDecoration(color: selected ? AppColors.navy700 : Colors.transparent, borderRadius: BorderRadius.circular(13), border: today && !selected ? Border.all(color: AppColors.navy700, width: 1.4) : null), child: Stack(alignment: Alignment.center, children: [Text('$day', style: TextStyle(color: selected ? Colors.white : AppColors.navy900, fontSize: 12, fontWeight: FontWeight.w800)), if (hasEvent) Positioned(bottom: 5, child: Container(width: 5, height: 5, decoration: BoxDecoration(color: selected ? AppColors.cyan600 : AppColors.navy700, shape: BoxShape.circle)))]))); }),
      const SizedBox(height: 10), const Divider(height: 1, color: Color(0xFFE4E9F0)), const SizedBox(height: 11), const Row(children: [_Legend(color: AppColors.navy700, label: 'Jadwal Padam'), SizedBox(width: 14), _Legend(color: AppColors.amber700, label: 'Pekerjaan'), SizedBox(width: 14), _Legend(color: AppColors.success700, label: 'Selesai')]),
    ]));
  }

  Widget _agenda(Map<String, dynamic> item) { final status = '${item['status'] ?? 'Terjadwal'}'; final color = status == 'Terealisasi' ? AppColors.success700 : status.toLowerCase().contains('batal') ? AppColors.red600 : AppColors.navy700; return Container(margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(17), border: Border.all(color: const Color(0xFFDDE3EC))), child: Row(children: [SizedBox(width: 48, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('${item['jamPadam'] ?? '--:--'}', style: const TextStyle(color: AppColors.navy700, fontSize: 12, fontWeight: FontWeight.w900)), const Text('WIB', style: TextStyle(color: Color(0xFF98A2B3), fontSize: 9))])), const SizedBox(width: 8), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('${item['jenis'] ?? 'Pekerjaan Teknik'}', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.navy900, fontSize: 13, height: 1.25, fontWeight: FontWeight.w900)), const SizedBox(height: 4), Text('${item['penyulang'] ?? '-'} • ${item['section'] ?? '-'} • ${item['jumlahPelanggan'] ?? 0} pelanggan', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Color(0xFF667085), fontSize: 10))])), const SizedBox(width: 8), Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5), decoration: BoxDecoration(color: color.withOpacity(.1), borderRadius: BorderRadius.circular(20)), child: Text(status, style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.w900)))])); }
  Widget _state(IconData icon, String title, String message) => Container(padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 30), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(17), border: Border.all(color: const Color(0xFFDDE3EC))), child: Column(children: [Icon(icon, color: const Color(0xFF98A2B3), size: 38), const SizedBox(height: 10), Text(title, style: const TextStyle(color: AppColors.navy900, fontWeight: FontWeight.w900)), const SizedBox(height: 4), Text(message, textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFF667085), fontSize: 12))]));
}
class _Legend extends StatelessWidget { final Color color; final String label; const _Legend({required this.color, required this.label}); @override Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: [Container(width: 7, height: 7, decoration: BoxDecoration(color: color, shape: BoxShape.circle)), const SizedBox(width: 5), Text(label, style: const TextStyle(color: Color(0xFF667085), fontSize: 9))]); }
class _AgendaSkeleton extends StatelessWidget { const _AgendaSkeleton(); @override Widget build(BuildContext context) => Container(height: 76, margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(17), border: Border.all(color: const Color(0xFFE4E9F0))), child: Row(children: [Container(width: 42, height: 12, color: const Color(0xFFE7ECF2)), const SizedBox(width: 14), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Container(width: 180, height: 12, color: const Color(0xFFE7ECF2)), const SizedBox(height: 10), Container(width: 230, height: 9, color: const Color(0xFFF0F3F7))]))])); }
