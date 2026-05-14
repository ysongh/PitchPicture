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

- **Frontend** (`react/`): React + TS + Vite, React Router with `HashRouter`. Plain CSS (no Tailwind — spec listed it but it wasn't installed; styles use CSS vars in `react/src/index.css`). Deploys to Netlify.
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
├── scripts/              # dev/test utilities (test-analysis.ts, test-pipeline.ts, transcripts/)
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

## Storage layout

Audio files live in the private `audio-recordings` bucket at `<user_id>/<session_id>.<ext>`. The first path segment is the auth user id — storage RLS policies use `storage.foldername(name)[1] = auth.uid()::text` to scope access per user. Don't change the path shape without updating the policies in [supabase/migrations/20260512_init.sql](supabase/migrations/20260512_init.sql).

## Auth model

Backend uses the Supabase **service-role** key, which bypasses RLS. The route handlers MUST filter every query by `req.user.id` themselves — the RLS policies in the migration are belt-and-braces for direct client access, not the backend's primary defense. `requireAuth` in [api/src/middleware/auth.ts](api/src/middleware/auth.ts) verifies the JWT via `supabase.auth.getUser(token)` and attaches `req.user`.

## Implementation order (strict — gate each step)

1. ✅ **Validate Claude on hardcoded transcripts.** `scripts/test-analysis.ts`. Gate: ≥90% first-try Mermaid validity, diagram-type picks feel right.
2. ✅ **Add Deepgram.** `scripts/test-pipeline.ts` — audio file → transcript → Claude.
3. ✅ **Express API + Supabase.** 6 endpoints, multer audio upload, service-role DB + storage client, JWT middleware. Test with curl against an email/password user created via the Supabase dashboard.
4. ✅ Frontend, split into three slices:
   - ✅ **4a.** Auth shell: `AuthProvider` + `useAuth`, Supabase anon client, fetch wrapper that auto-attaches the JWT, Home page with email/password sign-in.
   - ✅ **4b.** `Recorder` component (MediaRecorder webm/opus @ 64kbps, 25-min warn, 30-min auto-stop) + `Recording` page that uploads to `POST /api/sessions/:id/audio`.
   - ✅ **4c.** `Processing` page polls `GET /api/sessions/:id` every 2s and auto-navigates to `/result/:id` on `ready` (retry button on `failed`). `Result` page renders Mermaid client-side via `DiagramView` and includes a "Copy share link" button.
5. Share view + history + delete.

Build each step end-to-end before the next.

## Commands

```bash
pnpm dev               # parallel: Vite (5173) + Express (3001)
pnpm dev:web           # frontend only
pnpm dev:api           # backend only
pnpm build             # both
pnpm test:analysis scripts/transcripts/<file>.txt
pnpm test:pipeline <path-to-audio>.{webm,mp3,m4a,wav,ogg,flac}
```

`tsx` does not auto-load `api/.env` when running from repo root — export vars inline or `export $(grep -v '^#' api/.env | xargs)` before running scripts.

Root `package.json` must have `"type": "module"` — `mermaid.ts` uses top-level `await import('mermaid')` which fails under CJS.

## Env vars

`api/.env`: `ANTHROPIC_API_KEY`, `DEEPGRAM_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT=3001`, `CORS_ORIGIN=http://localhost:5173`

`react/.env`: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Gotchas

- **CORS**: Express must allow `localhost:5173` or every dev fetch fails as a "Network Error" that's really a preflight rejection.
- **Mermaid server-side validation** (`mermaid.parse` under JSDOM) is finicky on v11. If it breaks at import, fall back to a lightweight syntactic check and trust the client renderer.
- **MediaRecorder**: use `audio/webm;codecs=opus` at 64kbps. Auto-stop at 30 min, warn at 25 min.
- **Background work**: don't `await processSession(id)` in the route handler — return the response first, let it run, catch internally.
- **`react/pnpm-lock.yaml`** is leftover from before workspaces; delete once Step 4 starts and root install owns the lockfile.
- **Service-role key bypasses RLS.** Never put `SUPABASE_SERVICE_ROLE_KEY` in `react/.env` or send it to the browser. Frontend uses the `anon` key.
- **Frontend auth model**: `AuthProvider` in [react/src/lib/auth.tsx](react/src/lib/auth.tsx) wraps `supabase.auth.onAuthStateChange`. The fetch wrapper in [react/src/lib/api.ts](react/src/lib/api.ts) pulls the current session's `access_token` per request — don't cache it; Supabase auto-refreshes on expiry.
- **Mermaid client render**: [react/src/components/DiagramView.tsx](react/src/components/DiagramView.tsx) initializes mermaid once (`securityLevel: 'strict'`) and renders into a ref'd `<div>` via `dangerouslySetInnerHTML`. Unique render IDs come from a module-level counter so React 19 strict-mode double-mounts don't collide. If render throws, the code is shown as a fallback.
- **Multer upload field name is `audio`.** `curl -F "audio=@file.m4a;type=audio/mp4"`. Send the correct MIME type or storage will store the wrong content-type and Deepgram may reject it.

## Acceptance for v1 ship

Sign in with Google → record up to 30 min → see live status → diagram + summary within ~60s of stop → share link works without auth → history + delete works → Mermaid renders ≥95% of the time.
