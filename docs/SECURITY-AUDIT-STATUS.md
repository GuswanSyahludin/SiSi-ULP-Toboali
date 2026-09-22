# SiSi ULP Toboali: Security Audit, Remediation Status, and P0 PRD

_Last updated: 22 September 2026_

## Executive status

**P0 Audit-Guard: FIXED and merged.** PR #6 was squash-merged to `main` in commit `22c4f59df585949653a97ab8d10df1c98a61793b` after all four required checks passed: audit gate, backend syntax/security tests, Flutter analyze/compile, and auth-token query rejection.

The mandatory deployment gate is wired into `.github/workflows/release-quality-gate.yml` and runs:

```bash
python3 scripts/audit_gate.py SiSi_BackEnd
```

P1 and P2 work must not start until the preceding stage is approved, its CI checks are green, and no blocker remains.

## Authorization policy

BA data and BA-linked files are internal to the caller's ULP. No role, including Super User, may read or mutate BA data across ULP boundaries through operational endpoints. Missing, blank, foreign, or unresolved row ownership must fail closed.

## P0 deployment gate

Every Apps Script endpoint that reads or writes Sheets, Drive, or BA data must call an authentication and authorization guard before its first side effect. `getSesiByToken` alone is not sufficient authorization.

Explicit exceptions are limited to safe helpers, framework entry points, and trusted triggers. They are documented in `SiSi_BackEnd/Core/P0-Internal-Guard-Exceptions.js` and must never be used to hide public routes. Public BA and mobile endpoints are protected by explicit late-loaded guard wrappers.

Required evidence for release:

- Audit gate exits with code `0`.
- Backend syntax and security tests pass.
- Flutter analyze and compile pass.
- Auth tokens are rejected in query strings.
- The PR diff does not remove or compress existing security/runtime behavior.

## Completed remediation history

- **SISI-REAUDIT-001:** BA Gardu creation requires a valid session and non-empty ULP. Transport tokens are stripped before the underlying save function runs. Implemented in PR #1.
- **SISI-REAUDIT-021:** Source-mutating automated workflows were disabled and moved under `.github/workflows-disabled`; the workflow policy scanner is read-only. Implemented in PR #2.
- **SISI-REAUDIT-050:** BA `idBA` and `NO BA Full` sequence generation plus row append are serialized through the shared script lock with a 30-second timeout. Lock failure prevents the save side effect. Implemented in PR #3, merged as `c6999ba82d25236efc670d5da36dd0f86848f17d`.
- **P0 Audit-Guard deployment gate:** Static fail-closed scanner, CI enforcement, regression tests, explicit internal exceptions, and public endpoint wrappers implemented in PR #6 and merged as `22c4f59df585949653a97ab8d10df1c98a61793b`.

## P0 product requirements and acceptance criteria

The P0 security gate is complete only when:

1. New backend read/write endpoints fail CI unless they call an accepted guard or are covered by a separately reviewed internal exception.
2. Public BA/mobile endpoints reject missing or invalid sessions before any read/write side effect.
3. Blank, foreign, or unresolved ULP ownership is rejected fail-closed.
4. `getSesiByToken` is not treated as full authorization.
5. Internal exceptions remain short, explicit, reviewable, and separate from public route allowlists.
6. Existing `Audit-Guard.js` runtime behavior remains intact.
7. All required CI checks are green before merge.

## P1/P2 backlog

### P1: BA atomicity

Validate and extend the shared-lock sequence contract for BA number generation and row append, including lock contention, retry behavior, and regression coverage.

### P2: Same-ULP authorization

Resolve the requested BA row and owning ULP first. Require an exact normalized match with the caller's ULP before reads, Drive operations, PDF generation, or writes. Reject foreign, blank, or unresolved ownership. Do not add a Super User cross-ULP bypass for operational BA endpoints.

## Residual BA audit items

These boundaries require continued same-ULP validation where not already covered by the merged remediation:

- `getDataBeritaAcara`
- `unduhFileBa`
- `generatePdfBaPengoperasian`
- `generatePdfBaSwitching`
- `uploadBaFinal`
- `updateMasterGarduDariBA`

## Deployment and runtime acceptance

- Deploy only to the existing Apps Script deployment ID using the established procedure.
- Run the backend and P0 regression suites before deployment.
- Run Flutter analysis and signed APK validation before production sign-off.
- Validate own-ULP access, Petugas denial, foreign/blank ULP denial, and Super User scope.
- Validate BA sequence numbering under lock contention and retry.
- Preserve photos, original codes, audit history, and outbox data during correction and sync flows.

## Known limitations

A green static gate and CI run are not proof of an authenticated live save or signed APK in production. Real-device and deployed-runtime validation remain required before production sign-off. Failed or conflicting corrections must remain retained for administrator-assisted resolution; do not delete local SQLite to resolve them.
