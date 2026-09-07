from pathlib import Path

path = Path('SiSi_Mobile/lib/screens/dashboard_screen.dart')
s = path.read_text()
import_anchor = "import 'input_temuan_teknik_screen.dart';\n"
if s.count(import_anchor) != 1:
    raise SystemExit('dashboard import anchor changed')
s = s.replace(import_anchor, import_anchor + "import 'peta_temuan_screen.dart';\n", 1)
menu_anchor = """      {
        'title': 'Input Temuan',
        'icon': Icons.add_alert_rounded,
        'desc': 'Temuan C4A',
        'iconColor': AppColors.cyan600,
      },
"""
map_menu = menu_anchor + """      {
        'title': 'Peta Temuan',
        'icon': Icons.map_outlined,
        'desc': 'Peta temuan inspeksi dari data aktif dan arsip',
        'iconColor': AppColors.success700,
      },
"""
if s.count(menu_anchor) != 1:
    raise SystemExit('dashboard menu anchor changed')
s = s.replace(menu_anchor, map_menu, 1)
route_anchor = """        } else if (title == 'Input Temuan') {
                    tujuan = InputTemuanTeknikScreen(sesi: widget.sesi);
"""
route_replacement = route_anchor + """                  } else if (title == 'Peta Temuan') {
                    tujuan = PetaTemuanScreen(
                      sesi: widget.sesi,
                      onBack: () => setState(() => _activeSubScreen = null),
                    );
"""
if s.count(route_anchor) != 1:
    raise SystemExit('dashboard route anchor changed')
s = s.replace(route_anchor, route_replacement, 1)
path.write_text(s)
