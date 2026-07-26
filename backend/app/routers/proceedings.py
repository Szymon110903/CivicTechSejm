from datetime import date
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
        
        valid_proceedings = []
        today_str = date.today().isoformat()
        
        for proc in proceedings:
            proc_num = proc.get("number")
            # Exclude proceedings with no number, number 0, or invalid numbers
            if not proc_num or int(proc_num) <= 0:
                continue
                
            title = str(proc.get("title", "")).lower()
            if "planowane" in title:
                continue
                
            dates = proc.get("dates", [])
            # If the first date of the proceeding is strictly in the future, exclude it
            if dates and str(dates[0]) > today_str:
                continue
                
            proc_num_str = str(proc_num)
            cnt = count_map.get(proc_num_str, 0)
            proc["votings_count"] = cnt
            
            # If start date is today or future AND zero votings, also exclude it
            if dates and str(dates[0]) >= today_str and cnt == 0:
                continue
                
            valid_proceedings.append(proc)
            
        return valid_proceedings
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
