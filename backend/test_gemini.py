import os
from dotenv import load_dotenv

# Załaduj klucz z pliku .env
load_dotenv()

from app.services.llm_service import generate_bill_summary

def run_test():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ Błąd: Nie znaleziono zmiennej GEMINI_API_KEY w pliku .env")
        return
        
    print(f"OK! Znaleziono klucz API: {api_key[:10]}...")
    print("Wysylanie testowego tekstu ustawy do Gemini...")
    
    test_text = """
    Projekt ustawy o zmianie ustawy o ochronie przyrody.
    Art. 1. Wprowadza się całkowity zakaz wycinki drzew w parkach miejskich bez specjalnego zezwolenia.
    Uzasadnienie: Zmiana ma na celu ochronę terenów zielonych w miastach przed nadmierną deweloperką i poprawę jakości powietrza.
    Grupy docelowe: Mieszkańcy miast, deweloperzy, samorządy.
    Skutki finansowe: Zwiększenie nakładów na utrzymanie parków o 5 mln zł rocznie.
    """
    
    try:
        result = generate_bill_summary(test_text)
        print("\nSUKCES! Otrzymano odpowiedz w formacie JSON:\n")
        import json
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"\nBLAD podczas komunikacji z API: {e}")

if __name__ == "__main__":
    run_test()
