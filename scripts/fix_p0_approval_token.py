from pathlib import Path

path = Path("SiSi_BackEnd/Core/Main.html")
text = path.read_text(encoding="utf-8")
anchor = '              "getApprovalP0List",\n'
if anchor not in text:
    raise SystemExit("getApprovalP0List token-list anchor not found")
if '              "setApprovalP0",\n' not in text:
    text = text.replace(anchor, anchor + '              "setApprovalP0",\n', 1)
path.write_text(text, encoding="utf-8")
