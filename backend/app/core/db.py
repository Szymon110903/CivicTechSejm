import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/civictechsejm")

# Tworzymy silnik bazy danych
engine = create_engine(DATABASE_URL)

# Fabryka sesji
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Współdzielona klasa bazowa dla modeli SQLAlchemy
Base = declarative_base()

def get_db():
    """Zależność wstrzykująca sesję bazy danych w FastAPI"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
