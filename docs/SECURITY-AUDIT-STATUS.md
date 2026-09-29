# SiSi ULP Toboali: Audit dan Status Remediasi

_Terakhir diperbarui: 29 September 2026 08:20 WIB · T-08/H-04 MERGED in PR #29; cross-ULP staging, real-device acceptance, and production sign-off remain pending_

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

**Overall:** Critical remediation code merged; staging, production deployment, and real-device evidence remain open. **Security posture:** remediations merged, runtime acceptance incomplete.

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

- ✅ Top-level guards, ULP scoping, token transport rejection, device expiry, password cutoff, Master Gardu materialization safety, and Jadwal Padam ownership enforcement are merged.
- ✅ T-08 covers all nine Jadwal Padam endpoint boundaries listed above and the mobile router dependency chain.
- ⏳ Runtime staging and real-device evidence remains open for H-08, C-05, T-05, H-06, and T-08.

## Remaining open items

1. 🟡 H-08 staging migration, verified backup, cutoff/fail-closed verification, and post-cutover validation.
2. 🟡 C-05 real-device pending-edit preservation, outbox replay, retry/restart, and production sign-off.
3. 🟡 H-02/T-05 staging and real-device Master download without retry.
4. 🟡 H-06 real-device expiry, forced login, secure-storage clearing, and cleanup evidence.
5. 🟡 T-08 cross-ULP staging, same-ULP real-device read/write, duplicate-code rejection, and production sign-off.

## Monitoring checklist

- [x] PR #25 merged with CI green.
- [x] PR #26 merged with CI green.
- [x] PR #27 merged with automated backend/security and query-string checks green.
- [x] PR #28 merged with backend, Flutter, and query-string checks green.
- [x] PR #29 merged with all CI checks green, including overlay and endpoint load-contract checks.
- [ ] Create verified staging backup/version history before H-08 migration.
- [ ] Deploy H-06 to isolated staging only.
- [ ] Verify real-device expired/idle token behavior.
- [ ] Verify C-05 pending-edit preservation and outbox patch replay.
- [ ] Verify T-08 cross-ULP staging and real-device read/write behavior.
- [ ] Update runbook after staging evidence.

## Kesimpulan

T-08/H-04 code remediation is merged and all automated checks are green. Cross-ULP staging, real-device acceptance, production deployment, and production sign-off remain pending; T-08 is not production-ready. Other merged remediations remain operationally open until their documented runtime evidence is recorded.
