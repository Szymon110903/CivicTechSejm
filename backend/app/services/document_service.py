import os
import aiofiles
from fastapi import HTTPException
from sqlalchemy.orm import Session
from ..models.document import BillDocument, DocumentDownloadAudit
from ..models.bill import Bill
from ..dependencies import get_sejm_client

# Konfiguracja katalogu na archiwum dokumentów
ARCHIVE_DIR = os.getenv("ARCHIVE_DIR", "/app/data/archive")

class DocumentService:
    @staticmethod
    async def sync_bill_documents(db: Session, bill_id: int):
        """
        Pobiera metadane druku z API Sejmu dla danego projektu (Bill)
        i synchronizuje listę załączników (BillDocument) w bazie.
        """
        bill = db.query(Bill).filter(Bill.id == bill_id).first()
        if not bill or not bill.print_number:
            raise HTTPException(status_code=404, detail="Bill or print_number not found")

        # Wyciągamy sam numer druku, zakłądając że print_number to np. "123" albo "druk nr 123"
        # Trzeba to dostosować, zależnie od formatu w bazie.
        num = bill.print_number.replace("druk nr ", "").strip()

        client = await get_sejm_client()
        try:
            print_data = await client.get_print(term=bill.term, num=num)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to fetch print data from Sejm API: {str(e)}")

        attachments = print_data.get("attachments", [])
        synced_docs = []
        
        # Pobieramy istniejące dokumenty, żeby nie powielać
        existing_docs = {doc.filename: doc for doc in bill.documents}

        for attach_name in attachments:
            if attach_name in existing_docs:
                synced_docs.append(existing_docs[attach_name])
                continue
                
            # Wyciągamy rozszerzenie jako format
            format_ext = attach_name.split(".")[-1].upper() if "." in attach_name else "UNKNOWN"
            
            # Tworzymy nowy rekord
            new_doc = BillDocument(
                bill_id=bill.id,
                filename=attach_name,
                original_url=f"https://api.sejm.gov.pl/sejm/term{bill.term}/prints/{num}/{attach_name}",
                format=format_ext,
                version=1
            )
            db.add(new_doc)
            synced_docs.append(new_doc)

        db.commit()
        for doc in synced_docs:
            db.refresh(doc)
            
        return synced_docs

    @staticmethod
    async def get_or_download_document(db: Session, document_id: int, client_ip: str = None, user_agent: str = None) -> str:
        """
        Zwraca lokalną ścieżkę do pliku. Jeśli pliku nie ma, pobiera z API i archiwizuje na dysku.
        Zapisuje informację o pobraniu (audyt).
        """
        doc = db.query(BillDocument).filter(BillDocument.id == document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        # Logujemy pobranie (Audyt)
        audit = DocumentDownloadAudit(
            document_id=doc.id,
            client_ip=client_ip,
            user_agent=user_agent
        )
        db.add(audit)
        db.commit()

        # Sprawdzamy czy plik istnieje lokalnie
        if doc.local_path and os.path.exists(doc.local_path):
            return doc.local_path

        # Pobieranie "on-demand" z API Sejmu
        bill = doc.bill
        num = bill.print_number.replace("druk nr ", "").strip()
        
        client = await get_sejm_client()
        try:
            file_bytes = await client.download_print_attachment(term=bill.term, num=num, attach_name=doc.filename)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to download file from Sejm API: {str(e)}")

        # Przygotowujemy katalog
        os.makedirs(ARCHIVE_DIR, exist_ok=True)
        local_path = os.path.join(ARCHIVE_DIR, f"term{bill.term}_print{num}_{doc.filename}")
        
        # Zapisujemy na dysk asynchronicznie
        async with aiofiles.open(local_path, "wb") as f:
            await f.write(file_bytes)

        # Aktualizujemy rekord w bazie o ścieżkę lokalną
        doc.local_path = local_path
        db.commit()

        return local_path
