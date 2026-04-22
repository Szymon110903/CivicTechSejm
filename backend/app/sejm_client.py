import httpx
import logging
from typing import Optional, Any
from datetime import datetime, timedelta
from .cache import LocalCache
from .retry import retry_with_backoff, RetryConfig

logger = logging.getLogger(__name__)

class SejmAPIClient:
    """Client for Polish Sejm API (https://api.sejm.gov.pl/)"""
    
    BASE_URL = "https://api.sejm.gov.pl"
    VOTE_CACHE_TTL = 3600  # 1 hour
    DEPUTY_CACHE_TTL = 3600  # 1 hour
    COMMISSION_CACHE_TTL = 86400  # 24 hours
    
    def __init__(self, timeout: int = 10, cache: Optional[LocalCache] = None):
        self.timeout = timeout
        self.client = httpx.Client(base_url=self.BASE_URL, timeout=timeout)
        self.cache = cache or LocalCache(default_ttl=self.VOTE_CACHE_TTL)
        self.retry_config = RetryConfig(max_retries=3, initial_delay=1.0)
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.client.close()
    
    async def close(self):
        await self.client.aclose()
    
    @retry_with_backoff()
    def get_votes(self, page: int = 1, limit: int = 50) -> dict[str, Any]:
        """
        Fetch voting records with pagination (with caching).
        
        Args:
            page: Page number (1-indexed)
            limit: Records per page (max 100)
        
        Returns:
            dict with votes data and pagination info
        """
        cache_key = f"votes:page:{page}:limit:{limit}"
        
        # Check cache first
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached
        
        response = self.client.get(
            "/sejm/SQL?CMD=WYBORYA",
            params={"pageNumber": page, "pageSize": limit}
        )
        response.raise_for_status()
        data = response.json()
        
        # Cache the result
        self.cache.set(cache_key, data, self.VOTE_CACHE_TTL)
        logger.info(f"Successfully fetched votes page {page}")
        return data
    
    @retry_with_backoff()
    def get_vote_details(self, vote_id: str) -> dict[str, Any]:
        """
        Fetch details of a specific vote (with caching).
        
        Args:
            vote_id: Vote ID
        
        Returns:
            dict with vote details
        """
        cache_key = f"vote:details:{vote_id}"
        
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached
        
        response = self.client.get(f"/sejm/SQL?CMD=GŁOSY&WYB={vote_id}")
        response.raise_for_status()
        data = response.json()
        
        self.cache.set(cache_key, data, self.VOTE_CACHE_TTL)
        logger.info(f"Successfully fetched vote details {vote_id}")
        return data
    
    @retry_with_backoff()
    def get_deputies(self, page: int = 1, limit: int = 50) -> dict[str, Any]:
        """
        Fetch list of deputies/parliamentarians (with caching).
        
        Args:
            page: Page number (1-indexed)
            limit: Records per page
        
        Returns:
            dict with deputies data
        """
        cache_key = f"deputies:page:{page}:limit:{limit}"
        
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached
        
        response = self.client.get(
            "/sejm/SQL?CMD=POSLOWIE",
            params={"pageNumber": page, "pageSize": limit}
        )
        response.raise_for_status()
        data = response.json()
        
        self.cache.set(cache_key, data, self.DEPUTY_CACHE_TTL)
        logger.info(f"Successfully fetched deputies page {page}")
        return data
    
    @retry_with_backoff()
    def get_commissions(self) -> dict[str, Any]:
        """
        Fetch list of parliamentary commissions (with caching).
        
        Returns:
            dict with commissions data
        """
        cache_key = "commissions"
        
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached
        
        response = self.client.get("/sejm/SQL?CMD=KOMISJE")
        response.raise_for_status()
        data = response.json()
        
        self.cache.set(cache_key, data, self.COMMISSION_CACHE_TTL)
        logger.info("Successfully fetched commissions")
        return data
