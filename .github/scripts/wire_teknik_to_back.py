from pathlib import Path
p=Path('SiSi_Mobile/lib/screens/dashboard_screen.dart')
s=p.read_text(encoding='utf-8')
s=s.replace("tujuan = TeknikToScreen(sesi: widget.sesi, mode: 'assignment');", "tujuan = TeknikToScreen(\n                      sesi: widget.sesi,\n                      mode: 'assignment',\n                      onBack: () => setState(() => _activeSubScreen = null),\n                    );")
s=s.replace("tujuan = TeknikToScreen(sesi: widget.sesi, mode: 'move');", "tujuan = TeknikToScreen(\n                      sesi: widget.sesi,\n                      mode: 'move',\n                      onBack: () => setState(() => _activeSubScreen = null),\n                    );")
p.write_text(s,encoding='utf-8')
