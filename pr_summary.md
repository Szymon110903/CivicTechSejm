# Pull Request: Wdrożenie hybrydowej synchronizacji posiedzeń (On-Demand + Background) oraz nowego układu aplikacji

## Opis Zmian

Niniejszy PR wprowadza istotne zmiany w architekturze pobierania danych z API Sejmu. Został zaimplementowany mechanizm "Hybrydowej Synchronizacji", który sprawia, że system samodzielnie uzupełnia brakujące posiedzenia. 

Przed tym PR, posiedzenia musiały być importowane ręcznie. Od teraz system dba o ich integralność dwutorowo:

### 1. Zmiany w Backendzie (Główne poprawki)
- **Auto-import w locie (On-Demand Fetching)**: Zmodyfikowano router `/api/votings/proceedings/{proceeding_id}`. Zamiast zwracać błąd 404 w przypadku braku posiedzenia, serwer usypia odpowiedź i automatycznie wywołuje serwis `import_proceeding_votings`, napełniając bazę danych przed odesłaniem świeżego wyniku do klienta.
- **Background Sync Task**: Dodano nowy, nienarzucający się proces działający w tle serwera FastAPI (`app/services/background_tasks.py`). Bazując na wbudowanym `asyncio`, sprawdza co 24 godziny jakie nowe posiedzenia pojawiły się na stronie Sejmu (odpytując `api.sejm.gov.pl`), porównuje z rekordami bazy i asynchronicznie scrapuje ewentualne braki.
- **Endpoint Proxy (`/api/proceedings`)**: Wprowadzono bezpieczny endpoint wystawiający listę posiedzeń dla Frontendu, który omija problemy z CORS i wykorzystuje cache FastAPI.

### 2. Aktualizacja Dokumentacji
- Zaktualizowano pule dokumentacji (`docs/frontend_api.md`, `docs/proxy.md`, `docs/backend_overview.md`), opisując zasady działania proxy, zachowanie ekranów ładowania na frontendzie oraz implementację zadań w tle (Lifespan serwera).

### 3. Zmiany we Frontendzie (Skrótowo)
- **Nowy Layout i Routing**: Wprowadzono nawigację boczną (Sidebar) i dodano bibliotekę `react-router-dom`, dzieląc aplikację na odrębne widoki (posiedzenia, głosowania).
- **Lista Posiedzeń**: Dodano podstronę listującą posiedzenia pobierane ze stworzonego Proxy-API (eleganckie kafelki).
- **Szczegóły Posiedzenia z informacją o ładowaniu**: Komponent wyświetlający detale reaguje na ewentualne spowolnienia z Backendu. Podczas pierwszego pobierania potężnych paczek danych z API Sejmu (On-Demand) frontend wyświetla specjalny komunikat proszący użytkownika o kilkanaście sekund cierpliwości. Usunięto również niekompletne dane wizualne z karty posiedzenia (godzina, zdeklarowani posłowie).

## Instrukcja wdrożenia / Testowania
Po zmergowaniu wymagane jest przebudowanie kontenerów Dockera (`docker compose up --build`), aby zainstalować nową paczkę (react-router-dom) oraz zaczytać do pamięci RAM nowy mechanizm pobierania w tle. 
