# VoiceBridge v1.1.0 Specification (Zepp OS)

## 1. Product Goal

VoiceBridge is a fast "voice-first" app for Amazfit smartwatches. On launch it immediately opens voice input, converts speech to text and displays the result on screen. The app then sends the text as a JSON POST to a configurable endpoint. v1.1 adds visual feedback (ARC spinner, full-screen response viewer), redesigned settings, and a test connection feature.

## 2. Scope

### v1.1 includes:
- automatic voice input on app launch,
- transcription or manual text entry,
- text display on the watch screen,
- HTTP POST to the endpoint via phone (BLE proxy),
- endpoint, token, payload key, and sender configuration in Zepp App settings,
- **ARC progress indicator** — spinning arc during HTTP requests, changes color on success/error,
- **Full-screen JSON response viewer** — tap "Show response" to inspect server reply,
- **Collapsible response** — toggle response visibility to keep the success screen clean,
- **Test Connection** — send a test POST from settings and see the HTTP result,
- **Enhanced vibration feedback** — distinct haptic patterns for send start, success, and error,
- **GitHub Actions CI/CD** — automated ZAB build and GitHub Release on tag push.

### Does not include:
- message history,
- offline retry queue,
- advanced analytics or telemetry.

## 3. Technical Requirements

- **Platform:** Zepp OS v3 runtime with API_LEVEL `4.0`.
- **UI SDK:** `@zos/ui` with `createKeyboard`, `widget.ARC`, `widget.TEXT`, `widget.BUTTON`.
- **Voice input:** `createKeyboard({ inputType: inputType.VOICE })`.
- **Fallback:** when voice input is unavailable, the app falls back to `inputType.CHAR`.
- **Watch-phone communication:** `@zeppos/zml` (`BasePage`, `BaseSideService`, `BaseApp`).
- **HTTP:** `this.httpRequest()` from `BasePage`, `this.fetch()` from `BaseSideService` (for test connection).
- **HTTP timeout:** 10 seconds.
- **ARC animation:** recursive `setTimeout` updating `start_angle`/`end_angle` via `setProperty`, continues spinning for 800ms after success/error with final color.

## 4. Architecture

1. `page/index.js` opens voice input and captures text.
2. `page/index.js` fetches configuration via `this.request({ method: "GET_CONFIG" })`.
3. `app-side/index.js` returns endpoint configuration from `settingsLib`.
4. `page/index.js` performs `this.httpRequest()` with a JSON payload, shows ARC spinner.
5. On success: response body is hidden behind "Show response" toggle; ARC fades green.
6. On error: ARC fades red/orange, "Try again" button appears.
7. `settings/index.js` emits `test_connection_trigger` → `app-side/index.js` handles via `onSettingsChange` → runs `runTestConnection()` → writes result to `test_connection_status`.

## 5. User Configuration (Zepp App)

The user provides the following in the app settings:
- `endpoint_url` – webhook or API endpoint URL,
- `auth_token` – full Authorization header value (e.g. `Bearer xxx`, `Basic yyy`). Empty = no auth header,
- `payload_key` – JSON field name for the text (e.g. `message`),
- `sender_id` – optional sender identifier,
- `include_timestamp` – boolean toggle to add Unix timestamp to each request.

Settings sections (v1.1 redesign):
- **📍 Endpoint** — URL + Authorization,
- **📦 Payload** — JSON key + Sender ID + Timestamp toggle,
- **🧪 Test Connection** — "Send Test POST" button with result status.

## 6. Request Format

Default request:

```json
{
  "message": "Buy milk and bread",
  "sender": "watch-user",
  "timestamp": 1717000000
}
```

`message` is replaceable via `payload_key`.
The `sender` field is optional and only included when `sender_id` is set.
`timestamp` is only included when `include_timestamp` is enabled.

## 7. User Flow (v1.1)

1. User launches VoiceBridge.
2. App loads config from phone → shows "Setup Required" if no endpoint.
3. App immediately opens voice input.
4. User speaks or types text.
5. App displays the transcription on screen.
6. App shows spinning ARC indicator and sends JSON POST.
7. On success: green ARC (800ms spin), "Sent" status, HTTP code.
8. Optional: tap "Show response" → full-screen formatted JSON body → tap "↩ Hide" to return.
9. On error: red/orange ARC, error code, "Try again" button.
10. Repeat or dictate again as needed.

## 8. PoC Acceptance Criteria

- App installs via QR (`zeus preview`) in developer mode.
- On launch it immediately opens voice input.
- Transcribed text is visible on the watch screen.
- ARC spinner animates during HTTP request.
- With a valid endpoint configuration, an HTTP POST is executed.
- "Show response" displays server reply as formatted JSON.
- When voice input is unavailable, the app falls back to text keyboard.
- Test Connection in settings sends a POST and shows the HTTP status.

## 9. Risks and Limitations

- Voice input may depend on region and firmware.
- No watch-phone connection blocks `httpRequest`.
- Invalid endpoint or token configuration results in `Error` status.
- Side service must be running for Test Connection to work.
- No offline queue — failed requests are lost unless the user taps "Try again".

## 10. Development Setup

1. `bun install`
2. `zeus preview`
3. Scan QR in the Zepp App (Developer Mode enabled)
4. Install on watch and run end-to-end test

## 11. Release Process

```bash
# After merging to main:
git tag v1.1.0 -m "Voice Bridge 1.1.0"
git push origin v1.1.0
# GitHub Actions (release.yml) builds ZAB and creates GitHub Release
```

Download the `.zab` from the Release and upload to the Zepp Developer Console.
