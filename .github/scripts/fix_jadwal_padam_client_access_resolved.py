from pathlib import Path

main_path = Path("SiSi_BackEnd/Core/Main.html")
main = main_path.read_text()
client_entry = "      'Jadwal-Padam': 'SIE-Teknik',\n"
if client_entry not in main:
    anchor = "      'SIE-LaporanTeknik': 'SIE-Teknik',\n"
    if anchor not in main:
        raise SystemExit("client PAGE_ACCESS_PARENT anchor missing")
    main = main.replace(anchor, anchor + client_entry, 1)
    main_path.write_text(main)

code_path = Path("SiSi_BackEnd/Core/Code.js")
code = code_path.read_text()
wrong_route = '  "Jadwal-Padam": "Teknik/SIE-Teknik",'
right_route = '  "Jadwal-Padam": "Teknik/Jadwal-Padam",'
if right_route not in code:
    if wrong_route not in code:
        raise SystemExit("Jadwal Padam backend route anchor missing")
    code = code.replace(wrong_route, right_route, 1)
    code_path.write_text(code)

print("Jadwal Padam route and access chain patched")
