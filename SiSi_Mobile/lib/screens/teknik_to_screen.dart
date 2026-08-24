import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

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
  List<String> availableTeams = [];
  final Map<String, String?> selectedTeams = {};
  final Map<String, TextEditingController> notes = {};
  final Set<String> savingCodes = {};
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
  void dispose() {
    search.dispose();
    for (final controller in notes.values) { controller.dispose(); }
    super.dispose();
  }

  Future<void> _openLocal() async {
    final result = await Future.wait([
      repo.cachedList(widget.mode),
      repo.cachedTeams(),
    ]);
    if (!mounted) return;
    setState(() {
      rows = result[0] as List<Map<String, dynamic>>;
      availableTeams = result[1] as List<String>;
      firstLoad = false;
    });
    unawaited(_refresh(silent: rows.isNotEmpty));
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
          title: Text(
            title,
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
          ),
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
    final code = '${r['kodePekerjaan'] ?? ''}';
    final gardu = '${r['nomorGardu'] ?? ''}'.trim();
    final tiang = '${r['nomorTiang'] ?? ''}'.trim();
    final current = '${r['timEksekusi'] ?? ''}'.trim();
    final coordinate = '${r['koordinat'] ?? ''}'.trim();
    final teams = availableTeams
        .where((team) => team.toLowerCase() != current.toLowerCase())
        .toList();
    final note = notes.putIfAbsent(code, TextEditingController.new);
    final saving = savingCodes.contains(code);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: AppColors.neutral200),
        borderRadius: BorderRadius.circular(20),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _gallery(r),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(code,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  fontSize: 10,
                                  color: AppColors.neutral500)),
                          const SizedBox(height: 4),
                          Text('${r['temuan'] ?? '-'}',
                              style: const TextStyle(
                                  fontSize: 15,
                                  height: 1.25,
                                  fontWeight: FontWeight.w900)),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    _chip('${r['tier'] ?? '-'}',
                        highlight: '${r['tier']}'.contains('1')),
                  ],
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(11),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF6F8FC),
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: Column(children: [
                    _detailRow('Objek / Aset',
                        '${r['objek'] ?? '-'} · ${gardu.isNotEmpty ? 'Gardu $gardu' : tiang.isNotEmpty ? 'Tiang $tiang' : '-'}'),
                    _detailRow('Penyulang', '${r['penyulang'] ?? '-'}'),
                    _detailRow('Section', '${r['section'] ?? '-'}'),
                    _detailRow('Tanggal', '${r['tanggal'] ?? '-'}'),
                    _detailRow('Deskripsi', '${r['deskripsi'] ?? '-'}'),
                  ]),
                ),
                if (coordinate.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  InkWell(
                    onTap: () => _openMaps(coordinate),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.cyan100,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.cyan600.withOpacity(.25)),
                      ),
                      child: Row(children: [
                        Container(
                          width: 31,
                          height: 31,
                          decoration: BoxDecoration(
                            color: AppColors.cyan600,
                            borderRadius: BorderRadius.circular(9),
                          ),
                          child: const Icon(Icons.location_on_rounded,
                              color: Colors.white, size: 18),
                        ),
                        const SizedBox(width: 9),
                        Expanded(child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('KOORDINAT TEMUAN',
                                style: TextStyle(fontSize: 8,
                                    letterSpacing: .7,
                                    color: AppColors.neutral500)),
                            Text(coordinate,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 11,
                                    fontWeight: FontWeight.w900,
                                    color: AppColors.navy700)),
                          ],
                        )),
                        const Icon(Icons.open_in_new_rounded,
                            size: 17, color: AppColors.navy700),
                      ]),
                    ),
                  ),
                ],
                if (moving && current.isNotEmpty) ...[
                  const SizedBox(height: 11),
                  Row(children: [
                    _avatar(current),
                    const SizedBox(width: 8),
                    Expanded(child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('TIM SAAT INI',
                            style: TextStyle(fontSize: 8,
                                color: AppColors.neutral400)),
                        Text(current,
                            style: const TextStyle(fontSize: 11,
                                fontWeight: FontWeight.w900)),
                      ],
                    )),
                    const Icon(Icons.arrow_forward_rounded,
                        color: AppColors.cyan600),
                    const SizedBox(width: 4),
                    const Text('Pilih pengganti',
                        style: TextStyle(fontSize: 10,
                            color: AppColors.neutral500)),
                  ]),
                ],
                const SizedBox(height: 13),
                const Text('TIM EKSEKUSI', style: TextStyle(
                    fontSize: 9, letterSpacing: .8,
                    fontWeight: FontWeight.w900,
                    color: AppColors.neutral500)),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  value: selectedTeams[code],
                  isExpanded: true,
                  decoration: InputDecoration(
                    hintText: teams.isEmpty ? 'Belum ada tim lokal' : 'Pilih tim eksekusi',
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(13)),
                  ),
                  items: teams.map((team) => DropdownMenuItem(
                    value: team, child: Text(team))).toList(),
                  onChanged: saving ? null : (value) =>
                      setState(() => selectedTeams[code] = value),
                ),
                const SizedBox(height: 12),
                const Text('CATATAN SPV', style: TextStyle(
                    fontSize: 9, letterSpacing: .8,
                    fontWeight: FontWeight.w900,
                    color: AppColors.neutral500)),
                const SizedBox(height: 6),
                TextField(
                  controller: note,
                  maxLines: 3,
                  maxLength: 180,
                  decoration: InputDecoration(
                    hintText: 'Instruksi atau prioritas untuk tim pelaksana...',
                    filled: true,
                    fillColor: Colors.white,
                    counterStyle: const TextStyle(fontSize: 9),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(13)),
                  ),
                ),
                SizedBox(
                  width: double.infinity,
                  height: 47,
                  child: ElevatedButton(
                    onPressed: saving || selectedTeams[code] == null
                        ? null : () => _saveCard(r, note.text),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.navy700,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(13)),
                    ),
                    child: saving
                        ? const SizedBox(width: 20, height: 20,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : Text(moving ? 'Simpan Pemindahan' : 'Simpan Penugasan',
                            style: const TextStyle(fontWeight: FontWeight.w900)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _gallery(Map<String, dynamic> row) {
    final photos = [
      ('Foto Temuan', '${row['fotoTemuanUrl'] ?? ''}'),
      ('Foto Tiang', '${row['fotoTiangUrl'] ?? ''}'),
    ];
    return SizedBox(
      height: 174,
      child: Row(children: [
        Expanded(flex: 145, child: _photoTile(photos[0].$1, photos[0].$2)),
        const SizedBox(width: 3),
        Expanded(flex: 85, child: _photoTile(photos[1].$1, photos[1].$2)),
      ]),
    );
  }

  Widget _photoTile(String label, String url) {
    return InkWell(
      onTap: url.trim().isEmpty ? null : () => _openPhoto(label, url),
      child: Stack(fit: StackFit.expand, children: [
        if (url.trim().isNotEmpty)
          Image.network(url, fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => _photoFallback())
        else _photoFallback(),
        const DecoratedBox(decoration: BoxDecoration(
          gradient: LinearGradient(begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Colors.transparent, Color(0xB000172A)]),
        )),
        Positioned(left: 8, bottom: 8, child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
          decoration: BoxDecoration(color: AppColors.navy950.withOpacity(.78),
              borderRadius: BorderRadius.circular(8)),
          child: Text(label, style: const TextStyle(fontSize: 9,
              fontWeight: FontWeight.w900, color: Colors.white)),
        )),
        if (url.trim().isNotEmpty)
          Positioned(right: 8, top: 8, child: Container(
            width: 29, height: 29,
            decoration: BoxDecoration(color: Colors.white.withOpacity(.92),
                borderRadius: BorderRadius.circular(9)),
            child: const Icon(Icons.fullscreen_rounded,
                size: 18, color: AppColors.navy700),
          )),
      ]),
    );
  }

  Widget _photoFallback() => Container(
    color: AppColors.neutral200,
    child: const Center(child: Icon(Icons.image_not_supported_outlined,
        color: AppColors.neutral400, size: 30)),
  );

  Widget _detailRow(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SizedBox(width: 84, child: Text(label,
          style: const TextStyle(fontSize: 10, color: AppColors.neutral500))),
      Expanded(child: Text(value.trim().isEmpty ? '-' : value,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800))),
    ]),
  );

  Widget _avatar(String team) => Container(
    width: 30, height: 30, alignment: Alignment.center,
    decoration: BoxDecoration(color: AppColors.navy700,
        borderRadius: BorderRadius.circular(9)),
    child: Text(_initial(team), style: const TextStyle(fontSize: 9,
        fontWeight: FontWeight.w900, color: Colors.white)),
  );

  Future<void> _saveCard(Map<String, dynamic> row, String note) async {
    final code = '${row['kodePekerjaan'] ?? ''}';
    final team = selectedTeams[code];
    if (team == null) return;
    setState(() => savingCodes.add(code));
    try {
      await repo.assign(token: token, mode: widget.mode, kode: code,
          tim: team, catatan: note.trim());
      if (!mounted) return;
      setState(() {
        rows.removeWhere((item) => item['kodePekerjaan'] == code);
        savingCodes.remove(code);
      });
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(moving
            ? 'Pemindahan disimpan.' : 'Penugasan disimpan.'),
        backgroundColor: AppColors.success700,
      ));
      unawaited(_refresh(silent: true));
    } catch (e) {
      if (!mounted) return;
      setState(() => savingCodes.remove(code));
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(e.toString().replaceFirst('Exception: ', '')),
        backgroundColor: AppColors.red600,
      ));
    }
  }

  Future<void> _openPhoto(String label, String url) {
    return showDialog<void>(
      context: context,
      barrierColor: AppColors.navy950.withOpacity(.92),
      builder: (dialogContext) => Dialog.fullscreen(
        backgroundColor: AppColors.navy950,
        child: SafeArea(child: Column(children: [
          SizedBox(height: 54, child: Row(children: [
            const SizedBox(width: 16),
            Expanded(child: Text(label, style: const TextStyle(
                color: Colors.white, fontWeight: FontWeight.w900))),
            IconButton(onPressed: () => Navigator.pop(dialogContext),
                icon: const Icon(Icons.close_rounded, color: Colors.white)),
          ])),
          Expanded(child: InteractiveViewer(
            minScale: .8, maxScale: 5,
            child: Center(child: Image.network(url, fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => const Icon(
                    Icons.broken_image_outlined,
                    size: 56, color: AppColors.neutral400))),
          )),
        ])),
      ),
    );
  }

  Future<void> _openMaps(String coordinate) async {
    final cleaned = coordinate.replaceAll(RegExp(r'\s+'), '');
    final uri = Uri.parse(
        'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(cleaned)}');
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication) && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Google Maps tidak dapat dibuka.')),
      );
    }
  }

  Widget _chip(String text, {bool highlight = false}) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
    decoration: BoxDecoration(color: highlight ? const Color(0xFFFFF3D6) : AppColors.neutral100, borderRadius: BorderRadius.circular(20)),
    child: Text(text.trim().isEmpty ? '-' : text, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: highlight ? AppColors.amber700 : AppColors.neutral500)),
  );

  String _initial(String value) => value.split(RegExp(r'\s+')).where((x) => x.isNotEmpty).take(2).map((x) => x[0]).join().toUpperCase();


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
