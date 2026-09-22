# Audit remediation status

Last updated: 22 September 2026

## Completed

- **SISI-REAUDIT-001**: BA Gardu creation now requires a valid session and non-empty ULP. Transport tokens are stripped before the underlying save function runs. Implemented in PR #1.
- **SISI-REAUDIT-021**: Source-mutating automated workflows were disabled and moved under `.github/workflows-disabled`; the workflow policy scanner is read-only. Implemented in PR #2.
- **SISI-REAUDIT-050**: BA `idBA` and `NO BA Full` sequence generation plus row append are serialized through the shared script lock with a 30-second timeout. Lock failure prevents the save side effect. Regression coverage is included in `npm test`. Implemented in PR #3.

PR #3 was merged after green backend, Flutter analyze/compile, and auth-transport CI checks. Merge commit: `c6999ba82d25236efc670d5da36dd0f86848f17d`.

## Next audit sequence

1. **SISI-REAUDIT-003/004 residual BA authorization**: verify every BA reader, download, upload, PDF, edit, and master-sync entry point has authentication, row-level ULP authorization, and fail-closed error handling.
2. **Duplicate wrapper cleanup**: identify overlapping compatibility/auth wrappers and confirm load-order behavior in the Apps Script runtime.
3. **Writer sanitization**: verify all user-controlled values written to Sheets pass formula/CSV-injection sanitization.
4. **Account isolation**: validate cache, local SQLite, outbox, and sync behavior across account switches.

## Release gate still open

- Deploy to the existing Apps Script deployment only after runtime validation.
- Validate authenticated BA save, lock contention, row numbering, and ULP authorization in the deployed Apps Script runtime.
- Complete real-device Flutter validation before production sign-off.
