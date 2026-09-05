# Worker photo integration: Yandal

The Yandal shift P0 cards now expose Before/Work/After photo buttons. The creation form exposes a photo preview action after a successful camera capture. Both route to `YandalPhotoScreen`, which displays the original and lists missing indicators. Complete records can call the local renderer, then open `LocalWatermarkPreviewScreen` with the guarded Android save-as action.

This commit integrates **Yandal only**. ROW, Inspeksi Gardu and Inspeksi Jaringan are not wired by this commit. No change to upload/backends, global watermark triggers, official code generation or access rules is included.

## Evidence and availability
- Only explicit `kodeP0` is used. The current draft creation flow does not receive an official P0 code; newly created local drafts therefore remain download-locked until an authorized domain/sync flow supplies it. No local ID is relabeled as official, and no manual ID editor is added.
- Capture metadata is saved by photo slot in the existing draft JSON. Old drafts without metadata remain viewable, but downloads are blocked. No current user/GPS/clock fallback fills historical fields.
- `capturedAt` is the time ImagePicker returns a camera image, explicitly tagged `captureTimeSource: camera-return`. This is not hardware shutter attestation. GPS is sampled after camera return, and its separate timestamp is recorded; mock detection also runs before opening the camera.
- ULP, sub-team, crew, feeder, section, job type and area are frozen per photo. Changing the form later does not silently rewrite photo metadata. Fill these fields before taking the photo; recapture if an indicator was missing or wrong.
- `createdAt` is initialized once when creating the P0 draft, not every save/retry. Saving now completes in the form before navigating back, so failures leave the form available.
- Original file paths still come from ImagePicker. Durable app-private copies and outbox/file lifecycle management remain pending. If a file is missing, preview/export reports it and never substitutes another image. Do not promise persistence after cache cleanup or uninstall.
- Rendering/download does not mutate the source or upload anything. It may be repeated from a complete record. The existing export checks run again after rendering.

## Validation still required
Run `flutter test test/yandal_photo_metadata_test.dart test/local_watermark_test.dart test/watermark_photo_export_test.dart`, Flutter analyze, and a signed APK build. Manually verify camera cancel, GPS failure/mock detection, old drafts, incomplete indicators, file missing, official-code resolution, preview zoom, export cancellation/failure/success, restart and account changes. No Flutter/device tests were executed by the assistant for this commit.
