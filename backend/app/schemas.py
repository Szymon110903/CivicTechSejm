"""
Pydantic DTOs (Data Transfer Objects) for API responses
"""

from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from enum import Enum


class VotingDecisionEnum(str, Enum):
    """Voting decision enum for API"""
    YES = "YES"
    NO = "NO"
    ABSTAIN = "ABSTAIN"
    MIXED = "MIXED"


# ============= CLUB VOTING RESULT DTO =============

class ClubVotingStatsDTO(BaseModel):
    """Statistics for a club's voting"""
    yes: int
    no: int
    abstain: int
    not_voted: int = 0


class ClubVotingResultDTO(BaseModel):
    """Club voting result DTO"""
    club_id: str = Field(..., example="KO")
    decision: VotingDecisionEnum = Field(..., example="YES")
    stats: ClubVotingStatsDTO
    participation_percent: float = Field(..., example=98.5)
    
    class Config:
        from_attributes = True


# ============= MAIN VOTING RESULT DTO =============

class VotingResultsDTO(BaseModel):
    """Main voting results"""
    passed: bool
    yes: int
    no: int
    abstain: int
    not_voted: int = 0
    attendance: str = Field(..., example="98%")


class VotingDTO(BaseModel):
    """Single voting DTO"""
    id: int
    voting_number: int = Field(..., example=1)
    title: str = Field(..., example="Wniosek o odrzucenie projektu...")
    description: Optional[str] = None
    topic: Optional[str] = None
    results: VotingResultsDTO
    club_results: List[ClubVotingResultDTO]
    
    class Config:
        from_attributes = True


# ============= VOTING DAY DTO =============

class VotingDayDTO(BaseModel):
    """Single voting day with all votings"""
    date: str = Field(..., example="2026-04-20")
    votings: List[VotingDTO]


# ============= PROCEEDING/RESPONSE DTO =============

class ProceedingVotingsResponseDTO(BaseModel):
    """Complete proceeding votings aggregated by day"""
    term: int = Field(..., example=10)
    proceeding_id: str = Field(..., example="12")
    last_updated: datetime
    days: List[VotingDayDTO]
    
    class Config:
        from_attributes = True


# ============= PAGINATED VOTINGS DTO =============

class GlobalVotingDTO(VotingDTO):
    """Voting DTO with global context (date, sitting, term)"""
    id: int
    date: str
    sitting: str
    term: int = Field(..., example=10)

class PaginatedVotingsResponseDTO(BaseModel):
    """Paginated list of votings"""
    items: List[GlobalVotingDTO]
    total: int
    page: int
    size: int
    pages: int
    
    class Config:
        from_attributes = True


# ============= ERROR/SUCCESS RESPONSES =============

class SuccessResponseDTO(BaseModel):
    """Generic success response wrapper"""
    success: bool = True
    data: dict = Field(..., example={})


class ErrorResponseDTO(BaseModel):
    """Generic error response"""
    success: bool = False
    error: str
    detail: Optional[str] = None


# ============= CLUB ANALYTICS DTOs (ISSUE 10) =============

class ClubSummaryDTO(BaseModel):
    """Summary statistics for a single club"""
    club_id: str = Field(..., example="KO")
    name: Optional[str] = Field(None, example="Koalicja Obywatelska")
    members_count: int = Field(..., example=157)
    avg_attendance: float = Field(..., example=98.4)
    avg_cohesion: float = Field(..., example=99.1)
    total_votings: int = Field(..., example=500)
    majority_support_percent: float = Field(..., example=97.5)
    decisions_breakdown: Dict[str, int] = Field(..., example={"YES": 300, "NO": 150, "ABSTAIN": 40, "MIXED": 10})

    class Config:
        from_attributes = True


class RebelMpDTO(BaseModel):
    """Politician who votes against club discipline or has high absences"""
    mp_id: int
    mp_name: str
    club_id: str
    rebel_votes_count: int = 0
    rebel_rate_percent: float = 0.0
    absent_votes_count: int = 0
    absent_rate_percent: float = 0.0


class ClubHistoricalPointDTO(BaseModel):
    """Single voting point in club's history for trend analysis"""
    date: str
    sitting: str
    voting_number: int
    voting_id: int
    title: Optional[str] = None
    decision: str
    attendance_percent: float
    cohesion_percent: float
    was_majority: bool = False


class ClubDetailedStatsDTO(BaseModel):
    """Detailed analytics and history for a specific club"""
    club_id: str
    name: Optional[str] = None
    members_count: int
    avg_attendance: float
    avg_cohesion: float
    majority_support_percent: float
    total_votings: int
    decisions_breakdown: Dict[str, int]
    rebels: List[RebelMpDTO]
    top_absentees: List[RebelMpDTO]
    history: List[ClubHistoricalPointDTO]

    class Config:
        from_attributes = True


class AgreementMatrixCellDTO(BaseModel):
    """Agreement between two clubs"""
    club_a: str
    club_b: str
    common_votings: int
    agreed_votings: int
    agreement_percent: float


class AgreementMatrixDTO(BaseModel):
    """NxN agreement matrix between all clubs"""
    clubs: List[str]
    matrix: List[List[float]]
    cells: List[AgreementMatrixCellDTO]


class ClubComparisonDTO(BaseModel):
    """Side by side comparison of 2-3 clubs"""
    clubs: List[ClubSummaryDTO]
    common_votings: int
    alignment_percent: float
    comparison_history: List[Dict[str, Any]]


class ClubBehaviorFilterResultDTO(BaseModel):
    """Single voting matched by behavioral filter"""
    voting_id: int
    date: str
    sitting: str
    voting_number: int
    title: str
    topic: Optional[str] = None
    passed: bool
    club_decisions: Dict[str, str]
    club_cohesions: Dict[str, float]

