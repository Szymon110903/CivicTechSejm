from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
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
    Zwraca sam plik (binarnie), pobierając go "on-demand" z API Sejmu (lub z lokalnego archiwum, jeśli już jest).
    Odnotowuje ten fakt w audycie (logach pobrań).
    Frontend może wywołać ten endpoint w iframe albo <a href="..." target="_blank">, by pokazać PDF w przeglądarce.
    """
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    local_path = await DocumentService.get_or_download_document(
        db, document_id, client_ip=client_ip, user_agent=user_agent
    )
    
    # Określamy media_type na podstawie rozszerzenia
    ext = local_path.split(".")[-1].lower() if "." in local_path else ""
    media_type = "application/pdf" if ext == "pdf" else "text/html" if ext in ("html", "htm") else "application/octet-stream"

    return FileResponse(path=local_path, media_type=media_type, filename=local_path.split("/")[-1])
