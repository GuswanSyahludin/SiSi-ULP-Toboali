import 'package:flutter/material.dart';

import '../db/repositories/teknik_to_repository.dart';
import '../theme/app_colors.dart';
import '../widgets/custom_loading_widget.dart';

class TeknikToScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final String mode;
  final VoidCallback? onBack;

  const TeknikToScreen({
    super.key,
    required this.sesi,
    required this.mode,
    this.onBack,
  });

  @override
  State<TeknikToScreen> createState() => _TeknikToScreenState();
}

class _TeknikToScreenState extends State<TeknikToScreen> {
  final repo = TeknikToRepository();
  List<Map<String, dynamic>> rows = [];
  bool loading = true;
  String? error;

  bool get moving => widget.mode == 'move';
  String get title => moving ? 'Pindah Tim Eksekusi TO' : 'Penugasan Tim';
  String get token => (widget.sesi['token'] ?? '').toString();

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final data = await repo.list(token, widget.mode);
      if (!mounted) return;
      setState(() {
        rows = data;
        loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        error = e.toString().replaceFirst('Exception: ', '');
        loading = false;
      });
    }
  }

  void _back() {
    if (widget.onBack != null) {
      widget.onBack!();
    } else {
      Navigator.maybePop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Scaffold(
          backgroundColor: const Color(0xFFF6F8FC),
          appBar: AppBar(
            backgroundColor: AppColors.navy700,
            foregroundColor: Colors.white,
            leading: IconButton(
              onPressed: _back,
              tooltip: 'Kembali',
              icon: const Icon(Icons.arrow_back_rounded),
            ),
            title: Text(
              title,
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
            ),
            actions: [
              IconButton(
                onPressed: loading ? null : load,
                icon: const Icon(Icons.refresh_rounded),
              ),
            ],
          ),
          body: _body(),
        ),
        if (loading) const _FullScreenLoader(message: 'Memuat data TO...'),
      ],
    );
  }

  Widget _body() {
    if (loading) return const SizedBox.expand();
    if (error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.cloud_off_rounded,
                size: 44,
                color: AppColors.neutral400,
              ),
              const SizedBox(height: 10),
              Text(error!, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              ElevatedButton(onPressed: load, child: const Text('Coba Lagi')),
            ],
          ),
        ),
      );
    }
    if (rows.isEmpty) {
      return Center(
        child: Text(
          moving
              ? 'Tidak ada TO yang dapat dipindahkan.'
              : 'Tidak ada TO yang menunggu penugasan.',
          style: const TextStyle(color: AppColors.neutral500),
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: load,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: rows.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) => _card(rows[i]),
      ),
    );
  }

  Widget _card(Map<String, dynamic> row) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(15),
      child: InkWell(
        onTap: () => _detail(row),
        borderRadius: BorderRadius.circular(15),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${row['kodePekerjaan'] ?? '-'}',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                  color: AppColors.navy700,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              Text(
                '${row['temuan'] ?? '-'}',
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 4),
              Text(
                '${row['penyulang'] ?? '-'} • ${row['section'] ?? '-'}',
                style: const TextStyle(fontSize: 11, color: AppColors.neutral500),
              ),
              if ('${row['timEksekusi'] ?? ''}'.trim().isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  'Tim saat ini: ${row['timEksekusi']}',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: AppColors.cyan600,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _detail(Map<String, dynamic> row) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ToDetailSheet(
        sesi: widget.sesi,
        mode: widget.mode,
        row: row,
      ),
    );
    if (mounted) load();
  }
}

class _FullScreenLoader extends StatelessWidget {
  final String message;
  const _FullScreenLoader({required this.message});

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: Material(
        color: const Color(0xFFF6F8FC),
        child: SafeArea(
          child: CustomLoadingWidget(message: message, size: 96),
        ),
      ),
    );
  }
}

class _ToDetailSheet extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final Map<String, dynamic> row;
  final String mode;

  const _ToDetailSheet({
    required this.sesi,
    required this.mode,
    required this.row,
  });

  @override
  State<_ToDetailSheet> createState() => _ToDetailSheetState();
}

class _ToDetailSheetState extends State<_ToDetailSheet> {
  final repo = TeknikToRepository();
  final note = TextEditingController();
  List<String> teams = [];
  String? selected;
  bool loading = true;
  bool saving = false;
  String? error;

  @override
  void initState() {
    super.initState();
    loadTeams();
  }

  @override
  void dispose() {
    note.dispose();
    super.dispose();
  }

  Future<void> loadTeams() async {
    try {
      final list = await repo.teams(
        '${widget.sesi['token'] ?? ''}',
        '${widget.row['timEksekusi'] ?? ''}',
      );
      if (!mounted) return;
      setState(() {
        teams = list;
        loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        error = e.toString().replaceFirst('Exception: ', '');
        loading = false;
      });
    }
  }

  Future<void> save() async {
    if (selected == null) return;
    setState(() {
      saving = true;
      error = null;
    });
    try {
      await repo.assign(
        token: '${widget.sesi['token'] ?? ''}',
        mode: widget.mode,
        kode: '${widget.row['kodePekerjaan']}',
        tim: selected!,
        catatan: note.text.trim(),
      );
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            widget.mode == 'move'
                ? 'Tim Eksekusi berhasil dipindahkan.'
                : 'Tim Eksekusi berhasil ditugaskan.',
          ),
          backgroundColor: AppColors.success700,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        error = e.toString().replaceFirst('Exception: ', '');
        saving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        DraggableScrollableSheet(
          expand: false,
          initialChildSize: .92,
          minChildSize: .65,
          maxChildSize: .98,
          builder: (_, controller) => Material(
            color: const Color(0xFFF7F9FC),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                Container(
                  width: 42,
                  height: 4,
                  margin: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    color: AppColors.neutral300,
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(18, 0, 8, 10),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          '${widget.row['kodePekerjaan']}',
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w900,
                            color: AppColors.navy700,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.close_rounded),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: ListView(
                    controller: controller,
                    padding: const EdgeInsets.fromLTRB(18, 4, 18, 24),
                    children: [
                      _section('Rincian Temuan', [
                        ('Objek', '${widget.row['objek'] ?? '-'}'),
                        ('Tanggal', '${widget.row['tanggal'] ?? '-'}'),
                        ('Penyulang', '${widget.row['penyulang'] ?? '-'}'),
                        ('Section', '${widget.row['section'] ?? '-'}'),
                        ('Segmen', '${widget.row['segmen'] ?? '-'}'),
                        ('Nomor Tiang/Gardu', _number()),
                        ('Tier', '${widget.row['tier'] ?? '-'}'),
                        ('Temuan', '${widget.row['temuan'] ?? '-'}'),
                        ('Deskripsi', '${widget.row['deskripsi'] ?? '-'}'),
                        ('Koordinat', '${widget.row['koordinat'] ?? '-'}'),
                        ('Tim Eksekusi Saat Ini', '${widget.row['timEksekusi'] ?? '-'}'),
                      ]),
                      const SizedBox(height: 14),
                      const Text(
                        'Tim Eksekusi',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 6),
                      DropdownButtonFormField<String>(
                        value: selected,
                        isExpanded: true,
                        decoration: InputDecoration(
                          hintText: 'Pilih tim eksekusi',
                          filled: true,
                          fillColor: Colors.white,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        items: teams
                            .map((team) => DropdownMenuItem(
                                  value: team,
                                  child: Text(team),
                                ))
                            .toList(),
                        onChanged: loading ? null : (value) => setState(() => selected = value),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: note,
                        maxLines: 3,
                        decoration: InputDecoration(
                          labelText: 'Catatan SPV (opsional)',
                          filled: true,
                          fillColor: Colors.white,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                      if (error != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 10),
                          child: Text(
                            error!,
                            style: const TextStyle(color: AppColors.red600, fontSize: 11),
                          ),
                        ),
                    ],
                  ),
                ),
                SafeArea(
                  top: false,
                  child: Container(
                    color: Colors.white,
                    padding: const EdgeInsets.fromLTRB(18, 12, 18, 14),
                    child: SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        onPressed: loading || saving || selected == null ? null : save,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.navy700,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: Text(
                          widget.mode == 'move'
                              ? 'Pindahkan Tim Eksekusi'
                              : 'Simpan Penugasan',
                          style: const TextStyle(fontWeight: FontWeight.w900),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (loading || saving)
          _FullScreenLoader(
            message: saving ? 'Menyimpan penugasan...' : 'Memuat daftar tim...',
          ),
      ],
    );
  }

  String _number() {
    final gardu = '${widget.row['nomorGardu'] ?? ''}'.trim();
    final tiang = '${widget.row['nomorTiang'] ?? ''}'.trim();
    return gardu.isNotEmpty ? gardu : (tiang.isNotEmpty ? tiang : '-');
  }

  Widget _section(String title, List<(String, String)> rows) {
    return Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: AppColors.neutral200),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title.toUpperCase(),
            style: const TextStyle(
              fontSize: 10,
              letterSpacing: 1,
              fontWeight: FontWeight.w900,
              color: AppColors.cyan600,
            ),
          ),
          const SizedBox(height: 8),
          ...rows.map(
            (row) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 5),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 126,
                    child: Text(
                      row.$1,
                      style: const TextStyle(fontSize: 11, color: AppColors.neutral500),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      row.$2.trim().isEmpty ? '-' : row.$2,
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
