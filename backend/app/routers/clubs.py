from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from datetime import date
from typing import List, Optional, Dict, Any

from ..dependencies import get_db, get_sejm_client
from ..sejm_client import SejmAPIClient
from ..core.cache import LocalCache
from ..models import Voting, VotingDay, ClubVotingResult, Party, Proceeding
from ..schemas import (
    ClubSummaryDTO, ClubDetailedStatsDTO, RebelMpDTO, ClubHistoricalPointDTO,
    AgreementMatrixDTO, AgreementMatrixCellDTO, ClubComparisonDTO, ClubBehaviorFilterResultDTO,
    SuccessResponseDTO, ErrorResponseDTO
)

router = APIRouter(prefix="/clubs", tags=["Clubs"])
analytics_cache = LocalCache(default_ttl=900)  # 15-minutowy cache w pamięci RAM na wyniki analityczne

CLUB_NAMES_MAP = {
    "KO": "Koalicja Obywatelska",
    "PiS": "Prawo i Sprawiedliwość",
    "Lewica": "Nowa Lewica",
    "PSL-TD": "PSL - Trzecia Droga",
    "PL2050-TD": "Polska 2050 - Trzecia Droga",
    "Konfederacja": "Konfederacja Wolność i Niepodległość",
    "Razem": "Razem",
    "Kukiz15": "Kukiz'15",
    "Niez.": "Niezrzeszeni",
    "Niezrzeszeni": "Niezrzeszeni"
}

def get_club_name(db: Session, club_id: str) -> str:
    party = db.query(Party).filter(Party.id == club_id).first()
    if party and party.name:
        return party.name
    return CLUB_NAMES_MAP.get(club_id, club_id)

def calculate_cohesion(yes: int, no: int, abstain: int) -> float:
    total = yes + no + abstain
    if total == 0:
        return 100.0
    max_val = max(yes, no, abstain)
    return round((max_val / total) * 100.0, 1)

def check_was_majority(voting_passed: bool, club_decision: str) -> bool:
    if voting_passed and club_decision == "YES":
        return True
    if not voting_passed and club_decision in ("NO", "ABSTAIN"):
        return True
    return False

async def get_active_mps_info(client: Any, term: int = 10) -> tuple[set[str], Dict[str, int]]:
    """
    Zwraca (zbiór_id_aktywnych_posłów, słownik_liczebności_klubów) dla 460 aktualnie aktywnych posłów w kadencji.
    """
    active_ids = set()
    club_counts: Dict[str, int] = {}
    try:
        if client and hasattr(client, "get_mps"):
            mps_data = await client.get_mps(term=term)
            if isinstance(mps_data, list):
                for mp in mps_data:
                    if mp.get("active", True) is True:
                        mid = str(mp.get("id", ""))
                        if mid:
                            active_ids.add(mid)
                        c = mp.get("club")
                        if c:
                            club_counts[c] = club_counts.get(c, 0) + 1
    except Exception:
        pass
    return active_ids, club_counts

def filter_votings_query(
    db: Session,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    close_votings_only: bool = False,
    topic: Optional[str] = None,
    sitting: Optional[str] = None,
    min_attendance: Optional[float] = None
):
    query = db.query(Voting).join(VotingDay, Voting.day_id == VotingDay.id)
    
    if date_from:
        query = query.filter(VotingDay.date >= date_from)
    if date_to:
        query = query.filter(VotingDay.date <= date_to)
    if sitting:
        query = query.filter(Voting.sitting == sitting)
    if topic:
        query = query.filter(
            (Voting.topic.ilike(f"%{topic}%")) |
            (Voting.title.ilike(f"%{topic}%")) |
            (Voting.description.ilike(f"%{topic}%"))
        )
    if close_votings_only:
        # Close votings: difference between yes and no is less than 15 votes
        # Or total yes + no is small margin
        query = query.filter(
            ((Voting.yes_count - Voting.no_count) < 15) &
            ((Voting.no_count - Voting.yes_count) < 15)
        )
    if min_attendance and min_attendance > 0:
        query = query.filter(Voting.attendance_percent >= min_attendance)
        
    return query.order_by(desc(VotingDay.date), desc(Voting.voting_number))


@router.get("", response_model=List[ClubSummaryDTO])
@router.get("/", response_model=List[ClubSummaryDTO])
async def get_all_clubs_stats(
    response: Response,
    date_from: Optional[date] = Query(None, description="Start date filter"),
    date_to: Optional[date] = Query(None, description="End date filter"),
    close_votings_only: bool = Query(False, description="Filter only close/contested votings (<15 diff)"),
    topic: Optional[str] = Query(None, description="Topic/title search filter"),
    sitting: Optional[str] = Query(None, description="Sitting number filter"),
    min_attendance: Optional[float] = Query(None, description="Minimum attendance filter"),
    active_only: bool = Query(True, description="Filter only currently active MPs and clubs"),
    db: Session = Depends(get_db),
    client: SejmAPIClient = Depends(get_sejm_client)
):
    """
    Retrieve list of all parliamentary clubs with aggregated voting statistics,
    cohesion scores, attendance, and majority support, filtered by date/topic.
    """
    response.headers["Cache-Control"] = "public, max-age=300"
    cache_key = f"all_clubs:{date_from}:{date_to}:{close_votings_only}:{topic}:{sitting}:{min_attendance}:{active_only}"
    cached = analytics_cache.get(cache_key)
    if cached is not None:
        return cached

    active_mp_ids, current_club_counts = await get_active_mps_info(client)
    votings = filter_votings_query(db, date_from, date_to, close_votings_only, topic, sitting, min_attendance).all()
    
    club_stats: Dict[str, Dict[str, Any]] = {}
    
    for voting in votings:
        for cr in voting.club_results:
            cid = cr.club_id
            if cid not in club_stats:
                club_stats[cid] = {
                    "club_id": cid,
                    "name": get_club_name(db, cid),
                    "latest_members_count": cr.party_members_total,
                    "total_votings": 0,
                    "sum_attendance": 0.0,
                    "sum_cohesion": 0.0,
                    "majority_support_count": 0,
                    "decisions": {"YES": 0, "NO": 0, "ABSTAIN": 0, "MIXED": 0}
                }
            
            stats = club_stats[cid]
            stats["total_votings"] += 1
            stats["sum_attendance"] += cr.participation_percent
            
            cohesion = calculate_cohesion(cr.yes_count, cr.no_count, cr.abstain_count)
            stats["sum_cohesion"] += cohesion
            
            dec_str = cr.decision.value if hasattr(cr.decision, "value") else str(cr.decision)
            if dec_str in stats["decisions"]:
                stats["decisions"][dec_str] += 1
            else:
                stats["decisions"][dec_str] = 1
                
            if check_was_majority(voting.passed, dec_str):
                stats["majority_support_count"] += 1
                
            if cr.party_members_total > stats["latest_members_count"]:
                stats["latest_members_count"] = cr.party_members_total
                
    result: List[ClubSummaryDTO] = []
    for cid, data in club_stats.items():
        if active_only and current_club_counts:
            m_count = current_club_counts.get(cid, 0)
            if m_count == 0:
                continue
        else:
            m_count = data["latest_members_count"]
            
        tv = data["total_votings"]
        avg_att = round(data["sum_attendance"] / tv, 1) if tv > 0 else 0.0
        avg_coh = round(data["sum_cohesion"] / tv, 1) if tv > 0 else 0.0
        maj_sup = round((data["majority_support_count"] / tv) * 100.0, 1) if tv > 0 else 0.0
        
        result.append(ClubSummaryDTO(
            club_id=cid,
            name=data["name"],
            members_count=m_count,
            avg_attendance=avg_att,
            avg_cohesion=avg_coh,
            total_votings=tv,
            majority_support_percent=maj_sup,
            decisions_breakdown=data["decisions"]
        ))
        
    # Sort by members count descending
    result.sort(key=lambda x: x.members_count, reverse=True)
    analytics_cache.set(cache_key, result)
    return result


@router.get("/matrix", response_model=AgreementMatrixDTO)
async def get_agreement_matrix(
    response: Response,
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    close_votings_only: bool = Query(False),
    topic: Optional[str] = Query(None),
    sitting: Optional[str] = Query(None),
    min_attendance: Optional[float] = Query(None),
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    client: SejmAPIClient = Depends(get_sejm_client)
):
    """
    Calculate the NxN agreement matrix between all clubs for the filtered votings.
    Returns percentage of votings where two clubs voted identically.
    """
    response.headers["Cache-Control"] = "public, max-age=300"
    cache_key = f"matrix:{date_from}:{date_to}:{close_votings_only}:{topic}:{sitting}:{min_attendance}:{active_only}"
    cached = analytics_cache.get(cache_key)
    if cached is not None:
        return cached

    active_ids, current_club_counts = await get_active_mps_info(client)
    votings = filter_votings_query(db, date_from, date_to, close_votings_only, topic, sitting, min_attendance).all()
    
    # Identify all active clubs in these votings
    active_clubs_set = set()
    for v in votings:
        for cr in v.club_results:
            if active_only and current_club_counts and current_club_counts.get(cr.club_id, 0) == 0:
                continue
            active_clubs_set.add(cr.club_id)
            
    clubs_list = sorted(list(active_clubs_set))
    n = len(clubs_list)
    
    # Initialize pair counters: (club_a, club_b) -> [common_count, agreed_count]
    pair_stats: Dict[tuple, List[int]] = {}
    for i in range(n):
        for j in range(n):
            pair_stats[(clubs_list[i], clubs_list[j])] = [0, 0]
            
    for v in votings:
        decisions_map = {}
        for cr in v.club_results:
            dec_str = cr.decision.value if hasattr(cr.decision, "value") else str(cr.decision)
            decisions_map[cr.club_id] = dec_str
            
        for i in range(n):
            ca = clubs_list[i]
            if ca not in decisions_map:
                continue
            for j in range(n):
                cb = clubs_list[j]
                if cb not in decisions_map:
                    continue
                pair_stats[(ca, cb)][0] += 1
                if decisions_map[ca] == decisions_map[cb]:
                    pair_stats[(ca, cb)][1] += 1
                    
    matrix: List[List[float]] = []
    cells: List[AgreementMatrixCellDTO] = []
    
    for i in range(n):
        row: List[float] = []
        ca = clubs_list[i]
        for j in range(n):
            cb = clubs_list[j]
            common, agreed = pair_stats[(ca, cb)]
            pct = round((agreed / common) * 100.0, 1) if common > 0 else 0.0
            row.append(pct)
            
            if i <= j:  # Add unique pairs or self-pairs to cells list
                cells.append(AgreementMatrixCellDTO(
                    club_a=ca,
                    club_b=cb,
                    common_votings=common,
                    agreed_votings=agreed,
                    agreement_percent=pct
                ))
        matrix.append(row)
        
    result_dto = AgreementMatrixDTO(
        clubs=clubs_list,
        matrix=matrix,
        cells=cells
    )
    analytics_cache.set(cache_key, result_dto)
    return result_dto


@router.get("/compare", response_model=ClubComparisonDTO)
async def compare_clubs(
    response: Response,
    clubs: List[str] = Query(..., description="List of club IDs to compare (2 or 3)"),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    close_votings_only: bool = Query(False),
    topic: Optional[str] = Query(None),
    sitting: Optional[str] = Query(None),
    min_attendance: Optional[float] = Query(None),
    limit: int = Query(50, ge=1, le=200, description="Max history items to return"),
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    client: SejmAPIClient = Depends(get_sejm_client)
):
    """
    Compare 2 or more clubs side by side across filtered votings.
    Calculates alignment percentage and returns detailed voting-by-voting comparison.
    """
    if len(clubs) < 2:
        raise HTTPException(status_code=400, detail="Please specify at least 2 clubs to compare.")
        
    response.headers["Cache-Control"] = "public, max-age=300"
    clubs_key = ",".join(sorted(clubs))
    cache_key = f"compare:{clubs_key}:{date_from}:{date_to}:{close_votings_only}:{topic}:{sitting}:{min_attendance}:{limit}:{active_only}"
    cached = analytics_cache.get(cache_key)
    if cached is not None:
        return cached

    # Get summary stats for each requested club
    all_summaries = await get_all_clubs_stats(response, date_from, date_to, close_votings_only, topic, sitting, min_attendance, active_only, db, client)
    summary_map = {s.club_id: s for s in all_summaries}
    
    selected_summaries = []
    for c in clubs:
        if c in summary_map:
            selected_summaries.append(summary_map[c])
        else:
            selected_summaries.append(ClubSummaryDTO(
                club_id=c, name=get_club_name(db, c), members_count=0,
                avg_attendance=0.0, avg_cohesion=0.0, total_votings=0,
                majority_support_percent=0.0,
                decisions_breakdown={"YES": 0, "NO": 0, "ABSTAIN": 0, "MIXED": 0}
            ))
            
    votings = filter_votings_query(db, date_from, date_to, close_votings_only, topic, sitting).all()
    
    common_votings = 0
    aligned_votings = 0
    history_items: List[Dict[str, Any]] = []
    
    for v in votings:
        decisions_map = {}
        for cr in v.club_results:
            dec_str = cr.decision.value if hasattr(cr.decision, "value") else str(cr.decision)
            decisions_map[cr.club_id] = dec_str
            
        # Check if all requested clubs participated
        if all(c in decisions_map for c in clubs):
            common_votings += 1
            first_dec = decisions_map[clubs[0]]
            agreed = all(decisions_map[c] == first_dec for c in clubs)
            if agreed:
                aligned_votings += 1
                
            if len(history_items) < limit:
                history_items.append({
                    "voting_id": v.id,
                    "voting_number": v.voting_number,
                    "sitting": v.sitting,
                    "date": str(v.day.date),
                    "title": v.title or f"Głosowanie nr {v.voting_number}",
                    "topic": v.topic,
                    "passed": v.passed,
                    "decisions": {c: decisions_map[c] for c in clubs},
                    "agreed": agreed
                })
                
    alignment_pct = round((aligned_votings / common_votings) * 100.0, 1) if common_votings > 0 else 0.0
    
    result_dto = ClubComparisonDTO(
        clubs=selected_summaries,
        common_votings=common_votings,
        alignment_percent=alignment_pct,
        comparison_history=history_items
    )
    analytics_cache.set(cache_key, result_dto)
    return result_dto


@router.get("/filter", response_model=List[ClubBehaviorFilterResultDTO])
async def filter_votings_by_behavior(
    response: Response,
    club_id: Optional[str] = Query(None, description="Filter by specific club behavior"),
    decision: Optional[str] = Query(None, description="Decision made by club (YES, NO, ABSTAIN, MIXED)"),
    max_cohesion: Optional[float] = Query(None, description="Max cohesion threshold (e.g. 80.0 for divided clubs)"),
    min_cohesion: Optional[float] = Query(None, description="Min cohesion threshold"),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    close_votings_only: bool = Query(False),
    topic: Optional[str] = Query(None),
    sitting: Optional[str] = Query(None),
    min_attendance: Optional[float] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    client: SejmAPIClient = Depends(get_sejm_client)
):
    """
    Behavioral search engine: find votings where a specific club voted in a certain way
    or where club cohesion was below/above a specified threshold.
    """
    response.headers["Cache-Control"] = "public, max-age=300"
    cache_key = f"filter:{club_id}:{decision}:{max_cohesion}:{min_cohesion}:{date_from}:{date_to}:{close_votings_only}:{topic}:{sitting}:{min_attendance}:{limit}:{active_only}"
    cached = analytics_cache.get(cache_key)
    if cached is not None:
        return cached

    active_ids, current_club_counts = await get_active_mps_info(client)
    votings = filter_votings_query(db, date_from, date_to, close_votings_only, topic, sitting, min_attendance).limit(limit * 2).all()
    
    results: List[ClubBehaviorFilterResultDTO] = []
    
    for v in votings:
        decisions_map = {}
        cohesions_map = {}
        target_club_matched = True
        
        for cr in v.club_results:
            cid = cr.club_id
            if active_only and current_club_counts and current_club_counts.get(cid, 0) == 0:
                continue
            dec_str = cr.decision.value if hasattr(cr.decision, "value") else str(cr.decision)
            decisions_map[cid] = dec_str
            
            coh = calculate_cohesion(cr.yes_count, cr.no_count, cr.abstain_count)
            cohesions_map[cid] = coh
            
            if club_id and cid == club_id:
                if decision and dec_str != decision.upper():
                    target_club_matched = False
                if max_cohesion is not None and coh > max_cohesion:
                    target_club_matched = False
                if min_cohesion is not None and coh < min_cohesion:
                    target_club_matched = False
                    
        if club_id and club_id not in decisions_map:
            target_club_matched = False
            
        if target_club_matched:
            results.append(ClubBehaviorFilterResultDTO(
                voting_id=v.id,
                date=str(v.day.date),
                sitting=v.sitting,
                voting_number=v.voting_number,
                title=v.title or f"Głosowanie nr {v.voting_number}",
                topic=v.topic,
                passed=v.passed,
                club_decisions=decisions_map,
                club_cohesions=cohesions_map
            ))
            if len(results) >= limit:
                break
                
    analytics_cache.set(cache_key, results)
    return results


@router.get("/{club_id}/stats", response_model=ClubDetailedStatsDTO)
async def get_club_detailed_stats(
    club_id: str,
    response: Response,
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    close_votings_only: bool = Query(False),
    topic: Optional[str] = Query(None),
    sitting: Optional[str] = Query(None),
    min_attendance: Optional[float] = Query(None),
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    client: SejmAPIClient = Depends(get_sejm_client)
):
    """
    Retrieve comprehensive detailed analytics for a specific club,
    including historical trend points and Rebel MPs / Top Absentees index.
    """
    response.headers["Cache-Control"] = "public, max-age=300"
    cache_key = f"club_detail:{club_id}:{date_from}:{date_to}:{close_votings_only}:{topic}:{sitting}:{min_attendance}:{active_only}"
    cached = analytics_cache.get(cache_key)
    if cached is not None:
        return cached

    active_mp_ids, current_club_counts = await get_active_mps_info(client)
    votings = filter_votings_query(db, date_from, date_to, close_votings_only, topic, sitting, min_attendance).all()
    
    total_votings = 0
    sum_attendance = 0.0
    sum_cohesion = 0.0
    majority_support_count = 0
    decisions = {"YES": 0, "NO": 0, "ABSTAIN": 0, "MIXED": 0}
    latest_members_count = 0
    history: List[ClubHistoricalPointDTO] = []
    
    # MP tracking: mp_id -> {"name": str, "total": int, "rebels": int, "absent": int}
    mp_tracker: Dict[str, Dict[str, Any]] = {}
    
    for v in votings:
        # Find club result in this voting
        cr = next((r for r in v.club_results if r.club_id == club_id), None)
        if not cr:
            continue
            
        total_votings += 1
        sum_attendance += cr.participation_percent
        
        coh = calculate_cohesion(cr.yes_count, cr.no_count, cr.abstain_count)
        sum_cohesion += coh
        
        dec_str = cr.decision.value if hasattr(cr.decision, "value") else str(cr.decision)
        if dec_str in decisions:
            decisions[dec_str] += 1
        else:
            decisions[dec_str] = 1
            
        was_maj = check_was_majority(v.passed, dec_str)
        if was_maj:
            majority_support_count += 1
            
        if cr.party_members_total > latest_members_count:
            latest_members_count = cr.party_members_total
            
        history.append(ClubHistoricalPointDTO(
            date=str(v.day.date),
            sitting=v.sitting,
            voting_number=v.voting_number,
            voting_id=v.id,
            title=v.title or f"Głosowanie nr {v.voting_number}",
            decision=dec_str,
            attendance_percent=round(cr.participation_percent, 1),
            cohesion_percent=coh,
            was_majority=was_maj
        ))
        
        # Process individual member votes for Rebel & Absentee Index
        if cr.raw_members_votes and isinstance(cr.raw_members_votes, list):
            for mv in cr.raw_members_votes:
                mp_id_str = str(mv.get("mp_id") or mv.get("MP") or mv.get("mP") or "")
                mp_name = mv.get("mp_name") or f"{mv.get('firstName', '')} {mv.get('lastName', '')}".strip()
                if not mp_id_str or not mp_name:
                    continue
                vote_val = str(mv.get("vote", "")).upper()
                
                if mp_id_str not in mp_tracker:
                    mp_tracker[mp_id_str] = {"mp_id": mp_id_str, "name": mp_name, "total": 0, "rebels": 0, "absent": 0}
                
                mpt = mp_tracker[mp_id_str]
                mpt["total"] += 1
                
                if vote_val in ("NOT_VOTED", "NIE GLOSOWAL", "ABSENT", ""):
                    mpt["absent"] += 1
                elif dec_str != "MIXED" and vote_val != dec_str:
                    mpt["rebels"] += 1
                    
    avg_att = round(sum_attendance / total_votings, 1) if total_votings > 0 else 0.0
    avg_coh = round(sum_cohesion / total_votings, 1) if total_votings > 0 else 0.0
    maj_sup = round((majority_support_count / total_votings) * 100.0, 1) if total_votings > 0 else 0.0
    
    # Build Rebel MPs list
    rebels_list: List[RebelMpDTO] = []
    for mpt in mp_tracker.values():
        if active_only and active_mp_ids and mpt["mp_id"] not in active_mp_ids:
            continue
        t = mpt["total"]
        if t == 0:
            continue
        rc = mpt["rebels"]
        ac = mpt["absent"]
        try:
            int_id = int(mpt["mp_id"])
        except ValueError:
            int_id = 0
            
        rebels_list.append(RebelMpDTO(
            mp_id=int_id,
            mp_name=mpt["name"],
            club_id=club_id,
            rebel_votes_count=rc,
            rebel_rate_percent=round((rc / t) * 100.0, 1),
            absent_votes_count=ac,
            absent_rate_percent=round((ac / t) * 100.0, 1)
        ))
        
    # Sort for rebels top 10
    top_rebels = sorted([r for r in rebels_list if r.rebel_votes_count > 0], key=lambda x: (x.rebel_votes_count, x.rebel_rate_percent), reverse=True)[:10]
    # Sort for absentees top 10
    top_absentees = sorted([r for r in rebels_list if r.absent_votes_count > 0], key=lambda x: (x.absent_votes_count, x.absent_rate_percent), reverse=True)[:10]
    
    if active_only and current_club_counts:
        m_count = current_club_counts.get(club_id, 0)
    else:
        m_count = latest_members_count

    result_dto = ClubDetailedStatsDTO(
        club_id=club_id,
        name=get_club_name(db, club_id),
        members_count=m_count,
        avg_attendance=avg_att,
        avg_cohesion=avg_coh,
        majority_support_percent=maj_sup,
        total_votings=total_votings,
        decisions_breakdown=decisions,
        rebels=top_rebels,
        top_absentees=top_absentees,
        history=history
    )
    analytics_cache.set(cache_key, result_dto)
    return result_dto
