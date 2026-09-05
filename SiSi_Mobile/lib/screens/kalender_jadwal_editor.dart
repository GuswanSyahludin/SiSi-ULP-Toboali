import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/jadwal_padam_service.dart';

/// Edit existing calendar rows through the same API as Jadwal Padam.
class KalenderJadwalEditor extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final Map<String, dynamic> row;
  const KalenderJadwalEditor({super.key, required this.sesi, required this.row});

  static bool boleh(Map<String, dynamic> sesi) {
    final role = '${sesi['role'] ?? ''}'.trim().toLowerCase();
    return role == 'admin' || role == 'super user' || role == 'superuser';
  }

  @override
  State<KalenderJadwalEditor> createState() => _KalenderJadwalEditorState();
}

class _KalenderJadwalEditorState extends State<KalenderJadwalEditor> {
  final _form = GlobalKey<FormState>();
  late final TextEditingController _jenis;
  late final TextEditingController _lokasi;
  late DateTime _date;
  late TimeOfDay _start;
  late TimeOfDay _end;
  late String _penyulang;
  late String _section;
  late String _work;
  List<Map<String, dynamic>> _master = [];
  bool _loading = true;
  bool _saving = false;
  String? _error;

  String get _token => '${widget.sesi['token'] ?? ''}';
  String get _kode => '${widget.row['kode'] ?? ''}'.trim();
  TimeOfDay _parseTime(dynamic value) {
    final parts = '$value'.split(':');
    final hour = int.tryParse(parts.first) ?? 9;
    final minute = parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0;
    return TimeOfDay(hour: hour.clamp(0, 23).toInt(), minute: minute.clamp(0, 59).toInt());
  }
  String _time(TimeOfDay value) => '${value.hour.toString().padLeft(2, '0')}:${value.minute.toString().padLeft(2, '0')}';

  @override
  void initState() {
    super.initState();
    _jenis = TextEditingController(text: '${widget.row['jenis'] ?? ''}');
    _lokasi = TextEditingController(text: '${widget.row['lokasi'] ?? ''}');
    _date = DateTime.tryParse('${widget.row['tanggal']}') ?? DateTime.now();
    _start = _parseTime(widget.row['jamPadam']);
    _end = _parseTime(widget.row['jamNyala']);
    _penyulang = '${widget.row['penyulang'] ?? ''}';
    _section = '${widget.row['section'] ?? ''}';
    _work = '${widget.row['statusPekerjaan'] ?? 'Padam'}';
    _load();
  }

  @override
  void dispose() {
    _jenis.dispose();
    _lokasi.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (!KalenderJadwalEditor.boleh(widget.sesi) || _kode.isEmpty) {
      setState(() { _loading = false; _error = 'Akses edit ditolak atau kode jadwal tidak tersedia.'; });
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final result = await JadwalPadamService.master(token: _token);
      if (result['ok'] != true) throw Exception(result['message'] ?? 'Master tidak tersedia.');
      final rows = List<dynamic>.from(result['rows'] ?? []).whereType<Map>()
          .map((row) => Map<String, dynamic>.from(row)).toList();
      if (rows.isEmpty) throw Exception('Master penyulang dan section kosong.');
      if (mounted) setState(() => _master = rows);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<String> _options(String key, {String? penyulang}) {
    final values = _master.where((row) => penyulang == null || '${row['penyulang']}' == penyulang)
        .map((row) => '${row[key] ?? ''}').where((s) => s.isNotEmpty).toSet().toList();
    values.sort();
    return values;
  }

  Future<void> _save() async {
    if (_saving || _loading || !KalenderJadwalEditor.boleh(widget.sesi) || _kode.isEmpty) return;
    if (!_form.currentState!.validate()) return;
    setState(() { _saving = true; _error = null; });
    try {
      final result = await JadwalPadamService.save({
        'token': _token, 'kode': _kode,
        'penyulang': _penyulang, 'section': _section,
        'jenis': _jenis.text.trim(), 'lokasi': _lokasi.text.trim(),
        'tanggal': DateFormat('yyyy-MM-dd').format(_date),
        'jamPadam': _time(_start), 'jamNyala': _time(_end),
        'statusPekerjaan': _work,
      });
      if (result['ok'] != true) throw Exception(result['message'] ?? 'Perubahan belum tersimpan.');
      if (!mounted) return;
      Navigator.pop(context, DateTime(_date.year, _date.month, _date.day));
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _dropdown(String label, String value, List<String> options, ValueChanged<String> change) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: DropdownButtonFormField<String>(
        value: options.contains(value) ? value : null,
        isExpanded: true,
        decoration: InputDecoration(labelText: label),
        items: options.map((v) => DropdownMenuItem(value: v, child: Text(v, maxLines: 2, overflow: TextOverflow.ellipsis))).toList(),
        onChanged: _saving ? null : (v) { if (v != null) setState(() => change(v)); },
        validator: (v) => v == null || v.isEmpty ? '$label wajib dipilih' : null,
      ),
    );
  }

  Future<void> _pickTime(bool start) async {
    final value = await showTimePicker(context: context, initialTime: start ? _start : _end);
    if (value != null && mounted) setState(() { if (start) { _start = value; } else { _end = value; } });
  }

  @override
  Widget build(BuildContext context) {
    final impact = _master.where((r) => '${r['penyulang']}' == _penyulang && '${r['section']}' == _section);
    return PopScope(
      canPop: !_saving,
      child: Scaffold(
        appBar: AppBar(title: const Text('Edit jadwal'), automaticallyImplyLeading: !_saving),
        body: SafeArea(child: _loading
          ? const Center(child: CircularProgressIndicator())
          : Form(key: _form, child: ListView(padding: const EdgeInsets.all(20), children: [
              Text(_kode, style: Theme.of(context).textTheme.labelLarge),
              const SizedBox(height: 8),
              const Text('Perubahan ini juga berlaku pada menu Jadwal Padam.'),
              const SizedBox(height: 20),
              if (_error != null) ...[
                Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                if (_master.isEmpty) TextButton(onPressed: _load, child: const Text('Muat ulang master')),
                const SizedBox(height: 16),
              ],
              _dropdown('Penyulang', _penyulang, _options('penyulang'), (v) { _penyulang = v; _section = ''; }),
              _dropdown('Section', _section, _options('section', penyulang: _penyulang), (v) => _section = v),
              TextFormField(controller: _jenis, enabled: !_saving, maxLines: 2,
                decoration: const InputDecoration(labelText: 'Jenis pekerjaan'),
                validator: (v) => v == null || v.trim().isEmpty ? 'Jenis pekerjaan wajib diisi' : null),
              const SizedBox(height: 16),
              ListTile(contentPadding: EdgeInsets.zero, title: const Text('Tanggal'),
                subtitle: Text(DateFormat('dd/MM/yyyy').format(_date)), trailing: const Icon(Icons.calendar_month),
                onTap: _saving ? null : () async {
                  final value = await showDatePicker(context: context, initialDate: _date, firstDate: DateTime(2000), lastDate: DateTime(2100, 12, 31));
                  if (value != null && mounted) setState(() => _date = value);
                }),
              Row(children: [
                Expanded(child: ListTile(contentPadding: EdgeInsets.zero, title: const Text('Jam padam'), subtitle: Text('${_time(_start)} WIB'), onTap: _saving ? null : () => _pickTime(true))),
                Expanded(child: ListTile(contentPadding: EdgeInsets.zero, title: const Text('Jam nyala'), subtitle: Text('${_time(_end)} WIB'), onTap: _saving ? null : () => _pickTime(false))),
              ]),
              _dropdown('Status pekerjaan', _work, const ['Padam', 'Tanpa Padam'], (v) => _work = v),
              TextFormField(controller: _lokasi, enabled: !_saving, maxLines: 2, decoration: const InputDecoration(labelText: 'Lokasi pekerjaan')),
              const SizedBox(height: 20),
              if (impact.isNotEmpty) ...[
                Text('Dampak otomatis', style: Theme.of(context).textTheme.titleMedium),
                Text('${impact.first['jumlahGardu'] ?? 0} gardu · ${impact.first['jumlahPelanggan'] ?? 0} pelanggan'),
                Text('${impact.first['daerahSection'] ?? ''}'),
                const SizedBox(height: 20),
              ],
              FilledButton(onPressed: _saving || _master.isEmpty ? null : _save,
                child: Text(_saving ? 'Menyimpan...' : 'Simpan perubahan')),
            ]))),
      ),
    );
  }
}
