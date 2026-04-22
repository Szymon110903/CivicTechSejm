from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
import logging

from .sejm_client import SejmAPIClient
from .cache import LocalCache

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="CivicTechSejm API", version="0.1.0")

# Initialize cache and client
cache = LocalCache(default_ttl=3600)
sejm_client = SejmAPIClient(cache=cache)


@app.get("/api/health")
def health() -> dict[str, str]:
    """Health check endpoint"""
    return {
        "status": "ok",
        "message": "CivicTechSejm FastAPI backend is running"
    }


@app.get("/api/votes")
def get_votes(page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=100)):
    """
    Fetch voting records with pagination.
    
    - **page**: Page number (1-indexed)
    - **limit**: Records per page (1-100)
    """
    try:
        result = sejm_client.get_votes(page=page, limit=limit)
        return {
            "success": True,
            "data": result,
            "pagination": {"page": page, "limit": limit}
        }
    except Exception as e:
        logger.error(f"Error fetching votes: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch votes: {str(e)}"
        )


@app.get("/api/votes/{vote_id}")
def get_vote_details(vote_id: str):
    """
    Fetch details of a specific vote.
    
    - **vote_id**: Vote ID from Sejm API
    """
    try:
        result = sejm_client.get_vote_details(vote_id=vote_id)
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        logger.error(f"Error fetching vote {vote_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch vote details: {str(e)}"
        )


@app.get("/api/deputies")
def get_deputies(page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=100)):
    """
    Fetch list of deputies/parliamentarians.
    
    - **page**: Page number (1-indexed)
    - **limit**: Records per page (1-100)
    """
    try:
        result = sejm_client.get_deputies(page=page, limit=limit)
        return {
            "success": True,
            "data": result,
            "pagination": {"page": page, "limit": limit}
        }
    except Exception as e:
        logger.error(f"Error fetching deputies: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch deputies: {str(e)}"
        )


@app.get("/api/commissions")
def get_commissions():
    """
    Fetch list of parliamentary commissions.
    """
    try:
        result = sejm_client.get_commissions()
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        logger.error(f"Error fetching commissions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch commissions: {str(e)}"
        )


@app.get("/api/cache/stats")
def get_cache_stats():
    """
    Get cache statistics.
    """
    stats = cache.get_stats()
    return {
        "success": True,
        "cache_stats": stats
    }


@app.post("/api/cache/clear")
def clear_cache():
    """
    Clear all cached data.
    """
    cache.clear()
    return {
        "success": True,
        "message": "Cache cleared"
    }

