import logging
from typing import Optional
from ..core.retry import retry_with_backoff
from .base import BaseClient, JSONDict, JSONList

logger = logging.getLogger(__name__)


class MPsMixin(BaseClient):
    """Mixin providing MPs (Members of Parliament) related endpoints"""
    
    @retry_with_backoff()
    async def get_mps(self, term: int = BaseClient.DEFAULT_TERM) -> JSONList:
        """Fetch list of MPs (Members of Parliament)."""
        cache_key = f"mps:term:{term}"
        
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached
        
        response = await self.client.get(f"/sejm/term{term}/MP")
        response.raise_for_status()
        data = response.json()
        
        self.cache.set(cache_key, data, self.DATA_CACHE_TTL)
        logger.info(f"Successfully fetched MPs for term {term}")
        return data
    
    @retry_with_backoff()
    async def get_mp(self, mp_id: str, term: int = BaseClient.DEFAULT_TERM) -> JSONDict:
        """Fetch details of a specific MP."""
        cache_key = f"mp:term:{term}:id:{mp_id}"
        
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached
        
        response = await self.client.get(f"/sejm/term{term}/MP/{mp_id}")
        response.raise_for_status()
        data = response.json()
        
        self.cache.set(cache_key, data, self.DATA_CACHE_TTL)
        logger.info(f"Successfully fetched MP {mp_id}")
        return data