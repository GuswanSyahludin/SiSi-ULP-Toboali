# SiSi ULP Toboali: Security Audit, Remediation Status, and P0 PRD

_Last updated: 22 September 2026_

## Executive status

**P0 Audit-Guard: FIXED and merged.** PR #6 was squash-merged to `main` in commit `22c4f59df585949653a97ab8d10df1c98a61793b` after all four required checks passed: audit gate, backend syntax/security tests, Flutter analyze/compile, and auth-token query rejection.

Work proceeds strictly in order. Stages 0, 1, and 2 are implemented and merged. The next active work is Stage 3, which closes residual BA boundary validation and must pass focused tests and CI before Stage 4 begins.

## Ordered findings and remediation sequence

### Stage 0: P0 Audit-Guard deployment gate, FIXED

**Finding:** Apps Script read/write endpoints could bypass a consistent authentication and authorization review, while `ANYONE_ANONYMOUS` makes every top-level function callable through the deployment surface.

**Fix:** Added the fail-closed static audit gate, mandatory CI enforcement, regression tests, explicit internal exceptions, and late-loaded wrappers for public BA/mobile endpoints. Restored the full `Audit-Guard.js` runtime implementation without reducing its existing behavior.

**Evidence:** PR #6 merged as `22c4f59df585949653a97ab8d10df1c98a61793b`; all four required checks passed.

**Exit condition:** Complete.

### Stage 1: P1 BA atomicity, FIXED

**Finding:** BA number generation and row append could race under concurrent requests.

**Fix:** Shared script-lock wrapping with a 30-second timeout now protects BA save execution. Lock failure prevents the save side effect, with regression coverage for lock usage and failure behavior.

**Evidence:** PR #3, `fix/reaudit-050-ba-atomicity`, merged as `c6999ba82d25236efc670d5da36dd0f86848f17d`; atomicity tests are included in the backend suite.

**Exit condition:** Complete.

### Stage 2: P2 same-ULP authorization, FIXED

**Finding:** BA boundaries authenticated callers without consistently enforcing the ULP boundary.

**Fix:** A final same-ULP boundary now protects BA listing, file download, PDF generation, final upload, and Master Gardu synchronization. Missing, blank, foreign, or unresolved ULP access fails closed; client payload tokens are not forwarded into the underlying upload implementation.

**Evidence:** PR #4, `fix/reaudit-003-004-same-ulp`, merged before the P0 gate; regression coverage is in `tests/ba-same-ulp-auth.test.cjs`.

**Exit condition:** Complete for the covered boundary layer. Runtime Apps Script validation remains required.

### Stage 3: Residual BA boundary closure, ACTIVE NEXT

Close and verify row-level ownership consistently across:

- `getDataBeritaAcara`
- `unduhFileBa`
- `generatePdfBaPengoperasian`
- `generatePdfBaSwitching`
- `uploadBaFinal`
- `updateMasterGarduDariBA`

**Required fix shape:** Resolve the requested BA row and its owning ULP first, normalize both values, require an exact match with the caller's ULP, and fail closed for foreign, blank, or unresolved ownership before any read, Drive operation, PDF generation, or write. Do not add a Super User cross-ULP bypass.

**Exit condition:** Focused tests prove own-ULP access, Petugas denial, foreign/blank/unresolved ownership denial, and no side effects before validation; full CI is green; runtime Apps Script validation is documented.

### Stage 4: Compatibility and data-write hardening

After Stage 3 is approved:

1. Identify and remove overlapping compatibility/auth wrappers without changing Apps Script load-order behavior.
2. Verify formula/CSV-injection sanitization for every user-controlled value written to Sheets.
3. Validate cache, local SQLite, outbox, and sync isolation across account switches.

Each item requires focused regression coverage and green CI before the next item starts.

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

The P0 security gate is complete only when:

1. New backend read/write endpoints fail CI unless they call an accepted guard or are covered by a separately reviewed internal exception.
2. Public BA/mobile endpoints reject missing or invalid sessions before any read/write side effect.
3. Blank, foreign, or unresolved ULP ownership is rejected fail-closed.
4. `getSesiByToken` is not treated as full authorization.
5. Internal exceptions remain short, explicit, reviewable, and separate from public route allowlists.
6. Existing `Audit-Guard.js` runtime behavior remains intact.
7. All required CI checks are green before merge.

## Completed remediation history

- **SISI-REAUDIT-001:** BA Gardu creation requires a valid session and non-empty ULP. Implemented in PR #1.
- **SISI-REAUDIT-021:** Source-mutating automated workflows were disabled and moved under `.github/workflows-disabled`. Implemented in PR #2.
- **SISI-REAUDIT-050:** BA `idBA` and `NO BA Full` sequence generation plus row append are serialized through the shared script lock. Implemented in PR #3, merged as `c6999ba82d25236efc670d5da36dd0f86848f17d`.
- **SISI-REAUDIT-003/004:** Same-ULP BA boundary enforcement implemented in PR #4, merged before the P0 gate.
- **P0 Audit-Guard deployment gate:** Static fail-closed scanner, CI enforcement, regression tests, explicit internal exceptions, and public endpoint wrappers implemented in PR #6 and merged as `22c4f59df585949653a97ab8d10df1c98a61793b`.

## Known limitations

A green static gate and CI run are not proof of an authenticated live save or signed APK in production. Real-device and deployed-runtime validation remain required before production sign-off. Failed or conflicting corrections must remain retained for administrator-assisted resolution; do not delete local SQLite to resolve them.
