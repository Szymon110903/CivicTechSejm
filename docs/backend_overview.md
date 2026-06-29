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
│   ├── routers/            # Moduły wystawiające endpointy do Frontendu
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

Dzięki takiemu podziałowi warstw frontend nie komunikuje się bezpośrednio z wolnym i skomplikowanym API Sejmu. Cały ciężar pobierania, parsowania, cache'owania i odpytywania bazy spoczywa na FastAPI.
