import 'dart:io';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';

import '../db/repositories/inspeksi_gardu_repository.dart';
import '../db/repositories/master_repository.dart';
import '../theme/app_colors.dart';

class InputTemuanTeknikScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  const InputTemuanTeknikScreen({super.key, required this.sesi});

  @override
  State<InputTemuanTeknikScreen> createState() =>
      _InputTemuanTeknikScreenState();
}

class _InputTemuanTeknikScreenState extends State<InputTemuanTeknikScreen> {
  String _objekInspeksi = 'Jaringan';
  String? _selectedPenyulang;
  String? _selectedSection;
  String _selectedTier = 'Tier 1';
  String? _selectedTemuan;

  final _tiangCtrl = TextEditingController();
  final _garduCtrl = TextEditingController();
  final _koorCtrl = TextEditingController();
  final _deskripsiCtrl = TextEditingController();

  List<String> _listPenyulang = [];
  Map<String, List<String>> _sectionMap = {};
  List<String> _listTemuan = [];

  bool _loadingDropdown = true;
  bool _loadingTemuan = true;
  bool _saving = false;

  File? _fotoTemuan;
  File? _fotoTiangOrGardu;
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _loadDropdown();
  }

  Future<void> _loadDropdown() async {
    try {
      final repo = MasterRepository();
      final pList = await repo.daftarPenyulang();
      final sMap = await repo.sectionByPenyulang();

      if (pList.isNotEmpty) {
        if (!mounted) return;
        setState(() {
          _listPenyulang = pList;
          _selectedPenyulang = pList.first;
          _sectionMap = sMap;
          _selectedSection = (sMap[_selectedPenyulang] ?? ['Section A']).first;
          _loadingDropdown = false;
        });
        _loadTemuanByTierAndObjek();
        return;
      }
    } catch (_) {}

    if (!mounted) return;
    setState(() {
      _listPenyulang = ['TBL-01', 'TBL-02', 'TBL-03', 'TBL-04'];
      _selectedPenyulang = _listPenyulang.first;
      _selectedSection = 'Section A';
      _loadingDropdown = false;
    });
    _loadTemuanByTierAndObjek();
  }

  Future<void> _loadTemuanByTierAndObjek() async {
    setState(() => _loadingTemuan = true);
    try {
      final repo = InspeksiGarduRepository();
      final list = await repo.pilihan(_selectedTier);
      final filtered = list
          .where((x) =>
              x.objekInspeksi
                  .toLowerCase()
                  .contains(_objekInspeksi.toLowerCase()) ||
              x.objekInspeksi.isEmpty)
          .map((x) => x.temuan)
          .toList();

      if (filtered.isNotEmpty) {
        if (!mounted) return;
        setState(() {
          _listTemuan = filtered;
          _selectedTemuan = filtered.first;
          _loadingTemuan = false;
        });
        return;
      }
    } catch (_) {}

    if (!mounted) return;
    final fallbackJaringan = _selectedTier == 'Tier 1'
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

    final fallbackGardu = _selectedTier == 'Tier 1'
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

    final listPilihan =
        _objekInspeksi == 'Jaringan' ? fallbackJaringan : fallbackGardu;
    setState(() {
      _listTemuan = listPilihan;
      _selectedTemuan = listPilihan.first;
      _loadingTemuan = false;
    });
  }

  Future<void> _getCurrentLocation() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Layanan lokasi GPS belum aktif')),
      );
      return;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return;
    }

    Position position = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.bestForNavigation,
    );

    _koorCtrl.text = '${position.latitude}, ${position.longitude}';
  }

  Future<void> _pickFoto(int slot) async {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt_rounded,
                  color: AppColors.navy700),
              title: const Text('Ambil dari Kamera Lapangan'),
              onTap: () async {
                Navigator.pop(ctx);
                final picked = await _picker.pickImage(
                    source: ImageSource.camera, imageQuality: 70);
                if (picked != null) {
                  setState(() {
                    if (slot == 1) _fotoTemuan = File(picked.path);
                    if (slot == 2) _fotoTiangOrGardu = File(picked.path);
                  });
                }
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_rounded,
                  color: AppColors.navy700),
              title: const Text('Pilih dari Galeri'),
              onTap: () async {
                Navigator.pop(ctx);
                final picked = await _picker.pickImage(
                    source: ImageSource.gallery, imageQuality: 70);
                if (picked != null) {
                  setState(() {
                    if (slot == 1) _fotoTemuan = File(picked.path);
                    if (slot == 2) _fotoTiangOrGardu = File(picked.path);
                  });
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleSimpan() async {
    if (_selectedTemuan == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pilih jenis temuan')),
      );
      return;
    }

    setState(() => _saving = true);
    await Future<void>.delayed(const Duration(milliseconds: 300));
    if (!mounted) return;

    setState(() => _saving = false);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Temuan berhasil disimpan'),
        backgroundColor: Colors.green,
      ),
    );
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final isJaringan = _objekInspeksi == 'Jaringan';

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FC),
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Input Temuan',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
            Text('${widget.sesi['ulp'] ?? 'Toboali'}',
                style: const TextStyle(fontSize: 12, color: Colors.white70)),
          ],
        ),
      ),
      body: _loadingDropdown
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text('Objek Inspeksi',
                    style:
                        TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  value: _objekInspeksi,
                  decoration: InputDecoration(
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10)),
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 12),
                    filled: true,
                    fillColor: Colors.white,
                  ),
                  items: ['Jaringan', 'Gardu']
                      .map((o) => DropdownMenuItem(value: o, child: Text(o)))
                      .toList(),
                  onChanged: (val) {
                    if (val == null) return;
                    setState(() => _objekInspeksi = val);
                    _loadTemuanByTierAndObjek();
                  },
                ),
                const SizedBox(height: 12),
                const Text('Penyulang',
                    style:
                        TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  value: _selectedPenyulang,
                  decoration: InputDecoration(
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10)),
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 12),
                    filled: true,
                    fillColor: Colors.white,
                  ),
                  items: _listPenyulang
                      .map((p) => DropdownMenuItem(value: p, child: Text(p)))
                      .toList(),
                  onChanged: (val) {
                    if (val == null) return;
                    setState(() {
                      _selectedPenyulang = val;
                      final secs = _sectionMap[val] ?? ['Section A'];
                      _selectedSection = secs.first;
                    });
                  },
                ),
                const SizedBox(height: 12),
                const Text('Section',
                    style:
                        TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  value: _selectedSection,
                  decoration: InputDecoration(
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10)),
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 12),
                    filled: true,
                    fillColor: Colors.white,
                  ),
                  items: (_sectionMap[_selectedPenyulang] ??
                          ['Section A', 'Section B'])
                      .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                      .toList(),
                  onChanged: (val) => setState(() => _selectedSection = val),
                ),
                const SizedBox(height: 12),
                if (isJaringan) ...[
                  const Text('Nomor Tiang',
                      style:
                          TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _tiangCtrl,
                    decoration: InputDecoration(
                      hintText: 'Contoh: 07',
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10)),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 12),
                    ),
                  ),
                ] else ...[
                  const Text('Nomor Gardu',
                      style:
                          TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _garduCtrl,
                    decoration: InputDecoration(
                      hintText: 'Contoh: GT.TBL-012',
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10)),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 12),
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                const Text('Tier',
                    style:
                        TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  value: _selectedTier,
                  decoration: InputDecoration(
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10)),
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 12),
                    filled: true,
                    fillColor: Colors.white,
                  ),
                  items: ['Tier 1', 'Tier 2']
                      .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                      .toList(),
                  onChanged: (val) {
                    if (val == null) return;
                    setState(() => _selectedTier = val);
                    _loadTemuanByTierAndObjek();
                  },
                ),
                const SizedBox(height: 12),
                const Text('Temuan',
                    style:
                        TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                _loadingTemuan
                    ? const Center(child: CircularProgressIndicator())
                    : DropdownButtonFormField<String>(
                        value: _selectedTemuan,
                        isExpanded: true,
                        decoration: InputDecoration(
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 12),
                          filled: true,
                          fillColor: Colors.white,
                        ),
                        items: _listTemuan
                            .map((t) => DropdownMenuItem(
                                value: t,
                                child:
                                    Text(t, overflow: TextOverflow.ellipsis)))
                            .toList(),
                        onChanged: (val) =>
                            setState(() => _selectedTemuan = val),
                      ),
                const SizedBox(height: 12),
                const Text('Koordinat Temuan',
                    style:
                        TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                TextField(
                  controller: _koorCtrl,
                  decoration: InputDecoration(
                    hintText: '-2.xxxx, 106.xxxx',
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10)),
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 12),
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.my_location,
                          color: Color(0xFF0284C7)),
                      onPressed: _getCurrentLocation,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                const Text('Deskripsi / Catatan Lapangan',
                    style:
                        TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                TextField(
                  controller: _deskripsiCtrl,
                  maxLines: 2,
                  decoration: InputDecoration(
                    hintText: 'Tuliskan catatan kondisi temuan...',
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10)),
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 12),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  'Foto Dokumentasi (Temuan & ${isJaringan ? 'Tiang' : 'Gardu'})',
                  style: const TextStyle(
                      fontSize: 12, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                        child: _buildFotoSlot(
                            'Foto Temuan', _fotoTemuan, () => _pickFoto(1))),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _buildFotoSlot(
                        isJaringan ? 'Foto Tiang' : 'Foto Gardu',
                        _fotoTiangOrGardu,
                        () => _pickFoto(2),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.navy700,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: _saving ? null : _handleSimpan,
                    child: _saving
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white),
                          )
                        : const Text('Simpan Temuan',
                            style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                                fontSize: 15)),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildFotoSlot(String label, File? file, VoidCallback onTap) {
    return Container(
      height: 84,
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
            color: file != null
                ? const Color(0xFF10B981)
                : const Color(0xFFCBD5E1)),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: file != null
            ? ClipRRect(
                borderRadius: BorderRadius.circular(9),
                child: Image.file(file, fit: BoxFit.cover),
              )
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.add_a_photo,
                      size: 20, color: Color(0xFF64748B)),
                  const SizedBox(height: 4),
                  Text(label,
                      style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF64748B))),
                ],
              ),
      ),
    );
  }
}
