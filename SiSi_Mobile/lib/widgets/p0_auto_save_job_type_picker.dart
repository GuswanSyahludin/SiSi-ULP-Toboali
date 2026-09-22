import 'package:flutter/material.dart';

import '../db/repositories/p0_repository.dart';
import '../services/p0_job_type_change.dart';
import 'p0_job_type_picker.dart';

num? parseP0ManualWeight(String raw) {
  final value = num.tryParse(raw.trim().replaceAll(',', '.'));
  return value != null && value.isFinite && value >= 1 && value <= 5 ? value : null;
}

/// Dropdown that persists a changed type immediately to the local P0 outbox.
/// The existing sync action later sends the same outbox entry to the backend.
class P0AutoSaveJobTypePicker extends StatefulWidget {
  const P0AutoSaveJobTypePicker({
    super.key,
    required this.item,
    required this.options,
    required this.repository,
    required this.onSaved,
    this.initialValue,
  });

  final Map<String, dynamic> item;
  final Iterable<String> options;
  final P0JobTypeChange repository;
  final Future<void> Function() onSaved;
  final String? initialValue;

  @override
  State<P0AutoSaveJobTypePicker> createState() => _P0AutoSaveJobTypePickerState();
}

class _P0AutoSaveJobTypePickerState extends State<P0AutoSaveJobTypePicker> {
  String? _value;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _value = P0JobTypePicker.validValue(widget.options, widget.initialValue);
  }

  Future<num?> _askWeight() async {
    final controller = TextEditingController(text: '');
    final form = GlobalKey<FormState>();
    final value = await showDialog<num?>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Bobot pekerjaan Lain-lain'),
        content: Form(
          key: form,
          child: TextFormField(
            controller: controller,
            autofocus: true,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(
              labelText: 'Bobot pekerjaan',
              helperText: 'Isi angka 1 sampai 5.',
            ),
            validator: (raw) => parseP0ManualWeight(raw ?? '') == null
                ? 'Masukkan angka antara 1 dan 5.'
                : null,
            onFieldSubmitted: (_) {
              if (form.currentState?.validate() == true) {
                Navigator.pop(dialogContext, parseP0ManualWeight(controller.text));
              }
            },
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Batal')),
          FilledButton(
            onPressed: () {
              if (form.currentState?.validate() == true) {
                Navigator.pop(dialogContext, parseP0ManualWeight(controller.text));
              }
            },
            child: const Text('Simpan bobot'),
          ),
        ],
      ),
    );
    controller.dispose();
    return value;
  }

  Future<void> _changed(String? next) async {
    if (next == null || next == _value || _saving) return;
    final manualWeight = P0Repository.other(next) ? await _askWeight() : null;
    if (!mounted || (P0Repository.other(next) && manualWeight == null)) return;
    setState(() {
      _value = next;
      _saving = true;
      _error = null;
    });
    try {
      await widget.repository.save(
        item: widget.item,
        nama: next,
        alasan: 'Koreksi jenis pekerjaan melalui dropdown Verifikasi P0',
        bobot: manualWeight,
      );
      await widget.onSaved();
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = error.toString();
          _value = P0JobTypePicker.validValue(widget.options, widget.initialValue);
        });
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        P0JobTypePicker(
          options: widget.options,
          value: _value,
          enabled: !_saving,
          onChanged: _changed,
        ),
        if (_saving)
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: LinearProgressIndicator(),
          ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(_error!, style: const TextStyle(color: Color(0xFFBA3030))),
          ),
      ],
    );
  }
}
