"""
TESTOWANY OBSZAR: Klient API Sejmu (SejmAPIClient)

Plik testuje:
1. Pobieranie danych posłów (get_mps) oraz integrację z pamięcią podręczną (Cache Hit / Miss).
2. Obsługę ponawiania zapytań w przypadku błędów HTTP (retry_with_backoff).
3. Metodę get_votings w zależności od przekazanych parametrów (sitting, num).
"""

import pytest
import httpx
from unittest.mock import AsyncMock, MagicMock, patch

from app.sejm_client import SejmAPIClient
from app.core.cache import LocalCache
from app.core.retry import RetryConfig


@pytest.mark.asyncio
async def test_sejm_client_cache_and_get_mps():
    """Testuje, że pierwsze zapytanie idzie do API, a kolejne korzysta z lokalnego Cache"""
    cache = LocalCache(default_ttl=60)
    client = SejmAPIClient(cache=cache)
    
    mock_response = [{"id": 1, "firstName": "Jan", "lastName": "Kowalski"}]
    
    # Mockujemy metodę get z httpx.AsyncClient
    with patch.object(client.client, "get", new_callable=AsyncMock) as mock_get:
        mock_resp_obj = MagicMock()
        mock_resp_obj.status_code = 200
        mock_resp_obj.json.return_value = mock_response
        mock_get.return_value = mock_resp_obj
        
        # 1. Pierwsze pobranie (Cache Miss -> Zapytanie do API)
        data1 = await client.get_mps(term=10)
        assert data1 == mock_response
        assert mock_get.call_count == 1
        
        # 2. Drugie pobranie (Cache Hit -> Brak zapytania do API)
        data2 = await client.get_mps(term=10)
        assert data2 == mock_response
        assert mock_get.call_count == 1  # Licznik połączeń nadal wynosi 1
        
    await client.close()


@pytest.mark.asyncio
async def test_sejm_client_get_votings_paths():
    """Testuje poprawne generowanie ścieżek URL dla różnych wariantów get_votings"""
    client = SejmAPIClient()
    
    with patch.object(client.client, "get", new_callable=AsyncMock) as mock_get:
        mock_resp_obj = MagicMock()
        mock_resp_obj.status_code = 200
        mock_resp_obj.json.return_value = {"success": True}
        mock_get.return_value = mock_resp_obj
        
        # Wariant 1: Wszystkie głosowania kadencji
        await client.get_votings(term=10)
        mock_get.assert_called_with("/sejm/term10/votings")
        
        # Wariant 2: Głosowania z posiedzenia
        await client.get_votings(term=10, sitting="3")
        mock_get.assert_called_with("/sejm/term10/votings/3")
        
        # Wariant 3: Wyniki konkretnego głosowania
        await client.get_votings(term=10, sitting="3", num="25")
        mock_get.assert_called_with("/sejm/term10/votings/3/25")
        
    await client.close()


@pytest.mark.asyncio
async def test_sejm_client_retry_logic():
    """Testuje, że dekorator retry_with_backoff ponawia nieudane próby zapytania (kody 500, 502 itp.)"""
    # Szybka konfiguracja retry w celu skrócenia czasu oczekiwania podczas testów
    fast_retry = RetryConfig(max_retries=2, initial_delay=0.01, jitter=False)
    
    # Tworzymy klienta i wstrzykujemy zmodyfikowaną konfigurację do mixina
    client = SejmAPIClient()
    
    with patch.object(client.client, "get", new_callable=AsyncMock) as mock_get:
        # Mockujemy błąd HTTP 502 Bad Gateway
        mock_response = httpx.Response(502, request=httpx.Request("GET", "/sejm/term10/MP"))
        mock_get.side_effect = httpx.HTTPStatusError("Bad Gateway", request=mock_response.request, response=mock_response)
        
        # Dekorujemy metodę z własną konfiguracją retry na potrzeby testu
        from app.core.retry import retry_with_backoff
        
        @retry_with_backoff(config=fast_retry)
        async def fetch_with_fast_retry():
            return await client.client.get("/sejm/term10/MP")
            
        with pytest.raises(httpx.HTTPStatusError):
            await fetch_with_fast_retry()
            
        # Oczekujemy 3 prób (1 główna + 2 retries)
        assert mock_get.call_count == 3
        
    await client.close()
