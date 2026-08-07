import os
import json
import logging
import pdfplumber
import google.generativeai as genai
from pydantic import BaseModel, ValidationError

logger = logging.getLogger(__name__)

# Konfiguracja Gemini API (Klucz powinien być w środowisku)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def extract_text_from_pdf_path(pdf_path: str) -> str:
    """Wydobywa tekst z pliku PDF zadanego ścieżką."""
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
    except Exception as e:
        logger.error(f"Błąd podczas ekstrakcji tekstu z PDF: {e}")
        raise ValueError(f"Nie udało się przetworzyć pliku PDF: {e}")
    return text

def build_prompt(document_text: str) -> str:
    """Buduje systemowy prompt wymuszający odpowiedź w formacie JSON i obiektywny ton."""
    prompt = f"""Jesteś niezależnym, całkowicie obiektywnym analitykiem prawnym i legislacyjnym. Twoim zadaniem jest stworzenie bezstronnego podsumowania poniższego tekstu projektu ustawy (najczęściej Uzasadnienia lub Oceny Skutków Regulacji).

ZASADY:
1. MUSISZ zachować absolutnie neutralny, nietendencyjny ton. Nie oceniaj, czy zmiany są dobre, czy złe. Opisuj wyłącznie fakty.
2. Twoja odpowiedź MUSI być w formacie poprawnym i czystym JSON, BEZ znaczników markdown (jak ```json).
3. Struktura JSONa musi być następująca:
{{
  "summary": "Ogólne podsumowanie, o czym jest ta ustawa (2-3 zdania).",
  "affected_groups": ["Grupa 1", "Grupa 2", "Grupa 3"],
  "changes": "Konkretne zmiany wprowadzane przez ustawę w polskim prawie lub organizacji (kilka zdań, wylistowanie).",
  "consequences": "Konsekwencje i przewidywane skutki regulacji - np. finansowe, społeczne, bez ich oceniania."
}}

Tekst do analizy:
---
{document_text}
---

Zwróć TYLKO czysty obiekt JSON.
"""
    return prompt

def generate_bill_summary(document_text: str) -> dict:
    """Wysyła tekst do Gemini i zwraca sparsowany słownik (JSON)."""
    if not GEMINI_API_KEY:
         logger.warning("Brak GEMINI_API_KEY. Używam mockowanej odpowiedzi LLM.")
         return {
             "summary": "Mock: Ustawienie środowiska nie zawiera GEMINI_API_KEY.",
             "affected_groups": ["Mock Group 1"],
             "changes": "Mocked changes.",
             "consequences": "Mocked consequences."
         }
         
    try:
        # Gemini 1.5 Flash jest darmowe i ma bardzo duże okno kontekstowe (1M tokenów)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = build_prompt(document_text)
        response = model.generate_content(prompt)
        
        raw_text = response.text.strip()
        
        # Czasami modele wrzucają odpowiedź w blok kodu ```json ... ```
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
            
        raw_text = raw_text.strip()
        parsed_json = json.loads(raw_text)
        
        # Podstawowa weryfikacja kluczy
        required_keys = {"summary", "affected_groups", "changes", "consequences"}
        if not required_keys.issubset(parsed_json.keys()):
             logger.warning("Odpowiedź LLM nie zawierała wszystkich wymaganych kluczy.")
        
        return parsed_json

    except json.JSONDecodeError as e:
        logger.error(f"Błąd parsowania JSON od LLM: {response.text}")
        raise ValueError("Model LLM zwrócił niepoprawny format JSON.") from e
    except Exception as e:
        logger.error(f"Błąd podczas generowania podsumowania przez LLM: {e}")
        raise
