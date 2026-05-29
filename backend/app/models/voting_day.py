"""Voting Day model"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, Index
from sqlalchemy.orm import relationship
from ..core.db import Base


class VotingDay(Base):
    """
    Dzień z głosowaniami (Voting Day)
    
    Represents a single day within a proceeding where votings occurred.
    Groups multiple votings by date.
    """
    __tablename__ = "voting_days"
    
    id = Column(Integer, primary_key=True)
    proceeding_id = Column(Integer, ForeignKey("proceedings.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    
    # Relationships
    proceeding = relationship("Proceeding", back_populates="days")
    votings = relationship("Voting", back_populates="day", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<VotingDay proceeding_id={self.proceeding_id} date={self.date}>"
