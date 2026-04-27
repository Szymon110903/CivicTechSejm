#  plik do definiowania zależności, takich jak klient API i cache

from .core.cache import LocalCache
from .sejm_client import SejmAPIClient

_cache = LocalCache(default_ttl=3600)
_sejm_client = SejmAPIClient(cache=_cache)

async def get_sejm_client() -> SejmAPIClient:
    """Zwraca gotowego klienta API Sejmu."""
    return _sejm_client