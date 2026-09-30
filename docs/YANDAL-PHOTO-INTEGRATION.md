# Worker photo integration: Yandal

The Yandal shift P0 cards now expose Before/Work/After photo buttons. The creation form exposes a photo preview action after a successful camera capture. Both route to `YandalPhotoScreen`, which displays the original and lists missing indicators. Complete records can call the local renderer, then open `LocalWatermarkPreviewScreen` with the guarded Android save-as action.

This commit integrates **Yandal only**. ROW, Inspeksi Gardu and Inspeksi Jaringan are not wired by this commit. No upload/backends, global watermark triggers, official code generation or access rules are changed.

## Durable capture contract

- `PetugasPhotoStore.saveOriginal()` copies the source into account-scoped app-private storage before returning a photo.
- The copy is accompanied by `capture.json`, including the SHA-256 of the original bytes and frozen capture metadata.
- A durable `photo-outbox.jsonl` receipt is appended with state `pending`; a capture is not reported successful if the receipt cannot be written.
- Official-code binding writes an atomic reference and changes the matching outbox receipt to `bound`; it never overwrites capture time, GPS, or the original file.
- `pendingOutbox(owner)` can rediscover captures after ImagePicker cache cleanup, restart, or later upload/lifecycle processing.
- Account isolation is enforced by the hashed `username|ULP` private root and path containment checks.

## Evidence and availability
- Only explicit `kodeP0` is used. The current draft creation flow does not receive an official P0 code; newly created local drafts therefore remain download-locked until an authorized domain/sync flow supplies it. No local ID is relabeled as official, and no manual ID editor is added.
- Capture metadata is saved by photo slot in the existing draft JSON. Old drafts without metadata remain viewable, but downloads are blocked. No current user/GPS/clock fallback fills historical fields.
- `capturedAt` is the time ImagePicker returns a camera image, explicitly tagged `captureTimeSource: camera-return`. This is not hardware shutter attestation. GPS is sampled after camera return, and its separate timestamp is recorded; mock detection also runs before opening the camera.
- ULP, sub-team, crew, feeder, section, job type and area are frozen per photo. Changing the form later does not silently rewrite photo metadata. Fill these fields before taking the photo; recapture if an indicator was missing or wrong.
- `createdAt` is initialized once when creating the P0 draft, not every save/retry. Saving now completes in the form before navigating back, so failures leave the form available.
- Original files are now durable app-private copies with a file-backed outbox. Upload and remote lifecycle management remain pending. If a file is missing, preview/export reports it and never substitutes another image.
- Rendering/download does not mutate the source or upload anything. It may be repeated from a complete record. The existing export checks run again after rendering.

## Validation still required
Run `flutter test test/yandal_photo_metadata_test.dart test/local_watermark_test.dart test/watermark_photo_export_test.dart test/petugas_photo_flow_test.dart test/petugas_photo_durability_test.dart`, Flutter analyze, and a signed APK build. Manually verify camera cancel, GPS failure/mock detection, old drafts, file missing, cache cleanup, restart and account changes. No real-device tests are claimed by this source PR.
