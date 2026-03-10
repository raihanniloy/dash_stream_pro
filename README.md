# DashStream Pro

A data analytics dashboard platform built with Streamlit. Upload CSV or Excel files, explore your data, get AI-powered chart suggestions, and build interactive dashboards — all from a single Python app.

## Tech Stack

- **Python 3.11+**
- **Streamlit** — multi-page web app framework
- **Plotly** — interactive chart rendering
- **pandas** — data loading and manipulation
- **OpenAI GPT-4o-mini** — AI chart recommendations
- **data-service modules** — parsers, profiler, and AI engine reused from the existing service layer

## Features

- **File Upload** — upload CSV, Excel (.xlsx/.xls), and plain-text (.txt) files
- **Data Profiling** — automatic column statistics: types, nulls, unique counts, min/max/mean
- **AI Chart Suggestions** — GPT-4o-mini analyzes your data profile and recommends chart types with configurations
- **Interactive Dashboard Builder** — pick columns, choose chart types, and render Plotly figures in-browser

## Project Structure

```
services/
  streamlit-app/
    app.py                  # Home page
    pages/
      1_Upload.py           # Upload + data preview
      2_Dashboard.py        # Chart builder
      3_AI_Suggestions.py   # AI-powered suggestions
    chart_builder.py        # Plotly figure factory
    requirements.txt
    tests/
      test_chart_builder.py
  data-service/
    parsers.py              # CSV/Excel parsing
    profiler.py             # Column statistics
    ai_engine.py            # OpenAI chart suggestions
    tests/
```

## Getting Started

### Prerequisites

- Python 3.11+

### 1. Set up the virtual environment

```bash
cd services/streamlit-app
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure environment

Export your OpenAI API key:

```bash
export OPENAI_API_KEY=sk-...
```

### 3. Run the app

```bash
streamlit run app.py
```

The app opens at [http://localhost:8501](http://localhost:8501).

## Available Commands

| Command | Description |
|---|---|
| `streamlit run app.py` | Start the app |
| `python -m pytest tests/` | Run chart_builder tests |
| `cd ../data-service && python -m pytest tests/` | Run data-service tests |
