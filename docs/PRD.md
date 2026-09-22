# Product Requirements Document

## SiSi ULP Toboali

**Document status:** Living product and engineering specification  
**Repository:** `SyahludinGuswan/Sisi-ULP-Toboali`  
**Primary operating scope:** Internal ULP Toboali operations  
**Last updated:** 22 September 2026

---

## 1. Executive summary

SiSi ULP Toboali is an internal operational platform for recording, reviewing, synchronizing, and reporting electrical distribution work for ULP Toboali. The product combines a Google Apps Script backend, Google Sheets and Drive data sources, a web interface, and a Flutter mobile application.

The platform is designed around three principles:

1. **Operational speed:** field teams can record work, photos, inspections, approvals, and corrections from mobile devices.
2. **Traceable data:** source rows, identifiers, photos, approvals, generated documents, and audit events remain linked.
3. **Fail-closed access:** authenticated users may access only data within their authorized ULP scope. Missing, foreign, blank, ambiguous, or unresolved ownership must be rejected before side effects.

This PRD is the product-level source of truth. Security-specific implementation details and remediation history remain in [`docs/SECURITY-AUDIT-STATUS.md`](./SECURITY-AUDIT-STATUS.md).

---

## 2. Product goals

### 2.1 Goals

- Provide one internal workflow for ULP Toboali field and office operations.
- Support web and mobile access using the same backend data and authorization rules.
- Capture field records with dates, teams, locations, work types, photos, and responsible users.
- Generate and manage Berita Acara (BA) documents and related files.
- Support approval and correction workflows for P0/Yandal work.
- Keep synchronization durable when the mobile device is offline or connectivity is unreliable.
- Protect data across ULP boundaries and prevent IDOR-style access through guessed identifiers.
- Preserve operational history during corrections, retries, and synchronization failures.

### 2.2 Non-goals

- This system is not a general-purpose public portal.
- It is not a cross-ULP reporting system for operational users.
- It does not replace Google Sheets or Drive as the current underlying storage layer.
- It does not authorize access merely because a caller knows an `idBA`, file ID, code, or URL.
- It does not use `idBA` as an ownership value. `idBA` is only a row lookup key; ownership must be resolved from the source row and authorization context.

---

## 3. Users and roles

### 3.1 Operational users

- **Field staff / Petugas:** submit inspections, field work, photos, ROW execution progress, and other assigned records within their ULP and team scope.
- **Team leads and reviewers:** review records, verify evidence, approve or reject work, and provide rejection reasons.
- **Administrative users:** manage operational data and account configuration within the permitted administrative scope.
- **Super User:** performs controlled administrative actions. Super User status does not automatically permit cross-ULP operational BA access.

### 3.2 System actors

- **Flutter mobile client:** field data entry, local persistence, outbox synchronization, approvals, corrections, and photo workflows.
- **Web client:** dashboards, BA listing, BA detail, document generation, file download, and administrative pages.
- **AppSheet/webhook integrations:** invoke explicitly supported backend actions using the required webhook verification path.
- **Scheduled workers/triggers:** process durable queues, recalculation jobs, watermark/photo jobs, and other approved internal work.

### 3.3 Authorization rules

- A valid session is required for protected endpoints.
- The session must resolve to a non-blank ULP.
- Operational data is scoped to the caller's ULP. SISI is internal to ULP Toboali.
- Foreign, blank, unresolved, or ambiguous ownership fails closed.
- Public routes must not be hidden by placing them in an audit ignore list.
- Internal helper exceptions must be explicit, short, and separately reviewed.

---

## 4. Product surfaces

### 4.1 Backend

The backend runs as Google Apps Script and exposes:

- session and account operations;
- page loading and menu access checks;
- BA listing, PDF generation, final upload, Master synchronization, and downloads;
- mobile APIs for inspections, reports, ROW, P0/Yandal, approvals, and synchronization;
- webhook actions for approved AppSheet integrations;
- scheduled queue processing and recalculation workers;
- audit and security gate tooling.

The backend uses Google Sheets as the operational data layer and Google Drive for uploaded photos and BA-linked files. Late-loaded compatibility wrappers protect existing routes without replacing the full runtime behavior of the original security guard.

### 4.2 Web application

The web application provides authenticated pages including:

- main navigation and role-based menus;
- technical dashboards;
- inspection and findings pages;
- ROW and outage-related pages;
- Berita Acara listing and detail pages;
- PDF generation and BA file download actions;
- account and access administration for authorized administrators.

### 4.3 Flutter mobile application

The mobile application supports:

- login and session use;
- offline-first local storage;
- durable outbox synchronization;
- daily reports and inspection records;
- ROW execution input and progressive photo uploads;
- P0/Yandal verification, correction, approval, and rejection;
- local queue status and explicit sync actions;
- device/account isolation requirements.

---

## 5. Core workflows

### 5.1 Authentication and session

1. User submits credentials through the approved login path.
2. Backend validates the account and creates a short-lived session token.
3. Client stores only the session data needed for the active workflow.
4. Every protected operation sends the token through the supported argument/body contract.
5. Expired, missing, invalid, or unresolved sessions are rejected before data access or writes.
6. Logout invalidates the session where supported.

Passwords must not be treated as plaintext in new flows. Password hashing, throttle behavior, and migration remain backend responsibilities.

### 5.2 Field inspection and findings

1. User selects the relevant date, team, work area, feeder, section, or inspection object.
2. Mobile records the finding and supporting information.
3. Photos are uploaded or queued locally according to connectivity.
4. The backend writes the record and links it to the correct ULP/session context.
5. Recalculation and notification text may be queued for asynchronous processing.
6. The client displays pending, synchronized, or failed status without deleting unsent records.

### 5.3 ROW execution

1. User selects feeder/section and records pole/work information.
2. The mobile client creates an execution code and stores the initial record.
3. Photos are stored using the established folder hierarchy and linked back to the row.
4. Later stages add work and completion photos to the same execution record.
5. Backend verifies that the target row belongs to the caller's ULP before updates.
6. Recalculation of realization, header totals, and WA text is queued and deduplicated.

### 5.4 Berita Acara

1. Authorized user opens the BA page.
2. Backend validates session, menu access, and ULP scope before listing.
3. User selects a BA row using its `idBA`.
4. Before PDF generation, upload, Master synchronization, or download, backend resolves exactly one source row.
5. The source row must have a valid ULP ownership value and match the allowed operational scope.
6. Missing, duplicate, foreign, blank, or unresolved rows are rejected without side effects.
7. Downloads require both `idBA` and a file identifier. The file must be recorded on that same BA row.
8. File size and file validation limits are enforced before returning content.

### 5.5 P0/Yandal correction and approval

1. Reviewer opens the P0 verification list.
2. The client displays server/master values and local pending corrections.
3. Changing a job type saves a correction to the durable local outbox.
4. Selecting `Lain-lain` requires a valid manual weight from 1 through 5, including supported decimal-comma input.
5. Invalid or cancelled manual-weight input must not be saved.
6. Approval or rejection is stored locally when offline and synchronized later.
7. Rejection requires a reason.
8. The server recalculates the final point after a valid synchronized correction.

### 5.6 Synchronization and retries

- Local writes must be durable before the UI reports success.
- Outbox entries must carry enough information to retry safely and avoid accidental duplication.
- Sync must be idempotent where possible.
- Failed items remain visible for retry or administrator-assisted resolution.
- Account switching must not expose another user's local queue or cached data.
- Sync actions must not silently discard pending records.

---

## 6. Data and integration requirements

### 6.1 Identifier rules

- `idBA` identifies a BA source row and is not an ownership claim.
- BA row lookup must be unique across the configured source set.
- File IDs must be normalized from supported Drive URL formats before validation.
- A file is authorized only when its normalized ID is present in an allowed file field on the resolved BA row.
- Operational codes such as P0 codes, execution codes, header codes, and work codes must remain stable through corrections and synchronization.

### 6.2 Storage

- **Google Sheets:** operational rows, master data, user/account data, BA data, queues, and calculated values.
- **Google Drive:** BA documents, signatures, inspection photos, ROW photos, and related artifacts.
- **Local mobile database:** offline records, pending corrections, approvals, and synchronization outbox.
- **Cache:** short-lived session and performance data only. Cache must not become the source of truth for authorization.

### 6.3 Integrations

- Google Apps Script web app and `google.script.run` contracts.
- Google Sheets and Drive APIs available through Apps Script services.
- AppSheet webhook actions protected by the dedicated webhook verification path.
- Flutter HTTP/API client and local persistence layer.
- GitHub CI for static audit, backend tests, Flutter analysis/build checks, and token-query rejection checks.

---

## 7. Functional requirements

### Authentication and authorization

- **FR-01:** Protected read/write operations require a valid session.
- **FR-02:** Authorization must verify the caller's ULP before operational data access.
- **FR-03:** Foreign, blank, unresolved, or ambiguous ownership must fail closed.
- **FR-04:** Tokens must not be accepted from insecure query-string contracts where the endpoint requires body/argument authentication.
- **FR-05:** Authorization failures must happen before spreadsheet, Drive, PDF, or write side effects.

### Operational data

- **FR-06:** Users can create and update supported inspection, finding, ROW, P0, approval, and BA records.
- **FR-07:** Every record preserves its source identifiers and audit-relevant timestamps.
- **FR-08:** Photo uploads retain their relationship to the source row and workflow stage.
- **FR-09:** Recalculation and notification work can be queued without blocking field entry unnecessarily.

### BA

- **FR-10:** BA listing is authenticated and ULP-scoped.
- **FR-11:** BA PDF, upload, and Master sync operations require a unique resolved `idBA` row.
- **FR-12:** BA download requires `idBA` plus `fileId` and validates the file against that row.
- **FR-13:** BA file downloads enforce the existing size limit and return a safe failure when validation cannot be completed.

### Mobile and sync

- **FR-14:** Mobile writes are stored durably before being reported as saved.
- **FR-15:** Manual P0 weight input accepts values 1 through 5 and rejects all other values.
- **FR-16:** Pending corrections, approvals, and uploads remain retryable after failures.
- **FR-17:** Local data is isolated by account/session context.

### Audit and release

- **FR-18:** The checked-in backend must pass the mandatory Audit Gate.
- **FR-19:** New read/write endpoints require an accepted guard or an explicit reviewed internal exception.
- **FR-20:** Required CI checks must be green before merge or deployment.
- **FR-21:** Changes must preserve existing runtime behavior unless the change explicitly documents a compatibility decision.

---

## 8. Non-functional requirements

### Security

- Fail closed by default.
- Do not trust client-supplied ULP, role, ownership, file membership, or identifiers without server-side resolution.
- Do not add public routes to audit bypass lists to silence findings.
- Keep internal exceptions explicit and reviewable.
- Avoid logging secrets, session tokens, passwords, or sensitive file URLs.

### Reliability

- Use locks for operations that generate identifiers and append related rows atomically.
- Make queue processing retryable and bounded.
- Preserve failed records and audit history.
- Avoid destructive recovery instructions such as deleting the local database to fix sync conflicts.

### Performance

- Keep field entry responsive by deferring expensive recalculation to approved queues.
- Reuse existing caches only for non-authoritative data.
- Avoid repeated full-sheet or full-Drive scans where a safe indexed or row-scoped lookup is available.

### Compatibility

- Preserve Apps Script load order and existing public contracts unless intentionally changed.
- Maintain compatibility for existing web and mobile clients during staged rollout.
- Keep backend and Flutter tests aligned with the deployed contract.

### Usability

- Show clear offline, pending, syncing, success, and failure states.
- Explain why a correction or download was rejected without exposing sensitive internals.
- Require explicit confirmation for destructive administrative actions.

---

## 9. Testing and acceptance

### Automated acceptance

- Backend syntax and security suite passes.
- Audit Gate passes on the checked-in backend.
- BA row ownership tests pass for own-ULP, foreign, blank, missing, duplicate, and side-effect prevention cases.
- BA download tests pass for session rejection, unknown file rejection, row/file mismatch, size cap, and valid downloads.
- Flutter analyze and debug build pass.
- Auth-token query rejection check passes.

### Runtime acceptance

Before production sign-off, validate in the deployed Apps Script runtime:

- login, expiry, logout, and role/menu access;
- BA list access for ULP Toboali;
- rejection of missing, foreign, blank, duplicate, and unresolved BA ownership;
- BA Gardu and Switching PDF generation;
- final upload and Master synchronization;
- download using `idBA + fileId`, including row/file mismatch rejection;
- P1 BA numbering under concurrent requests;
- mobile offline save, retry, account switching, and queue isolation;
- P0 correction, manual weight validation, approval, rejection, and recalculation;
- real-device photo upload and signed APK behavior;
- preservation of existing photos, codes, audit history, and outbox data.

A green CI run is necessary but not sufficient for production approval. Deployed-runtime and real-device validation remain mandatory.

---

## 10. Delivery stages

1. **Stage 0, P0 Audit Gate:** mandatory static guard enforcement and regression CI. Implemented and merged.
2. **Stage 1, P1 BA atomicity:** lock-protected BA number generation and row append. Implemented and merged.
3. **Stage 2, P2 same-ULP authorization:** covered BA boundaries reject foreign or unresolved caller ULP. Implemented and merged for the covered boundary.
4. **Stage 3, BA row ownership:** resolve unique `idBA`, validate row ULP, and bind downloads to the row. Active in PR #7 pending CI and runtime validation.
5. **Stage 4, hardening:** compatibility cleanup, data-write sanitization, cache/local storage/outbox isolation.
6. **Stage 5, deployment acceptance:** deployed-runtime, real-device, signed APK, and production evidence.

No later stage should be treated as complete while an earlier stage has an unresolved security or runtime blocker.

---

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Apps Script exposes top-level functions through an anonymous deployment | Mandatory Audit Gate, explicit wrappers, and runtime guard preservation |
| A caller guesses a BA or Drive identifier | Resolve row ownership server-side and bind file IDs to the resolved row |
| Concurrent BA writes collide | Shared script lock and atomicity tests |
| Offline corrections are lost | Durable local outbox, retry state, and no silent deletion |
| Account switching leaks cached data | Session-scoped local storage and queue isolation tests |
| Compatibility wrapper changes break load order | Review file order, preserve original runtime, and run focused regression suites |
| CI passes while deployment behavior differs | Required Apps Script runtime and real-device acceptance before sign-off |

---

## 12. Definition of done

The product change is done only when:

- requirements and affected workflows are documented;
- implementation preserves the relevant existing contracts;
- focused and full automated tests pass;
- Audit Gate passes;
- security failures fail closed before side effects;
- CI is green;
- deployed-runtime checks are recorded for backend changes;
- mobile changes are checked on a real device or approved equivalent;
- no pending data, photo, audit history, or outbox record is silently discarded;
- the release is traceable to a reviewed commit and deployment evidence.
