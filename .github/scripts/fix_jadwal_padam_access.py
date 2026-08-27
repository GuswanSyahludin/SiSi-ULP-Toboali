from pathlib import Path

p=Path('SiSi_BackEnd/Core/Code.js')
s=p.read_text()
old='''  "SIE-Teknik": "Teknik/SIE-Teknik",\n  "SIE-LaporanTeknik": "Teknik/SIE-Teknik",'''
new='''  "SIE-Teknik": "Teknik/SIE-Teknik",\n  "Jadwal-Padam": "Teknik/SIE-Teknik",\n  "SIE-LaporanTeknik": "Teknik/SIE-Teknik",'''
if old not in s: raise SystemExit('Code.js alias anchor missing')
s=s.replace(old,new,1)
old='''  "SIE-LaporanTeknik": "SIE-Teknik",\n  "SIE-BeritaAcara": "SIE-Teknik",'''
new='''  "SIE-LaporanTeknik": "SIE-Teknik",\n  "Jadwal-Padam": "SIE-Teknik",\n  "SIE-BeritaAcara": "SIE-Teknik",'''
if old not in s: raise SystemExit('Code.js access anchor missing')
s=s.replace(old,new,1)
p.write_text(s)

p=Path('SiSi_BackEnd/Core/Main.html')
s=p.read_text()
old="'Tek-Data-Checkpoint':'Tek-Data-Checkpoint'"
# No-op guard: Main already contains the label, keep this script focused on Code.js.
if "'Jadwal-Padam':'Jadwal Padam'" not in s: raise SystemExit('Main label missing')
if "'Jadwal-Padam':'fa-calendar-xmark'" not in s: raise SystemExit('Main icon missing')
if "'SIE-Teknik': ['SIE-LaporanTeknik','Jadwal-Padam'" not in s: raise SystemExit('Main submenu missing')
p.write_text(s)
