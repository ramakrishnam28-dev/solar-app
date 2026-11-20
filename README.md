# RCAL Station (native app)

Expo / React Native app for the SolarEPC Station CRM. Phase 0: sign-in, session, biometric lock, role tabs, More screen.
Phase 1: dashboard (3 numbers + 13 follow-ups), customer list (search, 4 segments, paging, pull to refresh), customer screen (Overview, Progress, Loan; installers see Progress only). Read-only. Tasks tab and the + button are still placeholders.

## Run it in VS Code

1. Install Node 20 or newer (https://nodejs.org) and VS Code.
2. Open this folder in VS Code, then open the terminal (Ctrl+`).
3. `npm install`
4. `npx expo install --fix` (aligns package versions with your Expo SDK)
5. `npx expo start`
6. On your Android phone install **Expo Go** from Play Store, same Wi-Fi as the laptop, scan the QR code in the terminal.
   If the QR does not connect: `npx expo start --tunnel`.

## Checks

- `npm run typecheck`
- `npm test` (API client and permissions tests)

## Server address

Default is the Cloudflare Worker in `app.json` (`extra.apiUrl`). To override, create `.env`:

    EXPO_PUBLIC_API_URL=https://your-api.example.com

Restart `npx expo start` after changing it.

## Android APK for your staff (later)

    npm i -g eas-cli
    eas login
    eas build:configure
    eas build --platform android --profile preview

This gives an installable APK link to share privately.

## What to test on the phone

Sign in, wrong password message, tabs for each role, fingerprint toggle in More, lock after 2 minutes in background, airplane mode then reopen (offline screen), Sign out.
