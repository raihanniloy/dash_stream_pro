import os
os.environ["SKIP_PATH_VALIDATION"] = "1"

import pytest
from parsers import parse_file
from profiler import profile_data

FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures")


def test_profile_detects_numeric_column():
    parsed = parse_file(os.path.join(FIXTURES, "sales.csv"), "csv")
    profile = profile_data(parsed)
    assert profile["columns"]["revenue"]["type"] == "numeric"


def test_profile_detects_categorical_column():
    parsed = parse_file(os.path.join(FIXTURES, "sales.csv"), "csv")
    profile = profile_data(parsed)
    assert profile["columns"]["region"]["type"] == "categorical"


def test_profile_detects_datetime_column():
    parsed = parse_file(os.path.join(FIXTURES, "sales.csv"), "csv")
    profile = profile_data(parsed)
    assert profile["columns"]["date"]["type"] == "datetime"


def test_profile_numeric_stats():
    parsed = parse_file(os.path.join(FIXTURES, "sales.csv"), "csv")
    profile = profile_data(parsed)
    rev = profile["columns"]["revenue"]
    assert "min" in rev
    assert "max" in rev
    assert "mean" in rev
    assert rev["min"] == pytest.approx(900.25)
    assert rev["max"] == pytest.approx(2300.00)


def test_profile_includes_unique_count():
    parsed = parse_file(os.path.join(FIXTURES, "sales.csv"), "csv")
    profile = profile_data(parsed)
    assert profile["columns"]["region"]["unique_count"] == 2
    assert profile["columns"]["product"]["unique_count"] == 3


def test_profile_includes_null_count():
    parsed = parse_file(os.path.join(FIXTURES, "sales.csv"), "csv")
    profile = profile_data(parsed)
    for col_info in profile["columns"].values():
        assert "null_count" in col_info


def test_profile_returns_row_and_column_counts():
    parsed = parse_file(os.path.join(FIXTURES, "sales.csv"), "csv")
    profile = profile_data(parsed)
    assert profile["row_count"] == 5
    assert profile["column_count"] == 5


def test_profile_categorical_top_values():
    parsed = parse_file(os.path.join(FIXTURES, "sales.csv"), "csv")
    profile = profile_data(parsed)
    region = profile["columns"]["region"]
    assert "top_values" in region
    assert isinstance(region["top_values"], dict)
