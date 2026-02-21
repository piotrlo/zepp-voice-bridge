# VoiceBridge PoC Specification (Zepp OS)

## 1. Cel produktu
VoiceBridge to szybka aplikacja "voice-first" na zegarek Amazfit. Po uruchomieniu ma natychmiast otworzyć wejście głosowe, zamienić mowę na tekst i wyświetlić wynik na ekranie. W kolejnym kroku PoC aplikacja wysyła ten tekst jako JSON POST na testowy endpoint.

## 2. Zakres Proof of Concept
PoC obejmuje:
- automatyczny start voice input po wejściu do aplikacji,
- transkrypcję lub ręczne wpisanie tekstu,
- prezentację tekstu na ekranie zegarka,
- wysłanie treści do endpointu HTTP przez telefon (BLE proxy),
- konfigurację endpointu i tokenu w ustawieniach Zepp App.

PoC nie obejmuje:
- historii wiadomości,
- retry queue offline,
- zaawansowanej analityki i telemetrii.

## 3. Wymagania techniczne
- **Platforma:** Zepp OS v3 runtime z API_LEVEL `4.0`.
- **SDK UI:** `@zos/ui` z `createKeyboard`.
- **Voice input:** `createKeyboard({ inputType: inputType.VOICE })`.
- **Fallback:** gdy voice input niedostępny, aplikacja przełącza się na `inputType.CHAR`.
- **Komunikacja watch-phone:** `@zeppos/zml` (`BasePage`, `BaseSideService`, `BaseApp`).
- **HTTP:** `this.httpRequest()` z `BasePage`.

## 4. Architektura
1. `page/index.js` uruchamia voice input i pobiera tekst.
2. `page/index.js` pobiera konfigurację przez `this.request({ method: "GET_CONFIG" })`.
3. `app-side/index.js` zwraca konfigurację endpointu z `settingsLib`.
4. `page/index.js` wykonuje `this.httpRequest()` z payloadem JSON.
5. Endpoint testowy przyjmuje dane.

## 5. Konfiguracja użytkownika (Zepp App)
W ustawieniach aplikacji użytkownik podaje:
- `endpoint_url` - URL webhooka/test API,
- `auth_token` - token Bearer (bez prefiksu `Bearer `),
- `payload_key` - nazwa pola tekstowego w JSON (np. `message`),
- `sender_id` - opcjonalny identyfikator nadawcy.

## 6. Format requestu
Domyślny request:

```json
{
  "message": "Kup mleko i chleb",
  "sender": "watch-user"
}
```

`message` jest zastępowalne przez `payload_key`.
Pole `sender` jest opcjonalne i wysyłane tylko, gdy `sender_id` jest ustawione.

## 7. User flow
1. Użytkownik uruchamia VoiceBridge.
2. Aplikacja natychmiast przechodzi do voice input.
3. Użytkownik mówi lub wpisuje tekst.
4. Aplikacja wyświetla transkrypcję na ekranie.
5. Aplikacja wysyła JSON POST do endpointu.
6. Użytkownik widzi status (`Listening`, `Transcribed`, `Sending`, `Sent` lub `Error`).

## 8. Kryteria akceptacji PoC
- Aplikacja instaluje się przez QR (`zeus preview`) w trybie deweloperskim.
- Po otwarciu od razu uruchamia input głosowy.
- Tekst po zakończeniu jest widoczny na ekranie zegarka.
- Dla poprawnej konfiguracji endpointu wykonuje się HTTP POST.
- W razie niedostępności voice input działa fallback do klawiatury tekstowej.

## 9. Ryzyka i ograniczenia
- Voice input może być zależny od regionu i firmware.
- Brak połączenia zegarka z telefonem blokuje `httpRequest`.
- Błędna konfiguracja endpointu/tokenu skutkuje statusem `Error`.

## 10. Uruchomienie developerskie
1. `bun install`
2. `zeus preview`
3. Skan QR w Zepp App (włączony Developer Mode)
4. Instalacja na zegarku i test end-to-end
