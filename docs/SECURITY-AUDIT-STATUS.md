# SiSi ULP Toboali: Security Audit and Remediation Status

_Last updated: 22 September 2026_

## Executive status

Stages 0 through 3 are implemented and merged. The next work is Stage 4 hardening plus deployed-runtime validation. CI is necessary, but not sufficient for production sign-off.

## Ordered remediation

### Stage 0: P0 Audit-Guard deployment gate, FIXED

The fail-closed static Audit Gate, mandatory CI enforcement, regression tests, explicit internal exceptions, and late-loaded wrappers for protected BA/mobile boundaries are merged. The original `Audit-Guard.js` runtime behavior was preserved.

Evidence: PR #6, squash merge `22c4f59df585949653a97ab8d10df1c98a61793b`. Required CI checks passed.

### Stage 1: P1 BA atomicity, FIXED

BA number generation and row append use the shared script lock with a 30-second timeout. Lock failure prevents the write side effect, with regression coverage for lock use and failure behavior.

Evidence: PR #3, merge commit `c6999ba82d25236efc670d5da36dd0f86848f17d`.

### Stage 2: P2 same-ULP authorization, FIXED for the covered boundary

BA listing, download, PDF generation, final upload, and Master Gardu synchronization reject missing, blank, foreign, or unresolved caller ULP values. Client-supplied payload tokens are not forwarded into the underlying upload implementation.

Evidence: PR #4. Regression coverage is in `tests/ba-same-ulp-auth.test.cjs`; deployed Apps Script validation remains required.

### Stage 3: BA row ownership, FIXED in PR #7

BA operations now resolve exactly one `idBA` row in the configured Toboali BA source before PDF generation, upload, Master synchronization, or download. The resolved row must belong to ULP Toboali. Duplicate, missing, foreign, blank, and unresolved ownership fails closed. Downloads require `idBA + fileId`, and the file must be present on that row.

The web client no longer falls back to a direct Drive URL when the server rejects or cannot complete a download.

Evidence: PR #7, squash merge `43370e240501f3f607ff78793ffad7564df26a15`. CI passed; deployed-runtime validation remains required.

### Stage 4: Compatibility and data-write hardening, ACTIVE

1. Preserve legacy BA contracts only where required, while routing new callers through guarded adapters. Legacy single-argument compatibility paths are not approved for new integrations.
2. Audit every user-controlled value written to Sheets for formula/CSV injection and enforce safe cell-value handling.
3. Validate cache, local SQLite, outbox, and sync isolation across account switches.
4. Remove or consolidate overlapping compatibility wrappers only after Apps Script load-order and caller coverage are documented.

Each item requires focused regression coverage and green CI before merge.

### Stage 5: Deployment and production acceptance, BLOCKED until Stage 4 exits

- Deploy through the established Apps Script procedure.
- Validate authenticated BA save, lock contention, row numbering, own-ULP access, foreign/blank ULP denial, and Super User scope.
- Validate Gardu and Switching PDF generation, upload, Master sync, and `idBA + fileId` download behavior.
- Run mobile offline save, retry, account switching, queue isolation, P0 correction, and real-device photo checks.
- Preserve photos, original codes, audit history, and outbox data.

## Authorization policy

BA data and BA-linked files are internal to the caller's ULP. No role, including Super User, may read or mutate BA data across ULP boundaries through operational endpoints. Missing, blank, foreign, duplicate, or unresolved row ownership fails closed before spreadsheet, Drive, PDF, or write side effects.

## P0 product requirements and acceptance criteria

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
- **Stage 3 BA row ownership:** Unique `idBA` resolution, ULP row validation, file-to-row binding, and fail-closed download behavior implemented in PR #7 and merged as `43370e240501f3f607ff78793ffad7564df26a15`.

## Release acceptance

- The checked-in backend passes the mandatory Audit Gate.
- Protected endpoints reject invalid sessions before side effects.
- `getSesiByToken` is not treated as full authorization.
- Internal exceptions remain short, explicit, reviewable, and separate from public route allowlists.
- Required CI checks are green.
- Deployed-runtime and real-device evidence is recorded before production sign-off.

## Known limitations

A green static gate and CI run do not prove authenticated live behavior or signed APK behavior in production. Failed or conflicting corrections remain retained for administrator-assisted resolution. Do not delete local SQLite to resolve sync conflicts.
