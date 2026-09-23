# Product Requirements Document

## SiSi ULP Toboali

**Document status:** Living product and engineering specification  
**Repository:** `SyahludinGuswan/Sisi-ULP-Toboali`  
**Primary operating scope:** Internal ULP Toboali operations  
**Last updated:** 23 September 2026

## 1. Product contract

SiSi ULP Toboali is an internal operational platform for recording, reviewing, synchronizing, and reporting electrical distribution work for ULP Toboali. It combines a Google Apps Script backend, Google Sheets and Drive data sources, a web interface, and a Flutter mobile application.

The system is fail-closed: SISI is internal to ULP Toboali, and BA access must remain same-ULP. Foreign, blank, duplicate, unresolved, or ambiguous ownership is rejected before spreadsheet, Drive, PDF, or write side effects. `idBA` is a row lookup key, never an ownership value.

## 2. Product surfaces

### Backend and web

The Apps Script backend provides authenticated session/account operations, mobile APIs, BA listing and document flows, file downloads, Master synchronization, webhook actions, and scheduled queues. The web client provides authenticated dashboards, inspections, ROW, BA listing/detail, PDF generation, and downloads.

### Flutter mobile

The mobile client supports authenticated offline-first field workflows, durable outboxes, inspections, reports, ROW and photo flows, P0/Yandal corrections and approvals, Master downloads, explicit retries, and account-safe local persistence.

## 3. Authorization and storage requirements

- Protected operations require a valid session and resolved ULP.
- SISI operational access is ULP Toboali only; Super User does not automatically gain cross-ULP BA access.
- BA downloads require `idBA + fileId`, and the file must be present on the resolved BA row.
- Tokens are not accepted through insecure query-string contracts.
- Mobile local database names are derived from normalized `username + ulp`.
- `AppDatabase` requires an account-scoped name; the legacy shared `sisi_db` name is never a default.
- Access to local database state fails closed before session activation.
- SharedPreferences queue keys, Workmanager inputs, SQLite tables, outboxes, caches, staging rows, and local mirrors are isolated by account namespace.
- Logout cancels periodic and manual workers before closing the active account database.
- A stale worker must reject execution when its account namespace differs from the active session.
- The legacy `sisi_db` file and SQLite `-wal`/`-shm` sidecars are quarantined, not silently copied into an account database, because legacy row ownership is not provable.
- Pending records and photos must remain retryable; no recovery procedure may require deleting local SQLite.

## 4. Core workflows

### Authentication and session

The approved login path creates the active session. Session restoration validates the persisted session and activates exactly one account namespace. Logout cancels workers, clears session access, and closes the account database.

### Offline synchronization

Local writes are durable before success is shown. Outbox entries contain enough information for safe retry and duplicate resistance. Failed items remain visible. Queue state and background workers are bound to the active account.

### Berita Acara

The server authenticates the caller, verifies same-ULP access, resolves exactly one `idBA` row, validates row ownership, and only then generates PDFs, uploads files, syncs Master data, or returns a file. Direct Drive fallback is not allowed.

### P0/Yandal correction

Corrections are durable and retryable. `Lain-lain` requires manual weight from 1 through 5, including supported decimal-comma input. Approval/rejection and reasons remain linked to the correct local and server records.

## 5. Functional requirements

- **FR-01:** Protected reads/writes require a valid session.
- **FR-02:** Authorization verifies caller ULP before operational data access.
- **FR-03:** Foreign, blank, unresolved, or ambiguous ownership fails closed.
- **FR-04:** Tokens are rejected from insecure query-string contracts.
- **FR-05:** Authorization failures occur before side effects.
- **FR-06:** Mobile writes are durable before reported success.
- **FR-07:** Pending corrections, approvals, uploads, and downloads remain retryable.
- **FR-08:** Account switching cannot expose another account's local data, queue, cache, staged data, photos, or worker execution.
- **FR-09:** BA PDF, upload, Master sync, and download require a uniquely resolved owned row.
- **FR-10:** Required CI, deployed-runtime, and real-device acceptance evidence is recorded before production sign-off.

## 6. Security and reliability requirements

Fail closed by default. Do not trust client-supplied ULP, role, ownership, file membership, identifiers, or URLs without server-side resolution. Do not log secrets or tokens. Use locks for atomic identifier generation, bounded retry for queues, and preserve failed records and audit history.

## 7. Testing and definition of done

Automated acceptance includes the Audit Gate, backend security tests, Flutter analysis/tests/build, token-query rejection, BA ownership/download coverage, account namespace tests, legacy database quarantine tests, worker contract tests, and offline queue coverage.

Runtime acceptance must cover deployed Apps Script authorization and safe writes, plus real-device upgrade from the old shared database, legacy quarantine, account A to logout to account B, restart, offline queue/retry, duplicate delivery handling, photo isolation, and stale-worker rejection.

A change is done only when implementation and documentation are updated, focused and full tests pass, CI is green, deployed-runtime and real-device evidence is recorded, and no pending data, photo, audit history, or outbox record is silently discarded.

## 8. Delivery stages

1. Stage 0, P0 Audit Gate: implemented and merged.
2. Stage 1, BA atomicity: implemented and merged.
3. Stage 2, same-ULP authorization: implemented and merged for covered boundaries.
4. Stage 3, BA row ownership and file binding: implemented and merged.
5. Stage 4, compatibility and Sheet-write hardening: implemented and merged for covered scope.
6. Stage 5 Task 1, account-isolated local storage and legacy quarantine: implemented, real-device validated, and merged.
7. Remaining Stage 5 tasks: auth fallback cleanup, secure storage, credential migration, token redaction, deployed smoke tests, branch protection, and offline-sync integration coverage.

No later stage is complete while an earlier security or runtime blocker remains unresolved.
