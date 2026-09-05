from pathlib import Path

path = Path('SiSi_BackEnd/Core/Delta-Sync-Mobile.js')
source = path.read_text()
old = '''  for (var i = 0; i < sheets.length; i++) {
    var normalized = String(sheets[i].getName() || "")
      .trim()
      .toLowerCase();
    if (normalized === "db_list_petugas_yandal") {
      sh = sheets[i];
      break;
    }
  }
'''
new = '''  var candidates = {
    "db_list_petugas_yandal": true,
    "db_yandal_list_petugas": true,
    "list_petugas_yandal": true,
    "list petugas yandal": true,
  };
  for (var i = 0; i < sheets.length; i++) {
    var normalized = String(sheets[i].getName() || "")
      .trim()
      .toLowerCase()
      .replace(/\\s+/g, " ");
    var underscored = normalized.replace(/ /g, "_");
    if (candidates[normalized] || candidates[underscored]) {
      sh = sheets[i];
      break;
    }
  }
'''
if source.count(old) != 1:
    raise SystemExit(f'petugas sheet marker count={source.count(old)}')
source = source.replace(old, new, 1)
old2 = '''  if (!sh || sh.getLastRow() < 2) return [];
'''
new2 = '''  if (!sh)
    throw new Error(
      "Sheet List Petugas Yandal tidak ditemukan. Nama yang didukung: db_List_Petugas_Yandal, db_Yandal_List_Petugas, List Petugas Yandal.",
    );
  if (sh.getLastRow() < 2) return [];
'''
# Replace only within the petugas function.
function_start = source.index('function _deltaYandalPetugasRows_()')
position = source.index(old2, function_start)
source = source[:position] + new2 + source[position + len(old2):]
path.write_text(source)
assert '"list petugas yandal": true' in path.read_text()
