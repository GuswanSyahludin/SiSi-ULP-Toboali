# Audit remediation status

Last updated: 22 September 2026

## Completed

- **SISI-REAUDIT-001**: BA Gardu creation now requires a valid session and non-empty ULP. Transport tokens are stripped before the underlying save function runs. Implemented in PR #1.
- **SISI-REAUDIT-021**: Source-mutating automated workflows were disabled and moved under `.github/workflows-disabled`; the workflow policy scanner is read-only. Implemented in PR #2.
- **SISI-REAUDIT-050**: BA `idBA` and `NO BA Full` sequence generation plus row append are serialized through the shared script lock with a 30-second timeout. Lock failure prevents the save side effect. Regression coverage is included in `npm test`. Implemented in PR #3.

PR #3 was merged after green backend, Flutter analyze/compile, and auth-transport CI checks. Merge commit: `c6999ba82d25236efc670d5da36dd0f86848f17d`.

## Current audit: SISI-REAUDIT-003/004 residual BA authorization

The following boundaries have session checks in place, but the audit is **not closed** because row-level ULP ownership is not yet enforced consistently:

- `getDataBeritaAcara`: authenticated and requires a non-empty ULP, but the underlying Gardu and Switching readers still need explicit row-level ULP filtering.
- `unduhFileBa`: validates that a Drive file is referenced by BA data, but the allow-list is global across BA sheets and is not yet restricted to rows owned by the caller's ULP.
- `generatePdfBaPengoperasian` and `generatePdfBaSwitching`: authenticated with ULP presence, but the requested `idBA` still needs an ownership check before PDF generation.
- `uploadBaFinal`: authenticated with ULP presence, but the target `idBA` and destination row need ownership validation before Drive creation and sheet write.
- `updateMasterGarduDariBA`: authenticated with ULP presence, but the source BA row needs ownership validation before updating each Master target.

Required fix shape: resolve the requested BA row first, compare its ULP or owning header to `ulpScope_(g, requestedUlp)`, reject foreign or unresolved ownership, then perform the underlying read/write. Keep Super User cross-ULP behavior explicit and fail closed for missing ownership.

## Next audit sequence

1. Implement and test row-level ULP authorization for the five BA boundaries above.
2. **Duplicate wrapper cleanup**: identify overlapping compatibility/auth wrappers and confirm load-order behavior in the Apps Script runtime.
3. **Writer sanitization**: verify all user-controlled values written to Sheets pass formula/CSV-injection sanitization.
4. **Account isolation**: validate cache, local SQLite, outbox, and sync behavior across account switches.

## Release gate still open

- Deploy to the existing Apps Script deployment only after runtime validation.
- Validate authenticated BA save, lock contention, row numbering, and ULP authorization in the deployed Apps Script runtime.
- Complete real-device Flutter validation before production sign-off.
