import unittest
from pathlib import Path

import audit_signing


class SigningAuditTest(unittest.TestCase):
    def test_current_source_is_fail_closed(self):
        self.assertEqual(audit_signing.main(), 0)

    def test_release_guard_is_present(self):
        gradle = Path(audit_signing.ANDROID / "app" / "build.gradle.kts").read_text(encoding="utf-8")
        self.assertIn("Release signing is required", gradle)


if __name__ == "__main__":
    unittest.main()
