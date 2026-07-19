"""
Pydantic DTOs (Data Transfer Objects) for API responses
"""

from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import List, Optional
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
