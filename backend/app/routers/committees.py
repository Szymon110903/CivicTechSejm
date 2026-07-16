from fastapi import APIRouter, Depends
from ..dependencies import get_sejm_client

router = APIRouter(prefix="/committees", tags=["Committees"])

@router.get("/")
async def get_committees(client = Depends(get_sejm_client)):
    """Fetch list of committees for the default term"""
    data = await client.get_committees()
    return {"success": True, "data": data}

@router.get("/{committee_code}")
async def get_committee(committee_code: str, client = Depends(get_sejm_client)):
    """Fetch details of a specific committee"""
    data = await client.get_committee(committee_code=committee_code)
    return {"success": True, "data": data}
