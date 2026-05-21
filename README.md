# Pitch Picture

> Pitch your idea, see the picture.

Web app that turns a spoken brainstorm into a visual diagram. Record yourself narrating an idea → audio is transcribed → Claude picks a diagram type and writes Mermaid → diagram is rendered on a shareable page.

## Why

When one person describes an idea verbally to a team, others often have trouble visualizing it. Pitch Picture gives the speaker — and their team — a visual artifact instead of a 15-minute audio file.

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | React 19 · TypeScript · Vite · React Router (HashRouter) |
| Backend | Node · Express · TypeScript |
| Auth + DB + Storage | Supabase (Postgres, private `audio-recordings` bucket) |
| Speech-to-text | Deepgram Nova-3 |
| LLM | Anthropic `claude-sonnet-4-5` |
| Diagram render | `mermaid` (client-side) |
| Package manager | pnpm (each package has its own lockfile) |

## Repo layout

```
PitchPicture/
├── react/                    # Vite frontend
│   └── src/
│       ├── pages/            # Home, Recording, Processing, Result, Share, History
│       ├── components/       # Recorder, DiagramView
│       └── lib/              # auth, api, supabase, types
├── api/                      # Express backend
│   └── src/
│       ├── routes/           # sessions.ts, share.ts
│       ├── services/         # claude.ts, deepgram.ts, mermaid.ts, supabase.ts
│       ├── middleware/       # auth.ts (Supabase JWT)
│       ├── lib/types.ts      # API contract (source of truth)
│       ├── pipeline.ts       # transcribe → analyze orchestration
│       ├── app.ts            # Express setup + CORS
│       └── index.ts          # port listen
├── supabase/migrations/      # schema, RLS, storage bucket
└── scripts/                  # test-analysis.ts, test-pipeline.ts
```

## Setup

You'll need accounts for **Supabase**, **Anthropic**, and **Deepgram**. All three have free tiers that cover development.

### 1. Install

Each of root, `react/`, and `api/` has its own `package.json`:

```bash
pnpm install            # root devDeps (used by scripts/)
pnpm -C react install   # frontend deps
pnpm -C api install     # backend deps
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Open **SQL Editor** → paste `supabase/migrations/20260512_init.sql` → **Run**
3. Verify: **Table Editor** shows `sessions` table, **Storage** shows `audio-recordings` bucket
4. **Authentication → Users → Add user**, create a test user with **Auto Confirm User** checked

### 3. Configure environment

Copy the example env files and fill them in:

```bash
cp api/.env.example api/.env
cp react/.env.example react/.env
```

**`api/.env`** (backend secrets — never commit):
- `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com)
- `DEEPGRAM_API_KEY` — from [console.deepgram.com](https://console.deepgram.com) ($200 free credits)
- `SUPABASE_URL` — Supabase Project Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` — same page (⚠️ bypasses RLS, backend only)

**`react/.env`** (browser-safe):
- `VITE_API_URL=http://localhost:3001`
- `VITE_SUPABASE_URL` — same as backend
- `VITE_SUPABASE_ANON_KEY` — Supabase Project Settings → API (⚠️ NOT the service-role key)

### 4. Run

In two terminals:

```bash
pnpm dev:web   # terminal 1 — Vite on localhost:5173
pnpm dev:api   # terminal 2 — Express on localhost:3001
```

Open the browser, sign in with your test user, hit "Start recording".

## Commands

```bash
pnpm dev:web           # frontend only (Vite on 5173)
pnpm dev:api           # backend only (Express on 3001)
pnpm build             # build both
pnpm test:analysis scripts/transcripts/<file>.txt    # transcript → Claude
pnpm test:pipeline <path-to-audio>.{webm,mp3,m4a,wav,ogg,flac}  # audio → Claude
```

The test scripts load `api/.env` automatically via `tsx --env-file`.

## How it works

```
mic → MediaRecorder (webm/opus @ 64kbps)
  → POST /api/sessions/:id/audio
  → Supabase Storage  (private, scoped per user)
  → Deepgram Nova-3   → transcript
  → Claude Sonnet 4.5 → Mermaid + summary + key concepts
  → mermaid.render() in browser → SVG diagram
```

The backend returns immediately after upload; `processSession(id)` runs in the background. The frontend polls `GET /api/sessions/:id` every 2s until status flips to `ready`.

While recording, the browser's `SpeechRecognition` API shows live captions for the speaker's benefit. These are display-only — the canonical transcript still comes from Deepgram after upload, so the two can differ. Captions work in Chromium browsers and Safari; Firefox simply hides the caption box.

You can pause and resume mid-recording to gather your thoughts — paused time doesn't count toward the 30-minute cap.

From a finished diagram you can **refine** it: record a short follow-up ("add a step between X and Y") and Claude updates the existing diagram instead of starting over. A failed refine is non-destructive — the original diagram stays intact.

## API

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/sessions` | ✅ | Create session, returns id + `uploading` |
| `POST` | `/api/sessions/:id/audio` | ✅ | Upload audio (multipart, field `audio`), kicks off pipeline |
| `POST` | `/api/sessions/:id/retry` | ✅ | Re-run pipeline against existing audio (status `failed`) |
| `POST` | `/api/sessions/:id/refine` | ✅ | Refine the diagram with a follow-up recording (status `ready`) |
| `GET` | `/api/sessions/:id` | ✅ | Full session — frontend polls every 2s |
| `GET` | `/api/sessions` | ✅ | List current user's sessions |
| `DELETE` | `/api/sessions/:id` | ✅ | Delete row + audio file |
| `GET` | `/api/share/:token` | ❌ | Public read-only view |

All authenticated routes need `Authorization: Bearer <supabase_jwt>`.

## v1 scope

- Single speaker, no diarization
- Post-session processing (no streaming)
- Web only
- Email/password auth (Google OAuth coming)
- Recordings capped at 30 min

Out of scope for v1: multi-speaker, real-time, diagram editing, team workspaces, integrations, mobile, PNG export.

## License

Private — not yet licensed.
