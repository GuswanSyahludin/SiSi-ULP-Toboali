import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/jadwal_padam_service.dart';
import '../theme/app_colors.dart';

class JadwalPadamScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final VoidCallback? onBack;
  const JadwalPadamScreen({super.key, required this.sesi, this.onBack});

  @override
  State<JadwalPadamScreen> createState() => _JadwalPadamScreenState();
}

class _JadwalPadamScreenState extends State<JadwalPadamScreen> {
  late DateTime _from;
  late DateTime _to;
  List<Map<String, dynamic>> _master = [];
  List<Map<String, dynamic>> _rows = [];
  String _penyulang = '';
  String _status = '';
  String _workStatus = '';
  bool _loading = true;
  bool _sendingWa = false;
  String? _error;
  int _loadRevision = 0;

  String get _token => '${widget.sesi['token'] ?? ''}';
  String _iso(DateTime d) => DateFormat('yyyy-MM-dd').format(d);

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _from = DateTime(now.year, now.month, 1);
    _to = DateTime(now.year, now.month + 1, 0);
    _boot();
  }

  Future<void> _boot() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final master = await JadwalPadamService.master(token: _token);
      if (master['ok'] != true) {
        throw Exception(master['message'] ?? 'Master tidak tersedia');
      }
      if (!mounted) {
        return;
      }
      _master = List.from(master['rows'] ?? const [])
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
      await _load();
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = '$e'.replaceFirst('Exception: ', '');
        });
      }
    }
  }

  Future<void> _load() async {
    final revision = ++_loadRevision;
    if (!mounted) {
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await JadwalPadamService.list(
        token: _token,
        tglDari: _iso(_from),
        tglSampai: _iso(_to),
        penyulang: _penyulang,
        status: _status,
        statusPekerjaan: _workStatus,
      );
      if (result['ok'] != true) {
        throw Exception(result['message'] ?? 'Gagal memuat jadwal');
      }
      if (!mounted || revision != _loadRevision) {
        return;
      }
      setState(() {
        _rows = List.from(result['rows'] ?? const [])
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
        _loading = false;
      });
    } catch (e) {
      if (mounted && revision == _loadRevision) {
        setState(() {
          _loading = false;
          _error = '$e'.replaceFirst('Exception: ', '');
        });
      }
    }
  }

  List<String> get _penyulangOptions {
    final values = _master
        .map((e) => '${e['penyulang'] ?? ''}'.trim())
        .where((e) => e.isNotEmpty)
        .toSet()
        .toList();
    values.sort();
    return values;
  }

  Future<void> _pickRange() async {
    final range = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2024),
      lastDate: DateTime(2100),
      initialDateRange: DateTimeRange(start: _from, end: _to),
      helpText: 'Pilih periode jadwal',
    );
    if (range == null) return;
    if (!mounted) return;
    setState(() {
      _from = range.start;
      _to = range.end;
    });
    _load();
  }

  @override
  void dispose() {
    _loadRevision++;
    super.dispose();
  }

  Future<void> _sendWa() async {
    setState(() => _sendingWa = true);
    try {
      final result = await JadwalPadamService.waText(
        token: _token,
        tglDari: _iso(_from),
        tglSampai: _iso(_to),
        penyulang: _penyulang,
        status: _status,
      );
      if (result['ok'] != true)
        throw Exception(result['message'] ?? 'Laporan WA tidak tersedia');
      final uri = Uri.parse(
          'https://wa.me/?text=${Uri.encodeComponent('${result['text'] ?? ''}')}');
      if (!await launchUrl(uri, mode: LaunchMode.externalApplication))
        throw Exception('WhatsApp tidak dapat dibuka');
    } catch (e) {
      if (mounted) _message('$e'.replaceFirst('Exception: ', ''), error: true);
    } finally {
      if (mounted) setState(() => _sendingWa = false);
    }
  }

  void _message(String text, {bool error = false}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(text),
      backgroundColor: error ? AppColors.red600 : AppColors.success700,
    ));
  }

  Future<void> _statusAction(Map<String, dynamic> row, String status) async {
    final result = await JadwalPadamService.updateStatus(
        token: _token, kode: '${row['kode']}', status: status);
    if (!mounted) return;
    if (result['ok'] == true) {
      _message('Status ${row['kode']} menjadi $status');
      _load();
    } else {
      _message('${result['message'] ?? 'Gagal memperbarui status'}',
          error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FB),
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        leading: widget.onBack == null
            ? null
            : IconButton(
                onPressed: widget.onBack,
                icon: const Icon(Icons.arrow_back_rounded)),
        title: const Text('Jadwal Padam',
            style: TextStyle(fontWeight: FontWeight.w800)),
        actions: [
          IconButton(
            tooltip: 'Kirim laporan WhatsApp',
            onPressed: _sendingWa || _rows.isEmpty ? null : _sendWa,
            icon: _sendingWa
                ? const SizedBox.square(
                    dimension: 20,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.send_rounded),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(child: _filters()),
            if (_loading)
              SliverList(
                  delegate: SliverChildBuilderDelegate(
                      (_, i) => const _ScheduleSkeleton(),
                      childCount: 5))
            else if (_error != null)
              SliverFillRemaining(
                  hasScrollBody: false,
                  child: _StateView(
                      icon: Icons.cloud_off_rounded,
                      title: 'Jadwal belum termuat',
                      message: _error!,
                      action: _boot))
            else if (_rows.isEmpty)
              SliverFillRemaining(
                  hasScrollBody: false,
                  child: _StateView(
                      icon: Icons.event_available_rounded,
                      title: 'Tidak ada jadwal',
                      message: 'Coba periode atau filter lain.',
                      action: _load))
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 104),
                sliver: SliverList.separated(
                  itemCount: _rows.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, i) => _schedule(_rows[i]),
                ),
              ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _master.isEmpty ? null : () => _openForm(),
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Jadwal baru',
            style: TextStyle(fontWeight: FontWeight.w800)),
      ),
    );
  }

  Widget _filters() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        InkWell(
          onTap: _pickRange,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFDDE3EC))),
            child: Row(children: [
              const Icon(Icons.calendar_month_rounded,
                  color: AppColors.navy700),
              const SizedBox(width: 10),
              Expanded(
                  child: Text(
                      '${DateFormat('dd MMM').format(_from)}  sampai  ${DateFormat('dd MMM yyyy').format(_to)}',
                      style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          color: AppColors.navy900))),
              const Icon(Icons.expand_more_rounded, color: Color(0xFF718096)),
            ]),
          ),
        ),
        const SizedBox(height: 10),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(children: [
            _filterChip('Penyulang', _penyulang, ['', ..._penyulangOptions],
                (v) => _penyulang = v),
            _filterChip(
                'Status',
                _status,
                const ['', 'Terjadwal', 'Terealisasi', 'Batal Pekerjaan'],
                (v) => _status = v),
            _filterChip('Pekerjaan', _workStatus,
                const ['', 'Padam', 'Tanpa Padam'], (v) => _workStatus = v),
          ]),
        ),
      ]),
    );
  }

  Widget _filterChip(String label, String value, List<String> values,
      ValueChanged<String> apply) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: PopupMenuButton<String>(
        onSelected: (v) {
          setState(() => apply(v));
          _load();
        },
        itemBuilder: (_) => values
            .map((v) => PopupMenuItem(
                value: v, child: Text(v.isEmpty ? 'Semua $label' : v)))
            .toList(),
        child: Container(
          constraints: const BoxConstraints(minHeight: 44),
          padding: const EdgeInsets.symmetric(horizontal: 13),
          decoration: BoxDecoration(
            color: value.isEmpty ? Colors.white : const Color(0xFFE8F2FF),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(
                color: value.isEmpty
                    ? const Color(0xFFDDE3EC)
                    : const Color(0xFF9BC5F3)),
          ),
          child: Row(children: [
            Text(value.isEmpty ? label : value,
                style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(width: 5),
            const Icon(Icons.expand_more_rounded, size: 18)
          ]),
        ),
      ),
    );
  }

  Widget _schedule(Map<String, dynamic> row) {
    final status = '${row['status'] ?? 'Terjadwal'}';
    final cancelled = status.toLowerCase().contains('batal');
    final done = status == 'Terealisasi';
    final color = cancelled
        ? AppColors.red600
        : done
            ? AppColors.success700
            : AppColors.navy700;
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(17),
      child: InkWell(
        borderRadius: BorderRadius.circular(17),
        onTap: () => _showDetail(row),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                width: 52,
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                    color: const Color(0xFFF0F4FA),
                    borderRadius: BorderRadius.circular(12)),
                child: Column(children: [
                  Text(
                      DateFormat('dd').format(
                          DateTime.tryParse('${row['tanggal']}') ??
                              DateTime.now()),
                      style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                          color: AppColors.navy900)),
                  Text(
                      DateFormat('MMM')
                          .format(DateTime.tryParse('${row['tanggal']}') ??
                              DateTime.now())
                          .toUpperCase(),
                      style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF718096))),
                ]),
              ),
              const SizedBox(width: 12),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text('${row['penyulang'] ?? '-'}',
                        style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w900,
                            color: AppColors.navy900)),
                    const SizedBox(height: 3),
                    Text(
                        '${row['section'] ?? '-'}  •  ${row['jamPadam'] ?? '-'} - ${row['jamNyala'] ?? '-'} WIB',
                        style: const TextStyle(
                            fontSize: 12, color: Color(0xFF667085))),
                  ])),
              PopupMenuButton<String>(
                onSelected: (v) {
                  if (v == 'edit') _openForm(row: row);
                  if (v == 'done') _statusAction(row, 'Terealisasi');
                  if (v == 'cancel') _statusAction(row, 'Batal Pekerjaan');
                },
                itemBuilder: (_) => const [
                  PopupMenuItem(
                      value: 'edit',
                      child: ListTile(
                          leading: Icon(Icons.edit_outlined),
                          title: Text('Edit jadwal'),
                          contentPadding: EdgeInsets.zero)),
                  PopupMenuItem(
                      value: 'done',
                      child: ListTile(
                          leading: Icon(Icons.task_alt_rounded),
                          title: Text('Terealisasi'),
                          contentPadding: EdgeInsets.zero)),
                  PopupMenuItem(
                      value: 'cancel',
                      child: ListTile(
                          leading: Icon(Icons.cancel_outlined),
                          title: Text('Batalkan'),
                          contentPadding: EdgeInsets.zero)),
                ],
              ),
            ]),
            const SizedBox(height: 14),
            Text('${row['jenis'] ?? '-'}',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style:
                    const TextStyle(fontWeight: FontWeight.w700, height: 1.35)),
            const SizedBox(height: 12),
            Row(children: [
              _pill(status, color),
              const SizedBox(width: 7),
              _pill(
                  '${row['statusPekerjaan'] ?? 'Padam'}',
                  row['statusPekerjaan'] == 'Tanpa Padam'
                      ? AppColors.success700
                      : AppColors.amber700),
              const Spacer(),
              Text('${row['jumlahPelanggan'] ?? 0} pelanggan',
                  style:
                      const TextStyle(fontSize: 11, color: Color(0xFF718096))),
            ]),
          ]),
        ),
      ),
    );
  }

  Widget _pill(String text, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        decoration: BoxDecoration(
            color: color.withOpacity(.1),
            borderRadius: BorderRadius.circular(20)),
        child: Text(text,
            style: TextStyle(
                fontSize: 10, fontWeight: FontWeight.w800, color: color)),
      );

  void _showDetail(Map<String, dynamic> row) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: .82,
        minChildSize: .55,
        maxChildSize: .95,
        builder: (_, controller) => ListView(
          controller: controller,
          padding: const EdgeInsets.all(22),
          children: [
            Text('${row['penyulang']} • ${row['section']}',
                style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: AppColors.navy900)),
            const SizedBox(height: 6),
            Text('${row['hari']}, ${row['tanggalLabel'] ?? row['tanggal']}',
                style: const TextStyle(color: Color(0xFF667085))),
            const SizedBox(height: 22),
            ...{
              'Kode Jadwal': row['kode'],
              'Jenis Pekerjaan': row['jenis'],
              'Waktu': '${row['jamPadam']} - ${row['jamNyala']} WIB',
              'Durasi': '${row['durasi']} jam',
              'Daerah Padam': row['daerah'],
              'Lokasi': row['lokasi'],
              'Pelanggan VIP': row['vip'],
              'Jumlah Gardu': row['jumlahGardu'],
              'Jumlah Pelanggan': row['jumlahPelanggan'],
              'Beban': '${row['bebanA'] ?? '-'} A',
              'ENS': num.tryParse('${row['ensRupiah']}') == null
                  ? row['ensRupiah']
                  : NumberFormat.currency(
                          locale: 'id_ID', symbol: 'Rp', decimalDigits: 2)
                      .format(num.parse('${row['ensRupiah']}')),
            }.entries.map((e) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SizedBox(
                            width: 128,
                            child: Text(e.key,
                                style:
                                    const TextStyle(color: Color(0xFF667085)))),
                        Expanded(
                            child: Text('${e.value ?? '-'}',
                                style: const TextStyle(
                                    fontWeight: FontWeight.w700))),
                      ]),
                )),
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: () {
                Navigator.pop(ctx);
                _openForm(row: row);
              },
              icon: const Icon(Icons.edit_outlined),
              label: const Text('Edit jadwal'),
              style: FilledButton.styleFrom(
                  backgroundColor: AppColors.navy700,
                  minimumSize: const Size.fromHeight(48)),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openForm({Map<String, dynamic>? row}) async {
    final saved = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
          builder: (_) =>
              _JadwalForm(sesi: widget.sesi, master: _master, row: row)),
    );
    if (saved == true) _load();
  }
}

class _JadwalForm extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final List<Map<String, dynamic>> master;
  final Map<String, dynamic>? row;
  const _JadwalForm({required this.sesi, required this.master, this.row});

  @override
  State<_JadwalForm> createState() => _JadwalFormState();
}

class _JadwalFormState extends State<_JadwalForm> {
  final _form = GlobalKey<FormState>();
  late final TextEditingController _jenis;
  late final TextEditingController _lokasi;
  String _penyulang = '';
  String _section = '';
  String _work = 'Padam';
  late DateTime _date;
  TimeOfDay _start = const TimeOfDay(hour: 9, minute: 0);
  TimeOfDay _end = const TimeOfDay(hour: 12, minute: 0);
  bool _saving = false;

  Map<String, dynamic>? get _selected {
    for (final item in widget.master) {
      if ('${item['penyulang']}' == _penyulang &&
          '${item['section']}' == _section) return item;
    }
    return null;
  }

  @override
  void initState() {
    super.initState();
    final row = widget.row;
    _penyulang = '${row?['penyulang'] ?? ''}';
    _section = '${row?['section'] ?? ''}';
    _work = '${row?['statusPekerjaan'] ?? 'Padam'}';
    _date = DateTime.tryParse('${row?['tanggal'] ?? ''}') ?? DateTime.now();
    _start = _parseTime('${row?['jamPadam'] ?? '09:00'}');
    _end = _parseTime('${row?['jamNyala'] ?? '12:00'}');
    _jenis = TextEditingController(text: '${row?['jenis'] ?? ''}');
    _lokasi = TextEditingController(text: '${row?['lokasi'] ?? ''}');
  }

  TimeOfDay _parseTime(String value) {
    final parts = value.split(':');
    return TimeOfDay(
        hour: int.tryParse(parts.first) ?? 9,
        minute: parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0);
  }

  List<String> get _feeders {
    final values = widget.master
        .map((e) => '${e['penyulang']}')
        .where((e) => e.isNotEmpty)
        .toSet()
        .toList();
    values.sort();
    return values;
  }

  List<String> get _sections {
    final values = widget.master
        .where((e) => '${e['penyulang']}' == _penyulang)
        .map((e) => '${e['section']}')
        .where((e) => e.isNotEmpty)
        .toSet()
        .toList();
    values.sort();
    return values;
  }

  String _time(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _saving = true);
    final payload = <String, dynamic>{
      'token': '${widget.sesi['token'] ?? ''}',
      if (widget.row != null) 'kode': widget.row!['kode'],
      'penyulang': _penyulang,
      'section': _section,
      'jenis': _jenis.text.trim(),
      'tanggal': DateFormat('yyyy-MM-dd').format(_date),
      'jamPadam': _time(_start),
      'jamNyala': _time(_end),
      'lokasi': _lokasi.text.trim(),
      'statusPekerjaan': _work,
    };
    final result = await JadwalPadamService.save(payload);
    if (!mounted) return;
    setState(() => _saving = false);
    if (result['ok'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('${result['message']}'),
          backgroundColor: AppColors.success700));
      Navigator.pop(context, true);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('${result['message'] ?? 'Gagal menyimpan'}'),
          backgroundColor: AppColors.red600));
    }
  }

  @override
  Widget build(BuildContext context) {
    final auto = _selected;
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FB),
      appBar: AppBar(
        title: Text(widget.row == null ? 'Jadwal baru' : 'Edit jadwal',
            style: const TextStyle(fontWeight: FontWeight.w800)),
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
      ),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _select(
                'Penyulang',
                _penyulang,
                _feeders,
                (v) => setState(() {
                      _penyulang = v!;
                      _section = '';
                    })),
            _select('Section', _section, _sections,
                (v) => setState(() => _section = v!)),
            _input('Jenis pekerjaan', _jenis, required: true, lines: 2),
            _dateTile(),
            Row(children: [
              Expanded(
                  child: _timeTile('Jam padam', _start, (v) => _start = v)),
              const SizedBox(width: 10),
              Expanded(child: _timeTile('Jam nyala', _end, (v) => _end = v))
            ]),
            _select('Status pekerjaan', _work, const ['Padam', 'Tanpa Padam'],
                (v) => setState(() => _work = v!)),
            _input('Lokasi pekerjaan', _lokasi, lines: 2),
            if (auto != null) _impact(auto),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _saving ? null : _save,
              style: FilledButton.styleFrom(
                  backgroundColor: AppColors.navy700,
                  minimumSize: const Size.fromHeight(52)),
              child: _saving
                  ? const SizedBox.square(
                      dimension: 22,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : Text(
                      widget.row == null ? 'Simpan jadwal' : 'Simpan perubahan',
                      style: const TextStyle(fontWeight: FontWeight.w800)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _select(String label, String value, List<String> values,
          ValueChanged<String?> changed) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: DropdownButtonFormField<String>(
          value: value.isEmpty || !values.contains(value) ? null : value,
          items: values
              .map((v) => DropdownMenuItem(value: v, child: Text(v)))
              .toList(),
          onChanged: changed,
          validator: (v) =>
              v == null || v.isEmpty ? '$label wajib dipilih' : null,
          decoration: _decoration(label),
        ),
      );

  Widget _input(String label, TextEditingController controller,
          {bool required = false, int lines = 1}) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: TextFormField(
          controller: controller,
          maxLines: lines,
          validator: required
              ? (v) =>
                  v == null || v.trim().isEmpty ? '$label wajib diisi' : null
              : null,
          decoration: _decoration(label),
        ),
      );

  InputDecoration _decoration(String label) => InputDecoration(
        labelText: label,
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(13),
            borderSide: const BorderSide(color: Color(0xFFDDE3EC))),
        enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(13),
            borderSide: const BorderSide(color: Color(0xFFDDE3EC))),
      );

  Widget _dateTile() => Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: ListTile(
          tileColor: Colors.white,
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(13),
              side: const BorderSide(color: Color(0xFFDDE3EC))),
          title: const Text('Tanggal',
              style: TextStyle(fontSize: 12, color: Color(0xFF667085))),
          subtitle: Text(DateFormat('dd MMMM yyyy').format(_date),
              style: const TextStyle(
                  fontWeight: FontWeight.w800, color: AppColors.navy900)),
          trailing: const Icon(Icons.calendar_today_outlined),
          onTap: () async {
            final value = await showDatePicker(
                context: context,
                firstDate: DateTime(2024),
                lastDate: DateTime(2100),
                initialDate: _date);
            if (value != null) setState(() => _date = value);
          },
        ),
      );

  Widget _timeTile(
          String label, TimeOfDay value, ValueChanged<TimeOfDay> changed) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: ListTile(
          tileColor: Colors.white,
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(13),
              side: const BorderSide(color: Color(0xFFDDE3EC))),
          title: Text(label,
              style: const TextStyle(fontSize: 12, color: Color(0xFF667085))),
          subtitle: Text('${_time(value)} WIB',
              style: const TextStyle(
                  fontWeight: FontWeight.w800, color: AppColors.navy900)),
          onTap: () async {
            final selected =
                await showTimePicker(context: context, initialTime: value);
            if (selected != null) setState(() => changed(selected));
          },
        ),
      );

  Widget _impact(Map<String, dynamic> row) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
            color: const Color(0xFFEAF2FC),
            borderRadius: BorderRadius.circular(15)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('DAMPAK OTOMATIS',
              style: TextStyle(
                  fontSize: 10,
                  letterSpacing: 1,
                  fontWeight: FontWeight.w900,
                  color: AppColors.navy700)),
          const SizedBox(height: 10),
          Text(
              '${row['jumlahGardu'] ?? 0} gardu  •  ${row['jumlahPelanggan'] ?? 0} pelanggan  •  ${row['arus'] ?? '-'} A',
              style: const TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text('${row['daerahSection'] ?? '-'}',
              style: const TextStyle(
                  fontSize: 12, height: 1.4, color: Color(0xFF475467))),
          if ('${row['pelangganVip'] ?? ''}'.trim().isNotEmpty) ...[
            const SizedBox(height: 5),
            Text('VIP: ${row['pelangganVip']}',
                style: const TextStyle(fontSize: 12, color: Color(0xFF8A5A00)))
          ],
        ]),
      );
}

class _ScheduleSkeleton extends StatelessWidget {
  const _ScheduleSkeleton();
  @override
  Widget build(BuildContext context) => Container(
        height: 142,
        margin: const EdgeInsets.fromLTRB(16, 4, 16, 8),
        decoration: BoxDecoration(
            color: Colors.white, borderRadius: BorderRadius.circular(17)),
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(width: 180, height: 15, color: const Color(0xFFE8EDF4)),
          const SizedBox(height: 12),
          Container(width: 260, height: 12, color: const Color(0xFFEEF2F7)),
          const Spacer(),
          Container(
              width: 110,
              height: 24,
              decoration: BoxDecoration(
                  color: const Color(0xFFE8EDF4),
                  borderRadius: BorderRadius.circular(12))),
        ]),
      );
}

class _StateView extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  final VoidCallback action;
  const _StateView(
      {required this.icon,
      required this.title,
      required this.message,
      required this.action});

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(icon, size: 46, color: const Color(0xFF8B98AA)),
            const SizedBox(height: 14),
            Text(title,
                style: const TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.w900,
                    color: AppColors.navy900)),
            const SizedBox(height: 6),
            Text(message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Color(0xFF667085))),
            const SizedBox(height: 18),
            OutlinedButton.icon(
                onPressed: action,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Coba lagi')),
          ]),
        ),
      );
}
