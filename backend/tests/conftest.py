"""
Plik konfiguracyjny pytest (conftest.py)

Uruchamia się przed załadowaniem jakichkolwiek testów i modułów aplikacji.
Służy do ustawienia zmiennej środowiskowej DATABASE_URL na SQLite w pamięci,
aby testy jednostkowe i integracyjne nie próbowały łączyć się z produkcyjnym PostgreSQL.
"""

import os
import sys

# Dodajemy folder główny backendu do ścieżki Pythona, żeby widział moduł 'app'
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Ustawiamy testową bazę SQLite w pamięci dla całego procesu testowego
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
