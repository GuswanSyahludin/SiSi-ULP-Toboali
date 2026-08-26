from pathlib import Path
p=Path('SiSi_Mobile/lib/screens/teknik_to_screen.dart')
s=p.read_text()
s=s.replace("findingOptions = _findingNames(result[2] as List<dynamic>);", "findingOptions = _findingNames(result[2]);")
s=s.replace("feederOptions = _feederNames(result[3] as List<dynamic>);", "feederOptions = _feederNames(result[3]);")
p.write_text(s)
