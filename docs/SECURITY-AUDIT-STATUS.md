# SiSi ULP Toboali: Security Audit, Remediation Status, and P0 PRD

_Last updated: 22 September 2026_

## Executive status

**P0 Audit-Guard: FIXED and merged.** PR #6 was squash-merged to `main` in commit `22c4f59df585949653a97ab8d10df1c98a61793b` after all four required checks passed: audit gate, backend syntax/security tests, Flutter analyze/compile, and auth-token query rejection.

Work proceeds strictly in order. Stages 0, 1, and 2 are implemented and merged. **Stage 3 is now in PR #7 and remains pending CI, review, and runtime validation.**

## Ordered findings and remediation sequence

### Stage 0: P0 Audit-Guard deployment gate, FIXED

Fail-closed static audit gate, mandatory CI enforcement, regression tests, explicit internal exceptions, and late-loaded wrappers for public BA/mobile endpoints are merged. The full `Audit-Guard.js` runtime implementation was restored without reducing existing behavior.

Evidence: PR #6, merge commit `22c4f59df585949653a97ab8d10df1c98a61793b`; all four checks passed.

### Stage 1: P1 BA atomicity, FIXED

BA number generation and row append are protected by the shared script lock with a 30-second timeout. Lock failure prevents the save side effect, with regression coverage for lock use and failure behavior.

Evidence: PR #3, merge commit `c6999ba82d25236efc670d5da36dd0f86848f17d`.

### Stage 2: P2 same-ULP authorization, FIXED for the covered boundary layer

The existing BA boundary protects listing, file download, PDF generation, final upload, and Master Gardu synchronization. Missing, blank, foreign, or unresolved caller ULP fails closed.

Evidence: PR #4, merged before the P0 gate; regression coverage is in `tests/ba-same-ulp-auth.test.cjs`. Runtime Apps Script validation remains required.

### Stage 3: Residual BA row ownership, ACTIVE in PR #7

**Finding:** The existing wrappers validated the caller ULP but did not resolve the requested BA row before side effects.

**Implementation:** `ZZZZZZZZZZZ-BA-Row-Ownership.js` resolves a unique `idBA` in the fixed Toboali BA source before PDF generation, final upload, download, or Master sync. Unknown or duplicate ids fail closed. `idBA` is used only as the row key, never as an ownership value. Downloaded files must also be present in the known BA file set.

**Tests:** `tests/ba-row-ownership.test.cjs` covers own-ULP access, foreign/blank ULP denial, missing rows, duplicate ids, and no side effects before validation.

**Exit condition:** PR #7 CI is green, the diff is reviewed, Apps Script load order is validated, and deployed-runtime tests confirm Gardu/Switching behavior.

### Stage 4: Compatibility and data-write hardening

After Stage 3 approval:

1. Identify and remove overlapping compatibility/auth wrappers without changing Apps Script load-order behavior.
2. Verify formula/CSV-injection sanitization for every user-controlled value written to Sheets.
3. Validate cache, local SQLite, outbox, and sync isolation across account switches.

### Stage 5: Deployment and production acceptance

Only after all earlier stages are approved:

- Deploy to the existing Apps Script deployment ID using the established procedure.
- Run backend and P0 regression suites.
- Run Flutter analysis and signed APK validation.
- Validate authenticated BA save, lock contention, row numbering, own-ULP access, Petugas denial, foreign/blank ULP denial, and Super User scope in the deployed runtime.
- Preserve photos, original codes, audit history, and outbox data during correction and sync flows.

## Authorization policy

BA data and BA-linked files are internal to the caller's ULP. No role, including Super User, may read or mutate BA data across ULP boundaries through operational endpoints. Missing, blank, foreign, or unresolved row ownership must fail closed.

## P0 product requirements and acceptance criteria

1. New backend read/write endpoints fail CI unless they call an accepted guard or are covered by a separately reviewed internal exception.
2. Public BA/mobile endpoints reject missing or invalid sessions before any read/write side effect.
3. Blank, foreign, or unresolved ULP ownership is rejected fail-closed.
4. `getSesiByToken` is not treated as full authorization.
5. Internal exceptions remain short, explicit, reviewable, and separate from public route allowlists.
6. Existing `Audit-Guard.js` runtime behavior remains intact.
7. All required CI checks are green before merge.

## Completed remediation history

- **SISI-REAUDIT-001:** BA Gardu creation requires a valid session. Implemented in PR #1.
- **SISI-REAUDIT-021:** Source-mutating automated workflows were disabled. Implemented in PR #2.
- **SISI-REAUDIT-050:** BA sequence generation and row append are serialized through the shared script lock. Implemented in PR #3, merged as `c6999ba82d25236efc670d5da36dd0f86848f17d`.
- **SISI-REAUDIT-003/004:** Same-ULP BA boundary enforcement implemented in PR #4, merged before the P0 gate.
- **P0 Audit-Guard deployment gate:** Static fail-closed scanner, CI enforcement, regression tests, explicit internal exceptions, and public endpoint wrappers implemented in PR #6 and merged as `22c4f59df585949653a97ab8d10df1c98a61793b`.

## Known limitations

A green static gate and CI run are not proof of an authenticated live save or signed APK in production. Real-device and deployed-runtime validation remain required before production sign-off. Failed or conflicting corrections must remain retained for administrator-assisted resolution; do not delete local SQLite to resolve them.
