import logging
from typing import Optional
from ..core.retry import retry_with_backoff
from .base import BaseClient, JSONDict, JSONList, JSONResponse

logger = logging.getLogger(__name__)


class LegislativeMixin(BaseClient):
    """Mixin providing legislative data endpoints (terms, proceedings, processes, etc.)"""
    
    @retry_with_backoff()
    async def get_terms(self) -> JSONList:
        """Fetch available Sejm terms."""
        cache_key = "terms"
        
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached
        
        response = await self.client.get("/sejm/term")
        response.raise_for_status()
        data = response.json()
        
        self.cache.set(cache_key, data, self.COMMISSION_CACHE_TTL)
        logger.info("Successfully fetched available terms")
        return data
    
    @retry_with_backoff()
    async def get_bills(self, term: int = BaseClient.DEFAULT_TERM) -> JSONList:
        """Fetch list of bills."""
        cache_key = f"bills:term:{term}"
        
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached
        
        response = await self.client.get(f"/sejm/term{term}/bills")
        response.raise_for_status()
        data = response.json()
        
        self.cache.set(cache_key, data, self.DATA_CACHE_TTL)
        logger.info(f"Successfully fetched bills for term {term}")
        return data
    
    @retry_with_backoff()
    async def get_proceedings(self, term: int = BaseClient.DEFAULT_TERM, proceeding_id: Optional[str] = None) -> JSONResponse:
        """Fetch proceedings (parliamentary sessions)."""
        if proceeding_id:
            cache_key = f"proceeding:term:{term}:id:{proceeding_id}"
            path = f"/sejm/term{term}/proceedings/{proceeding_id}"
        else:
            cache_key = f"proceedings:term:{term}"
            path = f"/sejm/term{term}/proceedings"
        
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached
        
        response = await self.client.get(path)
        response.raise_for_status()
        data = response.json()
        
        self.cache.set(cache_key, data, self.DATA_CACHE_TTL)
        logger.info(f"Successfully fetched proceedings for term {term}")
        return data
    
    @retry_with_backoff()
    async def get_processes(self, term: int = BaseClient.DEFAULT_TERM) -> JSONList:
        """Fetch legislative processes."""
        cache_key = f"processes:term:{term}"
        
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached
        
        response = await self.client.get(f"/sejm/term{term}/processes")
        response.raise_for_status()
        data = response.json()
        
        self.cache.set(cache_key, data, self.DATA_CACHE_TTL)
        logger.info(f"Successfully fetched processes for term {term}")
        return data
    
    @retry_with_backoff()
    async def get_interpellations(self, term: int = BaseClient.DEFAULT_TERM) -> JSONList:
        """Fetch interpellations."""
        cache_key = f"interpellations:term:{term}"
        
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached
        
        response = await self.client.get(f"/sejm/term{term}/interpellations")
        response.raise_for_status()
        data = response.json()
        
        self.cache.set(cache_key, data, self.DATA_CACHE_TTL)
        logger.info(f"Successfully fetched interpellations for term {term}")
        return data
    
    @retry_with_backoff()
    async def get_written_questions(self, term: int = BaseClient.DEFAULT_TERM) -> JSONList:
        """Fetch written questions."""
        cache_key = f"written_questions:term:{term}"
        
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached
        
        response = await self.client.get(f"/sejm/term{term}/writtenQuestions")
        response.raise_for_status()
        data = response.json()
        
        self.cache.set(cache_key, data, self.DATA_CACHE_TTL)
        logger.info(f"Successfully fetched written questions for term {term}")
        return data

    @retry_with_backoff()
    async def get_print(self, num: str, term: int = BaseClient.DEFAULT_TERM) -> JSONDict:
        """Fetch information about a specific print."""
        cache_key = f"print:term:{term}:num:{num}"
        
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached
            
        response = await self.client.get(f"/sejm/term{term}/prints/{num}")
        response.raise_for_status()
        data = response.json()
        
        self.cache.set(cache_key, data, self.DATA_CACHE_TTL)
        logger.info(f"Successfully fetched print {num} for term {term}")
        return data

    @retry_with_backoff()
    async def download_print_attachment(self, num: str, attach_name: str, term: int = BaseClient.DEFAULT_TERM) -> bytes:
        """Download a specific attachment for a print (returns raw bytes)."""
        # We don't cache binary files in the basic LocalCache.
        response = await self.client.get(f"/sejm/term{term}/prints/{num}/{attach_name}")
        response.raise_for_status()
        logger.info(f"Successfully downloaded attachment {attach_name} for print {num} (term {term})")
        return response.content