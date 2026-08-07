import pytest
from unittest.mock import patch, MagicMock
import json
from app.services.llm_service import generate_bill_summary, build_prompt

def test_build_prompt():
    text = "To jest testowy dokument OSR."
    prompt = build_prompt(text)
    
    assert "To jest testowy dokument OSR." in prompt
    assert "summary" in prompt
    assert "affected_groups" in prompt

@patch("app.services.llm_service.GEMINI_API_KEY", "dummy_key")
@patch("app.services.llm_service.genai.GenerativeModel")
def test_generate_bill_summary_success(mock_model_class):
    # Setup mock
    mock_response = MagicMock()
    mock_response.text = json.dumps({
        "summary": "To jest podsumowanie",
        "affected_groups": ["Obywatele", "Firmy"],
        "changes": "Zmiany X i Y",
        "consequences": "Brak skutków"
    })
    
    mock_model_instance = MagicMock()
    mock_model_instance.generate_content.return_value = mock_response
    mock_model_class.return_value = mock_model_instance
    
    # Wywołanie
    result = generate_bill_summary("Dummy text")
    
    # Asercje
    assert result["summary"] == "To jest podsumowanie"
    assert result["affected_groups"] == ["Obywatele", "Firmy"]
    assert result["changes"] == "Zmiany X i Y"
    mock_model_instance.generate_content.assert_called_once()


@patch("app.services.llm_service.GEMINI_API_KEY", "dummy_key")
@patch("app.services.llm_service.genai.GenerativeModel")
def test_generate_bill_summary_json_cleanup(mock_model_class):
    """Testuje czy usługa radzi sobie z wycięciem markdowna np. ```json ... ```"""
    mock_response = MagicMock()
    # Model zwraca brudny json
    raw_json = json.dumps({
        "summary": "S",
        "affected_groups": [],
        "changes": "C",
        "consequences": "C"
    })
    mock_response.text = f"```json\n{raw_json}\n```"
    
    mock_model_instance = MagicMock()
    mock_model_instance.generate_content.return_value = mock_response
    mock_model_class.return_value = mock_model_instance
    
    result = generate_bill_summary("Dummy text")
    
    assert result["summary"] == "S"
