# Product Requirements Document

## SiSi ULP Toboali

**Document status:** Living product and engineering specification  
**Repository:** `GuswanSyahludin/SiSi-ULP-Toboali`  
**Primary operating scope:** Internal ULP Toboali operations  
**Audit findings and remediation tasks:** `docs/SECURITY-AUDIT-STATUS.md`  
**Last updated:** 29 September 2026, 14:55 WIB

## 1. Product contract

SiSi ULP Toboali is an internal operational platform for recording, reviewing, synchronizing, and reporting electrical distribution work for ULP Toboali. It combines Google Apps Script, Google Sheets/Drive, a web interface, and a Flutter mobile application.

The system is fail-closed. Foreign, blank, duplicate, unresolved, or ambiguous ownership is rejected before spreadsheet, Drive, PDF, or write side effects. `idBA` is a row lookup key, never an ownership value.

## 2. Authorization and storage requirements

- Protected operations require a valid session and resolved ULP.
- BA access remains same-ULP; Super User does not automatically bypass BA ownership.
- Tokens are not accepted through insecure query-string contracts.
- Device authentication uses `loginPerangkat`, `cekPerangkat`, and `logoutPerangkat` only.
- Device tokens expire after 30 days absolute or 7 days idle, whichever comes first, forcing fresh login.
- Password plaintext is accepted only during an explicit single-use migration window capped at 7 days; after cutoff, verification fails closed and requires migration or reset.
- Password audit/migration requires Super User authorization, and account password writes have no plaintext fallback.
- Jadwal Padam reads and writes are same-ULP: master, list, calendar, Master Beban, save, update, status, delete, and WhatsApp-text endpoints require the authenticated ULP scope. Foreign, unresolved, duplicate, or ambiguous rows fail closed before writes.
- Inspection and watermark photos are private by default. Upload and watermark paths force private Drive ACLs; photo retrieval requires an authenticated session and same-ULP ownership.
- Existing public-by-link photos require a controlled batch ACL rotation before production sign-off.
- Master Gardu snapshot materialization upserts fresh data without deleting pending local edits; `gardu_outbox` patches are replayed atomically.
- Master Gardu identity is scoped by normalized `(ulp, gardu)` in mobile tables, outbox updates, snapshot deletion, patch replay, and revision storage.
- Master Gardu optimistic concurrency stores a per-row `serverRevision`; stale edits fail with `MASTER_GARDU_CONFLICT` and remain visible as conflict outbox rows.
- Mobile local databases and queues are account-scoped by normalized username and ULP.
- SharedPreferences, Workmanager inputs, SQLite tables, outboxes, caches, and local mirrors remain isolated by account namespace.
- Legacy shared database files are quarantined, not silently assigned to another account.
- Pending records and photos remain retryable; recovery must not require deleting local SQLite.

## 3. Core workflows

### Authentication and session

The approved device-auth path creates the active session. Session restoration activates exactly one account namespace. Device-token expiry deletes the credential and forces `loginPerangkat()` again. Legacy plaintext passwords require migration or reset after cutoff.

### Offline synchronization

Local writes are durable before success is shown. Master Gardu materialization uses an atomic snapshot merge: incoming rows are upserted, stale rows without pending or conflict outbox edits may be removed, pending and conflict rows are preserved, and pending JSON patches are replayed before commit. Failed outbox items remain visible and retryable. Snapshot deletion and patch replay always use the composite `(ulp, gardu)` identity.

### Berita Acara

The server authenticates the caller, verifies same-ULP access, resolves exactly one `idBA` row, validates ownership, and only then generates, uploads, syncs, or returns a file. Direct Drive fallback is not allowed.

## 4. Functional requirements

- **FR-01:** Protected reads/writes require a valid session.
- **FR-02:** Authorization verifies caller ULP before operational data access.
- **FR-03:** Foreign, blank, unresolved, or ambiguous ownership fails closed.
- **FR-04:** Tokens are rejected from insecure query strings.
- **FR-05:** Authorization failures occur before side effects.
- **FR-06:** Mobile writes are durable before reported success.
- **FR-07:** Pending corrections, approvals, uploads, and downloads remain retryable.
- **FR-08:** Account switching cannot expose another account's local data or workers.
- **FR-09:** BA operations require a uniquely resolved owned row.
- **FR-10:** Device-auth endpoint failure cannot trigger legacy fallback.
- **FR-11:** CI, deployed-runtime, and real-device evidence is required before production sign-off.
- **FR-12:** Credentials are not persisted in plaintext SharedPreferences after secure-storage migration.
- **FR-13:** Device credentials expire after 30 days absolute or 7 days idle.
- **FR-14:** Plaintext password verification is rejected after the explicit migration cutoff.
- **FR-15:** Master Gardu materialization preserves pending offline edits and replays `gardu_outbox` patches atomically.
- **FR-16:** Jadwal Padam endpoints enforce same-ULP read/write ownership using effective scope and row resolution by `kode`.
- **FR-17:** Master Gardu edits require the current per-row server revision; stale revisions are rejected and preserved as non-retryable conflicts.
- **FR-18:** Inspection and watermark photos are private by default and retrievable only through authenticated same-ULP access.

## 5. Security, reliability, and definition of done

Fail closed by default. Do not trust client-supplied ULP, role, ownership, identifiers, or URLs without server-side resolution. Do not log secrets or tokens. Use locks for atomic identifiers, bounded retry for queues, and preserve failed records and audit history. Password migration requires a verified backup/version-history point. Master snapshot replacement must not discard pending or conflict local edits, and migration must preserve data, defaults, indexes, and composite identity. Photo privacy changes are not production-ready until existing public files are rotated and staging/real-device access tests pass.

Automated acceptance includes the Audit Gate, backend security tests, Flutter analysis/tests/build, query-string rejection, password cutover coverage, Master Gardu pending-edit coverage, Master Gardu conflict contract coverage, photo privacy contract coverage, Jadwal Padam endpoint-load and ownership coverage, BA ownership/download coverage, account isolation, secure-storage migration, and offline queue tests.

Runtime acceptance must cover staging authorization/safe writes, password migration and cutoff, authenticated photo retrieval and wrong-ULP/public-link rejection, controlled public-file ACL rotation, real-device offline Gardu edit followed by fresh Master download and outbox replay, two-device stale-edit conflict detection, cross-ULP Jadwal Padam read/write rejection, restart/retry, account switching, token expiry, and secure-storage behavior. A change is done only when implementation, docs, focused/full tests, CI, deployed-runtime evidence, and real-device evidence are complete.

## 6. Delivery status

- Stage 0 P0 Audit Gate: implemented and merged.
- Stage 1 BA atomicity: implemented and merged.
- Stage 2 same-ULP authorization: implemented and merged for covered boundaries.
- Stage 3 BA ownership/file binding: implemented and merged.
- Stage 4 compatibility and Sheet-write hardening: implemented and merged for covered scope.
- Stage 5 account-isolated local storage, legacy auth cleanup, and secure-session migration: implemented, tested, audited, and merged; remaining runtime evidence is tracked separately.

### Stage 6: Full-Stack Audit Remediation

**Audit period:** 26-29 September 2026. **Scope:** backend, web, and mobile.

- **T-01/T-02:** Token exposure and query-string authentication closed.
- **T-03/T-04:** Delta sync ULP scoping and top-level guards merged.
- **C-01:** Master Gardu edit upload regression fixed and covered.
- **H-02/T-05, PR #25:** Master sync batching, recursion prevention, and deterministic load order merged as `6c29b7ca71f3c83deab721efaa75cb72e2608d35`; staging/real-device acceptance pending.
- **H-06/T-10, PR #26:** 30-day absolute and 7-day idle device-token expiry merged as `d59c4f3f5695ac7e8838b4aa475826203adeeef3`; staging/real-device acceptance pending.
- **H-08, PR #27:** Time-limited password plaintext cutover merged as `b46c8775bef39b28fae6fd74c7cdc45c300b0110`; staging migration and cutoff evidence pending.
- **C-05/T-06, PR #28:** Atomic Master Gardu snapshot materialization merged as `66f272eb1799fe8b5220cb0e3db73f72730b5f46`; real-device preservation and sign-off pending.
- **T-08/H-04, PR #29:** Jadwal Padam final ULP ownership overlay merged as `b15febf7523e4bdb49b645a12c2510f6b1cec76d` on 29 September 2026. Cross-ULP staging, real-device validation, production deployment, and sign-off remain pending.
- **T-09/H-05, PR #30:** Optimistic concurrency for Master Gardu merged as `0c75ae2b8fc7bf707778ad01f77bd2d5aa6545df` on 29 September 2026. It adds per-row server revisions, stale-edit rejection, conflict-preserving outbox behavior, normalized `(ulp, gardu)` mobile keys, scoped snapshot materialization, explicit legacy SQLite table rebuilds that preserve schema constraints/defaults/indexes, and removal of the UI fallback that could display unscoped cache rows. Two-device real-device conflict validation, conflict UI end-to-end acceptance, staging validation, production deployment, and sign-off remain pending.
- **T-11/H-07, PR #31:** Private-by-default watermark and inspection photos merged as `de0f532ffbfbc3487490d256037b4861b204edff` on 29 September 2026. It forces private Drive ACLs, sends `makePublic: false` to the watermark engine, adds authenticated same-ULP `getFotoPrivatT11` retrieval, and wires the privacy overlay last. Existing public-file ACL rotation, staging, real-device access validation, and production sign-off remain pending.

**Overall:** Code remediations are merged, but runtime acceptance is incomplete. The system is not production-ready until the documented staging, ACL rotation, and real-device evidence exists.
