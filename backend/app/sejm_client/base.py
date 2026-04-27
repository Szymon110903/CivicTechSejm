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
        self.client = httpx.AsyncClient(base_url=self.BASE_URL, timeout=10)
        self.cache = cache or LocalCache(default_ttl=self.VOTE_CACHE_TTL)
    
    async def close(self):
        await self.client.aclose()
