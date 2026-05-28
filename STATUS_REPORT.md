# STATUS REPORT — Voice Bridge (Zepp OS)

**Data raportu:** 28 maja 2026  
**Repozytorium:** `zepp-voice-bridge`  
**App ID:** 1106856  
**Aktualna gałąź:** `feature/v1.1` (zsynchronizowana z `origin/feature/v1.1`)

---

## 1. Branche

### Wszystkie branche

| Branch | Typ | Commit | Opis | Tracking |
|--------|-----|--------|------|----------|
| `main` | lokalny | `3e65872` | Plany w `IDEAS/`, raport | `origin/main` |
| `feature/v1.1` | lokalny (aktywny) | `27b62f7` | v1.1: UX, fallback CHAR, ikona 124×124, RELEASE.md | `origin/feature/v1.1` ✅ |
| `origin/main` | remote | `dad74b5` | HEAD na remote (bez ostatniego commita z lokalnego main) | — |
| `origin/feature/v1.1` | remote | `27b62f7` | Gałąź release v1.1 | — |

**Tagi:** `v1.0.0` (wcześniejszy commit w historii)

### Status merge względem `main`

| Branch | Zmergowany do `main`? | Relacja do `main` |
|--------|----------------------|-------------------|
| `main` | — | Lokalny `main` ma 1 commit więcej niż `origin/main` (`3e65872`) |
| `feature/v1.1` | **NIE** | **Ahead of `main`** — zawiera 3 commity release v1.1 ponad wspólny przodek |

**Commity tylko na `feature/v1.1` (do merge przed publikacją):**

- `1d7bc4c` — feat: Voice Bridge v1.1 (walidacja config, ekrany błędów, settings)
- `471810d` — fix: fallback CHAR keyboard + ikona urządzenia 124×124
- `27b62f7` — docs: RELEASE.md (checklist publikacji)

**Wniosek:** Publikacja v1.1 wymaga merge `feature/v1.1` → `main` po testach E2E. Nie mergować do `main` przed ukończeniem scope z `v1.1_SCOPE.md`.

---

## 2. Niezcommitowane zmiany

**Stan:** Brak staged/unstaged modyfikacji w śledzonych plikach. Są **pliki untracked / do commitu w tym zadaniu**:

| Plik | Typ | Opis zawartości |
|------|-----|-----------------|
| `STATUS_REPORT.md` | Dokumentacja | Ten raport — zaktualizowany po code review |
| `v1.1_SCOPE.md` | Dokumentacja | Lista zadań przed release v1.1 |
| `verify-zab.sh` | Skrypt bash | Walidator paczek `.zab` — sprawdza manifest, opcjonalnie `assets/icon.png` |

> **Plany rozwojowe** (wcześniej `DREAM_REPORT.md`, `DREAM_REPORT_SYNC.md`, `INNOVATION_VISION.md`) przeniesiono do lokalnego folderu `IDEAS/` — katalog jest w `.gitignore` i nie trafia do repozytorium.

**Katalogi ignorowane przez git (istnieją lokalnie):**

| Ścieżka | Opis |
|---------|------|
| `IDEAS/` | Lokalne plany rozwojowe (roadmap, OfflineQueue, innowacje) — poza repozytorium |
| `dist/` | Zbudowane paczki `.zab` (wymaga rebuildu v1.1.0 po ostatnich fixach) |
| `node_modules/` | Zależności npm/bun (standardowo ignorowane) |

---

## 3. Stan kodu

### 3.1 Architektura ogólna

Projekt to minimalna aplikacja Zepp OS (API 4.0) składająca się z trzech modułów:

```
page/index.js  →  UI zegarka (voice input, HTTP POST)
app-side/index.js  →  Side Service (GET_CONFIG → settingsLib)
settings/index.js  →  Ustawienia w aplikacji Zepp (telefon)
app.js  →  BaseApp wrapper (pusty lifecycle)
app.json  →  Manifest (appId 1106856, target round/gt, wersja 1.1.0)
```

Flow działa poprawnie jako PoC — przetestowany na Amazfit Active 2 NFC (wg `AGENT_CONTEXT.md`).

### 3.2 `page/index.js` (~458 linii — `feature/v1.1`)

**Mocne strony:**
- Czysta struktura z JSDoc na kluczowych metodach
- Poprawne użycie `px()` do skalowania UI (designWidth 336)
- Uniwersalny nagłówek Authorization (bez hardcoded `Bearer`)
- Parsowanie body odpowiedzi HTTP z limitem znaków
- Preload konfiguracji przy starcie (`loadConfig()`)
- Ekrany „Setup Required” / „No connection”
- Fallback `inputType.CHAR` gdy voice zwraca pusty wynik
- Wibracja i toast po sukcesie
- Rozdzielone przyciski „Try Again” / „Repeat”

**Potencjalne problemy (pozostałe do v1.1):**

| # | Problem | Priorytet | Szczegóły |
|---|---------|-----------|-----------|
| 1 | Brak debounce na akcjach nagrywania/wysyłki | 🟡 Średni | Wielokrotne szybkie kliknięcia mogą otworzyć kilka keyboardów lub wysłać duplikaty |
| 2 | Status ładowania config nie mówi wprost o telefonie | 🟡 Średni | Przy braku Side Service wyświetla „No connection” zamiast np. „Connecting to Phone…” |
| 3 | Ekran Setup Required — zbyt krótka instrukcja | 🟡 Średni | Jedna linia tekstu; brak kroków 1–2–3 |
| 4 | Heurystyka sukcesu w `catch` (payload `ok:true`) | 🟢 Niski | Nadal traktuje niektóre odpowiedzi bez `status` jako sukces — celowe dla wybranych endpointów |
| 5 | Nakładanie się elementów UI na małych ekranach | 🟢 Niski | Layout poprawiony w v1.1 (`TRY_AGAIN_Y` / `REPEAT_SINGLE_Y`), wymaga weryfikacji na urządzeniu |

### 3.3 Semantyka sukcesu HTTP (definicja w kodzie)

Aplikacja **nie** wymaga wyłącznie kodu `200`. Aktualna logika w `sendToEndpoint()`:

| Warunek | Traktowanie | UI |
|---------|-------------|-----|
| `response.status` liczbowy i **&lt; 400** | Sukces | Status „Sent”, zielony, wibracja, toast |
| `response.status` **≥ 400** | Błąd HTTP | `Error {code}`, kolor 4xx/5xx, „Try again” |
| Brak `response.status` w `.then()` | Domyślnie **200** (sukces) | Jak sukces |
| `catch` z `error.status` ≥ 400 | Błąd HTTP | Jak wyżej |
| `catch` bez `status`, body z `"ok":true` lub `runid` | Sukces heurystyczny | „Sent”, kod `UNK` |
| `catch` bez `status`, bez heurystyki | Błąd sieci | „No connection”, kod `NET` |

**Wniosek dla v1.1:** Cała klasa **2xx i 3xx** (status &lt; 400) jest sukcesem. Kody **4xx/5xx** to błąd. Odpowiedzi bez statusu zależą od heurystyki body — warto udokumentować w README dla integratorów webhooków.

### 3.4 Bezpieczeństwo i transport

| Temat | Stan w v1.1 | Uwagi |
|-------|-------------|-------|
| HTTPS w ustawieniach | ❌ Brak wymuszenia | Użytkownik może wpisać `http://` — aplikacja wyśle request bez ostrzeżenia |
| Szyfrowanie payloadu | Po stronie endpointu | JSON POST w czystym tekście; brak dodatkowego szyfrowania po stronie watch |
| Przechowywanie tokena | `settingsLib` na telefonie | Standard Zepp OS; poza kodem aplikacji na zegarku |
| `auth_token` w logach | ✅ Nie logowany | `logger.error` loguje tylko błędy połączenia/parse, nie wartości tokena |
| Certyfikaty TLS | Delegacja do Zepp App (proxy HTTP) | `httpRequest` idzie przez telefon — jakość TLS zależy od systemu i URL |

**Plan v1.1 (scope):** Ostrzeżenie lub blokada HTTP w polu Endpoint URL w `settings/index.js` (patrz `v1.1_SCOPE.md`).

### 3.5 Logi i diagnostyka dla użytkownika

| Warstwa | Dostępność | Co widać |
|---------|------------|----------|
| Użytkownik zegarka | UI na ekranie | Status tekstowy, `HTTP: {code}`, skrócony body odpowiedzi (max ~200 znaków), toasty |
| Użytkownik telefonu | Zepp App → Settings | Pola konfiguracyjne, brak dedykowanego „log viewer” |
| Deweloper | `log.getLogger("VoiceBridge")` | Błędy parse config, load config, send error — tylko w trybie deweloperskim / podglądzie Zeus |

**Brak w v1.1:** Eksport logów, ekran „Diagnostics”, historia requestów. Użytkownik końcowy polega na komunikatach UI — to akceptowalne dla PoC, ale warto wzmiankować w opisie sklepu.

### 3.6 `app-side/index.js` (43 linie)

**Mocne strony:**
- Prosty, czytelny handler `GET_CONFIG`
- Sensowne domyślne wartości w `DEFAULT_CONFIG`
- JSDoc na `getConfig()` i `onRequest()`

**Potencjalne problemy:**

| # | Problem | Priorytet |
|---|---------|-----------|
| 1 | Brak obsługi nieznanych metod w `onRequest` | 🟢 Niski |
| 2 | Brak trim/normalizacji tokena po stronie telefonu | 🟡 Średni — planowane w scope v1.1 |

### 3.7 `settings/index.js` (~141 linii — `feature/v1.1`)

**Mocne strony:**
- Sekcje Endpoint / Payload
- Toggle `include_timestamp`
- Opisy sublabel po angielsku (store-ready)
- Placeholder z `https://`

**Potencjalne problemy:**

| # | Problem | Priorytet |
|---|---------|-----------|
| 1 | Brak walidacji HTTPS vs HTTP | 🔴 Wysoki (scope v1.1) |
| 2 | Brak trim spacji w `auth_token` / URL | 🟡 Średni (scope v1.1) |
| 3 | Brak walidacji formatu URL (składnia) | 🟡 Średni |

### 3.8 `app.js` (10 linii)

Minimalny wrapper `BaseApp` — poprawny boilerplate, brak logiki do oceny.

### 3.9 `app.json`

**Poprawne:**
- `appId: 1106856` ✅
- API 4.0 (compatible/target/minVersion) ✅
- Target `gt` (round), `designWidth: 336` ✅
- Uprawnienia: `device:os.keyboard`, `data:os.device.info` ✅
- i18n: `en-US`, `pl-PL` ✅
- Wersja: **1.1.0** (code: 2) ✅

**Uwagi:**
- `"vender"` — prawdopodobnie wymagane przez Zepp OS (nie standardowy „vendor”)
- Tylko platforma round (`st: "r"`) — brak wsparcia dla square/rectangular
- Brak `complication` w manifeście (pomysł w `IDEAS/`)

### 3.10 Ikony — ujednolicona specyfikacja

| Plik | Wymiar docelowy | Rola | Stan lokalny (`feature/v1.1`) |
|------|-----------------|------|-------------------------------|
| `icon.png` | **240×240** | Ikona sklepu / pole `app.icon` w manifeście | ✅ 240×240 |
| `assets/icon.png` | **124×124** | Ikona menu zegarka (wymaganie Zeus) | ✅ 124×124 (naprawione w `471810d`) |
| `assets/gt.r/icon.png` | **124×124** | Wariant targetu | Do weryfikacji po `bun run icon` |

> **Uwaga historyczna:** Wcześniejsze buildy i raporty wspominały **248×248** — to był błąd/legacy. Docelowe wymiary dla v1.1 to wyłącznie **124×124** (urządzenie) i **240×240** (sklep). Nie mieszać tych dwóch rozmiarów w dokumentacji.

### 3.11 Timeout HTTP — wartość docelowa v1.1

| Źródło | Wartość |
|--------|---------|
| `page/index.js` → `HTTP_TIMEOUT_MS` | **10 000 ms (10 s)** |
| `SPECIFICATION.md` | **10 s** |
| Historia git (`989570d`) | Celowo obniżono z 20 s → 10 s |

**Wniosek:** Dla release **v1.1 wartość docelowa to 10 s**. Wzmianka o 20 s w starych notatkach odnosiła się do wcześniejszej wersji kodu / pomyłki z Node.js 20 — **nie** do timeoutu HTTP.

### 3.12 Porównanie z `main` (przed merge)

Branch `feature/v1.1` względem `main` zawiera m.in.:

- ✅ Preload i walidacja konfiguracji (`loadConfig()`)
- ✅ Ekran „Setup required” gdy brak endpointu
- ✅ Lepsze kody kolorów statusu (success/warning/error)
- ✅ Rozdzielone przyciski „Try Again” / „Repeat”
- ✅ Toggle `include_timestamp` w ustawieniach
- ✅ Sekcje w settings (Endpoint, Payload)
- ✅ Wersja 1.1.0 (code: 2)
- ✅ Fallback `inputType.CHAR` (voice → pusty wynik → klawiatura tekstowa)
- ✅ Ikona urządzenia 124×124

**Rekomendacja:** Merge `feature/v1.1` → `main` po zamknięciu scope z `v1.1_SCOPE.md` i przejściu checklisty w `RELEASE.md`.

---

## 4. Breaking Changes — v1.0 → v1.1

| Obszar | v1.0 | v1.1 | Wpływ na użytkownika |
|--------|------|------|---------------------|
| Wersja paczki | `1.0.0` (code 1) | `1.1.0` (code 2) | Wymaga nowego uploadu ZAB do sklepu |
| Start aplikacji | Od razu voice | `loadConfig()` → voice lub ekran setup/błąd | Przy pustym URL — ekran konfiguracji zamiast pustego mikrofonu |
| Payload JSON | Stałe pola | Opcjonalny `timestamp` (toggle) | Integracje muszą akceptować nowe pole gdy włączone |
| Timeout HTTP | 20 s (wczesne buildy) / 10 s (później) | **10 s** ustalone | Wolniejsze webhooki mogą częściej dawać `NET` |
| Obsługa błędów HTTP | Często „Sent” przy nieznanym błędzie | Rozdzielenie 4xx/5xx vs sieć vs heurystyka | Inne komunikaty na zegarku — oczekiwane |
| Wejście tekstowe | Tylko voice | Voice + fallback CHAR | Zmiana UX przy braku STT |
| Ikona urządzenia | 248×248 (ostrzeżenie Zeus) | 124×124 | Poprawny build bez warningu |
| Ustawienia telefonu | Płaska lista pól | Sekcje Endpoint / Payload | Tylko UI companion — bez zmiany kluczy settings |

Brak zmian w kluczach `settingsLib` (`endpoint_url`, `auth_token`, `payload_key`, `sender_id`) — konfiguracja v1.0 pozostaje kompatybilna.

---

## 5. Plany i roadmap

### 5.1 Pending — do zrobienia TERAZ (z `AGENT_CONTEXT.md` + code review)

| # | Zadanie | Status |
|---|---------|--------|
| 1 | Publikacja w Zepp App Store (appId 1106856) | ⏳ W przygotowaniu |
| 2 | Upload paczki ZAB v1.1.0 | ⏳ Wymaga rebuildu po fixie ikony |
| 3 | Screenshots 360×360 (min. 3) | ✅ Gotowe (`screenshots/screenshot-{1,2,3}.png`) |
| 4 | Ikona sklepu 240×240 | ✅ `icon.png` (240×240) |
| 5 | Ikona urządzenia 124×124 | ✅ `assets/icon.png` (124×124) |
| 6 | Privacy Policy (plik) | ✅ `PRIVACY_POLICY.md` |
| 7 | **Publiczny URL Privacy Policy** | ❌ **🔴 KRYTYCZNY** — hard blocker submitu |
| 8 | Build ZAB i test na urządzeniu | ⏳ Po rebuild — patrz scope |
| 9 | `assets/icon.png` **wewnątrz paczki .zab** | ❌ **🔴 KRYTYCZNY** — stary ZAB v1.0.0 nie zawiera; `verify-zab.sh` tylko ostrzega |
| 10 | Scope v1.1 (UX/security drobiazgi) | ⏳ Zobacz `v1.1_SCOPE.md` |

### 5.2 Completed (z `AGENT_CONTEXT.md` + v1.1)

- [x] SPECIFICATION.md — uniwersalny auth, tłumaczenie EN
- [x] i18n `pl-PL` w app.json
- [x] Settings sublabels po angielsku
- [x] Privacy Policy (plik)
- [x] README ze screenshotami
- [x] Skrypt generowania ikon (`bun run icon`)
- [x] Fallback `inputType.CHAR` (branch v1.1)
- [x] Preload config, ekrany setup/connection
- [x] RELEASE.md — checklist publikacji

### 5.3 Planned — krótkoterminowe (release v1.1)

| # | Zadanie | Źródło | Priorytet |
|---|---------|--------|-----------|
| 1 | Zamknięcie zadań z `v1.1_SCOPE.md` | Code review | 🔴 Krytyczny / Wysoki |
| 2 | Rebuild ZAB v1.1.0 + walidacja `assets/icon.png` w paczce | Code review #6 | 🔴 Krytyczny |
| 3 | Publiczny URL Privacy Policy (GitHub Pages / public repo) | App Store | 🔴 **KRYTYCZNY** |
| 4 | Merge `feature/v1.1` do `main` | Release | 🔴 Krytyczny |
| 5 | HTTPS: ostrzeżenie lub wymuszenie w settings | Code review #7 | 🔴 Wysoki |
| 6 | Debounce przycisku nagrywania / wysyłki | Code review #8 | 🟡 Średni |
| 7 | Status „Connecting to Phone…” przy ładowaniu config | Code review #9 | 🟡 Średni |
| 8 | Setup Required — instrukcja krok po kroku | Code review #10 | 🟡 Średni |
| 9 | Trim spacji w tokenie/URL w ustawieniach | Code review #11 | 🟡 Średni |
| 10 | `verify-zab.sh`: fail przy braku `assets/icon.png` | Jakość release | 🟡 Średni |
| 11 | Test E2E na Amazfit Active 2 NFC | RELEASE.md | 🔴 Krytyczny |
| 12 | Rozszerzenie opisu store listing (EN + opcj. PL) | Store | 🟡 Średni |

### 5.4 Future — średnio/długoterminowe (poza v1.1)

**Z AGENT_CONTEXT.md:**
- Historia wiadomości
- Offline queue z retry
- Zaawansowana logika retry

**Plany rozwojowe (lokalnie w `IDEAS/`):**
- OfflineQueue, Voice Actions, HA Intent, AI proxy — **wyłączone ze scope v1.1**

---

## 6. Gotowość do App Store (appId 1106856)

### Checklist publikacji

| Wymaganie | Status | Data estymowana | Blokuje | Uwagi |
|-----------|--------|-----------------|---------|-------|
| App ID zarejestrowany (1106856) | ✅ | — | Nie | W `app.json` |
| Kod aplikacji (PoC działający) | ✅ | — | Nie | Amazfit Active 2 NFC |
| Kod produkcyjny v1.1 na branchu release | ✅ | — | Nie | `feature/v1.1` |
| Merge v1.1 → `main` | ⏳ | 1 dzień | **Tak** | Po testach scope |
| Manifest `app.json` poprawny | ✅ | — | Nie | API 4.0, wersja 1.1.0 |
| Ikona urządzenia 124×124 | ✅ | — | Nie | Lokalnie OK; musi być w ZAB |
| Ikona sklepu 240×240 | ✅ | — | Nie | `icon.png` |
| Screenshots min. 3× (360×360) | ✅ | — | Nie | 3× PNG |
| Privacy Policy (plik) | ✅ | — | Nie | `PRIVACY_POLICY.md` |
| **Publiczny URL Privacy Policy** | ❌ | 0.5–1 dzień | **Tak** | Repo private |
| Paczka ZAB v1.1.0 | ⏳ | 0.5 dnia | **Tak** | Rebuild + test urządzenia |
| Walidacja ZAB (`assets/icon.png` w paczce) | ❌ | 0.5 dnia | **Tak** | Stary ZAB v1.0.0 nie spełnia |
| Scope UX/security (v1.1_SCOPE) | ⏳ | 2–3 dni | Częściowo | Patrz lista zadań |
| Fallback keyboard (spec) | ✅ | — | Nie | Zaimplementowany w v1.1 |
| Opis aplikacji (store listing) | ⚠️ | 0.5 dnia | Nie | Krótki opis; brak PL |
| Test E2E v1.1 na zegarku | ⏳ | 1 dzień | **Tak** | Po rebuild ZAB |
| Wsparcie wielu rozdzielczości | ✅ | — | Nie | ZPK w paczce build |
| Brak hardcoded credentials | ✅ | — | Nie | Puste domyślne |
| Brak analytics/telemetrii | ✅ | — | Nie | Zgodne z Privacy Policy |

### Ocena gotowości: **~80% — blisko publikacji, 3 twarde blokery**

**Gotowe:**
- Działający flow voice/tekst → webhook na branchu v1.1
- Dokumentacja (README, SPEC, Privacy Policy, AGENT_CONTEXT, RELEASE)
- Assety wizualne (ikony 124 + 240, screenshots)
- Fallback keyboard i poprawki UX v1.1 w kodzie
- appId zarejestrowany

**Blokuje submit (🔴):**
1. **Publiczny URL Privacy Policy**
2. **Rebuild ZAB v1.1.0 z `assets/icon.png` wewnątrz paczki**
3. **Test E2E na zegarku** z nową paczką

**Wysokie przed submit (bez dużych feature’ów):**
- HTTPS warning w settings
- Pozostałe pozycje z `v1.1_SCOPE.md` (debounce, copy setup, trim token)

---

## 7. Podsumowanie

Voice Bridge to **działający proof-of-concept** na Zepp OS; na gałęzi **`feature/v1.1`** realizuje stabilniejszy flow: preload konfiguracji, czytelne błędy HTTP, fallback klawiatury oraz poprawne rozmiary ikon. Projekt jest na etapie **ostatniego sprintu przed Zepp App Store**.

**Najważniejsze do zrobienia TERAZ:**
1. Wykonać zadania z **`v1.1_SCOPE.md`** (bugfixy/UX, bez OfflineQueue itd.)
2. **Rebuild i walidacja ZAB** — potwierdzić `assets/icon.png` w archiwum
3. **Publiczny hosting Privacy Policy** — jedyny twardy blocker dokumentacyjny
4. **Test E2E** → merge `feature/v1.1` → `main` → submit

Długoterminowo największą wartość przyniesie **OfflineQueue** (plan w lokalnym `IDEAS/`) — świadomie **poza** release v1.1.

---

*Raport zaktualizowany po code review (28.05.2026). Szczegółowa lista zadań release: `v1.1_SCOPE.md`.*
