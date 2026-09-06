#!/usr/bin/env python3
"""Fail CI when Flutter places auth tokens in a URL or query parameter map."""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

AUTH_KEY = re.compile(r"(?i)\b(?:device_?token|token)\b")
TOKEN_IN_URL = re.compile(r"(?is)(?:device_?token|token)\s*=")
QUERY_MAP = re.compile(r"(?is)(?:queryParameters|queryParametersAll)\s*:\s*\{(.*?)\}")
STRING = re.compile(r"(?s)(?:r)?('''.*?'''|\"\"\".*?\"\"\"|'(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\")")


def findings(root: Path) -> list[str]:
    issues: list[str] = []
    for path in sorted(root.rglob("*.dart")):
        text = path.read_text(encoding="utf-8")
        for match in STRING.finditer(text):
            literal = match.group(1)
            if TOKEN_IN_URL.search(literal):
                line = text.count("\n", 0, match.start()) + 1
                issues.append(f"{path}:{line}: auth token embedded in URL string")
        for match in QUERY_MAP.finditer(text):
            if AUTH_KEY.search(match.group(1)):
                line = text.count("\n", 0, match.start()) + 1
                issues.append(f"{path}:{line}: auth token added to query parameters")
    return issues


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path("SiSi_Mobile/lib"))
    args = parser.parse_args()
    problems = findings(args.root)
    if problems:
        print("Unsafe auth transport detected:", file=sys.stderr)
        print("\n".join(f"  {item}" for item in problems), file=sys.stderr)
        return 1
    print(f"Auth transport guard passed: {args.root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
