# Dokumentacja Bazy Danych CivicTechSejm

Baza danych systemu CivicTechSejm przechowuje ustrukturyzowane i przetworzone dane o aktywnościach legislacyjnych i głosowaniach Sejmu RP.

---

## 1. Konfiguracja Połączenia i Sesji

Konfiguracja połączenia SQLAlchemy zaimplementowana jest w module [backend/app/core/db.py](file:///d:/repozytoria/CivicTechSejm/backend/app/core/db.py):
*   Używa zmiennej środowiskowej `DATABASE_URL` (domyślnie `postgresql://postgres:postgres@localhost:5432/civictechsejm`).
*   Współdzieli instancję klasy `Base` (deklaratywna klasa SQLAlchemy) między wszystkimi modelami, co umożliwia poprawne wiązanie relacji i kluczy obcych.
*   Zależność `get_db()` automatycznie otwiera i zamyka sesję bazy danych dla każdego zapytania FastAPI.

---

## 2. Diagram Związków Encji (ERD)

Modele bazodanowe SQLAlchemy reprezentują strukturę relacji jeden-do-wielu:

```mermaid
erDiagram
    PROCEEDINGS {
        int id PK
        int term
        string proceeding_id
        date date
        timestamp last_updated
    }
    VOTING_DAYS {
        int id PK
        int proceeding_id FK
        date date
    }
    VOTINGS {
        int id PK
        int day_id FK
        int voting_number
        string sitting
        string title
        string description
        string topic
        boolean passed
        int yes_count
        int no_count
        int abstain_count
        int not_voted
        int total_votes
        float attendance_percent
        int quorum_required
        jsonb raw_api_data
        timestamp created_at
        timestamp updated_at
    }
    CLUB_VOTING_RESULTS {
        int id PK
        int voting_id FK
        string club_id
        voting_decision decision
        int yes_count
        int no_count
        int abstain_count
        int not_voted_count
        int party_members_total
        float participation_percent
        jsonb raw_members_votes
        timestamp created_at
        timestamp updated_at
    }

    PROCEEDINGS ||--o{ VOTING_DAYS : "zawiera"
    VOTING_DAYS ||--o{ VOTINGS : "zawiera"
    VOTINGS ||--o{ CLUB_VOTING_RESULTS : "ma wyniki klubowe"
```

---

## 3. Szczegóły Modeli i Mapowanie Danych

### Posiedzenie (`proceedings`)
Reprezentuje całe posiedzenie parlamentarne (sesję).
*   Unikalny klucz kompozytowy: kombinacja `term` (kadencja) i `proceeding_id` (numer posiedzenia).
*   Model SQLAlchemy: [Proceeding](file:///d:/repozytoria/CivicTechSejm/backend/app/models/proceeding.py).

### Dzień Głosowania (`voting_days`)
Dzieli posiedzenie na poszczególne dni kalendarzowe, w których odbywały się głosowania.
*   Unikalny indeks kompozytowy: `proceeding_id` + `date`.
*   Model SQLAlchemy: [VotingDay](file:///d:/repozytoria/CivicTechSejm/backend/app/models/voting_day.py).

### Głosowanie (`votings`)
Opisuje pojedyncze głosowanie.
*   Model SQLAlchemy: [Voting](file:///d:/repozytoria/CivicTechSejm/backend/app/models/voting.py).
*   **Obliczanie Statystyk (`calculate_statistics()`)**:
    *   `total_votes` = Suma głosów (`yes_count` + `no_count` + `abstain_count`).
    *   `attendance_percent` = Stosunek oddanych głosów do całkowitej liczby uprawnionych posłów biorących udział w posiedzeniu.
*   **Rozstrzygnięcie wyniku (`passed`)**:
    Wyznaczane na podstawie obecności pola `majorityVotes` w API (jeśli jest podane, wymagane jest `yes >= majorityVotes`, w przeciwnym wypadku domyślna większość `yes > no`).
*   **Zapis surowy (`raw_api_data`)**: Zapisuje całą strukturę odpowiedzi API w polu `JSONB` na potrzeby diagnostyki/przyszłych rozszerzeń.

### Wyniki Klubu (`club_voting_results`)
Przechowuje statystyki i rozkład głosów wewnątrz danego klubu/koła poselskiego dla określonego głosowania.
*   Model SQLAlchemy: [ClubVotingResult](file:///d:/repozytoria/CivicTechSejm/backend/app/models/club_voting_result.py).
*   **Decyzja Klubu (`decision`)**: Typ wyliczeniowy (Enum):
    *   `YES` - większość członków klubu głosowała "Za".
    *   `NO` - większość członków klubu głosowała "Przeciw".
    *   `ABSTAIN` - większość członków klubu wstrzymała się od głosu.
    *   `MIXED` - brak wyraźnej większości (remis pomiędzy topowymi opcjami).
    Wyznaczane za pomocą metody `determine_decision()`.
*   **Imienna lista głosów (`raw_members_votes`)**:
    Zapisana w formacie JSON (JSONB w DB) lista słowników:
    ```json
    [
      {
        "mp_id": "123",
        "mp_name": "Jan Kowalski",
        "vote": "YES"
      }
    ]
    ```
