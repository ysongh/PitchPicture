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
- **Layout**: two independent packages (`react/`, `api/`), each with its own `node_modules` and lockfile. Root `package.json` orchestrates via `pnpm -C <dir>` and holds deps for the `scripts/` test utilities.

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
└── scripts/              # dev/test utilities (test-analysis.ts, test-pipeline.ts, transcripts/)
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
5. Share view + history + delete, split into three slices:
   - ✅ **5a.** Public `Share` page at `/s/:token` calls `GET /api/share/:token` with `withAuth: false`. Reuses `DiagramView`. Friendly "Not found" for bad tokens or unready sessions.
   - ✅ **5b.** `History` page at `/history` listing the user's sessions.
   - ✅ **5c.** Delete wired into Result and History (`DELETE /api/sessions/:id`).

Build each step end-to-end before the next.

## Commands

```bash
# First-time setup (after a fresh clone):
pnpm install           # root devDeps (tsx, mermaid for test scripts, etc.)
pnpm -C react install  # frontend deps
pnpm -C api install    # backend deps

# Dev (two terminals):
pnpm dev:web           # frontend (Vite on 5173)
pnpm dev:api           # backend (Express on 3001)

pnpm build             # build both
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

## Theme (light / dark / system)

[react/src/lib/theme.tsx](react/src/lib/theme.tsx) provides `ThemeProvider` + `useTheme`. Preference (`'system' | 'light' | 'dark'`) is stored in `localStorage` under `pp-theme`. The provider listens to `matchMedia('(prefers-color-scheme: dark)')` so System mode flips live when the OS toggles dark mode.

Theming is driven by `data-theme="dark"` on `<html>`, **not** `@media (prefers-color-scheme)`. The dark CSS variables live under `:root[data-theme='dark']` in [react/src/index.css](react/src/index.css).

To prevent a flash of wrong theme on cold load, [react/index.html](react/index.html) has an inline `<script>` in `<head>` that reads localStorage and sets `data-theme` **before React mounts**. Don't move this script — it must run synchronously before the stylesheet computes.

**Mermaid theme is dynamic**: [react/src/components/DiagramView.tsx](react/src/components/DiagramView.tsx) reads `useTheme().resolved` and calls `mermaid.initialize({ theme: 'dark' | 'default' })` inside the render effect, with the resolved theme in the deps array so diagrams re-render when the user toggles. Mermaid's `'default'` theme produces dark text on light shapes; `'dark'` produces light text on dark shapes. Without this, dark mode shows light-on-light unreadable diagrams.

## PWA (mobile-web)

Installable as a PWA on iOS Safari and Android Chrome. Files:
- [react/public/manifest.webmanifest](react/public/manifest.webmanifest) — name, theme color, standalone display, references `favicon.svg` for icons
- [react/public/sw.js](react/public/sw.js) — minimal service worker, no caching; exists only so Chrome's install prompt fires
- [react/index.html](react/index.html) — manifest link, apple-touch-icon, theme-color, `viewport-fit=cover` for notch safe areas
- [react/src/main.tsx](react/src/main.tsx) — registers `sw.js` **only in `import.meta.env.PROD`** so dev HMR isn't interfered with
- [react/src/App.css](react/src/App.css) — `min-height: 44px` on buttons, full-width primary action on `max-width: 540px`, `env(safe-area-inset-*)` padding on `.page`, momentum scroll on `.diagram`

Limitations to know:
- Install requires HTTPS — only works against the deployed Netlify URL, not `localhost`.
- Icon is the SVG favicon. For crisp iOS rendering, drop a 180×180 PNG at `react/public/apple-touch-icon.png` and update the `<link>` href.
- iOS still kills MediaRecorder when the app loses focus or the screen locks. No fix in v1; if it bites, the upgrade is a native mobile app.

## Acceptance for v1 ship

Sign in with Google → record up to 30 min → see live status → diagram + summary within ~60s of stop → share link works without auth → history + delete works → Mermaid renders ≥95% of the time.
