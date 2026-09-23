# SiSi ULP Toboali: Security Audit and Remediation Status

_Last updated: 23 September 2026_

## Executive status

Stages 0 through 5 Task 1 are implemented and merged. Stage 5 Task 1 established account-scoped mobile local storage and quarantines the pre-Stage-5 shared SQLite database. CI and real-device validation for the account-switch flow are complete. The next work is the remaining Stage 5 hardening backlog.

## Ordered remediation

### Stage 0: P0 Audit-Guard deployment gate, FIXED

The fail-closed static Audit Gate, mandatory CI enforcement, regression tests, explicit internal exceptions, and late-loaded wrappers for protected BA/mobile boundaries are merged. Evidence: PR #6, required CI checks passed.

### Stage 1: P1 BA atomicity, FIXED

BA number generation and row append use the shared script lock with a 30-second timeout. Lock failure prevents the write side effect. Evidence: PR #3, merged.

### Stage 2: P2 same-ULP authorization, FIXED for the covered boundary

BA listing, download, PDF generation, final upload, and Master Gardu synchronization reject missing, blank, foreign, or unresolved caller ULP values. Evidence: PR #4, merged; deployed validation remains part of release acceptance.

### Stage 3: BA row ownership, FIXED

BA operations resolve exactly one `idBA` row in the configured Toboali BA source before PDF generation, upload, Master synchronization, or download. The row must belong to ULP Toboali. Duplicate, missing, foreign, blank, and unresolved ownership fails closed. Downloads require `idBA + fileId`, and the file must be present on that row. Direct Drive fallback was removed.

Evidence: PR #7, merged.

### Stage 4: Compatibility and data-write hardening, FIXED for merged scope

User-controlled Sheet writes are sanitized through the shared safe-cell handling for BA save, BA detail edit, BA photo flows, final upload, and Master Gardu synchronization. Production-order harness coverage verifies the real loader order and ownership chain.

Evidence: PR #9, squash merge `6846a06331b802aceadadb4fd570a477fff73c22`. CI passed and the diff was audited.

### Stage 5 Task 1: Account isolation and legacy database quarantine, FIXED

The mobile database name is derived from normalized `username + ulp` and is required by `AppDatabase`; there is no default shared `sisi_db` fallback. Database access fails closed before an authenticated session is active. SharedPreferences queue keys and Workmanager inputs are account-scoped, stale workers are rejected, and logout cancels periodic/manual workers.

The legacy `sisi_db` database is never opened or copied automatically. The guard checks the Drift documents directory and quarantines the legacy database plus SQLite `-wal` and `-shm` sidecars. Ambiguous legacy ownership is preserved for administrator-assisted handling rather than assigned to an account.

Evidence: PR #10, squash merge `84d1b5148f2f179b8836c38e4fb918fbfcfd2bcb`. CI passed. Real-device validation confirmed upgrade, legacy quarantine, account A logout, account B login, restart, offline queue isolation, retry behavior, and stale-worker rejection.

## Next Stage 5 backlog

1. Remove legacy auth fallback paths that can reuse stale sessions.
2. Audit and migrate mobile session/token storage to secure storage.
3. Verify migration of legacy credentials on upgraded installations.
4. Document secure-storage real-device validation.
5. Verify token redaction across URLs, logs, errors, and redirects.
6. Add deployed Apps Script authorization and safe-write smoke tests.
7. Verify branch protection requires every security and release gate.
8. Add Flutter integration coverage for offline sync, retry, and duplicate delivery.

## Authorization policy

BA data and BA-linked files are internal to the caller's ULP. No role, including Super User, may read or mutate BA data across ULP boundaries through operational endpoints. Missing, blank, foreign, duplicate, or unresolved row ownership fails closed before spreadsheet, Drive, PDF, or write side effects.

## Release acceptance

- The checked-in backend passes the mandatory Audit Gate.
- Protected endpoints reject invalid sessions before side effects.
- `getSesiByToken` is not treated as full authorization.
- Internal exceptions remain short, explicit, reviewable, and separate from public route allowlists.
- Required CI checks are green.
- Deployed-runtime and real-device evidence is recorded before production sign-off.
- Account-scoped mobile database, queue, cache, photo, and worker behavior is verified on a real device.

## Known limitations

A green static gate and CI run do not prove every deployed Apps Script behavior or signed APK release property. Remaining Stage 5 tasks must be completed before final production sign-off. Failed or conflicting corrections remain retained for administrator-assisted resolution. Do not delete local SQLite to resolve sync conflicts.
