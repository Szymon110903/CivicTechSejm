from fastapi import APIRouter, Depends
from ..dependencies import get_sejm_client

router = APIRouter(prefix="/mps", tags=["MPs"])

@router.get("/")
async def get_mps(client = Depends(get_sejm_client)):
    """Fetch list of MPs for the default term (10)"""
    data = await client.get_mps()
    return {"success": True, "data": data}

@router.get("/{mp_id}")
async def get_mp(mp_id: str, client = Depends(get_sejm_client)):
    """Fetch details of a specific MP"""
    data = await client.get_mp(mp_id)
    return {"success": True, "data": data}