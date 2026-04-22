import time
import logging
from typing import Callable, TypeVar, Any
from functools import wraps
import httpx

logger = logging.getLogger(__name__)

T = TypeVar('T')

class RetryConfig:
    """Configuration for retry logic"""
    
    def __init__(
        self,
        max_retries: int = 3,
        initial_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        jitter: bool = True,
        retryable_codes: list[int] = None
    ):
        self.max_retries = max_retries
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter
        self.retryable_codes = retryable_codes or [429, 500, 502, 503, 504]
    
    def get_delay(self, attempt: int) -> float:
        """Calculate delay for given attempt number with exponential backoff"""
        delay = self.initial_delay * (self.exponential_base ** attempt)
        delay = min(delay, self.max_delay)
        
        if self.jitter:
            import random
            delay = delay * (0.5 + random.random())
        
        return delay


def retry_with_backoff(config: RetryConfig = None):
    """
    Decorator for retrying functions with exponential backoff.
    
    Retries on:
    - Network errors (ConnectionError, Timeout)
    - HTTP errors with retryable status codes (429, 5xx)
    
    Args:
        config: RetryConfig instance (uses defaults if None)
    """
    if config is None:
        config = RetryConfig()
    
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            last_exception = None
            
            for attempt in range(config.max_retries + 1):
                try:
                    result = func(*args, **kwargs)
                    if attempt > 0:
                        logger.info(f"{func.__name__} succeeded after {attempt} retries")
                    return result
                
                except httpx.HTTPStatusError as e:
                    if e.response.status_code not in config.retryable_codes:
                        logger.error(f"{func.__name__} failed with non-retryable status {e.response.status_code}")
                        raise
                    last_exception = e
                    
                except (httpx.ConnectError, httpx.TimeoutException, httpx.NetworkError) as e:
                    last_exception = e
                
                if attempt < config.max_retries:
                    delay = config.get_delay(attempt)
                    logger.warning(
                        f"{func.__name__} attempt {attempt + 1}/{config.max_retries + 1} failed, "
                        f"retrying in {delay:.2f}s... Error: {last_exception}"
                    )
                    time.sleep(delay)
            
            logger.error(f"{func.__name__} failed after {config.max_retries + 1} attempts")
            raise last_exception or Exception(f"{func.__name__} failed")
        
        return wrapper
    return decorator
