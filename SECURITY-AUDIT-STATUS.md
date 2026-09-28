# SiSi Security Audit Status

**Last Updated:** 2026-09-28 11:40 AM (Asia/Jakarta)
**Audit Period:** September 2026 (PLN ULP Toboali)
**Total Findings:** 86 security & operational issues
**Phase 1 Status:** IN PROGRESS (9/9 blocking issues identified, T-00/T-03/T-04 merged)

---

## Phase 1: Critical Blocking (This Week)
Must complete before any production deployment.

### T-00: Master Gardu Edit Upload Fix (C-01)
- **Status:** ✅ MERGED (PR #4, commit ed61a0e)
- **Date Merged:** 2026-09-27
- **Finding:** Silent data loss on gardu edit uploads; downloads route intercepted mode=update requests
- **Fix:** Route mode=update to updateMasterGarduMobile endpoint instead of download gateway
- **Impact:** Prevents accidental data loss during simultaneous edit/download operations
- **Next:** Deploy as part of Phase 1 release

---

### T-03: ULP Scoping Delta Sync (C-02)
- **Status:** ✅ MERGED (PR #19, commit e032569)
- **Date Merged:** 2026-09-28 10:30 AM
- **Finding:** Delta sync endpoints exposed cross-ULP operational data; db_Users leaked across organizations
- **Fix:** Guard enforcement, per-row ULP filtering, and db_Users field restriction
- **Impact:** Users from ULP_A cannot fetch operational data from ULP_B via delta sync
- **Testing:** Regression tests added for ULP boundary validation

---

### T-04: Guard Functions (C-04)
- **Status:** ✅ MERGED (PR #20, #21, #22; latest squash commit 23d65bbd3fb48bf27c4ac0cd6ab76a8ee69a7b03)
- **Date Merged:** 2026-09-28
- **Finding:** Top-level Apps Script functions could be called directly through `google.script.run`, bypassing router-only authorization
- **Fixes Applied:**
  - Guarded PDF `doGet`, webhook `doPost`, mobile dropdown, and ROW write entry points
  - Guarded UP3/Wilayah/daily report and mobile report endpoints
  - Guarded SIE/GASPOL, monitoring temuan, and all Data Pendukung CheckPoint endpoints
  - Forced non-Super requests to the authenticated session ULP; payload ULP cannot override scope
  - Bound monitoring username to the authenticated session and preserved token context for nested report/GASPOL calls
  - Corrected `appsscript.json` load order to match the actual `Teknik/` repository structure
  - Kept incomplete `Code-Mobile.js` out of the load order until its `updateMobileEksekusiRow` stub is reconciled with the complete implementation in `Code.js`
- **Testing:** Diff audits passed; JavaScript syntax smoke checks passed; CI and staging validation remain pending
- **Impact:** Covered direct calls fail closed before unauthorized data access or writes

---

### T-05: Master Data Download Timeout (H-02)
- **Status:** ⏳ PENDING
- **Finding:** Large Master Data downloads timeout (~5-10 min ops, 15 min+ network latency)
- **Approach:** Profile snapshotCreate, split/paginate Master_Gardu, optimize db_Users sanitization
- **Est. Effort:** 2-3 hours profiling + 2-3 hours fix + 4-6 hours QA

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

**Next:** Complete CI verification, fix/profile T-05, then run staging validation. Deploy only after all gates pass.

---

## Notes

- All Phase 1 fixes must be tested together before production.
- No incremental production deployment.
- Rollback: revert main to the pre-Phase-1 commit if a critical issue is found.
- Phase 2+ may be deployed incrementally after Phase 1 stabilizes.
