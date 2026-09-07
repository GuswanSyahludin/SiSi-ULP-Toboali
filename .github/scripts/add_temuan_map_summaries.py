import json
from pathlib import Path

path = Path('.ngodingpakeai/summaries.json')
data = json.loads(path.read_text(encoding='utf-8'))
data.update({
    'SiSi_Mobile/lib/db/repositories/temuan_map_repository.dart': {
        'summary': 'Membaca mirror lokal dual-read db_INS_Temuan, memvalidasi koordinat, membatasi data berdasarkan ULP, menghapus duplikat berdasarkan kode pekerjaan, dan menyediakan model titik untuk Peta Temuan.'
    },
    'SiSi_Mobile/lib/screens/peta_temuan_screen.dart': {
        'summary': 'Menampilkan Peta Temuan mobile berbasis flutter_map dan OpenStreetMap, lengkap dengan marker berdasarkan status, pencarian, filter tier dan status, jumlah titik, fokus marker, detail temuan, serta attribution.'
    },
    'SiSi_Mobile/test/temuan_map_repository_test.dart': {
        'summary': 'Menguji parsing baris db_INS_Temuan menjadi titik peta, penolakan koordinat tidak valid, dan fallback pembacaan dari kolom koordinat gabungan.'
    },
})
path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
