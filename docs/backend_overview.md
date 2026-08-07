# Dokumentacja Architektury Backendu (CivicTechSejm)


Backend aplikacji CivicTechSejm jest odpowiedzialny za agregację danych z oficjalnego API Sejmu RP, ich przetworzenie, przechowywanie we własnej bazie danych oraz wystawianie ustrukturyzowanych, zoptymalizowanych endpointów REST dla aplikacji klienckich (np. Frontendu w React).

## Stos Technologiczny
*   **Framework:** FastAPI (Python) - wybrany ze względu na wysoką wydajność, wsparcie dla programowania asynchronicznego (`asyncio`) oraz automatyczne generowanie dokumentacji OpenAPI (Swagger).
*   **Baza Danych:** PostgreSQL - relacyjna baza danych o dużej stabilności, używana do składowania uporządkowanych danych parlamentarnych.
*   **ORM:** SQLAlchemy - narzędzie do mapowania obiektowo-relacyjnego (Object-Relational Mapping).
*   **Migracje:** Alembic - system do zarządzania wersjami schematu bazy danych.
*   **Testy:** Pytest - framework do testów jednostkowych i integracyjnych (testy używają izolowanej bazy SQLite w pamięci).

## Struktura Katalogów Backendu

```text
backend/
├── alembic/                # Skrypty migracji bazy danych
├── alembic.ini             # Konfiguracja Alembica
├── app/
│   ├── core/               # Konfiguracje rdzenne (db, cache, retry)
│   ├── dependencies.py     # Zależności FastAPI (tzw. Dependency Injection)
│   ├── main.py             # Główny plik wejściowy (inicjalizacja FastAPI)
│   ├── models/             # Definicje tabel bazy danych (SQLAlchemy)
│   ├── routers/            # Moduły wystawiające endpointy do Frontendu (mps, votings, bills, committees, proceedings)
│   ├── schemas.py          # Modele Pydantic (DTO - definiują format wejścia/wyjścia API)
│   ├── sejm_client/        # Wewnętrzny klient odpytujący oficjalne API Sejmu
│   └── services/           # Warstwa logiki biznesowej (np. pobieranie i zapis dokumentów)
├── tests/                  # Zestaw testów automatycznych
├── requirements.txt        # Zależności Python
└── Dockerfile              # Definicja kontenera backendowego
```

## Przepływ Danych 

1.  **Frontend** odpytuje endpoint wystawiony w `app/routers/` (np. pobranie szczegółów posiedzenia).
2.  Zależnie od typu zapytania, system sprawdza, czy posiada dane w **Bazie Danych** (przez `app/models/`).
3.  Jeśli dane wymagają synchronizacji lub pochodzą ze źródeł zewnętrznych, wywoływany jest **Serwis Biznesowy** (`app/services/`), który za pośrednictwem **Klienta Sejmu** (`app/sejm_client/`) pobiera oryginalne dane.
4.  Pobrane dane są transformowane, archiwizowane w bazie (lub na dysku, np. pliki PDF) i formatowane przy pomocy **Schematów Pydantic** (`app/schemas.py`).
5.  Wynik w formacie JSON trafia z powrotem na Frontend.

Cały ciężar pobierania, parsowania, cache'owania i odpytywania bazy spoczywa na FastAPI.

## Deduplikacja i Konwersja Dokumentów

System automatycznie zarządza i optymalizuje dokumenty pochodzące z serwerów Sejmu:
*   **Deduplikacja:** Mechanizm pobierania dokumentów grupuje pliki powiązane z ustawami według ich unikalnych rdzeni nazw, eliminując powielanie (np. preferuje pliki PDF nad DOCX z tą samą merytoryczną zawartością).
*   **Konwersja On-The-Fly:** Kontener z backendem posiada zainstalowany wbudowany silnik bezgłowy (headless) **LibreOffice**. Gdy aplikacja webowa prosi o pobranie dokumentu udostępnianego przez Sejm wyłącznie w formacie tekstowym (`.doc` lub `.docx`), backend pobiera go do archiwum i przed wysłaniem na frontend automatycznie renderuje z niego dokument PDF. Pozwala to na uniknięcie łamania zabezpieczeń natywnych przeglądarek (np. wymogów zewnętrznych komponentów do podglądu formatów Microsoftu). Zmieniony plik PDF zapisywany jest również w bazie danych na przyszłość.

## Zadania w Tle (Background Sync)

Aby zachować bazę w aktualności, backend wykorzystuje `asyncio` do cyklicznego sprawdzania nowości bez obciążania zapytań klienckich. Przykładem jest:
*   **Synchronizacja posiedzeń:** Raz na 24 godziny funkcja pobiera listę posiedzeń z Sejmu i auto-importuje te, których brakuje lokalnie (`app/services/background_tasks.py`). Mechanizm ten spina się bezpośrednio w cyklu życia (Lifespan) serwera FastAPI.

## Asynchroniczne przetwarzanie AI (Celery + Redis)

W aplikacji dodano zaawansowany system kolejkowania **Celery** oparty na brokerze **Redis**. Celery jest odpowiedzialne za odciążenie głównego serwera FastAPI z ciężkich, długotrwałych zadań, takich jak komunikacja z zewnętrznymi modelami LLM (np. **Google Gemini API**).

**Dlaczego zostało to dodane?**
Generowanie podsumowań za pomocą modeli LLM (np. analizowanie setek stron OSR) może zająć od kilkunastu sekund do minuty. Wykonanie takiego zapytania synchronicznie (bezpośrednio w procesie API) zablokowałoby obsługę innych żądań HTTP i mogło skutkować błędem przekroczenia czasu oczekiwania (`Timeout`). Rozwiązaniem jest model asynchroniczny (Fire-and-Forget / Polling).

**Jak to działa w CivicTechSejm?**
1. **Frontend** żąda generacji podsumowania dla ustawy (np. przez `POST /bills/{id}/generate-summary`).
2. **FastAPI** przyjmuje żądanie i deleguje (odkłada) je do brokera **Redis** jako nowe zadanie do wykonania, po czym od razu zwraca odpowiedź o jego przyjęciu (status `pending`).
3. Osobny kontener w tle (tzw. **Celery Worker**) wykonuje zadanie `generate_bill_summary_task`:
   * **Deduplikacja**: Sprawdza w bazie czy `AnalysisResult` nie ma już gotowej analizy.
   * **Ekstrakcja PDF**: Znajduje plik z "osr" lub "uzasadnienie" w nazwie i wyciąga z niego tekst przy pomocy biblioteki `pdfplumber`.
   * **Inżynieria Promptów**: Wstrzykuje tekst do ustrukturyzowanego promptu wymuszającego odpowiedź w formacie czystego JSON i zachowanie obiektywnego, analitycznego tonu.
   * Zapisuje pobrany JSON z powrotem do pola `raw_analysis_data` w tabeli `AnalysisResult`.
4. **Frontend** cyklicznie odpytuje endpoint ustawy, który natychmiastowo zwraca zapisane już podsumowanie, zapobiegając nadmiernym rachunkom za API.
