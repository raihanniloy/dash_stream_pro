# DashStream Pro Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an AI-powered web app where marketing/sales teams upload CSV/XLSX/TXT files and get auto-suggested interactive dashboards.

**Architecture:** Monolith-first — Next.js (React + API routes) for the web layer, Python FastAPI microservice for data processing and AI, SQLite for persistence, local filesystem for uploads. The two services communicate over localhost HTTP.

**Tech Stack:** Next.js 14+ (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, Recharts, Python 3.11+, FastAPI, pandas, openpyxl, Anthropic Python SDK, SQLite (via better-sqlite3 for Node, aiosqlite for Python), iron-session for auth.

**Design Doc:** `docs/plans/2026-03-04-dash-stream-pro-design.md`

---

## Task 1: Project Scaffolding — Next.js Frontend

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `.gitignore`, `.env.example`

**Step 1: Initialize Next.js project**

```bash
cd /home/raihan-niloy/work/dash_stream_pro
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Accept defaults. This creates the full Next.js scaffolding with App Router, TypeScript, Tailwind.

**Step 2: Verify it runs**

```bash
npm run dev
# Visit http://localhost:3000 — should see Next.js default page
# Ctrl+C to stop
```

**Step 3: Create .env.example**

```bash
# Create .env.example with required env vars
cat > .env.example << 'ENVEOF'
# Python data service
PYTHON_SERVICE_URL=http://localhost:8000

# Auth
SESSION_SECRET=change-me-to-a-random-string

# Anthropic (used by Python service)
ANTHROPIC_API_KEY=sk-ant-...
ENVEOF
```

Copy to `.env.local`:
```bash
cp .env.example .env.local
```

**Step 4: Update .gitignore**

Add to `.gitignore`:
```
# Uploads
/uploads/

# Python
__pycache__/
*.pyc
.venv/

# Env
.env.local
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with TypeScript and Tailwind"
```

---

## Task 2: Project Scaffolding — Python FastAPI Service

**Files:**
- Create: `services/data-service/requirements.txt`
- Create: `services/data-service/main.py`
- Create: `services/data-service/pyproject.toml`

**Step 1: Create directory and virtual environment**

```bash
mkdir -p services/data-service
cd services/data-service
python3 -m venv .venv
source .venv/bin/activate
```

**Step 2: Create requirements.txt**

```
fastapi==0.115.*
uvicorn[standard]==0.34.*
pandas==2.2.*
openpyxl==3.1.*
anthropic==0.49.*
python-multipart==0.0.*
aiosqlite==0.20.*
```

**Step 3: Install dependencies**

```bash
pip install -r requirements.txt
```

**Step 4: Create main.py with health check**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="DashStream Data Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}
```

**Step 5: Verify it runs**

```bash
uvicorn main:app --reload --port 8000
# Visit http://localhost:8000/health — should return {"status":"ok"}
# Ctrl+C to stop
```

**Step 6: Commit**

```bash
cd /home/raihan-niloy/work/dash_stream_pro
git add services/data-service/
git commit -m "feat: scaffold Python FastAPI data service"
```

---

## Task 3: Install shadcn/ui and Core UI Components

**Files:**
- Create: `components.json`
- Create: `src/components/ui/button.tsx`, `card.tsx`, `input.tsx`, `label.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `toast.tsx`, `table.tsx`
- Create: `src/lib/utils.ts`

**Step 1: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

Select: New York style, Zinc base color, CSS variables = yes.

**Step 2: Add required components**

```bash
npx shadcn@latest add button card input label dialog dropdown-menu toast table tabs badge separator skeleton
```

**Step 3: Verify by checking the generated files**

```bash
ls src/components/ui/
# Should list button.tsx, card.tsx, input.tsx, etc.
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add shadcn/ui components"
```

---

## Task 4: SQLite Database Schema and Helpers (Next.js)

**Files:**
- Create: `src/lib/db.ts`
- Create: `src/lib/db-schema.ts`
- Create: `src/lib/db.test.ts`

**Step 1: Install better-sqlite3**

```bash
npm install better-sqlite3
npm install -D @types/better-sqlite3
```

**Step 2: Write the failing test**

Create `src/lib/db.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getDb, initDb } from "./db";
import fs from "fs";
import path from "path";

const TEST_DB = path.join(__dirname, "test.db");

describe("Database", () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  it("creates all tables on init", () => {
    const db = getDb(TEST_DB);
    initDb(db);

    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      )
      .all()
      .map((r: any) => r.name);

    expect(tables).toContain("users");
    expect(tables).toContain("data_sources");
    expect(tables).toContain("dashboards");
    expect(tables).toContain("charts");
    expect(tables).toContain("share_links");

    db.close();
  });

  it("enforces unique email constraint", () => {
    const db = getDb(TEST_DB);
    initDb(db);

    const insert = db.prepare(
      "INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)"
    );
    insert.run("id1", "test@example.com", "hash", "Test");

    expect(() => {
      insert.run("id2", "test@example.com", "hash2", "Test2");
    }).toThrow();

    db.close();
  });
});
```

**Step 3: Install vitest and run test to verify it fails**

```bash
npm install -D vitest
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`

```bash
npm test -- src/lib/db.test.ts
```

Expected: FAIL — module `./db` not found.

**Step 4: Implement db.ts and db-schema.ts**

Create `src/lib/db-schema.ts`:

```typescript
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS data_sources (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  file_path     TEXT NOT NULL,
  file_type     TEXT NOT NULL,
  file_size     INTEGER,
  sheet_name    TEXT,
  row_count     INTEGER,
  column_count  INTEGER,
  profile_json  TEXT,
  parsed_path   TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dashboards (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data_source_id TEXT NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  title          TEXT NOT NULL DEFAULT 'Untitled Dashboard',
  description    TEXT,
  layout_json    TEXT,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS charts (
  id           TEXT PRIMARY KEY,
  dashboard_id TEXT NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  chart_type   TEXT NOT NULL,
  title        TEXT,
  config_json  TEXT NOT NULL,
  position     INTEGER,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS share_links (
  id           TEXT PRIMARY KEY,
  dashboard_id TEXT NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  share_token  TEXT UNIQUE NOT NULL,
  is_active    INTEGER DEFAULT 1,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;
```

Create `src/lib/db.ts`:

```typescript
import Database from "better-sqlite3";
import path from "path";
import { SCHEMA } from "./db-schema";

const DB_PATH = path.join(process.cwd(), "data", "dashstream.db");

export function getDb(dbPath: string = DB_PATH): Database.Database {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export function initDb(db: Database.Database): void {
  db.exec(SCHEMA);
}

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (!_db) {
    _db = getDb();
    initDb(_db);
  }
  return _db;
}
```

**Step 5: Run test to verify it passes**

```bash
npm test -- src/lib/db.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add SQLite database schema and helpers"
```

---

## Task 5: Authentication — Session-Based Auth

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/lib/auth.test.ts`
- Create: `src/app/api/auth/register/route.ts`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/app/api/auth/me/route.ts`

**Step 1: Install dependencies**

```bash
npm install iron-session uuid
npm install -D @types/uuid
```

**Step 2: Write the failing test for password hashing and session**

Create `src/lib/auth.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./auth";

describe("Auth", () => {
  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("mysecretpassword");
    expect(hash).not.toBe("mysecretpassword");
    expect(await verifyPassword("mysecretpassword", hash)).toBe(true);
    expect(await verifyPassword("wrongpassword", hash)).toBe(false);
  });
});
```

**Step 3: Run test to verify it fails**

```bash
npm test -- src/lib/auth.test.ts
```

Expected: FAIL

**Step 4: Implement auth.ts**

```typescript
import crypto from "crypto";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

const SESSION_SECRET = process.env.SESSION_SECRET || "change-me-to-a-random-string-at-least-32-chars";

export interface SessionData {
  userId?: string;
  email?: string;
}

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, {
    password: SESSION_SECRET,
    cookieName: "dashstream_session",
  });
}

export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(":");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(key === derivedKey.toString("hex"));
    });
  });
}
```

**Step 5: Run test to verify it passes**

```bash
npm test -- src/lib/auth.test.ts
```

Expected: PASS

**Step 6: Implement API routes**

Create `src/app/api/auth/register/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { db } from "@/lib/db";
import { hashPassword, getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const existing = db()
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email);
  if (existing) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 }
    );
  }

  const id = uuid();
  const passwordHash = await hashPassword(password);

  db()
    .prepare(
      "INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)"
    )
    .run(id, email, passwordHash, name || null);

  const session = await getSession();
  session.userId = id;
  session.email = email;
  await session.save();

  return NextResponse.json({ id, email, name });
}
```

Create `src/app/api/auth/login/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const user = db()
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email) as any;

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  await session.save();

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
  });
}
```

Create `src/app/api/auth/logout/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ ok: true });
}
```

Create `src/app/api/auth/me/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = db()
    .prepare("SELECT id, email, name FROM users WHERE id = ?")
    .get(session.userId) as any;

  if (!user) {
    session.destroy();
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  return NextResponse.json(user);
}
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add session-based authentication with register/login/logout"
```

---

## Task 6: Python File Parser

**Files:**
- Create: `services/data-service/parsers.py`
- Create: `services/data-service/tests/test_parsers.py`
- Create: `services/data-service/tests/__init__.py`
- Create: test fixture files

**Step 1: Create test fixtures**

```bash
mkdir -p services/data-service/tests/fixtures
```

Create a small CSV fixture `services/data-service/tests/fixtures/sales.csv`:

```csv
date,region,product,revenue,units
2024-01-01,North,Widget A,1500.50,100
2024-01-01,South,Widget B,2300.00,150
2024-02-01,North,Widget A,1800.75,120
2024-02-01,South,Widget B,2100.00,140
2024-03-01,North,Widget C,900.25,60
```

**Step 2: Write the failing test**

Create `services/data-service/tests/__init__.py` (empty).

Create `services/data-service/tests/test_parsers.py`:

```python
import os
import pytest
from parsers import parse_file

FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures")


def test_parse_csv():
    result = parse_file(os.path.join(FIXTURES, "sales.csv"), "csv")
    assert result["row_count"] == 5
    assert result["column_count"] == 5
    assert "date" in result["columns"]
    assert len(result["data"]) == 5


def test_parse_csv_returns_column_names():
    result = parse_file(os.path.join(FIXTURES, "sales.csv"), "csv")
    assert result["columns"] == ["date", "region", "product", "revenue", "units"]


def test_parse_nonexistent_file():
    with pytest.raises(FileNotFoundError):
        parse_file("/nonexistent/file.csv", "csv")


def test_parse_unsupported_type():
    with pytest.raises(ValueError, match="Unsupported file type"):
        parse_file(os.path.join(FIXTURES, "sales.csv"), "pdf")
```

**Step 3: Run test to verify it fails**

```bash
cd services/data-service
source .venv/bin/activate
pip install pytest
pytest tests/test_parsers.py -v
```

Expected: FAIL — `parsers` module not found.

**Step 4: Implement parsers.py**

Create `services/data-service/parsers.py`:

```python
from typing import Any
import pandas as pd


SUPPORTED_TYPES = {"csv", "xlsx", "txt"}


def parse_file(
    file_path: str, file_type: str, sheet_name: str | None = None
) -> dict[str, Any]:
    if file_type not in SUPPORTED_TYPES:
        raise ValueError(f"Unsupported file type: {file_type}")

    if file_type == "csv":
        df = pd.read_csv(file_path)
    elif file_type == "txt":
        df = pd.read_csv(file_path, sep=None, engine="python")
    elif file_type == "xlsx":
        df = pd.read_excel(file_path, sheet_name=sheet_name)

    data = df.where(df.notna(), None).to_dict(orient="records")

    return {
        "columns": list(df.columns),
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "row_count": len(df),
        "column_count": len(df.columns),
        "data": data,
    }


def get_sheet_names(file_path: str) -> list[str]:
    xls = pd.ExcelFile(file_path)
    return xls.sheet_names
```

**Step 5: Run test to verify it passes**

```bash
pytest tests/test_parsers.py -v
```

Expected: PASS

**Step 6: Commit**

```bash
cd /home/raihan-niloy/work/dash_stream_pro
git add services/data-service/
git commit -m "feat: add file parser for CSV, XLSX, and TXT"
```

---

## Task 7: Python Data Profiler

**Files:**
- Create: `services/data-service/profiler.py`
- Create: `services/data-service/tests/test_profiler.py`

**Step 1: Write the failing test**

Create `services/data-service/tests/test_profiler.py`:

```python
import os
import pytest
from parsers import parse_file
from profiler import profile_data

FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures")


def test_profile_detects_column_types():
    parsed = parse_file(os.path.join(FIXTURES, "sales.csv"), "csv")
    profile = profile_data(parsed)

    assert profile["columns"]["revenue"]["type"] == "numeric"
    assert profile["columns"]["region"]["type"] == "categorical"
    assert profile["columns"]["date"]["type"] == "datetime"


def test_profile_includes_stats_for_numeric():
    parsed = parse_file(os.path.join(FIXTURES, "sales.csv"), "csv")
    profile = profile_data(parsed)

    rev = profile["columns"]["revenue"]
    assert "min" in rev
    assert "max" in rev
    assert "mean" in rev
    assert rev["min"] == 900.25
    assert rev["max"] == 2300.00


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
```

**Step 2: Run test to verify it fails**

```bash
cd services/data-service && source .venv/bin/activate
pytest tests/test_profiler.py -v
```

Expected: FAIL

**Step 3: Implement profiler.py**

Create `services/data-service/profiler.py`:

```python
from typing import Any
import pandas as pd


def _detect_type(series: pd.Series) -> str:
    if pd.api.types.is_numeric_dtype(series):
        return "numeric"

    try:
        pd.to_datetime(series, infer_datetime_format=True)
        return "datetime"
    except (ValueError, TypeError):
        pass

    if series.nunique() / max(len(series), 1) < 0.5:
        return "categorical"

    return "text"


def _column_profile(series: pd.Series, col_type: str) -> dict[str, Any]:
    profile: dict[str, Any] = {
        "type": col_type,
        "null_count": int(series.isna().sum()),
        "unique_count": int(series.nunique()),
    }

    if col_type == "numeric":
        profile["min"] = float(series.min())
        profile["max"] = float(series.max())
        profile["mean"] = round(float(series.mean()), 2)
        profile["median"] = float(series.median())

    elif col_type == "categorical":
        profile["top_values"] = (
            series.value_counts().head(10).to_dict()
        )

    elif col_type == "datetime":
        dates = pd.to_datetime(series, errors="coerce")
        profile["min"] = str(dates.min())
        profile["max"] = str(dates.max())

    return profile


def profile_data(parsed: dict[str, Any]) -> dict[str, Any]:
    df = pd.DataFrame(parsed["data"])
    columns_profile = {}

    for col in df.columns:
        col_type = _detect_type(df[col])
        columns_profile[col] = _column_profile(df[col], col_type)

    return {
        "row_count": parsed["row_count"],
        "column_count": parsed["column_count"],
        "columns": columns_profile,
    }
```

**Step 4: Run test to verify it passes**

```bash
pytest tests/test_profiler.py -v
```

Expected: PASS

**Step 5: Commit**

```bash
cd /home/raihan-niloy/work/dash_stream_pro
git add services/data-service/
git commit -m "feat: add data profiler with type detection and stats"
```

---

## Task 8: Python AI Chart Suggestion Engine

**Files:**
- Create: `services/data-service/ai_engine.py`
- Create: `services/data-service/tests/test_ai_engine.py`

**Step 1: Write the failing test (mocked Claude API)**

Create `services/data-service/tests/test_ai_engine.py`:

```python
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
```

**Step 2: Run test to verify it fails**

```bash
cd services/data-service && source .venv/bin/activate
pytest tests/test_ai_engine.py -v
```

Expected: FAIL

**Step 3: Implement ai_engine.py**

Create `services/data-service/ai_engine.py`:

```python
import json
import os
from typing import Any
import anthropic

anthropic_client = anthropic.Anthropic(
    api_key=os.environ.get("ANTHROPIC_API_KEY", ""),
)


def build_prompt(profile: dict[str, Any], num_suggestions: int = 5, existing_charts: list | None = None) -> str:
    columns_desc = []
    for col_name, col_info in profile["columns"].items():
        desc = f"- {col_name}: type={col_info['type']}, nulls={col_info['null_count']}, unique={col_info.get('unique_count', 'N/A')}"
        if col_info["type"] == "numeric":
            desc += f", min={col_info['min']}, max={col_info['max']}, mean={col_info['mean']}"
        if col_info["type"] == "categorical" and "top_values" in col_info:
            top = list(col_info["top_values"].keys())[:5]
            desc += f", top_values={top}"
        if col_info["type"] == "datetime":
            desc += f", range={col_info.get('min')} to {col_info.get('max')}"
        columns_desc.append(desc)

    columns_text = "\n".join(columns_desc)

    exclude_text = ""
    if existing_charts:
        exclude_text = f"\n\nAlready created charts (do NOT suggest these again):\n{json.dumps(existing_charts)}"

    return f"""Analyze this dataset and suggest the {num_suggestions} most insightful charts for a marketing/sales team.

Dataset: {profile['row_count']} rows, {profile['column_count']} columns

Columns:
{columns_text}
{exclude_text}

Return ONLY a JSON array. Each element must have:
- "type": one of "bar", "line", "pie", "area", "scatter"
- "x": column name for x-axis
- "y": column name for y-axis (or value column for pie)
- "groupBy": optional column name for grouping/color
- "title": short descriptive title
- "reason": one sentence explaining why this chart is useful

Return valid JSON only, no markdown formatting."""


def suggest_charts(
    profile: dict[str, Any],
    num_suggestions: int = 5,
    existing_charts: list | None = None,
) -> list[dict[str, Any]]:
    prompt = build_prompt(profile, num_suggestions, existing_charts)

    try:
        response = anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text
        suggestions = json.loads(text)
        if isinstance(suggestions, list):
            return suggestions
    except Exception:
        pass

    return FALLBACK_RULES(profile)


def FALLBACK_RULES(profile: dict[str, Any]) -> list[dict[str, Any]]:
    suggestions = []
    columns = profile["columns"]

    numeric_cols = [c for c, info in columns.items() if info["type"] == "numeric"]
    categorical_cols = [c for c, info in columns.items() if info["type"] == "categorical"]
    datetime_cols = [c for c, info in columns.items() if info["type"] == "datetime"]

    for num_col in numeric_cols:
        if datetime_cols:
            suggestions.append({
                "type": "line",
                "x": datetime_cols[0],
                "y": num_col,
                "title": f"{num_col} Over Time",
                "reason": f"Track {num_col} trends over time",
            })
        if categorical_cols:
            suggestions.append({
                "type": "bar",
                "x": categorical_cols[0],
                "y": num_col,
                "title": f"{num_col} by {categorical_cols[0]}",
                "reason": f"Compare {num_col} across {categorical_cols[0]}",
            })

    if categorical_cols and numeric_cols:
        suggestions.append({
            "type": "pie",
            "x": categorical_cols[0],
            "y": numeric_cols[0],
            "title": f"{numeric_cols[0]} Distribution by {categorical_cols[0]}",
            "reason": f"See proportional breakdown of {numeric_cols[0]}",
        })

    return suggestions[:5]
```

**Step 4: Run test to verify it passes**

```bash
pytest tests/test_ai_engine.py -v
```

Expected: PASS

**Step 5: Commit**

```bash
cd /home/raihan-niloy/work/dash_stream_pro
git add services/data-service/
git commit -m "feat: add AI chart suggestion engine with Claude API and fallback rules"
```

---

## Task 9: Python FastAPI Endpoints

**Files:**
- Modify: `services/data-service/main.py`
- Create: `services/data-service/routes.py`
- Create: `services/data-service/tests/test_routes.py`

**Step 1: Write the failing test**

Create `services/data-service/tests/test_routes.py`:

```python
import os
import json
import pytest
from fastapi.testclient import TestClient
from main import app

FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures")
client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_process_upload_csv(tmp_path):
    import shutil
    src = os.path.join(FIXTURES, "sales.csv")
    dst = tmp_path / "sales.csv"
    shutil.copy(src, dst)

    response = client.post(
        "/process/upload",
        json={"file_path": str(dst), "file_type": "csv"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["row_count"] == 5
    assert data["column_count"] == 5
    assert "profile" in data
    assert "parsed_path" in data


def test_data_query(tmp_path):
    import shutil
    src = os.path.join(FIXTURES, "sales.csv")
    dst = tmp_path / "sales.csv"
    shutil.copy(src, dst)

    # First process the file
    upload_resp = client.post(
        "/process/upload",
        json={"file_path": str(dst), "file_type": "csv"},
    )
    parsed_path = upload_resp.json()["parsed_path"]

    # Query for bar chart data
    response = client.post(
        "/data/query",
        json={
            "parsed_path": parsed_path,
            "chart_config": {
                "type": "bar",
                "x": "region",
                "y": "revenue",
            },
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) > 0
    assert "region" in data[0]
    assert "revenue" in data[0]
```

**Step 2: Run test to verify it fails**

```bash
cd services/data-service && source .venv/bin/activate
pytest tests/test_routes.py -v
```

Expected: FAIL

**Step 3: Implement routes.py and update main.py**

Create `services/data-service/routes.py`:

```python
import json
import os
from typing import Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd

from parsers import parse_file, get_sheet_names
from profiler import profile_data
from ai_engine import suggest_charts

router = APIRouter()


class UploadRequest(BaseModel):
    file_path: str
    file_type: str
    sheet_name: str | None = None


class SuggestRequest(BaseModel):
    profile_json: dict[str, Any]
    num_suggestions: int = 5
    existing_charts: list[dict[str, Any]] | None = None


class QueryRequest(BaseModel):
    parsed_path: str
    chart_config: dict[str, Any]


@router.post("/process/upload")
async def process_upload(req: UploadRequest):
    if not os.path.exists(req.file_path):
        raise HTTPException(status_code=404, detail="File not found")

    try:
        parsed = parse_file(req.file_path, req.file_type, req.sheet_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse file: {e}")

    profile = profile_data(parsed)

    # Cache parsed data
    parsed_path = req.file_path.rsplit(".", 1)[0] + "_parsed.json"
    with open(parsed_path, "w") as f:
        json.dump(parsed["data"], f)

    return {
        "row_count": parsed["row_count"],
        "column_count": parsed["column_count"],
        "columns": parsed["columns"],
        "profile": profile,
        "parsed_path": parsed_path,
    }


@router.post("/ai/suggest-charts")
async def ai_suggest_charts(req: SuggestRequest):
    suggestions = suggest_charts(
        req.profile_json, req.num_suggestions, req.existing_charts
    )
    return {"suggestions": suggestions}


@router.post("/data/query")
async def data_query(req: QueryRequest):
    if not os.path.exists(req.parsed_path):
        raise HTTPException(status_code=404, detail="Parsed data not found")

    with open(req.parsed_path) as f:
        records = json.load(f)

    df = pd.DataFrame(records)
    config = req.chart_config
    x_col = config.get("x")
    y_col = config.get("y")
    group_col = config.get("groupBy")

    if x_col not in df.columns or y_col not in df.columns:
        raise HTTPException(status_code=400, detail="Invalid column names")

    if config["type"] in ("bar", "pie"):
        if group_col:
            result = df.groupby([x_col, group_col])[y_col].sum().reset_index()
        else:
            result = df.groupby(x_col)[y_col].sum().reset_index()
    elif config["type"] in ("line", "area"):
        result = df.sort_values(x_col)
        if group_col:
            result = result[[x_col, y_col, group_col]]
        else:
            result = result[[x_col, y_col]]
    elif config["type"] == "scatter":
        result = df[[x_col, y_col]]
        if group_col:
            result = df[[x_col, y_col, group_col]]
    else:
        result = df[[x_col, y_col]]

    return {"data": result.to_dict(orient="records")}
```

Update `services/data-service/main.py`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import router

app = FastAPI(title="DashStream Data Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
async def health():
    return {"status": "ok"}
```

**Step 4: Run test to verify it passes**

```bash
pytest tests/test_routes.py -v
```

Expected: PASS

**Step 5: Commit**

```bash
cd /home/raihan-niloy/work/dash_stream_pro
git add services/data-service/
git commit -m "feat: add FastAPI endpoints for upload processing, AI suggestions, and data queries"
```

---

## Task 10: Next.js File Upload API Route and Data Source CRUD

**Files:**
- Create: `src/app/api/upload/route.ts`
- Create: `src/app/api/data-sources/route.ts`
- Create: `src/app/api/data-sources/[id]/route.ts`
- Create: `src/lib/python-client.ts`

**Step 1: Create Python service client**

Create `src/lib/python-client.ts`:

```typescript
const PYTHON_URL =
  process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

export async function pythonFetch(
  path: string,
  body: Record<string, unknown>
) {
  const res = await fetch(`${PYTHON_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `Python service error: ${res.status}`);
  }

  return res.json();
}
```

**Step 2: Create upload API route**

Create `src/app/api/upload/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { pythonFetch } from "@/lib/python-client";
import fs from "fs";
import path from "path";

const MAX_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = new Set(["csv", "xlsx", "txt"]);

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File exceeds 50MB limit" },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_TYPES.has(ext)) {
    return NextResponse.json(
      { error: "Supported formats: CSV, XLSX, TXT" },
      { status: 400 }
    );
  }

  const dataSourceId = uuid();
  const uploadDir = path.join(
    process.cwd(),
    "uploads",
    session.userId,
    dataSourceId
  );
  fs.mkdirSync(uploadDir, { recursive: true });

  const filePath = path.join(uploadDir, `original.${ext}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  const sheetName = formData.get("sheetName") as string | null;

  try {
    const result = await pythonFetch("/process/upload", {
      file_path: filePath,
      file_type: ext,
      sheet_name: sheetName,
    });

    db()
      .prepare(
        `INSERT INTO data_sources (id, user_id, filename, file_path, file_type, file_size, sheet_name, row_count, column_count, profile_json, parsed_path)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        dataSourceId,
        session.userId,
        file.name,
        filePath,
        ext,
        file.size,
        sheetName,
        result.row_count,
        result.column_count,
        JSON.stringify(result.profile),
        result.parsed_path
      );

    return NextResponse.json({
      id: dataSourceId,
      filename: file.name,
      row_count: result.row_count,
      column_count: result.column_count,
      columns: result.columns,
      profile: result.profile,
    });
  } catch (err: any) {
    fs.rmSync(uploadDir, { recursive: true, force: true });
    return NextResponse.json(
      { error: err.message || "Failed to process file" },
      { status: 422 }
    );
  }
}
```

**Step 3: Create data sources CRUD routes**

Create `src/app/api/data-sources/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const sources = db()
    .prepare(
      "SELECT id, filename, file_type, file_size, row_count, column_count, created_at FROM data_sources WHERE user_id = ? ORDER BY created_at DESC"
    )
    .all(session.userId);

  return NextResponse.json(sources);
}
```

Create `src/app/api/data-sources/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const source = db()
    .prepare("SELECT * FROM data_sources WHERE id = ? AND user_id = ?")
    .get(id, session.userId) as any;

  if (!source) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...source,
    profile: JSON.parse(source.profile_json || "null"),
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const source = db()
    .prepare("SELECT * FROM data_sources WHERE id = ? AND user_id = ?")
    .get(id, session.userId) as any;

  if (!source) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const uploadDir = path.dirname(source.file_path);
  fs.rmSync(uploadDir, { recursive: true, force: true });

  db().prepare("DELETE FROM data_sources WHERE id = ?").run(id);

  return NextResponse.json({ ok: true });
}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add file upload and data source CRUD API routes"
```

---

## Task 11: Next.js Dashboard and Chart CRUD API Routes

**Files:**
- Create: `src/app/api/dashboards/route.ts`
- Create: `src/app/api/dashboards/[id]/route.ts`
- Create: `src/app/api/dashboards/[id]/charts/route.ts`
- Create: `src/app/api/dashboards/[id]/charts/[chartId]/route.ts`
- Create: `src/app/api/dashboards/[id]/share/route.ts`
- Create: `src/app/api/share/[token]/route.ts`
- Create: `src/app/api/dashboards/[id]/suggest/route.ts`

**Step 1: Create dashboard CRUD**

Create `src/app/api/dashboards/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const dashboards = db()
    .prepare(
      `SELECT d.*, ds.filename as source_filename
       FROM dashboards d
       JOIN data_sources ds ON d.data_source_id = ds.id
       WHERE d.user_id = ?
       ORDER BY d.updated_at DESC`
    )
    .all(session.userId);

  return NextResponse.json(dashboards);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data_source_id, title } = await req.json();

  if (!data_source_id) {
    return NextResponse.json(
      { error: "data_source_id is required" },
      { status: 400 }
    );
  }

  const source = db()
    .prepare("SELECT id FROM data_sources WHERE id = ? AND user_id = ?")
    .get(data_source_id, session.userId);

  if (!source) {
    return NextResponse.json(
      { error: "Data source not found" },
      { status: 404 }
    );
  }

  const id = uuid();
  db()
    .prepare(
      "INSERT INTO dashboards (id, user_id, data_source_id, title) VALUES (?, ?, ?, ?)"
    )
    .run(id, session.userId, data_source_id, title || "Untitled Dashboard");

  return NextResponse.json({ id, data_source_id, title: title || "Untitled Dashboard" });
}
```

Create `src/app/api/dashboards/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const dashboard = db()
    .prepare("SELECT * FROM dashboards WHERE id = ? AND user_id = ?")
    .get(id, session.userId) as any;

  if (!dashboard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const charts = db()
    .prepare(
      "SELECT * FROM charts WHERE dashboard_id = ? ORDER BY position ASC"
    )
    .all(id);

  const source = db()
    .prepare("SELECT * FROM data_sources WHERE id = ?")
    .get(dashboard.data_source_id) as any;

  return NextResponse.json({
    ...dashboard,
    layout: JSON.parse(dashboard.layout_json || "[]"),
    charts: charts.map((c: any) => ({
      ...c,
      config: JSON.parse(c.config_json),
    })),
    source: source
      ? { ...source, profile: JSON.parse(source.profile_json || "null") }
      : null,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const dashboard = db()
    .prepare("SELECT id FROM dashboards WHERE id = ? AND user_id = ?")
    .get(id, session.userId);

  if (!dashboard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { title, description, layout } = await req.json();

  const updates: string[] = [];
  const values: any[] = [];

  if (title !== undefined) {
    updates.push("title = ?");
    values.push(title);
  }
  if (description !== undefined) {
    updates.push("description = ?");
    values.push(description);
  }
  if (layout !== undefined) {
    updates.push("layout_json = ?");
    values.push(JSON.stringify(layout));
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);

  db()
    .prepare(`UPDATE dashboards SET ${updates.join(", ")} WHERE id = ?`)
    .run(...values);

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const dashboard = db()
    .prepare("SELECT id FROM dashboards WHERE id = ? AND user_id = ?")
    .get(id, session.userId);

  if (!dashboard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  db().prepare("DELETE FROM dashboards WHERE id = ?").run(id);

  return NextResponse.json({ ok: true });
}
```

**Step 2: Create chart CRUD routes**

Create `src/app/api/dashboards/[id]/charts/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: dashboardId } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const dashboard = db()
    .prepare("SELECT id FROM dashboards WHERE id = ? AND user_id = ?")
    .get(dashboardId, session.userId);

  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
  }

  const { chart_type, title, config } = await req.json();

  if (!chart_type || !config) {
    return NextResponse.json(
      { error: "chart_type and config are required" },
      { status: 400 }
    );
  }

  const maxPos = db()
    .prepare(
      "SELECT MAX(position) as max_pos FROM charts WHERE dashboard_id = ?"
    )
    .get(dashboardId) as any;

  const chartId = uuid();
  const position = (maxPos?.max_pos ?? -1) + 1;

  db()
    .prepare(
      "INSERT INTO charts (id, dashboard_id, chart_type, title, config_json, position) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(chartId, dashboardId, chart_type, title || null, JSON.stringify(config), position);

  return NextResponse.json({ id: chartId, chart_type, title, config, position });
}
```

Create `src/app/api/dashboards/[id]/charts/[chartId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; chartId: string }> }
) {
  const { id: dashboardId, chartId } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const dashboard = db()
    .prepare("SELECT id FROM dashboards WHERE id = ? AND user_id = ?")
    .get(dashboardId, session.userId);

  if (!dashboard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { chart_type, title, config, position } = await req.json();

  const updates: string[] = [];
  const values: any[] = [];

  if (chart_type !== undefined) { updates.push("chart_type = ?"); values.push(chart_type); }
  if (title !== undefined) { updates.push("title = ?"); values.push(title); }
  if (config !== undefined) { updates.push("config_json = ?"); values.push(JSON.stringify(config)); }
  if (position !== undefined) { updates.push("position = ?"); values.push(position); }

  values.push(chartId, dashboardId);

  db()
    .prepare(`UPDATE charts SET ${updates.join(", ")} WHERE id = ? AND dashboard_id = ?`)
    .run(...values);

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; chartId: string }> }
) {
  const { id: dashboardId, chartId } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const dashboard = db()
    .prepare("SELECT id FROM dashboards WHERE id = ? AND user_id = ?")
    .get(dashboardId, session.userId);

  if (!dashboard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  db()
    .prepare("DELETE FROM charts WHERE id = ? AND dashboard_id = ?")
    .run(chartId, dashboardId);

  return NextResponse.json({ ok: true });
}
```

**Step 3: Create share routes**

Create `src/app/api/dashboards/[id]/share/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import crypto from "crypto";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: dashboardId } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const dashboard = db()
    .prepare("SELECT id FROM dashboards WHERE id = ? AND user_id = ?")
    .get(dashboardId, session.userId);

  if (!dashboard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = db()
    .prepare(
      "SELECT share_token FROM share_links WHERE dashboard_id = ? AND is_active = 1"
    )
    .get(dashboardId) as any;

  if (existing) {
    return NextResponse.json({ token: existing.share_token });
  }

  const token = crypto.randomBytes(6).toString("base64url");
  db()
    .prepare(
      "INSERT INTO share_links (id, dashboard_id, share_token) VALUES (?, ?, ?)"
    )
    .run(uuid(), dashboardId, token);

  return NextResponse.json({ token });
}
```

Create `src/app/api/share/[token]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const link = db()
    .prepare(
      "SELECT dashboard_id FROM share_links WHERE share_token = ? AND is_active = 1"
    )
    .get(token) as any;

  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const dashboard = db()
    .prepare("SELECT * FROM dashboards WHERE id = ?")
    .get(link.dashboard_id) as any;

  const charts = db()
    .prepare(
      "SELECT * FROM charts WHERE dashboard_id = ? ORDER BY position ASC"
    )
    .all(link.dashboard_id);

  const source = db()
    .prepare("SELECT parsed_path, profile_json FROM data_sources WHERE id = ?")
    .get(dashboard.data_source_id) as any;

  return NextResponse.json({
    title: dashboard.title,
    description: dashboard.description,
    layout: JSON.parse(dashboard.layout_json || "[]"),
    charts: charts.map((c: any) => ({
      ...c,
      config: JSON.parse(c.config_json),
    })),
    parsed_path: source?.parsed_path,
  });
}
```

**Step 4: Create AI suggest route (proxy to Python)**

Create `src/app/api/dashboards/[id]/suggest/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { pythonFetch } from "@/lib/python-client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: dashboardId } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const dashboard = db()
    .prepare("SELECT * FROM dashboards WHERE id = ? AND user_id = ?")
    .get(dashboardId, session.userId) as any;

  if (!dashboard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const source = db()
    .prepare("SELECT profile_json FROM data_sources WHERE id = ?")
    .get(dashboard.data_source_id) as any;

  if (!source?.profile_json) {
    return NextResponse.json({ error: "No profile data" }, { status: 400 });
  }

  const existingCharts = db()
    .prepare("SELECT config_json FROM charts WHERE dashboard_id = ?")
    .all(dashboardId)
    .map((c: any) => JSON.parse(c.config_json));

  const { num_suggestions } = await req.json().catch(() => ({ num_suggestions: 5 }));

  const result = await pythonFetch("/ai/suggest-charts", {
    profile_json: JSON.parse(source.profile_json),
    num_suggestions,
    existing_charts: existingCharts.length > 0 ? existingCharts : null,
  });

  return NextResponse.json(result);
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add dashboard, chart, share, and AI suggestion API routes"
```

---

## Task 12: Frontend — Auth Pages (Login/Register)

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/register/page.tsx`
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/lib/api.ts`
- Create: `src/hooks/use-auth.ts`

**Step 1: Create API client helper**

Create `src/lib/api.ts`:

```typescript
export async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data;
}
```

**Step 2: Create auth hook**

Create `src/hooks/use-auth.ts`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    apiFetch("/api/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const user = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setUser(user);
      router.push("/dashboards");
    },
    [router]
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const user = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
      });
      setUser(user);
      router.push("/dashboards");
    },
    [router]
  );

  const logout = useCallback(async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
  }, [router]);

  return { user, loading, login, register, logout };
}
```

**Step 3: Create auth layout and pages**

Create `src/app/(auth)/layout.tsx`:

```tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8">{children}</div>
    </div>
  );
}
```

Create `src/app/(auth)/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Sign in to DashStream</CardTitle>
        <CardDescription>
          Enter your email and password to access your dashboards
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-red-500 bg-red-50 p-2 rounded">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
```

Create `src/app/(auth)/register/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password, name);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>
          Get started with DashStream — turn your data into dashboards
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-red-500 bg-red-50 p-2 rounded">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add login and register pages with auth hook"
```

---

## Task 13: Frontend — My Dashboards Page (Home)

**Files:**
- Create: `src/app/(app)/layout.tsx`
- Create: `src/app/(app)/dashboards/page.tsx`
- Create: `src/components/navbar.tsx`

**Step 1: Create app layout with navbar**

Create `src/components/navbar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          <Link href="/dashboards" className="text-lg font-bold">
            DashStream
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
```

Create `src/app/(app)/layout.tsx`:

```tsx
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Navbar } from "@/components/navbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
```

Create `src/app/(app)/dashboards/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Dashboard {
  id: string;
  title: string;
  description: string | null;
  source_filename: string;
  updated_at: string;
}

export default function DashboardsPage() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    apiFetch("/api/dashboards")
      .then(setDashboards)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Dashboards</h1>
        <Button onClick={() => router.push("/upload")}>New Dashboard</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading dashboards...</p>
      ) : dashboards.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No dashboards yet. Upload a file to get started.
            </p>
            <Button onClick={() => router.push("/upload")}>
              Upload your first file
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboards.map((d) => (
            <Link key={d.id} href={`/dashboards/${d.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">{d.title}</CardTitle>
                  <CardDescription>
                    Source: {d.source_filename}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Updated {new Date(d.updated_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Update root page to redirect**

Update `src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboards");
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add dashboards listing page with navbar and app layout"
```

---

## Task 14: Frontend — File Upload Page

**Files:**
- Create: `src/app/(app)/upload/page.tsx`
- Create: `src/components/file-dropzone.tsx`

**Step 1: Create file dropzone component**

Create `src/components/file-dropzone.tsx`:

```tsx
"use client";

import { useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  accept: string;
  disabled?: boolean;
}

export function FileDropzone({ onFileSelect, accept, disabled }: FileDropzoneProps) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect, disabled]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  return (
    <Card
      className={`border-2 border-dashed transition-colors ${
        dragging ? "border-primary bg-primary/5" : "border-gray-300"
      } ${disabled ? "opacity-50" : "cursor-pointer"}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium mb-1">
          Drop your file here, or click to browse
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          Supports CSV, XLSX, and TXT (up to 50MB)
        </p>
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          id="file-input"
          disabled={disabled}
        />
        <label
          htmlFor="file-input"
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90"
        >
          Choose file
        </label>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Create upload page**

Create `src/app/(app)/upload/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileDropzone } from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleFileSelect(file: File) {
    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Create a dashboard from this data source
      const dashboard = await apiFetch("/api/dashboards", {
        method: "POST",
        body: JSON.stringify({ data_source_id: data.id }),
      });

      router.push(`/dashboards/${dashboard.id}/preview`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Upload Data</h1>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 p-3 rounded mb-4">
          {error}
        </p>
      )}

      <FileDropzone
        onFileSelect={handleFileSelect}
        accept=".csv,.xlsx,.txt"
        disabled={uploading}
      />

      {uploading && (
        <p className="text-center text-muted-foreground mt-4">
          Uploading and processing your file...
        </p>
      )}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add file upload page with drag-and-drop"
```

---

## Task 15: Frontend — Data Preview Page

**Files:**
- Create: `src/app/(app)/dashboards/[id]/preview/page.tsx`
- Create: `src/components/data-table-preview.tsx`
- Create: `src/components/column-stats.tsx`

**Step 1: Create data table preview component**

Create `src/components/data-table-preview.tsx`:

```tsx
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface DataTablePreviewProps {
  columns: string[];
  profile: Record<string, { type: string }>;
  data: Record<string, any>[];
}

const TYPE_COLORS: Record<string, string> = {
  numeric: "bg-blue-100 text-blue-800",
  categorical: "bg-green-100 text-green-800",
  datetime: "bg-purple-100 text-purple-800",
  text: "bg-gray-100 text-gray-800",
};

export function DataTablePreview({
  columns,
  profile,
  data,
}: DataTablePreviewProps) {
  return (
    <div className="border rounded-lg overflow-auto max-h-96">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col} className="whitespace-nowrap">
                <div className="flex flex-col gap-1">
                  <span>{col}</span>
                  <Badge
                    variant="secondary"
                    className={`text-xs w-fit ${TYPE_COLORS[profile[col]?.type] || ""}`}
                  >
                    {profile[col]?.type || "unknown"}
                  </Badge>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.slice(0, 100).map((row, i) => (
            <TableRow key={i}>
              {columns.map((col) => (
                <TableCell key={col} className="whitespace-nowrap">
                  {row[col] != null ? String(row[col]) : "—"}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

**Step 2: Create column stats component**

Create `src/components/column-stats.tsx`:

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ColumnStatsProps {
  profile: Record<
    string,
    {
      type: string;
      null_count: number;
      unique_count: number;
      min?: number | string;
      max?: number | string;
      mean?: number;
      top_values?: Record<string, number>;
    }
  >;
}

export function ColumnStats({ profile }: ColumnStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {Object.entries(profile).map(([col, info]) => (
        <Card key={col}>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center justify-between">
              {col}
              <Badge variant="outline" className="text-xs">
                {info.type}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 text-xs text-muted-foreground space-y-1">
            <p>Unique: {info.unique_count} | Nulls: {info.null_count}</p>
            {info.type === "numeric" && (
              <p>
                Range: {info.min} — {info.max} | Mean: {info.mean}
              </p>
            )}
            {info.type === "datetime" && (
              <p>
                {info.min} to {info.max}
              </p>
            )}
            {info.type === "categorical" && info.top_values && (
              <p>
                Top: {Object.keys(info.top_values).slice(0, 3).join(", ")}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**Step 3: Create preview page**

Create `src/app/(app)/dashboards/[id]/preview/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { DataTablePreview } from "@/components/data-table-preview";
import { ColumnStats } from "@/components/column-stats";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PreviewPage() {
  const params = useParams();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const dash = await apiFetch(`/api/dashboards/${params.id}`);
      setDashboard(dash);

      // Fetch preview data from python service
      if (dash.source?.parsed_path) {
        const res = await fetch("/api/data-query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parsed_path: dash.source.parsed_path,
            limit: 100,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setPreviewData(data.data || []);
        }
      }
      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) return <p className="text-muted-foreground">Loading preview...</p>;
  if (!dashboard) return <p>Dashboard not found</p>;

  const profile = dashboard.source?.profile?.columns || {};
  const columns = Object.keys(profile);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{dashboard.source?.filename}</h1>
          <p className="text-sm text-muted-foreground">
            {dashboard.source?.row_count} rows, {dashboard.source?.column_count} columns
          </p>
        </div>
        <Button onClick={() => router.push(`/dashboards/${params.id}/edit`)}>
          Continue to Dashboard
        </Button>
      </div>

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Table Preview</TabsTrigger>
          <TabsTrigger value="stats">Column Stats</TabsTrigger>
        </TabsList>
        <TabsContent value="table">
          <DataTablePreview
            columns={columns}
            profile={profile}
            data={previewData}
          />
        </TabsContent>
        <TabsContent value="stats">
          <ColumnStats profile={profile} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add data preview page with table view and column stats"
```

---

## Task 16: Frontend — Dashboard Editor with AI Suggestions

**Files:**
- Create: `src/app/(app)/dashboards/[id]/edit/page.tsx`
- Create: `src/components/suggestion-card.tsx`
- Create: `src/components/chart-renderer.tsx`
- Create: `src/components/dashboard-grid.tsx`

**Step 1: Create chart renderer**

Create `src/components/chart-renderer.tsx`:

```tsx
"use client";

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#0088FE", "#00C49F"];

interface ChartRendererProps {
  type: string;
  data: Record<string, any>[];
  config: {
    x: string;
    y: string;
    groupBy?: string;
  };
}

export function ChartRenderer({ type, data, config }: ChartRendererProps) {
  const { x, y } = config;

  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No data</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      {type === "bar" ? (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={x} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey={y} fill="#8884d8" />
        </BarChart>
      ) : type === "line" ? (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={x} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={y} stroke="#8884d8" />
        </LineChart>
      ) : type === "area" ? (
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={x} />
          <YAxis />
          <Tooltip />
          <Area type="monotone" dataKey={y} fill="#8884d8" fillOpacity={0.3} stroke="#8884d8" />
        </AreaChart>
      ) : type === "pie" ? (
        <PieChart>
          <Pie data={data} dataKey={y} nameKey={x} cx="50%" cy="50%" outerRadius={100} label>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      ) : type === "scatter" ? (
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={x} name={x} />
          <YAxis dataKey={y} name={y} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Scatter data={data} fill="#8884d8" />
        </ScatterChart>
      ) : (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={x} />
          <YAxis />
          <Tooltip />
          <Bar dataKey={y} fill="#8884d8" />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}
```

**Step 2: Create suggestion card**

Create `src/components/suggestion-card.tsx`:

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Suggestion {
  type: string;
  x: string;
  y: string;
  groupBy?: string;
  title: string;
  reason: string;
}

interface SuggestionCardProps {
  suggestion: Suggestion;
  onAdd: (suggestion: Suggestion) => void;
}

export function SuggestionCard({ suggestion, onAdd }: SuggestionCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-sm">{suggestion.title}</CardTitle>
          <Badge variant="outline" className="text-xs">
            {suggestion.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
        <p className="text-xs">
          X: <strong>{suggestion.x}</strong> | Y: <strong>{suggestion.y}</strong>
          {suggestion.groupBy && (
            <> | Group: <strong>{suggestion.groupBy}</strong></>
          )}
        </p>
        <Button size="sm" className="w-full" onClick={() => onAdd(suggestion)}>
          Add to Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}
```

**Step 3: Create dashboard grid**

Create `src/components/dashboard-grid.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartRenderer } from "@/components/chart-renderer";

interface ChartItem {
  id: string;
  chart_type: string;
  title: string;
  config: { x: string; y: string; groupBy?: string };
}

interface DashboardGridProps {
  charts: ChartItem[];
  parsedPath: string;
  onRemoveChart: (chartId: string) => void;
}

export function DashboardGrid({
  charts,
  parsedPath,
  onRemoveChart,
}: DashboardGridProps) {
  const [chartData, setChartData] = useState<Record<string, any[]>>({});

  useEffect(() => {
    charts.forEach(async (chart) => {
      if (chartData[chart.id]) return;
      try {
        const res = await fetch("/api/data-query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parsed_path: parsedPath,
            chart_config: { type: chart.chart_type, ...chart.config },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setChartData((prev) => ({ ...prev, [chart.id]: data.data }));
        }
      } catch (err) {
        console.error("Failed to load chart data:", err);
      }
    });
  }, [charts, parsedPath]);

  if (charts.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        No charts yet. Add charts from the suggestions below.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {charts.map((chart) => (
        <Card key={chart.id}>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-sm">{chart.title}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemoveChart(chart.id)}
            >
              Remove
            </Button>
          </CardHeader>
          <CardContent>
            {chartData[chart.id] ? (
              <ChartRenderer
                type={chart.chart_type}
                data={chartData[chart.id]}
                config={chart.config}
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Loading chart...
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**Step 4: Create dashboard editor page**

Create `src/app/(app)/dashboards/[id]/edit/page.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SuggestionCard } from "@/components/suggestion-card";
import { DashboardGrid } from "@/components/dashboard-grid";
import { Separator } from "@/components/ui/separator";

interface Suggestion {
  type: string;
  x: string;
  y: string;
  groupBy?: string;
  title: string;
  reason: string;
}

export default function DashboardEditPage() {
  const params = useParams();
  const dashboardId = params.id as string;

  const [dashboard, setDashboard] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);

  const loadDashboard = useCallback(async () => {
    const dash = await apiFetch(`/api/dashboards/${dashboardId}`);
    setDashboard(dash);
    setTitle(dash.title);
    setLoading(false);
  }, [dashboardId]);

  const loadSuggestions = useCallback(async () => {
    setSuggesting(true);
    try {
      const result = await apiFetch(`/api/dashboards/${dashboardId}/suggest`, {
        method: "POST",
        body: JSON.stringify({ num_suggestions: 5 }),
      });
      setSuggestions(result.suggestions || []);
    } catch (err) {
      console.error("Failed to load suggestions:", err);
    } finally {
      setSuggesting(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    loadDashboard().then(loadSuggestions);
  }, [loadDashboard, loadSuggestions]);

  async function handleAddChart(suggestion: Suggestion) {
    await apiFetch(`/api/dashboards/${dashboardId}/charts`, {
      method: "POST",
      body: JSON.stringify({
        chart_type: suggestion.type,
        title: suggestion.title,
        config: { x: suggestion.x, y: suggestion.y, groupBy: suggestion.groupBy },
      }),
    });
    await loadDashboard();
  }

  async function handleRemoveChart(chartId: string) {
    await apiFetch(`/api/dashboards/${dashboardId}/charts/${chartId}`, {
      method: "DELETE",
    });
    await loadDashboard();
  }

  async function handleSaveTitle() {
    await apiFetch(`/api/dashboards/${dashboardId}`, {
      method: "PUT",
      body: JSON.stringify({ title }),
    });
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!dashboard) return <p>Dashboard not found</p>;

  return (
    <div className="space-y-6">
      <div className="flex gap-3 items-center">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleSaveTitle}
          className="text-xl font-bold border-none shadow-none px-0 focus-visible:ring-0"
        />
      </div>

      <DashboardGrid
        charts={dashboard.charts || []}
        parsedPath={dashboard.source?.parsed_path || ""}
        onRemoveChart={handleRemoveChart}
      />

      <Separator />

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">AI Suggestions</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={loadSuggestions}
            disabled={suggesting}
          >
            {suggesting ? "Thinking..." : "Suggest More"}
          </Button>
        </div>

        {suggesting && suggestions.length === 0 ? (
          <p className="text-muted-foreground">
            AI is analyzing your data...
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {suggestions.map((s, i) => (
              <SuggestionCard
                key={`${s.title}-${i}`}
                suggestion={s}
                onAdd={handleAddChart}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 5: Install recharts**

```bash
npm install recharts
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add dashboard editor with AI suggestions and chart rendering"
```

---

## Task 17: Frontend — Data Query Proxy Route

**Files:**
- Create: `src/app/api/data-query/route.ts`

**Step 1: Create the proxy route**

Create `src/app/api/data-query/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { pythonFetch } from "@/lib/python-client";

export async function POST(req: NextRequest) {
  const body = await req.json();

  try {
    const result = await pythonFetch("/data/query", {
      parsed_path: body.parsed_path,
      chart_config: body.chart_config,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Query failed" },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add data query proxy route"
```

---

## Task 18: Frontend — Share Dashboard

**Files:**
- Create: `src/app/share/[token]/page.tsx`
- Create: `src/components/share-dialog.tsx`

**Step 1: Create share dialog component**

Create `src/components/share-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

interface ShareDialogProps {
  dashboardId: string;
}

export function ShareDialog({ dashboardId }: ShareDialogProps) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    setLoading(true);
    try {
      const result = await apiFetch(`/api/dashboards/${dashboardId}/share`, {
        method: "POST",
      });
      setToken(result.token);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Dashboard</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!token ? (
            <Button onClick={handleShare} disabled={loading} className="w-full">
              {loading ? "Generating link..." : "Generate Share Link"}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Input
                value={`${window.location.origin}/share/${token}`}
                readOnly
              />
              <Button onClick={handleCopy}>
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Anyone with this link can view the dashboard (read-only).
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Create shared view page**

Create `src/app/share/[token]/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ChartRenderer } from "@/components/chart-renderer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SharedDashboardPage() {
  const params = useParams();
  const [dashboard, setDashboard] = useState<any>(null);
  const [chartData, setChartData] = useState<Record<string, any[]>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/share/${params.token}`);
      if (!res.ok) {
        setError("Dashboard not found or link has expired.");
        return;
      }
      const data = await res.json();
      setDashboard(data);

      // Load chart data
      for (const chart of data.charts) {
        try {
          const qRes = await fetch("/api/data-query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              parsed_path: data.parsed_path,
              chart_config: { type: chart.chart_type, ...chart.config },
            }),
          });
          if (qRes.ok) {
            const qData = await qRes.json();
            setChartData((prev) => ({ ...prev, [chart.id]: qData.data }));
          }
        } catch {}
      }
    }
    load();
  }, [params.token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">{dashboard.title}</h1>
        {dashboard.description && (
          <p className="text-muted-foreground mb-6">{dashboard.description}</p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {dashboard.charts.map((chart: any) => (
            <Card key={chart.id}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">{chart.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData[chart.id] ? (
                  <ChartRenderer
                    type={chart.chart_type}
                    data={chartData[chart.id]}
                    config={chart.config}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Loading...
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-xs text-center text-muted-foreground mt-8">
          Built with DashStream
        </p>
      </div>
    </div>
  );
}
```

**Step 3: Add share dialog to dashboard editor**

In `src/app/(app)/dashboards/[id]/edit/page.tsx`, add the ShareDialog import and render it next to the title input:

```tsx
// Add import at top
import { ShareDialog } from "@/components/share-dialog";

// In the JSX, update the title section:
<div className="flex gap-3 items-center">
  <Input
    value={title}
    onChange={(e) => setTitle(e.target.value)}
    onBlur={handleSaveTitle}
    className="text-xl font-bold border-none shadow-none px-0 focus-visible:ring-0"
  />
  <ShareDialog dashboardId={dashboardId} />
</div>
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add dashboard sharing with public links and shared view"
```

---

## Task 19: Landing Page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Replace redirect with a landing page**

Update `src/app/page.tsx`:

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <span className="text-lg font-bold">DashStream</span>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Turn your spreadsheets into dashboards
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
          Upload a CSV or Excel file. AI analyzes your data and suggests the
          best charts. Build interactive dashboards in minutes — no SQL or
          coding required.
        </p>
        <Link href="/register">
          <Button size="lg">Start for Free</Button>
        </Link>
      </main>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add landing page"
```

---

## Task 20: Dev Script and Final Integration

**Files:**
- Modify: `package.json`
- Create: `scripts/dev.sh`

**Step 1: Create a dev script that starts both services**

Create `scripts/dev.sh`:

```bash
#!/bin/bash

# Start Python data service
echo "Starting Python data service..."
cd services/data-service
source .venv/bin/activate
uvicorn main:app --reload --port 8000 &
PYTHON_PID=$!
cd ../..

# Start Next.js
echo "Starting Next.js..."
npm run dev &
NEXT_PID=$!

# Cleanup on exit
trap "kill $PYTHON_PID $NEXT_PID 2>/dev/null" EXIT

echo ""
echo "DashStream Pro running:"
echo "  Frontend: http://localhost:3000"
echo "  Data API: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop both services."

wait
```

```bash
chmod +x scripts/dev.sh
```

**Step 2: Add script to package.json**

Add to `package.json` scripts:
```json
"dev:all": "bash scripts/dev.sh"
```

**Step 3: Create the data directory**

```bash
mkdir -p data
echo "*.db" > data/.gitignore
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add dev script to start both services and finalize project setup"
```

---

## Summary

| Task | Description | Est. Size |
|------|-------------|-----------|
| 1 | Next.js scaffolding | Small |
| 2 | Python FastAPI scaffolding | Small |
| 3 | shadcn/ui components | Small |
| 4 | SQLite schema + helpers | Medium |
| 5 | Auth (session-based) | Medium |
| 6 | Python file parser | Medium |
| 7 | Python data profiler | Medium |
| 8 | Python AI engine | Medium |
| 9 | Python FastAPI endpoints | Medium |
| 10 | Upload + data source routes | Medium |
| 11 | Dashboard/chart/share routes | Large |
| 12 | Auth pages (login/register) | Medium |
| 13 | Dashboards listing page | Medium |
| 14 | File upload page | Medium |
| 15 | Data preview page | Medium |
| 16 | Dashboard editor + AI suggestions | Large |
| 17 | Data query proxy route | Small |
| 18 | Share dashboard | Medium |
| 19 | Landing page | Small |
| 20 | Dev script + integration | Small |

**Total: 20 tasks** — builds the complete MVP from scaffolding to working product.
