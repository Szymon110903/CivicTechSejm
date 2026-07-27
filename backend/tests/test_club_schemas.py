"""
TESTOWANY OBSZAR: Schematy DTO dla statystyk klubowych i analityki (Issue 10)

Plik weryfikuje poprawność syntaktyczną i walidację schematów Pydantic dodanych w Kroku 1 wdrożenia.
"""

import pytest
from app.schemas import (
    ClubSummaryDTO, RebelMpDTO, ClubHistoricalPointDTO, ClubDetailedStatsDTO,
    AgreementMatrixCellDTO, AgreementMatrixDTO, ClubComparisonDTO, ClubBehaviorFilterResultDTO
)

def test_club_summary_dto_creation():
    """Testuje inicjalizację i walidację DTO podsumowania klubu"""
    dto = ClubSummaryDTO(
        club_id="KO",
        name="Koalicja Obywatelska",
        members_count=157,
        avg_attendance=98.5,
        avg_cohesion=99.2,
        total_votings=120,
        majority_support_percent=95.0,
        decisions_breakdown={"YES": 80, "NO": 30, "ABSTAIN": 8, "MIXED": 2}
    )
    assert dto.club_id == "KO"
    assert dto.decisions_breakdown["YES"] == 80
    assert dto.avg_cohesion == 99.2

def test_rebel_mp_dto_creation():
    """Testuje DTO posła wyłamującego się z dyscypliny klubowej"""
    dto = RebelMpDTO(
        mp_id=101,
        mp_name="Jan Kowalski",
        club_id="PiS",
        rebel_votes_count=15,
        rebel_rate_percent=12.5,
        absent_votes_count=5,
        absent_rate_percent=4.1
    )
    assert dto.mp_id == 101
    assert dto.rebel_rate_percent == 12.5

def test_agreement_matrix_dto_creation():
    """Testuje DTO dla macierzy zgodności NxN"""
    cell = AgreementMatrixCellDTO(
        club_a="KO",
        club_b="Lewica",
        common_votings=100,
        agreed_votings=89,
        agreement_percent=89.0
    )
    matrix_dto = AgreementMatrixDTO(
        clubs=["KO", "Lewica"],
        matrix=[[100.0, 89.0], [89.0, 100.0]],
        cells=[cell]
    )
    assert len(matrix_dto.clubs) == 2
    assert matrix_dto.matrix[0][1] == 89.0
    assert matrix_dto.cells[0].agreement_percent == 89.0
