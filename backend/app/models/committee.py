"""Committee (komisja sejmowa) model"""

from datetime import datetime
from sqlalchemy import Column, String, DateTime
from ..core.db import Base


class Committee(Base):
    """
    Komisja sejmowa (Parliamentary Committee)
    """
    __tablename__ = "committees"
    
    code = Column(String(50), primary_key=True)  # e.g., "ASW", "ENM"
    name = Column(String(255), nullable=False)
    
    # Audit columns
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Committee code={self.code} name={self.name}>"
