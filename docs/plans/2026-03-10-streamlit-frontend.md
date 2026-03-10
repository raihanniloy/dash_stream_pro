# Streamlit Frontend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Next.js frontend and FastAPI HTTP layer with a single multi-page Streamlit app that imports data logic directly from the existing Python modules.

**Architecture:** A Streamlit multi-page app lives in `services/streamlit-app/`. It imports `parsers.py`, `profiler.py`, and `ai_engine.py` directly from `../data-service/` via `sys.path`. `st.session_state` carries the DataFrame, profile, and chart list across pages. Charts render via Plotly.

**Tech Stack:** Python 3.11+, Streamlit, Plotly, pandas, existing parsers/profiler/ai_engine modules.

---

### Task 1: Project scaffold

**Files:**
- Create: `services/streamlit-app/requirements.txt`
- Create: `services/streamlit-app/app.py`
- Create: `services/streamlit-app/pages/.gitkeep`

**Step 1: Create requirements.txt**

```
services/streamlit-app/requirements.txt
```

```
streamlit==1.45.*
plotly==6.1.*
pandas==2.2.*
openpyxl==3.1.*
openai==1.82.*
```

**Step 2: Create app.py (home/landing page)**

```python
# services/streamlit-app/app.py
import streamlit as st

st.set_page_config(page_title="DashStream Pro", layout="wide")

st.title("DashStream Pro")
st.markdown(
    "Upload a CSV or Excel file to profile your data, get AI chart suggestions, "
    "and build an interactive dashboard."
)
st.page_link("pages/1_Upload.py", label="Get started → Upload a file", icon="📂")
```

**Step 3: Create the pages directory**

```bash
mkdir -p services/streamlit-app/pages
touch services/streamlit-app/pages/.gitkeep
```

**Step 4: Install dependencies**

```bash
cd services/streamlit-app
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**Step 5: Smoke-test the app starts**

```bash
cd services/streamlit-app
source .venv/bin/activate
streamlit run app.py --server.headless true &
sleep 3
curl -s http://localhost:8501 | grep -q "DashStream" && echo "OK" || echo "FAIL"
kill %1
```

Expected: prints `OK`.

**Step 6: Commit**

```bash
git add services/streamlit-app/
git commit -m "feat: scaffold Streamlit app structure"
```

---

### Task 2: chart_builder module (TDD)

A pure function module — no Streamlit imports — so it is fully unit-testable.

**Files:**
- Create: `services/streamlit-app/chart_builder.py`
- Create: `services/streamlit-app/tests/__init__.py`
- Create: `services/streamlit-app/tests/test_chart_builder.py`

**Step 1: Write the failing tests**

```python
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
```

**Step 2: Run to verify they fail**

```bash
cd services/streamlit-app
source .venv/bin/activate
python -m pytest tests/test_chart_builder.py -v
```

Expected: `ImportError: cannot import name 'build_chart' from 'chart_builder'` (or ModuleNotFoundError).

**Step 3: Implement chart_builder.py**

```python
# services/streamlit-app/chart_builder.py
import pandas as pd
import plotly.graph_objects as go


def build_chart(df: pd.DataFrame, config: dict) -> go.Figure:
    chart_type = config["type"]
    x = config["x"]
    y = config["y"]
    title = config.get("title", "")

    if chart_type == "bar":
        grouped = df.groupby(x)[y].sum().reset_index()
        fig = go.Figure(go.Bar(x=grouped[x], y=grouped[y]))

    elif chart_type == "line":
        sorted_df = df.sort_values(x)
        fig = go.Figure(go.Scatter(x=sorted_df[x], y=sorted_df[y], mode="lines"))

    elif chart_type == "area":
        sorted_df = df.sort_values(x)
        fig = go.Figure(go.Scatter(x=sorted_df[x], y=sorted_df[y], fill="tozeroy", mode="lines"))

    elif chart_type == "scatter":
        fig = go.Figure(go.Scatter(x=df[x], y=df[y], mode="markers"))

    elif chart_type == "pie":
        grouped = df.groupby(x)[y].sum().reset_index()
        fig = go.Figure(go.Pie(labels=grouped[x], values=grouped[y]))

    else:
        raise ValueError(f"Unsupported chart type: {chart_type}")

    fig.update_layout(title=title, margin=dict(t=40, b=20, l=20, r=20))
    return fig
```

**Step 4: Run to verify all pass**

```bash
python -m pytest tests/test_chart_builder.py -v
```

Expected: `6 passed`.

**Step 5: Commit**

```bash
git add services/streamlit-app/chart_builder.py services/streamlit-app/tests/
git commit -m "feat: add chart_builder with Plotly figures (TDD)"
```

---

### Task 3: Upload page

**Files:**
- Create: `services/streamlit-app/pages/1_Upload.py`

**Step 1: Implement the page**

```python
# services/streamlit-app/pages/1_Upload.py
import sys
import os
import tempfile

import streamlit as st
import pandas as pd

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "data-service"))
os.environ.setdefault("SKIP_PATH_VALIDATION", "1")

from parsers import parse_file
from profiler import profile_data

st.set_page_config(page_title="Upload — DashStream Pro", layout="wide")
st.title("Upload Data")

uploaded = st.file_uploader("Choose a CSV or Excel file", type=["csv", "xlsx", "xls", "txt"])

if uploaded is not None:
    suffix = "." + uploaded.name.rsplit(".", 1)[-1].lower()
    file_type = suffix.lstrip(".")
    if file_type in ("xlsx", "xls"):
        file_type = "excel"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(uploaded.getbuffer())
        tmp_path = tmp.name

    with st.spinner("Parsing and profiling…"):
        parsed = parse_file(tmp_path, file_type)
        profile = profile_data(parsed)

    df = pd.DataFrame(parsed["data"])
    st.session_state["df"] = df
    st.session_state["profile"] = profile
    st.session_state["filename"] = uploaded.name
    if "charts" not in st.session_state:
        st.session_state["charts"] = []

    st.success(f"Loaded **{uploaded.name}** — {parsed['row_count']:,} rows × {parsed['column_count']} columns")

    st.subheader("Data Preview")
    st.dataframe(df.head(100), use_container_width=True)

    st.subheader("Column Statistics")
    rows = []
    for col, info in profile["columns"].items():
        row = {"column": col, "type": info["type"], "nulls": info["null_count"]}
        if info["type"] == "numeric":
            row.update({"min": info["min"], "max": info["max"], "mean": round(info["mean"], 2)})
        elif info["type"] == "categorical":
            row["unique"] = info.get("unique_count", "")
        rows.append(row)
    st.dataframe(pd.DataFrame(rows), use_container_width=True)

    st.page_link("pages/2_Dashboard.py", label="→ Go to Dashboard", icon="📊")
    st.page_link("pages/3_AI_Suggestions.py", label="→ Get AI Chart Suggestions", icon="🤖")
```

**Step 2: Smoke-test the page renders**

```bash
cd services/streamlit-app
source .venv/bin/activate
streamlit run app.py --server.headless true &
sleep 3
curl -s "http://localhost:8501/pages/1_Upload" | grep -q "Upload" && echo "OK" || echo "FAIL"
kill %1
```

Expected: `OK`.

**Step 3: Commit**

```bash
git add services/streamlit-app/pages/1_Upload.py
git commit -m "feat: add Upload page with data preview and column stats"
```

---

### Task 4: Dashboard page

**Files:**
- Create: `services/streamlit-app/pages/2_Dashboard.py`

**Step 1: Implement the page**

```python
# services/streamlit-app/pages/2_Dashboard.py
import sys
import os

import streamlit as st

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from chart_builder import build_chart

st.set_page_config(page_title="Dashboard — DashStream Pro", layout="wide")
st.title("Dashboard")

if "df" not in st.session_state:
    st.warning("No data loaded. Go to the Upload page first.")
    st.page_link("pages/1_Upload.py", label="→ Upload a file")
    st.stop()

df = st.session_state["df"]
columns = list(df.columns)

st.subheader("Add a Chart")
with st.form("add_chart"):
    col1, col2, col3, col4 = st.columns(4)
    chart_type = col1.selectbox("Type", ["bar", "line", "area", "scatter", "pie"])
    x_col = col2.selectbox("X axis", columns)
    y_col = col3.selectbox("Y axis", [c for c in columns if c != x_col])
    title = col4.text_input("Title", value=f"{y_col} by {x_col}")
    submitted = st.form_submit_button("Add chart")

if submitted:
    st.session_state.setdefault("charts", []).append(
        {"type": chart_type, "x": x_col, "y": y_col, "title": title}
    )

charts = st.session_state.get("charts", [])

if not charts:
    st.info("No charts yet. Add one above or get AI suggestions.")
else:
    to_remove = None
    pairs = [charts[i : i + 2] for i in range(0, len(charts), 2)]
    for pair in pairs:
        cols = st.columns(2)
        for col, chart in zip(cols, pair):
            with col:
                try:
                    fig = build_chart(df, chart)
                    st.plotly_chart(fig, use_container_width=True)
                except Exception as e:
                    st.error(f"Could not render '{chart['title']}': {e}")
                if st.button("Remove", key=f"rm_{chart['title']}_{chart['x']}"):
                    to_remove = chart

    if to_remove is not None:
        st.session_state["charts"].remove(to_remove)
        st.rerun()
```

**Step 2: Commit**

```bash
git add services/streamlit-app/pages/2_Dashboard.py
git commit -m "feat: add Dashboard page with chart builder and Plotly grid"
```

---

### Task 5: AI Suggestions page

**Files:**
- Create: `services/streamlit-app/pages/3_AI_Suggestions.py`

**Step 1: Implement the page**

```python
# services/streamlit-app/pages/3_AI_Suggestions.py
import sys
import os

import streamlit as st

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "data-service"))

from ai_engine import suggest_charts

st.set_page_config(page_title="AI Suggestions — DashStream Pro", layout="wide")
st.title("AI Chart Suggestions")

if "profile" not in st.session_state:
    st.warning("No data loaded. Go to the Upload page first.")
    st.page_link("pages/1_Upload.py", label="→ Upload a file")
    st.stop()

profile = st.session_state["profile"]
existing = st.session_state.get("charts", [])

if st.button("Generate suggestions"):
    with st.spinner("Asking AI…"):
        try:
            suggestions = suggest_charts(profile, num_suggestions=5, existing_charts=existing)
            st.session_state["suggestions"] = suggestions
        except Exception as e:
            st.error(f"AI request failed: {e}")

suggestions = st.session_state.get("suggestions", [])

for i, s in enumerate(suggestions):
    with st.container(border=True):
        col1, col2 = st.columns([4, 1])
        col1.markdown(f"**{s['title']}** — `{s['type']}` · x=`{s['x']}` y=`{s['y']}`")
        col1.caption(s.get("reason", ""))
        if col2.button("Add to dashboard", key=f"add_{i}"):
            st.session_state.setdefault("charts", []).append(
                {"type": s["type"], "x": s["x"], "y": s["y"], "title": s["title"]}
            )
            st.success(f"Added '{s['title']}' to dashboard.")
```

**Step 2: Commit**

```bash
git add services/streamlit-app/pages/3_AI_Suggestions.py
git commit -m "feat: add AI Suggestions page with add-to-dashboard action"
```

---

### Task 6: Update README

**Files:**
- Modify: `README.md`

**Step 1: Replace the Getting Started and Scripts sections**

Update `README.md` to reflect that the frontend is now Streamlit. Replace the old Next.js setup instructions with:

```markdown
## Getting Started

### Prerequisites

- Python 3.11+

### 1. Set up the Streamlit app

```bash
cd services/streamlit-app
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure environment

Create `services/streamlit-app/.env` (or export variables):

```bash
export OPENAI_API_KEY=sk-...
```

### 3. Run

```bash
cd services/streamlit-app
source .venv/bin/activate
streamlit run app.py
```

Open [http://localhost:8501](http://localhost:8501).

## Available Scripts

| Command | Description |
|---|---|
| `streamlit run app.py` | Start the Streamlit app |
| `python -m pytest tests/` | Run chart_builder tests |
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README for Streamlit frontend"
```
