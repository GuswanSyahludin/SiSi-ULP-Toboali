# T-04: Guard Enforcement for Top-Level Functions

**Status:** Implementation Plan
**Created:** 27 September 2026
**Target Merge:** PR #10
**Files:** 2 (Jadwal-Padam-Code.js, Tek-LapUP3UIWHarian.js)
**Functions:** 16 (8 GET, 8 WRITE)

---

## Executive Summary

All 16 top-level functions in Jadwal-Padam-Code.js and Tek-LapUP3UIWHarian.js currently execute without guard enforcement. This allows anonymous callers to:
- Read sensitive Jadwal Padam data (master, calendar, list, beban) across all ULP
- Read daily reports (UP3, Wilayah) for any ULP without authentication
- Create/update/refresh reports without proper auth + ULP scoping
- Access team completion status and operational data

**Risk Level:** 🔴 KRITIS (FR-01, FR-05 violations)

---

## Affected Functions

### Jadwal-Padam-Code.js (8 functions)

#### GET Functions (Anonymous Access)

1. **`getJadwalPadamMaster(params)`**
   - Line: ~250
   - Returns: Master daerah padam records
   - Current auth: None (params.ulp filtering only)
   - Fix: Add `guard_(arguments, { ulp: true, aksi: "getJadwalPadamMaster" })` as first statement

2. **`getJadwalPadamCalendarMonth(params)`**
   - Line: ~285
   - Returns: Calendar view per ULP, month with cache (CacheService)
   - Current auth: None
   - Fix: Add guard before try block

3. **`getJadwalPadamList(params)`**
   - Line: ~360
   - Returns: Paginated list (default 50 rows/page)
   - Current auth: None
   - Fix: Add guard before param parsing

4. **`getJadwalPadamMasterBeban(params)`**
   - Line: ~470
   - Returns: Beban (load power) data per penyulang
   - Current auth: None
   - Fix: Add guard as first statement

#### WRITE Functions (getSesiByToken only, no guard_)

5. **`simpanJadwalPadam(payload)`**
   - Line: ~495
   - Action: Append new schedule row
   - Current auth: `getSesiByToken(payload.token)` (manual, not guard_)
   - Fix: Replace with guard_() call
   - Impact: Guard validates token + enforces ULP scoping

6. **`updateJadwalPadam(payload)`**
   - Line: ~570
   - Action: Update existing schedule by kode
   - Current auth: Same manual pattern
   - Fix: Add guard_(arguments, { ulp: true, aksi: "updateJadwalPadam" })

7. **`updateStatusJadwalPadam(payload)`**
   - Line: ~670
   - Action: Update status field only
   - Current auth: Manual getSesiByToken
   - Fix: Add guard enforcement

8. **`getJadwalPadamWaText(params)`**
   - Line: ~720
   - Returns: WhatsApp text report (date range + ULP filter)
   - Current auth: Manual getSesiByToken (better than GET functions, but not guard_)
   - Fix: Add guard_(arguments, { ulp: true, aksi: "getJadwalPadamWaText" })

### Tek-LapUP3UIWHarian.js (8 functions)

#### GET Functions (Anonymous Access)

9. **`getLaporanUP3(params)`**
   - Line: ~1550
   - Returns: Laporan Harian Keandalan (UP3 format)
   - Current auth: None
   - Fix: Add guard_(arguments, { ulp: true, aksi: "getLaporanUP3" })

10. **`getLaporanWilayah(params)`**
    - Line: ~1700
    - Returns: Laporan Wilayah (regional report)
    - Current auth: None
    - Fix: Add guard enforcement

11. **`getMobileLaporanUp3Uiw(params)`**
    - Line: ~2050
    - Returns: Mobile view + cache + team status
    - Current auth: None
    - Exposure: Reveals team completion status (`statusTim`)
    - Fix: Add guard_(arguments, { ulp: true, aksi: "getMobileLaporanUp3Uiw" })

12. **`getLaporanHarianRow(params)`**
    - Line: ~2010
    - Returns: Single day row (C4A + text) with fallback to ARSIP
    - Current auth: None (fallback read from ARSIP is read-only but still exposed)
    - Fix: Add guard even for read-only fallback path

#### WRITE Functions

13. **`ensureLaporanHarianHariIni()`**
    - Line: ~1950
    - Action: Creates today's row + generate UP3 + UIW
    - Current auth: **NONE** — any caller can trigger
    - Fix: Add guard_(arguments, { ulp: true, aksi: "ensureLaporanHarianHariIni" })

14. **`simpanLaporanHarianWeb(params)`**
    - Line: ~1960
    - Action: Writes C4A (Penyulang, Realisasi, Temuan, Eksekusi columns) + regenerate
    - Current auth: **NONE** — no token check at all
    - Fix: Add guard_(arguments, { ulp: true, aksi: "simpanLaporanHarianWeb" })
    - Impact: Prevents any anonymous write

15. **`refreshLaporanHarian(params)`**
    - Line: ~2030
    - Action: Regenerates UP3 + UIW text for any date
    - Current auth: **NONE**
    - Fix: Add guard_(arguments, { ulp: true, aksi: "refreshLaporanHarian" })

16. **`simpanMobileLaporanC4A(params)`**
    - Line: ~2070
    - Action: Writes C4A from mobile + regenerate
    - Current auth: Partial — `getSesiByToken(payload.token)` but not guard_
    - Fix: Replace manual check with guard_(arguments, { ulp: true, aksi: "simpanMobileLaporanC4A" })

---

## Implementation Details

### Guard Pattern

Each function adds as **first statement** (before any logic):

```javascript
guard_(arguments, { ulp: true, aksi: "functionName" });
```

Guard.js (already deployed in PR #8/Phase 1) provides:
- **ulp: true** → Extract & validate ULP from sesi; reject if sesi invalid/missing
- **aksi: "functionName"** → Log action for audit trail
- Return value: `g` object with `.ulp`, `.kodeUlp`, `.sesi` for downstream code

### Backward Compatibility

- No change to function signatures or return values
- Guard rejects anonymous access silently (throws error caught by Apps Script)
- Existing authenticated callers (web forms, AppSheet, mobile) unaffected
- Manual `getSesiByToken()` calls become redundant but safe (guard already validated)

### Testing Strategy

Post-merge (Phase 3):
1. Staging: Call each function without token → verify rejection
2. Staging: Call with valid ULP A token → verify data isolated to ULP A
3. Staging: Call with ULP B token → verify no data leakage
4. Production: Monitor for 401/auth errors in deployment logs
5. Rollback plan: Revert commit if critical path broken (unlikely — Guard.js tested in Phase 1-2)

---

## Code Changes Summary

### Jadwal-Padam-Code.js
- 8 insertions: `guard_` call added to lines ~250, ~287, ~362, ~473, ~498, ~573, ~673, ~723
- No logic changes
- No new imports
- File: ~28 KB → ~28.2 KB (negligible)

### Tek-LapUP3UIWHarian.js
- 8 insertions: `guard_` call added to lines ~1552, ~1702, ~1952, ~1963, ~2012, ~2033, ~2052, ~2073
- No logic changes
- No new imports
- File: ~57 KB → ~57.4 KB (negligible)

### Total Impact
- **Lines changed:** 16 insertions
- **Files modified:** 2
- **Complexity:** Low (copy-paste guard calls)
- **Risk:** Minimal (Guard.js already proven in Phase 1-2)

---

## Documentation

- Guard function signature: See `Core/Guard.js` header (rows 1-100)
- Guard examples: `Delta-Sync-Mobile.js` PR #8-9 implementation
- Error handling: Guard throws `Error("Sesi habis.")` or similar; Apps Script logs + returns error JSON

---

## Acceptance Criteria

✅ All 16 functions start with guard_ call  
✅ No function executes guard-sensitive code without guard protection  
✅ No new errors in unit tests (if any)  
✅ No change in return schemas or function signatures  
✅ Documentation updated (this file + SECURITY-AUDIT-STATUS.md)  
✅ PR passes all CI gates (static, syntax, security)  
✅ Staging QA confirms auth rejection + ULP isolation  

---

## Deployment Notes

- Deploy to staging first; monitor logs for 24 hours
- Production deployment: Off-peak hours (after 19:00 Jakarta time)
- Rollback: Revert commit if critical web/mobile path breaks
- Communication: Notify web/mobile teams of stricter auth enforcement
