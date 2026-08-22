// lib/db/repositories/p0_repository.dart
// ───────────────────────────────────────────────────
// Repository Verifikasi P0 — satu-satunya lapisan yang boleh disentuh UI.
//
// ATURAN MENU INI (Rev 22 Agu 2026):
//   MEMBACA daftar : server dulu → cermin lokal disegarkan → offline baca cermin.
//   MENULIS keputusan : SELALU ke server lokal (SQLite) dulu. TIDAK ada satu pun
//     permintaan jaringan saat Approve/Reject ditekan.
//   MENGIRIM : hanya lewat Pengaturan → Sinkron (kirimAntrean), yang meneruskan
//     ke Apps Script (setMobileApprovalP0) lalu ke gsheet.
//
// Efeknya untuk admin: keputusan terasa seketika, dan verifikasi bisa dikerjakan
// di lapangan tanpa sinyal — pengiriman menyusul saat kembali online.
// ───────────────────────────────────────────────────

import 'dart:convert';

import 'package:drift/drift.dart' show Value;

import '../../services/api_service.dart';
import '../app_database.dart'; // wajib: Companion class hasil generate ada di sini
import '../db_provider.dart';

class P0Repository {
  P0Dao get _dao => DbProvider.instance.p0Dao;

  // ═════ BACA DAFTAR ═════

  /// Daftar kartu P0 untuk 1 tanggal + 1 status.
  ///
  /// Bentuk balasan menyerupai ApiService.getApprovalP0List agar UI lama nyaris
  /// tidak berubah, dengan tambahan:
  ///   'offline'      : true bila daftar berasal dari cermin lokal
  ///   'jumlahAntrean': banyaknya keputusan yang belum dikirim
  /// dan pada tiap item:
  ///   'lokalPending' : true bila status item berasal dari keputusan lokal yang
  ///                    BELUM terkirim (UI menandainya "belum tersinkron").
  Future<Map<String, dynamic>> bacaList({
    required String ulp,
    required String status,
    required String tanggal,
  }) async {
    var offline = false;

    // 1) Server dulu — status "semua" agar cermin lokal lengkap untuk ketiga tab
    //    sekali tarik (hemat permintaan: pindah tab tidak menembak server lagi).
    try {
      final res = await ApiService.getApprovalP0List(
        ulp: ulp,
        status: '',
        tanggal: tanggal,
      );
      if (res['ok'] == true) {
        await _segarkanCermin(ulp, tanggal, List<dynamic>.from(res['list'] ?? []));
      } else {
        offline = true;
      }
    } catch (_) {
      offline = true;
    }

    // 2) Selalu sajikan dari cermin lokal supaya hasilnya identik online maupun
    //    offline, dan keputusan yang belum terkirim ikut terlihat.
    final baris = await _dao.bacaCermin(ulp, tanggal);
    final antrean = await _dao.antrean();
    final petaKeputusan = {for (final a in antrean) a.kodeP0: a};

    final hasil = <Map<String, dynamic>>[];
    final counts = <String, int>{'Menunggu': 0, 'Approved': 0, 'Rejected': 0};

    for (final b in baris) {
      Map<String, dynamic> item;
      try {
        item = Map<String, dynamic>.from(jsonDecode(b.dataJson));
      } catch (_) {
        continue; // baris rusak — lewati, jangan sampai menjatuhkan daftar
      }

      // Keputusan lokal MENANG atas status server: itulah yang baru saja
      // dilakukan admin, walau server belum tahu.
      final lokal = petaKeputusan[b.kodeP0];
      final statusTampil = lokal?.keputusan ?? b.statusServer;
      item['status'] = statusTampil;
      item['lokalPending'] = lokal != null;
      if (lokal != null) {
        item['lokalKeputusanPada'] = lokal.dibuatPada;
        item['lokalGagal'] = lokal.status == 'gagal' ? lokal.pesanGagal : '';
        if (lokal.keputusan == 'Rejected' && lokal.alasan.isNotEmpty) {
          item['alasanRejected'] = lokal.alasan;
        }
      }

      counts[statusTampil] = (counts[statusTampil] ?? 0) + 1;
      if (status.isEmpty || statusTampil == status) hasil.add(item);
    }

    if (baris.isEmpty && offline) {
      return {
        'ok': false,
        'offline': true,
        'message':
            'Tidak ada koneksi & belum ada data P0 tersimpan di HP untuk tanggal ini. '
                'Buka menu ini sekali saat online agar datanya tersimpan.',
        'jumlahAntrean': antrean.length,
      };
    }

    return {
      'ok': true,
      'offline': offline,
      'list': hasil,
      'counts': counts,
      'jumlahAntrean': antrean.length,
    };
  }

  Future<void> _segarkanCermin(
    String ulp,
    String tanggal,
    List<dynamic> list,
  ) async {
    final now = DateTime.now().toIso8601String();
    final baris = <P0LokalsCompanion>[];
    for (final e in list) {
      final item = Map<String, dynamic>.from(e as Map);
      final kode = (item['kodeP0'] ?? '').toString().trim();
      if (kode.isEmpty) continue;
      baris.add(P0LokalsCompanion(
        kodeP0: Value(kode),
        ulp: Value((item['ulp'] ?? ulp).toString()),
        tanggal: Value((item['tanggal'] ?? tanggal).toString()),
        statusServer: Value((item['status'] ?? 'Menunggu').toString()),
        dataJson: Value(jsonEncode(item)),
        diambilPada: Value(now),
      ));
    }
    await _dao.gantiCermin(ulp, tanggal, baris);
  }

  // ═════ TULIS KEPUTUSAN (LOKAL SAJA) ═════

  /// Catat keputusan ke server lokal. TIDAK menyentuh jaringan.
  Future<Map<String, dynamic>> catatKeputusan({
    required String kodeP0,
    required String keputusan,
    required String username,
    String alasan = '',
    String tanggal = '',
  }) async {
    if (keputusan == 'Rejected' && alasan.trim().isEmpty) {
      return {'ok': false, 'message': 'Alasan penolakan wajib diisi.'};
    }
    try {
      await _dao.simpanKeputusan(P0OutboxesCompanion(
        kodeP0: Value(kodeP0),
        keputusan: Value(keputusan),
        alasan: Value(alasan.trim()),
        username: Value(username),
        tanggal: Value(tanggal),
        dibuatPada: Value(DateTime.now().toIso8601String()),
        status: const Value('pending'),
        percobaan: const Value(0),
        pesanGagal: const Value(''),
      ));
      final sisa = (await _dao.antrean()).length;
      return {'ok': true, 'jumlahAntrean': sisa};
    } catch (e) {
      return {'ok': false, 'message': 'Gagal menyimpan ke server lokal: $e'};
    }
  }

  /// Batalkan keputusan yang belum terkirim.
  Future<Map<String, dynamic>> batalkanKeputusan(String kodeP0) async {
    await _dao.batalkan(kodeP0);
    return {'ok': true, 'jumlahAntrean': (await _dao.antrean()).length};
  }

  Future<int> jumlahAntrean() async => (await _dao.antrean()).length;

  Stream<List<P0Outbox>> pantauAntrean() => _dao.pantauAntrean();

  // ═════ KIRIM ANTREAN (dipanggil kartu Sinkron di Pengaturan) ═════

  /// Kirim seluruh antrean ke Apps Script, satu per satu.
  ///
  /// Sengaja BERURUTAN (bukan paralel): Apps Script punya batas eksekusi
  /// simultan, dan menembakkan puluhan permintaan sekaligus justru membuat
  /// approval/login lain ikut timeout. Baris yang gagal TETAP di antrean
  /// lengkap dengan pesannya, jadi sync berikutnya cukup mengulang sisanya.
  Future<Map<String, dynamic>> kirimAntrean() async {
    final antrean = await _dao.antrean();
    if (antrean.isEmpty) {
      return {'ok': true, 'terkirim': 0, 'gagal': 0, 'kosong': true};
    }

    var terkirim = 0;
    var gagal = 0;
    final pesan = <String>[];

    for (final a in antrean) {
      try {
        final res = await ApiService.setApprovalP0(
          kodeP0: a.kodeP0,
          keputusan: a.keputusan,
          username: a.username,
          alasan: a.alasan,
        );
        if (res['ok'] == true) {
          await _dao.hapusTerkirim(a.kodeP0);
          // Cermin ikut diperbarui agar kartu pindah tab tanpa tarik ulang.
          await _dao.setStatusServer(a.kodeP0, a.keputusan);
          terkirim++;
        } else {
          gagal++;
          final p = (res['error'] ?? res['message'] ?? 'ditolak server')
              .toString();
          await _dao.tandaiGagal(a.kodeP0, a.percobaan + 1, p);
          pesan.add('${a.kodeP0}: $p');
        }
      } catch (e) {
        gagal++;
        await _dao.tandaiGagal(a.kodeP0, a.percobaan + 1, 'timeout/jaringan');
        pesan.add('${a.kodeP0}: timeout/jaringan');
      }
    }

    return {
      'ok': gagal == 0,
      'terkirim': terkirim,
      'gagal': gagal,
      'message': gagal == 0
          ? '$terkirim keputusan terkirim ke server & gsheet.'
          : '$terkirim terkirim, $gagal gagal. ${pesan.take(2).join(' | ')}',
    };
  }
}
