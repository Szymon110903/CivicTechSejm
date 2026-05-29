"""Analysis Result (wyniki analizy projektu ustawy) model"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..core.db import Base


class AnalysisResult(Base):
    """
    Wynik analizy projektu ustawy (Analysis Result for a Bill)
    Stores LLM-generated summaries, sentiment, and policy impact categorization.
    """
    __tablename__ = "analysis_results"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    bill_id = Column(Integer, ForeignKey("bills.id", ondelete="CASCADE"), nullable=False)
    
    summary = Column(Text, nullable=True)
    sentiment = Column(String(50), nullable=True)  # POSITIVE, NEGATIVE, NEUTRAL
    impact_category = Column(String(100), nullable=True)  # e.g., "Gospodarka", "Środowisko"
    
    raw_analysis_data = Column(JSON, nullable=True)
    
    # Relationships
    bill = relationship("Bill", back_populates="analyses")
    
    # Audit columns
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<AnalysisResult id={self.id} bill_id={self.bill_id} category={self.impact_category}>"
