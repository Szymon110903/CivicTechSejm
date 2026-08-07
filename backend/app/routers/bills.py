from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from ..core.db import get_db
from ..services.document_service import DocumentService
from ..models.document import BillDocument

router = APIRouter(prefix="/bills", tags=["Bills"])

@router.post("/{bill_id}/documents/sync")
async def sync_documents(bill_id: int, db: Session = Depends(get_db)):
    """
    Synchronizuje z Sejm API listę dostępnych załączników (dokumentów) dla danego projektu (Bill).
    """
    synced = await DocumentService.sync_bill_documents(db, bill_id)
    return {
        "success": True,
        "message": f"Synchronized {len(synced)} documents for bill {bill_id}.",
        "documents": [
            {
                "id": doc.id,
                "filename": doc.filename,
                "format": doc.format,
                "original_url": doc.original_url
            } for doc in synced
        ]
    }

@router.get("/{bill_id}/documents")
async def list_documents(bill_id: int, db: Session = Depends(get_db)):
    """
    Zwraca listę dokumentów powiązanych z projektem.
    """
    docs = db.query(BillDocument).filter(BillDocument.bill_id == bill_id).all()
    return [
        {
            "id": doc.id,
            "filename": doc.filename,
            "format": doc.format,
            "original_url": doc.original_url,
            "is_archived_locally": bool(doc.local_path)
        } for doc in docs
    ]

@router.get("/documents/{document_id}/download")
async def download_document(document_id: int, request: Request, db: Session = Depends(get_db)):
    """
    Zwraca sam plik (binarnie), pobierając go "on-demand" z API Sejmu (lub z bazy/lokalnego archiwum).
    Odnotowuje ten fakt w audycie (logach pobrań).
    Frontend może wywołać ten endpoint w iframe albo <a href="..." target="_blank">, by pokazać PDF w przeglądarce.
    """
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    doc = await DocumentService.get_or_download_document(
        db, document_id, client_ip=client_ip, user_agent=user_agent
    )
    
    # Określamy media_type na podstawie rozszerzenia
    ext = doc.filename.split(".")[-1].lower() if "." in doc.filename else ""
    media_type = "application/pdf" if ext == "pdf" else "text/html" if ext in ("html", "htm") else "application/octet-stream"

    if doc.file_content:
        return Response(content=doc.file_content, media_type=media_type)
    elif doc.local_path:
        return FileResponse(path=doc.local_path, media_type=media_type, filename=doc.filename)
    else:
        raise HTTPException(status_code=404, detail="Document content not available")

@router.post("/{bill_id}/generate-summary")
async def generate_summary(bill_id: int, db: Session = Depends(get_db)):
    """
    Zleca asynchroniczne wygenerowanie podsumowania AI dla danej ustawy.
    """
    from ..models.bill import Bill
    from ..models.analysis_result import AnalysisResult
    from ..worker.tasks import generate_bill_summary_task

    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    # Sprawdzenie deduplikacji od razu w API
    existing_analysis = db.query(AnalysisResult).filter(AnalysisResult.bill_id == bill_id).first()
    if existing_analysis and existing_analysis.raw_analysis_data:
        return {"status": "success", "message": "Summary already exists"}

    # Wysłanie zadania do brokera Celery (Redis)
    generate_bill_summary_task.delay(bill_id)
    return {"status": "pending", "message": "Summary generation started in background"}

@router.get("/{bill_id}/summary")
async def get_summary(bill_id: int, db: Session = Depends(get_db)):
    """
    Zwraca wygenerowane podsumowanie AI dla danej ustawy, jeśli istnieje.
    """
    from ..models.analysis_result import AnalysisResult
    
    analysis = db.query(AnalysisResult).filter(AnalysisResult.bill_id == bill_id).first()
    if not analysis or not analysis.raw_analysis_data:
        # Można sprawdzić np. w Redis czy task jest wciąż aktywny, 
        # ale dla uproszczenia zwracamy status pending, jeśli nie ma danych w bazie
        return {"status": "pending", "data": None}
        
    return {
        "status": "success",
        "data": analysis.raw_analysis_data
    }

