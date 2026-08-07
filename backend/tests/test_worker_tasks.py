import pytest
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.db import Base
from app.models import Bill, BillDocument, AnalysisResult
from app.worker.tasks import generate_bill_summary_task

@pytest.fixture(name="db_session")
def fixture_db_session():
    """Tworzy czystą bazę w pamięci na potrzeby testu taska"""
    engine = create_engine("sqlite:///:memory:")
    SessionLocal = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        engine.dispose()

@patch("app.worker.tasks.SessionLocal")
@patch("app.worker.tasks.os.path.exists")
@patch("app.worker.tasks.extract_text_from_pdf_path")
@patch("app.worker.tasks.generate_bill_summary")
def test_generate_bill_summary_task_success(
    mock_generate, mock_extract, mock_exists, mock_session_local, db_session
):
    # Podmiana oryginalnej sesji na testową z pamięci
    mock_session_local.return_value = db_session
    
    # Symulacja bazy: projekt ustawy
    bill = Bill(id=1, term=10, title="Test Bill")
    db_session.add(bill)
    
    # Symulacja bazy: dokument (PDF OSR)
    doc = BillDocument(bill_id=1, format="PDF", local_path="/fake/path.pdf", filename="osr_test.pdf")
    db_session.add(doc)
    db_session.commit()
    
    # Ustawienie zachowania mocków
    mock_exists.return_value = True
    mock_extract.return_value = "To jest wyodrebniony tekst z pdfa."
    mock_generate.return_value = {
        "summary": "AI Summary",
        "affected_groups": ["Test"],
        "changes": "Test",
        "consequences": "Test"
    }
    
    # Uruchomienie taska
    result = generate_bill_summary_task(bill_id=1)
    
    assert result["status"] == "success"
    
    # Weryfikacja bazy
    analysis = db_session.query(AnalysisResult).filter_by(bill_id=1).first()
    assert analysis is not None
    assert analysis.summary == "AI Summary"
    assert analysis.raw_analysis_data["affected_groups"] == ["Test"]


@patch("app.worker.tasks.SessionLocal")
def test_generate_bill_summary_task_already_exists(mock_session_local, db_session):
    """Sprawdza deduplikację - nie generujemy analizy po raz drugi"""
    mock_session_local.return_value = db_session
    
    bill = Bill(id=2, term=10, title="Test Bill 2")
    db_session.add(bill)
    
    analysis = AnalysisResult(
        bill_id=2, 
        summary="Existing summary", 
        raw_analysis_data={"summary": "Existing summary"}
    )
    db_session.add(analysis)
    db_session.commit()
    
    result = generate_bill_summary_task(bill_id=2)
    
    assert result["status"] == "skipped"
