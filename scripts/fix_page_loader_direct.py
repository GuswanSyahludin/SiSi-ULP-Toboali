from pathlib import Path

path = Path("SiSi_BackEnd/Core/Main.html")
text = path.read_text(encoding="utf-8")
anchor = '''        SisiRun
          .withSuccessHandler(function (res) {'''
start = text.find(anchor, text.find("function _loadPage(pageName)"))
if start < 0:
    raise SystemExit("_loadPage SisiRun call not found")
text = text[:start] + text[start:].replace(anchor, '''        google.script.run
          .withSuccessHandler(function (res) {''', 1)
path.write_text(text, encoding="utf-8")
