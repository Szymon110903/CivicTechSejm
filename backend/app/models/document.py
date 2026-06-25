"""Document (dokument projektu) model i logi pobierania"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..core.db import Base


class BillDocument(Base):
    """
    Dokument powiązany z projektem ustawy (np. pełny tekst PDF, OSR)
    """
    __tablename__ = "bill_documents"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    bill_id = Column(Integer, ForeignKey("bills.id"), nullable=False, index=True)
    
    filename = Column(String(500), nullable=False)
    original_url = Column(String(1000), nullable=True)
    local_path = Column(String(1000), nullable=True)
    format = Column(String(50), nullable=True)  # np. PDF, HTML, TXT
    version = Column(Integer, nullable=True, default=1)
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    bill = relationship("Bill", back_populates="documents")
    downloads = relationship("DocumentDownloadAudit", back_populates="document", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<BillDocument id={self.id} bill_id={self.bill_id} format={self.format}>"


class DocumentDownloadAudit(Base):
    """
    Rejestr audytu pobrań dokumentów (kto i kiedy pobierał)
    """
    __tablename__ = "document_download_audits"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("bill_documents.id"), nullable=False, index=True)
    
    downloaded_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    client_ip = Column(String(100), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Relationships
    document = relationship("BillDocument", back_populates="downloads")
    
    def __repr__(self):
        return f"<DocumentDownloadAudit id={self.id} doc_id={self.document_id}>"
