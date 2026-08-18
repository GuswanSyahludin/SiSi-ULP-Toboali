import 'package:flutter/material.dart';

class CustomLoadingWidget extends StatelessWidget {
  final String? message;
  final double size;

  const CustomLoadingWidget({super.key, this.message, this.size = 80.0});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Image.asset(
            'assets/images/loading.gif',
            width: size,
            height: size,
            errorBuilder: (context, error, stackTrace) =>
                const CircularProgressIndicator(color: Color(0xFF0284C7)),
          ),
          if (message != null && message!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              message!,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Color(0xFF334155),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
