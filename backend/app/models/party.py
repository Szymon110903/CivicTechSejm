"""Party (parliamentary club / group) model"""

from datetime import datetime
from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from ..core.db import Base


class Party(Base):
    """
    Klub parlamentarny lub koło poselskie (Party / Parliamentary Club)
    """
    __tablename__ = "parties"
    
    id = Column(String(50), primary_key=True)  # "KO", "PiS", "Lewica", etc.
    name = Column(String(255), nullable=False)
    
    # Relationships
    politicians = relationship("Politician", back_populates="party")
    
    # Audit columns
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Party id={self.id} name={self.name}>"
