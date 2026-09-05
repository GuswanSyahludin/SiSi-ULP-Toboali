from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    source = file.read_text()
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one marker, found {count}")
    file.write_text(source.replace(old, new, 1))


dashboard = "SiSi_Mobile/lib/screens/dashboard_screen.dart"
replace_once(
    dashboard,
    """  bool get _isSuperUser {
    final role = (widget.sesi['role'] ?? '').toString().toLowerCase();
    return role == 'super user' || role == 'admin';
  }

  bool get _bolehGardu => GarduScreen.boleh(widget.sesi);

  List<String> get currentMenuItems => const [
        'Tim',
        'Pengukuran',
        'Beranda',
        'Teknik',
        'Pengaturan',
      ];

  List<IconData> get currentMenuIcons => const [
        Icons.people_outline_rounded,
        Icons.electrical_services_outlined,
        Icons.home_rounded,
        Icons.handyman_outlined,
        Icons.settings_outlined,
      ];
""",
    """  String get _role =>
      (widget.sesi['role'] ?? '').toString().trim().toLowerCase();

  bool get _isSuperUser =>
      _role == 'super user' || _role == 'superuser' || _role == 'admin';

  bool get _bolehTeknik => _isSuperUser;

  bool get _bolehGardu {
    final subTim =
        (widget.sesi['subTim'] ?? '').toString().trim().toLowerCase();
    return _isSuperUser || subTim == 'inspeksi gardu';
  }

  List<String> get currentMenuItems => [
        'Tim',
        if (_bolehGardu) 'Pengukuran',
        'Beranda',
        if (_bolehTeknik) 'Teknik',
        'Pengaturan',
      ];

  List<IconData> get currentMenuIcons => currentMenuItems.map((menu) {
        switch (menu) {
          case 'Tim':
            return Icons.people_outline_rounded;
          case 'Pengukuran':
            return Icons.electrical_services_outlined;
          case 'Beranda':
            return Icons.home_rounded;
          case 'Teknik':
            return Icons.handyman_outlined;
          default:
            return Icons.settings_outlined;
        }
      }).toList();
""",
)
replace_once(
    dashboard,
    "                      final isBeranda = selectedIndex == 2;\n",
    "                      final isBeranda =\n                          currentMenuItems[selectedIndex] == 'Beranda';\n",
)
replace_once(
    dashboard,
    """      case 'Beranda':
        return BerandaScreen(sesi: widget.sesi);
""",
    """      case 'Beranda':
        return BerandaScreen(
          sesi: widget.sesi,
          onOpenTim: () => _selectMenu(currentMenuItems.indexOf('Tim')),
          onOpenPengukuran: _bolehGardu
              ? () => _selectMenu(currentMenuItems.indexOf('Pengukuran'))
              : null,
          onOpenTeknik: _bolehTeknik
              ? () => _selectMenu(currentMenuItems.indexOf('Teknik'))
              : null,
        );
""",
)

home = "SiSi_Mobile/lib/screens/beranda_screen.dart"
replace_once(
    home,
    """class BerandaScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  const BerandaScreen({super.key, required this.sesi});
""",
    """class BerandaScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final VoidCallback? onOpenTim;
  final VoidCallback? onOpenPengukuran;
  final VoidCallback? onOpenTeknik;

  const BerandaScreen({
    super.key,
    required this.sesi,
    this.onOpenTim,
    this.onOpenPengukuran,
    this.onOpenTeknik,
  });
""",
)
replace_once(
    home,
    """            _profile(name),
            const SizedBox(height: 26),
            GangguanBerandaSection(sesi: widget.sesi),
""",
    """            _profile(name),
            const SizedBox(height: 24),
            _sectionHeading('Akses cepat', 'sesuai role'),
            const SizedBox(height: 10),
            _quickActions(),
            const SizedBox(height: 28),
            GangguanBerandaSection(sesi: widget.sesi),
""",
)

file = Path(home)
source = file.read_text()
start = source.index("  Widget _profile(String name) {")
end = source.index("  Widget _fact(", start)
new_profile = """  Widget _profile(String name) {
    final now = DateTime.now();
    final greeting = now.hour < 11
        ? 'Selamat pagi'
        : now.hour < 15
            ? 'Selamat siang'
            : now.hour < 18
                ? 'Selamat sore'
                : 'Selamat malam';
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.navy700,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            DateFormat('EEEE, d MMMM', 'id_ID').format(now).toUpperCase(),
            style: const TextStyle(
              color: AppColors.amber600,
              fontSize: 10,
              letterSpacing: 1,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '$greeting, $name.',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 25,
              height: 1.12,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Agenda, laporan, verifikasi, dan gangguan dirangkum di sini.',
            style: TextStyle(
              color: Color(0xFFC8D8E3),
              fontSize: 12,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _heroChip(Icons.circle, 'Online'),
              _heroChip(Icons.badge_outlined, '${widget.sesi['role'] ?? '-'}'),
              _heroChip(
                Icons.groups_outlined,
                '${widget.sesi['subTim'] ?? widget.sesi['tim'] ?? '-'}',
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _heroChip(IconData icon, String label) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
        decoration: BoxDecoration(
          color: const Color(0xFF315E73),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 9, color: AppColors.amber600),
            const SizedBox(width: 5),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 10,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      );

  Widget _sectionHeading(String title, String meta) => Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                color: AppColors.navy900,
                fontSize: 18,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          Text(
            meta,
            style: const TextStyle(color: Color(0xFF667085), fontSize: 10),
          ),
        ],
      );

  Widget _quickActions() {
    final actions = <Map<String, dynamic>>[
      if (widget.onOpenTim != null)
        {
          'title': 'Pekerjaan tim',
          'subtitle': 'Laporan dan aktivitas',
          'icon': Icons.assignment_outlined,
          'action': widget.onOpenTim,
        },
      if (widget.onOpenPengukuran != null)
        {
          'title': 'Pengukuran',
          'subtitle': 'Gardu dan hasil ukur',
          'icon': Icons.electrical_services_outlined,
          'action': widget.onOpenPengukuran,
        },
      if (widget.onOpenTeknik != null)
        {
          'title': 'Kontrol teknik',
          'subtitle': 'Jadwal dan verifikasi',
          'icon': Icons.verified_outlined,
          'action': widget.onOpenTeknik,
        },
    ];
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: actions.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 1.35,
      ),
      itemBuilder: (_, index) {
        final item = actions[index];
        return Material(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          child: InkWell(
            onTap: item['action'] as VoidCallback?,
            borderRadius: BorderRadius.circular(18),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFDDE3EC)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE8F3F7),
                      borderRadius: BorderRadius.circular(11),
                    ),
                    child: Icon(
                      item['icon'] as IconData,
                      size: 19,
                      color: AppColors.navy700,
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item['title'] as String,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                          color: AppColors.navy900,
                        ),
                      ),
                      Text(
                        item['subtitle'] as String,
                        style: const TextStyle(
                          fontSize: 9,
                          color: Color(0xFF667085),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

"""
file.write_text(source[:start] + new_profile + source[end:])

updated_dashboard = Path(dashboard).read_text()
updated_home = Path(home).read_text()
assert "subTim == 'inspeksi gardu'" in updated_dashboard
assert "if (_bolehTeknik) 'Teknik'" in updated_dashboard
assert "GangguanBerandaSection(sesi: widget.sesi)" in updated_home
assert "_sectionHeading('Akses cepat', 'sesuai role')" in updated_home
