# SiSi ULP Toboali: Audit dan Status Remediasi

_Terakhir diperbarui: 30 September 2026 08:58 WIB · PR #43 MERGED; staging, client compatibility, real-device validation, and production sign-off remain pending_

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
| Android backup/data-extraction resource correction | ✅ MERGED | a698e4ca3c74fce79ab79ab1182bf803187a06fd |
| REL-03 formula-safe Master Gardu writes | ✅ MERGED | ab6270724ee21ee4efcd6d7b2e20cdca25e8e66e |
| T-21/T-20 source hygiene | ✅ MERGED / T-20 OPEN | eeed5a52979191d277edc2fe628ee6f0448903a |
| T-16/T-17 web security boundary | ✅ MERGED / runtime work OPEN | 176e6fb45b2fc6054da5703f2c27bcce73af4e9 |
| T-19/T-32 Yandal photo durability | ✅ SOURCE MERGED / runtime work OPEN | 721542ef74e44eb0a9bdc276329801fe2dfcaeee |
| JPEG validation and photo failure contract | ✅ SOURCE MERGED / runtime work OPEN | cceebdc8e8c75541cb1b35043afd335e1c5ac7a2 |

**Overall:** Critical remediation code merged through PR #43; staging, client compatibility, production deployment, and real-device evidence remain open. **Security posture:** source remediations merged, runtime acceptance incomplete.

## PR #43: JPEG validation and photo failure contract

### Completion: ✅ Merged, runtime acceptance pending

**PR:** [#43](https://github.com/GuswanSyahludin/SiSi-ULP-Toboali/pull/43)  
**Merged commit:** `cceebdc8e8c75541cb1b35043afd335e1c5ac7a2`  
**Merged:** 30 September 2026

### Scope and contract

- Original evidence bytes are decoded before private persistence; corrupt, truncated, oversized, and non-decodable originals are rejected.
- Rendered watermark output must be a complete, decodable JPEG with size limits and SOI/EOI marker checks before Android export.
- Yandal preview structure was simplified to remove the nested-widget syntax failure that blocked Flutter analysis/build.
- Regression tests cover valid images, corrupt/non-image bytes, truncated/SOI-only data, missing EOI, checksum mismatch, cancel semantics, native failure retry, and the no-side-effect-before-validation contract.
- The PR intentionally does not change Apps Script upload transaction semantics, remote watermark-engine behavior, orphan cleanup, or native Android decoder parity.

### Automated validation

- Flutter analyze and compile: green.
- Flutter analyze and debug build: green.
- Backend syntax/security tests: green.
- Query-string rejection: green.
- Photo validator and watermark export regression tests: green.

### Runtime acceptance pending

- Validate native Android decoder behavior against the Dart decoder on a signed internal APK.
- Verify original persistence rejection on real Android devices for corrupt, truncated, oversized, and MIME-mismatch files.
- Verify watermark export cancel/failure/retry behavior with the Android MediaStore implementation.
- Audit Apps Script upload transaction semantics, progressive update failure handling, and orphan cleanup.
- Audit remote watermark-engine behavior and ensure failed processing cannot report success.

## PR #38: Android 12+ data extraction resource correction

### Completion: ✅ Merged, runtime acceptance pending

**PR:** [#38](https://github.com/GuswanSyahludin/SiSi-ULP-Toboali/pull/38)  
**Merged commit:** `a698e4ca3c74fce79ab79ab1182bf803187a06fd`  
**Merged:** 29 September 2026

- `android:dataExtractionRules` now references the correct `@xml/data_extraction_rules` resource.
- The signing/backup regression contract now asserts both legacy backup denial and Android 12+ data-extraction denial.
- All backend, Flutter, and auth-transport PR checks are green.

### Runtime acceptance pending

- Build/install the Android app on API 31+ and verify backup/restore and device-transfer denial on a real test device.
- Confirm the signing secret store and signed internal APK workflow.

## REL-03 / PR #39: Formula-safe Master Gardu writes

### Completion: ✅ Merged, runtime acceptance pending

**PR:** [#39](https://github.com/GuswanSyahludin/SiSi-ULP-Toboali/pull/39)  
**Merged commit:** `ab6270724ee21ee4efcd6d7b2e20cdca25e8e66e`  
**Merged:** 29 September 2026

### Scope and contract

- The final Apps Script overlay preflights each requested HI target cell before the first write for that sheet.
- Identity columns and configured immutable columns fail closed with `REL03_IMMUTABLE_FIELD`.
- Formula-bearing cells fail closed with `REL03_FORMULA_CELL`.
- `db_InsDu_Realisasi` recalculation updates only `jumlahTemuan` cells instead of replacing the entire data range, preserving formula columns.
- `.clasp.json` and `appsscript.json` load the REL-03 overlay after the source-hardening overlay.
- The source contract is intentionally conservative until staging supplies a sanitized `getFormulas()`/header map.

### Automated validation

- Backend syntax/security tests: green.
- Flutter analyze/compile and debug build: green.
- Query-string rejection: green.
- Source-hardening chain and REL-03 deployment-order contracts: green.

### Runtime acceptance pending

- Supply a sanitized staging formula/header map for each write target before expanding the immutable allowlist.
- Validate formula-cell and identity-field rejection in isolated staging with no side effects.
- Validate two-device concurrent Gardu edits and stale revision behavior.
- Validate multi-spreadsheet partial-failure handling and rollback expectations.

## Existing runtime-open remediations

- **T-07/H-03:** staging authorization, validation, concurrent append, retry/idempotency, client compatibility, and real-device evidence.
- **H-08:** staging migration, verified backup, cutoff/fail-closed verification, and post-cutover validation.
- **C-05/T-06:** real-device pending-edit preservation, outbox replay, retry/restart, and production sign-off.
- **H-02/T-05:** staging and real-device Master download without retry.
- **H-06/T-10:** real-device expiry, forced login, secure-storage clearing, and cleanup evidence.
- **T-08/H-04:** cross-ULP staging, same-ULP real-device read/write, duplicate-code rejection, and production sign-off.
- **T-09/H-05:** two-device conflict behavior, conflict UI, upgraded-database migration evidence, staging validation, and production sign-off.
- **T-14/T-15/T-18/T-22/T-24:** staging, deployed-runtime verification, client compatibility, and real-device evidence.
- **T-16/T-17:** strict CSP/DOM refactor and deployed-runtime verification.
- **T-19/T-32:** remote photo upload/lifecycle processing, signed APK, cache cleanup, restart recovery, and real-device evidence.
- **T-20/T-30:** full Flutter lint cleanup, offline/retry/duplicate-delivery integration coverage, and real-device evidence.
- **T-23:** external engine migration and shared cost guard redesign.
- **T-125/T-126:** concurrent account-switch isolation and removal of remaining legacy auth compatibility paths.
- **Android signing/backup:** secret-store verification, signed APK installation, API 31+ backup/data-transfer denial, and real-device evidence.

## Remaining source-code work not covered by merged PRs

- REL-03 source is merged; only formula-map expansion and runtime proof remain.
- T-16/T-17: full strict-CSP/DOM and inline-handler refactor.
- T-19/T-31/T-32/T-123/T-124: upload failure state machine, local-watermark integration, orphan cleanup, and tests.
- T-20/T-30: Flutter lint cleanup and offline/retry/duplicate-delivery integration coverage.
- T-23: external engine migration and shared cost guard redesign.
- T-125/T-126: concurrent account-switch isolation and removal of remaining legacy auth compatibility paths.
- Signing CI/release guard and repository/artifact scanning remain separate from the Android source guard.
- Kopitiam Auth tasks T-132 through T-136 and SEC-04 belong to the separate Auth repository and require separate PRs.

## Monitoring checklist

- [x] PR #25 merged with CI green.
- [x] PR #26 merged with CI green.
- [x] PR #27 merged with automated backend/security and query-string checks green.
- [x] PR #28 merged with backend, Flutter, and query-string checks green.
- [x] PR #29 merged with all CI checks green, including overlay and endpoint load-contract checks.
- [x] PR #30 merged with all CI checks green, including Flutter tests, scoped materialization regression, migration contract, and query-string rejection.
- [x] PR #32 merged with backend syntax/security, Flutter analyze/compile, query-string rejection, and T-07/T-11 contract checks green.
- [x] PR #35 merged with backend/security, query-string, Flutter analyze/compile, and Flutter debug-build checks green.
- [x] PR #36 merged with branch-protection audit tooling checks green.
- [x] PR #37 merged with backend, Flutter, and query-string checks green.
- [x] PR #38 merged with backend, Flutter, and query-string checks green.
- [x] PR #39 merged with backend, Flutter, and query-string checks green.
- [x] PR #40 merged with Flutter quality hygiene and security checks green.
- [x] PR #41 merged with web security and query-string checks green.
- [x] PR #42 merged with Yandal durability and security checks green.
- [x] PR #43 merged with photo validation, Flutter, backend, and query-string checks green.
- [x] PR #34 closed as superseded by PR #35.
- [ ] Create verified staging backup/version history before H-08 migration.
- [ ] Deploy H-06 to isolated staging only.
- [ ] Verify REL-03 formula map and formula-cell rejection in staging.
- [ ] Verify T-07 mobile ROW invalid/foreign session, formula injection, coordinate/diameter bounds, concurrent append, retry/idempotency, and client payload compatibility.
- [ ] Verify Android API 31+ backup/data-transfer denial and signed APK installation.
- [ ] Verify real-device expired/idle token behavior.
- [ ] Verify C-05 pending-edit preservation and outbox patch replay.
- [ ] Verify T-09 two-device conflict, upgraded-database migration, and conflict UI behavior.
- [ ] Verify T-08 cross-ULP staging and real-device read/write behavior.
- [ ] Verify PR #35 device throttle, webhook replay window, deployment endpoint selection, and debug hygiene in staging/real devices.
- [ ] Verify PR #43 native decoder parity, Android export cancellation/failure/retry, upload transaction failure handling, orphan cleanup, and remote watermark failure semantics.
- [ ] Update runbook after staging evidence.

## Kesimpulan

PR #43 is merged and all automated checks are green. Source-level JPEG validation and export failure contracts are now covered, but staging formula mapping, deployed-runtime verification, upload transaction semantics, concurrent append/retry, client compatibility, signed Android validation, real-device testing, production deployment, and production sign-off remain pending.
