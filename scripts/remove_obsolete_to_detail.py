from pathlib import Path
p=Path('SiSi_Mobile/lib/screens/teknik_to_screen.dart')
s=p.read_text()
start=s.index('  Future<void> _detail(Map<String, dynamic> row) async {')
end=s.index('\n}\n\nclass _SyncBadge', start)
s=s[:start]+s[end:]
start=s.index('\nclass _ToDetailSheet extends StatefulWidget')
s=s[:start].rstrip()+'\n'
p.write_text(s)
