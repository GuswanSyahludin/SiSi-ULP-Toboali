# P0 Audit-Guard Deployment Gate

## Status

This gate is mandatory for every pull request and every push to `main` that can ship backend or deployment-affecting changes. A deployment is **blocked** when the gate exits non-zero.

## Security contract

Every Apps Script endpoint that reads or writes Sheets, Drive, or BA data must call an authentication and authorization guard before the first side effect. The guard must reject missing or invalid sessions, blank ULP ownership, foreign ULP ownership, and unresolved ownership. `getSesiByToken` alone is not sufficient authorization.

Explicit exceptions are permitted only when they are listed in `AUDIT_ABAIKAN` in `SiSi_BackEnd/Core/Audit-Guard.js` and are safe helpers, framework entry points, or trusted triggers. New exceptions require a code review explanation and regression coverage.

## CI enforcement

`python3 scripts/audit_gate.py` is a required step in `.github/workflows/release-quality-gate.yml`. It scans backend functions, fails closed if the audit contract or allowlist is missing, and rejects sensitive read/write functions without a guard call. The same command runs on pull requests and pushes to `main`.

## Required evidence for a passing PR

- Audit gate exit code is `0`.
- Backend syntax checks pass.
- Backend regression suite passes, including the unguarded read/write rejection test.
- PR check runs are green before merge.
- The PR description reports changed files, gate result, regression coverage, and CI links.

A static marker file is not proof of a current audit. The current CI run and its test artifacts are the source of truth.
