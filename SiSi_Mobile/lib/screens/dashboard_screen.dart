import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/physics.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme/app_colors.dart';
import '../services/api_service.dart';
import '../services/auto_sync_service.dart';
import '../db/repositories/master_repository.dart';
import '../widgets/sync_section_pengaturan.dart';
import 'laporan_harian_screen.dart';
import 'gardu_screen.dart';
import 'login_screen.dart';
import 'laporan_row_screen.dart';
import 'work_order_row_screen.dart';
import 'laporan_hartek_screen.dart';
import 'input_temuan_teknik_screen.dart';
import 'teknik_to_screen.dart';
import 'verifikasi_p0_screen.dart';
import 'laporan_up3_uiw_screen.dart';
import 'engine_usage_screen.dart';
import 'jadwal_padam_screen.dart';
import 'beranda_screen.dart';
import 'yandal_screen.dart';

class DashboardScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  static final ValueNotifier<bool> loadingBg = ValueNotifier(false);
  const DashboardScreen({super.key, required this.sesi});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  int selectedIndex = -1;
  int previousIndex = -1;
  late AnimationController _bubbleController;

  bool _isOnline = true;
  Timer? _onlineTimer;

  Widget? _activeSubScreen;
  Map<String, dynamic>? _selectedTeamDetail;

  final List<Map<String, dynamic>> allTeams = [
    {
      'name': 'Inspeksi Gardu',
      'category': 'Inspeksi',
      'icon': Icons.electrical_services_rounded,
      'badgeColor': AppColors.navy700,
    },
    {
      'name': 'Inspeksi Jaringan',
      'category': 'Inspeksi',
      'icon': Icons.alt_route_rounded,
      'badgeColor': AppColors.cyan600,
    },
    {
      'name': 'Hartek',
      'category': 'Hartek',
      'icon': Icons.engineering_rounded,
      'badgeColor': AppColors.amber700,
    },
    {
      'name': 'ROW 01',
      'category': 'ROW',
      'icon': Icons.park_rounded,
      'badgeColor': AppColors.success700,
    },
    {
      'name': 'ROW 02',
      'category': 'ROW',
      'icon': Icons.park_rounded,
      'badgeColor': AppColors.success700,
    },
    {
      'name': 'ROW 03',
      'category': 'ROW',
      'icon': Icons.park_rounded,
      'badgeColor': AppColors.success700,
    },
    {
      'name': 'ROW 04',
      'category': 'ROW',
      'icon': Icons.park_rounded,
      'badgeColor': AppColors.success700,
    },
    {
      'name': 'Yandal 13',
      'category': 'Yandal',
      'icon': Icons.bolt_rounded,
      'badgeColor': AppColors.plnRed,
    },
    {
      'name': 'Yandal 14',
      'category': 'Yandal',
      'icon': Icons.bolt_rounded,
      'badgeColor': AppColors.plnRed,
    },
    {
      'name': 'Yandal 15',
      'category': 'Yandal',
      'icon': Icons.bolt_rounded,
      'badgeColor': AppColors.plnRed,
    },
    {
      'name': 'Yandal 16',
      'category': 'Yandal',
      'icon': Icons.bolt_rounded,
      'badgeColor': AppColors.plnRed,
    },
    {
      'name': 'Yandal 17',
      'category': 'Yandal',
      'icon': Icons.bolt_rounded,
      'badgeColor': AppColors.plnRed,
    },
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _bubbleController = AnimationController(vsync: this);
    selectedIndex = currentMenuItems.indexOf('Beranda');
    previousIndex = selectedIndex;
    _bubbleController.value = 1;
    unawaited(AutoSyncService.syncNow(widget.sesi));
    _cekKoneksi();
    _onlineTimer = Timer.periodic(
      const Duration(seconds: 10),
      (_) => _cekKoneksi(),
    );
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _onlineTimer?.cancel();
    _bubbleController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(AutoSyncService.syncNow(widget.sesi));
    }
  }

  String get _role =>
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

  void _selectMenu(int index) {
    if (selectedIndex == index && _activeSubScreen == null) return;

    setState(() {
      previousIndex = selectedIndex;
      selectedIndex = index;
      _activeSubScreen = null;
      _selectedTeamDetail = null;
    });

    _bubbleController.animateWith(
      SpringSimulation(
        const SpringDescription(mass: 1.0, stiffness: 200.0, damping: 26.0),
        0.0,
        1.0,
        0.0,
      ),
    );
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

  Future<void> _bukaMenuTerproteksi(String title, Widget screen) async {
    final siap = await MasterRepository().sudahAdaData();
    if (!mounted) return;
    if (!siap) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
              'Menu terkunci — buka Pengaturan lalu "Download Master Data" dahulu.'),
        ),
      );
      return;
    }
    _openSubScreen(screen);
  }

  void _kembaliKeAwal() {
    setState(() {
      previousIndex = selectedIndex;
      selectedIndex = currentMenuItems.indexOf('Beranda');
      _activeSubScreen = null;
      _selectedTeamDetail = null;
    });
  }

  Future<void> _cekKoneksi() async {
    bool online;
    try {
      final hasil = await InternetAddress.lookup('google.com')
          .timeout(const Duration(seconds: 4));
      online = hasil.isNotEmpty && hasil.first.rawAddress.isNotEmpty;
    } catch (_) {
      online = false;
    }
    if (mounted && online != _isOnline) {
      setState(() => _isOnline = online);
    }
  }

  Widget _buildIndikatorOnline() {
    final warna = _isOnline ? AppColors.success600 : AppColors.red600;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: _isOnline ? const Color(0xFFECFDF5) : AppColors.red100,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: warna, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(shape: BoxShape.circle, color: warna),
          ),
          const SizedBox(width: 4),
          Text(
            _isOnline ? 'Online' : 'Offline',
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.bold,
              color: warna,
            ),
          ),
        ],
      ),
    );
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
        backgroundColor: Colors.transparent,
        body: ValueListenableBuilder<bool>(
          valueListenable: DashboardScreen.loadingBg,
          builder: (context, sedangLoading, _) {
            return Container(
              decoration: BoxDecoration(
                color: AppColors.neutral100,
                image: sedangLoading
                    ? null
                    : DecorationImage(
                        image: const AssetImage('assets/images/bg-sisi.png'),
                        fit: BoxFit.cover,
                        opacity: 0.5,
                        onError: (_, __) {},
                      ),
              ),
              child: _activeSubScreen ??
                  (selectedIndex == -1
                      ? _buildGreetingView()
                      : _buildTabContent(selectedIndex)),
            );
          },
        ),
        bottomNavigationBar: SafeArea(
          child: SizedBox(
            height: 80,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                AnimatedBuilder(
                  animation: _bubbleController,
                  builder: (context, child) {
                    double? notchX;
                    if (selectedIndex >= 0) {
                      final targetX =
                          _getTabCenterX(selectedIndex, screenWidth);
                      final startX = previousIndex >= 0
                          ? _getTabCenterX(previousIndex, screenWidth)
                          : targetX;
                      notchX =
                          startX + (targetX - startX) * _bubbleController.value;
                    }

                    return CustomPaint(
                      size: Size(screenWidth, 80),
                      painter: NavbarWithNotchPainter(notchCenterX: notchX),
                    );
                  },
                ),
                if (selectedIndex >= 0)
                  AnimatedBuilder(
                    animation: _bubbleController,
                    builder: (context, child) {
                      final targetX =
                          _getTabCenterX(selectedIndex, screenWidth);
                      final startX = previousIndex >= 0
                          ? _getTabCenterX(previousIndex, screenWidth)
                          : targetX;

                      final currentX =
                          startX + (targetX - startX) * _bubbleController.value;
                      final isBeranda =
                          currentMenuItems[selectedIndex] == 'Beranda';
                      final bubbleSize = isBeranda ? 64.0 : 52.0;
                      final bubbleTop = isBeranda ? -22.0 : -14.0;

                      return Positioned(
                        left: currentX - (bubbleSize / 2),
                        top: bubbleTop,
                        child: Container(
                          width: bubbleSize,
                          height: bubbleSize,
                          decoration: BoxDecoration(
                            color: AppColors.navy700,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: AppColors.cyan600,
                              width: 2.0,
                            ),
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
                            size: isBeranda ? 39.0 : 30.0,
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
                                  fontSize: selectedIndex == index ? 14.5 : 11,
                                  fontWeight: selectedIndex == index
                                      ? FontWeight.w800
                                      : FontWeight.w500,
                                  color: selectedIndex == index
                                      ? AppColors.cyan600
                                      : AppColors.navy700.withOpacity(0.6),
                                  letterSpacing:
                                      selectedIndex == index ? 0.3 : 0,
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
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        elevation: 0,
        title: const Text('SiSi Dashboard',
            style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.white)),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Center(child: _buildIndikatorOnline()),
          ),
        ],
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.neutral200),
              boxShadow: [
                BoxShadow(
                  color: AppColors.navy950.withOpacity(0.05),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Halo, $subTim',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: AppColors.navy700,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Semangat Pagi!!!',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 20,
                    color: AppColors.navy700,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTabContent(int index) {
    final menu = currentMenuItems[index];
    switch (menu) {
      case 'Tim':
        return _buildMenuTim();
      case 'Pengukuran':
        return GarduScreen(sesi: widget.sesi);
      case 'Beranda':
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
      case 'Teknik':
        return _buildMenuTeknik();
      case 'Pengaturan':
        return _buildMenuPengaturan();
      default:
        return const SizedBox();
    }
  }

  Widget _buildMenuTim() {
    if (_isSuperUser) {
      if (_selectedTeamDetail != null) {
        return _buildTeamSubMenuActions(_selectedTeamDetail!);
      }
      return Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: AppColors.navy700,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
            tooltip: 'Kembali ke beranda',
            onPressed: _kembaliKeAwal,
          ),
          title: const Text('SiSi — Tim Operasional',
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.white)),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Center(child: _buildIndikatorOnline()),
            ),
          ],
        ),
        body: _buildSuperUserTeamGrid(),
      );
    }

    final userSubTim =
        (widget.sesi['subTim'] ?? widget.sesi['tim'] ?? 'ROW').toString();
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
              color: AppColors.navy700),
        ),
        const SizedBox(height: 4),
        Text(
          'Pilih tim untuk melihat dan mengelola aktivitas harian',
          style: TextStyle(fontSize: 12, color: AppColors.neutral500),
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
            final colorBadge =
                (team['badgeColor'] as Color?) ?? AppColors.navy700;
            return InkWell(
              onTap: () => setState(() => _selectedTeamDetail = team),
              borderRadius: BorderRadius.circular(14),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.neutral200),
                  boxShadow: [
                    BoxShadow(
                        color: AppColors.navy950.withOpacity(0.03),
                        blurRadius: 6,
                        offset: const Offset(0, 2)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: colorBadge.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(team['icon'], color: colorBadge, size: 20),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          team['name'],
                          style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: AppColors.navy900),
                        ),
                        Text(
                          team['category'],
                          style: TextStyle(
                              fontSize: 11, color: AppColors.neutral500),
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
          'desc': 'Input & pantau laporan inspeksi jaringan harian'
        },
        {
          'title': 'Rekap Temuan',
          'icon': Icons.assessment_outlined,
          'desc': 'Rekapitulasi dan daftar temuan anomali jaringan'
        },
      ];
    } else if (category == 'Inspeksi Gardu' || name == 'Inspeksi Gardu') {
      subActions = [
        {
          'title': 'Laporan Harian',
          'icon': Icons.description_outlined,
          'desc': 'Input & pantau laporan inspeksi gardu harian'
        },
        {
          'title': 'Master Gardu',
          'icon': Icons.account_tree_outlined,
          'desc': 'Data master gardu distribusi & anomali'
        },
      ];
    } else if (category.contains('ROW')) {
      subActions = [
        {
          'title': 'Laporan Harian',
          'icon': Icons.description_outlined,
          'desc': 'Input & pantau laporan kerja harian dan realisasi ROW'
        },
        {
          'title': 'Work Order (WO)',
          'icon': Icons.assignment_turned_in_outlined,
          'desc': 'TO Progress Pekerjaan untuk tim ROW ini'
        },
      ];
    } else if (category.contains('Hartek')) {
      subActions = [
        {
          'title': 'Laporan Harian',
          'icon': Icons.description_outlined,
          'desc': 'Logbook pemeliharaan teknis'
        },
        {
          'title': 'Tindak Lanjut Temuan',
          'icon': Icons.assignment_turned_in_outlined,
          'desc': 'Perbaikan material & konstruksi'
        },
      ];
    } else if (category.contains('Yandal')) {
      subActions = [
        {
          'title': 'Laporan Harian',
          'icon': Icons.description_outlined,
          'desc': 'Laporan shift dan pelayanan gangguan'
        },
        {
          'title': 'Tindak Lanjut Temuan',
          'icon': Icons.assignment_turned_in_outlined,
          'desc': 'Penanganan keluhan & gangguan'
        },
        {
          'title': 'Laporan kWh Siaga',
          'icon': Icons.speed_rounded,
          'desc': 'Pencatatan monitoring stand kWh'
        },
        {
          'title': 'Rejected P0',
          'icon': Icons.cancel_outlined,
          'desc': 'Daftar penugasan P0 yang ditolak'
        },
      ];
    } else {
      subActions = [
        {
          'title': 'Laporan Harian',
          'icon': Icons.description_outlined,
          'desc': 'Laporan inspeksi lapangan'
        },
        {
          'title': 'Tindak Lanjut Temuan',
          'icon': Icons.assignment_turned_in_outlined,
          'desc': 'Evaluasi anomali gardu/jaringan'
        },
      ];
    }

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
          tooltip: 'Kembali',
          onPressed: () {
            if (_selectedTeamDetail != null) {
              setState(() => _selectedTeamDetail = null);
            } else {
              _kembaliKeAwal();
            }
          },
        ),
        title: Text(team['name'],
            style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.white)),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Center(child: _buildIndikatorOnline()),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.navy700,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: AppColors.navy700.withOpacity(0.2),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(team['icon'] ?? Icons.people,
                      color: AppColors.plnYellow, size: 28),
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
                            color: Colors.white),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Kategori: ${team['category']}',
                        style: TextStyle(
                            fontSize: 12, color: Colors.white.withOpacity(0.8)),
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
                color: AppColors.navy700),
          ),
          const SizedBox(height: 10),
          ...subActions.map((action) => Card(
                margin: const EdgeInsets.only(bottom: 10),
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                  side: const BorderSide(color: AppColors.neutral200),
                ),
                child: ListTile(
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.navy700.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(action['icon'],
                        color: AppColors.navy700, size: 22),
                  ),
                  title: Text(
                    action['title'],
                    style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: AppColors.navy900),
                  ),
                  subtitle: Text(
                    action['desc'],
                    style: TextStyle(fontSize: 12, color: AppColors.neutral500),
                  ),
                  trailing: const Icon(Icons.arrow_forward_ios_rounded,
                      size: 14, color: AppColors.neutral300),
                  onTap: () {
                    final title = action['title'];
                    Widget? tujuan;
                    if (title == 'Laporan Harian') {
                      if (category.contains('Yandal')) {
                        tujuan = YandalScreen(sesi: widget.sesi);
                      } else if (category.contains('ROW')) {
                        tujuan = LaporanRowScreen(
                          sesi: widget.sesi,
                          targetSubTim: team['name'],
                          onBack: () => setState(() => _activeSubScreen = null),
                        );
                      } else if (category.contains('Hartek')) {
                        tujuan = LaporanHartekScreen(
                          sesi: widget.sesi,
                          onBack: () => setState(() => _activeSubScreen = null),
                        );
                      } else {
                        tujuan = LaporanHarianScreen(
                          sesi: widget.sesi,
                          targetSubTim: team['name'],
                          targetTim: team['category'],
                        );
                      }
                    }
                    if (title == 'Work Order (WO)' && category.contains('ROW')) {
                      tujuan = WorkOrderRowScreen(
                        sesi: widget.sesi,
                        targetSubTim: team['name'],
                        onBack: () => setState(() => _activeSubScreen = null),
                      );
                    }
                    if (tujuan == null) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Menu $title segera hadir')),
                      );
                    } else {
                      _bukaMenuTerproteksi(title, tujuan);
                    }
                  },
                ),
              )),
        ],
      ),
    );
  }

  Widget _buildMenuTeknik() {
    final List<Map<String, dynamic>> subTeknik = [
      {
        'title': 'Jadwal Padam',
        'icon': Icons.calendar_month_rounded,
        'desc': 'Rencana pemadaman, dampak pelanggan, status, dan laporan WA',
        'iconColor': AppColors.plnRed,
      },
      {
        'title': 'Input Temuan',
        'icon': Icons.add_alert_rounded,
        'desc': 'Temuan C4A',
        'iconColor': AppColors.cyan600,
      },
      {
        'title': 'Penugasan Tim',
        'icon': Icons.group_add_outlined,
        'desc': 'Pilih Tim Eksekusi untuk TO yang menunggu penugasan',
        'iconColor': AppColors.amber700,
      },
      {
        'title': 'Pindah Tim Eksekusi TO',
        'icon': Icons.swap_horiz_rounded,
        'desc': 'Pindahkan TO aktif ke Tim Eksekusi lain',
        'iconColor': AppColors.cyan600,
      },
      {
        'title': 'Verifikasi P0',
        'icon': Icons.verified_outlined,
        'desc': 'Verifikasi & persetujuan penugasan P0 Yandal',
        'iconColor': AppColors.navy700,
      },
      {
        'title': 'Checkpoint Jaringan',
        'icon': Icons.location_on_outlined,
        'desc': 'Monitoring dan data checkpoint jalur penyulang',
        'iconColor': AppColors.navy700,
      },
      {
        'title': 'Rekap Gangguan',
        'icon': Icons.electric_bolt_outlined,
        'desc': 'Rekapitulasi padam & gangguan distribusi',
        'iconColor': AppColors.amber700,
      },
      {
      'title': 'Pemakaian Engine',
      'icon': Icons.speed_rounded,
      'desc': 'Pantau request harian Watermark, BA PDF, dan ROW PDF',
      'iconColor': AppColors.success700,
    },
      {
        'title': 'Laporan UP3 / UIW',
        'icon': Icons.assessment_outlined,
        'desc': 'Format pelaporan hierarki harian unit induk',
        'iconColor': AppColors.navy700,
      },
    ];

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
          tooltip: 'Kembali ke beranda',
          onPressed: _kembaliKeAwal,
        ),
        title: const Text('SiSi — Menu Teknik',
            style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.white)),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Center(child: _buildIndikatorOnline()),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Modul Verifikasi & Monitoring Teknik',
            style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: AppColors.navy700),
          ),
          const SizedBox(height: 12),
          ...subTeknik.map((item) {
            final color = (item['iconColor'] as Color?) ?? AppColors.navy700;
            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
                side: const BorderSide(color: AppColors.neutral200),
              ),
              child: ListTile(
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(item['icon'], color: color, size: 22),
                ),
                title: Text(
                  item['title'],
                  style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: AppColors.navy900),
                ),
                subtitle: Text(
                  item['desc'],
                  style: TextStyle(fontSize: 12, color: AppColors.neutral500),
                ),
                trailing: const Icon(Icons.arrow_forward_ios_rounded,
                    size: 14, color: AppColors.neutral300),
                onTap: () {
                  final title = item['title'];
                  Widget? tujuan;
                  if (title == 'Jadwal Padam') {
          tujuan = JadwalPadamScreen(
            sesi: widget.sesi,
            onBack: () => setState(() => _activeSubScreen = null),
          );
        } else if (title == 'Input Temuan') {
                    tujuan = InputTemuanTeknikScreen(sesi: widget.sesi);
                  } else if (title == 'Penugasan Tim') {
                    tujuan = TeknikToScreen(
                      sesi: widget.sesi,
                      mode: 'assignment',
                      onBack: () => setState(() => _activeSubScreen = null),
                    );
                  } else if (title == 'Pindah Tim Eksekusi TO') {
                    tujuan = TeknikToScreen(
                      sesi: widget.sesi,
                      mode: 'move',
                      onBack: () => setState(() => _activeSubScreen = null),
                    );
                  } else if (title == 'Verifikasi P0') {
                    tujuan = VerifikasiP0Screen(sesi: widget.sesi);
                  } else if (title == 'Pemakaian Engine') {
          tujuan = EngineUsageScreen(
            onBack: () => setState(() => _activeSubScreen = null),
          );
                  } else if (title == 'Laporan UP3 / UIW') {
                    tujuan = LaporanUp3UiwScreen(
                      sesi: widget.sesi,
                      onBack: () => setState(() => _activeSubScreen = null),
                    );
                  }
                  if (tujuan == null) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Menu $title segera hadir')),
                    );
                  } else {
                    _bukaMenuTerproteksi(title, tujuan);
                  }
                },
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildMenuPengaturan() {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
          tooltip: 'Kembali ke beranda',
          onPressed: _kembaliKeAwal,
        ),
        title: const Text('SiSi — Pengaturan',
            style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.white)),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Center(child: _buildIndikatorOnline()),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            child: ListTile(
              leading: const Icon(Icons.account_circle_outlined,
                  color: AppColors.navy700),
              title: Text(widget.sesi['username'] ?? 'User',
                  style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text('${widget.sesi['role']} • ${widget.sesi['ulp']}'),
            ),
          ),
          const SizedBox(height: 16),
          SyncSectionPengaturan(sesi: widget.sesi),
          const SizedBox(height: 16),
          Card(
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            child: ListTile(
              leading:
                  const Icon(Icons.logout_rounded, color: AppColors.red600),
              title: const Text('Keluar dari Akun',
                  style: TextStyle(
                      color: AppColors.red600, fontWeight: FontWeight.bold)),
              onTap: _handleLogout,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleLogout() async {
    final yakin = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Keluar dari akun?',
            style: TextStyle(fontWeight: FontWeight.bold)),
        content: const Text('Sesi kamu akan dihapus dari perangkat ini.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.red600,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Keluar'),
          ),
        ],
      ),
    );
    if (yakin != true || !mounted) return;

    try {
      final token = widget.sesi['token'] ?? '';
      if (token.toString().isNotEmpty) {
        await ApiService.logout(token.toString());
      }
    } catch (_) {}

    await AutoSyncService.deactivate();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('username');
    await prefs.remove('role');
    await prefs.remove('aksesMenu');

    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }
}

class NavbarWithNotchPainter extends CustomPainter {
  final double? notchCenterX;
  NavbarWithNotchPainter({this.notchCenterX});

  @override
  void paint(Canvas canvas, Size size) {
    final bgPaint = Paint()..color = Colors.white;

    final linePaint = Paint()
      ..color = AppColors.navy700
      ..strokeWidth = 3.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    const bottomBaseY = 14.0;
    const bubbleCenterY = 11.0;
    const topGapRadius = 40.0;
    const bottomGapRadius = 38.0;

    final path = Path();
    path.moveTo(0, 0);

    final topLinePath = Path();
    topLinePath.moveTo(0, 0);
    final bottomLinePath = Path();
    bottomLinePath.moveTo(0, bottomBaseY);

    if (notchCenterX != null) {
      final cx = notchCenterX!;

      const dyTop = 0 - bubbleCenterY;
      final reachTop = math.sqrt(topGapRadius * topGapRadius - dyTop * dyTop);
      path.lineTo(cx - reachTop, 0);
      path.arcToPoint(
        Offset(cx + reachTop, 0),
        radius: const Radius.circular(topGapRadius),
        clockwise: true,
      );

      final topStart = math.pi - math.atan2(dyTop, reachTop);
      final topEnd = math.atan2(dyTop, reachTop);
      topLinePath.lineTo(cx - reachTop, 0);
      topLinePath.arcTo(
        Rect.fromCircle(
            center: Offset(cx, bubbleCenterY), radius: topGapRadius),
        topStart,
        (topEnd - topStart) + 2 * math.pi,
        false,
      );

      const dyBot = bottomBaseY - bubbleCenterY;
      final reachBot =
          math.sqrt(bottomGapRadius * bottomGapRadius - dyBot * dyBot);
      final botStart = math.pi - math.atan2(dyBot, reachBot);
      final botEnd = math.atan2(dyBot, reachBot);
      bottomLinePath.lineTo(cx - reachBot, bottomBaseY);
      bottomLinePath.arcTo(
        Rect.fromCircle(
            center: Offset(cx, bubbleCenterY), radius: bottomGapRadius),
        botStart,
        botEnd - botStart,
        false,
      );
    }

    path.lineTo(size.width, 0);
    topLinePath.lineTo(size.width, 0);
    bottomLinePath.lineTo(size.width, bottomBaseY);

    path.lineTo(size.width, size.height);
    path.lineTo(0, size.height);
    path.close();

    canvas.drawPath(path, bgPaint);
    canvas.drawPath(topLinePath, linePaint);
    canvas.drawPath(bottomLinePath, linePaint);
  }

  @override
  bool shouldRepaint(covariant NavbarWithNotchPainter oldDelegate) {
    return oldDelegate.notchCenterX != notchCenterX;
  }
}
