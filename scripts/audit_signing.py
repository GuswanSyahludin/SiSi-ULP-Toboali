#!/usr/bin/env python3
"""Fail-closed source audit for Android release signing configuration."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ANDROID = ROOT / "SiSi_Mobile" / "android"
FORBIDDEN_SUFFIXES = {".jks", ".keystore", ".p12", ".pfx"}


def main() -> int:
    failures: list[str] = []
    tracked = [p for p in ANDROID.rglob("*") if p.is_file()]
    for path in tracked:
        if path.name == "key.properties" or path.suffix.lower() in FORBIDDEN_SUFFIXES:
            failures.append(f"tracked signing material: {path.relative_to(ROOT)}")
        if path.name.endswith(".pem") or path.name.endswith(".key"):
            failures.append(f"tracked private-key material: {path.relative_to(ROOT)}")

    gradle = (ANDROID / "app" / "build.gradle.kts").read_text(encoding="utf-8")
    if "Release signing is required" not in gradle:
        failures.append("release Gradle configuration does not fail closed")
    if re.search(r"(storePassword|keyPassword)\s*=\s*\"[^$][^\"]+\"", gradle):
        failures.append("hardcoded signing password in Gradle")
    if failures:
        print("Signing audit failed:")
        print("\n".join(f"- {item}" for item in failures))
        return 1
    print("Signing source audit passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
