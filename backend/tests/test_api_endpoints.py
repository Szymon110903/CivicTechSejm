"""
TESTOWANY OBSZAR: Endpointy HTTP API (FastAPI Router Endpoints)

Plik testuje:
1. Endpoint POST /api/votings/import (poprawność importowania danych z Sejm API za pomocą FastAPI TestClient).
2. Endpoint GET /api/votings/proceedings/{proceeding_id} (poprawność zwracania sformatowanych i zagregowanych danych posiedzenia).
3. Obsługę błędu 404 w przypadku zapytania o nieistniejące posiedzenie.
4. Poprawność walidacji odpowiedzi z Pydantic schemas (ProceedingVotingsResponseDTO).
"""

import os
# Ustawiamy testową bazę w pamięci zanim zostaną załadowane moduły aplikacji
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.db import Base
from app.dependencies import get_db, get_sejm_client
from app.models import Proceeding, VotingDay, Voting, ClubVotingResult


# 1. Konfiguracja testowej bazy danych w pamięci
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


# 2. Klient testowy z nadpisaniem zależności
@pytest.fixture(name="client")
def fixture_client(db_session):
    # Mock klienta API Sejmu
    mock_sejm_client = AsyncMockSejmClient()
    
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_sejm_client] = lambda: mock_sejm_client
    
    with TestClient(app) as test_client:
        yield test_client
        
    app.dependency_overrides.clear()


# Klasa mockująca asynchroniczne wywołania API Sejmu
class AsyncMockSejmClient:
    async def get_proceedings(self, term: int, proceeding_id: str):
        return {"number": int(proceeding_id), "dates": ["2026-05-15"]}
        
    async def get_votings(self, term: int, sitting: str = None, num: int = None):
        if sitting and num:
            # Szczegóły głosowania
            return {
                "yes": 250, "no": 150, "abstain": 60, "notParticipating": 0,
                "term": term, "sitting": int(sitting), "votingNumber": int(num),
                "date": "2026-05-15T10:00:00Z", "title": "Ustawa A", "votes": []
            }
        elif sitting:
            # Wykaz głosowań
            return [{"votingNumber": 1, "date": "2026-05-15T10:00:00Z"}]
        return []
        
    async def close(self):
        pass


def test_import_endpoint_success(client):
    """Testuje, że endpoint POST /api/votings/import zwraca kod 200 i sukces po prawidłowym ETL"""
    response = client.post("/api/votings/import?term=10&proceeding_id=5")
    assert response.status_code == 200
    
    json_data = response.json()
    assert json_data["success"] is True
    assert "imported_votings" in json_data["data"]
    assert json_data["data"]["imported_votings"] == 1


def test_get_proceeding_not_found(client):
    """Testuje, że zapytanie o niezaimportowane posiedzenie zwraca kod 404"""
    response = client.get("/api/votings/proceedings/999?term=10")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


def test_get_proceeding_success(client, db_session):
    """Testuje pobieranie ustrukturyzowanych danych z GET /api/votings/proceedings/{id} i zgodność ze schematami DTO"""
    # 1. Ręcznie wstawiamy posiedzenie i powiązane rekordy do bazy
    proceeding = Proceeding(term=10, proceeding_id="12", date=date(2026, 5, 20))
    db_session.add(proceeding)
    db_session.commit()
    
    day = VotingDay(proceeding_id=proceeding.id, date=date(2026, 5, 20))
    db_session.add(day)
    db_session.commit()
    
    voting = Voting(
        day_id=day.id,
        voting_number=1,
        sitting="12",
        title="Głosowanie nad projektem",
        passed=True,
        yes_count=250,
        no_count=150,
        abstain_count=60,
        not_voted=0,
        total_votes=460,
        attendance_percent=100.0
    )
    db_session.add(voting)
    db_session.commit()
    
    club_res = ClubVotingResult(
        voting_id=voting.id,
        club_id="KO",
        decision="YES",
        yes_count=150,
        no_count=0,
        abstain_count=0,
        not_voted_count=0,
        party_members_total=150,
        participation_percent=100.0
    )
    db_session.add(club_res)
    db_session.commit()

    # 2. Wywołujemy endpoint GET
    response = client.get("/api/votings/proceedings/12?term=10")
    assert response.status_code == 200
    
    data = response.json()
    assert data["term"] == 10
    assert data["proceeding_id"] == "12"
    assert len(data["days"]) == 1
    
    # Weryfikacja struktury dnia i głosowania
    day_data = data["days"][0]
    assert day_data["date"] == "2026-05-20"
    assert len(day_data["votings"]) == 1
    
    voting_data = day_data["votings"][0]
    assert voting_data["voting_number"] == 1
    assert voting_data["results"]["passed"] is True
    assert voting_data["results"]["yes"] == 250
    assert voting_data["results"]["attendance"] == "100%"
    
    # Weryfikacja wyników klubowych
    assert len(voting_data["club_results"]) == 1
    club_data = voting_data["club_results"][0]
    assert club_data["club_id"] == "KO"
    assert club_data["decision"] == "YES"
    assert club_data["stats"]["yes"] == 150
    assert club_data["participation_percent"] == 100.0
