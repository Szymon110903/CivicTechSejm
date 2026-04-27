import logging
from ..core.retry import retry_with_backoff
from .base import BaseClient, JSONDict, JSONList

logger = logging.getLogger(__name__)


class OrgansMixin(BaseClient):
    """Mixin providing Organs (committees, clubs) related endpoints"""
    
    @retry_with_backoff()
    async def get_clubs(self, term: int = BaseClient.DEFAULT_TERM) -> JSONList:
        """Fetch list of clubs (parliamentary groups)."""
        cache_key = f"clubs:term:{term}"
        
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached
        
        response = await self.client.get(f"/sejm/term{term}/clubs")
        response.raise_for_status()
        data = response.json()
        
        self.cache.set(cache_key, data, self.COMMISSION_CACHE_TTL)
        logger.info(f"Successfully fetched clubs for term {term}")
        return data
    
    @retry_with_backoff()
    async def get_club(self, club_id: str, term: int = BaseClient.DEFAULT_TERM) -> JSONDict:
        """Fetch details of a specific club."""
        cache_key = f"club:term:{term}:id:{club_id}"
        
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached
        
        response = await self.client.get(f"/sejm/term{term}/clubs/{club_id}")
        response.raise_for_status()
        data = response.json()
        
        self.cache.set(cache_key, data, self.COMMISSION_CACHE_TTL)
        logger.info(f"Successfully fetched club {club_id}")
        return data
    
    @retry_with_backoff()
    async def get_committees(self, term: int = BaseClient.DEFAULT_TERM) -> JSONList:
        """Fetch list of committees."""
        cache_key = f"committees:term:{term}"
        
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached
        
        response = await self.client.get(f"/sejm/term{term}/committees")
        response.raise_for_status()
        data = response.json()
        
        self.cache.set(cache_key, data, self.COMMISSION_CACHE_TTL)
        logger.info(f"Successfully fetched committees for term {term}")
        return data
    
    @retry_with_backoff()
    async def get_committee(self, committee_code: str, term: int = BaseClient.DEFAULT_TERM) -> JSONDict:
        """Fetch details of a specific committee."""
        cache_key = f"committee:term:{term}:code:{committee_code}"
        
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached
        
        response = await self.client.get(f"/sejm/term{term}/committees/{committee_code}")
        response.raise_for_status()
        data = response.json()
        
        self.cache.set(cache_key, data, self.COMMISSION_CACHE_TTL)
        logger.info(f"Successfully fetched committee {committee_code}")
        return data