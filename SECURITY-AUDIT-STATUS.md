# SiSi Security Audit Status

**Last Updated:** 2026-09-28 11:22 AM (Asia/Jakarta)
**Audit Period:** September 2026 (PLN ULP Toboali)
**Total Findings:** 86 security & operational issues
**Phase 1 Status:** IN PROGRESS (9/9 blocking issues identified, 4/4 merged)

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
- **Status:** ✅ MERGED (PR #20, squash commit baccc9793b7af5ba1ef4f5bf1c7b830d8c3203b5)
- **Date Merged:** 2026-09-28 11:20 AM
- **Finding:** Top-level Apps Script functions could be called directly through `google.script.run`, bypassing router-only authorization
- **Fixes Applied:**
  - Guarded PDF download entry through `doGet` with authenticated ULP scope
  - Enforced webhook JSON and secret validation before `doPost` reaches the existing handler; mobile POST routing remains unchanged
  - Guarded `getMobileDropdownRow` as an authenticated shared-resource read
  - Guarded `simpanMobileEksekusiRow` with session ULP enforcement
  - Added `Code-Session.js` and `Code-Admin.js` to the Apps Script load order
  - Kept incomplete `Code-Mobile.js` out of load order until its `updateMobileEksekusiRow` stub is reconciled with the complete implementation in `Code.js`
- **Impact:** Direct calls to the covered entry points fail closed before data access or writes
- **Testing:** Diff audit passed; CI status was still pending at merge and must complete before deployment
- **Next:** Complete CI, staging validation, then reconcile the mobile module before a production release

---

### T-05: Master Data Download Timeout (H-02)
- **Status:** ⏳ PENDING
- **Finding:** Large Master Data downloads timeout (~5-10 min ops, 15 min+ network latency)
- **Approach:**
  1. Profile snapshotCreate execution time
  2. Split Master_Gardu per ULP or paginate chunks
  3. Debug db_Users sanitization performance
- **Parallel Track:** Can debug while staging validation progresses
- **Est. Effort:** 2-3 hours profiling + 2-3 hours fix + 4-6 hours QA

---

## Phase 1 Deployment Gate

**Blocked Until:**
1. ✅ T-00 merge (done)
2. ✅ T-03 merge (done)
3. ✅ T-04 merge (done; CI and staging validation pending)
4. ⏳ T-05 complete + staging QA pass
5. ⏳ Staging validation on real data (Android/iOS real devices + backend staging)
6. ⏳ Production rollout plan agreed

**Estimated Phase 1 Completion:** Wed 2026-10-01, subject to T-05 and staging results

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
| **Critical (C-*)** | 4 | 2 done (T-00, T-03), 1 merged (T-04), 1 pending (T-05) | Blocks production |
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
- 2026-09-28 10:30 AM: PR #19 merged (T-03 Phase 2 ULP filtering)
- **2026-09-28 11:20 AM: PR #20 merged (T-04 guarded entry points and webhook enforcement)**

**Next (2026-09-28 to 2026-10-01):**
- Complete CI verification for PR #20
- Debug T-05 download timeout root cause + fix
- Staging validation: real devices + backend data
- Phase 1 production deployment, only after all gates pass

---

## Notes

- All fixes marked for Phase 1 must be tested together before production
- No incremental deployment: Phase 1 deploys as one unit
- Rollback plan: revert main to commit before Phase 1 start (if critical issues found)
- Phase 2+ can be deployed incrementally after Phase 1 stabilizes
