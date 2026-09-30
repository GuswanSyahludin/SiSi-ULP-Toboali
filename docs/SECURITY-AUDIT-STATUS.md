# SiSi ULP Toboali: Audit dan Status Remediasi

_Terakhir diperbarui: 30 September 2026, setelah merge PR #47. Source merged tidak sama dengan runtime acceptance atau production sign-off._

File ini mencatat temuan, status source, dan pekerjaan remediasi SiSi. Root `SECURITY-AUDIT-STATUS.md` adalah file terpisah; pembaruan ini berlaku untuk dokumen di `docs/`.

## Status Ringkas

| Task / scope | Status | Commit |
|---|---|---|
| T-01/T-02 Token exposure/query auth | SOURCE MERGED | bbea500, 38279b2 |
| T-03/T-04 ULP scoping and guards | SOURCE MERGED | e79b2fc, 2c966e1, d76ce5c, 855e276, 18e3df7 |
| C-01 Master Gardu edit regression | MERGED | 35806d2 |
| H-02/T-05 Master sync batching/dispatch | SOURCE MERGED | 6c29b7c |
| H-06/T-10 Device-token expiry | SOURCE MERGED | d59c4f3 |
| H-07 Watermark access guards | SOURCE MERGED; see #47 | 88eb6a0 |
| H-08 Password cutover | SOURCE MERGED | b46c8775bef39b28fae6fd74c7cdc45c300b0110 |
| C-05/T-06 Materialization | SOURCE MERGED | 66f272eb1799fe8b5220cb0e3db73f72730b5f46 |
| T-08/H-04 Jadwal ownership | SOURCE MERGED | b15febf7523e4bdb49b645a12c2510f6b1cec76d |
| T-09/H-05 Gardu conflicts/identity | SOURCE MERGED | 0c75ae2b8fc7bf707778ad01f77bd2d5aa6545df |
| T-07/H-03 ROW safe-write | SOURCE MERGED | 8d88970d6ef0b52549e26c8b84d9bbfe862fecb4 |
| #35 Source-only hardening | SOURCE MERGED | 28c2849750a2355c9e0c734c98dfe0adc4b4dc83 |
| #36 Branch-protection tooling | MERGED; live evidence OPEN | See PR #36 |
| #37 Android signing/backup source | MERGED; runtime OPEN | See PR #37 |
| #38 Android 12+ extraction resource | SOURCE MERGED | a698e4ca3c74fce79ab79ab1182bf803187a06fd |
| #39 REL-03 formula-safe writes | SOURCE MERGED | ab6270724ee21ee4efcd6d7b2e20cdca25e8e66e |
| #40 T-21/T-20 hygiene | T-21 COMPLETE; T-20 OPEN | eeed5a52979191d277edc2fe628ee6f0448903a |
| #41 Web security boundary | SOURCE MERGED; CSP OPEN | 176e6fb45b2fc6054da570f3f2c27bcce73af4e9 |
| #42 Yandal durability | SOURCE MERGED; lifecycle OPEN | 721542ef74e44eb0a9bdc276329801fe2dfcaeee |
| #43 JPEG validation/export | SOURCE MERGED; further validation OPEN | cceebdc8e8c75541cb1b35043afd335e1c5ac7a2 |
| #44 Direct watermark privacy | SOURCE MERGED | 8edb64fcd11531075ddeb28f6177bffa1134013e |
| #45 Account-scoped worker/progress names | SOURCE MERGED; full isolation OPEN | e5d6077506ed2cafc1d38e3a4c04d85a0d0095dd |
| #46 Best-effort Yandal ACL repair | MERGED; superseded by #47 | 338e4b00d5b3e8d9380e2028d97e9803869c88d8 |
| #47 Active Yandal ACL/auth/identity boundary | SOURCE MERGED; runtime OPEN | 2f46cb4898a7296c27ef12a22f99b4f77d53be9c |

**Overall:** Source remediation merged through #47; staging, compatibility, live branch protection, signed-device evidence and production sign-off remain incomplete. No production-readiness claim.

## PR #47: Yandal fail-closed boundary and deployment order

**PR:** https://github.com/GuswanSyahludin/SiSi-ULP-Toboali/pull/47  
**Squash merge:** `2f46cb4898a7296c27ef12a22f99b4f77d53be9c`  
**Reviewed head:** `1c0fd2b3efff64aee6c114889f8792f388c5c873`  
**Merged:** 30 September 2026, after explicit user confirmation.

### Source changes

- Preserved script identity; explicit processor/watermark/privacy/containment/final-boundary order in both configurations.
- Active `_wmFotoY_` replacement never calls the old public-sharing helper. Legacy unsafe declaration remains superseded by effective load order, which must be verified in staging.
- Session/Toboali ULP authorization precedes operational reads including reuse. Public tick/drain and installer require Super User Toboali. Private scheduler capability is local to execution, not request flags; private HTTP actions are denied and webhook POST credentials are verified separately from mobile mode.
- Lock acquired before row ownership resolution and legacy preprocessing. Timeout stops execution; after legacy release, reacquire and revalidate before ACL repair. Recheck key/ULP/folder/source before photo ACL and Sheet writes; flush before completion.
- Failure latch/receipts prevent swallowed legacy errors from becoming queue success; failed items remain retryable or reach the existing failed limit.
- Versioned names/idempotency keys bind SHA-256 source ID/content/name/MIME, folder, Sheet/key, slot and canonical render metadata. Name-only legacy output is not reused. Same-name replacement or same-ID content edit gets a new identity; partial-write/flush retry reuses unchanged output.

### Evidence

All three reviewed-head CI checks passed:

- Backend syntax/security: https://github.com/GuswanSyahludin/SiSi-ULP-Toboali/actions/runs/36670523700/job/109744328818
- Flutter analyze/compile: https://github.com/GuswanSyahludin/SiSi-ULP-Toboali/actions/runs/36670523700/job/109744328689
- Query-token rejection: https://github.com/GuswanSyahludin/SiSi-ULP-Toboali/actions/runs/36670523676/job/109744328162

66 local mocked tests passed; 4 additional local scenarios used repository transport/URL-helper bodies with mocked services. Registered tests include 8 integration cases using repository Guard, guarded watermark entry, actual P0/Switching processor and queue bodies. No local/deployed Apps Script or real-device acceptance is implied.

### Release gates and limitations

Existing public tick/drain timers without a session now fail closed. Installer source targets `_t11TickPusatSiSi_`, but no runtime trigger is automatically migrated. Review backup/rollback and migrate only in isolated staging before production.

Verify served load order; Cloud Run private-at-creation; engine versioned naming/idempotency compatibility; Drive inheritance/collaborator policy; same-ULP authenticated display/download; hashing/Sheet read latency and quotas; retries, concurrency and devices. Historical public-file rotation remains pending.

Script locks do not coordinate direct AppSheet/Sheet/Drive edits; rechecks are not a distributed atomic transaction. Versioned names are not attestation against a collaborator replacing output bytes or forging names. Separate ROW/Temuan boundaries and complete orphan/lifecycle cleanup remain open. No deployment, trigger execution/migration, ACL rotation, file deletion or runtime-task closure accompanied this merge.

## PR #44 through #46: corrected scope

- #44 forces `makePublic: false` in the direct watermark payload; remote service configuration/private-at-creation still needs runtime proof.
- #45 scopes periodic/one-off WorkManager names and progress preference keys. Worker mismatch rejection already existed before this PR. Generation-pinned callbacks, visible progress reset, concurrent database activation and full account isolation remain source/runtime work.
- #46 reapplied private ACLs after processing but swallowed errors. It was best-effort, not fail-closed. #47 supersedes this active boundary.

## PR #43: JPEG validation and photo failure contract

**PR:** https://github.com/GuswanSyahludin/SiSi-ULP-Toboali/pull/43  
**Merge:** `cceebdc8e8c75541cb1b35043afd335e1c5ac7a2`, 30 September 2026.

Original validation uses an actual decoder and minimum dimensions; rendered `validateJpeg()` additionally enforces encoded size and explicit SOI/EOI markers. Do not apply the complete-marker claim to every original image. Yandal preview widget syntax and valid 320x320 JPEG test fixtures were corrected. Flutter/backend/auth transport checks passed for that PR.

Open source gaps include decoded pixel bounds, pre-read file-size guarding, and checksum verification before rendering. Native decoder parity, MIME/EXIF abuse assessment, signed-device corrupt/truncated input rejection, MediaStore cancel/failure/retry, upload transaction semantics, orphan cleanup and remote engine behavior remain open. A checksum test is not proof every render caller performs checksum validation.

## PR #38: Android 12+ extraction correction

**PR:** https://github.com/GuswanSyahludin/SiSi-ULP-Toboali/pull/38  
**Merge:** `a698e4ca3c74fce79ab79ab1182bf803187a06fd`, 29 September 2026.

`android:dataExtractionRules` references `@xml/data_extraction_rules`; source contract protects legacy and API 31+ backup denial. Backend/Flutter/auth checks passed. Secret-store verification, signed internal APK installation and real-device backup/restore/device-transfer denial remain pending.

## PR #39 / REL-03: Formula-safe Master Gardu writes

**PR:** https://github.com/GuswanSyahludin/SiSi-ULP-Toboali/pull/39  
**Merge:** `ab6270724ee21ee4efcd6d7b2e20cdca25e8e66e`, 29 September 2026.

The final overlay preflights requested HI targets before writes for that Sheet. Identity/configured immutable cells reject with `REL03_IMMUTABLE_FIELD`; formula cells reject with `REL03_FORMULA_CELL`. `db_InsDu_Realisasi` recalculation updates only `jumlahTemuan` rather than rewriting the full range. Both configurations order REL-03 after source hardening. Automated backend, Flutter, auth and order contracts passed.

Source contract remains conservative until sanitized staging `getFormulas()`/header maps exist. Validate no-side-effect rejection, two-device stale edits, multi-spreadsheet partial failures and rollback before expanding the allowlist.

## Existing runtime-open remediations

- T-07/H-03: staging authorization/input validation, concurrent append, retry/idempotency, client compatibility and devices.
- H-08: staging migration, verified backup/version history, cutoff/fail-closed and post-cutover verification.
- C-05/T-06: pending-edit preservation, outbox replay, retry/restart and device sign-off.
- H-02/T-05: staging/device Master download without repeated retries.
- H-06/T-10: expiry, forced login, secure credential clearing and cleanup.
- T-08/H-04: cross-ULP/duplicate-code rejection and same-ULP staging/device behavior.
- T-09/H-05: two-device conflict UI, upgraded DB migration and staging.
- T-14/T-15/T-18/T-22/T-24: deployed behavior, throttling, replay window, endpoint configuration/debug hygiene and compatibility.
- T-16/T-17: strict CSP/DOM refactor and deployed-runtime evidence.
- T-19/T-31/T-32: photo lifecycle/local watermark, cache cleanup/restart, camera/GPS and signed-device proof.
- T-20/T-30: lint/generated Drift and offline/retry/duplicate-delivery integration.
- T-23: external engine migration/shared cost guard redesign.
- T-125/T-126: concurrent account-switch isolation and remaining legacy auth compatibility.
- Android signing/backup: secret store, signed APK, API 31+ backup/data-transfer denial.
- T-29: live branch-protection ruleset evidence, not merely audit tooling.

## Remaining source-code work

REL-03 source merged; formula-map expansion/runtime proof pending. Full strict-CSP/DOM/inline-handler migration remains open. Photo pipeline needs upload failure state machine, checksum-before-render, size/pixel bounds, native parity, orphan cleanup and remote lifecycle tests. Account isolation needs session-generation guards, origin-pinned callbacks, progress reset and database activation race coverage. Flutter lint/deprecated APIs/generated Drift and offline/retry integration remain open. Engine migration/cost guard and signing secret/artifact scans remain separate work. Kopitiam Auth T-132 through T-136/SEC-04 belong to a separate repository and PR.

## Monitoring checklist

- [x] PR #25/#26/#27/#28 source merged with respective passing checks.
- [x] PR #29/#30/#32 ownership, conflict and safe-write source merged with passing checks.
- [x] PR #35/#36/#37 source/tools merged; #34 closed as superseded.
- [x] PR #38/#39 Android resource and REL-03 merged with passing checks.
- [x] PR #40/#41 hygiene/web boundary merged with passing checks.
- [x] PR #42/#43 durability/validation source merged with passing checks.
- [x] PR #44/#45/#46 source merged; limited guarantees clarified above.
- [x] PR #47 audited head merged after user confirmation and all three CI checks passed.
- [ ] Verified staging backup/version history before H-08 migration.
- [ ] H-06 staging expiry/idle/forced-login proof.
- [ ] REL-03 sanitized formula/header map and rejection proof.
- [ ] T-07 session/ULP/formula/coordinate/concurrency/retry/client validation.
- [ ] C-05 pending-edit/outbox and T-09 two-device/conflict/migration proof.
- [ ] T-08 cross-ULP and same-ULP staging/device proof.
- [ ] PR #35 runtime throttle/replay/build-endpoint/debug proof.
- [ ] PR #43 native decoder/export and complete photo transaction/lifecycle verification.
- [ ] PR #47 private scheduler staging migration with backup/rollback, served order, remote private-at-creation/idempotency and historical ACL rotation.
- [ ] Account-switch callback/generation/DB race source and real-device acceptance.
- [ ] Android signing, backup/data-transfer denial and live branch protection evidence.
- [ ] Update runbooks with actual staging/device results before production sign-off.

## Kesimpulan

PR #47 source sudah merged. Dua blocker terbaru yang direproduksi (ownership berubah ketika menunggu lock dan reuse watermark berdasarkan nama file lama) memiliki perbaikan dan regresi pada head yang lulus CI. Ini tidak menutup seluruh source backlog atau menjamin runtime production; semua gate staging, ACL historis, trigger, engine, concurrency, signing dan perangkat nyata tetap berlaku.
