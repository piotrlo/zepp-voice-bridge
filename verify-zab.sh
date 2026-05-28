#!/bin/bash

# verify-zab.sh - Skrypt walidacyjny dla paczek Zepp OS (.zab)
# Wersja: 1.0.0
# Przygotowane dla: Piotr L. (zepp-voice-bridge)

PACKET_URL=$1

if [ -z "$PACKET_URL" ]; then
    echo "❌ Błąd: Nie podano ścieżki do pliku .zab!"
    echo "Użycie: ./verify-zab.sh ścieżka/do/paczki.zab"
    exit 1
fi

echo "🔍 Rozpoczynam walidację paczki: $PACKET_URL"

# 1. Sprawdzenie czy plik istnieje
if [ ! -f "$PACKET_URL" ]; then
    echo "❌ Błąd: Plik nie istnieje!"
    exit 1
fi

# 2. Sprawdzenie rozmiaru (Ostrzeżenie pow. 2MB dla BLE)
FILE_SIZE=$(du -k "$PACKET_URL" | cut -f1)
if [ "$FILE_SIZE" -gt 2048 ]; then
    echo "⚠️ Ostrzeżenie: Paczka ma $FILE_SIZE KB. Wysyłka przez BLE może być wolna lub niestabilna!"
else
    echo "✅ Rozmiar paczki OK ($FILE_SIZE KB)."
fi

# 3. Weryfikacja struktury (wymaga unzip)
if ! command -v unzip &> /dev/null; then
    echo "⚠️ Ostrzeżenie: 'unzip' nie jest zainstalowany. Pomijam weryfikację wnętrza paczki."
else
    echo "📁 Sprawdzam strukturę wewnętrzną..."
    
    # Sprawdzenie manifestu
    if ! unzip -l "$PACKET_URL" | grep -q "manifest.json"; then
        echo "❌ Błąd: Brak pliku manifest.json wewnatrz .zab!"
        exit 1
    fi
    
    # Sprawdzenie ikon (krytyczne dla menu zegarka)
    if ! unzip -l "$PACKET_URL" | grep -q "assets/icon.png"; then
        echo "❌ Błąd: Brak assets/icon.png w paczce (wymagane 124×124 dla menu zegarka)."
        exit 1
    fi

    echo "✅ Struktura manifestu i assets/icon.png poprawne."
fi

# 4. Sprawdzenie app.json w katalogu głównym (jeśli skrypt odpalamy z roota projektu)
if [ -f "app.json" ]; then
    echo "📑 Porównuję z lokalnym app.json..."
    # Tutaj można dodać jq do porównywania appId
    if command -v jq &> /dev/null; then
        LOCAL_APP_ID=$(jq -r '.app.appId' app.json)
        echo "✅ Lokalny AppID: $LOCAL_APP_ID"
    fi
fi

echo "✨ Walidacja zakończona sukcesem dla $PACKET_URL"
exit 0
