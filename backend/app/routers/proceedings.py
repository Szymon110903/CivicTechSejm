from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..dependencies import get_sejm_client, get_db
from ..models import Proceeding, VotingDay, Voting

router = APIRouter(prefix="/proceedings", tags=["Proceedings"])

@router.get("/")
async def get_proceedings_endpoint(
    term: int = 10,
    client = Depends(get_sejm_client),
    db: Session = Depends(get_db)
):
    """
    Retrieve list of proceedings from Sejm API with local voting counts.
    """
    try:
        proceedings = await client.get_proceedings(term=term)
        
        # Query database for voting counts per proceeding_id in this term
        counts = (
            db.query(Proceeding.proceeding_id, func.count(Voting.id))
            .join(VotingDay, Proceeding.id == VotingDay.proceeding_id)
            .join(Voting, VotingDay.id == Voting.day_id)
            .filter(Proceeding.term == term)
            .group_by(Proceeding.proceeding_id)
            .all()
        )
        count_map = {str(proc_id): int(cnt) for proc_id, cnt in counts}
        
        for proc in proceedings:
            proc_num_str = str(proc.get("number", ""))
            proc["votings_count"] = count_map.get(proc_num_str, 0)
            
        return proceedings
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
