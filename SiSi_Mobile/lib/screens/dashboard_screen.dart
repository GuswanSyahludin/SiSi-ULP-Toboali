import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/physics.dart'; // SpringSimulation & SpringDescription (animasi pegas navbar)
import 'package:shared_preferences/shared_preferences.dart';
import '../theme/app_colors.dart';
import '../services/api_service.dart';
import 'laporan_harian_screen.dart';
import 'login_screen.dart';
import 'eksekusi_row_screen.dart';
import 'verifikasi_p0_screen.dart';
import 'laporan_up3_uiw_screen.dart';

class DashboardScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  const DashboardScreen({super.key, required this.sesi});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen>
    with SingleTickerProviderStateMixin {
  int selectedIndex = -1;
  int previousIndex = -1;
  late AnimationController _bubbleController;
  // Transisi memakai simulasi pegas (spring) — controller langsung dipakai sbg nilai animasi

  // Status koneksi untuk indikator Online/Offline di navbar
  bool _isOnline = true;
  Timer? _onlineTimer;

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
      'icon': Icons.electrical_services_rounded
    },
    {
      'name': 'Inspeksi Jaringan',
      'category': 'Inspeksi',
      'icon': Icons.alt_route_rounded
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
      vsync: this,
      // duration tidak dipakai — gerakan diatur simulasi pegas (spring)
    );
    _cekKoneksi();
    _onlineTimer = Timer.periodic(
      const Duration(seconds: 10),
      (_) => _cekKoneksi(),
    );
  }

  @override
  void dispose() {
    _onlineTimer?.cancel();
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
    return [
      Icons.people_outline_rounded,
      Icons.settings_outlined,
    ];
  }

  void _selectMenu(int index) {
    if (selectedIndex == index && _activeSubScreen == null) return;

    setState(() {
      previousIndex = selectedIndex;
      selectedIndex = index;
      _activeSubScreen = null;
      _selectedTeamDetail = null;
    });

    // Transisi garis & icon: simulasi pegas (spring) — gerakan mengalir halus
    // tanpa hentakan; damping 26 ≈ critical (nyaris tanpa pantulan berlebih)
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

  // Kembali ke tampilan awal (greeting) — dipakai tombol back di header menu
  void _kembaliKeAwal() {
    setState(() {
      previousIndex = -1;
      selectedIndex = -1;
      _activeSubScreen = null;
      _selectedTeamDetail = null;
    });
  }

  // ═══ INDIKATOR ONLINE/OFFLINE (Rev 20 Agu 2026) — cek koneksi tiap 10 dtk via
  // DNS lookup (tanpa package tambahan); indikator tampil di kanan atas header
  // (actions tiap AppBar dashboard) sehingga standby di semua menu.
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
    final warna = _isOnline ? const Color(0xFF059669) : const Color(0xFFDC2626);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: _isOnline ? const Color(0xFFECFDF5) : const Color(0xFFFEF2F2),
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
        backgroundColor:
            Colors.transparent, // transparan: foto background terlihat
        // Foto background 1080x1920 untuk SEMUA screen (opacity 0,5 agar konten
        // tetap terbaca; inner Scaffold dibuat transparan agar foto terlihat)
        body: Container(
          decoration: BoxDecoration(
            color: AppColors.neutral100,
            image: DecorationImage(
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
                      const bubbleSize =
                          56.0; // bubble diperbesar menampung icon aktif 1,7x

                      return Positioned(
                        left: currentX - (bubbleSize / 2),
                        top: -17,
                        child: Container(
                          width: bubbleSize,
                          height: bubbleSize,
                          decoration: BoxDecoration(
                            color: AppColors.navy700,
                            shape: BoxShape.circle,
                            // Garis 2px mengikuti batas bubble saat bubble berpindah menu
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
                            // Icon menu aktif = 1,7x icon non-aktif (22)
                            size: 37.4,
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
                                  // Label aktif: lebih besar, lebih tebal, lebih terang
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
      backgroundColor:
          Colors.transparent, // transparan: foto background terlihat
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        elevation: 0,
        title: const Text('SiSi Dashboard',
            style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.white)),
        // Indikator Online/Offline — selalu di kanan atas header
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Center(child: _buildIndikatorOnline()),
          ),
        ],
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
              style: TextStyle(
                fontSize: 20,
                color: AppColors.navy700,
              ),
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
        backgroundColor:
            Colors.transparent, // transparan: foto background terlihat
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
          // Indikator Online/Offline — selalu di kanan atas header
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
                        color: AppColors.navy700.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(team['icon'],
                          color: AppColors.navy700, size: 20),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          team['name'],
                          style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: AppColors.navy700),
                        ),
                        Text(
                          team['category'],
                          style: TextStyle(
                              fontSize: 11, color: Colors.grey.shade600),
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
          'desc': 'Input & pantau laporan kerja harian'
        },
        {
          'title': 'Tindak Lanjut Temuan',
          'icon': Icons.assignment_turned_in_outlined,
          'desc': 'Eksekusi temuan pohon / raba-raba'
        },
        {
          'title': 'Eksekusi Pekerjaan',
          'icon': Icons.cut_rounded,
          'desc': 'Pekerjaan penebangan & pemangkasan'
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
      backgroundColor:
          Colors.transparent, // transparan: foto background terlihat
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
        // Indikator Online/Offline — selalu di kanan atas header
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
                  child: Icon(team['icon'] ?? Icons.people,
                      color: Colors.white, size: 28),
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
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: Colors.grey.shade200),
                ),
                child: ListTile(
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.navy700.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(action['icon'],
                        color: AppColors.navy700, size: 22),
                  ),
                  title: Text(
                    action['title'],
                    style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: AppColors.navy700),
                  ),
                  subtitle: Text(
                    action['desc'],
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                  trailing: const Icon(Icons.arrow_forward_ios_rounded,
                      size: 14, color: Colors.grey),
                  onTap: () {
                    final title = action['title'];
                    if (title == 'Laporan Harian') {
                      _openSubScreen(LaporanHarianScreen(
                        sesi: widget.sesi,
                        targetSubTim: team['name'],
                        targetTim: team['category'],
                      ));
                    } else if (title == 'Eksekusi Pekerjaan') {
                      _openSubScreen(EksekusiRowScreen(
                        sesi: widget.sesi,
                        targetSubTim: team['name'],
                        targetTim: team['category'],
                      ));
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Menu $title segera hadir')),
                      );
                    }
                  },
                ),
              )),
        ],
      ),
    );
  }

  // ══════════════════════════════════════════
  // TAB 2: MENU TEKNIK (VERIFIKASI P0 ROUTING)
  // ══════════════════════════════════════════
  Widget _buildMenuTeknik() {
    final List<Map<String, dynamic>> subTeknik = [
      {
        'title': 'Verifikasi P0',
        'icon': Icons.verified_outlined,
        'desc': 'Verifikasi & persetujuan penugasan P0 Yandal',
      },
      {
        'title': 'Checkpoint Jaringan',
        'icon': Icons.location_on_outlined,
        'desc': 'Monitoring dan data checkpoint jalur penyulang',
      },
      {
        'title': 'Rekap Gangguan',
        'icon': Icons.electric_bolt_outlined,
        'desc': 'Rekapitulasi padam & gangguan distribusi',
      },
      {
        'title': 'Laporan UP3 / UIW',
        'icon': Icons.assessment_outlined,
        'desc': 'Format pelaporan hierarki harian unit induk',
      },
    ];

    return Scaffold(
      backgroundColor:
          Colors.transparent, // transparan: foto background terlihat
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
        // Indikator Online/Offline — selalu di kanan atas header
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
          ...subTeknik.map((item) => Card(
                margin: const EdgeInsets.only(bottom: 10),
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: Colors.grey.shade200),
                ),
                child: ListTile(
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.navy700.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child:
                        Icon(item['icon'], color: AppColors.navy700, size: 22),
                  ),
                  title: Text(
                    item['title'],
                    style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: AppColors.navy700),
                  ),
                  subtitle: Text(
                    item['desc'],
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                  trailing: const Icon(Icons.arrow_forward_ios_rounded,
                      size: 14, color: Colors.grey),
                  onTap: () {
                    if (item['title'] == 'Verifikasi P0') {
                      _openSubScreen(VerifikasiP0Screen(sesi: widget.sesi));
                    } else if (item['title'] == 'Laporan UP3 / UIW') {
                      _openSubScreen(LaporanUp3UiwScreen(
                        sesi: widget.sesi,
                        onBack: () => setState(() => _activeSubScreen = null),
                      ));
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                            content:
                                Text('Menu ${item['title']} segera hadir')),
                      );
                    }
                  },
                ),
              )),
        ],
      ),
    );
  }

  Widget _buildMenuPengaturan() {
    return Scaffold(
      backgroundColor:
          Colors.transparent, // transparan: foto background terlihat
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
        // Indikator Online/Offline — selalu di kanan atas header
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
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: ListTile(
              leading: const Icon(Icons.account_circle_outlined,
                  color: AppColors.navy700),
              title: Text(widget.sesi['username'] ?? 'User',
                  style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text('${widget.sesi['role']} • ${widget.sesi['ulp']}'),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: ListTile(
              leading:
                  const Icon(Icons.logout_rounded, color: Colors.redAccent),
              title: const Text('Keluar dari Akun',
                  style: TextStyle(
                      color: Colors.redAccent, fontWeight: FontWeight.bold)),
              onTap: _handleLogout,
            ),
          ),
        ],
      ),
    );
  }

  // ═══ LOGOUT (Rev 19 Agu siang) — sebelumnya pushNamedAndRemoveUntil('/login') tapi named route
  // '/login' tidak pernah didaftarkan di main.dart → error saat diklik. Kini: konfirmasi → hapus sesi
  // di server → hapus SharedPreferences → kembali ke LoginScreen.
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
              backgroundColor: Colors.redAccent,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Keluar'),
          ),
        ],
      ),
    );
    if (yakin != true || !mounted) return;

    // Hapus sesi di server (abaikan jika gagal — logout lokal tetap jalan)
    try {
      final token = widget.sesi['token'] ?? '';
      if (token.toString().isNotEmpty) {
        await ApiService.logout(token.toString());
      }
    } catch (_) {}

    // Hapus sesi lokal
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

    // Garis 3px DOUBLE kiri→kanan dgn jarak terpisah & RAPI: kedua garis adalah
    // busur lingkaran yang KONSENTRIS dgn bubble (pusat garis = pusat bubble),
    // jadi jarak garis ke icon seragam mengelilingi bubble. Garis ATAS lurus di
    // tepi atas navbar (y=0); garis BAWAH sejajar bottomBaseY px di bawahnya.
    // Background navbar ikut MENONJOL ke atas memeluk bubble (setengah lingkaran
    // putih di belakang icon) agar garis atas tidak tampak mengambang/tertinggal.
    final linePaint = Paint()
      ..color = AppColors.navy700
      ..strokeWidth = 3.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    const bottomBaseY = 14.0; // jarak garis bawah: 14px di bawah garis atas
    const bubbleCenterY = 11.0; // pusat bubble: top -17 + tinggi 56/2
    const topGapRadius =
        40.0; // garis atas + tonjolan background: radius 40 (jarak 12px dari bubble)
    const bottomGapRadius =
        38.0; // garis bawah: lingkaran radius 38 (jarak 10px dari bubble)

    final path = Path();
    path.moveTo(0, 0);

    final topLinePath = Path();
    topLinePath.moveTo(0, 0);
    final bottomLinePath = Path();
    bottomLinePath.moveTo(0, bottomBaseY);

    if (notchCenterX != null) {
      final cx = notchCenterX!;

      // Background: tepi atas navbar NAIK memeluk bubble — setengah lingkaran putih
      // di belakang icon, sekaligus jadi alas garis atas
      const dyTop = 0 - bubbleCenterY; // garis lurus di y=0
      final reachTop =
          math.sqrt(topGapRadius * topGapRadius - dyTop * dyTop); // ≈38,5
      path.lineTo(cx - reachTop, 0);
      path.arcToPoint(
        Offset(cx + reachTop, 0),
        radius: const Radius.circular(topGapRadius),
        clockwise: true, // menonjol ke atas mengikuti busur garis atas
      );

      // Garis ATAS — busur konsentris tepat di tepi tonjolan background
      final topStart = math.pi - math.atan2(dyTop, reachTop);
      final topEnd = math.atan2(dyTop, reachTop);
      topLinePath.lineTo(cx - reachTop, 0);
      topLinePath.arcTo(
        Rect.fromCircle(
            center: Offset(cx, bubbleCenterY), radius: topGapRadius),
        topStart,
        (topEnd - topStart) +
            2 * math.pi, // sweep searah jarum jam → lewat atas
        false,
      );

      // Garis BAWAH — busur konsentris melewati bawah bubble
      const dyBot = bottomBaseY - bubbleCenterY; // 3
      final reachBot =
          math.sqrt(bottomGapRadius * bottomGapRadius - dyBot * dyBot); // ≈37,9
      final botStart = math.pi - math.atan2(dyBot, reachBot);
      final botEnd = math.atan2(dyBot, reachBot);
      bottomLinePath.lineTo(cx - reachBot, bottomBaseY);
      bottomLinePath.arcTo(
        Rect.fromCircle(
            center: Offset(cx, bubbleCenterY), radius: bottomGapRadius),
        botStart,
        botEnd - botStart, // sweep negatif → lewat bawah
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
