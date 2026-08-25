from pathlib import Path
p=Path('SiSi_Mobile/lib/screens/dashboard_screen.dart')
s=p.read_text()
needle="import 'engine_usage_screen.dart';"
if "import 'yandal_screen.dart';" not in s:
    if needle not in s: raise SystemExit('dashboard import anchor not found')
    s=s.replace(needle, needle+"\nimport 'yandal_screen.dart';",1)
old="""if (title == 'Laporan Harian') {
                      if (category.contains('ROW')) {"""
new="""if (title == 'Laporan Harian') {
                      if (category.contains('Yandal')) {
                        tujuan = YandalScreen(sesi: widget.sesi);
                      } else if (category.contains('ROW')) {"""
if old in s:
    s=s.replace(old,new,1)
elif "tujuan = YandalScreen(sesi: widget.sesi);" not in s:
    raise SystemExit('dashboard route anchor not found')
p.write_text(s)
