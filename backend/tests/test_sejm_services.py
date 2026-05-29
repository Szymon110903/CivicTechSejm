"""
TESTOWANY OBSZAR: Serwis ETL (import_proceeding_votings)

Plik testuje:
1. Prawidłowy proces importu posiedzeń (Proceeding) i dni głosowań (VotingDay).
2. Pobieranie, parsowanie i poprawność statystyk głosowań (yes/no/passed) zapisywanych w modelu Voting.
3. Agregację głosów indywidualnych posłów na poziomie klubów parlamentarnych (ClubVotingResult) oraz wyliczanie frekwencji klubowej.
4. Zapisywanie szczegółów oddanych głosów poselskich w tabeli 'votes' (relacja z posłami i głosowaniem).
5. Idempotentność mechanizmu importu (ponowny import tego samego posiedzenia usuwa stare dane i wstawia nowe bez duplikacji).
"""

import pytest
from datetime import date
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.db import Base
from app.models import Proceeding, VotingDay, Voting, ClubVotingResult, Vote, Politician, Party
from app.services.sejm_services import import_proceeding_votings


@pytest.fixture(name="db_session")
def fixture_db_session():
    """Tworzy czystą bazę danych w pamięci (SQLite) na potrzeby każdego testu"""
    engine = create_engine("sqlite:///:memory:")
    SessionLocal = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        engine.dispose()


@pytest.mark.asyncio
async def test_import_proceeding_votings_pipeline(db_session):
    """Testuje pełny przepływ importu posiedzenia z API do bazy danych, weryfikując poprawność struktur i agregacji"""
    # 1. Przygotowujemy dane słownikowe posłów w bazie, aby klucze obce dla posłów i partii były poprawne
    party = Party(id="PiS", name="Prawo i Sprawiedliwość")
    db_session.add(party)
    
    mp1 = Politician(id=1, first_name="Andrzej", last_name="Adamczyk", party_id="PiS")
    mp2 = Politician(id=2, first_name="Mariusz", last_name="Błaszczak", party_id="PiS")
    db_session.add_all([mp1, mp2])
    db_session.commit()

    # 2. Mockujemy klienta API Sejmu
    client = MagicMock()
    
    # Mock get_proceedings
    client.get_proceedings = AsyncMock(return_value={
        "number": 1,
        "dates": ["2023-12-11", "2023-12-12"]
    })
    
    # Mock get_votings dla listy głosowań
    client.get_votings = AsyncMock()
    client.get_votings.side_effect = [
        # Pierwsze wywołanie (wykaz głosowań): zwraca listę z jednym głosowaniem
        [
            {
                "votingNumber": 101,
                "date": "2023-12-11T12:00:00Z"
            }
        ],
        # Drugie wywołanie (szczegóły głosowania 101): zwraca pełne wyniki
        {
            "yes": 2,
            "no": 0,
            "abstain": 0,
            "notParticipating": 0,
            "term": 10,
            "sitting": 1,
            "sittingDay": 1,
            "votingNumber": 101,
            "date": "2023-12-11T12:00:00Z",
            "title": "Głosowanie nad ustawą A",
            "description": "Opis ustawy A",
            "topic": "Temat A",
            "majorityVotes": 2,
            "votes": [
                {
                    "MP": 1,
                    "firstName": "Andrzej",
                    "lastName": "Adamczyk",
                    "club": "PiS",
                    "vote": "YES"
                },
                {
                    "MP": 2,
                    "firstName": "Mariusz",
                    "lastName": "Błaszczak",
                    "club": "PiS",
                    "vote": "YES"
                }
            ]
        }
    ]

    # 3. Uruchamiamy import
    result = await import_proceeding_votings(db_session, client, term=10, proceeding_id="1")
    
    assert result["success"] is True
    assert result["imported_votings"] == 1
    assert result["errors_count"] == 0

    # 4. Weryfikujemy zapisane dane w bazie
    proc = db_session.query(Proceeding).filter_by(term=10, proceeding_id="1").first()
    assert proc is not None
    assert proc.date == date(2023, 12, 11)
    assert len(proc.days) == 1
    
    day = proc.days[0]
    assert day.date == date(2023, 12, 11)
    assert len(day.votings) == 1
    
    voting = day.votings[0]
    assert voting.voting_number == 101
    assert voting.yes_count == 2
    assert voting.passed is True
    assert voting.attendance_percent == 100.0
    
    # Wynik klubowy
    assert len(voting.club_results) == 1
    c_res = voting.club_results[0]
    assert c_res.club_id == "PiS"
    assert c_res.yes_count == 2
    assert c_res.decision.value if hasattr(c_res.decision, "value") else c_res.decision == "YES"
    assert c_res.participation_percent == 100.0
    
    # Indywidualne głosy (tabela votes)
    votes_in_db = db_session.query(Vote).filter_by(voting_id=voting.id).all()
    assert len(votes_in_db) == 2
    assert {v.politician_id for v in votes_in_db} == {1, 2}
    assert all(v.vote == "YES" for v in votes_in_db)


@pytest.mark.asyncio
async def test_import_idempotency(db_session):
    """Testuje, że ponowne uruchomienie importu nie powiela rekordów, lecz je nadpisuje (idempotentność)"""
    client = MagicMock()
    client.get_proceedings = AsyncMock(return_value={"number": 1, "dates": ["2023-12-11"]})
    
    voting_detail = {
        "yes": 1, "no": 0, "abstain": 0, "notParticipating": 0,
        "term": 10, "sitting": 1, "votingNumber": 50,
        "date": "2023-12-11T10:00:00Z", "title": "Tytuł 50",
        "votes": []
    }
    
    client.get_votings = AsyncMock()
    client.get_votings.side_effect = [
        [{"votingNumber": 50, "date": "2023-12-11T10:00:00Z"}],  # Wykaz import 1
        voting_detail,                                            # Szczegóły import 1
        [{"votingNumber": 50, "date": "2023-12-11T10:00:00Z"}],  # Wykaz import 2 (ponowny)
        voting_detail                                             # Szczegóły import 2
    ]
    
    # Pierwszy import
    await import_proceeding_votings(db_session, client, term=10, proceeding_id="1")
    
    # Drugi import (idempotentny)
    await import_proceeding_votings(db_session, client, term=10, proceeding_id="1")
    
    # Weryfikacja
    proceedings = db_session.query(Proceeding).all()
    assert len(proceedings) == 1
    
    votings = db_session.query(Voting).all()
    assert len(votings) == 1
