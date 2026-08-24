from pathlib import Path

path = Path('SiSi_Mobile/lib/screens/dashboard_screen.dart')
source = path.read_text(encoding='utf-8')

import_anchor = "import 'input_temuan_teknik_screen.dart';"
import_line = "import 'teknik_to_screen.dart';"
if import_line not in source:
    if import_anchor not in source:
        raise SystemExit('import anchor not found')
    source = source.replace(import_anchor, import_anchor + '\n' + import_line, 1)

menu_anchor = """      {
        'title': 'Verifikasi P0',"""
menu_items = """      {
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
"""
if "'title': 'Penugasan Tim'" not in source:
    if menu_anchor not in source:
        raise SystemExit('menu anchor not found')
    source = source.replace(menu_anchor, menu_items + menu_anchor, 1)

route_anchor = """                  if (title == 'Input Temuan') {
                    tujuan = InputTemuanTeknikScreen(sesi: widget.sesi);
                  } else if (title == 'Verifikasi P0') {"""
route_replacement = """                  if (title == 'Input Temuan') {
                    tujuan = InputTemuanTeknikScreen(sesi: widget.sesi);
                  } else if (title == 'Penugasan Tim') {
                    tujuan = TeknikToScreen(sesi: widget.sesi, mode: 'assignment');
                  } else if (title == 'Pindah Tim Eksekusi TO') {
                    tujuan = TeknikToScreen(sesi: widget.sesi, mode: 'move');
                  } else if (title == 'Verifikasi P0') {"""
if "mode: 'assignment'" not in source:
    if route_anchor not in source:
        raise SystemExit('route anchor not found')
    source = source.replace(route_anchor, route_replacement, 1)

path.write_text(source, encoding='utf-8')
