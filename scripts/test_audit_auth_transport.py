#!/usr/bin/env python3
import tempfile
import unittest
from pathlib import Path

from audit_auth_transport import findings


class AuthTransportAuditTest(unittest.TestCase):
    def scan(self, source: str):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "sample.dart"
            path.write_text(source, encoding="utf-8")
            return findings(Path(tmp))

    def test_allows_post_json_body(self):
        self.assertEqual([], self.scan("body: jsonEncode({'token': token})"))

    def test_rejects_token_in_interpolated_url(self):
        self.assertTrue(self.scan("Uri.parse('$base?mobile=1&token=$token')"))

    def test_rejects_multiline_adjacent_url_fragment(self):
        self.assertTrue(self.scan("Uri.parse('$base?mobile=1' '&deviceToken=${dev}')"))

    def test_rejects_query_parameter_map(self):
        self.assertTrue(self.scan("Uri.parse(base).replace(queryParameters: {'token': token})"))

    def test_allows_non_auth_query_parameters(self):
        self.assertEqual([], self.scan("Uri.parse(base).replace(queryParameters: {'page': '1'})"))


if __name__ == '__main__':
    unittest.main()
