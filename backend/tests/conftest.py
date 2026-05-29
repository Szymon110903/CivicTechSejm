"""
Plik konfiguracyjny pytest (conftest.py)

Uruchamia się przed załadowaniem jakichkolwiek testów i modułów aplikacji.
Służy do ustawienia zmiennej środowiskowej DATABASE_URL na SQLite w pamięci,
aby testy jednostkowe i integracyjne nie próbowały łączyć się z produkcyjnym PostgreSQL.
"""

import os

# Ustawiamy testową bazę SQLite w pamięci dla całego procesu testowego
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
