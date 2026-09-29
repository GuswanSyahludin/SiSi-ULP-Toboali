# SiSi Mobile

Flutter client for internal SiSi ULP Toboali operations.

## Run locally

```bash
flutter pub get
flutter analyze --no-fatal-infos --no-fatal-warnings
flutter test
```

## API endpoint configuration

The endpoint is selected at build time. The checked-in default is the current internal deployment; use an explicit value for staging or another approved deployment:

```bash
flutter run --dart-define=SISI_API_URL=https://staging.example/exec
flutter build apk --release --dart-define=SISI_API_URL=https://production.example/exec
```

Do not commit tokens, signing material, local debug logs, snapshot dumps, or device-specific credentials. Runtime sessions use secure storage and must be re-established when the backend rejects an expired or revoked device token.

## Release checks

Run the repository Release Quality Gate before internal distribution. Validate offline queue recovery, account switching, secure-storage migration, device-token expiry, and real-device behavior in isolated staging only.
