# Product Requirements Document

## SiSi ULP Toboali

**Document status:** Living product and engineering specification  
**Repository:** `GuswanSyahludin/SiSi-ULP-Toboali`  
**Primary operating scope:** Internal ULP Toboali operations  
**Audit findings and remediation tasks:** `docs/SECURITY-AUDIT-STATUS.md`  
**Last updated:** 30 September 2026, after PR #47 merge

## 1. Product contract

SiSi ULP Toboali is an internal operational platform for recording, reviewing, synchronizing, and reporting electrical distribution work for ULP Toboali. It combines Google Apps Script, Google Sheets/Drive, a web interface, and a Flutter mobile application.

The required system policy is fail-closed: foreign, blank, duplicate, unresolved, or ambiguous ownership is rejected before operational spreadsheet, Drive, PDF, or write side effects. `idBA` is a row lookup key, never an ownership value. Requirements below describe the target contract; merged source and outstanding evidence are distinguished in section 6. A requirement is not proof that every legacy path already satisfies it.

## 2. Authorization and storage requirements

- Protected operations require a valid session and resolved ULP.
- BA access remains same-ULP; Super User does not automatically bypass BA ownership.
- Tokens are not accepted through insecure query-string contracts.
- Device authentication uses `loginPerangkat`, `cekPerangkat`, and `logoutPerangkat` only; endpoint failure must not activate legacy authentication.
- Device tokens expire after 30 days absolute or 7 days idle, whichever comes first, forcing fresh login.
- Password plaintext is accepted only during an explicit single-use migration window capped at 7 days; after cutoff, verification fails closed and requires migration or reset.
- Password audit/migration requires Super User authorization; account password writes must not fall back to plaintext.
- Jadwal Padam master/list/calendar/Master Beban/save/update/status/delete/WhatsApp operations require authenticated ULP scope and unique row resolution.
- Inspection and watermark photos must be private by default and retrieved through authenticated same-ULP access. Existing public photos require controlled ACL rotation. Source overlays do not prove remote private-at-creation or complete legacy coverage.
- Master Gardu snapshot materialization preserves pending/conflict local edits, atomically replays `gardu_outbox` patches, and scopes identity by normalized `(ulp, gardu)` across tables, deletion, replay, and revision storage.
- Master Gardu edits use `serverRevision`; stale edits return `MASTER_GARDU_CONFLICT` and remain visible as conflict outbox rows, not silently retried or discarded.
- REL-03 writes preflight formula/immutable cells and avoid whole-range rewrites that turn formulas into values.
- Mobile ROW append requires session/same-ULP scope, coordinate/diameter validation, safe text cells, serialized append side effects, and caller/account-scoped idempotency.
- Databases, queues, caches, local photos, SharedPreferences, WorkManager inputs and progress must remain account-isolated. Legacy shared databases are quarantined, not assigned silently to another account.
- Worker names are account-scoped; mismatched worker payloads are rejected. Full session-generation/callback isolation remains a separate requirement, not a guarantee from namespacing alone.
- Pending records/photos remain retryable without deleting SQLite to recover.
- Yandal originals are copied to account-private storage with frozen metadata and SHA-256, then recorded in durable `photo-outbox.jsonl`; official-code binding does not alter capture metadata or original bytes.
- Yandal active server photo processing must never call the legacy public-sharing helper. Missing authorization/ownership, lock failure, invalid references, ACL failure and incomplete writes must remain failures for the queue.
- Login failures use generic responses and additional supplied-device/client throttling.
- Production webhook timestamps default to enforce; legacy warning-mode fixtures opt in explicitly.
- `SISI_API_URL` selects approved deployments at build time; credentials/signing material are not committed.
- Main protection must be live-verifiable: required security/release checks, review approval, stale-review dismissal, administrator enforcement, no force-push/deletion, conversation resolution.
- Android release signing fails closed without complete inputs; backup/data extraction exclude credentials, databases, caches and private photos.
- Evidence validation must bound encoded size and decoded dimensions/pixels, reject corrupt content, and verify original integrity before render/export. Explicit complete JPEG markers apply to rendered JPEG validation; original decoder validation is a distinct contract.

## 3. Core workflows

### Authentication and session

The approved device-auth path activates one account namespace. Expiry clears credentials and forces login. Plaintext credentials require migration/reset after cutoff. Account-switch, stale callback and database-activation race acceptance remains required.

### Offline synchronization

Local writes are durable before success. Master Gardu snapshot merge upserts incoming data, deletes only eligible stale rows without pending/conflict edits, preserves pending/conflict rows and replays JSON patches before commit. Identity is `(ulp, gardu)`. Registration/cancellation and stored progress use an account namespace; generation-pinned callbacks and visible progress reset remain open source work.

### Mobile ROW append

Reject unauthenticated, foreign-ULP and unsafe requests before the legacy writer. Sanitize text, bound numeric inputs, serialize append/enqueue and replay the original successful receipt by account-scoped idempotency key. Upload transaction semantics and progressive-update false-success/orphan handling remain separate open work.

### Berita Acara

Authenticate, resolve exactly one owned `idBA` row, enforce same-ULP including Super User, then generate/upload/sync/return. No direct Drive fallback.

### Yandal photo capture and processing

Mobile stores original bytes privately with frozen capture time/GPS/checksum and a durable outbox; code references are atomic. Decoder-backed originals and marker/decoder-validated rendered JPEGs are separate validation paths. Full local integrity checks, remote lifecycle and real-device acceptance remain tracked work.

PR #47's server boundary authenticates before operational reads, acquires the script lock before ownership resolution and legacy preprocessing, and rechecks row key/ULP/folder/source before photo ACL/Sheet writes. It reacquires the lock after legacy processing before ACL repair and propagates swallowed failures through completion tracking.

Output reuse uses `WM_v2_<SHA-256>.jpg` and a matching provider idempotency identity derived from source ID/content/name/MIME, destination folder, Sheet/row key, slot and canonical render metadata. Legacy name-only outputs are privatized but not reused as proof of identity. Partial write/flush retries reuse unchanged versioned outputs; changed sources require new output identities.

Public manual tick/drain and trigger installation require a Toboali Super User. Private scheduler entries establish execution-local capability, not request flags. Webhook authority comes from verified POST body; mobile mode remains separate. Existing no-session public triggers fail closed and require a controlled staging migration to `_t11TickPusatSiSi_` before production.

Script locks do not lock external AppSheet/Sheet/Drive edits. Rechecks are not a distributed atomic transaction. Versioned output names are not cryptographic attestation against malicious output replacement by a Drive collaborator. Runtime ACL/collaborator governance, engine private-at-creation, idempotency/naming compatibility, latency/quotas and served load order must be verified.

## 4. Functional requirements

- **FR-01:** Protected reads/writes require a valid session.
- **FR-02:** Verify caller ULP before operational data access.
- **FR-03:** Foreign, blank, unresolved, duplicate or ambiguous ownership fails closed.
- **FR-04:** Reject tokens from insecure query strings.
- **FR-05:** Authorization failures occur before operational side effects.
- **FR-06:** Mobile writes are durable before success.
- **FR-07:** Pending corrections, approvals, uploads and downloads remain retryable.
- **FR-08:** Account switching cannot expose/submit another account's data or workers.
- **FR-09:** BA operations require a uniquely resolved owned row.
- **FR-10:** Device-auth failure cannot trigger legacy fallback.
- **FR-11:** CI, deployed-runtime and real-device evidence precede production sign-off.
- **FR-12:** No plaintext credential SharedPreferences after secure migration.
- **FR-13:** Device credentials expire after 30 days absolute or 7 days idle.
- **FR-14:** Reject plaintext verification after the explicit migration cutoff.
- **FR-15:** Atomic Master Gardu materialization preserves and replays pending edits.
- **FR-16:** Jadwal Padam enforces same-ULP ownership with unique `kode` resolution.
- **FR-17:** Stale Gardu revisions are rejected and preserved as non-retryable conflicts.
- **FR-18:** Photos private by default; authenticated same-ULP retrieval.
- **FR-19:** Mobile ROW session/ULP, safe inputs, serialization and idempotent retry.
- **FR-20:** Production webhook timestamp within the allowed window.
- **FR-21:** Generic login errors plus supplied-device/client throttling.
- **FR-22:** Build-time `SISI_API_URL` for approved staging/production targets.
- **FR-23:** Auditable live main-branch protection enforcement.
- **FR-24:** Android release signing and backup policy fail closed.
- **FR-25:** Preflight Gardu formula/immutable cells before writes.
- **FR-26:** Recover Yandal originals after cache cleanup/restart.
- **FR-27:** Decode/size/dimension/integrity validation before evidence persistence/render/export; rendered JPEG additionally requires complete SOI/EOI markers.
- **FR-28:** Direct watermark output is created private, never public-by-link by default.
- **FR-29:** Workers/progress partition by account and reject stale session work.
- **FR-30:** Active Yandal processing never invokes public-sharing helpers and never reports successful completion after privacy/write failure.
- **FR-31:** Validate Yandal ownership under lock before legacy preprocessing; recheck row/folder/source bindings at photo writes.
- **FR-32:** Reuse watermark only for matching versioned source/content/render identity; retries must not silently reuse stale name-only output.

## 5. Security, reliability, and definition of done

Do not trust client ULP/role/ownership/URLs without server resolution; do not log secrets. Use serialization, bounded retry and durable failure history. Password migration needs verified backup/version history; database migration preserves data/defaults/indexes/composite identity.

Automated acceptance includes Audit Gate, backend security, Flutter analyze/tests/build, auth transport, password cutover, pending-edit materialization, conflicts, REL-03, photo privacy, ROW safe writes, Jadwal Padam and BA ownership. Yandal coverage includes ACL/lock failures, auth-before-read, source ID/content replacement, metadata identity, partial writes/flush, queue retry and private scheduler context. Mocked services are not deployed-runtime evidence.

Staging/device acceptance must cover same/foreign/invalid sessions, formula injection, coordinate bounds, ROW concurrency/retry, password migration, token expiry, secure storage, two-device Gardu conflicts and upgraded migration, pending edits/restart, account switching and callback races, Android backup/data transfer denial, signed internal APK, camera/GPS/cache recovery, native decoder parity, authenticated photo display/download and public-link rejection.

PR #47 also requires served load-order evidence, controlled private-trigger migration with backup/rollback, Cloud Run private-at-creation and versioned naming/idempotency compatibility, Drive inheritance/collaborators, latency/quota measurements and historical ACL rotation. No production deployment or trigger/ACL migration is authorized by source merge. Done requires implementation, accurate docs, focused/full tests, CI, deployed-runtime and real-device evidence.

## 6. Delivery status

Stages 0-4: P0 Audit Gate, BA atomicity, same-ULP authorization, ownership/file binding and Sheet-write compatibility are merged for covered scope. Stage 5 has merged account-scoped storage and secure-session foundations, but full concurrent session isolation and remaining legacy compatibility paths are not complete.

### Stage 6: Full-stack audit remediation, 26-30 September 2026

- **T-01/T-02:** Token exposure/query authentication source remediations merged.
- **T-03/T-04:** Delta sync ULP scoping and endpoint guard source merged.
- **C-01:** Gardu edit-upload regression fixed and covered.
- **#25, H-02/T-05:** Batching, recursion prevention, deterministic load order; runtime pending.
- **#26, H-06/T-10:** 30-day absolute/7-day idle expiry; device evidence pending.
- **#27, H-08:** Time-limited plaintext cutover; staging migration/cutoff pending.
- **#28, C-05/T-06:** Atomic materialization/pending-edit preservation; device proof pending.
- **#29, T-08/H-04:** Jadwal ownership overlay; cross-ULP/duplicate/staging/device proof pending.
- **#30, T-09/H-05:** Composite identity/revision conflicts; two-device/UI/migration proof pending.
- **#31, T-11/H-07:** Privacy source foundations; historical ACL/runtime acceptance pending.
- **#32, T-07/H-03:** ROW safe-write boundary; concurrency/retry/client/device proof pending.
- **#35, T-14/T-15/T-18/T-21/T-22/T-24:** Source hardening, superseding #34; runtime/compatibility pending.
- **#36, T-29:** Branch-protection audit tooling; live ruleset evidence pending.
- **#37:** Android signing/backup source guards; secret store/signed APK/device proof pending.
- **#38:** Android 12+ extraction resource correction; runtime pending.
- **#39, REL-03:** Formula/immutable preflight and targeted writes; sanitized formula/header map and runtime proof pending.
- **#40, T-21/T-20:** Stale Flutter audit removal and contract. T-21 complete; strict lint/deprecated APIs/generated Drift and device work still open.
- **#41, T-16/T-17:** Rendered HTML boundary, query-token fallback removal and SRI, commit `176e6fb45b2fc6054da570f3f2c27bcce73af4e9`. Full CSP/DOM/inline-handler refactor open.
- **#42, T-19/T-32:** Account-private originals, frozen metadata/checksums, durable outbox and atomic code binding. Remote lifecycle and device proof open.
- **#43:** Decoder-backed original validation and explicit rendered JPEG SOI/EOI validation, commit `cceebdc8e8c75541cb1b35043afd335e1c5ac7a2`. Original validation is not a universal complete-JPEG-marker guarantee. Decoded pixel limits, pre-read size guard, checksum-before-render, native parity, upload transactions and orphan cleanup remain open.
- **#44:** Direct watermark payload `makePublic: false`, commit `8edb64fcd11531075ddeb28f6177bffa1134013e`; remote configuration and historical ACL proof open.
- **#45:** Account-scoped WorkManager names and progress preference keys, commit `e5d6077506ed2cafc1d38e3a4c04d85a0d0095dd`. Worker mismatch rejection predated this PR. Full session-generation isolation, stale callbacks, progress reset and DB activation races remain open.
- **#46:** Best-effort Yandal ACL repair, commit `338e4b00d5b3e8d9380e2028d97e9803869c88d8`. This swallowed errors and was not fail-closed; superseded by #47.
- **#47:** Active Yandal fail-closed photo boundary, auth-first/private scheduler source, lock-before-ownership/preprocessing, versioned source-content-bound output reuse and tests. Squash commit `2f46cb4898a7296c27ef12a22f99b4f77d53be9c`; reviewed head `1c0fd2b3efff64aee6c114889f8792f388c5c873`. All three head CI checks passed. 66 local mocked tests plus 4 local transport/URL-helper scenarios passed; 8 repository integration cases are registered in CI. No merge-related deployment, trigger execution, ACL rotation, file deletion or runtime-task closure.

**Overall:** Source remediations merged through PR #47. Runtime acceptance, live branch protection, full account isolation, remaining photo lifecycle/validation and strict CSP work are incomplete. The system is not production-ready.
