import httpx
import logging
from typing import Optional, Any
from ..core.cache import LocalCache
from ..core.retry import retry_with_backoff

logger = logging.getLogger(__name__)

JSONDict = dict[str, Any]
JSONList = list[JSONDict]
JSONResponse = JSONDict | JSONList


class BaseClient:
    """Base class for Sejm API client with common HTTP, cache, and retry functionality"""
    
    BASE_URL = "https://api.sejm.gov.pl"
    DEFAULT_TERM = 10
    VOTE_CACHE_TTL = 3600
    DATA_CACHE_TTL = 3600
    COMMISSION_CACHE_TTL = 86400
    
    def __init__(self, cache: Optional[LocalCache] = None):
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9,pl;q=0.8"
        }
        self.client = httpx.AsyncClient(base_url=self.BASE_URL, timeout=10, headers=headers, http2=True)
        self.cache = cache or LocalCache(default_ttl=self.VOTE_CACHE_TTL)
    
    def _parse_response(self, response: httpx.Response) -> JSONResponse:
        response.raise_for_status()
        content_type = response.headers.get("content-type", "")
        if "application/json" not in content_type.lower():
            logger.error(f"Unexpected content type {content_type} from {response.url}. Response: {response.text[:200]}")
            raise ValueError(f"Sejm API returned non-JSON response (WAF block or error).")
        return response.json()
    
    async def close(self):
        await self.client.aclose()
