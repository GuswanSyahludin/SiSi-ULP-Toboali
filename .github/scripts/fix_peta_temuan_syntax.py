from pathlib import Path

path = Path('SiSi_Mobile/lib/screens/peta_temuan_screen.dart')
source = path.read_text()

old_getters = " String get token=>'${widget.sesi['token']??''}',ulp=>'${widget.sesi['ulp']??''}';bool get allUlp=>"
new_getters = " String get token=>'${widget.sesi['token']??''}';String get ulp=>'${widget.sesi['ulp']??''}';bool get allUlp=>"
if source.count(old_getters) != 1:
    raise SystemExit('getter marker changed')
source = source.replace(old_getters, new_getters, 1)

old_alpha = "color:color(p.status).withValues(alpha:zoom<9?.62:.92)"
new_alpha = "color:color(p.status).withValues(alpha:zoom < 9 ? 0.62 : 0.92)"
if source.count(old_alpha) != 1:
    raise SystemExit('marker alpha marker changed')
source = source.replace(old_alpha, new_alpha, 1)

path.write_text(source)
