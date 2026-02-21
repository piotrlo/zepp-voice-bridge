# Voice Bridge – Agent Context

## Project Overview

Voice Bridge is a Zepp OS smartwatch app that captures voice input (speech-to-text), displays the transcription, and sends it as a JSON POST to a configurable webhook endpoint. Built for Amazfit watches running Zepp OS 3.0+ with API_LEVEL 4.0.

- **App ID:** 1106856
- **App Name:** Voice Bridge
- **Repo:** https://github.com/piotrlo/zepp-voice-bridge (private)
- **Author:** Piotr Loch
- **Status:** PoC working on physical device (Amazfit Active 2 NFC), preparing for Zepp App Store publication.

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
├── app.js                  # BaseApp wrapper – BLE init
├── app.json                # Manifest: appId 1106856, API 4.0, target "gt" (round)
├── package.json            # @zeppos/zml ^0.0.41, zeus-cli
├── icon.png                # Device icon 124x124
├── icon-store-240.png      # Store icon 240x240 (circular, transparent bg)
├── SPECIFICATION.md         # PoC spec (English)
├── PRIVACY_POLICY.md        # Privacy policy for Zepp App Store
├── .gitignore
├── page/
│   └── index.js            # Main UI: voice input → display → HTTP POST
├── app-side/
│   └── index.js            # Side service: GET_CONFIG → settings → response
├── settings/
│   └── index.js            # Companion settings UI (endpoint, auth, key, sender)
└── assets/
    ├── icon.png
    └── gt.r/
        └── icon.png
```

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
ZML's `httpRequest` sometimes resolves even when the response is non-standard. The app treats unknown errors as "sent" (status `UNK`) with vibration, since delivery usually succeeds even when the response parsing fails. Only explicit HTTP error status codes show "Error".

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
4. **httpRequest error handling** – ZML proxy may reject responses that are actually successful (e.g. webhook returns markdown). Timeout increased to 20s.
5. **Icon size** – Zeus build warns if icon is not 124x124. Store requires separate 240x240 icon.
6. **Button positioning** – Round watch screens clip content at edges. `y: px(200)` for the Repeat button works well on 336px baseline. All positioning must use `px()`.

## Pending / Next Steps

- [ ] Publish to Zepp App Store (appId 1106856 registered)
  - Upload ZAB package
  - Provide 3+ screenshots (360x360 transparent bg)
  - Store icon `icon-store-240.png` is ready
  - Privacy policy `PRIVACY_POLICY.md` is ready (link via public GitHub repo)
- [ ] Build ZAB package (`npx zeus build`) and test on device before submission
- [ ] Future: message history, offline queue, retry logic

### Completed

- [x] Update SPECIFICATION.md to reflect universal auth (no hardcoded Bearer)
- [x] Translate SPECIFICATION.md to English
- [x] Add `pl-PL` i18n to app.json
- [x] Unify Settings sublabels to English for store compatibility
- [x] Write privacy policy (`PRIVACY_POLICY.md`)

## Useful Documentation Links

- [SYSTEM_KEYBOARD API](https://docs.zepp.com/docs/reference/device-app-api/newAPI/ui/widget/SYSTEM_KEYBOARD/)
- [Keyboard API](https://docs.zepp.com/docs/reference/device-app-api/newAPI/ui/keyboard/)
- [Screen Adaptation](https://docs.zepp.com/docs/guides/framework/device/screen-adaption/)
- [Flex Layout](https://docs.zepp.com/docs/guides/framework/device/layout/)
- [Preview on Watch](https://docs.zepp.com/docs/guides/quick-start/preview/)
- [App Submission](https://docs.zepp.com/docs/distribute/)
- [Paid Apps / Monetization](https://docs.zepp.com/docs/guides/faq/paid-app/)
- [HTTP-Buttons reference app](https://github.com/giovaboy/ZeppOS-HTTP-Buttons)
