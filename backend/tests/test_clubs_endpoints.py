"""
TESTOWANY OBSZAR: Endpointy statystyk klubowych i analityki (GET /api/clubs/*)

Plik weryfikuje:
1. GET /api/clubs (lista klubów z agregacją spójności, frekwencji, poparcia większości i filtrami dat/stykowych głosowań).
2. GET /api/clubs/matrix (Macierz Zgodności NxN).
3. GET /api/clubs/compare (Porównywarka 2-3 klubów ze wskaźnikiem alignment_percent).
4. GET /api/clubs/filter (Wyszukiwarka behawioralna).
5. GET /api/clubs/{id}/stats (Szczegóły klubu, Indeks Buntowników i Absencji).
"""

import os
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
from app.models import Proceeding, VotingDay, Voting, ClubVotingResult, Party


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


class AsyncMockSejmClient:
    async def close(self):
        pass


@pytest.fixture(name="client")
def fixture_client(db_session):
    mock_sejm_client = AsyncMockSejmClient()
    
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_sejm_client] = lambda: mock_sejm_client
    
    with TestClient(app) as test_client:
        yield test_client
        
    app.dependency_overrides.clear()


@pytest.fixture(name="seed_data")
def fixture_seed_data(db_session):
    """Wstawia testowe posiedzenie, dni i głosowania do bazy w pamięci"""
    proc = Proceeding(term=10, proceeding_id="12", date=date(2026, 5, 20))
    db_session.add(proc)
    db_session.commit()
    
    day1 = VotingDay(proceeding_id=proc.id, date=date(2026, 5, 20))
    day2 = VotingDay(proceeding_id=proc.id, date=date(2026, 5, 21))
    db_session.add_all([day1, day2])
    db_session.commit()
    
    # Voting 1: Zwykłe głosowanie, zdane
    v1 = Voting(
        day_id=day1.id, voting_number=1, sitting="12",
        title="Głosowanie nad ustawą o podatkach", topic="Finanse",
        passed=True, yes_count=240, no_count=180, abstain_count=10, not_voted=30,
        total_votes=430, attendance_percent=93.5
    )
    # Voting 2: Głosowanie stykowe (różnica 5 głosów!), niezdane
    v2 = Voting(
        day_id=day2.id, voting_number=2, sitting="12",
        title="Wniosek formalny o przerwanie posiedzenia", topic="Procedura",
        passed=False, yes_count=215, no_count=220, abstain_count=5, not_voted=20,
        total_votes=440, attendance_percent=95.6
    )
    db_session.add_all([v1, v2])
    db_session.commit()
    
    # Wyniki klubowe dla V1
    cr1_ko = ClubVotingResult(
        voting_id=v1.id, club_id="KO", decision="YES",
        yes_count=150, no_count=0, abstain_count=0, not_voted_count=5,
        party_members_total=155, participation_percent=96.8,
        raw_members_votes=[
            {"mp_id": "1", "mp_name": "Anna Nowak", "vote": "YES"},
            {"mp_id": "2", "mp_name": "Piotr Kowalski", "vote": "NO"}, # Buntownik w KO!
            {"mp_id": "3", "mp_name": "Jan Absencki", "vote": "NOT_VOTED"}
        ]
    )
    cr1_pis = ClubVotingResult(
        voting_id=v1.id, club_id="PiS", decision="NO",
        yes_count=0, no_count=180, abstain_count=0, not_voted_count=10,
        party_members_total=190, participation_percent=94.7,
        raw_members_votes=[]
    )
    
    # Wyniki klubowe dla V2 (Stykowe)
    cr2_ko = ClubVotingResult(
        voting_id=v2.id, club_id="KO", decision="NO",
        yes_count=0, no_count=150, abstain_count=0, not_voted_count=5,
        party_members_total=155, participation_percent=96.8,
        raw_members_votes=[
            {"mp_id": "1", "mp_name": "Anna Nowak", "vote": "NO"},
            {"mp_id": "2", "mp_name": "Piotr Kowalski", "vote": "YES"}, # Znowu buntownik!
        ]
    )
    cr2_pis = ClubVotingResult(
        voting_id=v2.id, club_id="PiS", decision="YES",
        yes_count=180, no_count=0, abstain_count=0, not_voted_count=10,
        party_members_total=190, participation_percent=94.7,
        raw_members_votes=[]
    )
    
    db_session.add_all([cr1_ko, cr1_pis, cr2_ko, cr2_pis])
    db_session.commit()


def test_get_all_clubs_stats(client, seed_data):
    """Testuje pobieranie listy klubów i poprawność wyliczeń średniej spójności i poparcia większości"""
    res = client.get("/api/clubs")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2
    
    # PiS ma 190 posłów, KO 155 -> PiS pierwszy po sortowaniu malejącym
    pis_stat = next(c for c in data if c["club_id"] == "PiS")
    ko_stat = next(c for c in data if c["club_id"] == "KO")
    
    assert ko_stat["name"] == "Koalicja Obywatelska"
    assert ko_stat["total_votings"] == 2
    # W V1 KO głosowało YES (ustawa zdana -> majority=True). W V2 KO głosowało NO (wniosek niezdany -> majority=True).
    assert ko_stat["majority_support_percent"] == 100.0
    assert ko_stat["avg_cohesion"] == 100.0


def test_get_clubs_with_date_and_close_votings_filters(client, seed_data):
    """Testuje filtrowanie po dacie i tylko dla głosowań stykowych (<15 głosów różnicy)"""
    # Tylko stykowe -> powinno zwrócić statystyki tylko z V2 (215 vs 220)
    res = client.get("/api/clubs?close_votings_only=true")
    assert res.status_code == 200
    data = res.json()
    for c in data:
        assert c["total_votings"] == 1
        
    # Filtrowanie po dacie (tylko 2026-05-20 -> V1)
    res_date = client.get("/api/clubs?date_from=2026-05-20&date_to=2026-05-20")
    assert res_date.status_code == 200
    assert res_date.json()[0]["total_votings"] == 1


def test_get_agreement_matrix(client, seed_data):
    """Testuje generowanie Macierzy Zgodności NxN"""
    res = client.get("/api/clubs/matrix")
    assert res.status_code == 200
    data = res.json()
    assert "clubs" in data
    assert set(data["clubs"]) == {"KO", "PiS"}
    # W V1 KO=YES, PiS=NO. W V2 KO=NO, PiS=YES. Zgodność 0%!
    ko_idx = data["clubs"].index("KO")
    pis_idx = data["clubs"].index("PiS")
    assert data["matrix"][ko_idx][pis_idx] == 0.0
    assert data["matrix"][ko_idx][ko_idx] == 100.0


def test_compare_clubs(client, seed_data):
    """Testuje porównywarkę klubów (GET /api/clubs/compare)"""
    res = client.get("/api/clubs/compare?clubs=KO&clubs=PiS")
    assert res.status_code == 200
    data = res.json()
    assert data["common_votings"] == 2
    assert data["alignment_percent"] == 0.0
    assert len(data["comparison_history"]) == 2


def test_filter_votings_by_behavior(client, seed_data):
    """Testuje wyszukiwarkę behawioralną (GET /api/clubs/filter)"""
    # Znajdź głosowanie gdzie KO głosowało YES
    res = client.get("/api/clubs/filter?club_id=KO&decision=YES")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["voting_number"] == 1
    assert data[0]["club_decisions"]["KO"] == "YES"


def test_get_club_detailed_stats_and_rebels(client, seed_data):
    """Testuje widok szczegółowy klubu oraz Indeks Buntowników i Absencji"""
    res = client.get("/api/clubs/KO/stats")
    assert res.status_code == 200
    data = res.json()
    assert data["club_id"] == "KO"
    assert len(data["history"]) == 2
    
    # Piotr Kowalski wyłamał się w obu głosowaniach -> 2 rebel votes!
    assert len(data["rebels"]) > 0
    top_rebel = data["rebels"][0]
    assert top_rebel["mp_name"] == "Piotr Kowalski"
    assert top_rebel["rebel_votes_count"] == 2
    assert top_rebel["rebel_rate_percent"] == 100.0
    
    # Jan Absencki nie głosował w V1 -> 1 absent vote
    assert len(data["top_absentees"]) > 0
    top_absentee = next(r for r in data["top_absentees"] if r["mp_name"] == "Jan Absencki")
    assert top_absentee["absent_votes_count"] == 1
