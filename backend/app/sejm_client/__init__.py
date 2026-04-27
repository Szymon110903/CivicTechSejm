"""Sejm API Client with separated concerns across multiple modules"""

from typing import Optional
from ..core.cache import LocalCache
from .base import BaseClient
from .mps import MPsMixin
from .organs import OrgansMixin
from .votings import VotingsMixin
from .legislative import LegislativeMixin


class SejmAPIClient(MPsMixin, OrgansMixin, VotingsMixin, LegislativeMixin, BaseClient):
    """
    Main Sejm API client combining all domain-specific modules using mixins.
    
    Provides unified access to:
    - MPs (Members of Parliament)
    - Organs (committees, clubs)
    - Votings data
    - Legislative data (terms, proceedings, processes, etc.)
    
    Uses BaseClient for HTTP, caching, and retry logic.
    """
    
    def __init__(self, cache: Optional[LocalCache] = None):
        super().__init__(cache=cache)


__all__ = ["SejmAPIClient"]