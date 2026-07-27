from fastapi import APIRouter, Depends, Query
from ..dependencies import get_sejm_client

router = APIRouter(prefix="/mps", tags=["MPs"])

@router.get("/")
async def get_mps(
    active_only: bool = Query(True, description="Return only currently active MPs in the term (460 MPs)"),
    client = Depends(get_sejm_client)
):
    """Fetch list of MPs for the default term (10)"""
    data = await client.get_mps()
    if active_only and isinstance(data, list):
        data = [mp for mp in data if mp.get("active", True) is True]
    return {"success": True, "data": data}

@router.get("/{mp_id}")
async def get_mp(mp_id: str, client = Depends(get_sejm_client)):
    """Fetch details of a specific MP"""
    data = await client.get_mp(mp_id)
    return {"success": True, "data": data}