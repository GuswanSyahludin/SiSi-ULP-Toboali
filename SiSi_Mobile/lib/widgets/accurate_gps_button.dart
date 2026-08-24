import 'package:flutter/material.dart';
import '../services/accurate_location_service.dart';
import '../theme/app_colors.dart';

class AccurateGpsButton extends StatefulWidget {
  final TextEditingController controller;
  final ValueChanged<AccurateLocationResult>? onCaptured;
  final ValueChanged<Object>? onError;
  final Color backgroundColor;
  final Color foregroundColor;
  final double size;
  final bool showAccuracyFeedback;

  const AccurateGpsButton({
    super.key,
    required this.controller,
    this.onCaptured,
    this.onError,
    this.backgroundColor = AppColors.navy700,
    this.foregroundColor = Colors.white,
    this.size = 40,
    this.showAccuracyFeedback = true,
  });

  @override
  State<AccurateGpsButton> createState() => _AccurateGpsButtonState();
}

class _AccurateGpsButtonState extends State<AccurateGpsButton> {
  bool _loading = false;

  Future<void> _capture() async {
    if (_loading) return;
    setState(() => _loading = true);
    try {
      final result = await AccurateLocationService.capture();
      if (!mounted) return;
      widget.controller.text = result.coordinates;
      widget.onCaptured?.call(result);
      if (widget.showAccuracyFeedback) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Akurasi GPS ${result.accuracyLabel}')),
        );
      }
    } catch (error) {
      if (!mounted) return;
      if (widget.onError != null) {
        widget.onError!(error);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$error')),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(5),
      child: SizedBox.square(
        dimension: widget.size,
        child: Material(
          color: widget.backgroundColor,
          borderRadius: BorderRadius.circular(9),
          child: InkWell(
            onTap: _loading ? null : _capture,
            borderRadius: BorderRadius.circular(9),
            child: Center(
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 160),
                child: _loading
                    ? SizedBox.square(
                        key: const ValueKey('gps-loading'),
                        dimension: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.2,
                          color: widget.foregroundColor,
                        ),
                      )
                    : Icon(
                        Icons.my_location_rounded,
                        key: const ValueKey('gps-idle'),
                        size: 19,
                        color: widget.foregroundColor,
                      ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
