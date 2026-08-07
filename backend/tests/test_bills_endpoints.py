import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

from app.main import app
from app.models.bill import Bill
from app.models.analysis_result import AnalysisResult
from app.core.db import get_db, Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

@pytest.fixture(name="db_session")
def fixture_db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SessionLocal = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        engine.dispose()

@pytest.fixture(name="client")
def fixture_client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@patch("app.worker.tasks.generate_bill_summary_task.delay")
def test_generate_summary_endpoint_trigger(mock_delay, client, db_session):
    """Testuje czy POST uderza do Celery, gdy bill_id istnieje"""
    bill = Bill(id=999, term=10, title="Ustawą testowa endpointu")
    db_session.add(bill)
    db_session.commit()

    response = client.post("/api/bills/999/generate-summary")
    
    assert response.status_code == 200
    assert response.json()["status"] == "pending"
    mock_delay.assert_called_once_with(999)

def test_generate_summary_endpoint_not_found(client):
    response = client.post("/api/bills/9999/generate-summary")
    assert response.status_code == 404

def test_get_summary_endpoint(client, db_session):
    """Testuje endpoint zwracający gotowe podsumowanie"""
    # Kiedy nie ma - powinno zwrócić pending
    response = client.get("/api/bills/888/summary")
    assert response.status_code == 200
    assert response.json()["status"] == "pending"
    
    # Dodajemy ustawę i gotową analizę
    bill = Bill(id=888, term=10, title="Test get")
    db_session.add(bill)
    
    analysis = AnalysisResult(
        bill_id=888, 
        summary="Gotowe podsumowanie",
        raw_analysis_data={"summary": "Gotowe podsumowanie", "affected_groups": []}
    )
    db_session.add(analysis)
    db_session.commit()
    
    # Kiedy jest - powinno zwrócić success i dane
    response = client.get("/api/bills/888/summary")
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert response.json()["data"]["summary"] == "Gotowe podsumowanie"
