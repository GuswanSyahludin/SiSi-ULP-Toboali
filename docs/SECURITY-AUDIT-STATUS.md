# SiSi ULP Toboali: Security Audit, Remediation Status, and P0 PRD

_Last updated: 22 September 2026_

## Executive status

**P0 Audit-Guard: FIXED and merged.** PR #6 was squash-merged to `main` in commit `22c4f59df585949653a97ab8d10df1c98a61793b` after all four required checks passed: audit gate, backend syntax/security tests, Flutter analyze/compile, and auth-token query rejection.

The mandatory deployment gate is wired into `.github/workflows/release-quality-gate.yml` and runs:

```bash
python3 scripts/audit_gate.py SiSi_BackEnd
```

Work proceeds strictly in the order below. The next stage starts only after the previous stage is approved, its CI checks are green, and no blocker remains.

## Ordered findings and remediation sequence

### Stage 0: P0 Audit-Guard deployment gate, FIXED

**Finding:** Apps Script read/write endpoints could bypass a consistent authentication and authorization review, while `ANYONE_ANONYMOUS` makes every top-level function callable through the deployment surface.

**Fix:** Added the fail-closed static audit gate, mandatory CI enforcement, regression tests, explicit internal exceptions, and late-loaded wrappers for public BA/mobile endpoints. Restored the full `Audit-Guard.js` runtime implementation without reducing its existing behavior.

**Evidence:** PR #6 merged as `22c4f59df585949653a97ab8d10df1c98a61793b`; all four required checks passed.

**Exit condition:** Complete. P1 may proceed.

### Stage 1: P1 BA atomicity, next

**Finding:** BA number generation and row append must remain atomic under concurrent requests to prevent duplicate or inconsistent BA identifiers.

**Required fix:** Serialize `idBA`, `NO BA Full`, and row append through the shared script lock with a 30-second timeout. Lock failure must prevent the save side effect. Preserve retry safety and add regression coverage for contention and duplicate prevention.

**Exit condition:** Backend tests, atomicity regression tests, and CI are green; implementation is reviewed and approved.

### Stage 2: P2 same-ULP authorization

**Finding:** Several BA boundaries authenticate the caller but do not consistently prove that the requested row belongs to the caller's ULP.

**Required fix:** Resolve the requested BA row and owning ULP first, normalize both values, require an exact match, and fail closed for foreign, blank, or unresolved ownership. Super User must not receive a cross-ULP bypass for operational BA endpoints.

**Exit condition:** Same-ULP tests cover own ULP, Petugas denial, foreign ULP denial, blank ownership, unresolved ownership, and Super User scope; CI is green and the stage is approved.

### Stage 3: Residual BA boundary closure

Close the same-ULP contract consistently across these boundaries:

- `getDataBeritaAcara`
- `unduhFileBa`
- `generatePdfBaPengoperasian`
- `generatePdfBaSwitching`
- `uploadBaFinal`
- `updateMasterGarduDariBA`

No read, Drive operation, PDF generation, or write may occur before ownership validation.

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

- **SISI-REAUDIT-001:** BA Gardu creation requires a valid session and non-empty ULP. Transport tokens are stripped before the underlying save function runs. Implemented in PR #1.
- **SISI-REAUDIT-021:** Source-mutating automated workflows were disabled and moved under `.github/workflows-disabled`; the workflow policy scanner is read-only. Implemented in PR #2.
- **SISI-REAUDIT-050:** BA `idBA` and `NO BA Full` sequence generation plus row append are serialized through the shared script lock with a 30-second timeout. Lock failure prevents the save side effect. Implemented in PR #3, merged as `c6999ba82d25236efc670d5da36dd0f86848f17d`.
- **P0 Audit-Guard deployment gate:** Static fail-closed scanner, CI enforcement, regression tests, explicit internal exceptions, and public endpoint wrappers implemented in PR #6 and merged as `22c4f59df585949653a97ab8d10df1c98a61793b`.

## Known limitations

A green static gate and CI run are not proof of an authenticated live save or signed APK in production. Real-device and deployed-runtime validation remain required before production sign-off. Failed or conflicting corrections must remain retained for administrator-assisted resolution; do not delete local SQLite to resolve them.
