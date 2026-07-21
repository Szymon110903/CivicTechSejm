import logging
from datetime import datetime, date
from sqlalchemy.orm import Session
from ..models import Proceeding, VotingDay, Voting, ClubVotingResult, VotingDecision, Vote, Politician
from ..sejm_client import SejmAPIClient

logger = logging.getLogger(__name__)


def map_vote_to_decision(vote_str: str) -> str:
    """Map raw API vote value to standard VotingDecision string"""
    if not vote_str:
        return "NOT_VOTED"
    
    vote_upper = str(vote_str).upper()
    if vote_upper in ("YES", "ZA"):
        return "YES"
    elif vote_upper in ("NO", "PRZECIW"):
        return "NO"
    elif vote_upper in ("ABSTAIN", "WSTRZYMAŁ SIĘ", "WSTRZYMAL SIE"):
        return "ABSTAIN"
    else:
        return "NOT_VOTED"


async def import_proceeding_votings(db: Session, client: SejmAPIClient, term: int, proceeding_id: str) -> dict:
    """
    Fetch all votings for a specific term and proceeding/sitting, 
    parse, aggregate, and store them in the database.
    
    Returns import summary stats.
    """
    logger.info(f"Starting import of proceeding {proceeding_id} for term {term}")
    
    # Fetch all politician IDs currently in the database to do fast membership testing
    existing_politician_ids = {p.id for p in db.query(Politician.id).all()}
    
    # 1. Fetch proceeding details to obtain dates
    try:
        proceeding_info = await client.get_proceedings(term, proceeding_id)
        if not proceeding_info or isinstance(proceeding_info, list):
            # If it returns a list of all proceedings, find the specific one
            if isinstance(proceeding_info, list):
                match = next((p for p in proceeding_info if str(p.get("number")) == str(proceeding_id)), None)
                proceeding_info = match or {}
            else:
                proceeding_info = {}
    except Exception as e:
        logger.warning(f"Failed to fetch proceeding details: {e}")
        proceeding_info = {}
        
    dates = proceeding_info.get("dates", [])
    
    # Get or create Proceeding
    proceeding = db.query(Proceeding).filter_by(term=term, proceeding_id=str(proceeding_id)).first()
    if not proceeding:
        # Determine proceeding date
        proc_date = datetime.utcnow().date()
        if dates:
            try:
                d = dates[0]
                if isinstance(d, str):
                    proc_date = datetime.strptime(d[:10], "%Y-%m-%d").date()
                elif isinstance(d, (date, datetime)):
                    proc_date = d if isinstance(d, date) else d.date()
            except Exception as e:
                logger.warning(f"Could not parse proceeding date '{d}': {e}")
                
        proceeding = Proceeding(
            term=term,
            proceeding_id=str(proceeding_id),
            date=proc_date
        )
        db.add(proceeding)
        db.commit()
        db.refresh(proceeding)
        logger.info(f"Created new Proceeding term={term} id={proceeding_id} date={proc_date}")

    # 2. Fetch list of votings for the sitting
    votings_list = await client.get_votings(term, sitting=proceeding_id)
    if not votings_list:
        logger.warning(f"No votings found for sitting {proceeding_id}")
        return {"success": True, "imported_votings": 0, "message": "No votings found"}
        
    if not isinstance(votings_list, list):
        votings_list = [votings_list]
        
    imported_count = 0
    errors_count = 0
    
    for vote_item in votings_list:
        voting_number = vote_item.get("votingNumber")
        date_str = vote_item.get("date")
        
        if not voting_number or not date_str:
            continue
            
        try:
            # Parse voting date to date object
            voting_datetime = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            voting_date = voting_datetime.date()
            
            # Find or create VotingDay
            voting_day = db.query(VotingDay).filter_by(proceeding_id=proceeding.id, date=voting_date).first()
            if not voting_day:
                voting_day = VotingDay(proceeding_id=proceeding.id, date=voting_date)
                db.add(voting_day)
                db.commit()
                db.refresh(voting_day)
                
            # If the voting already exists, remove it first to enforce clean idempotent updates (cascading deletes club results)
            existing_voting = db.query(Voting).filter_by(day_id=voting_day.id, voting_number=voting_number).first()
            if existing_voting:
                db.delete(existing_voting)
                db.commit()
                
            import asyncio
            await asyncio.sleep(1) # Rate limiting to prevent WAF bans
            # Fetch detailed voting data including votes
            details = await client.get_votings(term, sitting=proceeding_id, num=voting_number)
            if not details:
                raise ValueError(f"Empty details returned for voting {voting_number}")
                
            # Parse main results
            yes_count = details.get("yes", 0)
            no_count = details.get("no", 0)
            abstain_count = details.get("abstain", 0)
            not_voted = details.get("notParticipating", 0)
            
            majority_votes = details.get("majorityVotes")
            if majority_votes is not None and majority_votes > 0:
                passed = yes_count >= majority_votes
            else:
                passed = yes_count > no_count
                
            db_voting = Voting(
                day_id=voting_day.id,
                voting_number=voting_number,
                sitting=str(proceeding_id),
                title=details.get("title"),
                description=details.get("description"),
                topic=details.get("topic"),
                passed=passed,
                yes_count=yes_count,
                no_count=no_count,
                abstain_count=abstain_count,
                not_voted=not_voted,
                raw_api_data=details
            )
            db_voting.calculate_statistics()
            db.add(db_voting)
            db.commit()
            db.refresh(db_voting)
            
            # Parse individual member votes and group them by club
            votes = details.get("votes", [])
            club_votes = {}
            for v in votes:
                club = v.get("club")
                if not club:
                    continue
                if club not in club_votes:
                    club_votes[club] = []
                club_votes[club].append(v)
                
            votes_to_add = []
            for club_id, member_votes in club_votes.items():
                c_yes = 0
                c_no = 0
                c_abstain = 0
                c_not_voted = 0
                raw_votes = []
                
                for mv in member_votes:
                    mp_id = mv.get("MP") or mv.get("mP")
                    first_name = mv.get("firstName", "")
                    last_name = mv.get("lastName", "")
                    mp_name = f"{first_name} {last_name}".strip()
                    vote_val = mv.get("vote")
                    
                    decision = map_vote_to_decision(vote_val)
                    if decision == "YES":
                         c_yes += 1
                    elif decision == "NO":
                         c_no += 1
                    elif decision == "ABSTAIN":
                         c_abstain += 1
                    else:
                         c_not_voted += 1
                         
                    raw_votes.append({
                        "mp_id": str(mp_id) if mp_id else None,
                        "mp_name": mp_name,
                        "vote": decision
                    })
                    
                    if mp_id and int(mp_id) in existing_politician_ids:
                        votes_to_add.append(Vote(
                            voting_id=db_voting.id,
                            politician_id=int(mp_id),
                            vote=decision
                        ))
                    
                total_party_members = c_yes + c_no + c_abstain + c_not_voted
                club_res = ClubVotingResult(
                    voting_id=db_voting.id,
                    club_id=club_id,
                    yes_count=c_yes,
                    no_count=c_no,
                    abstain_count=c_abstain,
                    not_voted_count=c_not_voted,
                    party_members_total=total_party_members,
                    raw_members_votes=raw_votes
                )
                club_res.decision = club_res.determine_decision()
                club_res.calculate_participation()
                db.add(club_res)
                
            if votes_to_add:
                db.add_all(votes_to_add)
            db.commit()
            imported_count += 1
            logger.info(f"Successfully imported voting number {voting_number} of sitting {proceeding_id}")
            
        except Exception as e:
            db.rollback()
            errors_count += 1
            logger.error(f"Error importing voting {voting_number} of sitting {proceeding_id}: {e}", exc_info=True)
            
    logger.info(f"Import finished. Imported: {imported_count}, Errors: {errors_count}")
    return {
        "success": True,
        "imported_votings": imported_count,
        "errors_count": errors_count,
        "message": f"Imported {imported_count} votings successfully. Errors encountered: {errors_count}."
    }
