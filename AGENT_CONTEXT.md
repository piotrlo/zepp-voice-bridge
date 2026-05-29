# Voice Bridge – Agent Context

## Project Overview

Voice Bridge is a Zepp OS smartwatch app that captures voice input (speech-to-text), displays the transcription, and sends it as a JSON POST to a configurable webhook endpoint. Built for Amazfit watches running Zepp OS 3.0+ with API_LEVEL 4.0.

- **App ID:** 1106856
- **App Name:** Voice Bridge
- **Repo:** https://github.com/piotrlo/zepp-voice-bridge (private)
- **Author:** Piotr Loch
- **Status:** v1.1.0 released on GitHub (tag `v1.1.0`); awaiting Zepp App Store review (package built by GitHub Actions, manual upload to Zepp Console pending).
- **CI/CD:** GitHub Actions workflow (`.github/workflows/release.yml`) — on tag push, builds ZAB and creates GitHub Release.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Zepp OS v3, API_LEVEL 4.0 |
| Communication | `@zeppos/zml` (BaseApp, BasePage, BaseSideService) |
| Voice Input | `createKeyboard({ inputType: inputType.VOICE })` from `@zos/ui` |
| HTTP | `this.httpRequest()` via ZML BLE proxy (phone-side) |
| Config storage | `settingsLib` from `@zeppos/zml/base-side` |
| Build tool | `zeus-cli` (`npx zeus preview` / `npx zeus build`) |
| Package manager | `bun` (preferred) or `npm` with Node.js 20 via `nvm` |
| Design baseline | 336px (round screen), all coords wrapped in `px()` |

## File Structure

```
zepp-voice-bridge/
├── .github/workflows/
│   └── release.yml          # GitHub Actions: build + release on tag push
├── app.js                  # BaseApp wrapper – BLE init
├── app.json                # Manifest: appId 1106856, API 4.0, target "gt" (round)
├── package.json            # @zeppos/zml ^0.0.41, zeus-cli
├── icon.png                # Store icon 240x240
├── SPECIFICATION.md         # PoC spec (English)
├── PRIVACY_POLICY.md        # Privacy policy for Zepp App Store
├── verify-zab.sh           # ZAB package validation script
├── .gitignore
├── page/
│   └── index.js            # Main UI: voice input → ARC spinner → response viewer
├── app-side/
│   └── index.js            # Side service: GET_CONFIG + test connection handler
├── settings/
│   └── index.js            # Companion settings UI (endpoint, auth, payload, test)
├── screenshots/             # App Store screenshots (360×360, circular)
├── assets/
│   ├── icon.png
│   └── gt.r/
│       └── icon.png
└── IDEAS/                   # Local dev plans (outside repo, not in git)

## Architecture Flow

```
[Watch page/index.js]
    │
    ├── createKeyboard(VOICE) → STT transcription
    ├── this.request("GET_CONFIG") ──BLE──► [Phone app-side/index.js]
    │                                           └── settingsLib → returns config JSON
    └── this.httpRequest(POST) ──BLE proxy──► [External webhook endpoint]
```

## Key Design Decisions

### Authorization header is universal
The `auth_token` settings field accepts the **full Authorization header value** (e.g. `Bearer xxx`, `Basic yyy`). The code sends it as-is – no prefix is hardcoded. If empty, the Authorization header is omitted entirely. This makes it compatible with Zapier, n8n, Home Assistant, LLM APIs, etc.

### Screen adaptation
All widget coordinates and sizes use `px()` from `@zos/utils` based on `designWidth: 336`. This auto-scales to different round screen devices.

### Error handling for HTTP responses
The app distinguishes explicit HTTP failures (`4xx`, `5xx`) from connection errors. Status color and text communicate whether the failure is authorization/request related, server related, or connectivity related.

### No hardcoded credentials
Default config in `app-side/index.js` has empty `endpoint_url` and `auth_token`. User must configure via Zepp App settings.

## Build & Deploy

```bash
# Install dependencies
bun install

# Preview on watch (generates QR code)
npx zeus preview --target "Amazfit Active 2 NFC (Round)"

# Build ZAB package for store submission
npx zeus build
```

**Node.js requirement:** zeus-cli needs Node.js 20 (use `nvm use 20` if needed). esbuild version conflicts may occur with newer Node versions.

**Device target names:** Use exact target from `zeus preview` list. For Amazfit Active 2 NFC, it's `"Amazfit Active 2 NFC (Round)"`.

## Known Issues & Learnings

1. **Voice input requires one tap** – `inputType.VOICE` opens the microphone screen but user must tap the mic button to start recording. There's no API to auto-start recording.
2. **BLE channel congestion** – During data sync, installing the app may fail with "bluetooth channel not available". Fix: wait for sync to finish, keep Zepp App in foreground.
3. **vibrate() in openVoiceInput breaks keyboard** – Adding `vibrate()` before `createKeyboard()` prevents the keyboard from appearing. Vibration works fine after HTTP response.
4. **httpRequest error handling** – ZML proxy behavior can vary by endpoint response format. Timeout is set to 10s and UI now separates HTTP errors from connectivity errors.
5. **Icon size** – Zeus build warns if icon is not 124x124. Store requires separate 240x240 icon.
6. **Button positioning** – Round watch screens clip content at edges. In v1.1, `Try again` appears at `y: px(178)` only for failures and `Repeat` moves to `y: px(248)` when both are visible. All positioning must use `px()`.

## Pending / Next Steps

- [ ] Upload ZAB to Zepp Console and submit for review
  - Download from GitHub Release: https://github.com/piotrlo/zepp-voice-bridge/releases
  - Provide 3+ screenshots (360×360 transparent bg) from `screenshots/`
  - Privacy Policy URL: https://github.com/piotrlo/zepp-voice-bridge/blob/main/PRIVACY_POLICY.md
- [ ] Future: OfflineQueue (persistent buffer), Multi-endpoint profiles, Complication trigger

### Completed

- [x] v1.1.0 release: ARC spinner, full-screen response, settings redesign, test connection
- [x] GitHub Actions: automated ZAB build and Release on tag push
- [x] Enhanced vibration patterns for send/success/error
- [x] Device testing on Amazfit Active 2 NFC (real screenshots captured)
- [x] Privacy policy (PRIVACY_POLICY.md) - public on GitHub

## Useful Documentation Links

- [SYSTEM_KEYBOARD API](https://docs.zepp.com/docs/reference/device-app-api/newAPI/ui/widget/SYSTEM_KEYBOARD/)
- [Keyboard API](https://docs.zepp.com/docs/reference/device-app-api/newAPI/ui/keyboard/)
- [Screen Adaptation](https://docs.zepp.com/docs/guides/framework/device/screen-adaption/)
- [Flex Layout](https://docs.zepp.com/docs/guides/framework/device/layout/)
- [Preview on Watch](https://docs.zepp.com/docs/guides/quick-start/preview/)
- [App Submission](https://docs.zepp.com/docs/distribute/)
- [Paid Apps / Monetization](https://docs.zepp.com/docs/guides/faq/paid-app/)
- [HTTP-Buttons reference app](https://github.com/giovaboy/ZeppOS-HTTP-Buttons)
