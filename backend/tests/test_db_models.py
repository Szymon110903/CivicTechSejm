"""
TESTOWANY OBSZAR: Modele Bazodanowe i Relacje (SQLAlchemy Models and Relationships)

Plik testuje:
1. Zapis i odczyt klubów parlamentarnych (Party).
2. Zapis i odczyt posłów (Politician), w tym obsługę pola 'seat_number' i audit columns (created_at, updated_at).
3. Zapis i odczyt komisji sejmowych (Committee).
4. Relację i kaskadowe usuwanie projektów ustaw (Bill) oraz analiz (AnalysisResult).
5. Relację i kaskadowe usuwanie głosowań (Voting) oraz indywidualnych głosów (Vote).
6. Ograniczenie unikalności uq_voting_politician w tabeli votes (unikalność głosu posła na dane głosowanie).
"""

import pytest
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError

from app.core.db import Base
from app.models import Proceeding, VotingDay, Voting, Party, Politician, Committee, Bill, AnalysisResult, Vote


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


def test_party_and_politician_relations(db_session):
    """Testuje zapis klubu i posła oraz ich powiązanie relacyjne i pole seat_number"""
    # 1. Zapis Partii
    party = Party(id="KO", name="Koalicja Obywatelska")
    db_session.add(party)
    db_session.commit()
    
    # 2. Zapis Posła z seat_number
    politician = Politician(
        id=101,
        first_name="Jan",
        last_name="Kowalski",
        party_id="KO",
        seat_number=45,
        district_num=19,
        district_name="Warszawa"
    )
    db_session.add(politician)
    db_session.commit()
    
    # 3. Odczyt i weryfikacja
    db_politician = db_session.query(Politician).filter_by(id=101).first()
    assert db_politician is not None
    assert db_politician.first_name == "Jan"
    assert db_politician.last_name == "Kowalski"
    assert db_politician.seat_number == 45
    assert db_politician.party_id == "KO"
    assert db_politician.party.name == "Koalicja Obywatelska"
    assert db_politician.created_at is not None
    assert db_politician.updated_at is not None


def test_committee_creation(db_session):
    """Testuje poprawność zapisu komisji sejmowej"""
    committee = Committee(code="ENM", name="Komisja Energii, Klimatu i Aktywów Państwowych")
    db_session.add(committee)
    db_session.commit()
    
    db_comm = db_session.query(Committee).filter_by(code="ENM").first()
    assert db_comm is not None
    assert db_comm.name == "Komisja Energii, Klimatu i Aktywów Państwowych"


def test_bill_and_analysis_result_cascade(db_session):
    """Testuje kaskadowe usuwanie analizy po usunięciu powiązanego projektu ustawy (Bill)"""
    bill = Bill(
        term=10,
        print_number="12",
        title="Projekt ustawy o ochronie klimatu"
    )
    db_session.add(bill)
    db_session.commit()
    
    analysis = AnalysisResult(
        bill_id=bill.id,
        summary="Testowe podsumowanie ustawy",
        sentiment="POSITIVE",
        impact_category="Środowisko"
    )
    db_session.add(analysis)
    db_session.commit()
    
    # Sprawdzenie obecności
    assert db_session.query(AnalysisResult).filter_by(bill_id=bill.id).first() is not None
    
    # Usunięcie projektu ustawy
    db_session.delete(bill)
    db_session.commit()
    
    # Weryfikacja kaskadowego usunięcia analizy
    assert db_session.query(AnalysisResult).filter_by(bill_id=bill.id).first() is None


def test_voting_and_vote_cascade(db_session):
    """Testuje kaskadowe usuwanie głosów (Vote) po usunięciu głosowania (Voting)"""
    proceeding = Proceeding(term=10, proceeding_id="2", date=date(2026, 5, 1))
    db_session.add(proceeding)
    db_session.commit()
    
    day = VotingDay(proceeding_id=proceeding.id, date=date(2026, 5, 1))
    db_session.add(day)
    db_session.commit()
    
    voting = Voting(
        day_id=day.id,
        voting_number=5,
        sitting="2",
        title="Głosowanie testowe",
        passed=True,
        yes_count=231,
        no_count=200,
        abstain_count=29,
        not_voted=0,
        total_votes=460,
        attendance_percent=100.0
    )
    db_session.add(voting)
    db_session.commit()
    
    politician = Politician(id=202, first_name="Maria", last_name="Nowak")
    db_session.add(politician)
    db_session.commit()
    
    vote = Vote(
        voting_id=voting.id,
        politician_id=politician.id,
        vote="NO"
    )
    db_session.add(vote)
    db_session.commit()
    
    # Weryfikacja zapisu
    assert db_session.query(Vote).filter_by(voting_id=voting.id).first() is not None
    
    # Usunięcie głosowania
    db_session.delete(voting)
    db_session.commit()
    
    # Weryfikacja usunięcia głosu
    assert db_session.query(Vote).filter_by(voting_id=voting.id).first() is None


def test_unique_vote_constraint(db_session):
    """Testuje unikalność pary (voting_id, politician_id) w głosach"""
    proceeding = Proceeding(term=10, proceeding_id="3", date=date(2026, 5, 2))
    db_session.add(proceeding)
    db_session.commit()
    
    day = VotingDay(proceeding_id=proceeding.id, date=date(2026, 5, 2))
    db_session.add(day)
    db_session.commit()
    
    voting = Voting(
        day_id=day.id,
        voting_number=1,
        sitting="3",
        title="Głosowanie 1",
        passed=True,
        yes_count=240,
        no_count=220,
        abstain_count=0,
        not_voted=0,
        total_votes=460,
        attendance_percent=100.0
    )
    db_session.add(voting)
    
    politician = Politician(id=303, first_name="Piotr", last_name="Zieliński")
    db_session.add(politician)
    db_session.commit()
    
    # 1. Pierwszy głos - poprawny
    vote1 = Vote(voting_id=voting.id, politician_id=politician.id, vote="YES")
    db_session.add(vote1)
    db_session.commit()
    
    # 2. Drugi głos tego samego posła na to samo głosowanie - błąd unikalności
    vote2 = Vote(voting_id=voting.id, politician_id=politician.id, vote="NO")
    db_session.add(vote2)
    
    with pytest.raises(IntegrityError):
        db_session.commit()
