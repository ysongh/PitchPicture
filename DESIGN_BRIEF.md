# Pitch Picture — UI/UX Design Brief

A self-contained brief for a UI/UX pass. Paste the section below into a fresh
Claude conversation **and attach screenshots** — the brief carries the
constraints, the screenshots carry the visuals. Both are needed.

Suggested screenshots to attach (capture from a logged-in session, light + dark):
Home (signed in), Record, History, Result, Result on mobile width.

---

I'm improving the UI/UX of a small web app. I'll attach screenshots. Please
propose concrete CSS changes — I'll apply them myself.

## The app

"Pitch Picture" — you record yourself narrating an idea, it gets transcribed,
and an AI turns it into a diagram on a shareable page.

## Hard constraints (do not violate)

- Plain CSS only. No Tailwind, no CSS-in-JS, no new dependencies.
- All colors come from CSS custom properties. Light/dark theming is driven by
  a `data-theme="dark"` attribute on `<html>` — dark overrides live under
  `:root[data-theme='dark']`. Do NOT use `@media (prefers-color-scheme)`.
- Must stay responsive down to 320px; there's a breakpoint at 540px.
- Buttons need `min-height: 44px` (touch targets).
- React + React Router with HashRouter. Keep component/markup structure —
  propose CSS changes, not rewrites. If markup must change, call it out
  explicitly and minimally.

## Current design tokens (`:root` in index.css)

```
--text: #6b6375;        --text-h: #08060d;     --bg: #fff;
--border: #e5e4e7;      --code-bg: #f4f3ec;    --accent: #aa3bff;
--accent-bg: rgba(170,59,255,0.1);  --accent-border: rgba(170,59,255,0.5);
```

Base font: 18px system-ui. Headings: system-ui, weight 500.
Cards: 1px border, 12px radius, soft shadow, 1.5rem padding.

## Problems to fix (in priority order)

1. Every page is a lone card pinned near the top of the viewport, leaving a
   huge empty area below on desktop. Center content vertically / fix the dead
   space.
2. No persistent navigation. Each screen is an isolated card with no header.
   Propose a lightweight top bar (logo→Home, History, theme toggle, sign-out)
   so screens feel like one app.
3. The Result page's action bar is 5 flat buttons of near-equal weight
   (Copy share link / Refine / New recording / History / Delete) — they wrap
   messily on mobile. Give them hierarchy: one primary (Copy share link),
   secondaries, and visually separate the destructive Delete.
4. The signed-in Home screen looks unbalanced: mismatched button widths and a
   theme toggle orphaned at the card's left edge.
5. General polish: spacing scale, type hierarchy, contrast.

## What to deliver

- Specific CSS edits (show the before/after rule, or new rules).
- Any token additions/changes, with values.
- Keep it incremental and low-risk — changes should be applicable one at a time.
- Ask before assuming anything unclear.
