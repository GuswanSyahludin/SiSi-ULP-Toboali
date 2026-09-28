# SiSi ULP Toboali: Audit dan Status Remediasi

_Terakhir diperbarui: 28 September 2026 23:40 WIB · H-06 COMPLETE in PR #26; production deployment and real-device validation remain pending_

File ini adalah **satu-satunya** tempat mencatat temuan audit, status perbaikan, dan task remediasi SiSi.

---

## Status Ringkas

| Task | Deskripsi | Status | Commits |
|------|-----------|--------|---------|
| T-01 | C-03: Token removal dari URL web | ✅ MERGED | bbea500 |
| T-02 | H-01: Query string token rejection | ✅ MERGED | 38279b2 |
| T-03 | C-02 Phase 1-2: Delta sync ULP scoping | ✅ MERGED | e79b2fc, 2c966e1 |
| T-04 | C-04: Guard enforcement top-level (16 functions) | ✅ MERGED | d76ce5c, 855e276, 18e3df7 |
| C-01 | Master Gardu edit regression | ✅ MERGED | 35806d2 |
| H-02/T-05 | Master sync timeout, dispatch hardening, batch snapshots | ✅ MERGED | 6c29b7c |
| H-07 | Watermark foto guard enforcement | ✅ MERGED | 88eb6a0 |
| **H-06/T-10** | **Device-token absolute/idle expiry and scheduled cleanup** | **✅ MERGED** | **d59c4f3** |
| H-08 | Password plaintext tanpa time limit | 🔴 OPEN | — |
| C-05 | Materialisasi data deletion | 🟡 OPEN | — |

**Overall:** Critical remediation code merged; staging, production deployment, and real-device evidence remain open.  
**Security Posture:** 🟡 Remediations merged, runtime acceptance incomplete

---

## H-06/T-10: Device-token lifetime enforcement

### Completion: ✅ Merged, runtime validation pending

**PR:** [#26](https://github.com/GuswanSyahludin/SiSi-ULP-Toboali/pull/26)  
**Merged commit:** `d59c4f3f5695ac7e8838b4aa475826203adeeef3`  
**Merged:** 28 September 2026

### Contract

- Absolute TTL: **30 days** from `loginPerangkat` issuance.
- Idle TTL: **7 days** from `lastSeenAt`.
- If either limit is exceeded, `cekPerangkat` deletes the device-token record and returns `DEVICE_TOKEN_EXPIRED`.
- The client clears secure session state and forces `loginPerangkat()` again.
- No automatic token rotation occurs after expiry.
- Daily cleanup runs through `harianPusatSiSi`.

### Implementation

- New deterministic TTL compatibility layer stores `expiresAt`, `lastSeenAt`, and legacy-compatible `terakhirDipakai`.
- Legacy records derive their absolute expiry from `dibuatPada`; records without usable issuance metadata fail closed.
- Cleanup removes expired or idle records.
- Flutter clears secure credentials when backend returns an expired, revoked, missing-account, changed-password, or missing-token code.
- Regression coverage includes issuance metadata, absolute expiry, idle expiry, cleanup, and forced re-login behavior.

### Acceptance still pending

- Deploy to isolated staging only.
- Validate expiry and forced login on real Android/iOS devices.
- Confirm secure-storage/session clearing after `DEVICE_TOKEN_EXPIRED`.
- Verify scheduled daily cleanup is installed and observed in Apps Script logs.
- Do not call production-ready for H-06 until those evidence items exist.

---

## H-07: Watermark Foto Public Access - Guard Enforcement

### Completion: ✅ 4 Guard Enforcement Points (100%)

**Merged:** 27 September 2026  
**Commit:** 88eb6a0

Watermark creation, URL normalization, sized URL rendering, and ROW URL normalization are guarded with session and ULP checks. Drive sharing remains compatible with AppSheet rendering; endpoint access is fail-closed.

---

## Cumulative Security Coverage

- ✅ 16 top-level functions guarded (T-04).
- ✅ 4 foto access points guarded (H-07).
- ✅ Token exposure remediated (T-01/T-02).
- ✅ Delta sync ULP-scoped (T-03).
- ✅ Master sync batching, recursion prevention, and deterministic load order merged (T-05).
- ✅ Device-token absolute/idle expiry and cleanup merged (H-06).
- ⏳ Password plaintext cutover remains open (H-08).
- ⏳ Staging and real-device evidence remains open for T-05/H-06.

---

## Remaining Open Items

1. 🔴 **H-08**: Password plaintext without time limit; complete migration deadline and reject plaintext.
2. 🟡 **C-05**: Materialisasi data deletion.
3. 🟡 **H-02/T-05 QA**: Staging and real-device Master download without retry.
4. 🟡 **H-06 QA**: Real-device expiry, forced login, secure-storage clearing, and scheduled cleanup evidence.

---

## Monitoring Checklist

- [x] PR #25 merged with CI green.
- [x] PR #26 merged with CI green.
- [ ] Deploy H-06 to isolated staging only.
- [ ] Observe daily cleanup trigger in Apps Script logs.
- [ ] Verify real-device expired/idle token behavior.
- [ ] Update runbook after staging evidence.

---

## Kesimpulan

H-06 code remediation is merged and covered by automated tests. It is **not yet production-deployed** and is not closed operationally until staging and real-device evidence confirms expired tokens are rejected and users are forced through fresh device login.
