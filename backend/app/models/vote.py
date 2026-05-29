"""Vote (indywidualny głos posła) model"""

from datetime import datetime
from sqlalchemy import Column, Integer, BigInteger, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from ..core.db import Base


class Vote(Base):
    """
    Głos oddany przez posła (Individual Vote cast by a Politician)
    Designed for scalability with BIGINT primary key.
    """
    __tablename__ = "votes"
    
    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    voting_id = Column(Integer, ForeignKey("votings.id", ondelete="CASCADE"), nullable=False, index=True)
    politician_id = Column(Integer, ForeignKey("politicians.id", ondelete="CASCADE"), nullable=False, index=True)
    
    vote = Column(String(50), nullable=False)  # "YES", "NO", "ABSTAIN", "NOT_VOTED"
    
    # Relationships
    politician = relationship("Politician", back_populates="votes")
    voting = relationship("Voting", back_populates="votes")
    
    # Constraints & Indexes
    __table_args__ = (
        UniqueConstraint('voting_id', 'politician_id', name='uq_voting_politician'),
    )
    
    # Audit columns
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Vote id={self.id} voting_id={self.voting_id} politician_id={self.politician_id} vote={self.vote}>"
