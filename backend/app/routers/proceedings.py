from fastapi import APIRouter, Depends, HTTPException, status
from ..dependencies import get_sejm_client

router = APIRouter(prefix="/proceedings", tags=["Proceedings"])

@router.get("/")
async def get_proceedings_endpoint(
    term: int = 10,
    client = Depends(get_sejm_client)
):
    """
    Retrieve list of proceedings from Sejm API.
    """
    try:
        proceedings = await client.get_proceedings(term=term)
        return proceedings
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
