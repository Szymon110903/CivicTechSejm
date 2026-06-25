# Klient API Sejmu (Sejm Client)

W katalogu `backend/app/sejm_client/` znajduje się dedykowany klient do komunikacji z oficjalnym, publicznym API Sejmu RP (`https://api.sejm.gov.pl`).

Rozwiązuje on podstawowe problemy API sejmowego:
*   Opóźnienia sieciowe i limitowanie żądań (zawiera system *Retry z backoffem* i lokalny wbudowany moduł *Cache*).
*   Złożoność ścieżek URL (abstrahuje konkretne zapytania HTTP do metod asynchronicznych Pythona).

## 🧩 Moduły Klienta i Reprezentacja Danych

Klient został podzielony funkcjonalnie na tzw. Mixiny (moduły wstrzykiwane do bazowej klasy `BaseClient`).

### 1. Legislacja i Druki (`legislative.py`)
Odpowiada za dane na temat powstawania prawa.
*   **Pobiera:**
    *   Listę kadencji (`get_terms`).
    *   Listę posiedzeń w danej kadencji (`get_proceedings`).
    *   Zgłoszone projekty i druki (`get_bills`, `get_print`).
    *   Procesy legislacyjne (`get_processes`), interpelacje i zapytania.
    *   **Pliki Dokumentów**: `download_print_attachment()` pobiera surowe bajty plików dokumentów (PDF/HTML) ze ścieżki `/sejm/term{term}/prints/{num}/{attach_name}`.
*   **Zwraca:** Struktury JSON odzwierciedlające oficjalne OpenAPI Sejmu (np. szczegóły druków wraz z tablicą `attachments`).

### 2. Posłowie (`mps.py`)
Odpowiada za informacje o parlamentarzystach.
*   **Pobiera:**
    *   Pełną listę posłów (`get_mps`).
    *   Szczegółowe dane o konkretnym pośle, dacie urodzenia, wykształceniu (`get_mp_details`).
    *   Opcjonalne statystyki obecności i głosowań z API Sejmu.
*   **Zwraca:** Ustrukturyzowany słownik lub listę słowników opisujących parlamentarzystów.

### 3. Organy i Kluby (`organs.py`)
Odpowiada za grupy zrzeszające posłów.
*   **Pobiera:**
    *   Listę klubów / kół poselskich (`get_clubs`).
    *   Listę komisji sejmowych (`get_committees`).
    *   Informacje o posiedzeniach komisji.
*   **Zwraca:** Dane identyfikacyjne klubów (w tym skróty, np. "KO", "PiS", "Lewica").

### 4. Głosowania (`votings.py`)
Odpowiada za pobieranie i mapowanie setek tysięcy głosów.
*   **Pobiera:**
    *   Listę wszystkich bloków głosowań (`get_votings`).
    *   Konkretne informacje o zadanym głosowaniu (kto jak głosował).
*   **Zwraca:** Wyniki w formacie gotowym do zasilenia naszej bazy danych (`Vote`, `VotingDay`, `Proceeding`).

## ⚙️ Wbudowane Mechanizmy
1.  **Cacheowanie:** Każde wywołanie metody klienta najpierw sprawdza `LocalCache`. Jeśli żądanie było wykonane niedawno (np. w ciągu ostatniej godziny dla głosowań), zapytanie sieciowe nie jest realizowane, co drastycznie oszczędza transfer i czas.
2.  **Retry (ponawianie):** Dekorator `@retry_with_backoff()` automatycznie radzi sobie z chwilowymi problemami po stronie serwerów sejmowych, ponawiając odpytywanie ze stopniowo wzrastającym opóźnieniem.
