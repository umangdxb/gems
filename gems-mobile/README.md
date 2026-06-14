# GEMS Mobile

React Native / Expo warehouse scanning app for GEMS. Runs on Android (and iOS in future).

## Setup

```bash
npm install
cp .env.development .env   # local dev
```

Set `EXPO_PUBLIC_API_BASE_URL` in `.env.development` (local) and `.env.production` (deployed).

## Running locally

```bash
npm start          # Expo dev server (scan QR with Expo Go)
npm run web        # Web browser at localhost:8081 (for quick testing)
npm run android    # Run on connected Android device / emulator
```

## Building APK (Android)

Builds run on Expo's cloud build service (EAS Build). You must be logged in:

```bash
npx eas login
```

| Command | Output | Use for |
|---|---|---|
| `npm run build:android` | `.apk` via internal distribution | QA / client testing |
| `npm run build:android:prod` | `.aab` app bundle | Play Store submission |

After the build completes, EAS prints a QR code and a download link. Share the link with testers — they can install the APK directly on their Android device.

To view all builds: https://expo.dev/accounts/umang.dxb/projects/gems-mobile/builds

## Environment files

| File | Loaded when |
|---|---|
| `.env.development` | `expo start` (local dev) |
| `.env.production` | `eas build --profile production` |
| `.env` | Fallback |

## Project structure

```
src/
  screens/       ← OrderListScreen, OrderDetailScreen, CompletionScreen
  components/    ← Header, Button, Card, BarcodeScanner
  context/       ← AuthContext, ThemeContext
  lib/           ← api.ts (fetch wrapper)
  types/         ← navigation.ts, api.ts
  utils/         ← gs1Parser.ts
```

## Tech stack

- Expo SDK 54 / React Native
- React Navigation v7
- Expo Camera (barcode scanning)
- EAS Build (cloud builds)
