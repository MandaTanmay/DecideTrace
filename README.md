# DecideTrace

> **AI-powered meeting intelligence** — paste a transcript, get instant conflict detection, action items, and knowledge gap suggestions powered by a 5-agent LangGraph pipeline.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![LangGraph](https://img.shields.io/badge/LangGraph-TypeScript-blue)
![Groq](https://img.shields.io/badge/Groq-llama--3.3--70b-orange)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)

---

## What It Does

MeetMind takes your **meeting transcript** + **existing notes** and runs them through a 5-agent AI pipeline:

| Agent | Task |
|-------|------|
| **Agent 1 — Meeting Analyzer** | Extracts summary, decisions, topics, and speakers from the transcript |
| **Agent 2 — Knowledge Indexer** | Chunks your notes into 200-word segments and embeds them locally (no API cost) |
| **Agent 3 — Conflict Detector** | Finds contradictions between new decisions and your existing notes using vector search + LLM reasoning |
| **Agent 4 — Action Extractor** | Pulls out tasks with owners, deadlines, and priority levels |
| **Agent 5 — Knowledge Updater** | Identifies topics not covered in your notes and generates ready-to-paste documentation sections |

Every analysis is saved to MongoDB. On subsequent runs, **all past analyses are loaded as context** — so the system gets smarter over time and can detect contradictions across meetings weeks apart.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Agent Pipeline**: LangGraph TypeScript — parallel fan-out/fan-in graph
- **LLM**: Groq API with `llama-3.3-70b-versatile` (free tier)
- **Local Embeddings**: `Xenova/all-MiniLM-L6-v2` via `@huggingface/transformers` — runs in Node.js, no API key, no cost
- **Vector Search**: In-memory cosine similarity (no external DB needed)
- **Database**: MongoDB Atlas (free 512MB tier)
- **Auth**: JWT (7-day tokens) + bcrypt password hashing
- **Tracing**: LangSmith (optional, free tier)
- **UI**: React 19, Three.js, TailwindCSS v4

---

## Project Structure

```
MeetMind/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── signup/route.ts     # POST — create account
│   │   │   ├── login/route.ts      # POST — authenticate
│   │   │   ├── logout/route.ts     # POST — clear cookie
│   │   │   └── me/route.ts         # GET  — current user
│   │   └── analyses/
│   │       ├── route.ts            # GET list / POST run pipeline
│   │       └── [id]/route.ts       # GET single analysis
│   ├── dashboard/page.tsx          # Main app UI
│   ├── login/page.tsx
│   └── signup/page.tsx
├── src/
│   ├── agents/
│   │   ├── meetingAnalyzer.ts      # Agent 1
│   │   ├── knowledgeIndexer.ts     # Agent 2
│   │   ├── conflictDetector.ts     # Agent 3 (core)
│   │   ├── actionExtractor.ts      # Agent 4
│   │   └── knowledgeUpdater.ts     # Agent 5
│   └── graph/
│       ├── state.ts                # LangGraph state schema
│       └── graph.ts                # Graph topology (fan-out/fan-in)
├── lib/
│   ├── embeddings.ts               # Local embedding singleton
│   ├── mongodb.ts                  # MongoClient singleton
│   └── auth.ts                     # JWT + bcrypt helpers
├── models/
│   ├── User.ts                     # MongoDB user document type
│   └── Analysis.ts                 # MongoDB analysis document type
├── components/                     # UI components (3D, forms, results)
├── proxy.ts                        # Edge middleware — route protection
└── .env.local                      # Environment variables (fill in before running)
```

---

## Quick Start

### 1. Get Your API Keys

#### Groq API Key (free)
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up → **API Keys** → **Create API Key**
3. Copy the key — it starts with `gsk_`

#### MongoDB URI (free)
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster (M0 — 512MB free forever)
3. **Database Access** → Add a user with password
4. **Network Access** → Add IP `0.0.0.0/0` (allow all, for development)
5. **Connect** → **Connect your application** → Copy the URI
6. Replace `<password>` in the URI with your database user's password

#### JWT Secret (generate it yourself — see below)

#### LangSmith API Key (optional, free)
1. Go to [smith.langchain.com](https://smith.langchain.com)
2. Sign up → **Settings** → **API Keys** → **Create API Key**

---

### 2. Generate a JWT Secret

The JWT secret is just a long random string you create yourself — **no website needed**.

**Option A — Node.js (recommended, already installed):**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Option B — PowerShell:**
```powershell
-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
```

**Option C — OpenSSL (if installed):**
```bash
openssl rand -hex 64
```

Copy the output (a 128-character hex string) and use it as your `JWT_SECRET`.

> **Important:** Keep this secret and never commit it to Git. Anyone with this string can forge authentication tokens for your app.

---

### 3. Fill in `.env.local`

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
JWT_SECRET=a1b2c3d4e5f6...  (your 128-char hex string from step 2)
LANGCHAIN_API_KEY=ls__xxxxxxxxxxxx   (optional — for LangSmith tracing)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=meetmind-agent
```

---

### 4. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> **First request note:** The embedding model (`all-MiniLM-L6-v2`, ~23MB) downloads automatically on the first analysis. Expect a 10–30 second delay. All subsequent requests reuse the cached model.

---

## Agent Pipeline Topology

```
__start__ ─┬─► meetingAnalyzer  ─────────────────────┐
           └─► knowledgeIndexer ─────────────────────┤
                                                      ▼
                                            conflictDetector
                                                      │
                                       ┌──────────────┴──────────────┐
                                       ▼                             ▼
                                 actionExtractor            knowledgeUpdater
                                       │                             │
                                       └──────────────┬──────────────┘
                                                      ▼
                                                   __end__
```

- **Agents 1 & 2** run in **parallel** (transcript analysis + note embedding happen simultaneously)
- **Agent 3** waits for both to complete (fan-in), then runs conflict detection
- **Agents 4 & 5** run in **parallel** after Agent 3 (action extraction + knowledge updates simultaneously)

---

## How Past Meetings Make It Smarter

On every new analysis run, MeetMind loads the last 10 analyses from MongoDB for that user and formats them into a `pastMeetingContext` string:

```
--- Analysis from June 1, 2026 ---
Summary: The team decided to freeze hiring until Q3...
Decisions made:
  - No new hires until Q3 2026
  - API SLA set at 500ms
Conflicts found:
  - ...
---
```

This context is:
- Passed to **Agent 1** so it understands recurring themes
- Indexed by **Agent 2** alongside current notes so past decisions are searchable
- Used by **Agent 3** to detect contradictions with decisions made meetings ago

---

## Deploying to Vercel

1. Push to GitHub
2. Import project at [vercel.com](https://vercel.com)
3. Add all environment variables in **Project Settings → Environment Variables**
4. Add one more variable: `TRANSFORMERS_CACHE=/tmp` — this tells the embedding model to cache to `/tmp` (the only writable path on Vercel)
5. Deploy

The `POST /api/analyses` route has `export const maxDuration = 60` — Vercel allows up to 60 seconds for API routes on the hobby plan, which is enough for the full pipeline.

---

## API Reference

### Auth

| Method | Endpoint | Body | Returns |
|--------|----------|------|---------|
| POST | `/api/auth/signup` | `{ name, email, password }` | `{ user, token }` + sets httpOnly cookie |
| POST | `/api/auth/login` | `{ email, password }` | `{ user, token }` + sets httpOnly cookie |
| POST | `/api/auth/logout` | — | Clears cookie |
| GET | `/api/auth/me` | — | `{ user }` |

### Analyses

| Method | Endpoint | Auth | Returns |
|--------|----------|------|---------|
| GET | `/api/analyses` | ✅ Required | `{ analyses: [{ id, title, date }] }` |
| POST | `/api/analyses` | ✅ Required | Full analysis result with summary, decisions, conflicts, actionItems, knowledgeGaps |
| GET | `/api/analyses/:id` | ✅ Required | Full analysis document |

---

## License

MIT
