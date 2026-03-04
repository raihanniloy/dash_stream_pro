import os
os.environ["SKIP_PATH_VALIDATION"] = "1"
import pytest
from parsers import parse_file, get_sheet_names

FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures")


def test_parse_csv_returns_correct_shape():
    result = parse_file(os.path.join(FIXTURES, "sales.csv"), "csv")
    assert result["row_count"] == 5
    assert result["column_count"] == 5


def test_parse_csv_returns_column_names():
    result = parse_file(os.path.join(FIXTURES, "sales.csv"), "csv")
    assert result["columns"] == ["date", "region", "product", "revenue", "units"]


def test_parse_csv_returns_data_records():
    result = parse_file(os.path.join(FIXTURES, "sales.csv"), "csv")
    assert len(result["data"]) == 5
    assert result["data"][0]["region"] == "North"
    assert result["data"][0]["revenue"] == 1500.50


def test_parse_txt_auto_detects_delimiter():
    result = parse_file(os.path.join(FIXTURES, "sales.txt"), "txt")
    assert result["row_count"] == 2
    assert "region" in result["columns"]


def test_parse_nonexistent_file_raises():
    with pytest.raises(FileNotFoundError):
        parse_file("/nonexistent/file.csv", "csv")


def test_parse_unsupported_type_raises():
    with pytest.raises(ValueError, match="Unsupported file type"):
        parse_file(os.path.join(FIXTURES, "sales.csv"), "pdf")


def test_parse_returns_dtypes():
    result = parse_file(os.path.join(FIXTURES, "sales.csv"), "csv")
    assert "dtypes" in result
    assert "revenue" in result["dtypes"]
