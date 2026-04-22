import httpx
import logging
from typing import Optional, Any
from .cache import LocalCache
from .retry import retry_with_backoff

logger = logging.getLogger(__name__)

JSONDict = dict[str, Any]
JSONList = list[JSONDict]
JSONResponse = JSONDict | JSONList

class SejmAPIClient:
    """Client for Polish Sejm API (https://api.sejm.gov.pl/)"""
    
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
    
    @retry_with_backoff()
    async def get_mps(self, term: int = DEFAULT_TERM) -> JSONList:
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
    async def get_mp(self, mp_id: str, term: int = DEFAULT_TERM) -> JSONDict:
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
    
    @retry_with_backoff()
    async def get_bills(self, term: int = DEFAULT_TERM) -> JSONList:
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
    async def get_clubs(self, term: int = DEFAULT_TERM) -> JSONList:
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
    async def get_club(self, club_id: str, term: int = DEFAULT_TERM) -> JSONDict:
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
    async def get_committees(self, term: int = DEFAULT_TERM) -> JSONList:
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
    async def get_committee(self, committee_code: str, term: int = DEFAULT_TERM) -> JSONDict:
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
    
    @retry_with_backoff()
    async def get_votings(self, term: int = DEFAULT_TERM, sitting: Optional[str] = None, 
                         num: Optional[str] = None) -> JSONResponse:
        """Fetch votings data."""
        if sitting and num:
            cache_key = f"voting:term:{term}:sitting:{sitting}:num:{num}"
            path = f"/sejm/term{term}/votings/{sitting}/{num}"
        elif sitting:
            cache_key = f"votings:term:{term}:sitting:{sitting}"
            path = f"/sejm/term{term}/votings/{sitting}"
        else:
            cache_key = f"votings:term:{term}"
            path = f"/sejm/term{term}/votings"
        
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached
        
        response = await self.client.get(path)
        response.raise_for_status()
        data = response.json()
        
        self.cache.set(cache_key, data, self.VOTE_CACHE_TTL)
        logger.info(f"Successfully fetched votings data for term {term}")
        return data
    
    @retry_with_backoff()
    async def get_proceedings(self, term: int = DEFAULT_TERM, proceeding_id: Optional[str] = None) -> JSONResponse:
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
    async def get_processes(self, term: int = DEFAULT_TERM) -> JSONList:
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
    async def get_interpellations(self, term: int = DEFAULT_TERM) -> JSONList:
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
    async def get_written_questions(self, term: int = DEFAULT_TERM) -> JSONList:
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
