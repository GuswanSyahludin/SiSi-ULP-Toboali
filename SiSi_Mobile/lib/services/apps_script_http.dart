import 'dart:convert';

import 'package:http/http.dart' as base;

export 'package:http/http.dart' hide post;

/// POST helper for Apps Script ContentService, which answers with a 302 to a
/// one-time googleusercontent URL. Auth remains in the POST body and is never
/// copied into the redirect URL.
Future<base.Response> post(
  Object url, {
  Map<String, String>? headers,
  Object? body,
  Encoding? encoding,
}) async {
  final initial = url is Uri ? url : Uri.parse(url.toString());
  final client = base.Client();
  try {
    var current = initial;
    var request = base.Request('POST', current)
      ..followRedirects = false
      ..headers.addAll(headers ?? const {});
    if (encoding != null) request.encoding = encoding;
    if (body is String) {
      request.body = body;
    } else if (body is List<int>) {
      request.bodyBytes = body;
    } else if (body is Map<String, String>) {
      request.bodyFields = body;
    } else if (body != null) {
      request.body = body.toString();
    }

    for (var hop = 0; hop < 5; hop++) {
      final streamed = await client.send(request);
      final response = await base.Response.fromStream(streamed);
      if (!{301, 302, 303, 307, 308}.contains(response.statusCode)) {
        return response;
      }
      final location = response.headers['location'];
      if (location == null || location.trim().isEmpty) return response;
      final next = current.resolve(location);
      if (next.scheme != 'https' ||
          !(next.host == 'script.google.com' ||
              next.host == 'script.googleusercontent.com')) {
        throw StateError('Alamat redirect backend ditolak.');
      }
      if (response.statusCode == 307 || response.statusCode == 308) {
        throw StateError('Backend meminta pengiriman ulang POST.');
      }
      current = next;
      request = base.Request('GET', current)..followRedirects = false;
    }
    throw StateError('Terlalu banyak redirect backend.');
  } finally {
    client.close();
  }
}
