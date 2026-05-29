"""Politician (Member of Parliament - poseł/posłanka) model"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..core.db import Base


class Politician(Base):
    """
    Poseł / Posłanka (Member of Parliament / Politician)
    """
    __tablename__ = "politicians"
    
    id = Column(Integer, primary_key=True)  # MP ID from Sejm API
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    second_name = Column(String(100), nullable=True)
    
    # Relationship with club/party
    party_id = Column(String(50), ForeignKey("parties.id", ondelete="SET NULL"), nullable=True)
    
    # Floor seat number (sala plenarna) - requested for future features
    seat_number = Column(Integer, nullable=True)
    
    # District / Constituency details
    district_num = Column(Integer, nullable=True)
    district_name = Column(String(150), nullable=True)
    voivodeship = Column(String(100), nullable=True)
    
    active = Column(Boolean, nullable=False, default=True)
    
    # Relationships
    party = relationship("Party", back_populates="politicians")
    votes = relationship("Vote", back_populates="politician", cascade="all, delete-orphan")
    
    # Audit columns
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Politician id={self.id} name={self.first_name} {self.last_name} club={self.party_id} seat={self.seat_number}>"
