from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..dependencies import get_sejm_client, get_db
from ..schemas import (
    ProceedingVotingsResponseDTO, VotingDayDTO, VotingDTO, VotingResultsDTO, 
    ClubVotingResultDTO, ClubVotingStatsDTO, SuccessResponseDTO, ErrorResponseDTO,
    PaginatedVotingsResponseDTO, GlobalVotingDTO
)
from ..services.sejm_services import import_proceeding_votings
from ..services.document_service import DocumentService
from ..models import Proceeding, Voting, VotingDay, Bill, BillDocument
import re

router = APIRouter(prefix="/votings", tags=["Votings"])

@router.get("/", response_model=PaginatedVotingsResponseDTO)
async def get_all_votings_endpoint(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db)
):
    """
    Retrieve all votings across all proceedings with pagination,
    ordered by newest first.
    """
    offset = (page - 1) * limit
    
    # Query total count
    total = db.query(Voting).count()
    
    # Query items
    votings = (
        db.query(Voting)
        .join(VotingDay, Voting.day_id == VotingDay.id)
        .join(Proceeding, VotingDay.proceeding_id == Proceeding.id)
        .order_by(desc(VotingDay.date), desc(Voting.voting_number))
        .offset(offset)
        .limit(limit)
        .all()
    )
    
    items = []
    for voting in votings:
        club_results_dtos = []
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
        
        items.append(GlobalVotingDTO(
            id=voting.id,
            date=str(voting.day.date),
            sitting=voting.sitting,
            term=voting.day.proceeding.term,
            voting_number=voting.voting_number,
            title=voting.title or f"Głosowanie nr {voting.voting_number}",
            description=voting.description,
            topic=voting.topic,
            results=results_dto,
            club_results=club_results_dtos
        ))
        
    pages = (total + limit - 1) // limit
    
    return PaginatedVotingsResponseDTO(
        items=items,
        total=total,
        page=page,
        size=limit,
        pages=pages
    )

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
    client = Depends(get_sejm_client),
    db: Session = Depends(get_db)
):
    """
    Retrieve stored voting data for a given proceeding, 
    grouped by day, with detailed voting and club statistics.
    If not found locally, attempts to import it from Sejm API on-the-fly.
    """
    proceeding = db.query(Proceeding).filter_by(term=term, proceeding_id=str(proceeding_id)).first()
    if not proceeding:
        # Try to import on the fly
        import_result = await import_proceeding_votings(db, client, term, proceeding_id)
        if not import_result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Proceeding {proceeding_id} for term {term} not found, and auto-import failed."
            )
            
        # Refetch after import
        proceeding = db.query(Proceeding).filter_by(term=term, proceeding_id=str(proceeding_id)).first()
        if not proceeding:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Proceeding {proceeding_id} for term {term} imported but no data was stored (maybe sitting hasn't started yet)."
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
                id=voting.id,
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
@router.get("/{voting_id}/documents")
async def get_voting_documents(
    voting_id: int,
    db: Session = Depends(get_db),
    client = Depends(get_sejm_client)
):
    """
    Znajduje dokumenty powiązane z głosowaniem.
    Opiera się na wyciągnięciu numeru druku z tytułu lub tematu głosowania.
    """
    voting = db.query(Voting).filter(Voting.id == voting_id).first()
    if not voting:
        raise HTTPException(status_code=404, detail="Voting not found")

    # Szukamy "druk nr X" lub "druki nr X, Y" w tytule lub opisie
    text_to_search = (voting.title or "") + " " + (voting.topic or "") + " " + (voting.description or "")
    match = re.search(r'druk[ui]?\s*(?:nr)?\s*(\d+)', text_to_search, re.IGNORECASE)
    
    if not match:
        # Brak powiązanego druku w tytule
        return []
        
    print_num = match.group(1)
    term = voting.day.proceeding.term
    
    # Check if we have this bill in DB
    bill = db.query(Bill).filter(Bill.term == term, Bill.print_number == print_num).first()
    if not bill:
        # Create a dummy bill to hold documents
        try:
            print_data = await client.get_print(term=term, num=print_num)
            bill = Bill(
                term=term,
                print_number=print_num,
                title=print_data.get("title", f"Druk nr {print_num}")
            )
            db.add(bill)
            db.commit()
            db.refresh(bill)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to fetch print from Sejm API: {str(e)}")

    # Sync documents
    synced = await DocumentService.sync_bill_documents(db, bill.id)
    
    # Return documents
    return [
        {
            "id": doc.id,
            "filename": doc.filename,
            "format": doc.format,
            "original_url": doc.original_url
        } for doc in synced
    ]

