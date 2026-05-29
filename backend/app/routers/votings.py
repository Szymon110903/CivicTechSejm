from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..dependencies import get_sejm_client, get_db
from ..schemas import ProceedingVotingsResponseDTO, VotingDayDTO, VotingDTO, VotingResultsDTO, ClubVotingResultDTO, ClubVotingStatsDTO, SuccessResponseDTO, ErrorResponseDTO
from ..services.sejm_services import import_proceeding_votings
from ..models import Proceeding

router = APIRouter(prefix="/votings", tags=["Votings"])


@router.post("/import", response_model=SuccessResponseDTO, responses={500: {"model": ErrorResponseDTO}})
async def import_votings_endpoint(
    proceeding_id: str,
    term: int = 10,
    client = Depends(get_sejm_client),
    db: Session = Depends(get_db)
):
    """
    Import detailed voting data for a specific term and proceeding number from Sejm API.
    Saves and aggregates results in the database.
    """
    try:
        result = await import_proceeding_votings(db, client, term, proceeding_id)
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("message", "Import failed")
            )
        return SuccessResponseDTO(success=True, data=result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/proceedings/{proceeding_id}", response_model=ProceedingVotingsResponseDTO, responses={404: {"model": ErrorResponseDTO}})
async def get_proceeding_votings_endpoint(
    proceeding_id: str,
    term: int = 10,
    db: Session = Depends(get_db)
):
    """
    Retrieve stored voting data for a given proceeding, 
    grouped by day, with detailed voting and club statistics.
    """
    proceeding = db.query(Proceeding).filter_by(term=term, proceeding_id=str(proceeding_id)).first()
    if not proceeding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proceeding {proceeding_id} for term {term} not found in database. Run the import first."
        )
        
    days_dtos = []
    # Sort days by date to return chronological order
    sorted_days = sorted(proceeding.days, key=lambda d: d.date)
    
    for day in sorted_days:
        votings_dtos = []
        # Sort votings by voting_number
        sorted_votings = sorted(day.votings, key=lambda v: v.voting_number)
        
        for voting in sorted_votings:
            club_results_dtos = []
            # Sort club results alphabetically by club_id
            sorted_club_results = sorted(voting.club_results, key=lambda cr: cr.club_id)
            
            for cr in sorted_club_results:
                decision_val = cr.decision.value if hasattr(cr.decision, "value") else cr.decision
                club_results_dtos.append(ClubVotingResultDTO(
                    club_id=cr.club_id,
                    decision=decision_val,
                    stats=ClubVotingStatsDTO(
                        yes=cr.yes_count,
                        no=cr.no_count,
                        abstain=cr.abstain_count,
                        not_voted=cr.not_voted_count
                    ),
                    participation_percent=cr.participation_percent
                ))
            
            results_dto = VotingResultsDTO(
                passed=voting.passed,
                yes=voting.yes_count,
                no=voting.no_count,
                abstain=voting.abstain_count,
                not_voted=voting.not_voted,
                attendance=f"{int(voting.attendance_percent)}%"
            )
            
            votings_dtos.append(VotingDTO(
                voting_number=voting.voting_number,
                title=voting.title,
                description=voting.description,
                topic=voting.topic,
                results=results_dto,
                club_results=club_results_dtos
            ))
            
        days_dtos.append(VotingDayDTO(
            date=str(day.date),
            votings=votings_dtos
        ))
        
    return ProceedingVotingsResponseDTO(
        term=proceeding.term,
        proceeding_id=proceeding.proceeding_id,
        last_updated=proceeding.last_updated,
        days=days_dtos
    )
