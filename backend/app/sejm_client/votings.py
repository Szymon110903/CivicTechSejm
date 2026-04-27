import logging
from typing import Optional
from ..core.retry import retry_with_backoff
from .base import BaseClient, JSONResponse

logger = logging.getLogger(__name__)


class VotingsMixin(BaseClient):
    """Mixin providing Votings related endpoints"""
    
    @retry_with_backoff()
    async def get_votings(self, term: int = BaseClient.DEFAULT_TERM, sitting: Optional[str] = None, 
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