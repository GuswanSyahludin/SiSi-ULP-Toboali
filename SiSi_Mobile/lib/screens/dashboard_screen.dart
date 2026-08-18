import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import 'laporan_harian_screen.dart';
import 'eksekusi_row_screen.dart';

class DashboardScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  const DashboardScreen({super.key, required this.sesi});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen>
    with SingleTickerProviderStateMixin {
  int selectedIndex = -1; // -1 = no menu, show greeting
  int previousIndex = -1;
  late AnimationController _bubbleController;
  late Animation<double> _bubbleAnimation;

  // Sub-layar aktif di dalam Tab Tim (Persistent Bottom Nav)
  Widget? _activeSubScreen;
  Map<String, dynamic>? _selectedTeamDetail;

  final List<String> menuItems = ['Tim', 'Teknik', 'Pengaturan'];
  final List<IconData> menuIcons = [
    Icons.people_outline_rounded,
    Icons.handyman_outlined,
    Icons.settings_outlined,
  ];

  final List<Map<String, dynamic>> allTeams = [
    {
      'name': 'Inspeksi Gardu',
      'category': 'Inspeksi',
      'icon': Icons.electrical_services_rounded,
    },
    {
      'name': 'Inspeksi Jaringan',
      'category': 'Inspeksi',
      'icon': Icons.alt_route_rounded,
    },
    {'name': 'Hartek', 'category': 'Hartek', 'icon': Icons.engineering_rounded},
    {'name': 'ROW 01', 'category': 'ROW', 'icon': Icons.park_rounded},
    {'name': 'ROW 02', 'category': 'ROW', 'icon': Icons.park_rounded},
    {'name': 'ROW 03', 'category': 'ROW', 'icon': Icons.park_rounded},
    {'name': 'ROW 04', 'category': 'ROW', 'icon': Icons.park_rounded},
    {'name': 'Yandal 13', 'category': 'Yandal', 'icon': Icons.bolt_rounded},
    {'name': 'Yandal 14', 'category': 'Yandal', 'icon': Icons.bolt_rounded},
    {'name': 'Yandal 15', 'category': 'Yandal', 'icon': Icons.bolt_rounded},
    {'name': 'Yandal 16', 'category': 'Yandal', 'icon': Icons.bolt_rounded},
    {'name': 'Yandal 17', 'category': 'Yandal', 'icon': Icons.bolt_rounded},
  ];

  @override
  void initState() {
    super.initState();
    _bubbleController = AnimationController(
      duration: const Duration(milliseconds: 350),
      vsync: this,
    );
    _bubbleAnimation = CurvedAnimation(
      parent: _bubbleController,
      curve: Curves.easeInOutCubic,
    );
  }

  @override
  void dispose() {
    _bubbleController.dispose();
    super.dispose();
  }

  bool get _isSuperUser {
    final role = (widget.sesi['role'] ?? '').toString().toLowerCase();
    return role == 'super user' || role == 'admin';
  }

  List<String> get currentMenuItems {
    if (_isSuperUser) {
      return ['Tim', 'Teknik', 'Pengaturan'];
    }
    return ['Tim', 'Pengaturan'];
  }

  List<IconData> get currentMenuIcons {
    if (_isSuperUser) {
      return [
        Icons.people_outline_rounded,
        Icons.handyman_outlined,
        Icons.settings_outlined,
      ];
    }
    return [Icons.people_outline_rounded, Icons.settings_outlined];
  }

  void _selectMenu(int index) {
    if (selectedIndex == index && _activeSubScreen == null) return;

    setState(() {
      previousIndex = selectedIndex;
      selectedIndex = index;
      _activeSubScreen = null;
      _selectedTeamDetail = null;
    });

    _bubbleController.forward(from: 0.0);
  }

  double _getTabCenterX(int index, double screenWidth) {
    final tabWidth = screenWidth / currentMenuItems.length;
    return (index * tabWidth) + (tabWidth / 2);
  }

  void _openSubScreen(Widget screen) {
    setState(() {
      _activeSubScreen = screen;
    });
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;

    return WillPopScope(
      onWillPop: () async {
        if (_activeSubScreen != null) {
          setState(() => _activeSubScreen = null);
          return false;
        }
        if (_selectedTeamDetail != null) {
          setState(() => _selectedTeamDetail = null);
          return false;
        }
        return true;
      },
      child: Scaffold(
        backgroundColor: AppColors.neutral100,
        body:
            _activeSubScreen ??
            (selectedIndex == -1
                ? _buildGreetingView()
                : _buildTabContent(selectedIndex)),
        bottomNavigationBar: SafeArea(
          child: SizedBox(
            height: 80,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                AnimatedBuilder(
                  animation: _bubbleAnimation,
                  builder: (context, child) {
                    double? notchX;
                    if (selectedIndex >= 0) {
                      final targetX = _getTabCenterX(
                        selectedIndex,
                        screenWidth,
                      );
                      final startX = previousIndex >= 0
                          ? _getTabCenterX(previousIndex, screenWidth)
                          : targetX;
                      notchX =
                          startX + (targetX - startX) * _bubbleAnimation.value;
                    }

                    return CustomPaint(
                      size: Size(screenWidth, 80),
                      painter: NavbarWithNotchPainter(notchCenterX: notchX),
                    );
                  },
                ),
                if (selectedIndex >= 0)
                  AnimatedBuilder(
                    animation: _bubbleAnimation,
                    builder: (context, child) {
                      final targetX = _getTabCenterX(
                        selectedIndex,
                        screenWidth,
                      );
                      final startX = previousIndex >= 0
                          ? _getTabCenterX(previousIndex, screenWidth)
                          : targetX;

                      final currentX =
                          startX + (targetX - startX) * _bubbleAnimation.value;
                      const bubbleSize = 46.0;

                      return Positioned(
                        left: currentX - (bubbleSize / 2),
                        top: -12,
                        child: Container(
                          width: bubbleSize,
                          height: bubbleSize,
                          decoration: BoxDecoration(
                            color: AppColors.navy700,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.navy700.withOpacity(0.35),
                                blurRadius: 8,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Icon(
                            currentMenuIcons[selectedIndex],
                            size: 22,
                            color: Colors.white,
                          ),
                        ),
                      );
                    },
                  ),
                Positioned.fill(
                  child: Row(
                    children: List.generate(
                      currentMenuItems.length,
                      (index) => Expanded(
                        child: InkWell(
                          onTap: () => _selectMenu(index),
                          splashColor: Colors.transparent,
                          highlightColor: Colors.transparent,
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              Opacity(
                                opacity: selectedIndex == index ? 0.0 : 1.0,
                                child: Icon(
                                  currentMenuIcons[index],
                                  size: 22,
                                  color: AppColors.navy700.withOpacity(0.6),
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                currentMenuItems[index],
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: selectedIndex == index
                                      ? FontWeight.bold
                                      : FontWeight.w500,
                                  color: selectedIndex == index
                                      ? AppColors.navy700
                                      : AppColors.navy700.withOpacity(0.6),
                                ),
                              ),
                              const SizedBox(height: 10),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildGreetingView() {
    final subTim = widget.sesi['subTim'] ?? 'Tim';
    return Scaffold(
      backgroundColor: AppColors.neutral100,
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        elevation: 0,
        title: const Text(
          'SiSi Dashboard',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Halo, $subTim',
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: AppColors.navy700,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Semangat Pagi!!!',
              style: TextStyle(fontSize: 20, color: AppColors.navy700),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTabContent(int index) {
    if (_isSuperUser) {
      switch (index) {
        case 0:
          return _buildMenuTim();
        case 1:
          return _buildMenuTeknik();
        case 2:
          return _buildMenuPengaturan();
        default:
          return const SizedBox();
      }
    } else {
      switch (index) {
        case 0:
          return _buildMenuTim();
        case 1:
          return _buildMenuPengaturan();
        default:
          return const SizedBox();
      }
    }
  }

  Widget _buildMenuTim() {
    if (_isSuperUser) {
      if (_selectedTeamDetail != null) {
        return _buildTeamSubMenuActions(_selectedTeamDetail!);
      }
      return Scaffold(
        backgroundColor: AppColors.neutral100,
        appBar: AppBar(
          backgroundColor: AppColors.navy700,
          elevation: 0,
          title: const Text(
            'SiSi — Tim Operasional',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ),
        body: _buildSuperUserTeamGrid(),
      );
    }

    final userSubTim = (widget.sesi['subTim'] ?? widget.sesi['tim'] ?? 'ROW')
        .toString();
    String category = 'ROW';
    if (userSubTim.toLowerCase().contains('yandal')) {
      category = 'Yandal';
    } else if (userSubTim.toLowerCase().contains('hartek')) {
      category = 'Hartek';
    } else if (userSubTim.toLowerCase().contains('gardu')) {
      category = 'Inspeksi Gardu';
    } else if (userSubTim.toLowerCase().contains('jaringan') ||
        userSubTim.toLowerCase().contains('ins')) {
      category = 'Inspeksi Jaringan';
    }

    return _buildTeamSubMenuActions({
      'name': userSubTim,
      'category': category,
      'icon': category == 'Inspeksi Gardu'
          ? Icons.electrical_services_rounded
          : (category == 'Inspeksi Jaringan'
                ? Icons.alt_route_rounded
                : Icons.engineering_rounded),
    });
  }

  Widget _buildSuperUserTeamGrid() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Daftar 12 Tim Operasional',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: AppColors.navy700,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Pilih tim untuk melihat dan mengelola aktivitas harian',
          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
        ),
        const SizedBox(height: 16),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.4,
          ),
          itemCount: allTeams.length,
          itemBuilder: (context, idx) {
            final team = allTeams[idx];
            return InkWell(
              onTap: () => setState(() => _selectedTeamDetail = team),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade200),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.03),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.navy700.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        team['icon'],
                        color: AppColors.navy700,
                        size: 20,
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          team['name'],
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: AppColors.navy700,
                          ),
                        ),
                        Text(
                          team['category'],
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildTeamSubMenuActions(Map<String, dynamic> team) {
    final category = (team['category'] ?? '').toString();
    final name = (team['name'] ?? '').toString();
    List<Map<String, dynamic>> subActions = [];

    if (category == 'Inspeksi Jaringan' || name == 'Inspeksi Jaringan') {
      subActions = [
        {
          'title': 'Laporan Harian',
          'icon': Icons.description_outlined,
          'desc': 'Input & pantau laporan inspeksi jaringan harian',
        },
        {
          'title': 'Rekap Temuan',
          'icon': Icons.assessment_outlined,
          'desc': 'Rekapitulasi dan daftar temuan anomali jaringan',
        },
      ];
    } else if (category == 'Inspeksi Gardu' || name == 'Inspeksi Gardu') {
      subActions = [
        {
          'title': 'Laporan Harian',
          'icon': Icons.description_outlined,
          'desc': 'Input & pantau laporan inspeksi gardu harian',
        },
        {
          'title': 'Master Gardu',
          'icon': Icons.account_tree_outlined,
          'desc': 'Data master gardu distribusi & anomali',
        },
      ];
    } else if (category.contains('ROW')) {
      subActions = [
        {
          'title': 'Laporan Harian',
          'icon': Icons.description_outlined,
          'desc': 'Input & pantau laporan kerja harian',
        },
        {
          'title': 'Tindak Lanjut Temuan',
          'icon': Icons.assignment_turned_in_outlined,
          'desc': 'Eksekusi temuan pohon / raba-raba',
        },
        {
          'title': 'Eksekusi Pekerjaan',
          'icon': Icons.cut_rounded,
          'desc': 'Pekerjaan penebangan & pemangkasan',
        },
      ];
    } else if (category.contains('Hartek')) {
      subActions = [
        {
          'title': 'Laporan Harian',
          'icon': Icons.description_outlined,
          'desc': 'Logbook pemeliharaan teknis',
        },
        {
          'title': 'Tindak Lanjut Temuan',
          'icon': Icons.assignment_turned_in_outlined,
          'desc': 'Perbaikan material & konstruksi',
        },
      ];
    } else if (category.contains('Yandal')) {
      subActions = [
        {
          'title': 'Laporan Harian',
          'icon': Icons.description_outlined,
          'desc': 'Laporan shift dan pelayanan gangguan',
        },
        {
          'title': 'Tindak Lanjut Temuan',
          'icon': Icons.assignment_turned_in_outlined,
          'desc': 'Penanganan keluhan & gangguan',
        },
        {
          'title': 'Laporan kWh Siaga',
          'icon': Icons.speed_rounded,
          'desc': 'Pencatatan monitoring stand kWh',
        },
        {
          'title': 'Rejected P0',
          'icon': Icons.cancel_outlined,
          'desc': 'Daftar penugasan P0 yang ditolak',
        },
      ];
    } else {
      subActions = [
        {
          'title': 'Laporan Harian',
          'icon': Icons.description_outlined,
          'desc': 'Laporan inspeksi lapangan',
        },
        {
          'title': 'Tindak Lanjut Temuan',
          'icon': Icons.assignment_turned_in_outlined,
          'desc': 'Evaluasi anomali gardu/jaringan',
        },
      ];
    }

    return Scaffold(
      backgroundColor: AppColors.neutral100,
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        elevation: 0,
        leading: _selectedTeamDetail != null
            ? IconButton(
                icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
                onPressed: () => setState(() => _selectedTeamDetail = null),
              )
            : null,
        title: Text(
          team['name'],
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.navy700,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    team['icon'] ?? Icons.people,
                    color: Colors.white,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        team['name'],
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Kategori: ${team['category']}',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.white.withOpacity(0.8),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'Menu Pekerjaan',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: AppColors.navy700,
            ),
          ),
          const SizedBox(height: 10),
          ...subActions.map(
            (action) => Card(
              margin: const EdgeInsets.only(bottom: 10),
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(color: Colors.grey.shade200),
              ),
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 6,
                ),
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.navy700.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(action['icon'], color: AppColors.navy700),
                ),
                title: Text(
                  action['title'],
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
                subtitle: Text(
                  action['desc'],
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                ),
                trailing: const Icon(
                  Icons.chevron_right_rounded,
                  color: Colors.grey,
                ),
                onTap: () {
                  if (action['title'] == 'Laporan Harian') {
                    _openSubScreen(
                      LaporanHarianScreen(
                        sesi: widget.sesi,
                        targetSubTim: team['name'],
                        targetTim: team['category'],
                      ),
                    );
                  } else if (action['title'] == 'Eksekusi Pekerjaan') {
                    _openSubScreen(
                      EksekusiRowScreen(
                        sesi: widget.sesi,
                        targetSubTim: team['name'],
                        targetTim: team['category'],
                      ),
                    );
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          '${action['title']} (${team['name']}) akan dibuka',
                        ),
                      ),
                    );
                  }
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuTeknik() {
    final subTeknik = [
      {
        'title': 'Penugasan Tim',
        'icon': Icons.assignment_ind_outlined,
        'desc': 'Plotting jadwal & penugasan personil lapangan',
      },
      {
        'title': 'Penggantian Tim Yandal',
        'icon': Icons.swap_horiz_rounded,
        'desc': 'Rolling shift dan penggantian personil Yandal',
      },
      {
        'title': 'Verifikasi P0',
        'icon': Icons.verified_outlined,
        'desc': 'Approval & verifikasi data padam P0',
      },
      {
        'title': 'Input Temuan Inspeksi',
        'icon': Icons.add_photo_alternate_outlined,
        'desc': 'Input temuan anomali gardu / jaringan',
      },
      {
        'title': 'Pindah Tim Eksekusi TO',
        'icon': Icons.move_up_rounded,
        'desc': 'Disposisi target operasi ke tim eksekusi',
      },
      {
        'title': 'Laporan UP3',
        'icon': Icons.summarize_outlined,
        'desc': 'Rekapitulasi dan laporan tingkat UP3',
      },
      {
        'title': 'Laporan UIW',
        'icon': Icons.analytics_outlined,
        'desc': 'Rekapitulasi dan laporan tingkat UIW',
      },
    ];

    return Scaffold(
      backgroundColor: AppColors.neutral100,
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        elevation: 0,
        title: const Text(
          'SiSi — Teknik',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Manajemen Operasional Teknik',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.navy700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Kelola penugasan, verifikasi, dan pelaporan teknik ULP',
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 16),
          ...subTeknik.map(
            (item) => Card(
              margin: const EdgeInsets.only(bottom: 10),
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(color: Colors.grey.shade200),
              ),
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 6,
                ),
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.navy700.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    item['icon'] as IconData,
                    color: AppColors.navy700,
                  ),
                ),
                title: Text(
                  item['title'] as String,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
                subtitle: Text(
                  item['desc'] as String,
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                ),
                trailing: const Icon(
                  Icons.chevron_right_rounded,
                  color: Colors.grey,
                ),
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('${item['title']} akan dibuka')),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuPengaturan() {
    return Scaffold(
      backgroundColor: AppColors.neutral100,
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        elevation: 0,
        title: const Text(
          'SiSi — Pengaturan',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: AppColors.navy700,
                  child: Text(
                    (widget.sesi['username'] ?? 'U')[0].toUpperCase(),
                    style: const TextStyle(
                      fontSize: 20,
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.sesi['username'] ?? 'Pengguna',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.navy700,
                        ),
                      ),
                      Text(
                        '${widget.sesi['role'] ?? '-'} • ${widget.sesi['subTim'] ?? widget.sesi['tim'] ?? '-'}',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: Colors.grey.shade200),
            ),
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(
                    Icons.lock_reset_rounded,
                    color: AppColors.navy700,
                  ),
                  title: const Text('Ganti Password'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () {},
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(
                    Icons.logout_rounded,
                    color: Colors.redAccent,
                  ),
                  title: const Text(
                    'Keluar / Logout',
                    style: TextStyle(color: Colors.redAccent),
                  ),
                  onTap: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class NavbarWithNotchPainter extends CustomPainter {
  final double? notchCenterX;

  NavbarWithNotchPainter({this.notchCenterX});

  @override
  void paint(Canvas canvas, Size size) {
    final bgPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;

    final borderPaint = Paint()
      ..color = AppColors.navy700
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;

    final path = Path();
    final borderPath = Path();

    if (notchCenterX == null) {
      path.addRect(Rect.fromLTWH(0, 0, size.width, size.height));
      borderPath.moveTo(0, 0);
      borderPath.lineTo(size.width, 0);
    } else {
      const notchRadius = 30.0;
      final cx = notchCenterX!;

      path.moveTo(0, 0);
      borderPath.moveTo(0, 0);

      path.lineTo(cx - notchRadius - 10, 0);
      borderPath.lineTo(cx - notchRadius - 10, 0);

      path.cubicTo(cx - notchRadius, 0, cx - notchRadius + 6, 18, cx, 18);
      path.cubicTo(
        cx + notchRadius - 6,
        18,
        cx + notchRadius,
        0,
        cx + notchRadius + 10,
        0,
      );

      borderPath.cubicTo(cx - notchRadius, 0, cx - notchRadius + 6, 18, cx, 18);
      borderPath.cubicTo(
        cx + notchRadius - 6,
        18,
        cx + notchRadius,
        0,
        cx + notchRadius + 10,
        0,
      );

      path.lineTo(size.width, 0);
      borderPath.lineTo(size.width, 0);

      path.lineTo(size.width, size.height);
      path.lineTo(0, size.height);
      path.close();
    }

    canvas.drawPath(path, bgPaint);
    canvas.drawPath(borderPath, borderPaint);
  }

  @override
  bool shouldRepaint(covariant NavbarWithNotchPainter oldDelegate) =>
      oldDelegate.notchCenterX != notchCenterX;
}
