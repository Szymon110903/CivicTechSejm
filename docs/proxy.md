# Dokumentacja: Endpointy Proxy (np. `/api/proceedings`)

## Wprowadzenie

Architektura aplikacji `CivicTechSejm` została zaprojektowana w taki sposób, aby oddzielić Frontend od bezpośrednich wywołań do publicznego API Sejmu (api.sejm.gov.pl). Rolę pośrednika (tzw. Proxy) pełni nasz lokalny Backend w FastAPI.

## Dlaczego używamy Proxy zamiast pobierać dane prosto z Frontendu?

Głównym powodem wprowadzenia endpointów takich jak `GET /api/proceedings/` na własnym backendzie są:

1. **Ominięcie problemów z CORS (Cross-Origin Resource Sharing)**: 
   Przeglądarki internetowe często blokują żądania z lokalnego adresu (np. `localhost:3000`) do zewnętrznych domen, jeśli serwer docelowy nie ma włączonej obsługi odpowiednich nagłówków. API Sejmu czasem bywa kapryśne pod tym względem. Wywołując własny backend (`/api/...`) mamy pełną kontrolę nad nagłówkami.
2. **Mechanizm Cache (Pamięć podręczna)**:
   Backend posiada wbudowany moduł cache (`LocalCache`), który pamięta odpowiedzi na konkretne zapytania przez pewien czas (np. TTL). 
   Gdy użytkownik wchodzi na zakładkę "Posiedzenia", frontend pyta backend, a backend sprawdza cache. Jeśli dane tam są, zwraca je natychmiast – **bez wysyłania zbędnego ruchu do serwerów państwowych**. Chroni to przed potencjalnym rate-limitingiem ze strony API Sejmu.
3. **Możliwość transformacji i walidacji**:
   Backend może przetworzyć, odfiltrować lub znormalizować dane zanim wyśle je do Reacta. Frontend dzięki temu otrzymuje tylko to, co faktycznie musi narysować na ekranie, co przyspiesza działanie aplikacji po stronie klienta.
4. **Ponowne wykorzystanie klienta (`SejmAPIClient`)**:
   Backend ma już wdrożone mechanizmy Retry (ponawianie żądania po błędzie - `retry_with_backoff`) i obsługę błędów sieciowych. Frontend nie musi martwić się o logikę łączenia.

## Jak działa przepływ danych (Data Flow)

1. Użytkownik wchodzi na stronę z Posiedzeniami (`/`).
2. Komponent React (`ProceedingsList.jsx`) wykonuje asynchroniczne żądanie: `fetch('/api/proceedings/')`.
3. Żądanie trafia do Nginx (jeśli działa w Dockerze), który przekierowuje je na port 8000 (Backend FastAPI).
4. FastAPI łapie żądanie w routerze `proceedings.py`.
5. Uruchamia się metoda klienta `await client.get_proceedings(term=10)`.
6. `SejmAPIClient` sprawdza lokalny Cache w poszukiwaniu gotowej odpowiedzi.
    - Jeśli **JEST** w cache: Zwraca dane błyskawicznie.
    - Jeśli **NIE MA**: Wykonuje faktyczne żądanie HTTP do `https://api.sejm.gov.pl/sejm/term10/proceedings`, zapisuje wynik do cache i dopiero oddaje dane do routera.
7. Router FastAPI zwraca dane jako JSON do Reacta.
8. React renderuje listę kart (`ProceedingCard.jsx`).

## Zjawisko Hybrydowej Synchronizacji

Dla endpointów zwracających potężną ilość danych (jak szczegóły ze wszystkimi głosami danego posiedzenia: `/api/votings/proceedings/{id}`), zaimplementowaliśmy strategię 2-poziomową:

1. **On-Demand Fetching (Pobieranie w Locie)**: Zamiast zwracać "404 Not Found" gdy użytkownik zażąda posiedzenia którego jeszcze nie mamy zescrapowanego, API usypia na kilkanaście sekund, wywołuje w tle `import_proceeding_votings`, a następnie serwuje świeże dane. 
2. **Background Sync Task**: Jako wsparcie, backend uruchamia przy starcie cichy, asynchroniczny task, który co 24 godziny odpytuje serwery o braki w naszych rekordach i uzupełnia je w tle. Odciąża to pierwsze żądanie użytkownika.

## Analityka Klubowa i Filtracja Mandatów (Proxy & Cache)

W ramach rozwoju modułu statystyk klubowych (`/api/clubs`) wdrożono zaawansowaną obsługę pamięci podręcznej oraz dynamiczną filtrację mandatów na poziomie Proxy:

1. **Cache Wyników Analitycznych (`analytics_cache`)**:
   Obliczanie wskaźników kohezji (spójności), frekwencji klubowej, macierzy zgodności NxN czy indeksu buntowników dla setek głosowań jest operacją obciążającą procesor i bazę danych. Dlatego wszystkie endpointy w routerze `clubs.py` (`/api/clubs`, `/api/clubs/compare`, `/api/clubs/matrix`, `/api/clubs/{id}/stats`, `/api/clubs/filter`) korzystają z pamięci podręcznej w pamięci RAM z czasem wygaśnięcia TTL (5 minut) oraz nagłówkiem HTTP `Cache-Control: public, max-age=300`. Klucz pamięci podręcznej uwzględnia wszystkie aktywne filtry (daty, frekwencję, tematykę, stykowe głosowania).

2. **Problem rotacji mandatów w trakcie kadencji (559 vs 460 posłów)**:
   W trakcie trwania X kadencji Sejmu dochodzi do wygaszania mandatów, zmian barw partyjnych oraz powstawania i rozwiązywania kół poselskich. Bez odpowiedniej filtracji, zsumowanie członków wszystkich klubów historycznych oraz posłów występujących w rekordach głosowań daje **559 posłów** w **16 klubach/kołach**.

3. **Dynamiczna weryfikacja aktywnych mandatów przez Proxy (`active_only=True`)**:
   Aby zapewnić rzetelność analityki i odzwierciedlać aktualny układ sił w Parlamencie, backend w locie wykorzystuje klienta `SejmAPIClient` do odpytania oficjalnego API Sejmu o bieżącą listę posłów (funkcja pomocnicza `get_active_mps_info`).
   - **Gdy `active_only=True` (domyślnie)**: Proxy bierze pod uwagę wyłącznie posłów ze statusem `active == True`. Kluby i koła historyczne o aktualnej liczbie aktywnych posłów równej `0` są automatycznie ukrywane. Suma liczby posłów w zestawieniach wynosi wówczas dokładnie **460**, a statystyki buntowników i absencji nie uwzględniają osób, które przestały pełnić mandat.
   - **Gdy `active_only=False`**: Przełącznik w interfejsie użytkownika umożliwia powrót do pełnego ujęcia historycznego z całej kadencji (uwzględniającego wszystkie 16 klubów/kół i 559 posłów).

4. **Kaskadowa obsługa filtrów analitycznych**:
   Przekazywane przez frontend filtry (np. suwak minimalnej frekwencji `min_attendance`, przedział czasowy `date_from`/`date_to`, głosowania stykowe `close_votings_only`) są normalizowane i procesowane na poziomie warstwy Proxy zoptymalizowanym zapytaniem w SQLAlchemy (`filter_votings_query`), zapewniając spójność danych w każdym podwidoku panelu klubowego.

## Gdzie szukać kodu?

*   **Router Proxy i Analityka Klubowa (Backend)**: `backend/app/routers/proceedings.py`, `backend/app/routers/votings.py` oraz `backend/app/routers/clubs.py`
*   **Klient komunikujący się z API Sejmu**: `backend/app/sejm_client/legislative.py`, `backend/app/sejm_client/mps.py`
*   **Zadania w tle i mechanizm Cache**: `backend/app/services/background_tasks.py`, `backend/app/core/cache.py`
*   **Konsument na Frontendzie**: `frontend/src/components/Proceedings/` oraz pulpit analityki klubowej w `frontend/src/components/Clubs/` (w tym `ClubsDashboard.jsx`, `ClubsOverview.jsx`, `ClubComparison.jsx`, `AgreementMatrix.jsx`, `ClubDetailRebels.jsx`, `ClubBehaviorSearch.jsx`)
