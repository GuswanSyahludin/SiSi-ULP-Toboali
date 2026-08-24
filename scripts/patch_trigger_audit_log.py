from pathlib import Path
p = Path('SiSi_BackEnd/Core/Trigger-Manager.js')
s = p.read_text(encoding='utf-8')
old = '''  return {
    ok: kurang.length === 0 && lebih.length === 0 && duplikat.length === 0,
    total: trs.length,
    permanen: TRIGGER_SISI_PERMANEN.length,
    semua: semua,
    kurang: kurang,
    lebih: lebih,
    duplikat: duplikat,
    sementara: sementara,
    catatan: "migrasiSemuaTick/job sekali-jalan boleh muncul sementara dan harus melepas diri saat selesai.",
  };
}'''
new = '''  var hasil = {
    ok: kurang.length === 0 && lebih.length === 0 && duplikat.length === 0,
    total: trs.length,
    permanen: TRIGGER_SISI_PERMANEN.length,
    semua: semua,
    kurang: kurang,
    lebih: lebih,
    duplikat: duplikat,
    sementara: sementara,
    catatan: "migrasiSemuaTick/job sekali-jalan boleh muncul sementara dan harus melepas diri saat selesai.",
  };
  Logger.log("[auditTriggerSiSi] " + JSON.stringify(hasil));
  return hasil;
}'''
if old not in s:
    raise SystemExit('Target auditTriggerSiSi tidak ditemukan')
p.write_text(s.replace(old, new, 1), encoding='utf-8')
