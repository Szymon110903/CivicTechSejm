"""Proceeding (posiedzenie/sesja) model"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Date, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class Proceeding(Base):
    """
    Posiedzenie (sesja) Sejmu
    
    Represents a parliamentary session where votings take place.
    One proceeding can have multiple voting days.
    """
    __tablename__ = "proceedings"
    
    id = Column(Integer, primary_key=True)
    term = Column(Integer, nullable=False, index=True)
    proceeding_id = Column(String(50), nullable=False)  # e.g., "123"
    date = Column(Date, nullable=False, index=True)
    last_updated = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    days = relationship("VotingDay", back_populates="proceeding", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Proceeding term={self.term} id={self.proceeding_id} date={self.date}>"
