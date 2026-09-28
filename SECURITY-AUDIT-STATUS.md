# SiSi Security Audit Status

**Last Updated:** 2026-09-28 11:45 AM (Asia/Jakarta)
**Audit Period:** September 2026 (PLN ULP Toboali)
**Total Findings:** 86 security & operational issues
**Phase 1 Status:** IN PROGRESS (9/9 blocking issues identified, T-00/T-03/T-04 merged)

---

## Phase 1: Critical Blocking (This Week)
Must complete before any production deployment.

### T-00: Master Gardu Edit Upload Fix (C-01)
- **Status:** ✅ MERGED (PR #4, commit ed61a0e)
- **Date Merged:** 2026-09-27
- **Fix:** Route mode=update to updateMasterGarduMobile endpoint instead of download gateway

### T-03: ULP Scoping Delta Sync (C-02)
- **Status:** ✅ MERGED (PR #19, commit e032569)
- **Date Merged:** 2026-09-28
- **Fix:** Guard enforcement, per-row ULP filtering, and db_Users field restriction

### T-04: Guard Functions (C-04)
- **Status:** ✅ MERGED (PRs #20, #21, #22, #23, #24)
- **Latest commits:** `23d65bbd3fb48bf27c4ac0cd6ab76a8ee69a7b03`, `24293af58f6b7f5e451b320581b6507f7bed7353`, `9c1746e14b82a6aca631303a2f3880d198cf3dd5`
- **Date Merged:** 2026-09-28
- **Fixes Applied:**
  - Guarded PDF `doGet`, webhook `doPost`, mobile dropdown, and ROW write entry points.
  - Guarded UP3/Wilayah/daily report, mobile report, SIE/GASPOL, monitoring, and CheckPoint endpoints.
  - Forced non-Super requests to the authenticated session ULP, including ROW report ownership resolved via `Kode Header`.
  - Bound monitoring username to the authenticated session and preserved nested report/GASPOL auth context.
  - Corrected Apps Script module load order to match the repository structure.
  - Fixed photo helper/trigger context: pure URL formatters no longer reject internal calls, while scheduled normalization uses `guardInternal_`.
  - Kept incomplete `Code-Mobile.js` out of load order until its `updateMobileEksekusiRow` stub is reconciled with `Code.js`.
- **Testing:** Diff audits passed; JavaScript syntax smoke checks passed; CI and staging validation remain pending.
- **Impact:** Covered direct calls fail closed before unauthorized data access or writes; internal watermark and scheduled photo normalization flows continue to work.

### T-05: Master Data Download Timeout (H-02)
- **Status:** ⏳ PENDING
- **Approach:** Profile snapshotCreate, split/paginate Master_Gardu, optimize db_Users sanitization

---

## Phase 1 Deployment Gate

**Blocked Until:**
1. ✅ T-00 merge
2. ✅ T-03 merge
3. ✅ T-04 merge, diff and syntax audits passed
4. ⏳ CI completion for the merged changes
5. ⏳ T-05 complete + staging QA pass
6. ⏳ Staging validation on real Android/iOS devices and backend staging
7. ⏳ Production rollout plan agreed

**No production deployment has been performed.**

---

## Phase 2: Urgent (Weeks 1-2)
- H-03: Concurrency race fix for simpanMobileEksekusiRow
- H-06: Device token TTL/expiry + refresh rotation
- H-07: Watermark photo public access fix
- H-08: Password plaintext-to-hash migration with deadline
- T-01: Remove session token from URL query string
- H-04, H-05, L-*: Remaining operational and validation findings

---

## Key Audit Findings Breakdown

| Category | Count | Status | Notes |
|----------|-------|--------|-------|
| **Critical (C-*)** | 4 | T-00/T-03/T-04 merged, T-05 pending | Blocks production |
| **High (H-*)** | 8 | 0 done | ULP/auth, token handling, workflows |
| **Low (L-*)** | ~15 | 0 done | Documentation, testing, monitoring |
| **Validation (V-*)** | ~20 | 0 done | Feature validation, edge cases |
| **Operational (T-*)** | ~25 | 0 done | Performance, robustness |

---

## Deployment Timeline

- 2026-09-27: PR #4 merged (T-00)
- 2026-09-27: PR #8 merged (T-03 Phase 1)
- 2026-09-27: PRs #10-17 merged (earlier guard and operational fixes)
- 2026-09-28 10:30 AM: PR #19 merged (T-03 Phase 2)
- 2026-09-28 11:20 AM: PR #20 merged (T-04 core entry points)
- 2026-09-28 11:30 AM: PR #21 merged (T-04 report endpoints)
- 2026-09-28 11:40 AM: PR #22 merged (T-04 SIE/Checkpoint endpoints)
- 2026-09-28 11:42 AM: PR #23 merged (T-04 ROW report ULP ownership)
- 2026-09-28 11:44 AM: PR #24 merged (T-04 photo helper/trigger context)

**Next:** Complete CI verification, fix/profile T-05, then run staging validation. Deploy only after all gates pass.

---

## Notes

- All Phase 1 fixes must be tested together before production.
- No incremental production deployment.
- Rollback: revert main to the pre-Phase-1 commit if a critical issue is found.
- Phase 2+ may be deployed incrementally after Phase 1 stabilizes.
