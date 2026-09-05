import 'dart:async';
import 'package:geolocator/geolocator.dart';

class AccurateLocationResult {
  final Position position;
  final int sampleCount;
  const AccurateLocationResult({required this.position, required this.sampleCount});
  String get coordinates => '${position.latitude.toStringAsFixed(6)}, ${position.longitude.toStringAsFixed(6)}';
  double get accuracy => position.accuracy;
  String get accuracyLabel => '±${accuracy.toStringAsFixed(1)} m';
}

class AccurateLocationException implements Exception {
  final String message;
  const AccurateLocationException(this.message);
  @override String toString() => message;
}

/// Distinct from permission, weak-signal and disabled-location errors.
class MockLocationException extends AccurateLocationException {
  const MockLocationException()
      : super('Silahkan Matikan Aplikasi Pihak Ke-3 GPS');
}

class AccurateLocationService {
  static const Duration defaultDuration = Duration(seconds: 15);
  static const double preferredAccuracyMeters = 8;
  static const double acceptableAccuracyMeters = 25;

  static Future<AccurateLocationResult> capture({Duration duration = defaultDuration, double targetAccuracy = preferredAccuracyMeters}) async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw const AccurateLocationException('Layanan lokasi belum aktif. Aktifkan GPS lalu coba lagi.');
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) permission = await Geolocator.requestPermission();
    if (permission == LocationPermission.denied) throw const AccurateLocationException('Izin lokasi ditolak.');
    if (permission == LocationPermission.deniedForever) {
      throw const AccurateLocationException('Izin lokasi ditolak permanen. Buka Pengaturan aplikasi untuk mengaktifkannya.');
    }

    Position? best;
    var samples = 0;
    var mocked = false;
    final completer = Completer<void>();
    late final StreamSubscription<Position> subscription;
    Timer? timer;
    void finish() { if (!completer.isCompleted) completer.complete(); }

    subscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.bestForNavigation, distanceFilter: 0),
    ).listen((position) {
      if (position.isMocked) { mocked = true; finish(); return; }
      if (position.accuracy <= 0 || !position.accuracy.isFinite) return;
      samples++;
      if (best == null || position.accuracy < best!.accuracy) best = position;
      if (position.accuracy <= targetAccuracy) finish();
    }, onError: (_) => finish());

    timer = Timer(duration, finish);
    await completer.future;
    timer.cancel();
    await subscription.cancel();
    if (mocked) throw const MockLocationException();

    if (best == null) {
      try {
        best = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.bestForNavigation, timeLimit: const Duration(seconds: 12));
        if (best!.isMocked) throw const MockLocationException();
        samples = 1;
      } on AccurateLocationException { rethrow; }
      catch (_) { throw const AccurateLocationException('GPS belum memperoleh posisi. Coba di area lebih terbuka.'); }
    }
    return AccurateLocationResult(position: best!, sampleCount: samples);
  }
}
