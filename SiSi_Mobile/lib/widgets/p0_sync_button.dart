import 'package:flutter/material.dart';

import '../services/p0_sync_action.dart';

/// Inline sync control for Verifikasi P0. The screen owns the repository and
/// refresh callback so this widget cannot create a second sync path.
class P0SyncButton extends StatefulWidget {
  const P0SyncButton({
    super.key,
    required this.pending,
    required this.action,
    required this.onComplete,
  });

  final int pending;
  final P0SyncAction action;
  final Future<void> Function(Map<String, dynamic> result) onComplete;

  @override
  State<P0SyncButton> createState() => _P0SyncButtonState();
}

class _P0SyncButtonState extends State<P0SyncButton> {
  bool _running = false;

  Future<void> _sync() async {
    if (_running || widget.pending == 0) return;
    setState(() => _running = true);
    try {
      final result = await widget.action.run();
      if (!mounted) return;
      await widget.onComplete(result);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(P0SyncAction.message(result))),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    } finally {
      if (mounted) setState(() => _running = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final disabled = _running || widget.pending == 0;
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFE8F0FF),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              widget.pending == 0
                  ? 'Tidak ada perubahan P0 yang menunggu.'
                  : '${widget.pending} perubahan lokal belum terkirim.',
              style: const TextStyle(fontSize: 12, color: Color(0xFF18334D)),
            ),
          ),
          FilledButton(
            onPressed: disabled ? null : _sync,
            child: Text(_running ? 'Mengirim…' : 'Sinkron sekarang'),
          ),
        ],
      ),
    );
  }
}
