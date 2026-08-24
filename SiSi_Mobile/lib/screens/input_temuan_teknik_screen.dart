import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../db/repositories/inspeksi_gardu_repository.dart';
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
  final _garduCtrl = TextEditingController();
  final _segmenCtrl = TextEditingController();
  final _koorCtrl = TextEditingController();
  final _deskripsiCtrl = TextEditingController();

  String _objekInspeksi = 'Jaringan';
  String? _selectedPenyulang;
  String? _selectedSection;
  String _selectedTier = 'Tier 1';
  String? _selectedTemuan;
  List<String> _listPenyulang = [];
  Map<String, List<String>> _sectionMap = {};
  List<String> _listTemuan = [];
  File? _fotoTemuan;
  File? _fotoTiangOrGardu;
  bool _loadingDropdown = true;
  bool _loadingTemuan = true;
  bool _saving = false;

  bool get _isJaringan => _objekInspeksi == 'Jaringan';

  @override
  void initState() {
    super.initState();
    _loadDropdown();
  }

  @override
  void dispose() {
    _tiangCtrl.dispose();
    _garduCtrl.dispose();
    _segmenCtrl.dispose();
    _koorCtrl.dispose();
    _deskripsiCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadDropdown() async {
    try {
      final repo = MasterRepository();
      final penyulang = await repo.daftarPenyulang();
      final sections = await repo.sectionByPenyulang();
      if (!mounted) return;
      setState(() {
        _listPenyulang = penyulang;
        _sectionMap = sections;
        _selectedPenyulang = penyulang.isEmpty ? null : penyulang.first;
        final firstSections = sections[_selectedPenyulang] ?? const <String>[];
        _selectedSection = firstSections.isEmpty ? null : firstSections.first;
        _loadingDropdown = false;
      });
      await _loadTemuan();
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadingDropdown = false);
      await _loadTemuan();
    }
  }

  Future<void> _loadTemuan() async {
    setState(() {
      _loadingTemuan = true;
      _selectedTemuan = null;
    });
    List<String> pilihan = [];
    try {
      final rows = await InspeksiGarduRepository().pilihan(_selectedTier);
      pilihan = rows
          .where((row) =>
              row.objekInspeksi.trim().isEmpty ||
              row.objekInspeksi.toLowerCase() ==
                  _objekInspeksi.toLowerCase())
          .map((row) => row.temuan.trim())
          .where((value) => value.isNotEmpty)
          .toSet()
          .toList()
        ..sort();
    } catch (_) {}

    if (pilihan.isEmpty) {
      pilihan = _fallbackTemuan();
    }
    if (!mounted) return;
    setState(() {
      _listTemuan = pilihan;
      _selectedTemuan = pilihan.isEmpty ? null : pilihan.first;
      _loadingTemuan = false;
    });
  }

  List<String> _fallbackTemuan() {
    if (_isJaringan) {
      return _selectedTier == 'Tier 1'
          ? [
              'Isolator retak / flashover',
              'Andongan penghantar kendor',
              'Arrester bocor / rusak',
              'Crossarm miring / korosi',
              'Pohon mendekati JTM (<2.5m)',
            ]
          : [
              'Tanda kilat / grounding putus',
              'Guy wire kendor / putus',
              'Pondasi tiang amblas',
              'Jumperan kendor / korosi',
            ];
    }
    return _selectedTier == 'Tier 1'
        ? [
            'Fuse Cut Out (FCO) rusak/meleleh',
            'Arrester gardu bocor',
            'Bushing trafo rembes/pecah',
            'Kabel LV keluar terbakar',
          ]
        : [
            'Grounding netral trafo putus',
            'Pintu gardu rusak/terbuka',
            'Indikator oli rendah',
            'Koneksi terminal korosi',
          ];
  }

  InputDecoration _decoration({String? hint, Widget? suffixIcon}) {
    return InputDecoration(
      hintText: hint,
      suffixIcon: suffixIcon,
      filled: true,
      fillColor: const Color(0xFFFCFDFF),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFDCE3EC)),
      ),
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(
          text,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            color: Color(0xFF334155),
          ),
        ),
      );

  Widget _gap() => const SizedBox(height: 14);

  Future<void> _pickFoto(int slot) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (context) => SafeArea(
        child: Wrap(children: [
          ListTile(
            leading: const Icon(Icons.camera_alt_rounded,
                color: AppColors.navy700),
            title: const Text('Ambil dari Kamera Lapangan'),
            onTap: () => Navigator.pop(context, ImageSource.camera),
          ),
          ListTile(
            leading: const Icon(Icons.photo_library_rounded,
                color: AppColors.navy700),
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
    if (_selectedPenyulang == null) return 'Pilih penyulang.';
    if (_selectedSection == null) return 'Pilih section.';
    if (_selectedTemuan == null) return 'Pilih jenis temuan.';
    if (_isJaringan && _tiangCtrl.text.trim().isEmpty) {
      return 'Nomor tiang wajib diisi.';
    }
    if (!_isJaringan && _garduCtrl.text.trim().isEmpty) {
      return 'Nomor gardu wajib diisi.';
    }
    if (_koorCtrl.text.trim().isEmpty) return 'Koordinat wajib diambil.';
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
        nomorGardu: _isJaringan ? '' : _garduCtrl.text.trim(),
        tier: _selectedTier,
        temuan: _selectedTemuan!,
        koordinat: _koorCtrl.text.trim(),
        deskripsi: _deskripsiCtrl.text.trim(),
        fotoTemuan: _fotoTemuan!,
        fotoTiangAtauGardu: _fotoTiangOrGardu!,
      );
      if (!mounted) return;
      final kode = (result['kodePekerjaan'] ?? '').toString();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(kode.isEmpty
              ? 'Temuan berhasil disimpan.'
              : 'Temuan berhasil disimpan: $kode'),
          backgroundColor: AppColors.success700,
        ),
      );
      Navigator.pop(context, true);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.toString().replaceFirst('Exception: ', '')),
          backgroundColor: AppColors.red600,
        ),
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
          const Text('Input Temuan',
              style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17)),
          Text(
            (widget.sesi['ulp'] ?? '').toString(),
            style: const TextStyle(fontSize: 12, color: Colors.white70),
          ),
        ]),
      ),
      body: _loadingDropdown
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
              children: [
                _label('Objek Inspeksi'),
                DropdownButtonFormField<String>(
                  value: _objekInspeksi,
                  decoration: _decoration(),
                  items: const [
                    DropdownMenuItem(value: 'Jaringan', child: Text('Jaringan')),
                    DropdownMenuItem(value: 'Gardu', child: Text('Gardu')),
                  ],
                  onChanged: (value) {
                    if (value == null) return;
                    setState(() {
                      _objekInspeksi = value;
                      _tiangCtrl.clear();
                      _garduCtrl.clear();
                      _fotoTiangOrGardu = null;
                    });
                    _loadTemuan();
                  },
                ),
                _gap(),
                _label('Penyulang'),
                DropdownButtonFormField<String>(
                  value: _selectedPenyulang,
                  isExpanded: true,
                  decoration: _decoration(hint: 'Pilih penyulang'),
                  items: _listPenyulang
                      .map((value) => DropdownMenuItem(
                            value: value,
                            child: Text(value),
                          ))
                      .toList(),
                  onChanged: (value) {
                    final nextSections = _sectionMap[value] ?? const <String>[];
                    setState(() {
                      _selectedPenyulang = value;
                      _selectedSection =
                          nextSections.isEmpty ? null : nextSections.first;
                    });
                  },
                ),
                _gap(),
                _label('Section'),
                DropdownButtonFormField<String>(
                  value: sections.contains(_selectedSection)
                      ? _selectedSection
                      : null,
                  isExpanded: true,
                  decoration: _decoration(hint: 'Pilih section'),
                  items: sections
                      .map((value) => DropdownMenuItem(
                            value: value,
                            child: Text(value),
                          ))
                      .toList(),
                  onChanged: (value) =>
                      setState(() => _selectedSection = value),
                ),
                _gap(),
                _label('Segmen'),
                TextField(
                  controller: _segmenCtrl,
                  decoration: _decoration(hint: 'Segmen lokasi temuan'),
                ),
                _gap(),
                _label(_isJaringan ? 'Nomor Tiang' : 'Nomor Gardu'),
                TextField(
                  controller: _isJaringan ? _tiangCtrl : _garduCtrl,
                  textCapitalization: TextCapitalization.characters,
                  decoration: _decoration(
                    hint: _isJaringan ? 'Contoh: 07' : 'Contoh: GT.TBL-012',
                  ),
                ),
                _gap(),
                _label('Tier'),
                DropdownButtonFormField<String>(
                  value: _selectedTier,
                  decoration: _decoration(),
                  items: const [
                    DropdownMenuItem(value: 'Tier 1', child: Text('Tier 1')),
                    DropdownMenuItem(value: 'Tier 2', child: Text('Tier 2')),
                  ],
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
                        items: _listTemuan
                            .map((value) => DropdownMenuItem(
                                  value: value,
                                  child: Text(value,
                                      overflow: TextOverflow.ellipsis),
                                ))
                            .toList(),
                        onChanged: (value) =>
                            setState(() => _selectedTemuan = value),
                      ),
                _gap(),
                _label('Koordinat Temuan'),
                TextField(
                  controller: _koorCtrl,
                  readOnly: true,
                  decoration: _decoration(
                    hint: '-2.xxxx, 106.xxxx',
                    suffixIcon: AccurateGpsButton(controller: _koorCtrl),
                  ),
                ),
                _gap(),
                _label('Deskripsi / Catatan Lapangan'),
                TextField(
                  controller: _deskripsiCtrl,
                  maxLines: 3,
                  decoration:
                      _decoration(hint: 'Tuliskan kondisi temuan...'),
                ),
                const SizedBox(height: 18),
                _label(
                    'Foto Dokumentasi (Temuan & ${_isJaringan ? 'Tiang' : 'Gardu'})'),
                Row(children: [
                  Expanded(
                    child: _fotoSlot(
                      'Foto Temuan',
                      _fotoTemuan,
                      () => _pickFoto(1),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _fotoSlot(
                      _isJaringan ? 'Foto Tiang' : 'Foto Gardu',
                      _fotoTiangOrGardu,
                      () => _pickFoto(2),
                    ),
                  ),
                ]),
                const SizedBox(height: 24),
                SizedBox(
                  height: 50,
                  child: ElevatedButton.icon(
                    onPressed: _saving ? null : _handleSimpan,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.navy700,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    icon: _saving
                        ? const SizedBox.square(
                            dimension: 19,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.save_rounded),
                    label: Text(
                      _saving ? 'Menyimpan...' : 'Simpan Temuan',
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
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
            border: Border.all(
              color: file == null
                  ? const Color(0xFFDCE3EC)
                  : AppColors.success700,
            ),
          ),
          child: file != null
              ? Stack(fit: StackFit.expand, children: [
                  Image.file(file, fit: BoxFit.cover),
                  const Positioned(
                    right: 6,
                    top: 6,
                    child: CircleAvatar(
                      radius: 12,
                      backgroundColor: AppColors.success700,
                      child: Icon(Icons.check_rounded,
                          size: 16, color: Colors.white),
                    ),
                  ),
                ])
              : Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const Icon(Icons.add_a_photo_rounded,
                      color: Color(0xFF64748B)),
                  const SizedBox(height: 6),
                  Text(
                    label,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ]),
        ),
      ),
    );
  }
}
