# DashStream Pro

A full-stack data analytics dashboard platform. Upload CSV/Excel files, get AI-powered chart suggestions, build interactive dashboards, and share them publicly.

## Tech Stack

**Frontend**
- Next.js 16 (App Router) + React 19
- TypeScript, Tailwind CSS v4, shadcn/ui
- Recharts for chart rendering

**Backend**
- Next.js API routes (auth, dashboards, data sources)
- SQLite via `better-sqlite3`
- Python FastAPI microservice for data processing and AI suggestions
- OpenAI GPT-4o-mini for chart recommendations

## Features

- **Authentication** — register/login with session-based auth (`iron-session`)
- **File Upload** — drag-and-drop CSV and Excel files
- **Data Profiling** — automatic column statistics and data preview
- **AI Chart Suggestions** — GPT-4o-mini analyzes your data profile and recommends chart types
- **Dashboard Editor** — build multi-chart dashboards with a grid layout
- **Public Sharing** — generate shareable public links for dashboards

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── (auth)/         # Login & register pages
│   │   ├── (app)/          # Protected app pages
│   │   │   ├── dashboards/ # Dashboard list & editor
│   │   │   └── upload/     # File upload page
│   │   ├── api/            # Next.js API routes
│   │   └── share/          # Public shared dashboard view
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   └── lib/                # DB, auth, API utilities
└── services/
    └── data-service/       # Python FastAPI service
        ├── main.py
        ├── routes.py       # /process/upload, /ai/suggest-charts, /data/query
        ├── parsers.py      # CSV/Excel parsing
        ├── profiler.py     # Data profiling
        └── ai_engine.py    # OpenAI integration
```

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Set up Python data service

```bash
cd services/data-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Configure environment

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

```env
PYTHON_SERVICE_URL=http://localhost:8000
SESSION_SECRET=change-me-to-a-random-string-at-least-32-chars
OPENAI_API_KEY=sk-...
```

### 4. Run both services

```bash
npm run dev:all
```

This starts:
- Next.js frontend at [http://localhost:3000](http://localhost:3000)
- Python data service at [http://localhost:8000](http://localhost:8000)

Or run them separately:

```bash
# Terminal 1 — Python service
cd services/data-service && source .venv/bin/activate && uvicorn main:app --reload --port 8000

# Terminal 2 — Next.js
npm run dev
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run dev:all` | Start both Next.js and Python service |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run test` | Run tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript type checker |

## API Routes

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET  /api/auth/me`

### Data Sources
- `GET    /api/data-sources`
- `POST   /api/upload`
- `DELETE /api/data-sources/[id]`

### Dashboards
- `GET    /api/dashboards`
- `POST   /api/dashboards`
- `GET    /api/dashboards/[id]`
- `PUT    /api/dashboards/[id]`
- `DELETE /api/dashboards/[id]`
- `POST   /api/dashboards/[id]/suggest` — trigger AI chart suggestions
- `GET    /api/dashboards/[id]/share`   — get/create share token
- `GET    /api/share/[token]`           — public shared dashboard

### Data Query (proxy to Python service)
- `POST /api/data-query` — query parsed data for chart rendering
