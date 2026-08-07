import os
import json
import logging
from ..core.celery_app import celery_app
from ..core.db import SessionLocal
from ..models.bill import Bill
from ..models.document import BillDocument
from ..models.analysis_result import AnalysisResult
from ..services.llm_service import generate_bill_summary, extract_text_from_pdf_path

logger = logging.getLogger(__name__)

@celery_app.task(name="generate_bill_summary_task", bind=True)
def generate_bill_summary_task(self, bill_id: int):
    """Zadanie Celery generujące obiektywne podsumowanie ustawy na podstawie PDFów OSR/Uzasadnień."""
    db = SessionLocal()
    try:
        # Sprawdzamy czy ustawa w ogóle istnieje
        bill = db.query(Bill).filter(Bill.id == bill_id).first()
        if not bill:
            logger.error(f"Nie znaleziono ustawy o ID {bill_id}")
            return {"status": "error", "message": "Bill not found"}

        # 1. Deduplikacja: Sprawdzamy, czy analiza już istnieje
        existing_analysis = db.query(AnalysisResult).filter(AnalysisResult.bill_id == bill_id).first()
        if existing_analysis and existing_analysis.raw_analysis_data:
            logger.info(f"Analiza dla ustawy {bill_id} już istnieje. Pomijanie generacji.")
            return {"status": "skipped", "message": "Summary already exists"}

        # 2. Pobieramy powiązany plik PDF (najlepiej OSR lub Uzasadnienie, szukamy po nazwie lub bierzemy pierwszy dokument PDF)
        documents = db.query(BillDocument).filter(BillDocument.bill_id == bill_id).all()
        target_doc = None
        for doc in documents:
            if doc.format and "PDF" in doc.format.upper() and doc.local_path:
                target_doc = doc
                # Preferujemy OSR, jeśli znajdziemy taką frazę w nazwie (często są tam główne skutki dla grup społecznych)
                if doc.filename and ("osr" in doc.filename.lower() or "uzasadnienie" in doc.filename.lower()):
                    break
        
        if not target_doc:
            logger.error(f"Ustawa {bill_id} nie posiada powiązanego pliku PDF z OSR/Uzasadnieniem zapisanego na dysku.")
            return {"status": "error", "message": "No valid PDF document found for bill"}

        if not os.path.exists(target_doc.local_path):
             logger.error(f"Plik fizycznie nie istnieje na dysku: {target_doc.local_path}")
             return {"status": "error", "message": "File missing from disk"}

        # 3. Ekstrakcja tekstu z PDF
        logger.info(f"Ekstrakcja tekstu z pliku: {target_doc.filename}")
        document_text = extract_text_from_pdf_path(target_doc.local_path)
        
        if not document_text.strip():
             logger.error("Wydobyto pusty tekst z pliku PDF.")
             return {"status": "error", "message": "Extracted text is empty"}

        # 4. Wywołanie LLM
        logger.info(f"Wysyłanie zapytania do LLM dla ustawy {bill_id}")
        ai_result_json = generate_bill_summary(document_text)

        # 5. Zapis wyników do bazy
        if not existing_analysis:
            existing_analysis = AnalysisResult(
                bill_id=bill_id,
                summary=ai_result_json.get("summary", ""),
                raw_analysis_data=ai_result_json
            )
            db.add(existing_analysis)
        else:
            existing_analysis.summary = ai_result_json.get("summary", "")
            existing_analysis.raw_analysis_data = ai_result_json
            
        db.commit()
        logger.info(f"Analiza dla ustawy {bill_id} została wygenerowana pomyślnie.")
        return {"status": "success", "message": "Summary generated", "bill_id": bill_id}

    except Exception as e:
        logger.error(f"Nieoczekiwany błąd w tasku Celery dla ustawy {bill_id}: {e}")
        db.rollback()
        raise e
    finally:
        db.close()
