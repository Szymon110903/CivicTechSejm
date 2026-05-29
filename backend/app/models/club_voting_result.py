"""Club Voting Result model"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from .enums import VotingDecision
from ..core.db import Base


class ClubVotingResult(Base):
    """
    Wynik głosowania dla konkretnego klubu (Club Voting Result)
    
    Represents how a parliamentary club voted on a specific voting.
    Contains the club's aggregated result and individual member votes.
    """
    __tablename__ = "club_voting_results"
    
    id = Column(Integer, primary_key=True)
    voting_id = Column(Integer, ForeignKey("votings.id"), nullable=False)
    club_id = Column(String(50), nullable=False)  # "KO", "PiS", "Lewica", etc.
    
    # Club decision (dominant vote)
    decision = Column(SQLEnum(VotingDecision), nullable=False)  # YES, NO, ABSTAIN, MIXED
    
    # Club statistics for this voting
    yes_count = Column(Integer, nullable=False, default=0)
    no_count = Column(Integer, nullable=False, default=0)
    abstain_count = Column(Integer, nullable=False, default=0)
    not_voted_count = Column(Integer, nullable=False, default=0)
    
    # Calculated values
    party_members_total = Column(Integer, nullable=False)  # Total members in club
    participation_percent = Column(Float, nullable=False)  # % of members who voted
    
    # Individual member votes (raw data)
    # Format: [{"mp_id": "123", "mp_name": "John Doe", "vote": "YES"}, ...]
    raw_members_votes = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    voting = relationship("Voting", back_populates="club_results")
    
    def __repr__(self):
        return f"<ClubVotingResult voting_id={self.voting_id} club_id={self.club_id} decision={self.decision}>"
    
    def determine_decision(self) -> VotingDecision:
        counts = {
            VotingDecision.YES: self.yes_count,
            VotingDecision.NO: self.no_count,
            VotingDecision.ABSTAIN: self.abstain_count
        }
        
        # Znajdź wartość maksymalną
        max_val = max(counts.values())
        if max_val == 0:
            return VotingDecision.ABSTAIN

        # Sprawdź czy jest remis między topowymi opcjami
        top_decisions = [k for k, v in counts.items() if v == max_val]
        
        if len(top_decisions) > 1:
            return VotingDecision.MIXED
        
        return top_decisions[0]
    
    def calculate_participation(self):
        """Calculate participation percentage"""
        total_participated = self.yes_count + self.no_count + self.abstain_count
        if self.party_members_total > 0:
            self.participation_percent = (total_participated / self.party_members_total) * 100
