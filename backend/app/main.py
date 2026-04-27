# backend/app/main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager
from .dependencies import get_sejm_client
from .routers import mps  # Importujesz swoje routery

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    client = await get_sejm_client()
    await client.close()

app = FastAPI(title="CivicTechSejm", lifespan=lifespan)

# Podpinamy moduły endpointów
app.include_router(mps.router, prefix="/api")

@app.get("/api/health")
async def health():
    return {"status": "ok"}