# backend/app/main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager
from .dependencies import get_sejm_client
from .routers import mps, votings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Automatyczne tworzenie tabel (jeśli nie istnieją) na starcie aplikacji
    from .core.db import engine, Base
    from . import models
    Base.metadata.create_all(bind=engine)
    
    yield
    
    client = await get_sejm_client()
    await client.close()

app = FastAPI(title="CivicTechSejm", lifespan=lifespan)

# Podpinamy moduły endpointów
app.include_router(mps.router, prefix="/api")
app.include_router(votings.router, prefix="/api")

@app.get("/api/health")
async def health():
    return {"status": "ok"}