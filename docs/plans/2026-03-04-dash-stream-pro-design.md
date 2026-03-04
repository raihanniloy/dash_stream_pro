# DashStream Pro - Design Document

**Date**: 2026-03-04
**Status**: Approved

## Overview

AI-powered web application that enables marketing/sales teams to create interactive analytics dashboards from CSV, XLSX, and TXT files without data analytics knowledge. Users upload files, preview their data, receive AI-suggested charts, and build dashboards visually.

## Requirements

- **Target users**: Marketing/sales teams — business professionals who use spreadsheets but don't know SQL or BI tools
- **Platform**: Web app (SaaS)
- **AI**: LLM-powered via Claude API for data analysis, chart suggestions, and insights
- **Core flow**: Upload → Preview data → AI suggests charts → User builds dashboard
- **Sharing**: Public read-only share links
- **Monetization**: Free for now, monetize later

## Architecture

Monolith-first approach: single repo with Next.js frontend + Python FastAPI microservice.

```
User Browser
  → Next.js (React UI + API Routes: auth, CRUD, gateway)
    → Python FastAPI (internal, localhost)
      → File Parser (csv, xlsx, txt via pandas)
      → Data Profiler (column types, stats, relationships)
      → AI Engine (Claude API for chart suggestions)
    → SQLite (users, dashboards, charts, share_links)
    → Local Filesystem (uploads, parsed data cache, profiles)
```

### Key Architectural Decisions

- Next.js API routes handle auth, CRUD, session management
- Python handles all data-heavy work: parsing, profiling, AI orchestration
- Data profiles (not raw data) are sent to Claude API — keeps calls small, avoids leaking sensitive data
- Parsed data cached on disk to avoid re-parsing
- Chart data is aggregated server-side — only the data each chart needs is sent to the browser

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js + React, Tailwind CSS, shadcn/ui |
| Charts | Recharts (React-native, built on D3) |
| Backend Gateway | Next.js API Routes (TypeScript) |
| Data Service | Python FastAPI |
| Data Processing | pandas |
| AI | Claude API (Anthropic) |
| Database | SQLite |
| File Storage | Local filesystem |
| Auth | Session-based (email + password) |

## Data Pipeline

### File Processing Flow

1. **Validate**: Check file type (csv/xlsx/txt), size limit (50MB), safe filename
2. **Parse**: Read into pandas DataFrame — auto-detect delimiter, encoding, handle multiple sheets
3. **Profile**: Analyze columns (types, stats, nulls, unique counts, relationships)
4. **Cache**: Store parsed data as JSON + profile summary on disk

### AI Chart Suggestion Engine

- Input: Data profile (column names, types, stats) — NOT raw data
- Claude API generates structured JSON: chart type, axes, grouping, title, reasoning
- Returns top 5 suggestions as clickable cards with mini previews
- Users can accept, modify, or request more suggestions
- Fallback: rule-based suggestions if Claude API is unavailable

## Data Model

### SQLite Schema

```sql
users
  id            TEXT PRIMARY KEY (uuid)
  email         TEXT UNIQUE NOT NULL
  password_hash TEXT NOT NULL
  name          TEXT
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP

data_sources
  id            TEXT PRIMARY KEY (uuid)
  user_id       TEXT NOT NULL → users.id
  filename      TEXT NOT NULL
  file_path     TEXT NOT NULL
  file_type     TEXT NOT NULL          -- csv, xlsx, txt
  file_size     INTEGER
  sheet_name    TEXT                   -- for xlsx files
  row_count     INTEGER
  column_count  INTEGER
  profile_json  TEXT                   -- cached data profile
  parsed_path   TEXT                   -- path to cached parsed JSON
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP

dashboards
  id            TEXT PRIMARY KEY (uuid)
  user_id       TEXT NOT NULL → users.id
  data_source_id TEXT NOT NULL → data_sources.id
  title         TEXT NOT NULL DEFAULT 'Untitled Dashboard'
  description   TEXT
  layout_json   TEXT                   -- grid positions/sizes
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP

charts
  id            TEXT PRIMARY KEY (uuid)
  dashboard_id  TEXT NOT NULL → dashboards.id
  chart_type    TEXT NOT NULL          -- bar, line, pie, area, scatter
  title         TEXT
  config_json   TEXT NOT NULL          -- {x, y, groupBy, colors, filters}
  position      INTEGER
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP

share_links
  id            TEXT PRIMARY KEY (uuid)
  dashboard_id  TEXT NOT NULL → dashboards.id
  share_token   TEXT UNIQUE NOT NULL
  is_active     BOOLEAN DEFAULT TRUE
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
```

### File Storage

```
/uploads/{user_id}/{data_source_id}/
  original.csv      -- original uploaded file
  parsed.json       -- cached parsed data
  profile.json      -- cached data profile
```

## API Design

### Next.js API Routes (Public)

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout

POST   /api/upload
GET    /api/data-sources
GET    /api/data-sources/:id
DELETE /api/data-sources/:id

POST   /api/dashboards
GET    /api/dashboards
GET    /api/dashboards/:id
PUT    /api/dashboards/:id
DELETE /api/dashboards/:id

POST   /api/dashboards/:id/charts
PUT    /api/dashboards/:id/charts/:cid
DELETE /api/dashboards/:id/charts/:cid

POST   /api/dashboards/:id/share
DELETE /api/share/:token
GET    /api/share/:token              -- public, no auth
```

### Python FastAPI Endpoints (Internal only)

```
POST   /process/upload     -- parse file, profile data, cache results
POST   /ai/suggest-charts  -- get AI chart suggestions from profile
POST   /ai/suggest-more    -- get additional suggestions excluding existing charts
POST   /data/query         -- get aggregated chart data for rendering
```

## User Experience

### Screen Flow

1. **Landing Page** → Sign Up / Login
2. **My Dashboards** — list of user's dashboards, "New Dashboard" button
3. **Upload File** — drag-and-drop or file picker
4. **Data Preview** — table view (first 100 rows), column type badges, stats per column, sheet picker for XLSX
5. **AI Suggestions** — 5 chart suggestion cards with mini preview, title, and reasoning. Click to add. "Suggest more" button.
6. **Dashboard Editor** — grid layout, drag/resize charts, click to edit chart config, rename dashboard, save
7. **Shared View** — clean read-only page at `/share/{shareId}`, no editor UI

### UI Components

- shadcn/ui for form controls, modals, dropdowns (Radix-based, Tailwind-styled)
- Recharts for interactive charts (bar, line, pie, area, scatter)
- Grid-based dashboard layout with drag and resize

## Error Handling

### File Upload

- File >50MB: reject with clear message
- Unsupported format: reject listing supported formats
- Corrupted file: friendly message suggesting checking in Excel
- Empty file: reject
- >100 columns: warn, process anyway
- Mixed types in column: treat as text
- Multiple sheets (XLSX): show sheet picker

### AI Failures

- Claude API timeout: retry once, then show retry button
- Claude API down: fall back to rule-based suggestions
- Invalid JSON response: retry with stricter prompt, then fall back
- Rate limiting: queue requests, one AI call per user at a time

### Data Edge Cases

- All-null or single-value columns: exclude from suggestions
- High cardinality (>50 categories): suggest top-10 grouping or histogram
- Date ambiguity: locale-aware parsing, show detected format for user verification
- Large datasets (>100k rows): profile all rows, aggregate/sample for chart queries

## Testing Strategy

### Three Layers

1. **Backend Unit Tests (pytest)**: File parser edge cases, data profiler, AI engine (mocked), data query aggregation
2. **API Integration Tests (Vitest)**: Auth flow, upload flow, dashboard/chart CRUD, share flow, authorization
3. **Frontend Component Tests (React Testing Library)**: Data preview, suggestion cards, dashboard editor, chart rendering, share modal

### Skipped for MVP

- E2E browser tests (add when flows stabilize)
- Load testing (not needed until real users)
- Visual regression testing

### Focus Areas

Data pipeline and AI integration — where bugs are most costly. UI tests cover happy paths only.
