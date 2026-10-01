#!/usr/bin/env python3
"""Fail-closed static Audit Gate for the SiSi Apps Script backend."""
from __future__ import annotations

import re
import sys
from pathlib import Path

GUARDS = ("guard_(", "requireSesi_(", "_assertSuperUser(", "_assertSuperUserKetat_(", "webhookVerifikasi_(")
WRITE_MARKERS = (".setValue(", ".setValues(", ".appendRow(", ".deleteRow(", ".deleteRows(", ".clearContent(", ".clear(", ".insertRowsAfter(", ".setFormula(", ".setFormulas(", ".createFile(", ".setSharing(")
READ_MARKERS = (".getValues(", ".getDataRange(", ".getDisplayValues(", ".getLastRow(", "openById(")

# Recovery is not a general-purpose guard or an ignored/internal endpoint.
# Only this entry/file may use the separate Google-identity authorization.
RECOVERY_ENTRY = "recoverLockedSuperUserOnce"
RECOVERY_FILE = Path("Core/Superuser-Password-Recovery.js")
RECOVERY_FIRST = re.compile(r"^\s*var\s+props\s*=\s*_assertRecoveryEditor_\(\s*arguments\s*\)\s*;")


def recovery_source_safe(source: str) -> bool:
    clean = re.sub(r"/\*[\s\S]*?\*/|//[^\n]*", " ", source)
    switches = re.findall(r"\b(?:const|let|var)\s+SISI_RECOVERY_EDITOR_ONLY_ARMED\s*=\s*([^;]+);", clean)
    guards = [body for name, body in functions(clean) if name == "_assertRecoveryEditor_"]
    return (
        switches == ["false"]
        and bool(re.search(r"\bconst\s+SISI_RECOVERY_EDITOR_ONLY_ARMED\s*=\s*false\s*;", clean))
        and len(guards) == 1
        and bool(re.match(r"\s*if\s*\(\s*SISI_RECOVERY_EDITOR_ONLY_ARMED\s*!==\s*true\s*\)\s*\{\s*throw\b", guards[0]))
    )


def functions(source: str):
    pattern = re.compile(r"(?:function\s+([A-Za-z_$][\w$]*)|([A-Za-z_$][\w$]*)\s*=\s*function)\s*\(")
    for match in pattern.finditer(source):
        name = match.group(1) or match.group(2)
        start = source.find("{", match.end())
        if start < 0:
            yield name, ""
            continue
        depth = 0
        end = start
        while end < len(source):
            if source[end] == "{": depth += 1
            elif source[end] == "}":
                depth -= 1
                if depth == 0: break
            end += 1
        yield name, source[start + 1:end]


def allowlist(audit_file: Path) -> set[str]:
    source = audit_file.read_text(encoding="utf-8")
    match = re.search(r"var\s+AUDIT_ABAIKAN\s*=\s*\[(.*?)\];", source, re.DOTALL)
    if not match: raise RuntimeError("AUDIT_ABAIKAN tidak ditemukan: gate menolak deploy")
    return set(re.findall(r'"([A-Za-z_$][\w$]*)"', match.group(1)))


def explicit_internal_exceptions(sources: list[str]) -> set[str]:
    names: set[str] = set()
    for source in sources:
        match = re.search(r"var\s+AUDIT_INTERNAL_EXCEPTIONS\s*=\s*\[(.*?)\];", source, re.DOTALL)
        if match:
            names.update(re.findall(r'"([A-Za-z_$][\w$]*)"', match.group(1)))
    return names


def guarded_wrappers(sources: list[str]) -> set[str]:
    wrapped: set[str] = set()
    for source in sources:
        for match in re.finditer(r"(?:var\s+)?original([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*;(?P<body>.*?)\2\s*=\s*function\s*\(", source, re.DOTALL):
            if any(guard in match.group("body") for guard in GUARDS): wrapped.add(match.group(2))
        for match in re.finditer(r"var\s+original\s*=\s*([A-Za-z_$][\w$]*)\s*;(?P<body>.*?)\1\s*=\s*function\s*\(", source, re.DOTALL):
            if any(guard in match.group("body") for guard in GUARDS): wrapped.add(match.group(1))
        for match in re.finditer(r"var\s+names\s*=\s*\[(?P<names>.*?)\];(?P<body>.*?)names\.forEach\s*\(\s*function\s*\(\s*name\s*\)\s*\{(?P<loop>.*?)\}\s*\)\s*;", source, re.DOTALL):
            if any(guard in match.group("loop") for guard in GUARDS):
                wrapped.update(re.findall(r'"([A-Za-z_$][\w$]*)"', match.group("names")))
    return wrapped


def main() -> int:
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("SiSi_BackEnd")
    audit = root / "Core" / "Audit-Guard.js"
    if not audit.is_file(): print(f"FAIL: {audit} tidak ditemukan", file=sys.stderr); return 1
    paths = sorted(root.rglob("*.js"))
    try:
        allow = allowlist(audit)
        sources = [path.read_text(encoding="utf-8") for path in paths]
    except (OSError, RuntimeError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr); return 1
    wrapped = guarded_wrappers(sources)
    internal = explicit_internal_exceptions(sources)
    failures: list[str] = []
    for path, source in zip(paths, sources):
        recovery_file = path.relative_to(root) == RECOVERY_FILE
        recovery_safe = recovery_file and recovery_source_safe(source)
        if recovery_file and not recovery_safe:
            failures.append(f"{path}: recovery wajib nonaktif (const false) dan memakai guard fail-closed")
        for name, body in functions(source):
            if name == RECOVERY_ENTRY:
                if not recovery_safe or not RECOVERY_FIRST.match(body):
                    failures.append(f"{path}:{name}: guard recovery wajib menjadi pernyataan pertama")
                continue
            if name.startswith("_") or name in allow or name in wrapped or name in internal: continue
            if not any(marker in body for marker in WRITE_MARKERS + READ_MARKERS): continue
            if not any(marker in body[:2400] for marker in GUARDS):
                failures.append(f"{path}:{name}: endpoint baca/tulis tanpa guard wajib")
    if failures:
        print("AUDIT GATE: FAIL", file=sys.stderr); print("\n".join(failures), file=sys.stderr); return 1
    print("AUDIT GATE: PASS"); return 0


if __name__ == "__main__":
    raise SystemExit(main())
