import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../db/app_database.dart';
import '../db/repositories/inspeksi_gardu_repository.dart';
import '../db/repositories/master_gardu_repository.dart';
import '../db/repositories/master_repository.dart';
import '../db/repositories/temuan_teknik_repository.dart';
import '../theme/app_colors.dart';
import '../widgets/accurate_gps_button.dart';

class InputTemuanTeknikScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  const InputTemuanTeknikScreen({super.key, required this.sesi});

  @override
  State<InputTemuanTeknikScreen> createState() =>
      _InputTemuanTeknikScreenState();
}

class _InputTemuanTeknikScreenState extends State<InputTemuanTeknikScreen> {
  final _repository = TemuanTeknikRepository();
  final _picker = ImagePicker();
  final _tiangCtrl = TextEditingController();
  final _segmenCtrl = TextEditingController();
  final _koorTiangCtrl = TextEditingController();
  final _koorTemuanCtrl = TextEditingController();
  final _deskripsiCtrl = TextEditingController();

  String _objekInspeksi = 'Jaringan';
  String? _selectedPenyulang;
  String? _selectedSection;
  String? _selectedGardu;
  String _selectedTier = 'Tier 1';
  String? _selectedTemuan;
  String? _akurasiTiang;
  String? _akurasiTemuan;
  List<String> _listPenyulang = [];
  Map<String, List<String>> _sectionMap = {};
  List<String> _listTemuan = [];
  List<MasterGardu> _gardus = [];
  File? _fotoTemuan;
  File? _fotoTiangOrGardu;
  bool _loading = true;
  bool _loadingTemuan = true;
  bool _saving = false;

  bool get _isJaringan => _objekInspeksi == 'Jaringan';
  String get _petugasInspeksi =>
      (widget.sesi['subTim'] ?? widget.sesi['tim'] ?? '').toString().trim();

  @override
  void initState() {
    super.initState();
    _loadMaster();
  }

  @override
  void dispose() {
    _tiangCtrl.dispose();
    _segmenCtrl.dispose();
    _koorTiangCtrl.dispose();
    _koorTemuanCtrl.dispose();
    _deskripsiCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadMaster() async {
    try {
      final master = MasterRepository();
      final penyulang = await master.daftarPenyulang();
      final sections = await master.sectionByPenyulang();
      final role = (widget.sesi['role'] ?? '').toString().toLowerCase();
      final privileged = role == 'super user' || role == 'admin';
      final ulp = privileged ? '' : (widget.sesi['ulp'] ?? '').toString();
      var gardus = await MasterGarduRepository().cari('', ulp: ulp, limit: 5000);
      if (gardus.isEmpty && ulp.isNotEmpty) {
        gardus = await MasterGarduRepository().cari('', limit: 5000);
      }
      if (!mounted) return;
      setState(() {
        _listPenyulang = penyulang;
        _sectionMap = sections;
        _gardus = gardus;
        _selectedPenyulang = penyulang.isEmpty ? null : penyulang.first;
        final available = sections[_selectedPenyulang] ?? const <String>[];
        _selectedSection = available.isEmpty ? null : available.first;
        _loading = false;
      });
      await _loadTemuan();
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
      await _loadTemuan();
    }
  }

  Future<void> _loadTemuan() async {
    setState(() {
      _loadingTemuan = true;
      _selectedTemuan = null;
    });
    List<String> values = [];
    try {
      final rows = await InspeksiGarduRepository().pilihan(_selectedTier);
      values = rows
          .where((row) =>
              row.objekInspeksi.trim().isEmpty ||
              row.objekInspeksi.toLowerCase() == _objekInspeksi.toLowerCase())
          .map((row) => row.temuan.trim())
          .where((value) => value.isNotEmpty)
          .toSet()
          .toList()
        ..sort();
    } catch (_) {}
    if (values.isEmpty) values = _fallbackTemuan();
    if (!mounted) return;
    setState(() {
      _listTemuan = values;
      _selectedTemuan = values.isEmpty ? null : values.first;
      _loadingTemuan = false;
    });
  }

  List<String> _fallbackTemuan() {
    if (_isJaringan) {
      return _selectedTier == 'Tier 1'
          ? ['Isolator retak / flashover', 'Andongan penghantar kendor', 'Arrester bocor / rusak', 'Crossarm miring / korosi']
          : ['Tanda kilat / grounding putus', 'Guy wire kendor / putus', 'Pondasi tiang amblas', 'Jumperan kendor / korosi'];
    }
    return _selectedTier == 'Tier 1'
        ? ['Fuse Cut Out (FCO) rusak/meleleh', 'Arrester gardu bocor', 'Bushing trafo rembes/pecah', 'Kabel LV keluar terbakar']
        : ['Grounding netral trafo putus', 'Pintu gardu rusak/terbuka', 'Indikator oli rendah', 'Koneksi terminal korosi'];
  }

  void _changeObject(String value) {
    setState(() {
      _objekInspeksi = value;
      _selectedGardu = null;
      _tiangCtrl.clear();
      _koorTiangCtrl.clear();
      _koorTemuanCtrl.clear();
      _akurasiTiang = null;
      _akurasiTemuan = null;
      _fotoTiangOrGardu = null;
      if (!_isJaringan) {
        _selectedPenyulang = null;
        _selectedSection = null;
      } else if (_listPenyulang.isNotEmpty) {
        _selectedPenyulang = _listPenyulang.first;
        final sections = _sectionMap[_selectedPenyulang] ?? const <String>[];
        _selectedSection = sections.isEmpty ? null : sections.first;
      }
    });
    _loadTemuan();
  }

  void _selectGardu(String? number) {
    MasterGardu? selected;
    for (final gardu in _gardus) {
      if (gardu.gardu == number) {
        selected = gardu;
        break;
      }
    }
    setState(() {
      _selectedGardu = number;
      _selectedPenyulang = selected?.penyulang.trim().isEmpty == false
          ? selected!.penyulang.trim()
          : null;
      _selectedSection = selected?.section.trim().isEmpty == false
          ? selected!.section.trim()
          : null;
      final latitude = selected?.latitude.trim() ?? '';
      final longitude = selected?.longitude.trim() ?? '';
      _koorTemuanCtrl.text = latitude.isNotEmpty && longitude.isNotEmpty
          ? '$latitude, $longitude'
          : '';
      _akurasiTemuan = null;
    });
  }

  InputDecoration _decoration({String? hint, Widget? suffixIcon, bool lookup = false}) {
    return InputDecoration(
      hintText: hint,
      suffixIcon: suffixIcon,
      filled: true,
      fillColor: lookup ? const Color(0xFFEFF8FC) : const Color(0xFFFCFDFF),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: lookup ? const Color(0xFFBAE6F5) : const Color(0xFFDCE3EC),
        ),
      ),
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(text, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF334155))),
      );

  Widget _gap() => const SizedBox(height: 14);

  Widget _accuracyChip(String? value, {bool master = false}) {
    if (value == null && !master) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
          decoration: BoxDecoration(
            color: master ? const Color(0xFFE0F2FE) : const Color(0xFFDCFCE7),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            master ? 'MASTER GARDU' : 'AKURASI $value',
            style: TextStyle(
              fontSize: 9,
              letterSpacing: .4,
              fontWeight: FontWeight.w900,
              color: master ? AppColors.cyan600 : AppColors.success700,
            ),
          ),
        ),
      ),
    );
  }

  Widget _gpsField({
    required String label,
    required TextEditingController controller,
    required ValueChanged<String> onAccuracy,
  }) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _label(label),
      TextField(
        controller: controller,
        readOnly: true,
        decoration: _decoration(
          hint: 'Ambil koordinat GPS',
          suffixIcon: AccurateGpsButton(
            controller: controller,
            showAccuracyFeedback: false,
            onCaptured: (result) => onAccuracy(result.accuracyLabel),
          ),
        ),
      ),
      _accuracyChip(label == 'Koordinat Tiang' ? _akurasiTiang : _akurasiTemuan),
    ]);
  }

  Future<void> _pickFoto(int slot) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (context) => SafeArea(
        child: Wrap(children: [
          ListTile(
            leading: const Icon(Icons.camera_alt_rounded, color: AppColors.navy700),
            title: const Text('Ambil dari Kamera Lapangan'),
            onTap: () => Navigator.pop(context, ImageSource.camera),
          ),
          ListTile(
            leading: const Icon(Icons.photo_library_rounded, color: AppColors.navy700),
            title: const Text('Pilih dari Galeri'),
            onTap: () => Navigator.pop(context, ImageSource.gallery),
          ),
        ]),
      ),
    );
    if (source == null) return;
    final picked = await _picker.pickImage(source: source, imageQuality: 70);
    if (picked == null || !mounted) return;
    setState(() {
      if (slot == 1) {
        _fotoTemuan = File(picked.path);
      } else {
        _fotoTiangOrGardu = File(picked.path);
      }
    });
  }

  String? _validate() {
    if (!_isJaringan && _selectedGardu == null) return 'Pilih nomor gardu.';
    if (_selectedPenyulang == null || _selectedPenyulang!.isEmpty) return 'Penyulang belum tersedia.';
    if (_selectedSection == null || _selectedSection!.isEmpty) return 'Section belum tersedia.';
    if (_selectedTemuan == null) return 'Pilih jenis temuan.';
    if (_isJaringan && _tiangCtrl.text.trim().isEmpty) return 'Nomor tiang wajib diisi.';
    if (_isJaringan && _koorTiangCtrl.text.trim().isEmpty) return 'Koordinat tiang wajib diambil.';
    if (_koorTemuanCtrl.text.trim().isEmpty) {
      return _isJaringan ? 'Koordinat temuan wajib diambil.' : 'Koordinat gardu belum tersedia di Master Gardu.';
    }
    if (_fotoTemuan == null || _fotoTiangOrGardu == null) {
      return 'Foto temuan dan foto ${_isJaringan ? 'tiang' : 'gardu'} wajib lengkap.';
    }
    return null;
  }

  Future<void> _handleSimpan() async {
    final error = _validate();
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
      return;
    }
    setState(() => _saving = true);
    try {
      final result = await _repository.simpan(
        token: (widget.sesi['token'] ?? '').toString(),
        objekInspeksi: _objekInspeksi,
        penyulang: _selectedPenyulang!,
        section: _selectedSection!,
        segmen: _segmenCtrl.text.trim(),
        nomorTiang: _isJaringan ? _tiangCtrl.text.trim() : '',
        nomorGardu: _isJaringan ? '' : _selectedGardu!,
        tier: _selectedTier,
        temuan: _selectedTemuan!,
        koordinat: _koorTemuanCtrl.text.trim(),
        koordinatTiang: _isJaringan ? _koorTiangCtrl.text.trim() : '',
        petugasInspeksi: _petugasInspeksi,
        deskripsi: _deskripsiCtrl.text.trim(),
        fotoTemuan: _fotoTemuan!,
        fotoTiangAtauGardu: _fotoTiangOrGardu!,
      );
      if (!mounted) return;
      final kode = (result['kodePekerjaan'] ?? '').toString();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(kode.isEmpty ? 'Temuan berhasil disimpan.' : 'Temuan berhasil disimpan: $kode'), backgroundColor: AppColors.success700),
      );
      Navigator.pop(context, true);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString().replaceFirst('Exception: ', '')), backgroundColor: AppColors.red600),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final sections = _sectionMap[_selectedPenyulang] ?? const <String>[];
    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FC),
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Input Temuan', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17)),
          Text((widget.sesi['ulp'] ?? '').toString(), style: const TextStyle(fontSize: 12, color: Colors.white70)),
        ]),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
              children: [
                const Text('Form Input Temuan', style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900, color: AppColors.navy700)),
                const SizedBox(height: 22),
                _label('Objek Inspeksi'),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'Jaringan', label: Text('Jaringan'), icon: Icon(Icons.alt_route_rounded)),
                    ButtonSegment(value: 'Gardu', label: Text('Gardu'), icon: Icon(Icons.electrical_services_rounded)),
                  ],
                  selected: {_objekInspeksi},
                  onSelectionChanged: (value) => _changeObject(value.first),
                ),
                _gap(),
                if (_isJaringan) ...[
                  _label('Penyulang'),
                  DropdownButtonFormField<String>(
                    value: _selectedPenyulang,
                    isExpanded: true,
                    decoration: _decoration(hint: 'Pilih penyulang'),
                    items: _listPenyulang.map((value) => DropdownMenuItem(value: value, child: Text(value))).toList(),
                    onChanged: (value) {
                      final next = _sectionMap[value] ?? const <String>[];
                      setState(() {
                        _selectedPenyulang = value;
                        _selectedSection = next.isEmpty ? null : next.first;
                      });
                    },
                  ),
                  _gap(),
                  _label('Section'),
                  DropdownButtonFormField<String>(
                    value: sections.contains(_selectedSection) ? _selectedSection : null,
                    isExpanded: true,
                    decoration: _decoration(hint: 'Pilih section'),
                    items: sections.map((value) => DropdownMenuItem(value: value, child: Text(value))).toList(),
                    onChanged: (value) => setState(() => _selectedSection = value),
                  ),
                ] else ...[
                  _label('Nomor Gardu'),
                  DropdownButtonFormField<String>(
                    value: _selectedGardu,
                    isExpanded: true,
                    decoration: _decoration(hint: 'Pilih nomor gardu'),
                    items: _gardus.map((gardu) => DropdownMenuItem(value: gardu.gardu, child: Text(gardu.gardu))).toList(),
                    onChanged: _selectGardu,
                  ),
                  _gap(),
                  _label('Penyulang'),
                  TextField(readOnly: true, controller: TextEditingController(text: _selectedPenyulang ?? ''), decoration: _decoration(hint: 'Lookup Master Gardu', lookup: true)),
                  _gap(),
                  _label('Section'),
                  TextField(readOnly: true, controller: TextEditingController(text: _selectedSection ?? ''), decoration: _decoration(hint: 'Lookup Master Gardu', lookup: true)),
                ],
                _gap(),
                _label('Segmen'),
                TextField(controller: _segmenCtrl, decoration: _decoration(hint: 'Segmen lokasi temuan')),
                if (_isJaringan) ...[
                  _gap(),
                  _label('Nomor Tiang'),
                  TextField(controller: _tiangCtrl, textCapitalization: TextCapitalization.characters, decoration: _decoration(hint: 'Contoh: 07')),
                  _gap(),
                  _gpsField(
                    label: 'Koordinat Tiang',
                    controller: _koorTiangCtrl,
                    onAccuracy: (value) => setState(() => _akurasiTiang = value),
                  ),
                ],
                _gap(),
                _label('Tier'),
                DropdownButtonFormField<String>(
                  value: _selectedTier,
                  decoration: _decoration(),
                  items: const [DropdownMenuItem(value: 'Tier 1', child: Text('Tier 1')), DropdownMenuItem(value: 'Tier 2', child: Text('Tier 2'))],
                  onChanged: (value) {
                    if (value == null) return;
                    setState(() => _selectedTier = value);
                    _loadTemuan();
                  },
                ),
                _gap(),
                _label('Temuan'),
                _loadingTemuan
                    ? const LinearProgressIndicator(minHeight: 3)
                    : DropdownButtonFormField<String>(
                        value: _selectedTemuan,
                        isExpanded: true,
                        decoration: _decoration(hint: 'Pilih temuan'),
                        items: _listTemuan.map((value) => DropdownMenuItem(value: value, child: Text(value, overflow: TextOverflow.ellipsis))).toList(),
                        onChanged: (value) => setState(() => _selectedTemuan = value),
                      ),
                _gap(),
                if (_isJaringan)
                  _gpsField(
                    label: 'Koordinat Temuan',
                    controller: _koorTemuanCtrl,
                    onAccuracy: (value) => setState(() => _akurasiTemuan = value),
                  )
                else ...[
                  _label('Koordinat Temuan'),
                  TextField(readOnly: true, controller: _koorTemuanCtrl, decoration: _decoration(hint: 'Lookup Master Gardu', lookup: true)),
                  _accuracyChip(null, master: _koorTemuanCtrl.text.isNotEmpty),
                ],
                _gap(),
                _label('Petugas Inspeksi'),
                TextField(readOnly: true, controller: TextEditingController(text: _petugasInspeksi), decoration: _decoration(hint: 'Sub-Tim username', lookup: true)),
                const Padding(
                  padding: EdgeInsets.only(top: 5),
                  child: Text('Otomatis dari Sub-Tim akun yang sedang login.', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                ),
                _gap(),
                _label('Deskripsi / Catatan Lapangan'),
                TextField(controller: _deskripsiCtrl, maxLines: 3, decoration: _decoration(hint: 'Tuliskan kondisi temuan...')),
                const SizedBox(height: 18),
                _label('Foto Dokumentasi (Temuan & ${_isJaringan ? 'Tiang' : 'Gardu'})'),
                Row(children: [
                  Expanded(child: _fotoSlot('Foto Temuan', _fotoTemuan, () => _pickFoto(1))),
                  const SizedBox(width: 10),
                  Expanded(child: _fotoSlot(_isJaringan ? 'Foto Tiang' : 'Foto Gardu', _fotoTiangOrGardu, () => _pickFoto(2))),
                ]),
                const SizedBox(height: 24),
                SizedBox(
                  height: 50,
                  child: ElevatedButton.icon(
                    onPressed: _saving ? null : _handleSimpan,
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                    icon: _saving
                        ? const SizedBox.square(dimension: 19, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.save_rounded),
                    label: Text(_saving ? 'Menyimpan...' : 'Simpan Temuan', style: const TextStyle(fontWeight: FontWeight.w900)),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _fotoSlot(String label, File? file, VoidCallback onTap) {
    return Material(
      color: const Color(0xFFFCFDFF),
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          height: 104,
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: file == null ? const Color(0xFFDCE3EC) : AppColors.success700),
          ),
          child: file != null
              ? Stack(fit: StackFit.expand, children: [
                  Image.file(file, fit: BoxFit.cover),
                  const Positioned(right: 6, top: 6, child: CircleAvatar(radius: 12, backgroundColor: AppColors.success700, child: Icon(Icons.check_rounded, size: 16, color: Colors.white))),
                ])
              : Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const Icon(Icons.add_a_photo_rounded, color: Color(0xFF64748B)),
                  const SizedBox(height: 6),
                  Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF64748B))),
                ]),
        ),
      ),
    );
  }
}
