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
        
        # Deduplikacja po rdzeniu nazwy pliku z preferencją dla PDF
        import os
        attachments_dict = {}
        for att in attachments:
            base, ext = os.path.splitext(att)
            ext = ext.lower()
            if base not in attachments_dict:
                attachments_dict[base] = []
            attachments_dict[base].append((att, ext))
            
        unique_attachments = []
        for base, files in attachments_dict.items():
            pdfs = [f for f in files if f[1] == '.pdf']
            if pdfs:
                unique_attachments.append(pdfs[0][0])
            else:
                unique_attachments.append(files[0][0])
        
        # Pobieramy istniejące dokumenty, żeby nie powielać
        # Zmieniamy klucz na original_url, aby uniknąć problemu zmiany rozszerzenia podczas konwersji
        existing_urls = {doc.original_url: doc for doc in bill.documents}

        for attach_name in unique_attachments:
            original_url = f"https://api.sejm.gov.pl/sejm/term{bill.term}/prints/{num}/{attach_name}"
            if original_url in existing_urls:
                synced_docs.append(existing_urls[original_url])
                continue
                
            # Wyciągamy rozszerzenie jako format
            format_ext = attach_name.split(".")[-1].upper() if "." in attach_name else "UNKNOWN"
            
            # Tworzymy nowy rekord
            new_doc = BillDocument(
                bill_id=bill.id,
                filename=attach_name,
                original_url=original_url,
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
    async def get_or_download_document(db: Session, document_id: int, client_ip: str = None, user_agent: str = None) -> BillDocument:
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

        # Funkcja pomocnicza do konwersji
        async def convert_to_pdf(local_file_path, document):
            import subprocess
            import logging
            logger = logging.getLogger(__name__)
            pdf_dir = os.path.dirname(local_file_path)
            cmd = [
                "libreoffice", "--headless", "--convert-to", "pdf",
                local_file_path, "--outdir", pdf_dir
            ]
            try:
                subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                base_path = os.path.splitext(local_file_path)[0]
                pdf_path = base_path + ".pdf"
                
                if os.path.exists(pdf_path):
                    async with aiofiles.open(pdf_path, "rb") as f:
                        file_bytes = await f.read()
                        
                    document.local_path = pdf_path
                    document.file_content = file_bytes
                    document.filename = os.path.splitext(document.filename)[0] + ".pdf"
                    document.format = "PDF"
                    db.commit()
                    
                    try:
                        os.remove(local_file_path)
                    except OSError:
                        pass
                    return True
            except Exception as e:
                logger.error(f"Failed to convert {local_file_path} to PDF: {e}")
            return False

        # Sprawdzamy czy plik istnieje lokalnie
        if doc.local_path and os.path.exists(doc.local_path):
            if doc.local_path.lower().endswith(('.doc', '.docx')):
                # Został pobrany wcześniej, ale nie skonwertowany
                success = await convert_to_pdf(doc.local_path, doc)
                if success:
                    return doc
            else:
                return doc

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
        
        # Zapisujemy na dysk asynchronicznie (jako backup/cache)
        async with aiofiles.open(local_path, "wb") as f:
            await f.write(file_bytes)

        # Konwersja DOCX/DOC do PDF
        if doc.filename.lower().endswith(('.doc', '.docx')):
            success = await convert_to_pdf(local_path, doc)
            if success:
                return doc

        # Aktualizujemy rekord w bazie o ścieżkę lokalną i sam plik (jako BLOB) dla plików innych niż doc/docx (albo jeśli konwersja zawiodła)
        doc.local_path = local_path
        doc.file_content = file_bytes
        db.commit()

        return doc
