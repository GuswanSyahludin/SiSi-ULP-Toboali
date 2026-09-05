# P0 correction release, 6 September 2026

## Implemented
- Photo-first blue/cyan Flutter cards with yellow pending indicators. All three photo slots remain visible. Full-screen photo viewer supports pinch/zoom, reset and retry.
- Inline job-type correction for Admin and Super User, using the real master list. Other/Lain-lain requires a numeric work weight from 1 through 5 (decimals accepted). Reasons are required for mobile corrections.
- Existing duration score and ROW night multiplier are preserved: duration score + work weight * multiplier. Manual weight is per P0, never a global master edit. Normal categories use their master weight. Correcting does not approve the work.
- Corrections persist in an additive SQLite outbox, account scoped. Send corrections before decisions. Failed corrections block decisions for that same P0. A database lease prevents concurrent sends/edits/cancellations, including other isolates; lease expires after a crash.
- Server checks role, actual row ULP, master, weight, expected type/revision, request identity. Same-request retries resume prepared writes without duplicate history.

## Backend layout
`Core/ZZ-P0-Correction.js` wraps existing global entry points during Apps Script initialization. It makes no service calls at initialization. The existing API router, large Yandal file, fixed deployment URL and existing column indices remain unchanged. Deploy this file together with the existing Yandal and Guard files; do not deploy it alone. Do not add another wrapper of the same functions without integration testing.

On the first successful correction, the server appends the named `Koreksi P0 Metadata` column to the far right of the active P0 sheet. It does not insert among existing columns. JSON stores revision, manual weight, request identity, actor, reason and audit history. No photo/duration/location columns are modified. If metadata is malformed or approaches the cell size limit, edits fail closed rather than removing history.

Sheets does not offer multi-cell transactions. Metadata is first written as `prepared`, then type and points, then marked `applied`. Retry the original request from the originating device if interrupted; different corrections and approvals are blocked until recovery. A direct web correction without a request ID is supported for ordinary categories, but a partially interrupted legacy web request requires administrator recovery. Preserve the metadata column when archiving P0 rows. Existing archive readers/reports must be regression-tested before production release.

## Deployment order
1. Run `node --test tests/p0-correction.test.cjs` and the existing `npm test` backend suite.
2. Run Flutter pub get, build_runner if required by the project, `flutter analyze`, and signed APK build. No Flutter SDK was available to the assistant's execution environment.
3. Redeploy Apps Script to the EXISTING deployment ID using the established SiSi deployment procedure. No deployment is performed by this commit.
4. Install APK as an in-place update using the existing package and signing key. Do not uninstall with unsynced data.
5. Fetch P0 master online once before testing offline corrections. Backend capability version must be 2; missing capability blocks sending corrections instead of silently losing the manual weight.

## Required device/runtime acceptance
- Admin own ULP allowed, Petugas denied, foreign/blank ULP denied; Super User retains established scope.
- Change normal type to another type, then to Lain-lain with weight 1, 5 and 2.5. Reject empty, 0, 6 and non-numeric input. Return to normal category and check the manual weight no longer participates.
- Existing 45-minute duration has score 2; Other weight 3 yields 8, not 3. Night ROW keeps multiplier 2.5.
- Edit offline after fetching master, restart app, verify persistence. Verify photos and original code remain identical.
- Approve after correction; correction must reach server first. Disconnect while sending, retry, confirm a single audit entry. Pending server approvals remain queued until the existing backend drain runs.
- Test stale-revision conflicts, interrupted prepared writes, account switches, concurrent auto/manual sync, and rollback with outboxes preserved.
- Load switching's 6 photos and all 10 gardu measurements. Attachment failure must not hide basic details or primary photos.

## Known limitations / not a production sign-off
- This release adds focused Node regression tests; it does not prove a signed APK or authenticated live save has passed.
- A failed/conflicting correction is retained and cannot be overwritten in the UI. Administrator-assisted resolution is currently required; do not delete SQLite to resolve it.
- Audit history is stored per row and shown after a successful receipt/read. Pending local correction shows its reason separately. No standalone history export or server-side automated recovery job is added.
- The broader SyncRepository delta-success reporting and legacy approval drain concurrency behavior are outside this change. The dedicated P0 send button displays the P0-specific result.
- No deployment, operational P0 edit, master weight change, keystore change, login redesign or Cloud Run change is included.
