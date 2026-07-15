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

## Gdzie szukać kodu?

*   **Router Proxy (Backend)**: `backend/app/routers/proceedings.py`
*   **Klient komunikujący się z API Sejmu**: `backend/app/sejm_client/legislative.py`
*   **Konsument na Frontendzie**: `frontend/src/components/Proceedings/ProceedingsList.jsx`
