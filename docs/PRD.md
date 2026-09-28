# Product Requirements Document

## SiSi ULP Toboali

**Document status:** Living product and engineering specification  
**Repository:** `GuswanSyahludin/SiSi-ULP-Toboali` (formerly `SyahludinGus/SiSi-ULP-Toboali`)  
**Primary operating scope:** Internal ULP Toboali operations  
**Audit findings and remediation tasks:** `docs/SECURITY-AUDIT-STATUS.md` (single source of truth)  
**Last updated:** 29 September 2026, 00:30 WIB

## 1. Product contract

SiSi ULP Toboali is an internal operational platform for recording, reviewing, synchronizing, and reporting electrical distribution work for ULP Toboali. It combines a Google Apps Script backend, Google Sheets and Drive data sources, a web interface, and a Flutter mobile application.

The system is fail-closed: SISI is internal to ULP Toboali, and BA access must remain same-ULP. Foreign, blank, duplicate, unresolved, or ambiguous ownership is rejected before spreadsheet, Drive, PDF, or write side effects. `idBA` is a row lookup key, never an ownership value.

## 2. Product surfaces

### Backend and web

The Apps Script backend provides authenticated session/account operations, mobile APIs, BA listing and document flows, file downloads, Master synchronization, webhook actions, and scheduled queues. The web client provides authenticated dashboards, inspections, ROW, BA listing/detail, PDF generation, and downloads.

### Flutter mobile

The Flutter mobile client supports authenticated offline-first field workflows, durable outboxes, inspections, reports, ROW and photo flows, P0/Yandal corrections and approvals, Master downloads, explicit retries, and account-safe local persistence.

## 3. Authorization and storage requirements

- Protected operations require a valid session and resolved ULP.
- SISI operational access is ULP Toboali only; Super User does not automatically gain cross-ULP BA access.
- BA downloads require `idBA + fileId`, and the file must be present on the resolved BA row.
- Tokens are not accepted through insecure query-string contracts.
- Device authentication uses `loginPerangkat`, `cekPerangkat`, and `logoutPerangkat` only.
- Unknown or unavailable device-auth endpoints fail closed; they must not fall back to legacy `login`, `cekSesi`, or `logout` flows.
- Legacy session tokens are not reused to restore or migrate a device session, and logout sends only the device token.
- Device tokens expire absolutely after 30 days or after 7 days without activity; either condition forces a fresh device login.
- Password plaintext is accepted only during an explicit, single-use migration window capped at 7 days; after cutoff, password verification fails closed and requires migration or reset.
- Password audit/migration requires Super User authorization, and all account password writes require the hash module with no plaintext fallback.
- Master Gardu snapshot materialization must upsert the fresh server snapshot without deleting pending local edits. Rows with `gardu_outbox` entries remain addressable even when absent from a snapshot, and their JSON patches are replayed atomically after materialization.
- Mobile local database names are derived from normalized `username + ulp`.
- `AppDatabase` requires an account-scoped name; the legacy shared `sisi_db` name is never a default.
- Access to local database state fails closed before session activation.
- SharedPreferences queue keys, Workmanager inputs, SQLite tables, outboxes, caches, staging rows, and local mirrors are isolated by account namespace.
- Logout cancels periodic and manual workers before closing the active account database.
- A stale worker must reject execution when its account namespace differs from the active session.
- The legacy `sisi_db` file and SQLite `-wal`/`-shm` sidecars are quarantined, not silently copied into an account database, because legacy row ownership is not provable.
- Session JSON and device tokens are stored in platform secure storage; SharedPreferences is only a one-time migration source and is purged after migration, logout, or invalid legacy-state handling.
- Legacy migration requires a complete username, ULP, and matching non-empty token in both the legacy session payload and the separate legacy token field; mismatches fail closed.
- Pending records and photos must remain retryable; no recovery procedure may require deleting local SQLite.

## 4. Core workflows

### Authentication and session

The approved device-auth login path creates the active session. Session restoration validates the persisted session and activates exactly one account namespace. If device authentication is unavailable, the client reports failure instead of reusing a stale legacy session. Logout cancels workers, clears session access, and closes the account database. When the absolute or idle device-token limit is exceeded, the backend deletes the credential and the Flutter client clears secure session state, forcing `loginPerangkat()` again. A legacy plaintext password is usable only within the controlled migration window; after cutoff the user must complete an explicit migration/reset path.

### Offline synchronization

Local writes are durable before success is shown. Master Gardu materialization uses an atomic snapshot merge: incoming rows are upserted, stale rows without pending outbox edits may be removed, pending rows are preserved, and each pending JSON patch is replayed before the transaction commits. Outbox entries contain enough information for safe retry and duplicate resistance. Failed items remain visible. Queue state and background workers are bound to the active account.

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
- **FR-10:** Device-auth endpoint failure cannot trigger legacy token/session fallback.
- **FR-11:** Required CI, deployed-runtime, and real-device acceptance evidence is recorded before production sign-off.
- **FR-12:** Session and device credentials are never persisted in plaintext SharedPreferences after secure-storage migration.
- **FR-13:** Device credentials expire after 30 days absolute or 7 days idle, whichever comes first; expiry forces fresh login.
- **FR-14:** Password plaintext verification is rejected after the explicit migration cutoff; residual accounts require migration or reset.
- **FR-15:** Master Gardu materialization preserves pending offline edits and replays `gardu_outbox` patches atomically after a new snapshot.

## 6. Security and reliability requirements

Fail closed by default. Do not trust client-supplied ULP, role, ownership, file membership, identifiers, or URLs without server-side resolution. Do not log secrets or tokens. Use locks for atomic identifier generation, bounded retry for queues, and preserve failed records and audit history. Password migration must preserve a verified backup/version-history point and must not restore plaintext as a rollback path. Master snapshot replacement must not silently discard pending local edits.

## 7. Testing and definition of done

Automated acceptance includes the Audit Gate, backend security tests, Flutter analysis/tests/build, token-query rejection, password cutover coverage, Master Gardu pending-edit materialization coverage, BA ownership/download coverage, account namespace tests, legacy database quarantine tests, worker contract tests, offline queue coverage, auth-fallback contract tests, and secure-storage migration contract tests.

Runtime acceptance must cover deployed Apps Script authorization and safe writes, plus staging password migration with backup/version-history evidence, dry-run counts, batch migration, post-cutover plaintext rejection, reset/migration recovery, real-device offline Gardu edit followed by fresh Master download and outbox replay, real-device upgrade from the old shared database, legacy quarantine, account A to logout to account B, restart, offline queue/retry, duplicate delivery handling, photo isolation, stale-worker rejection, revoked device token, absolute device-token expiry, idle device-token expiry, malformed device-auth response, unavailable device-auth endpoint behavior, and secure-storage migration/purge behavior.

A change is done only when implementation and documentation are updated, focused and full tests pass, CI is green, deployed-runtime and real-device evidence is recorded, and no pending data, photo, audit history, or outbox record is silently discarded.

## 8. Delivery stages

1. Stage 0, P0 Audit Gate: implemented and merged.
2. Stage 1, BA atomicity: implemented and merged.
3. Stage 2, same-ULP authorization: implemented and merged for covered boundaries.
4. Stage 3, BA row ownership and file binding: implemented and merged.
5. Stage 4, compatibility and Sheet-write hardening: implemented and merged for covered scope.
6. Stage 5 Task 1, account-isolated local storage and legacy quarantine: implemented, real-device validated, and merged.
7. Stage 5 Task 2, legacy auth fallback cleanup: implemented and merged in PR #11.
8. Stage 5 Task 3, secure session and device-token storage migration: implemented, contract-tested, audited, and merged in PR #12.
9. Remaining Stage 5 tasks: legacy credential migration validation, secure-storage real-device evidence, token redaction, deployed smoke tests, branch protection, and offline-sync integration coverage.

### Stage 6: Full-Stack Audit Remediation (27 September 2026)

**Audit Period:** 26-29 September 2026  
**Audit Scope:** Backend + web + mobile (comprehensive)

**Critical Tasks Completed:**

#### T-01: C-03 Token Removal ✅
- **PR #7** (commit bbea500) - Removed token from login URL
- **Status:** Merged & verified
- **Risk Mitigated:** Tokens no longer exposed in browser history

#### T-02: H-01 Auth Token Rejection ✅
- **PR #6** (commit 38279b2) - Reject auth tokens from query string
- **Status:** Merged & verified
- **Risk Mitigated:** Query string auth paths closed

#### T-03: C-02 Guard Enforcement (Phase 1-2) ✅
- **PR #8** (commit e79b2fc) - Guard enforcement snapshot/manifest
- **PR #9** (commit 2c966e1) - Row-level ULP filtering + db_Users sanitasi
- **Status:** Merged & verified
- **Risk Mitigated:** Delta sync requires valid session + ULP scoping

#### T-04: C-04 Guard Top-Level Functions ✅
- **PR #10** (commit d76ce5c) - Jadwal-Padam (8) + Tek-LaporanUP3 (1) guards
- **PR #11** (commit 855e276) - Tek-LaporanWilayah (1) guard
- **PR #12** (commit 18e3df7) - Tek-LaporanHarianSheet (6) guards
- **Status:** All 16 functions guarded, merged & verified
- **Risk Mitigated:** All top-level functions require valid session + ULP scoping

#### C-01: Master Gardu Edit Upload Regression ✅
- **Root Cause:** PR #3 wrapper didn't distinguish download vs upload requests
- **Impact:** APK edits sent with mode: "update" silently lost (25-27 Sep)
- **Remediation:** PR #4 hotfix and PR #13 documentation/test coverage
- **Status:** Fixed & documented
- **Risk Mitigated:** Master Gardu edits route correctly; regression test prevents recurrence

#### H-02 / T-05: Master sync timeout and dispatch hardening ✅
- **PR #25** squash-merged as `6c29b7ca71f3c83deab721efaa75cb72e2608d35` on 28 September 2026.
- Default 24-dataset Master sync is split into batches of up to 4 datasets.
- Per-dataset checkpoints/resume are preserved; partial snapshot batches fail closed.
- Snapshot timing logs contain only safe metadata; no tokens or payloads are logged.
- Backend recursion, T04 wrapper self-capture, legacy mobile stub loading, and deployment/harness ordering issues were fixed.
- Status: merged to `main`; production deployment and real-device staging validation remain pending.

#### H-06 / T-10: Device-token lifetime enforcement ✅
- **PR #26** squash-merged as `d59c4f3f5695ac7e8838b4aa475826203adeeef3` on 28 September 2026.
- `expiresAt` is 30 days from device login; `lastSeenAt` idle timeout is 7 days.
- If either limit passes, `cekPerangkat` deletes the token and returns `DEVICE_TOKEN_EXPIRED`; the user must run `loginPerangkat` again.
- Cleanup is scheduled through the central daily worker; secure Flutter session state is cleared after backend rejection.
- Backend syntax/security, Flutter analysis/build, and query-string auth rejection checks passed.
- Status: merged to `main`; no production deployment or real-device expiry test yet.

#### H-08: Password plaintext cutover ✅
- **PR #27** squash-merged as `b46c8775bef39b28fae6fd74c7cdc45c300b0110` on 28 September 2026.
- A single-use migration window is capped at 7 days; plaintext verification fails closed without a valid window or after cutoff.
- Hash verification remains available; password audit/migration requires Super User authorization.
- Account password writes require the hash module and the emergency plaintext rollback path is blocked.
- Automated backend/security and query-string checks passed on the merged PR.
- Status: code merged to `main`; isolated staging migration, verified backup, cutoff proof, and post-cutover validation remain pending.

#### C-05 / T-06: Master Gardu snapshot materialization safety ✅
- **PR #28** merged as `66f272eb1799fe8b5220cb0e3db73f72730b5f46` on 29 September 2026.
- Incoming Master Gardu rows are upserted atomically; stale rows without pending outbox edits may be removed.
- Rows with pending `gardu_outbox` edits remain present even if absent from the fresh snapshot, and their JSON patches are replayed before the transaction commits.
- Regression coverage verifies pending-row protection, no full-table delete, and patch replay; backend and Flutter CI checks passed.
- Status: merged to `main`; real-device offline-edit preservation, outbox retry/restart, and production sign-off remain pending. This change is not production-ready until those evidence items are recorded.

**Remaining Open Items:** Runtime migration acceptance for H-08 (staging migration, verified backup, cutoff/fail-closed verification, and post-cutover validation), C-05 real-device validation and production sign-off, H-02/T-05 staging and real-device acceptance, H-06 real-device expiry/forced-login validation, and other items tracked in `docs/SECURITY-AUDIT-STATUS.md`.

No later stage is complete while an earlier security or runtime blocker remains unresolved.
