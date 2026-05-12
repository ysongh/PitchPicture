# Pitch Picture

Web app: user records themselves narrating an idea → audio is transcribed → Claude picks a diagram type and generates Mermaid → diagram is rendered on a shareable page. Tagline: "Pitch your idea, see the picture."

## v1 scope (locked)

- Single speaker, no diarization
- Post-session processing only (no streaming)
- Web only
- Google OAuth via Supabase
- Recordings capped at 30 min

Out of scope: multi-speaker, real-time, diagram editing, team workspaces, integrations, mobile, PNG export.

## Stack

- **Frontend** (`react/`): React + TS + Vite + Tailwind, React Router with `HashRouter`. Deploys to Netlify.
- **Backend** (`api/`): Node + Express + TS. Deploys to Railway or Fly.
- **Auth + DB + Storage**: Supabase (Google OAuth, Postgres, private `audio-recordings` bucket)
- **STT**: Deepgram Nova-3
- **LLM**: Anthropic `claude-sonnet-4-5`
- **Diagram render**: `mermaid` npm, client-side. Server validates with `mermaid.parse` + JSDOM.
- **Workspaces**: pnpm

## Repo layout

```
PitchPicture/
├── react/                # Vite frontend (existing)
├── api/                  # Express backend
│   └── src/
│       ├── services/     # claude.ts, deepgram.ts, mermaid.ts, supabase.ts
│       ├── routes/       # sessions.ts, share.ts
│       ├── middleware/   # auth.ts (Supabase JWT)
│       ├── lib/types.ts  # API contract — SOURCE OF TRUTH
│       ├── pipeline.ts   # transcribe → analyze orchestration
│       ├── app.ts        # Express setup + CORS
│       └── index.ts      # port listen
├── supabase/migrations/  # schema + RLS
├── scripts/              # dev/test utilities (test-analysis.ts, transcripts/)
└── pnpm-workspace.yaml
```

## Shared types convention

`api/src/lib/types.ts` is the source of truth. `react/src/lib/types.ts` is a verbatim copy. When the API contract changes, edit the api version first then copy. **Do not** create a `packages/shared/` workspace — not worth the overhead at this size.

## API contract

```
POST   /api/sessions                   → { id, status: 'uploading' }
POST   /api/sessions/:id/audio         → multipart upload, triggers async pipeline
GET    /api/sessions/:id               → full session (frontend polls every 2s)
GET    /api/sessions                   → list current user's sessions
GET    /api/share/:share_token         → public, no auth
DELETE /api/sessions/:id               → delete row + audio file
```

All routes except `/api/share/:token` require `Authorization: Bearer <supabase_jwt>`.

## Pipeline

`POST /api/sessions/:id/audio` returns immediately; `processSession(id)` runs in the background:

1. `transcribing` → Deepgram (audio buffer → transcript)
2. `analyzing` → Claude (transcript → `Analysis` JSON, with one Mermaid-validation retry)
3. `ready`

Any throw inside `processSession` marks the session `failed` with the error message. No process crash.

## Diagram types

`flowchart` | `mindmap` | `architecture` | `decision_tree` | `sequence`. Selection heuristics live in the Claude system prompt in [api/src/services/claude.ts](api/src/services/claude.ts).

## Implementation order (strict — gate each step)

1. **Validate Claude on hardcoded transcripts.** `scripts/test-analysis.ts` only. Do not build audio, UI, DB, or Express until first-try Mermaid validity ≥90% and diagram-type picks feel right across 5–10 real transcripts.
2. Add Deepgram, extend script to take audio.
3. Express API + Supabase (DB, storage, JWT).
4. Frontend: auth, recorder, processing page, result page.
5. Share view + history + delete.

Build each step end-to-end before the next.

## Commands

```bash
pnpm dev               # parallel: Vite (5173) + Express (3001)
pnpm dev:web           # frontend only
pnpm dev:api           # backend only
pnpm build             # both
pnpm test:analysis scripts/transcripts/<file>.txt
```

`tsx` does not auto-load `api/.env` when running from repo root — export vars inline or source the file before running scripts.

## Env vars

`api/.env`: `ANTHROPIC_API_KEY`, `DEEPGRAM_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT=3001`, `CORS_ORIGIN=http://localhost:5173`

`react/.env`: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Gotchas

- **CORS**: Express must allow `localhost:5173` or every dev fetch fails as a "Network Error" that's really a preflight rejection.
- **Mermaid server-side validation** (`mermaid.parse` under JSDOM) is finicky on v11. If it breaks at import, fall back to a lightweight syntactic check and trust the client renderer.
- **MediaRecorder**: use `audio/webm;codecs=opus` at 64kbps. Auto-stop at 30 min, warn at 25 min.
- **Background work**: don't `await processSession(id)` in the route handler — return the response first, let it run, catch internally.
- **`react/pnpm-lock.yaml`** is leftover from before workspaces; delete once Step 4 starts and root install owns the lockfile.

## Acceptance for v1 ship

Sign in with Google → record up to 30 min → see live status → diagram + summary within ~60s of stop → share link works without auth → history + delete works → Mermaid renders ≥95% of the time.
