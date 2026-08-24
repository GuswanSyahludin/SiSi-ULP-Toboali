import 'dart:async';

import 'package:flutter/material.dart';

import '../db/repositories/teknik_to_repository.dart';
import '../theme/app_colors.dart';
import '../widgets/custom_loading_widget.dart';

class TeknikToScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final String mode;
  final VoidCallback? onBack;
  const TeknikToScreen({super.key, required this.sesi, required this.mode, this.onBack});

  @override
  State<TeknikToScreen> createState() => _TeknikToScreenState();
}

class _TeknikToScreenState extends State<TeknikToScreen> {
  final repo = TeknikToRepository();
  final search = TextEditingController();
  List<Map<String, dynamic>> rows = [];
  bool firstLoad = true;
  bool syncing = false;
  String? warning;

  bool get moving => widget.mode == 'move';
  String get token => (widget.sesi['token'] ?? '').toString();
  String get title => moving ? 'Pindah Tim Eksekusi TO' : 'Penugasan Tim';

  @override
  void initState() {
    super.initState();
    search.addListener(() => setState(() {}));
    _openLocal();
  }

  @override
  void dispose() { search.dispose(); super.dispose(); }

  Future<void> _openLocal() async {
    final local = await repo.cachedList(widget.mode);
    if (!mounted) return;
    setState(() { rows = local; firstLoad = false; });
    unawaited(_refresh(silent: local.isNotEmpty));
  }

  Future<void> _refresh({bool silent = false}) async {
    if (syncing) return;
    setState(() { syncing = true; if (!silent) warning = null; });
    try {
      final fresh = await repo.refreshList(token, widget.mode);
      if (!mounted) return;
      setState(() { rows = fresh; warning = null; syncing = false; });
    } catch (_) {
      if (!mounted) return;
      setState(() { syncing = false; warning = rows.isEmpty ? 'Belum ada data lokal. Jalankan Sinkron Semua Data saat online.' : 'Offline, menampilkan data terakhir.'; });
    }
  }

  List<Map<String, dynamic>> get filtered {
    final q = search.text.trim().toLowerCase();
    if (q.isEmpty) return rows;
    return rows.where((r) => ['kodePekerjaan','temuan','penyulang','section','nomorTiang','nomorGardu','timEksekusi']
      .any((k) => '${r[k] ?? ''}'.toLowerCase().contains(q))).toList();
  }

  void _back() => widget.onBack != null ? widget.onBack!() : Navigator.maybePop(context);

  @override
  Widget build(BuildContext context) {
    final data = filtered;
    return Stack(children: [
      Scaffold(
        backgroundColor: const Color(0xFFF5F7FB),
        appBar: AppBar(
          backgroundColor: AppColors.navy700,
          foregroundColor: Colors.white,
          leading: IconButton(onPressed: _back, icon: const Icon(Icons.arrow_back_rounded)),
          title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
            Text('Data lokal, buka tanpa menunggu server', style: TextStyle(fontSize: 10, color: Colors.white.withOpacity(.72))),
          ]),
          actions: [
            Padding(padding: const EdgeInsets.only(right: 8), child: Center(child: _SyncBadge(syncing: syncing))),
          ],
        ),
        body: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(15, 14, 15, 8),
            child: TextField(
              controller: search,
              decoration: InputDecoration(
                hintText: 'Cari gardu, tiang, temuan...',
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: IconButton(onPressed: syncing ? null : () => _refresh(), icon: const Icon(Icons.sync_rounded)),
                filled: true, fillColor: Colors.white,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppColors.neutral200)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppColors.neutral200)),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(17, 2, 17, 10),
            child: Row(children: [
              Text('${data.length} ${moving ? 'TO aktif' : 'TO perlu tim'}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: AppColors.navy700)),
              const Spacer(),
              const Icon(Icons.offline_bolt_rounded, size: 14, color: AppColors.success700),
              const SizedBox(width: 4),
              const Text('Offline siap', style: TextStyle(fontSize: 10, color: AppColors.neutral500)),
            ]),
          ),
          if (warning != null) Container(
            width: double.infinity, margin: const EdgeInsets.fromLTRB(15, 0, 15, 10), padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: const Color(0xFFFFF7E6), borderRadius: BorderRadius.circular(12)),
            child: Text(warning!, style: const TextStyle(fontSize: 11, color: AppColors.amber700)),
          ),
          Expanded(child: firstLoad
            ? const SizedBox.expand()
            : data.isEmpty ? _Empty(moving: moving)
            : RefreshIndicator(onRefresh: _refresh, child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(14, 0, 14, 24),
                itemCount: data.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (_, i) => _ticket(data[i]),
              )),
          ),
        ]),
      ),
      if (firstLoad) const Positioned.fill(child: Material(color: Color(0xFFF5F7FB), child: SafeArea(child: CustomLoadingWidget(message: 'Membuka data lokal...', size: 88)))),
    ]);
  }

  Widget _ticket(Map<String, dynamic> r) {
    final gardu = '${r['nomorGardu'] ?? ''}'.trim();
    final tiang = '${r['nomorTiang'] ?? ''}'.trim();
    final current = '${r['timEksekusi'] ?? ''}'.trim();
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: () => _detail(r), borderRadius: BorderRadius.circular(18),
        child: Container(
          decoration: BoxDecoration(border: Border.all(color: AppColors.neutral200), borderRadius: BorderRadius.circular(18)),
          child: Column(children: [
            Padding(padding: const EdgeInsets.fromLTRB(14, 14, 14, 12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Container(width: 38, height: 38, decoration: BoxDecoration(color: AppColors.cyan100, borderRadius: BorderRadius.circular(12)), child: Icon(gardu.isNotEmpty ? Icons.electrical_services_rounded : Icons.alt_route_rounded, color: AppColors.navy700, size: 20)),
                const SizedBox(width: 10),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('${r['kodePekerjaan'] ?? '-'}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 10, color: AppColors.neutral500)),
                  const SizedBox(height: 3),
                  Text('${r['temuan'] ?? '-'}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, height: 1.25)),
                ])),
                Text('${r['tanggal'] ?? ''}', style: const TextStyle(fontSize: 9, color: AppColors.neutral400)),
              ]),
              const SizedBox(height: 12),
              Row(children: [
                const Icon(Icons.route_rounded, size: 15, color: AppColors.cyan600), const SizedBox(width: 6),
                Expanded(child: Text('${r['penyulang'] ?? '-'}  •  ${r['section'] ?? '-'}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700))),
              ]),
              const SizedBox(height: 9),
              Wrap(spacing: 6, runSpacing: 6, children: [
                _chip('${r['tier'] ?? '-'}', highlight: '${r['tier']}'.contains('1')),
                if (gardu.isNotEmpty || tiang.isNotEmpty) _chip(gardu.isNotEmpty ? 'Gardu $gardu' : 'Tiang $tiang'),
                _chip('${r['objek'] ?? '-'}'),
              ]),
            ])),
            Container(
              padding: const EdgeInsets.fromLTRB(13, 10, 11, 10),
              decoration: const BoxDecoration(color: Color(0xFFF9FAFC), borderRadius: BorderRadius.vertical(bottom: Radius.circular(18))),
              child: Row(children: [
                Container(width: 31, height: 31, alignment: Alignment.center, decoration: BoxDecoration(color: current.isEmpty ? AppColors.neutral200 : AppColors.navy700, borderRadius: BorderRadius.circular(10)), child: Text(current.isEmpty ? '?' : _initial(current), style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: current.isEmpty ? AppColors.neutral500 : Colors.white))),
                const SizedBox(width: 9),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('TIM EKSEKUSI', style: TextStyle(fontSize: 8, letterSpacing: .6, color: AppColors.neutral400)),
                  Text(current.isEmpty ? 'Belum ditentukan' : current, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
                ])),
                Container(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9), decoration: BoxDecoration(color: moving ? AppColors.cyan100 : AppColors.navy700, borderRadius: BorderRadius.circular(11)), child: Text(moving ? 'Pindahkan' : 'Tugaskan', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: moving ? AppColors.navy700 : Colors.white))),
              ]),
            ),
          ]),
        ),
      ),
    );
  }

  Widget _chip(String text, {bool highlight = false}) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
    decoration: BoxDecoration(color: highlight ? const Color(0xFFFFF3D6) : AppColors.neutral100, borderRadius: BorderRadius.circular(20)),
    child: Text(text.trim().isEmpty ? '-' : text, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: highlight ? AppColors.amber700 : AppColors.neutral500)),
  );

  String _initial(String value) => value.split(RegExp(r'\s+')).where((x) => x.isNotEmpty).take(2).map((x) => x[0]).join().toUpperCase();

  Future<void> _detail(Map<String, dynamic> row) async {
    final changed = await showModalBottomSheet<bool>(
      context: context, isScrollControlled: true, useSafeArea: true, backgroundColor: Colors.transparent,
      builder: (_) => _ToDetailSheet(sesi: widget.sesi, mode: widget.mode, row: row),
    );
    if (changed == true && mounted) {
      setState(() => rows.removeWhere((x) => x['kodePekerjaan'] == row['kodePekerjaan']));
      unawaited(_refresh(silent: true));
    }
  }
}

class _SyncBadge extends StatelessWidget {
  final bool syncing; const _SyncBadge({required this.syncing});
  @override Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: [
    if (syncing) const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 1.5, color: Colors.white)) else const Icon(Icons.cloud_done_rounded, size: 15, color: Color(0xFF86EFAC)),
    const SizedBox(width: 5), Text(syncing ? 'Sinkron' : 'Lokal', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700)),
  ]);
}

class _Empty extends StatelessWidget {
  final bool moving; const _Empty({required this.moving});
  @override Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(30), child: Column(mainAxisSize: MainAxisSize.min, children: [
    const Icon(Icons.task_alt_rounded, size: 48, color: AppColors.success700), const SizedBox(height: 12),
    Text(moving ? 'Tidak ada TO yang dapat dipindahkan' : 'Semua TO sudah memiliki tim', textAlign: TextAlign.center, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
    const SizedBox(height: 5), const Text('Tarik ke bawah saat online untuk memperbarui data.', textAlign: TextAlign.center, style: TextStyle(fontSize: 11, color: AppColors.neutral500)),
  ])));
}

class _ToDetailSheet extends StatefulWidget {
  final Map<String, dynamic> sesi, row; final String mode;
  const _ToDetailSheet({required this.sesi, required this.mode, required this.row});
  @override State<_ToDetailSheet> createState() => _ToDetailSheetState();
}

class _ToDetailSheetState extends State<_ToDetailSheet> {
  final repo = TeknikToRepository();
  final note = TextEditingController();
  List<String> teams = []; String? selected, error; bool loading = true, saving = false;

  @override void initState() { super.initState(); _loadTeams(); }
  @override void dispose() { note.dispose(); super.dispose(); }

  Future<void> _loadTeams() async {
    var local = await repo.cachedTeams();
    final current = '${widget.row['timEksekusi'] ?? ''}'.trim().toLowerCase();
    local = local.where((x) => x.toLowerCase() != current).toList();
    if (mounted) setState(() { teams = local; loading = false; });
    try {
      final fresh = await repo.refreshTeams('${widget.sesi['token'] ?? ''}');
      if (mounted) setState(() => teams = fresh.where((x) => x.toLowerCase() != current).toList());
    } catch (_) {}
  }

  Future<void> _save() async {
    if (selected == null) return;
    setState(() { saving = true; error = null; });
    try {
      await repo.assign(token: '${widget.sesi['token'] ?? ''}', mode: widget.mode, kode: '${widget.row['kodePekerjaan']}', tim: selected!, catatan: note.text.trim());
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) setState(() { saving = false; error = e.toString().replaceFirst('Exception: ', ''); });
    }
  }

  @override Widget build(BuildContext context) => Stack(children: [
    DraggableScrollableSheet(expand: false, initialChildSize: .9, minChildSize: .62, maxChildSize: .98, builder: (_, controller) => Material(
      color: const Color(0xFFF7F9FC), borderRadius: const BorderRadius.vertical(top: Radius.circular(26)), clipBehavior: Clip.antiAlias,
      child: Column(children: [
        Container(width: 42, height: 4, margin: const EdgeInsets.symmetric(vertical: 12), decoration: BoxDecoration(color: AppColors.neutral300, borderRadius: BorderRadius.circular(4))),
        Padding(padding: const EdgeInsets.fromLTRB(18, 0, 8, 10), child: Row(children: [
          Expanded(child: Text('${widget.row['temuan'] ?? 'Detail TO'}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.navy700))),
          IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close_rounded)),
        ])),
        Expanded(child: ListView(controller: controller, padding: const EdgeInsets.fromLTRB(18, 4, 18, 24), children: [
          _details(), const SizedBox(height: 18),
          const Text('Tim Eksekusi', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900)), const SizedBox(height: 7),
          DropdownButtonFormField<String>(value: selected, isExpanded: true, decoration: InputDecoration(hintText: teams.isEmpty ? 'Belum ada tim lokal' : 'Pilih tim', filled: true, fillColor: Colors.white, border: OutlineInputBorder(borderRadius: BorderRadius.circular(13))), items: teams.map((x) => DropdownMenuItem(value: x, child: Text(x))).toList(), onChanged: loading ? null : (v) => setState(() => selected = v)),
          const SizedBox(height: 12),
          TextField(controller: note, maxLines: 3, decoration: InputDecoration(labelText: 'Catatan SPV (opsional)', filled: true, fillColor: Colors.white, border: OutlineInputBorder(borderRadius: BorderRadius.circular(13)))),
          if (error != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(error!, style: const TextStyle(fontSize: 11, color: AppColors.red600))),
        ])),
        SafeArea(top: false, child: Container(color: Colors.white, padding: const EdgeInsets.fromLTRB(18, 12, 18, 14), child: SizedBox(width: double.infinity, height: 48, child: ElevatedButton(onPressed: saving || selected == null ? null : _save, style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(13))), child: Text(widget.mode == 'move' ? 'Pindahkan Tim Eksekusi' : 'Simpan Penugasan', style: const TextStyle(fontWeight: FontWeight.w900))))),
      ]),
    )),
    if (saving) const Positioned.fill(child: Material(color: Color(0xFFF7F9FC), child: SafeArea(child: CustomLoadingWidget(message: 'Menyimpan ke antrean lokal...', size: 88)))),
  ]);

  Widget _details() {
    final values = <(String,String)>[
      ('Kode', '${widget.row['kodePekerjaan'] ?? '-'}'), ('Objek', '${widget.row['objek'] ?? '-'}'),
      ('Tanggal', '${widget.row['tanggal'] ?? '-'}'), ('Penyulang', '${widget.row['penyulang'] ?? '-'}'),
      ('Section', '${widget.row['section'] ?? '-'}'), ('Tier', '${widget.row['tier'] ?? '-'}'),
      ('Deskripsi', '${widget.row['deskripsi'] ?? '-'}'), ('Tim saat ini', '${widget.row['timEksekusi'] ?? '-'}'),
    ];
    return Container(padding: const EdgeInsets.all(15), decoration: BoxDecoration(color: Colors.white, border: Border.all(color: AppColors.neutral200), borderRadius: BorderRadius.circular(16)), child: Column(children: values.map((v) => Padding(padding: const EdgeInsets.symmetric(vertical: 5), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [SizedBox(width: 92, child: Text(v.$1, style: const TextStyle(fontSize: 10, color: AppColors.neutral500))), Expanded(child: Text(v.$2.trim().isEmpty ? '-' : v.$2, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800)))]))).toList()));
  }
}
