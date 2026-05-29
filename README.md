# CivicTechSejm

Skonteneryzowana aplikacja webowa oparta o **FastAPI + React** służąca do agregacji i analizy danych z Sejmu RP.

---

## 🚀 Uruchomienie deweloperskie (Docker)

Aby zbudować i uruchomić cały stos aplikacyjny (Frontend, Backend, Baza PostgreSQL):

```bash
docker compose up --build
```

*   **Frontend (React + Vite)**: [http://localhost:3000](http://localhost:3000)
*   **Backend (FastAPI)**: [http://localhost:8000](http://localhost:8000)
    *   Health Check: `/api/health`
    *   Dokumentacja OpenAPI/Swagger: `/docs`

---

## 🗄️ Baza Danych i Migracje (Alembic)

Aplikacja wykorzystuje PostgreSQL do przechowywania zaimplementowanego schematu bazy danych. Do wersjonowania i aplikacji schematu używany jest system migracji **Alembic**.

### Przydatne polecenia (uruchamiane w katalogu `backend/`):

*   **Aplikowanie migracji** (podniesienie schematu do najnowszej wersji):
    ```bash
    alembic upgrade head
    ```
*   **Wycofanie ostatniej migracji**:
    ```bash
    alembic downgrade -1
    ```
*   **Automatyczne wygenerowanie nowej migracji** (na podstawie zmian w modelach SQLAlchemy w katalogu `app/models/`):
    ```bash
    alembic revision --autogenerate -m "nazwa_zmiany"
    ```

---

## 🧪 Testy Automatyczne (Pytest)

Testy jednostkowe i integracyjne backendu znajdują się w katalogu `backend/tests/`. Testy korzystają z izolowanej bazy danych **SQLite w pamięci** (`sqlite:///:memory:`) i nie wymagają połączenia sieciowego ani uruchomionej bazy PostgreSQL.

### Uruchamianie testów:

1. Przejdź do katalogu `backend/`:
   ```bash
   cd backend
   ```
2. Uruchom testy przy użyciu pytest:
   ```bash
   python -m pytest
   ```

Wszystkie pliki testowe posiadają na samej górze komentarz dokumentujący testowany obszar oraz listę weryfikowanych funkcjonalności.
