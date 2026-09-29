# SiSi ULP Toboali: Audit dan Status Remediasi

_Terakhir diperbarui: 29 September 2026 19:27 WIB · PR #35 MERGED; staging, client compatibility, real-device validation, and production sign-off remain pending_

File ini adalah satu-satunya tempat mencatat temuan audit, status perbaikan, dan task remediasi SiSi.

## Status Ringkas

| Task | Status | Commit |
|---|---|---|
| T-01/T-02 Token exposure/query auth | ✅ MERGED | bbea500, 38279b2 |
| T-03/T-04 ULP scoping and guards | ✅ MERGED | e79b2fc, 2c966e1, d76ce5c, 855e276, 18e3df7 |
| C-01 Master Gardu edit regression | ✅ MERGED | 35806d2 |
| H-02/T-05 Master sync batching and dispatch hardening | ✅ MERGED | 6c29b7c |
| H-06/T-10 Device-token expiry and cleanup | ✅ MERGED | d59c4f3 |
| H-07 Watermark access guards | ✅ MERGED | 88eb6a0 |
| H-08 Password plaintext cutover | ✅ MERGED | b46c8775bef39b28fae6fd74c7cdc45c300b0110 |
| C-05/T-06 Master Gardu materialization safety | ✅ MERGED | 66f272eb1799fe8b5220cb0e3db73f72730b5f46 |
| T-08/H-04 Jadwal Padam ownership overlay | ✅ MERGED | b15febf7523e4bdb49b645a12c2510f6b1cec76d |
| T-09/H-05 Master Gardu conflict detection and scoped identity | ✅ MERGED | 0c75ae2b8fc7bf707778ad01f77bd2d5aa6545df |
| T-07/H-03 Mobile ROW safe-write boundary | ✅ MERGED | 8d88970d6ef0b52549e26c8b84d9bbfe862fecb4 |
| T-14/T-15/T-18/T-21/T-22/T-24 Source-only hardening batch | ✅ MERGED | 28c2849750a2355c9e0c734c98dfe0adc4b4dc83 |

**Overall:** Critical remediation code merged; staging, client compatibility, production deployment, and real-device evidence remain open. **Security posture:** remediations merged, runtime acceptance incomplete.

## T-14/T-15/T-18/T-21/T-22/T-24: Source-only hardening batch

### Completion: ✅ Merged, runtime acceptance pending

**PR:** [#35](https://github.com/GuswanSyahludin/SiSi-ULP-Toboali/pull/35)  
**Merged commit:** `28c2849750a2355c9e0c734c98dfe0adc4b4dc83`  
**Merged:** 29 September 2026

### Scope and contract

- T-14 adds a device/client identifier throttle for login attempts when the client supplies an identifier. The existing username controls remain in place.
- T-15 normalizes known unknown-user and wrong-password responses to `Username atau password salah.` so account existence is not disclosed by `doLogin`.
- T-18 sets production webhook timestamp validation to `enforce`; only the legacy synthetic fixture explicitly opts into `warn` compatibility mode.
- T-21/T-24 refresh mobile documentation, release checks, debug hygiene, and deployment overlay ordering.
- T-22 makes the mobile API deployment URL build-time configurable via `SISI_API_URL` while retaining the checked-in internal default.
- The final overlay is loaded last in both `.clasp.json` and `appsscript.json`.

### Automated validation

- Backend syntax/security tests: green.
- Query-string token rejection: green.
- Flutter analyze/compile: green.
- Flutter analyze/debug build: green.
- The replacement PR #34 was closed as superseded and was not merged; its dirty, high-churn diff remains excluded from `main`.

### Runtime acceptance pending

- Validate device/client throttle behavior and recovery in isolated staging without locking out unrelated users.
- Validate AppSheet timestamp enforcement with production-shaped signed requests and reject stale/replayed timestamps.
- Validate staging and real-device mobile builds using explicit approved `SISI_API_URL` values.
- Confirm deployed overlay order and endpoint behavior after Apps Script deployment; do not treat local CI as deployed-runtime evidence.
- Production deployment and sign-off remain pending.

## T-07/H-03: Mobile ROW safe-write boundary

### Completion: ✅ Merged, runtime acceptance pending

**PR:** [#32](https://github.com/GuswanSyahludin/SiSi-ULP-Toboali/pull/32)  
**Merged commit:** `8d88970d6ef0b52549e26c8b84d9bbfe862fecb4`  
**Merged:** 29 September 2026

### Scope and contract

- `simpanMobileEksekusiRow` now requires `guard_(arguments, { ulp: true })` before the legacy writer runs.
- Text fields are bounded and passed through `safeCell_`; latitude/longitude and diameter are range-checked before Sheet side effects.
- Code generation, append, and enqueue/retry handling execute under `withLock_` to prevent concurrent row collisions.
- A username-scoped idempotency key is persisted in Script Properties; a successful retry returns the original result instead of appending another row.
- T-07 loads before T-11 so the private-photo wrapper remains outermost and can revoke public ACLs on legacy ROW results.
- Backend syntax/security, Flutter analyze/compile, query-string rejection, and T-07/T-11 contract tests are green on the merged head.

### Runtime acceptance pending

- Validate invalid session, blank/foreign ULP, malformed payload, coordinate bounds, diameter bounds, and formula/CSV injection rejection in isolated staging.
- Validate two concurrent append requests produce distinct rows and a repeated idempotency key returns the original result without a duplicate.
- Confirm the deployed mobile client sends `idempotencyKey` or `clientRequestId`; legacy clients without either key are intentionally rejected.
- Validate Android/iOS real-device behavior, timeout/retry/restart recovery, and production sign-off only after staging evidence.

## T-09/H-05: Master Gardu optimistic concurrency and scoped materialization

### Completion: ✅ Merged, runtime acceptance pending

**PR:** [#30](https://github.com/GuswanSyahludin/SiSi-ULP-Toboali/pull/30)  
**Merged commit:** `0c75ae2b8fc7bf707778ad01f77bd2d5aa6545df`  
**Merged:** 29 September 2026

### Scope and contract

- Backend returns a per-row `serverRevision`, rejects stale base revisions with `MASTER_GARDU_CONFLICT`, and returns the incremented revision after success.
- Mobile persists revisions per normalized `(ulp, gardu)`, places the base revision in the outbox, and keeps stale/conflict outbox rows for explicit user handling rather than retrying them.
- Local Master Gardu and outbox keys are composite `(ulp, gardu)`, preventing same-number Gardu rows from different ULPs from overwriting each other.
- Snapshot materialization is atomic, scoped by ULP when requested, protects both pending and conflict rows from stale-row deletion, and replays patches by `(ulp, gardu)`.
- Legacy tables are rebuilt with explicit columns and constraints instead of `CREATE TABLE AS SELECT *`, preserving defaults, primary keys, indexes, and existing data during migration.
- The Gardu screen no longer falls back to unscoped local cache when an ULP-scoped query is empty.
- Automated backend, Flutter analyze/test/build, query-string rejection, and T-09 contract checks are green on the merged head.

### Runtime acceptance pending

- Validate two-device same-Gardu editing: first update succeeds, second stale update returns `MASTER_GARDU_CONFLICT` and remains visible as `konflik`.
- Validate conflict banner and end-to-end UI handling on Android/iOS real devices.
- Validate legacy SQLite migration on an upgraded installation with duplicate Gardu numbers across ULPs, pending/conflict outbox rows, defaults, and indexes intact.
- Validate staging only before any production deployment.

## T-08/H-04: Jadwal Padam final ULP ownership overlay

### Completion: ✅ Merged, runtime acceptance pending

**PR:** [#29](https://github.com/GuswanSyahludin/SiSi-ULP-Toboali/pull/29)  
**Merged commit:** `b15febf7523e4bdb49b645a12c2510f6b1cec76d`  
**Merged:** 29 September 2026

### Scope and contract

The overlay covers `getJadwalPadamMaster`, `getJadwalPadamList`, `getJadwalPadamCalendarMonth`, `getJadwalPadamMasterBeban`, `simpanJadwalPadam`, `updateJadwalPadam`, `updateStatusJadwalPadam`, `hapusJadwalPadam`, and `getJadwalPadamWaText`.

- Every endpoint derives effective ULP with `ulpScope_(g, ...)`; client-supplied foreign ULP is not trusted.
- Update, status, and delete resolve the target by `kode` and require `barisUlpCocok_(g, target.ulp)` before writes. Duplicate or ambiguous targets fail closed.
- Save and update validate selected master Penyulang/Section ownership before the underlying write.
- The mobile gateway requires a non-empty token in the JSON body; query-string-only authorization is rejected.
- Loader order is corrected: `Jadwal-Padam-Mobile.js` before the implementation, `Jadwal-Padam-Delete.js` before the overlay, and the overlay last.
- The endpoint load contract confirms the mobile router and all covered endpoints load without backend errors.
- Backend/security, query-string rejection, Flutter analyze/compile, debug build, and T-08 regression checks are green.

### Runtime acceptance pending

- Validate cross-ULP reads and writes in isolated staging for every covered endpoint.
- Validate same-ULP save/update/status/delete and duplicate-code fail-closed behavior.
- Validate Android/iOS behavior with real sessions and JSON-body tokens.
- Production deployment and sign-off remain pending; T-08 is not production-ready.

## Other merged remediations

- **H-06/T-10:** 30-day absolute and 7-day idle device-token expiry, scheduled cleanup, and forced re-login. Staging and real-device evidence pending.
- **H-08:** Single-use 7-day password migration window, fail-closed plaintext cutoff, hash-only writes, and blocked plaintext rollback. Staging migration evidence pending.
- **C-05/T-06:** Atomic Master Gardu upsert, pending-outbox preservation, stale-row safety, and JSON patch replay. Real-device preservation and sign-off pending.
- **H-02/T-05:** Master sync batching, recursion prevention, and deterministic load order. Staging and real-device acceptance pending.

## Cumulative security coverage

- ✅ Top-level guards, ULP scoping, token transport rejection, device expiry, password cutoff, Master Gardu materialization safety, Master Gardu conflict detection, Jadwal Padam ownership enforcement, mobile ROW safe-write controls, login hardening, webhook replay enforcement, and configurable mobile endpoint selection are merged.
- ✅ T-09 covers per-row server revision checks, composite mobile identity, scoped snapshot deletion, conflict-row preservation, safe legacy table reconstruction, and no unscoped UI fallback.
- ✅ T-07 covers the mobile ROW authorization, validation, sanitization, lock, and idempotency boundary.
- ⏳ Runtime staging and real-device evidence remains open for H-03/T-07, H-08, C-05, T-05, H-06, T-08, T-09, and the PR #35 hardening batch.

## Remaining open items

1. 🟡 H-03/T-07 staging authorization, validation, concurrent append, retry/idempotency, client compatibility, and real-device evidence.
2. 🟡 H-08 staging migration, verified backup, cutoff/fail-closed verification, and post-cutover validation.
3. 🟡 C-05 real-device pending-edit preservation, outbox replay, retry/restart, and production sign-off.
4. 🟡 H-02/T-05 staging and real-device Master download without retry.
5. 🟡 H-06 real-device expiry, forced login, secure-storage clearing, and cleanup evidence.
6. 🟡 T-08 cross-ULP staging, same-ULP real-device read/write, duplicate-code rejection, and production sign-off.
7. 🟡 T-09 two-device conflict behavior, conflict UI, upgraded-database migration evidence, staging validation, and production sign-off.
8. 🟡 T-14/T-15/T-18/T-21/T-22/T-24 staging, deployed-runtime verification, client compatibility, and real-device evidence.

## Monitoring checklist

- [x] PR #25 merged with CI green.
- [x] PR #26 merged with CI green.
- [x] PR #27 merged with automated backend/security and query-string checks green.
- [x] PR #28 merged with backend, Flutter, and query-string checks green.
- [x] PR #29 merged with all CI checks green, including overlay and endpoint load-contract checks.
- [x] PR #30 merged with all CI checks green, including Flutter tests, scoped materialization regression, migration contract, and query-string rejection.
- [x] PR #32 merged with backend syntax/security, Flutter analyze/compile, query-string rejection, and T-07/T-11 contract checks green.
- [x] PR #35 merged with backend/security, query-string, Flutter analyze/compile, and Flutter debug-build checks green.
- [x] PR #34 closed as superseded by PR #35.
- [ ] Create verified staging backup/version history before H-08 migration.
- [ ] Deploy H-06 to isolated staging only.
- [ ] Verify T-07 mobile ROW invalid/foreign session, formula injection, coordinate/diameter bounds, concurrent append, retry/idempotency, and client payload compatibility.
- [ ] Verify real-device expired/idle token behavior.
- [ ] Verify C-05 pending-edit preservation and outbox patch replay.
- [ ] Verify T-09 two-device conflict, upgraded-database migration, and conflict UI behavior.
- [ ] Verify T-08 cross-ULP staging and real-device read/write behavior.
- [ ] Verify PR #35 device throttle, webhook replay window, deployment endpoint selection, and debug hygiene in staging/real devices.
- [ ] Update runbook after staging evidence.

## Kesimpulan

PR #35 hardening code is merged and all automated checks are green. Staging authorization, deployed-runtime verification, concurrent append/retry, client compatibility, real-device validation, production deployment, and production sign-off remain pending; PR #35 is not production-ready. Other merged remediations remain operationally open until their documented runtime evidence is recorded.
