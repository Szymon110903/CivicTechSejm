"""Bill (projekt ustawy / uchwały) model"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Date, JSON, DateTime
from sqlalchemy.orm import relationship
from ..core.db import Base


class Bill(Base):
    """
    Projekt ustawy lub uchwały (Bill / Draft Resolution)
    """
    __tablename__ = "bills"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    term = Column(Integer, nullable=False, index=True)
    print_number = Column(String(50), nullable=True, index=True)  # e.g., "123", "druk nr 123"
    
    title = Column(String(1000), nullable=False)
    description = Column(String(2000), nullable=True)
    status = Column(String(100), nullable=True)
    type = Column(String(100), nullable=True)
    document_date = Column(Date, nullable=True)
    
    raw_api_data = Column(JSON, nullable=True)
    
    # Relationships
    analyses = relationship("AnalysisResult", back_populates="bill", cascade="all, delete-orphan")
    
    # Audit columns
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Bill id={self.id} term={self.term} print={self.print_number} title={self.title[:50]}...>"
