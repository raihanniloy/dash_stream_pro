# services/streamlit-app/tests/test_chart_builder.py
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pandas as pd
import pytest
from chart_builder import build_chart


@pytest.fixture
def df():
    return pd.DataFrame({
        "region": ["North", "South", "East", "West"],
        "revenue": [1000.0, 1500.0, 1200.0, 800.0],
        "units": [10, 15, 12, 8],
    })


def test_bar_chart_returns_figure(df):
    fig = build_chart(df, {"type": "bar", "x": "region", "y": "revenue", "title": "Revenue by Region"})
    assert fig is not None
    assert fig.data[0].type == "bar"


def test_line_chart_returns_figure(df):
    fig = build_chart(df, {"type": "line", "x": "region", "y": "revenue", "title": "Revenue Trend"})
    assert fig is not None
    assert fig.data[0].type == "scatter"  # Plotly uses scatter for line


def test_area_chart_returns_figure(df):
    fig = build_chart(df, {"type": "area", "x": "region", "y": "revenue", "title": "Area Chart"})
    assert fig is not None
    assert fig.data[0].fill == "tozeroy"


def test_scatter_chart_returns_figure(df):
    fig = build_chart(df, {"type": "scatter", "x": "revenue", "y": "units", "title": "Scatter"})
    assert fig is not None
    assert fig.data[0].mode == "markers"


def test_pie_chart_returns_figure(df):
    fig = build_chart(df, {"type": "pie", "x": "region", "y": "revenue", "title": "Pie"})
    assert fig is not None
    assert fig.data[0].type == "pie"


def test_unknown_type_raises(df):
    with pytest.raises(ValueError, match="Unsupported chart type"):
        build_chart(df, {"type": "heatmap", "x": "region", "y": "revenue", "title": "X"})


def test_empty_dataframe_raises(df):
    empty = pd.DataFrame({"region": pd.Series([], dtype=str), "revenue": pd.Series([], dtype=float)})
    with pytest.raises(ValueError, match="DataFrame is empty"):
        build_chart(empty, {"type": "bar", "x": "region", "y": "revenue", "title": "Empty"})


def test_missing_config_key_raises(df):
    with pytest.raises(KeyError):
        build_chart(df, {"type": "bar", "x": "region", "title": "No y"})
