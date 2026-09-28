# SiSi Security Audit Status

**Last Updated:** 2026-09-28 10:30 AM (Asia/Jakarta)
**Audit Period:** September 2026 (PLN ULP Toboali)
**Total Findings:** 86 security & operational issues
**Phase 1 Status:** IN PROGRESS (9/9 blocking issues identified, 3/3 merged)

---

## Phase 1: Critical Blocking (This Week)
Must complete before any production deployment.

### T-00: Master Gardu Edit Upload Fix (C-01)
- **Status:** ✅ MERGED (PR #4, commit ed61a0e)
- **Date Merged:** 2026-09-27
- **Finding:** Silent data loss on gardu edit uploads; downloads route intercepted mode=update requests
- **Fix:** Route mode=update to updateMasterGarduMobile endpoint instead of download gateway
- **Impact:** Prevents accidental data loss during simultaneous edit/download operations
- **Next:** Deploy to production

---

### T-03: ULP Scoping Delta Sync (C-02)
- **Status:** ✅ MERGED (PR #19, commit e032569)
- **Date Merged:** 2026-09-28 10:30 AM
- **Finding:** Delta sync endpoints exposed cross-ULP operational data; db_Users leaked across organizations
- **Scope:** Master_Gardu, db_ROW_Realisasi, db_Hartek_*, db_Yandal_*, db_INS_Temuan, etc.
- **Fixes Applied:**
  1. **Phase 1 (merged PR #8):** Guard enforcement in _deltaSnapshotOpen_, _deltaManifest_, _deltaFetch_, _deltaSnapshotCreate_
  2. **Phase 2 (merged PR #19):** Per-row ULP filtering + db_Users field restriction
- **Implementation:**
  - Added `ulpCol: 2` config mapping for all operational datasets (ULP in column C)
  - _deltaRows_ filters using `barisUlpCocok_(g, ulpValue)` before manifest/fetch/snapshot
  - db_Users restricted to [ID, username] only; removed email, role, ULP, team, menu-access
  - Master_Gardu scoped via getMasterGarduMobile(ulp)
- **Impact:** Users from ULP_A cannot fetch operational data from ULP_B via delta sync
- **Testing:** Regression tests added (barisUlpCocok_ boundary validation)
- **Next:** Staging validation on real master data before Phase 1 deployment

---

### T-04: Guard Functions (C-04)
- **Status:** ⏳ PENDING (architecture ready from T-03)
- **Finding:** Top-level Apps Script functions (Code.js, Jadwal-Padam-Code.js, Tek-LaporanHarianSheet.js) lack guard_ enforcement
- **Scope:** ~15-20 public functions
- **Approach:** Add `guard_({ulp: true, aksi: "functionName"})` calls at entry of each function
- **Parallel Track:** Can start after T-03 merges
- **Est. Effort:** 2-4 hours implementation + 2 hours testing

---

### T-05: Master Data Download Timeout (H-02)
- **Status:** ⏳ PENDING
- **Finding:** Large Master Data downloads timeout (~5-10 min ops, 15 min+ network latency)
- **Approach:** 
  1. Profile snapshotCreate execution time
  2. Split Master_Gardu per ULP or paginate chunks
  3. Debug db_Users sanitization performance
- **Parallel Track:** Can debug while T-04 progresses
- **Est. Effort:** 2-3 hours profiling + 2-3 hours fix + 4-6 hours QA

---

## Phase 1 Deployment Gate

**Blocked Until:**
1. ✅ T-00 merge (done)
2. ✅ T-03 merge (done)
3. ⏳ T-04 complete + test pass
4. ⏳ T-05 complete + staging QA pass
5. ⏳ Staging validation on real data (Android/iOS real devices + backend staging)
6. ⏳ Production rollout plan agreed

**Estimated Phase 1 Completion:** Wed 2026-10-01 (2-3 days)

---

## Phase 2: Urgent (Weeks 1-2)
14 findings affecting operational workflows but not blocking security

- H-03: Concurrency race fix for simpanMobileEksekusiRow
- H-06: Device token TTL/expiry + refresh rotation
- H-07: Watermark photo public access fix (makePublic: false)
- H-08: Password plaintext-to-hash migration with deadline
- T-01: Remove session token from URL query string
- H-04, H-05, L-*: Remaining operational/validation findings

---

## Phase 3: Important (Weeks 2-3)
20+ findings on operational hardening, audit logs, monitoring

---

## Phase 4: Polish & Validation (Weeks 3-4)
~30 findings on documentation, testing, process improvements

---

## Key Audit Findings Breakdown

| Category | Count | Status | Notes |
|----------|-------|--------|-------|
| **Critical (C-*)** | 4 | 1 done (T-00), 1 merged (T-03), 2 pending (T-04, T-05) | Blocks production |
| **High (H-*)** | 8 | 0 done | ULP/auth, token handling, workflows |
| **Low (L-*)** | ~15 | 0 done | Documentation, testing, monitoring |
| **Validation (V-*)** | ~20 | 0 done | Feature validation, edge cases |
| **Operational (T-*)** | ~25 | 0 done | Performance, robustness |

---

## Deployment Timeline

**Actual Progress:**
- 2026-09-27: PR #4 merged (T-00 Master Gardu fix)
- 2026-09-27: PR #8 merged (T-03 Phase 1 guard enforcement)
- 2026-09-27: PRs #10-17 merged (T-04 guard functions, Dashboard delete fix, H-07 watermark guard, mobile error UI)
- **2026-09-28: PR #19 merged (T-03 Phase 2 ULP filtering)** ← YOU ARE HERE

**Next (Est. 2026-09-28 to 2026-10-01):**
- Complete T-04 guard enforcement for remaining functions
- Debug T-05 download timeout root cause + fix
- Staging validation: real devices + backend data
- Phase 1 production deployment (Thu-Fri)

---

## Notes

- All fixes marked for Phase 1 must be tested together before production
- No incremental deployment: Phase 1 deploys as one unit
- Rollback plan: revert main to commit before Phase 1 start (if critical issues found)
- Phase 2+ can be deployed incrementally after Phase 1 stabilizes
