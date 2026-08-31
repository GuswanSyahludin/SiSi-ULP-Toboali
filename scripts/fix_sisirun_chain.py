from pathlib import Path

path = Path("SiSi_BackEnd/Core/Main.html")
text = path.read_text(encoding="utf-8")
start_marker = "      var SisiRun = (function () {"
end_marker = "\n\n\n      /* ════════════════════\n      AKSES MENU (filter)"
start = text.find(start_marker)
end = text.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit("SisiRun block markers not found")
block = text[start:end]
if "var proxy;" in block:
    raise SystemExit("SisiRun proxy patch already present")
block = block.replace("        var api = {\n", "        var proxy;\n        var api = {\n", 1)
block = block.replace("            return api;\n", "            return proxy;\n", 3)
block = block.replace("        return new Proxy(api, {\n", "        proxy = new Proxy(api, {\n", 1)
block = block.replace("        });\n      })();", "        });\n        return proxy;\n      })();", 1)
path.write_text(text[:start] + block + text[end:], encoding="utf-8")
