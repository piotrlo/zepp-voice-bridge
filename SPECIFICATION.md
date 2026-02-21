# VoiceBridge PoC Specification (Zepp OS)

## 1. Product Goal

VoiceBridge is a fast "voice-first" app for Amazfit smartwatches. On launch it immediately opens voice input, converts speech to text and displays the result on screen. The app then sends the text as a JSON POST to a configurable endpoint.

## 2. Proof of Concept Scope

PoC includes:
- automatic voice input on app launch,
- transcription or manual text entry,
- text display on the watch screen,
- HTTP POST to the endpoint via phone (BLE proxy),
- endpoint and token configuration in the Zepp App settings.

PoC does not include:
- message history,
- offline retry queue,
- advanced analytics or telemetry.

## 3. Technical Requirements

- **Platform:** Zepp OS v3 runtime with API_LEVEL `4.0`.
- **UI SDK:** `@zos/ui` with `createKeyboard`.
- **Voice input:** `createKeyboard({ inputType: inputType.VOICE })`.
- **Fallback:** when voice input is unavailable, the app falls back to `inputType.CHAR`.
- **Watch-phone communication:** `@zeppos/zml` (`BasePage`, `BaseSideService`, `BaseApp`).
- **HTTP:** `this.httpRequest()` from `BasePage`.

## 4. Architecture

1. `page/index.js` opens voice input and captures text.
2. `page/index.js` fetches configuration via `this.request({ method: "GET_CONFIG" })`.
3. `app-side/index.js` returns endpoint configuration from `settingsLib`.
4. `page/index.js` performs `this.httpRequest()` with a JSON payload.
5. The target endpoint receives the data.

## 5. User Configuration (Zepp App)

The user provides the following in the app settings:
- `endpoint_url` – webhook or API endpoint URL,
- `auth_token` – full Authorization header value (e.g. `Bearer xxx`, `Basic yyy`). Empty = no auth header,
- `payload_key` – JSON field name for the text (e.g. `message`),
- `sender_id` – optional sender identifier.

## 6. Request Format

Default request:

```json
{
  "message": "Buy milk and bread",
  "sender": "watch-user"
}
```

`message` is replaceable via `payload_key`.
The `sender` field is optional and only included when `sender_id` is set.

## 7. User Flow

1. User launches VoiceBridge.
2. App immediately opens voice input.
3. User speaks or types text.
4. App displays the transcription on screen.
5. App sends a JSON POST to the endpoint.
6. User sees status (`Listening`, `Transcribed`, `Sending`, `Sent` or `Error`).

## 8. PoC Acceptance Criteria

- App installs via QR (`zeus preview`) in developer mode.
- On launch it immediately opens voice input.
- Transcribed text is visible on the watch screen.
- With a valid endpoint configuration, an HTTP POST is executed.
- When voice input is unavailable, the app falls back to text keyboard.

## 9. Risks and Limitations

- Voice input may depend on region and firmware.
- No watch-phone connection blocks `httpRequest`.
- Invalid endpoint or token configuration results in `Error` status.

## 10. Development Setup

1. `bun install`
2. `zeus preview`
3. Scan QR in the Zepp App (Developer Mode enabled)
4. Install on watch and run end-to-end test
