import 'package:flutter/material.dart';

/// Keeps master values unique and preserves the server's display spelling.
/// Flutter DropdownButton requires exactly one item for the selected value.
class P0JobTypePicker extends StatelessWidget {
  const P0JobTypePicker({
    super.key,
    required this.options,
    required this.value,
    required this.onChanged,
    this.enabled = true,
  });

  final Iterable<String> options;
  final String? value;
  final ValueChanged<String?>? onChanged;
  final bool enabled;

  static List<String> unique(Iterable<String> raw) {
    final seen = <String>{};
    final result = <String>[];
    for (final item in raw) {
      final label = item.trim();
      final key = label.toLowerCase();
      if (label.isNotEmpty && seen.add(key)) result.add(label);
    }
    return result;
  }

  static String? validValue(Iterable<String> raw, String? current) {
    if (current == null) return null;
    final key = current.trim().toLowerCase();
    for (final option in unique(raw)) {
      if (option.toLowerCase() == key) return option;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final items = unique(options);
    final selected = validValue(items, value);
    return DropdownButtonFormField<String>(
      initialValue: selected,
      isExpanded: true,
      decoration: const InputDecoration(
        labelText: 'Jenis pekerjaan',
        border: OutlineInputBorder(),
      ),
      items: items
          .map((item) => DropdownMenuItem<String>(
                value: item,
                child: Text(item, overflow: TextOverflow.ellipsis),
              ))
          .toList(growable: false),
      onChanged: enabled ? onChanged : null,
    );
  }
}
