from pathlib import Path
p=Path('SiSi_BackEnd/Core/Main.html')
s=p.read_text()
old="""    var PAGE_ACCESS_PARENT = {
      'SIE-LaporanTeknik': 'SIE-Teknik',
      'SIE-BeritaAcara': 'SIE-Teknik',"""
new="""    var PAGE_ACCESS_PARENT = {
      'SIE-LaporanTeknik': 'SIE-Teknik',
      'Jadwal-Padam': 'SIE-Teknik',
      'SIE-BeritaAcara': 'SIE-Teknik',"""
if old not in s: raise SystemExit('client PAGE_ACCESS_PARENT anchor missing')
s=s.replace(old,new,1)
p.write_text(s)
