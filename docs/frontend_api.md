# API wystawiane dla Frontendu (Frontend API)

Backend FastAPI udostępnia dla Frontendu (np. aplikacji React) dedykowane, przetworzone endpointy pod prefixem `/api/`. Są one przystosowane i "wyczyszczone" z niepotrzebnych detali, by na froncie można było prosto narysować interfejs.

Dokumentację interaktywną z możliwością testowania (Swagger UI) można znaleźć po uruchomieniu projektu pod adresem: `http://localhost:8000/docs`.

## Wykaz Dostępnych Modułów (Routers)

### 1. Posłowie (`/api/mps`)
Endpointy dostarczające dane o parlamentarzystach.
*   `GET /api/mps/`
    *   **Zwraca:** Listę wszystkich posłów (opcjonalnie z paginacją / filtrowaniem).
    *   **Zastosowanie:** Budowa widoku listy posłów, tabeli rankingowej lub wyszukiwarki na Frontendzie.
*   `GET /api/mps/{id}`
    *   **Zwraca:** Szczegóły o pojedynczym pośle (w tym przynależność klubową, datę urodzenia itp.).
    *   **Zastosowanie:** Budowa podstrony / profilu pojedynczego parlamentarzysty.

### 2. Głosowania i Posiedzenia (`/api/votings`)
Endpointy serwujące zagregowane dane o głosowaniach. Są to najważniejsze endpointy do rysowania wykresów (Civic Tech).

*   `GET /api/votings/`
    *   **Zwraca:** Uproszczoną, paginowaną listę wszystkich głosowań ze wszystkich posiedzeń i dni (od najnowszych). Posiada parametry `page` i `limit`.
    *   **Zastosowanie:** Budowa widoku chronologicznej, przeglądalnej listy wszystkich głosowań Sejmu z prostą paginacją.
*   `GET /api/votings/proceedings/{proceeding_id}`
    *   **Zwraca:** Struktura dla posiedzeń (ProceedingVotingsResponseDTO) dzieli obrady na konkretne dni, a każdy dzień na zbiór głosowań.
    *   **Sync:** Jeśli posiedzenia nie ma w bazie, endpoint **zablokuje odpowiedź na kilkanaście sekund**, pobierze dane z Sejm API w locie, zapisze w bazie i dopiero zwróci JSON. Frontend w tym czasie musi wyświetlać ekran ładowania.
    *   Pojedyncze głosowanie posiada już **wyliczone wyniki dla klubów** (`club_results` -> np. KO - `YES`, PiS - `NO`).
    *   **Zastosowanie:** Zasilanie wykresów kołowych, słupkowych i osi czasu na głównej stronie Frontendu bez obciążania przeglądarki wyliczaniem głosów z 460 posłów osobno.
*   `POST /api/votings/import`
    *   **Zwraca:** Status pobrania i zaimportowania do bazy danych wyników głosowań z konkretnego posiedzenia (np. `?proceeding_id=60&term=10`).
    *   **Zastosowanie:** Ręczny mechanizm wypełniania bazy. (Uwaga: ze względu na automatyzację w locie i w tle, to wywołanie jest obecnie rzadziej używane na froncie).

### 2a. Przegląd Posiedzeń (`/api/proceedings`)
Endpoint będący bezpośrednim proxy do API Sejmu.
*   `GET /api/proceedings/`
    *   **Zwraca:** Listę dostępnych posiedzeń Sejmu w aktualnej kadencji (zbuforowaną z `api.sejm.gov.pl`).
    *   **Zastosowanie:** Główny widok kart ("Posiedzenia") na lewym panelu menu.

### 3. Dokumenty Projektów i Ustaw (`/api/bills`)
Endpointy pozwalające zarządzać projektami oraz powiązanymi plikami (np. pełnym tekstem ustawy, OSR, uzasadnieniem) w formatach PDF, HTML i innych.
*   `GET /api/bills/{bill_id}/documents`
    *   **Zwraca:** Listę dostępnych plików dokumentów dla zadanego projektu ustawy (ich identyfikatory, formaty oraz oryginalne linki URL).
    *   **Zastosowanie:** Rysowanie kafelków lub listy załączników do kliknięcia na profilu projektu.
*   `POST /api/bills/{bill_id}/documents/sync`
    *   Wymusza zaktualizowanie z Sejm API listy załączników dla danego projektu (przydatne po dodaniu nowego projektu).
*   `GET /api/bills/documents/{document_id}/download`
    *   **Zwraca:** Plik binarny z odpowiednim typem MIME (np. `application/pdf`, `text/html`). Jeśli pliku nie było na lokalnym serwerze – backend pobiera go z serwerów Sejmu na żądanie (On-Demand) i zapisuje w archiwum, prowadząc przy okazji logi audytu.
    *   **Zastosowanie:** Ten adres URL frontend umieszcza np. w znaczniku `<a>` jako przycisk pobierania, w `<iframe src="...">` do podglądu dokumentu PDF bezpośrednio na podstronie ustawy.

### 4. Komisje Sejmowe (`/api/committees`)
Endpointy pozwalające na pobieranie danych o organach Sejmu.
*   `GET /api/committees/`
    *   **Zwraca:** Listę wszystkich komisji w obecnej kadencji.
*   `GET /api/committees/{committee_code}`
    *   **Zwraca:** Szczegóły dla danej komisji.

### 5. Healthcheck
*   `GET /api/health`
    *   Zwraca prosty status serwera `{"status": "ok"}`. Używany przez React do sprawdzenia, czy backend pomyślnie wystartował.
