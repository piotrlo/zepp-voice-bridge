# Voice Bridge — proces wydania wersji

Krótka instrukcja od merge do publikacji w Zepp App Store. **Nie wykonuj merge ani submitu „na ślepo”** — każdy krok wymaga testu na zegarku.

---

## Wymagania wstępne

- Node.js **20** (`nvm use 20`) — zeus-cli nie lubi nowszych wersji
- `bun install` w katalogu projektu
- Zepp App na telefonie (para z zegarkiem)
- Konto deweloperskie Zepp, **appId: 1106856**
- Publiczny URL do [PRIVACY_POLICY.md](PRIVACY_POLICY.md) (repo publiczne lub GitHub Pages)

---

## 1. Integracja kodu (main)

```bash
git checkout main
git pull origin main
git merge feature/v1.1
# lub: git rebase main  (na branchu feature, potem fast-forward merge)
```

Rozwiąż konflikty, uruchom podgląd na zegarku (krok 2), dopiero potem commit merge na `main`.

```bash
git push origin main
```

Opcjonalnie tag wersji (po udanym teście i buildzie):

```bash
git tag -a v1.1.0 -m "Voice Bridge 1.1.0"
git push origin v1.1.0
```

---

## 2. Assety i wersja w manifeście

Sprawdź `app.json`:

- `app.version.name` — np. `1.1.0`
- `app.version.code` — inkrementuj liczbę całkowitą przy każdym uploadzie do sklepu

Wygeneruj ikony:

```bash
bun run icon
```

| Plik | Rozmiar | Użycie |
|------|---------|--------|
| `icon.png` | 240×240 | Ikona sklepu / manifest |
| `assets/icon.png` | **124×124** | Ikona urządzenia (wymaganie Zeus) |

Screenshots: min. **3×** 360×360 PNG (`screenshots/`).

---

## 3. Build paczki ZAB

```bash
bun run build
# równoważnie: npx zeus build
```

Paczka trafia do `dist/` jako `1106856-Voice_Bridge-<wersja>-<timestamp>.zab`.

Walidacja paczki (skrypt w repo — **wymagane** `assets/icon.png` w `.zab`):

```bash
./verify-zab.sh dist/1106856-Voice_Bridge-*.zab
```

Skrypt kończy się kodem `1`, gdy brakuje ikony urządzenia w archiwum.

---

## 4. Test na urządzeniu (obowiązkowe przed sklepem)

**Podgląd deweloperski:**

```bash
bun run preview
# lub: npx zeus preview --target "Amazfit Active 2 NFC (Round)"
```

Zeskanuj QR w Zepp App (tryb deweloperski). Sprawdź:

- [ ] Brak endpointu → ekran „Setup Required”
- [ ] Głos → transkrypcja → POST → status „Sent” / sensowny błąd HTTP
- [ ] Pusty wynik głosu → **klawiatura tekstowa** (fallback `inputType.CHAR`)
- [ ] „Try again” po błędzie sieci
- [ ] Ustawienia: URL, auth, `payload_key`, `sender_id`, `include_timestamp`
- [ ] Zepp App w tle podczas testu (proxy BLE)

Po testach zbuduj **ponownie** ZAB z tego samego commita co merge.

---

## 5. Przygotowanie listingu App Store

W panelu Zepp Developer / App Store (appId **1106856**):

1. **Upload ZAB** — najnowsza paczka z `dist/`
2. **Opis** — EN (opcjonalnie PL); krótki opis w `app.json` to minimum — rozszerz w panelu
3. **Screenshots** — 3+ (360×360)
4. **Ikona sklepu** — 240×240 (`icon.png`)
5. **Privacy Policy URL** — musi być publicznie dostępny
6. **Wersja** — zgodna z `app.json` (`version.name` / `version.code`)

---

## 6. Submit i publikacja

1. Wyślij wersję do review w panelu Zepp
2. Odpowiedz na ewentualne uwagi recenzji (ikona, uprawnienia, opis)
3. Po akceptacji — publikacja w sklepie
4. Na GitHubie: release notes przy tagu `v1.x.x` (opcjonalnie)

---

## 7. Po wydaniu

- Zaktualizuj `STATUS_REPORT.md` / `AGENT_CONTEXT.md` (status publikacji)
- Zachowaj plik `.zab` i tag git dla rollbacku
- Kolejne funkcje (OfflineQueue itd.) — plany w lokalnym `IDEAS/` (poza repo)

---

## Szybka checklista wydania

| Krok | Akcja |
|------|--------|
| 1 | Merge `feature/v1.1` → `main`, push |
| 2 | `bun run icon` + wersja w `app.json` |
| 3 | `bun run build` → ZAB w `dist/` |
| 4 | `zeus preview` + test E2E na zegarku |
| 5 | Upload ZAB + screenshots + privacy URL |
| 6 | Submit → review → publish |
| 7 | Tag `v1.x.x` + notatki |

---

*Voice Bridge · appId 1106856 · Zepp OS API 4.0*
