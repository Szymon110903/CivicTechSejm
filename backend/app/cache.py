from datetime import datetime, timedelta
from typing import Optional, Any
import logging

logger = logging.getLogger(__name__)

class CacheEntry:
    """Single cache entry with TTL"""
    
    def __init__(self, data: Any, ttl_seconds: int = 3600):
        self.data = data
        self.created_at = datetime.utcnow()
        self.ttl_seconds = ttl_seconds
    
    def is_expired(self) -> bool:
        """Check if cache entry has expired"""
        return datetime.utcnow() - self.created_at > timedelta(seconds=self.ttl_seconds)


class LocalCache:
    """Simple in-memory cache with TTL support"""
    
    def __init__(self, default_ttl: int = 3600):
        self.cache: dict[str, CacheEntry] = {}
        self.default_ttl = default_ttl
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        if key not in self.cache:
            return None
        
        entry = self.cache[key]
        if entry.is_expired():
            del self.cache[key]
            logger.debug(f"Cache miss (expired): {key}")
            return None
        
        logger.debug(f"Cache hit: {key}")
        return entry.data
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Store value in cache with optional TTL override"""
        ttl_to_use = ttl or self.default_ttl
        self.cache[key] = CacheEntry(value, ttl_to_use)
        logger.debug(f"Cache set: {key} (TTL: {ttl_to_use}s)")
    
    def delete(self, key: str) -> None:
        """Delete entry from cache"""
        if key in self.cache:
            del self.cache[key]
            logger.debug(f"Cache deleted: {key}")
    
    def clear(self) -> None:
        """Clear all cache entries"""
        self.cache.clear()
        logger.debug("Cache cleared")
    
    def get_stats(self) -> dict[str, int]:
        """Get cache statistics"""
        expired_count = sum(1 for e in self.cache.values() if e.is_expired())
        return {
            "total_entries": len(self.cache),
            "expired_entries": expired_count,
            "active_entries": len(self.cache) - expired_count
        }
