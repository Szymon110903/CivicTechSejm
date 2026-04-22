from fastapi import FastAPI, Path, Query
from contextlib import asynccontextmanager
import logging

from .sejm_client import SejmAPIClient
from .cache import LocalCache

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global client
cache = LocalCache(default_ttl=3600)
sejm_client = SejmAPIClient(cache=cache)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown
    await sejm_client.close()


app = FastAPI(
    title="CivicTechSejm API",
    version="0.1.0",
    description="API wrapper for Polish Sejm (Parliament) data",
    lifespan=lifespan
)


@app.get("/api/health")
async def health() -> dict[str, str]:
    """Health check endpoint"""
    return {
        "status": "ok",
        "message": "CivicTechSejm FastAPI backend is running"
    }


# ============== TERMS ==============

@app.get("/api/term")
async def get_terms():
    """Get available Sejm terms"""
    return {"success": True, "data": await sejm_client.get_terms()}


# ============== MPs ==============

@app.get("/api/mps")
async def get_mps(term: int = Query(10, description="Parliamentary term number")):
    """Get list of MPs (Members of Parliament)"""
    return {"success": True, "data": await sejm_client.get_mps(term=term)}


@app.get("/api/mps/{mp_id}")
async def get_mp(mp_id: str = Path(..., description="MP ID"),
                 term: int = Query(10, description="Parliamentary term number")):
    """Get details of a specific MP"""
    return {"success": True, "data": await sejm_client.get_mp(mp_id, term=term)}


# ============== BILLS ==============

@app.get("/api/bills")
async def get_bills(term: int = Query(10, description="Parliamentary term number")):
    """Get list of bills"""
    return {"success": True, "data": await sejm_client.get_bills(term=term)}


# ============== CLUBS ==============

@app.get("/api/clubs")
async def get_clubs(term: int = Query(10, description="Parliamentary term number")):
    """Get list of parliamentary clubs (groups)"""
    return {"success": True, "data": await sejm_client.get_clubs(term=term)}


@app.get("/api/clubs/{club_id}")
async def get_club(club_id: str = Path(..., description="Club ID"),
                   term: int = Query(10, description="Parliamentary term number")):
    """Get details of a specific club"""
    return {"success": True, "data": await sejm_client.get_club(club_id, term=term)}


# ============== COMMITTEES ==============

@app.get("/api/committees")
async def get_committees(term: int = Query(10, description="Parliamentary term number")):
    """Get list of parliamentary committees"""
    return {"success": True, "data": await sejm_client.get_committees(term=term)}


@app.get("/api/committees/{committee_code}")
async def get_committee(committee_code: str = Path(..., description="Committee code"),
                        term: int = Query(10, description="Parliamentary term number")):
    """Get details of a specific committee"""
    return {"success": True, "data": await sejm_client.get_committee(committee_code, term=term)}


# ============== VOTINGS ==============

@app.get("/api/votings")
async def get_votings(term: int = Query(10, description="Parliamentary term number")):
    """Get votings data grouped by day"""
    return {"success": True, "data": await sejm_client.get_votings(term=term)}


@app.get("/api/votings/{sitting}")
async def get_votings_for_sitting(sitting: str = Path(..., description="Sitting number"),
                                  term: int = Query(10, description="Parliamentary term number")):
    """Get votings for a specific sitting"""
    return {"success": True, "data": await sejm_client.get_votings(term=term, sitting=sitting)}


@app.get("/api/votings/{sitting}/{num}")
async def get_voting_details(sitting: str = Path(..., description="Sitting number"),
                             num: str = Path(..., description="Voting number"),
                             term: int = Query(10, description="Parliamentary term number")):
    """Get details of a specific voting"""
    return {"success": True, "data": await sejm_client.get_votings(term=term, sitting=sitting, num=num)}


# ============== PROCEEDINGS ==============

@app.get("/api/proceedings")
async def get_proceedings(term: int = Query(10, description="Parliamentary term number")):
    """Get list of parliamentary proceedings (sessions)"""
    return {"success": True, "data": await sejm_client.get_proceedings(term=term)}


@app.get("/api/proceedings/{proceeding_id}")
async def get_proceeding(proceeding_id: str = Path(..., description="Proceeding ID"),
                         term: int = Query(10, description="Parliamentary term number")):
    """Get details of a specific proceeding"""
    return {"success": True, "data": await sejm_client.get_proceedings(term=term, proceeding_id=proceeding_id)}


# ============== PROCESSES ==============

@app.get("/api/processes")
async def get_processes(term: int = Query(10, description="Parliamentary term number")):
    """Get legislative processes"""
    return {"success": True, "data": await sejm_client.get_processes(term=term)}


# ============== INTERPELLATIONS ==============

@app.get("/api/interpellations")
async def get_interpellations(term: int = Query(10, description="Parliamentary term number")):
    """Get list of interpellations"""
    return {"success": True, "data": await sejm_client.get_interpellations(term=term)}


# ============== WRITTEN QUESTIONS ==============

@app.get("/api/writtenQuestions")
async def get_written_questions(term: int = Query(10, description="Parliamentary term number")):
    """Get list of written questions"""
    return {"success": True, "data": await sejm_client.get_written_questions(term=term)}


# ============== CACHE MANAGEMENT ==============

@app.get("/api/cache/stats")
async def get_cache_stats():
    """Get cache statistics"""
    stats = cache.get_stats()
    return {"success": True, "cache_stats": stats}


@app.post("/api/cache/clear")
async def clear_cache():
    """Clear all cached data"""
    cache.clear()
    return {"success": True, "message": "Cache cleared"}
