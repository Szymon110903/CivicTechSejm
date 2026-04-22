from fastapi import FastAPI

app = FastAPI(title="CivicTechSejm API")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "message": "CivicTechSejm FastAPI backend is running"}
