# Dokumentacja Bazy Danych CivicTechSejm

Baza danych systemu CivicTechSejm przechowuje ustrukturyzowane i przetworzone dane o aktywnościach legislacyjnych, głosowaniach oraz posłach Sejmu RP.

---

## 1. Konfiguracja Połączenia i Sesji

Konfiguracja połączenia SQLAlchemy zaimplementowana jest w module [backend/app/core/db.py](file:///d:/repozytoria/CivicTechSejm/backend/app/core/db.py):
*   Używa zmiennej środowiskowej `DATABASE_URL` (domyślnie `postgresql://postgres:postgres@localhost:5432/civictechsejm`).
*   Współdzieli instancję klasy `Base` (deklaratywna klasa SQLAlchemy) między wszystkimi modelami, co umożliwia poprawne wiązanie relacji i kluczy obcych.
*   Zależność `get_db()` automatycznie otwiera i zamyka sesję bazy danych dla każdego zapytania FastAPI.

---

## 2. Diagram Związków Encji (ERD)

Rozszerzony schemat bazy danych uwzględnia tabele dla posłów, klubów, komisji, projektów ustaw, wyników analiz oraz indywidualnych głosów poselskich:

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
    PARTIES {
        string id PK
        string name
        timestamp created_at
        timestamp updated_at
    }
    POLITICIANS {
        int id PK
        string first_name
        string last_name
        string second_name
        string party_id FK
        int seat_number
        int district_num
        string district_name
        string voivodeship
        boolean active
        timestamp created_at
        timestamp updated_at
    }
    COMMITTEES {
        string code PK
        string name
        timestamp created_at
        timestamp updated_at
    }
    BILLS {
        int id PK
        int term
        string print_number
        string title
        string description
        string status
        string type
        date document_date
        jsonb raw_api_data
        timestamp created_at
        timestamp updated_at
    }
    ANALYSIS_RESULTS {
        int id PK
        int bill_id FK
        text summary
        string sentiment
        string impact_category
        jsonb raw_analysis_data
        timestamp created_at
        timestamp updated_at
    }
    VOTES {
        bigint id PK
        int voting_id FK
        int politician_id FK
        string vote
        timestamp created_at
        timestamp updated_at
    }

    PROCEEDINGS ||--o{ VOTING_DAYS : "zawiera"
    VOTING_DAYS ||--o{ VOTINGS : "zawiera"
    VOTINGS ||--o{ CLUB_VOTING_RESULTS : "ma wyniki klubowe"
    VOTINGS ||--o{ VOTES : "zawiera głosy"
    POLITICIANS ||--o{ VOTES : "oddaje"
    PARTIES ||--o{ POLITICIANS : "zrzesza"
    BILLS ||--o{ ANALYSIS_RESULTS : "ma wyniki analizy"
```

---

## 3. Szczegóły Modeli i Mapowanie Danych

### Posiedzenie (`proceedings`)
Reprezentuje całe posiedzenie parlamentarne (sesję).
*   Model SQLAlchemy: [Proceeding](file:///d:/repozytoria/CivicTechSejm/backend/app/models/proceeding.py).

### Dzień Głosowania (`voting_days`)
Dzieli posiedzenie na poszczególne dni kalendarzowe, w których odbywały się głosowania.
*   Model SQLAlchemy: [VotingDay](file:///d:/repozytoria/CivicTechSejm/backend/app/models/voting_day.py).

### Głosowanie (`votings`)
Opisuje pojedyncze głosowanie.
*   Model SQLAlchemy: [Voting](file:///d:/repozytoria/CivicTechSejm/backend/app/models/voting.py).

### Wyniki Klubu (`club_voting_results`)
Przechowuje zagregowane statystyki głosów danego klubu/koła poselskiego dla określonego głosowania.
*   Model SQLAlchemy: [ClubVotingResult](file:///d:/repozytoria/CivicTechSejm/backend/app/models/club_voting_result.py).

### Kluby i Koła (`parties`)
Kluby parlamentarne zrzeszające posłów w Sejmie.
*   Model SQLAlchemy: [Party](file:///d:/repozytoria/CivicTechSejm/backend/app/models/party.py).

### Posłowie (`politicians`)
Reprezentuje poszczególnych posłów Sejmu.
*   Model SQLAlchemy: [Politician](file:///d:/repozytoria/CivicTechSejm/backend/app/models/politician.py).
*   **Numer Miejsca (`seat_number`)**: Przechowuje numer krzesła/miejsca posła na sali plenarnej (przydatne do wizualizacji sali).

### Komisje (`committees`)
Komisje sejmowe powoływane w celu opiniowania projektów legislacyjnych.
*   Model SQLAlchemy: [Committee](file:///d:/repozytoria/CivicTechSejm/backend/app/models/committee.py).

### Ustawy i Uchwały (`bills`)
Projekty aktów prawnych procedowane w Sejmie.
*   Model SQLAlchemy: [Bill](file:///d:/repozytoria/CivicTechSejm/backend/app/models/bill.py).

### Wyniki Analiz (`analysis_results`)
Przechowuje wyniki analiz legislacyjnych projektów ustaw (np. wygenerowane przez modele LLM streszczenia, analiza wpływu finansowego czy kategorii sektorowych).
*   Model SQLAlchemy: [AnalysisResult](file:///d:/repozytoria/CivicTechSejm/backend/app/models/analysis_result.py).

### Indywidualne Głosy Posłów (`votes`)
Przechowuje informacje o konkretnych głosach poszczególnych posłów dla każdego z głosowań.
*   Model SQLAlchemy: [Vote](file:///d:/repozytoria/CivicTechSejm/backend/app/models/vote.py).
*   **Skalowalność**: Klucz główny `id` zdefiniowany jest jako `BIGINT` ze względu na docelowy rozmiar tabeli (setki tysięcy do milionów wierszy głosów poselskich).
*   **Indeksy**: Pola `voting_id` oraz `politician_id` posiadają nałożone indeksy w celu szybkiego wyszukiwania głosów danego posła lub listy głosów dla konkretnego głosowania.
*   **Unikalność**: Nałożono ograniczenie unikalności `uq_voting_politician` na parę `(voting_id, politician_id)`.
