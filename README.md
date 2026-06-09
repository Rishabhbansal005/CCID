# 🔍 Cyber Crime Investigation Dashboard (CCID)

A digital forensics and cybercrime investigation platform for investigators to manage cases, evidence, findings, timelines, risk assessments, and reports.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, React Router v6, Bootstrap 5 |
| Backend | FastAPI (Python 3.11), Uvicorn |
| Database & Auth | Supabase (PostgreSQL + Auth + Storage) |
| PDF Reports | ReportLab (Python) |
| Future Tools | Volatility 3, Wireshark, Autopsy, FTK Imager |

## Project Structure

```
CBS/
├── frontend/          # React + TypeScript (Vite)
├── backend/           # FastAPI Python backend
├── supabase/          # SQL migrations + RLS policies
└── README.md
```

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Supabase account + project

### 1. Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Run the SQL migrations in order from `supabase/migrations/`
3. Run `supabase/rls_policies.sql` for Row Level Security
4. Run `supabase/storage_setup.sql` to configure the `forensic_uploads` bucket

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Fill in your Supabase credentials
uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local   # Fill in your Supabase + API credentials
npm run dev
```

App available at: http://localhost:5173

## Environment Variables

### Backend (`backend/.env`)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
SECRET_KEY=your-jwt-secret
CORS_ORIGINS=http://localhost:5173
```

### Frontend (`frontend/.env.local`)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## Modules

| Module | Status | Description |
|---|---|---|
| Authentication | ✅ | Supabase Auth (email/password), role-based |
| Dashboard | ✅ | Stats, recent activity, quick actions |
| Case Management | ✅ | Full CRUD, status/priority tracking |
| Evidence | ✅ | Upload to Supabase Storage, chain of custody |
| Findings | 🔜 | Linked to cases/evidence, severity tags |
| Timeline | 🔜 | Chronological event visualization |
| Risk Assessment | 🔜 | 5×5 risk matrix per case |
| PDF Reports | 🔜 | Backend-generated via ReportLab |

## Forensic Tool Integration (Future)

Placeholder adapters are ready in `backend/app/services/forensics/`:

| Tool | Adapter | Status |
|---|---|---|
| Volatility 3 | `volatility_adapter.py` | 🔌 Stub |
| Wireshark | `wireshark_adapter.py` | 🔌 Stub |
| Autopsy | `autopsy_adapter.py` | 🔌 Stub |
| FTK Imager | `ftk_adapter.py` | 🔌 Stub |

## User Roles

| Role | Permissions |
|---|---|
| `admin` | Full access — manage users, all cases |
| `investigator` | Create/edit cases, upload evidence, write reports |
| `viewer` | Read-only access to assigned cases |
