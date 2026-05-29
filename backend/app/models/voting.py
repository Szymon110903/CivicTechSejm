"""Voting (głosowanie) model"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, Boolean, Float, JSON, Index
from sqlalchemy.orm import relationship
from ..core.db import Base


class Voting(Base):
    """
    Jedno głosowanie (Single Voting/Vote)
    
    Represents a single voting event with results and statistics.
    Contains aggregated voting results and per-club breakdowns.
    """
    __tablename__ = "votings"
    
    id = Column(Integer, primary_key=True)
    day_id = Column(Integer, ForeignKey("voting_days.id"), nullable=False)
    voting_number = Column(Integer, nullable=False)  # 1, 2, 3, etc.
    sitting = Column(String(50), nullable=False)  # posiedzenie number
    
    # Metadata
    title = Column(String(500), nullable=True)  # Voting title/subject
    description = Column(String(2000), nullable=True)
    topic = Column(String(200), nullable=True)  # e.g., "Budget", "Law amendment"
    
    # Main results
    passed = Column(Boolean, nullable=False)  # Did it pass?
    yes_count = Column(Integer, nullable=False, default=0)
    no_count = Column(Integer, nullable=False, default=0)
    abstain_count = Column(Integer, nullable=False, default=0)
    not_voted = Column(Integer, nullable=False, default=0)
    
    # Statistics
    total_votes = Column(Integer, nullable=False)  # yes + no + abstain (excludes not_voted)
    attendance_percent = Column(Float, nullable=False)  # 0-100 percentage
    quorum_required = Column(Integer, nullable=False, default=231)  # Standard quorum for Sejm
    
    # Raw API data (for reference/debugging)
    raw_api_data = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    day = relationship("VotingDay", back_populates="votings")
    club_results = relationship("ClubVotingResult", back_populates="voting", cascade="all, delete-orphan")
    votes = relationship("Vote", back_populates="voting", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Voting day_id={self.day_id} num={self.voting_number} passed={self.passed}>"
    
    def calculate_statistics(self):
        """Calculate derived statistics"""
        self.total_votes = self.yes_count + self.no_count + self.abstain_count
        total_participants = self.total_votes + self.not_voted
        if total_participants > 0:
            self.attendance_percent = (self.total_votes / total_participants) * 100
