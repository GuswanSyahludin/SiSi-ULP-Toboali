import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../theme/app_colors.dart';

class JadwalPadamCalendar extends StatelessWidget {
  final DateTime month;
  final DateTime selectedDate;
  final Set<String> eventDates;
  final ValueChanged<DateTime> onDateSelected;
  final VoidCallback onPreviousMonth;
  final VoidCallback onNextMonth;

  const JadwalPadamCalendar({
    super.key,
    required this.month,
    required this.selectedDate,
    required this.eventDates,
    required this.onDateSelected,
    required this.onPreviousMonth,
    required this.onNextMonth,
  });

  String _key(DateTime value) => DateFormat('yyyy-MM-dd').format(value);

  @override
  Widget build(BuildContext context) {
    final first = DateTime(month.year, month.month, 1);
    final days = DateTime(month.year, month.month + 1, 0).day;
    final offset = first.weekday % 7;
    const weekdays = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 2, 16, 0),
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFDDE3EC)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              IconButton(
                tooltip: 'Bulan sebelumnya',
                onPressed: onPreviousMonth,
                icon: const Icon(Icons.chevron_left_rounded),
              ),
              Expanded(
                child: Text(
                  DateFormat('MMMM yyyy', 'id_ID').format(month),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: AppColors.navy900,
                  ),
                ),
              ),
              IconButton(
                tooltip: 'Bulan berikutnya',
                onPressed: onNextMonth,
                icon: const Icon(Icons.chevron_right_rounded),
              ),
            ],
          ),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 7,
            childAspectRatio: 1.25,
            children: weekdays
                .map(
                  (day) => Center(
                    child: Text(
                      day,
                      style: const TextStyle(
                        fontSize: 9,
                        letterSpacing: .6,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF98A2B3),
                      ),
                    ),
                  ),
                )
                .toList(),
          ),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: offset + days,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              childAspectRatio: 1,
            ),
            itemBuilder: (_, index) {
              if (index < offset) return const SizedBox();
              final day = index - offset + 1;
              final date = DateTime(month.year, month.month, day);
              final selected = _key(date) == _key(selectedDate);
              final today = _key(date) == _key(DateTime.now());
              final hasEvent = eventDates.contains(_key(date));
              return InkWell(
                onTap: () => onDateSelected(date),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  margin: const EdgeInsets.all(2),
                  decoration: BoxDecoration(
                    color: selected ? AppColors.navy700 : Colors.transparent,
                    borderRadius: BorderRadius.circular(12),
                    border: today && !selected
                        ? Border.all(color: AppColors.navy700, width: 1.3)
                        : null,
                  ),
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Text(
                        '$day',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: selected ? Colors.white : AppColors.navy900,
                        ),
                      ),
                      if (hasEvent)
                        Positioned(
                          bottom: 4,
                          child: Container(
                            width: 5,
                            height: 5,
                            decoration: BoxDecoration(
                              color: selected
                                  ? AppColors.amber600
                                  : AppColors.cyan600,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
