# Streamlit Frontend Design

**Date:** 2026-03-10
**Status:** Approved

## Problem

The Next.js frontend is slow and heavy. The browser renders large SVG node trees via Recharts, and the React app adds significant bundle weight. After applying server-side row limiting and fixing the stale closure in the dashboard grid, the app still feels sluggish overall.

## Decision

Replace the Next.js frontend and FastAPI HTTP service with a single Streamlit app. Auth and public sharing are out of scope for this version.

## Architecture

```
Before:  Browser → Next.js (Node) → FastAPI (Python) → files
After:   Browser → Streamlit (Python) → files
```

One Python process. The existing data logic (`parsers.py`, `profiler.py`, `ai_engine.py`) is imported directly — no HTTP round-trips. `st.session_state` holds the uploaded DataFrame, column profile, and the user's chart list across page navigations.

## Pages

Multi-page Streamlit app using the native `pages/` folder structure.

| File | Page | Responsibility |
|---|---|---|
| `app.py` | Home | Landing page, instructions |
| `pages/1_Upload.py` | Upload | File upload widget, calls `parse_file()` + `profile_data()`, shows data preview table and column stats |
| `pages/2_Dashboard.py` | Dashboard | Chart builder (pick type/x/y), renders Plotly charts in 2-col layout, add/remove charts |
| `pages/3_AI_Suggestions.py` | AI Suggestions | Calls `suggest_charts()` with stored profile, shows suggestion cards, "Add to dashboard" button writes chart to session_state |

## State Management

`st.session_state` keys:

| Key | Type | Set by | Read by |
|---|---|---|---|
| `df` | `pd.DataFrame` | Upload | Dashboard, AI Suggestions |
| `profile` | `dict` | Upload | AI Suggestions |
| `charts` | `list[dict]` | Dashboard, AI Suggestions | Dashboard |
| `filename` | `str` | Upload | Dashboard, AI Suggestions |

## Charts

Use **Plotly** via `st.plotly_chart(fig, use_container_width=True)`. Plotly renders as a compact HTML widget — much lighter than raw SVG. Supported types: bar, line, area (line with fill), scatter, pie.

## File Structure

```
services/
  streamlit-app/
    app.py
    pages/
      1_Upload.py
      2_Dashboard.py
      3_AI_Suggestions.py
    chart_builder.py      # Plotly figure factory
    requirements.txt      # streamlit, plotly, pandas, openpyxl, openai
```

The existing `data-service/` modules (`parsers.py`, `profiler.py`, `ai_engine.py`) are imported directly into the Streamlit pages.

## What Is Removed

- Entire `src/` Next.js codebase
- `services/data-service/main.py` and `routes.py` (HTTP layer no longer needed)
- `scripts/dev.sh` (replaced by `streamlit run app.py`)
- `package.json` and all Node dependencies

## What Is Kept

- `services/data-service/parsers.py`
- `services/data-service/profiler.py`
- `services/data-service/ai_engine.py`
- `services/data-service/tests/` (existing Python tests still apply)

## Out of Scope

- User authentication
- Public dashboard sharing
- Persistent dashboard storage across sessions
