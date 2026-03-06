import json
import pytest
from unittest.mock import patch, MagicMock
from ai_engine import suggest_charts, build_prompt, FALLBACK_RULES


def _make_profile():
    return {
        "row_count": 100,
        "column_count": 4,
        "columns": {
            "date": {"type": "datetime", "null_count": 0, "min": "2024-01-01", "max": "2024-12-31"},
            "region": {"type": "categorical", "null_count": 0, "unique_count": 4, "top_values": {"North": 25, "South": 25, "East": 25, "West": 25}},
            "revenue": {"type": "numeric", "null_count": 0, "min": 100, "max": 5000, "mean": 2500, "median": 2400},
            "units": {"type": "numeric", "null_count": 0, "min": 10, "max": 500, "mean": 250, "median": 240},
        },
    }


def test_build_prompt_includes_column_info():
    profile = _make_profile()
    prompt = build_prompt(profile, num_suggestions=5)
    assert "date" in prompt
    assert "revenue" in prompt
    assert "categorical" in prompt


@patch("ai_engine.anthropic_client")
def test_suggest_charts_returns_structured_suggestions(mock_client):
    suggestions = [
        {"type": "line", "x": "date", "y": "revenue", "title": "Revenue Over Time", "reason": "Track trends"},
        {"type": "bar", "x": "region", "y": "revenue", "title": "Revenue by Region", "reason": "Compare regions"},
    ]
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=json.dumps(suggestions))]
    mock_client.messages.create.return_value = mock_response

    result = suggest_charts(_make_profile(), num_suggestions=2)
    assert len(result) == 2
    assert result[0]["type"] == "line"
    assert result[0]["x"] == "date"


def test_fallback_rules_produce_suggestions():
    profile = _make_profile()
    result = FALLBACK_RULES(profile)
    assert len(result) > 0
    assert all("type" in s and "x" in s and "y" in s for s in result)
