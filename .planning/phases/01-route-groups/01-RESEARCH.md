# Phase 1: Route Groups - Research

**Researched:** 2026-08-13
**Domain:** Next.js 15 App Router route groups / multiple root layouts / large-scale directory move under Git on Windows
**Confidence:** HIGH on the codebase inventory and the breakage list (all grep-verified against the repo at `86903ca`). MEDIUM on Next.js semantics (official docs cited, but docs are served at v16.3 while this repo runs 15.5.14). LOW on exactly one behavior: global 404 resolution once two root layouts coexist — see Open Question OQ-1.

## Summary

This phase is a directory move, not a feature. `src/app/` currently holds **319 tracked files** across **12 top-level directories and 7 top-level files**, with a **single root layout** at `src/app/layout.tsx`. The move puts **11 of those 12 directories and 4 of those 7 files** into `src/app/(en)/` (243 files), leaves `api/`, `sitemap.ts`, `robots.ts`, and `icon.svg` at the `src/app/` root, and deletes the top-level `layout.tsx` by relocating it. Next.js supports this precisely because route-group folders are invisible in the URL and because "any layout without a `layout.js` above it is a root layout."

The design spec's central safety claim is **wrong and must be corrected before planning**. It says: "every import in the repo uses the `@/` alias ... so no relative import can break." Grep says otherwise. There are **exactly 11 module specifiers across 10 files** that break the instant the parent directory changes: 2 parent-escaping relative imports (`src/app/layout.tsx:1` → `../styles/globals.css`; `src/app/studio/[[...tool]]/page.tsx:11` → `../../../../sanity.config`) and 9 `@/app/...` alias imports inside `src/app/dashboard/` that hard-code the old segment path. All 11 are caught by `npx tsc --noEmit`, so the gate holds — but the planner must schedule them as explicit edits inside the solo commit, or that commit cannot pass its own gate. Two scripts outside `src/app` also encode the path: `scripts/mobile-gate.mjs` (would silently discover **zero** guides and "pass" 0/0) and `scripts/fix-title-suffix.ts`.

There is a mechanical, byte-exact proof of ROUTE-02 sitting in the build output that nobody has noticed: `.next/app-path-routes-manifest.json` maps every app-tree file path to its emitted URL (284 entries today). Capture the **sorted set of its values** before the move and after; if the two sets are identical, every URL in the application is provably unchanged. That is a stronger and cheaper gate than any hand-written smoke list, and the smoke list then only has to prove *rendering* behavior, not URL identity.

**Primary recommendation:** Move exactly 11 directories + 4 files into `(en)`; keep `api/`, `sitemap.ts`, `robots.ts`, `icon.svg` at the `src/app` root (route handlers and metadata routes need no layout, and all four must serve both language trees). Fix the 11 broken specifiers plus the 2 scripts in the same solo commit. Gate on a sorted-value diff of `app-path-routes-manifest.json` (baseline captured **before** the move), then `npx tsc --noEmit` 0, then `npx next build` 0, then a self-calibrating route smoke script. Defer every chrome/analytics/font concern in the `(fa)` layout to Phase 4 — Phase 1's `(fa)` layout is deliberately three lines of JSX plus a stylesheet import.

---

<user_constraints>
## User Constraints

No CONTEXT.md exists — the user chose to skip discuss-phase. The decision record is the **approved design spec** (`2026-08-11-farsi-edition-design.md`, approved 2026-08-13) plus the ROADMAP standing constraints. These are locked; do not re-litigate.

### Locked Decisions

From the approved design spec §1 "Routing and layout":

- **Route groups with two root layouts.** `src/app/(en)/` = everything that exists today, URLs unchanged. `src/app/(fa)/fa/` = the Farsi tree. Each group gets its own root layout, "which is the only way to emit a correct `<html lang dir>` per tree."
- **The `(fa)` root layout emits `<html lang="fa" dir="rtl">`.**
- **REJECTED — do not propose:** `src/app/[locale]/...` restructure ("would push a locale segment onto 151 guide routes, the entire dashboard, auth, and every API route, none of which will ever be localized").
- **REJECTED — do not propose:** a `dir="rtl"` wrapper `<div>` inside a nested `/fa` layout ("`<html lang>` stays `en` on Farsi pages, which is wrong for screen readers and for search engines").
- **REJECTED — do not propose:** middleware setting an `x-pathname` header read via `headers()` ("makes every page dynamic and kills static generation across a content site").
- **`ConditionalChrome.tsx` and its `/cv/` special case stay where they are inside `(en)`; this milestone does not refactor it.**
- **`src/middleware.ts` needs no change** — it matches only `/dashboard/:path*`, so it does not touch `/fa`.
- **The move gets its own commit, done first and alone,** gated on `npx tsc --noEmit` at 0 and `npx next build` at 0, plus a route smoke list covering one guide per category, `/blog`, a blog post, `/visual-guides`, `/cv`, `/share/[token]`, and the dashboard.
- **Fixed plan structure: exactly 2 plans.** 01-01 = the `(en)` move only. 01-02 = the `(fa)` scaffold.

From the ROADMAP standing constraints (non-negotiable, every phase):

- **NEVER run `npm run build` locally.** It chains `prisma migrate deploy`. The build gate is `npx next build`.
- `npx tsc --noEmit` at 0 errors at every gate; the lint gate is ON (`next.config.ts` sets `eslint.ignoreDuringBuilds: false` and `typescript.ignoreBuildErrors: false`).
- **No new dependency without Saeid's explicit approval.**
- **No push, merge, or deploy without an explicit Saeid gate.**
- The 151 visual guides are OUT OF SCOPE for this milestone.
- No test framework exists **by design** — verification is `npx tsx` / `node` check scripts plus browser smoke.
- Content rules: no USA/America/Israel references; byline is always Saeid Sheikhi; no em dashes in English prose.
- Vercel previews sit behind SSO with no bypass secret — Playwright cannot reach them; browser smoke runs in Saeid's authenticated Chrome.

### Claude's Discretion

Not fixed by the spec; the planner may decide, guided by the recommendations in this document:

- Which of the 7 root-level `src/app` files/directories move into `(en)` vs. stay at `src/app/` root. (This document gives a researched, defended answer — see the Move/Stay Inventory.)
- The exact mechanics of the route smoke list (script shape, invocation, assertions).
- Whether the two script path-fixes (`mobile-gate.mjs`, `fix-title-suffix.ts`) ride in the solo commit or a follow-up. (Recommendation: same commit.)
- The content of the placeholder Farsi route (any minimal page satisfies the criteria).
- Whether to add `experimental.globalNotFound` as a contingency (see OQ-1).

### Deferred Ideas (OUT OF SCOPE)

- All Farsi chrome, dictionary, Vazirmatn font, Jalali dates, RTL sweep, language switcher → **Phase 4**.
- hreflang, sitemap Farsi URLs, OG localization → **Phase 5**.
- Sanity `language`/`translationOf` fields, GROQ extraction → **Phase 2**.
- Refactoring `ConditionalChrome`'s `usePathname().startsWith("/cv/")` pattern → explicitly not this milestone.
- Farsi translation of the 151 visual guides; Farsi-native original content; serving readers inside Iran.
</user_constraints>

## Project Constraints (from CLAUDE.md)

**There is no `CLAUDE.md` or `AGENTS.md` in the NeuroNomixer repo.** `[VERIFIED: ls of repo root and .claude/]` `.claude/` contains only `settings.local.json` and `worktrees/`, and `.claude/` is gitignored. `.planning/config.json` points `claude_md_path` at `./.claude/CLAUDE.md`, which does not exist.

There are also **no project skills** — no `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/`. `[VERIFIED: ls]`

The applicable directives therefore come from the user's global `~/.claude/CLAUDE.md`, and from `.planning/codebase/CONVENTIONS.md` + `TESTING.md`:

| Directive | Source | Relevance to Phase 1 |
|---|---|---|
| **Never add `Co-Authored-By:` lines to commits.** No exceptions. | global CLAUDE.md | The solo commit message must not carry one. |
| **Never push to `main`/`dev` before local verification** — typecheck + tests + manual smoke must pass. | global CLAUDE.md | Reinforces the tsc/build/smoke gate. Combined with the ROADMAP's "no push without an explicit Saeid gate." |
| Prefer new commits over `--amend`; never `--no-verify` or force-push without explicit confirmation. | global CLAUDE.md | If the gate fails after committing, add a fix commit — but that breaks "solo commit," so **verify before committing** (see Validation Architecture). |
| **Package manager: `pnpm` for Node.** | global CLAUDE.md | ⚠️ Conflict: the repo carries **both** `package-lock.json` (920 KB, Jul 22) **and** `pnpm-lock.yaml` + `pnpm-workspace.yaml` (both Aug 11). `[VERIFIED: ls]` Phase 1 installs nothing, so this is moot here — but do **not** run a bare `npm install`. All gate commands (`npx tsc`, `npx next build`, `node scripts/...`) are package-manager-agnostic. |
| **Don't add features not asked for; no surrounding cleanup on a fix.** | global CLAUDE.md | Do not "improve" `ConditionalChrome`, do not convert the 9 `@/app/...` imports to relative style, do not touch the `/cv/` branch. Minimum viable edit only. |
| **Don't add comments unless the WHY is non-obvious.** | global CLAUDE.md | Applies to the `(fa)` layout. |
| **Verify before claiming done. Type-check passing ≠ feature working.** | global CLAUDE.md | Explicitly why this phase needs the smoke list *and* the manifest diff, not just tsc. |
| Follow the existing verification pattern rather than introducing a new framework. | `.planning/codebase/TESTING.md` | The route smoke script must be a `scripts/checks/*.mjs` or `*.check.ts` using `node:assert` / plain `fetch` — **not** a new test runner. |
| Any change → `npx tsc --noEmit` clean and `eslint` clean before commit/push. | `.planning/codebase/TESTING.md` | Confirms the gate. |

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **ROUTE-02** | Existing English routes keep their exact URLs and rendering behavior | Route groups are URL-invisible by definition `[CITED: nextjs.org/docs/app/api-reference/file-conventions/route-groups]`, so the move is URL-neutral **by construction**. The research supplies (a) a complete Move/Stay inventory so nothing lands in a place that changes resolution, (b) the exhaustive list of 11 module specifiers + 2 scripts that break on the move, without which the commit cannot build, (c) `.next/app-path-routes-manifest.json` as a mechanical byte-exact URL-equality proof, and (d) a self-calibrating smoke design that captures a *baseline* status/marker set before the move so "rendering behavior unchanged" is a diff rather than a judgement call. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| URL → route resolution (`(en)` invisibility) | Framework routing (build-time file-system router) | — | Route groups are a compile-time folder convention; nothing at runtime reads them. `[CITED: route-groups docs]` |
| `<html lang dir>` emission | Frontend Server (root layout, RSC) | — | Only a root layout can emit `<html>`. This is the entire reason the phase exists. |
| Chrome selection (Navbar/Footer vs. bare) | Browser / Client (`ConditionalChrome`, `usePathname`) | — | Stays exactly as-is inside `(en)`. Locked decision — do not migrate this to the layout tier in Phase 1. |
| Auth gating for `/dashboard/*` | Edge middleware (`src/middleware.ts`) | API / Backend (`dashboard/layout.tsx` onboarded check) | Matcher is `/dashboard/:path*` — a **URL** matcher, and URLs do not change. Untouched by construction. |
| API request handling (`/api/**`) | API / Backend (Route Handlers) | — | Route Handlers return `Response`, never a React tree; they are **not wrapped by any layout**. `[CITED: layout.js docs — "layout.js is the outermost component in a route segment. It wraps template.js, error.js, loading.js, not-found.js, and page.js"; route.js is absent from that list]` This is why `api/` can and should stay at the `src/app` root. |
| `sitemap.xml` / `robots.txt` / `icon.svg` generation | API / Backend (specialized Route Handlers) | CDN / Static (prerendered + cached) | Docs call these "special Route Handlers." `[CITED: sitemap docs, app-icons docs]` They serve the whole origin, not one language tree, and Phase 5 extends the same `sitemap.ts` with `/fa` URLs. |
| Static generation / ISR of guide + blog pages | CDN / Static (prerender at build) | Frontend Server (ISR revalidate 3600) | Unaffected: the phase introduces no `headers()`, `cookies()`, or `dynamic` export. Confirmed by the design spec §"Rendering modes are already correct for this." |
| Global 404 for unmatched URLs | Framework routing | Frontend Server (`not-found.tsx` composed inside a root layout) | **The one capability whose owning tier genuinely changes** when a second root layout appears. See Pitfall 6 and OQ-1. |

## Standard Stack

Phase 1 adds **zero** libraries. Everything below is already installed and pinned by `package.json`. `[VERIFIED: package.json read]`

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | `^15.5.14` | App Router; route groups; multiple root layouts | Already the framework. Route groups are the framework's own documented mechanism for multiple root layouts, listed as a first-class use case. `[CITED: route-groups docs — "Use cases: ... Defining multiple root layouts"]` |
| `react` / `react-dom` | `19.1.0` | RSC layouts | Unchanged. |
| `typescript` | `^5` | `npx tsc --noEmit` — the primary correctness gate and the mechanism that catches all 11 broken specifiers | `.planning/codebase/TESTING.md` names it "the fastest, cheapest correctness gate." |
| `eslint` + `eslint-config-next` | `^9` / `15.5.4` | Lint gate, enforced during `next build` | `next.config.ts` sets `eslint.ignoreDuringBuilds: false`. `[VERIFIED: next.config.ts read]` |

### Supporting (already present, used by the verification tooling)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `puppeteer-core` | `^24.40.0` | Drives system Chrome for `scripts/mobile-gate.mjs` | Only if the smoke list needs rendered-DOM assertions. **Not needed** — plain `fetch` + HTML string matching is sufficient and far faster for the Phase 1 assertions (`lang=`, `dir=`, chrome markers, status codes). |
| Node global `fetch` | Node 20+ builtin | The route smoke script | Zero-dependency. Matches `.mjs` script convention (`migrate-post-status.mjs`, `mobile-gate.mjs`). |
| `tsx` | `^4.21.0` | Runner for `.ts` check scripts | Use if the smoke script is written as `.ts`; `.mjs` + `node` is simpler and matches `mobile-gate.mjs`. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manifest-value diff for URL equality | Manually enumerating routes in the smoke list | The manual list cannot prove *absence* of change — it only checks what someone remembered to write down. 284 manifest entries vs. ~8 hand-listed routes. Use the manifest as the proof and the smoke list as the rendering check. |
| `git mv` per directory | Filesystem move + `git add -A` | `git mv` updates the index atomically and keeps the working tree and index in lockstep. Filesystem move + `add -A` produces the same final tree but risks a half-staged state mid-operation. Both yield identical rename detection (exact blob hashes). Prefer `git mv`. |
| Keeping `api/` at root | Moving `api/` into `(en)` | Moving it works (URLs are identical either way) but inflates the diff by **73 files**, semantically mislabels a language-neutral API as English, and would force the `(fa)` tree to reach across a sibling group. Keep it at root. |
| `not-found.tsx` inside `(en)` | `app/global-not-found.tsx` + `experimental.globalNotFound` | The experimental flag is a `next.config.ts` change and a full duplicate HTML document. Not needed unless OQ-1 resolves badly. Hold in reserve. |

**Installation:** none. No `npm install` / `pnpm add` runs in this phase.

## Package Legitimacy Audit

**Not applicable — this phase installs zero external packages.**

The ROADMAP standing constraint is explicit: "No new dependency without Saeid's explicit approval (the design avoids needing any)." Every tool used (`next`, `typescript`, `eslint`, `tsx`, `puppeteer-core`, Node builtins) is already in `package.json` at a pinned version. `[VERIFIED: package.json read]`

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.

> Planner note: if any plan task proposes `npm install` / `pnpm add` for anything, that task is out of scope and must be rejected or escalated to Saeid.

## Architecture Patterns

### System Architecture Diagram

```
                    HTTP request  ──►  https://www.neuronomixer.com/<path>
                                                │
                                                ▼
                                  ┌──────────────────────────┐
                                  │  src/middleware.ts       │
                                  │  matcher: /dashboard/:*  │ ── no match ──┐
                                  │  (auth redirects)        │               │
                                  └──────────┬───────────────┘               │
                                             │ match: role/suspended gate    │
                                             ▼                               │
                                    redirect /auth/sign-in ◄─ fail           │
                                             │ pass                          │
                                             └───────────────┬───────────────┘
                                                             ▼
                                        ┌────────────────────────────────────┐
                                        │  App Router file-system resolver   │
                                        │  route-group folders are STRIPPED  │
                                        │  from the URL before matching      │
                                        └──┬──────────────┬──────────────┬───┘
                     ┌─────────────────────┘              │              └──────────────────┐
                     ▼                                    ▼                                 ▼
      ┌──────────────────────────┐     ┌────────────────────────────┐    ┌──────────────────────────────┐
      │ NO LAYOUT NEEDED         │     │ ROOT LAYOUT  (en)          │    │ ROOT LAYOUT  (fa)            │
      │ src/app/ root            │     │ src/app/(en)/layout.tsx    │    │ src/app/(fa)/layout.tsx      │
      │  • api/**/route.ts       │     │  <html lang="en">          │    │  <html lang="fa" dir="rtl">  │
      │  • sitemap.ts → /sitemap │     │  Inter --font-sans         │    │  (Phase 4 adds Vazirmatn,    │
      │  • robots.ts  → /robots  │     │  GA scripts                │    │   dictionary, RTL chrome)    │
      │  • icon.svg   → /icon.svg│     │  NextAuthProvider          │    │                              │
      │  (Route Handlers are not │     │   └ ConditionalChrome      │    │  {children}                  │
      │   wrapped by any layout) │     │      ├ /cv/* → bare        │    │                              │
      └──────────────────────────┘     │      └ else  → Nav+Footer  │    └──────────────┬───────────────┘
                     │                 │  SpeedInsights, prompts    │                   │
                     │                 └──────────────┬─────────────┘                   ▼
                     │                                │                        src/app/(fa)/fa/page.tsx
                     ▼                                ▼                          → URL: /fa
        /api/**  /sitemap.xml           /  /blog/**  /visual-guides/**
        /robots.txt  /icon.svg          /cv/[slug]  /share/[token]
        (serve BOTH trees)              /dashboard/**  /studio  /auth/**
                                        (URLs byte-identical to today)

   ⚠ Crossing between the two root layouts (e.g. /blog → /fa) triggers a FULL PAGE LOAD,
     not a client-side navigation.  [CITED: route-groups docs, Caveats]
```

The critical property the diagram encodes: **the resolver strips `(en)` and `(fa)` before matching**, so the middle and right branches emit URLs that are indistinguishable from a tree with no groups at all. That is the whole basis of ROUTE-02.

### The Move/Stay Inventory (the load-bearing table of this phase)

`src/app/` holds 319 tracked files. `[VERIFIED: git ls-files src/app | wc -l]`

| Entry | Files | Disposition | Reason |
|---|---:|---|---|
| `api/` | 73 | **STAY** at `src/app/api/` | Route Handlers are not wrapped by layouts `[CITED: layout.js docs]`, so they need no root layout. The API is language-neutral: `/fa` pages will call the same endpoints in Phase 4. Moving costs 73 files of diff for zero benefit. `vercel.json` cron path `/api/cron/publish-scheduled` is a URL and stays valid either way. |
| `sitemap.ts` | 1 | **STAY** | "For smaller applications, you can create a `sitemap.xml` file and place it in the root of your `app` directory." `[CITED: sitemap docs]` It is a special Route Handler → no layout needed. It must cover **both** trees: Phase 5 extends this same file with `/fa` URLs. Duplicating it per group would create two routes resolving to `/sitemap.xml` → the documented **Conflicting paths** error. |
| `robots.ts` | 1 | **STAY** | Same reasoning. Emits `/robots.txt` for the whole origin. Design spec §5: "No `robots.ts` change." |
| `icon.svg` | 1 | **STAY** | `icon` is valid at `app/**/*` `[CITED: app-icons docs]`, so it *could* live in `(en)` — but then `(fa)` pages get no favicon, and adding a second copy in `(fa)` would produce two routes resolving to `/icon.svg` → **Conflicting paths** error. Verified today it emits the URL `/icon.svg`. `[VERIFIED: .next/app-path-routes-manifest.json — "/icon.svg/route" → "/icon.svg"]` One copy at root, inherited by both groups. |
| `layout.tsx` | 1 | **MOVE** → `(en)/layout.tsx` | Must not remain: "You can create multiple root layouts ... Any layout without a `layout.js` above it is a root layout." `[CITED: layout.js docs]` A surviving `src/app/layout.tsx` would sit above both groups and make neither of them a root layout — the `(fa)` `<html>` would nest inside the `(en)` `<html>`. **⚠ Requires a content edit — see Pitfall 1.** |
| `page.tsx` | 1 | **MOVE** → `(en)/page.tsx` | "If you use multiple root layouts without a top-level `layout.js` file, make sure your home route (`/`) is defined within one of the route groups." `[CITED: route-groups docs, Caveats]` It must live in `(en)`. |
| `error.tsx` | 1 | **MOVE** → `(en)/error.tsx` | It is a client error boundary that renders *inside* `<body>`; with no root layout at `src/app/` it has no `<html>` to render into. |
| `not-found.tsx` | 1 | **MOVE** → `(en)/not-found.tsx` | Same. **⚠ Behavioral risk — see Pitfall 6 / OQ-1.** |
| `auth/` | 10 | **MOVE** | Renders pages → needs a root layout. |
| `authors/` | 2 | **MOVE** | " |
| `blog/` | 4 | **MOVE** | " |
| `contact/` | 2 | **MOVE** | " |
| `cv/` | 2 | **MOVE** | " (the `/cv/` bare-chrome special case travels with it, untouched) |
| `dashboard/` | 62 | **MOVE** | " **⚠ 9 of these files carry `@/app/...` imports — see Pitfall 2.** |
| `privacy/` | 1 | **MOVE** | " |
| `review/` | 1 | **MOVE** | " |
| `share/` | 1 | **MOVE** | " |
| `studio/` | 1 | **MOVE** | " **⚠ Requires a content edit — see Pitfall 1.** |
| `visual-guides/` | 153 | **MOVE** | " (151 guide route folders + index page). **⚠ `scripts/mobile-gate.mjs` reads this path — see Pitfall 3.** |

**Totals:** 11 directories + 4 files **move** (243 files). 1 directory + 3 files **stay** (76 files). `[VERIFIED: git ls-files src/app | awk -F/ '{print $3}' | sort | uniq -c]`

> **This directly corrects the design spec**, which says the move "touches the parent path of 797 guide files." Those 797 `.tsx` files live in `src/components/VisualGuides/` and **do not move**. The moved set is 243 files, of which only 153 are guide-related, and only 151 of those are guide route folders.

### Pattern 1: Two root layouts via route groups

**What:** Delete the shared top-level layout by relocating it; each group's `layout.tsx` becomes a root layout emitting its own `<html>`/`<body>`.
**When to use:** Exactly when two subtrees need different document-level attributes (`lang`, `dir`) — which is this phase's entire justification.

```
src/app/
├── api/                      ← STAYS (route handlers: no layout)
├── sitemap.ts                ← STAYS (special route handler)
├── robots.ts                 ← STAYS
├── icon.svg                  ← STAYS (inherited by both groups)
├── (en)/
│   ├── layout.tsx            ← ROOT LAYOUT #1  <html lang="en">
│   ├── page.tsx              ← the home route "/" MUST live in a group
│   ├── error.tsx
│   ├── not-found.tsx
│   ├── auth/  authors/  blog/  contact/  cv/  dashboard/
│   ├── privacy/  review/  share/  studio/  visual-guides/
└── (fa)/
    ├── layout.tsx            ← ROOT LAYOUT #2  <html lang="fa" dir="rtl">
    └── fa/
        └── page.tsx          ← URL: /fa   (the "fa" segment is a REAL segment)
```

Note the shape of `(fa)`: the group `(fa)` is invisible, and the **literal directory `fa/` inside it** is what produces the `/fa` URL. Writing `src/app/(fa)/page.tsx` would resolve to `/` and collide with `(en)/page.tsx` — the documented **Conflicting paths** error. The design spec's `src/app/(fa)/fa/` notation is correct and must be followed exactly.

### Pattern 2: Minimal Phase-1 `(fa)` root layout

**What:** The smallest layout that satisfies success criterion 3 and defers everything else to Phase 4.
**When to use:** Plan 01-02 only.

```tsx
// src/app/(fa)/layout.tsx
import "@/styles/globals.css";

export const metadata = {
  metadataBase: new URL("https://www.neuronomixer.com"),
  title: "NeuroNomixer",
};

export default function FaRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="bg-[var(--background)] text-[var(--color-text)]">{children}</body>
    </html>
  );
}
```

Deliberately absent, all owned by Phase 4: Vazirmatn font, GA scripts, `NextAuthProvider`, `SpeedInsights`, `GeneralSignupPrompt`, `FlushPendingCompletions`, Farsi Navbar/Footer, the `--font-sans` variable. Deliberately **present**: the `globals.css` import (without it Farsi pages render completely unstyled — Tailwind is loaded per root layout, not globally) and `metadataBase` (without it, relative OG image URLs on `/fa` resolve against `localhost` at build time).

### Anti-Patterns to Avoid

- **Leaving `src/app/layout.tsx` in place "as a shared wrapper."** It defeats the whole phase: with a layout above them, neither group's layout is a root layout, and you get nested `<html>` elements. The spec's rejected alternative #2 is exactly this failure.
- **Putting the Farsi placeholder at `src/app/(fa)/page.tsx`.** Resolves to `/`, collides with `(en)/page.tsx`. Build error.
- **Duplicating `sitemap.ts`, `robots.ts`, or `icon.svg` into both groups.** Two routes resolving to the same URL → Conflicting paths error.
- **Extending `ConditionalChrome`'s `startsWith` branch list to handle `/fa`.** Explicitly rejected by the design spec and by `.planning/codebase/CONCERNS.md:183` ("prefer a route group with its own `layout.tsx` (server component) over extending the `startsWith` branch list").
- **Rewriting the 9 `@/app/...` imports into relative form "while we're in there."** Global CLAUDE.md: no surrounding cleanup on a fix. Mechanical prefix insertion only.
- **Committing the rename and the import fixes as two commits.** The rename-only commit does not typecheck or build, so the "solo commit gated on tsc 0 + build 0" success criterion would be false for it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Proving every URL is unchanged | A hand-maintained list of expected URLs | Sorted-value diff of `.next/app-path-routes-manifest.json` (284 entries) | A hand list can only check what someone remembered; the manifest is generated from the actual resolved route tree and covers 100% of routes including all 151 guides and 73 API endpoints. |
| Detecting broken imports after the move | Manual grep review of 243 files | `npx tsc --noEmit` | Already the project's primary gate; catches all 11 specifiers deterministically. The grep is for *planning* the edits, not for *verifying* them. |
| Locale-conditional `<html lang dir>` | A client component that sets `document.documentElement.dir` | Two root layouts (this phase) | Client-side mutation flashes LTR before hydration, and search-engine crawlers and screen readers read the served HTML. Explicitly rejected in the design spec. |
| Rename detection in the diff | A custom move-manifest file | Git's built-in exact-blob rename detection | Files moved with identical content hash to the same blob, so renames are detected before the similarity heuristic runs and are not subject to `diff.renameLimit`. Nothing to configure. |
| Route smoke assertions | A new test runner (vitest/playwright) | A `scripts/checks/*.mjs` using Node's global `fetch` + `node:assert` | `.planning/codebase/TESTING.md`: "Follow the existing pattern rather than introducing a new framework." Also: no new dependencies allowed. |

**Key insight:** every verification this phase needs already exists as an artifact the build produces or a gate the repo already runs. The work is *reading* them correctly, not building new machinery.

## Runtime State Inventory

This is a refactor/move phase, so the inventory is mandatory. The reassuring headline: because route groups are URL-invisible, **no URL, slug, or externally-visible identifier changes**, so there is nothing to migrate in any datastore or external service.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | **None.** Postgres `VisualGuide.slug` stores URL slugs (`rag-explained`), not filesystem paths — confirmed by `src/app/sitemap.ts:58` building `${baseUrl}/visual-guides/${g.slug}`. Sanity stores post/category/author slugs, likewise URL-shaped. No table, column, or Sanity field anywhere holds an `src/app/...` path. `[VERIFIED: grep for 'src/app' across src/lib, src/sanity, prisma, scripts]` | **None.** No data migration. |
| **Live service config** | **Vercel project** — build command is `npm run build` (which chains `prisma migrate deploy`); this is correct **in Vercel** and must not be changed. `vercel.json` cron `path: "/api/cron/publish-scheduled"` — a URL, unchanged (and `api/` isn't even moving). **Google Search Console / sitemap submission** — URLs unchanged. **Sanity Studio** at `/studio` — URL unchanged. `[VERIFIED: vercel.json, package.json read]` | **None.** Confirm no Vercel setting is touched. |
| **OS-registered state** | **None.** No Windows Task Scheduler entries, no pm2 processes, no systemd units, no launchd plists reference this repo's app paths. Scheduling is Vercel Cron (see above). `[VERIFIED: no such registration exists — scheduling is entirely in vercel.json]` | **None.** |
| **Secrets / env vars** | **None affected.** `.env` holds only `DATABASE_URL` / `DIRECT_URL` (currently pointing at the **dev** DB, with prod values commented out). `.env.local` holds 28 keys — auth, SMTP, Sanity, Blob, reCAPTCHA, GA, site URL — **none** references a filesystem path under `src/app`. `[VERIFIED: sed-redacted key listing of .env and .env.local]` | **None.** Do not edit either file. |
| **Build artifacts / installed packages** | **Two stale-cache hazards.** (1) `tsconfig.tsbuildinfo` (931 KB, Jul 22) — `tsconfig.json` sets `"incremental": true`, so a mass rename can leave `tsc --noEmit` reasoning from a stale program graph and reporting a **false clean**. (2) `.next/` (Jul 22) — carries the pre-move route manifests; must be preserved as the *baseline* and then rebuilt. `[VERIFIED: ls -la repo root; tsconfig.json read]` | **Yes.** Capture the baseline manifest, then **delete `tsconfig.tsbuildinfo` and `.next/` before the post-move gate run** so both gates run cold. Both are gitignored (`*.tsbuildinfo`, `/.next/`), so deleting them is free and invisible to the commit. |

**The canonical question — after every file in the repo is updated, what runtime systems still have the old value cached, stored, or registered?** Answer: only the two local build caches above. Nothing outside the developer's working copy holds any state derived from `src/app` paths, because route groups change no URL and no slug.

## Common Pitfalls

### Pitfall 1: The design spec's "no relative import can break" claim is false — 2 parent-escaping imports

**What goes wrong:** The approved spec states the move "is safe in principle because every import in the repo uses the `@/` alias (`tsconfig.json` paths is exactly `{"@/*": ["./src/*"]}`), so no relative import can break." Grep across all `.ts`/`.tsx` in `src/app` for `"../` finds **exactly two** counter-examples, and both break:

```
src/app/layout.tsx:1                    import "../styles/globals.css";
src/app/studio/[[...tool]]/page.tsx:11  import config from "../../../../sanity.config";
```
`[VERIFIED: grep -rn --include=*.ts --include=*.tsx -E '["'"'"']\.\./' src/app/ — returned exactly these 2 lines]`

**Why it happens:** Inserting `(en)/` adds one directory level, so every `../` count is off by one. From `src/app/(en)/layout.tsx`, `../styles/globals.css` now resolves to `src/app/styles/globals.css` (nonexistent). From `src/app/(en)/studio/[[...tool]]/page.tsx`, four `../` reaches `src/app/` instead of the repo root, so `sanity.config` is not found. The first is a bare side-effect import (`import "..."` with no `from`), which is why a naive `from "\.\./"` grep misses it — that is likely how it escaped the design review.

**How to avoid:**
- `layout.tsx` → `import "@/styles/globals.css";` (alias form; immune to any future group move). Tailwind v4 content detection is rooted at the CSS file, not the importer, so this changes nothing about scanning. `[VERIFIED: globals.css contains only `@import "tailwindcss"`, `@import "./variables.css"`, `@plugin "@tailwindcss/typography"` — no `@source`/`@config` directives to update]`
- `studio/[[...tool]]/page.tsx` → `import config from "../../../../../sanity.config";` (five levels). The `@/` alias cannot express this — it maps to `./src/*` and `sanity.config.ts` sits at the repo root, outside `src/`. `[VERIFIED: tsconfig paths read; sanity.config.ts confirmed at repo root]`

**Warning signs:** `npx tsc --noEmit` reports `TS2307: Cannot find module`. If tsc reports **zero** errors immediately after a raw rename with no edits, suspect a stale `tsconfig.tsbuildinfo` (Runtime State Inventory, build artifacts).

### Pitfall 2: Nine `@/app/...` alias imports hard-code the old segment path

**What goes wrong:** `@/*` maps to `./src/*`, so `@/app/dashboard/author/...` is a **path**, not a logical name. After the move the real path is `src/app/(en)/dashboard/author/...` and all nine fail to resolve.

```
src/app/dashboard/admin/api-key/page.tsx:3               export { default } from "@/app/dashboard/author/api-key/page";
src/app/dashboard/admin/cv/designer/page.tsx:4           import CVDesignerClient from "@/app/dashboard/author/cv/designer/CVDesignerClient";
src/app/dashboard/admin/cv/page.tsx:4                    import CVBuilderClient from "@/app/dashboard/author/cv/CVBuilderClient";
src/app/dashboard/admin/my-posts/page.tsx:6              import { PostActionButtons } from "@/app/dashboard/author/posts/PostActionButtons";
src/app/dashboard/admin/my-posts/[id]/edit/page.tsx:5    import EditPostFormLoader from "@/app/dashboard/author/posts/[id]/edit/EditPostFormLoader";
src/app/dashboard/admin/submit/page.tsx:2                import SubmitPostForm from "@/app/dashboard/author/submit/SubmitPostForm";
src/app/dashboard/admin/suggest-category/page.tsx:1      export { default } from "@/app/dashboard/author/suggest-category/page";
src/app/dashboard/author/posts/[id]/edit/EditPostFormLoader.tsx:5   import type SubmitPostFormType from "@/app/dashboard/author/submit/SubmitPostForm";
src/app/dashboard/author/posts/[id]/edit/EditPostFormLoader.tsx:11  () => import("@/app/dashboard/author/submit/SubmitPostForm"),
```
`[VERIFIED: grep -rn '@/app/' src/ scripts/ prisma/ — returned exactly these 9 lines across 8 files]`

**Why it happens:** Two admin routes literally `export { default } from` an author page, and several others share heavy client components across the admin/author split — a legitimate pattern that happens to encode the segment path.

**How to avoid:** Mechanical prefix insertion, `@/app/` → `@/app/(en)/`, in all 9 specifiers. Note line 11 of `EditPostFormLoader.tsx` is a **dynamic** `import()` inside `next/dynamic` — it must be updated too, and unlike a static import a stale one may survive tsc and fail only at runtime when the edit page loads. Verify parentheses in a module specifier resolve correctly under both `tsc` and Turbopack (they are legal path characters, but this repo has never had one before — confirm in the build, do not assume).

**Warning signs:** tsc `TS2307` on 8 files; or tsc clean but the author/admin post-edit page throws a chunk-load error in the browser.

### Pitfall 3: `scripts/mobile-gate.mjs` fails *silently* — it will report success on zero guides

**What goes wrong:** Line 16 reads the guide list off the filesystem:

```js
const dir = path.join(process.cwd(), "src", "app", "visual-guides");
return readdirSync(dir, ...)...
```
`[VERIFIED: scripts/mobile-gate.mjs read]`

After the move that directory does not exist. `readdirSync` throws `ENOENT` — but if it is ever guarded, or if someone points it at a stale path that exists but is empty, the script prints `0/0 passed` and **exits 0**. A green mobile gate that tested nothing is worse than a red one.

**Why it happens:** The script discovers work from the filesystem rather than from the route manifest or the DB catalog.

**How to avoid:** Update line 16 to `path.join(process.cwd(), "src", "app", "(en)", "visual-guides")` **in the same commit as the move**. Additionally recommend a two-line guard so it can never silently pass: `if (targets.length === 0) { console.error("no guides discovered"); process.exit(1); }`. That guard is a genuine defect fix, not scope creep — but if the planner wants strict solo-commit purity, the path fix is mandatory and the guard can be a follow-up.

**Warning signs:** `node scripts/mobile-gate.mjs --list-only` prints nothing, or the run summary reads `0/0 passed`.

### Pitfall 4: `scripts/fix-title-suffix.ts` will double-suffix the home page on its next run

**What goes wrong:**

```ts
const files = collectPageFiles("src/app");                                    // line 24 — still works (recursive)
if (file.replace(/\\/g, "/") === "src/app/page.tsx") continue;               // line 29 — no longer matches
```
`[VERIFIED: scripts/fix-title-suffix.ts read]`

The recursive walk still finds every page (it just descends one more level), but the guard that deliberately skips the home page — because its title is handled manually and absolutely — silently stops matching. Nothing breaks now; it breaks the next time anyone runs this one-off script.

**How to avoid:** Update line 29's comparison to `"src/app/(en)/page.tsx"`. One-character-class change, zero risk, prevents a future silent content bug.

**Warning signs:** None until the script is run. This is exactly the "grep finds files, not runtime behavior" class of miss — include it.

### Pitfall 5: Stale incremental caches produce a false-clean gate

**What goes wrong:** `tsconfig.json` sets `"incremental": true` and a 931 KB `tsconfig.tsbuildinfo` from Jul 22 sits in the repo root. After renaming 243 files, an incremental `tsc --noEmit` can reason from the stale program graph and report 0 errors that a cold run would not. `.next/` from the same date compounds it. `[VERIFIED: tsconfig.json read; ls -la shows tsconfig.tsbuildinfo 931425 bytes, .next/ dated Jul 22]`

**How to avoid:** Capture the baseline manifest from the existing `.next/` **first**, then delete both `tsconfig.tsbuildinfo` and `.next/` before running the post-move gate. Both are gitignored, so this is invisible to the commit. Run tsc cold.

**Warning signs:** tsc reports 0 errors on a tree where grep says 11 specifiers are broken. If that happens, the cache lied.

### Pitfall 6: The global 404 loses its home when a second root layout appears

**What goes wrong:** Today, `src/app/not-found.tsx` renders the branded 404 (accent "404" eyebrow, "Page not found", two CTA buttons) with full chrome, for any unmatched URL. `[VERIFIED: src/app/not-found.tsx read]` The Next.js docs are explicit that this composition stops being well-defined with multiple root layouts:

> "`global-not-found.js` is useful when you can't build a 404 page using a combination of `layout.js` and `not-found.js`. This can happen in two cases: **Your app has multiple root layouts** (e.g. `app/(admin)/layout.tsx` and `app/(shop)/layout.tsx`), so there's no single layout to compose a global 404 from."
> `[CITED: nextjs.org/docs/app/api-reference/file-conventions/not-found]`

**Why it happens:** An unmatched URL belongs to no group, so the router has no basis for choosing `(en)`'s `<html lang="en">` over `(fa)`'s `<html lang="fa" dir="rtl">`.

**Crucially, the risk lands in plan 01-02, not 01-01.** After the `(en)` move alone there is still exactly **one** root layout, so `(en)/not-found.tsx` remains unambiguous. It becomes ambiguous the moment `(fa)/layout.tsx` exists. The planner must therefore put the 404 assertion in **both** plans' verification — passing in 01-01 proves nothing about 01-02.

**How to avoid:**
1. Make "request an unmatched URL, assert the branded 404 body renders and the status is 404" an explicit smoke assertion in **both** plans.
2. If 01-02 regresses it, the documented fix is `experimental: { globalNotFound: true }` in `next.config.ts` plus `src/app/global-not-found.tsx` returning a complete HTML document. This was introduced in **v15.4.0** and this repo runs **15.5.14**, so it is available. `[CITED: not-found docs Version History — "v15.4.0 global-not-found.js introduced (experimental)"]` `[VERIFIED: package.json next ^15.5.14]` It is a config flag, not a dependency, so it does not violate the no-new-deps constraint — but it *is* an experimental flag and should be flagged to Saeid before landing.
3. Do **not** pre-emptively add `global-not-found.tsx`. It bypasses the layout entirely and needs its own copies of styles and fonts; adopting it unprovoked would itself change 404 rendering.

**Warning signs:** an unmatched URL returns Next's default unstyled "404 | This page could not be found" instead of the branded page; or the 404 renders with `dir="rtl"`.

### Pitfall 7: Cross-tree navigation becomes a full page load

**What goes wrong:** "If you navigate between routes that use different root layouts, it'll trigger a full page reload." `[CITED: route-groups docs, Caveats]`

**Why it matters here:** Not a Phase 1 problem — `(fa)` has one placeholder route and nothing links to it. It becomes real in **Phase 4** when the language switcher lands in both navbars: that switcher must be a plain `<a>` or accept that `next/link` degrades to a hard navigation across the boundary. Record it now so Phase 4 does not rediscover it as a bug. Within `(en)`, all navigation stays client-side exactly as today.

### Pitfall 8: Windows shell quoting around `(en)`

**What goes wrong:** Parentheses are legal in NTFS paths, but they are **grouping operators** in both PowerShell and POSIX shells. `git mv src/app/blog src/app/(en)/blog` is a syntax error in bash and a subexpression in PowerShell.

**How to avoid:** Always quote: `git mv src/app/blog "src/app/(en)/blog"`. Create the directory first with a quoted `mkdir "src/app/(en)"`.

**Path length is a non-issue here** — measured, not assumed. The repo root absolute path is 78 characters; the longest tracked path under `src/app` is 79 characters (`src/app/api/dashboard/admin/visual-guides/category/[slug]/bulk-publish/route.ts`, which is not even moving). Worst case after adding `(en)/` is ≈163 characters, well under the 260 `MAX_PATH` limit — and `core.longpaths` is already `true` in this repo's git config anyway. `[VERIFIED: git ls-files | awk length | sort -rn; git config --get core.longpaths → true; git --version → 2.51.0.windows.1]`

**Rename detection needs no configuration.** 233 of the 243 moved files have byte-identical content, so git matches them by exact blob hash *before* the similarity heuristic runs, which means `diff.renameLimit` never applies. The 10 files with content edits are small single-line changes and will match on similarity comfortably. Confirm with `git status` showing `renamed:` and `git diff --cached -M --summary`.

## Code Examples

### The move, as a shell sequence (Git Bash; quote every `(en)` path)

```bash
# 0. BASELINE FIRST — the post-move proof depends on this artifact existing.
#    (The .next/ in the tree is from Jul 22 and HEAD has only doc commits since,
#     so it is a usable baseline; a fresh `npx next build` is safer.)
node -e "console.log(Object.values(require('./.next/app-path-routes-manifest.json')).sort().join('\n'))" \
  > /tmp/routes-before.txt
wc -l /tmp/routes-before.txt      # expect 284

# 1. Create the group and move. api/, sitemap.ts, robots.ts, icon.svg stay put.
mkdir "src/app/(en)"
for d in auth authors blog contact cv dashboard privacy review share studio visual-guides; do
  git mv "src/app/$d" "src/app/(en)/$d"
done
for f in layout.tsx page.tsx error.tsx not-found.tsx; do
  git mv "src/app/$f" "src/app/(en)/$f"
done

# 2. Confirm what remains at the root: api/ icon.svg robots.ts sitemap.ts (en)/
ls src/app/
```

### The 11 specifier edits (exhaustive — this is the complete list)

```diff
--- src/app/(en)/layout.tsx  (line 1)
-import "../styles/globals.css";
+import "@/styles/globals.css";

--- src/app/(en)/studio/[[...tool]]/page.tsx  (line 11)
-import config from "../../../../sanity.config";
+import config from "../../../../../sanity.config";

--- 9 specifiers across 8 files under src/app/(en)/dashboard/
-  "@/app/dashboard/...
+  "@/app/(en)/dashboard/...
```

### The 2 script edits (outside `src/app`, same commit)

```diff
--- scripts/mobile-gate.mjs  (line 16)
-  const dir = path.join(process.cwd(), "src", "app", "visual-guides");
+  const dir = path.join(process.cwd(), "src", "app", "(en)", "visual-guides");

--- scripts/fix-title-suffix.ts  (line 29)
-  if (file.replace(/\\/g, "/") === "src/app/page.tsx") continue;
+  if (file.replace(/\\/g, "/") === "src/app/(en)/page.tsx") continue;
```

### The URL-equality proof (the ROUTE-02 gate)

```bash
rm -rf .next tsconfig.tsbuildinfo      # both gitignored; forces a cold gate
npx tsc --noEmit                       # must print nothing / exit 0
npx next build                         # NEVER `npm run build`

node -e "console.log(Object.values(require('./.next/app-path-routes-manifest.json')).sort().join('\n'))" \
  > /tmp/routes-after.txt

diff /tmp/routes-before.txt /tmp/routes-after.txt && echo "ROUTE-02 PROVEN: 0 URL changes"
```

An empty diff is byte-exact proof that all 284 emitted URLs are unchanged. The *keys* of the manifest change (`/blog/page` → `/(en)/blog/page`); only the values matter.

### Self-calibrating route smoke (recommended shape — `scripts/checks/route-smoke.mjs`)

```js
// Route smoke for the (en) route-group move. Requires a dev server:
//   npx next dev --turbopack        (or: npm run dev — safe, no prisma chain)
// Usage: node scripts/checks/route-smoke.mjs --record   > .route-smoke.baseline.json
//        node scripts/checks/route-smoke.mjs --verify   < .route-smoke.baseline.json
// No new dependencies: Node 20+ global fetch, node:assert.
const BASE = process.env.GATE_BASE_URL ?? "http://localhost:3000";

const ROUTES = [
  "/", "/blog", "/visual-guides", "/contact", "/privacy", "/authors",
  "/blog/<real-category>", "/blog/<real-category>/<real-post>",
  "/visual-guides/rag-explained",          // + one guide per category
  "/cv/<real-slug>",                        // bare chrome: Navbar MUST be absent
  "/share/<any-token>",                     // status recorded, not asserted absolutely
  "/dashboard",                             // expect an auth redirect, not 200
  "/studio",
  "/sitemap.xml", "/robots.txt", "/icon.svg",
  "/__unmatched-url-smoke-check",           // the 404 assertion — see Pitfall 6
];

// For each route record: { status, redirected, finalUrl,
//   lang: /<html[^>]*\blang="([^"]*)"/, dir: /<html[^>]*\bdir="([^"]*)"/,
//   hasNav: html.includes("<nav"), hasFooter: html.includes("<footer") }
// --verify diffs the recorded object against the baseline and exits non-zero on any delta.
```

Recording a baseline *before* the move and diffing after removes every judgement call: no need to know in advance whether `/share/<bogus>` should be 404 or 200, or whether `/dashboard` 307s or 302s — only that it behaves the same as before.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| One root layout per app; i18n via a `[lang]` dynamic segment on every route | Multiple root layouts via route groups | Next 13 (App Router); listed as a first-class route-group use case | Exactly this phase's design. Avoids pushing a locale segment onto 151 guide routes + dashboard + API. |
| Root `app/not-found.js` handles all unmatched URLs | Still true for a single root layout; `app/global-not-found.js` needed when multiple root layouts exist | `global-not-found.js` introduced **v15.4.0** (experimental) `[CITED: not-found docs Version History]` | The contingency for Pitfall 6, available in 15.5.14. |
| `favicon.ico` at app root only | `icon.(ico\|jpg\|jpeg\|png\|svg)` valid at `app/**/*`; `favicon` still root-only | Next 13.3 | This repo uses `icon.svg` (no `favicon.ico` anywhere `[VERIFIED: git ls-files | grep -i favicon → empty]`), so placement is free — but keep it at root so both groups inherit one copy. |
| `params` as a sync object in layouts/handlers | `params` is a Promise | Next 15.0 | Already migrated in this repo. Not a Phase 1 concern. |

**Deprecated / outdated:**
- The design spec's assertion that the move "touches the parent path of 797 guide files" — those files are in `src/components/VisualGuides/` and do not move. The moved set is 243 files.
- The design spec's assertion that "no relative import can break" — 2 do, plus 9 alias imports. See Pitfalls 1 and 2.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | An `icon.svg` at `src/app/` root, with **no** `layout.tsx` beside it, still emits `/icon.svg` and is inherited by routes inside both groups. Icons are documented as "special Route Handlers," which do not need a layout — but the docs never show this exact configuration. | Move/Stay Inventory | Favicon `<link>` disappears from all pages. Detectable instantly in the build output (`/icon.svg` missing from the manifest) and in the smoke check. **Low risk, trivially caught.** |
| A2 | `sitemap.ts` and `robots.ts` at `src/app/` root behave identically with no sibling `layout.tsx`. Same "special Route Handler" reasoning. | Move/Stay Inventory | `/sitemap.xml` or `/robots.txt` 404s — an SEO regression. Caught by the manifest diff (both appear in it today) and by the smoke list. |
| A3 | A `(en)` segment inside a `@/`-aliased module specifier (`@/app/(en)/dashboard/...`) resolves cleanly under both `tsc` and Turbopack. Parentheses are legal path characters but this repo has never had one in an import. | Pitfall 2 | tsc or the build fails loudly. **Zero silent-failure risk** — but if it does fail, the fallback is relative imports within the moved tree. |
| A4 | `npx next build` reading `.env.local` (preview DB) is safe: `next build` alone never runs a migration, and the only build-time DB access is `sitemap.ts`'s **read-only** `prisma.visualGuide.findMany`, already wrapped in `try/catch` with a documented "ship the sitemap without guide URLs rather than failing it" fallback. `[VERIFIED: src/app/sitemap.ts:49-55 read; package.json build script read]` | Validation Architecture | A write against the preview DB. Reviewed the code path; there is no write. **Very low risk.** |
| A5 | `npx next build` succeeds without a preceding `prisma generate`, because `@prisma/client` is already generated in `node_modules` from earlier builds. | Validation Architecture | Build fails with "@prisma/client did not initialize yet." Fix is `npx prisma generate`, which contacts **no** database. Harmless either way. |
| A6 | After plan 01-01 (one root layout, inside `(en)`), `src/app/(en)/not-found.tsx` still serves unmatched URLs exactly as `src/app/not-found.tsx` does today, because route groups are transparent to routing. | Pitfall 6 | The branded 404 silently degrades to Next's default. Made an explicit smoke assertion in **both** plans precisely because this is assumed, not verified. See OQ-1. |

## Open Questions

1. **OQ-1 — Does the branded global 404 survive two root layouts?**
   - *What we know:* Next's docs state plainly that with multiple root layouts "there's no single layout to compose a global 404 from," and that this is one of the two reasons `global-not-found.js` exists. `[CITED: not-found docs]` The docs do **not** say what actually renders if you have multiple root layouts and no `global-not-found.js`.
   - *What's unclear:* whether Next picks one group's `not-found.tsx`, errors at build, or falls back to the built-in unstyled 404. Also whether placing a `not-found.tsx` in **both** groups resolves the ambiguity or is itself the ambiguity.
   - *Recommendation:* Do not guess. Make it an explicit, blocking verification step in **plan 01-02** (request `/__unmatched-url-smoke-check`, assert HTTP 404 and that the response body contains "Page not found" and `lang="en"`). If it regresses, escalate to Saeid with the two options: (a) accept Next's default 404 for unmatched URLs, or (b) enable `experimental.globalNotFound` + author `src/app/global-not-found.tsx`. Option (b) is an experimental flag and needs Saeid's sign-off under the "no push/deploy without a gate" constraint. **This is the single highest-value unknown in the phase.**

2. **OQ-2 — Should `scripts/mobile-gate.mjs` and `scripts/fix-title-suffix.ts` ride in the solo commit?**
   - *What we know:* Success criterion 2 requires the `(en)` move to be "its OWN SOLO COMMIT." Both scripts encode `src/app` paths and break on the move; `mobile-gate.mjs` breaks *silently*.
   - *What's unclear:* whether "solo" means "only `src/app` files" or "only this move and its mechanical consequences."
   - *Recommendation:* Include both. They are path-following edits caused by nothing but the move, and shipping a commit that leaves the mobile gate reporting `0/0 passed` would violate the phase's own spirit far more than two extra lines in the diff. Note the choice in the commit message.

3. **OQ-3 — Is the existing Jul-22 `.next/` a valid baseline, or must a fresh pre-move build run?**
   - *What we know:* HEAD is `86903ca`; the only commits since Jul 22 are `docs:`/`chore:` planning commits, so no source file has changed. The existing manifest has 284 entries and includes `/studio/[[...tool]]`, `/visual-guides`, `/sitemap.xml`, `/robots.txt`, `/icon.svg`. `[VERIFIED: git log --oneline; manifest inspected]`
   - *Recommendation:* Use it as a convenience baseline but run one fresh `npx next build` at HEAD **before** the move anyway. It costs one build and removes all doubt, and it also confirms the tree is green before the move so a post-move failure can only be caused by the move.

4. **OQ-4 — Which `/share/[token]` and `/cv/[slug]` values does the smoke list use?**
   - *What we know:* `/share/[token]` is dynamic and needs a live token; memory records a live share link (`/share/q5vlWuh70oDdTk2oFHdB0w`) but tokens can be revoked.
   - *Recommendation:* Sidestep it entirely with the record-then-verify smoke design — whatever a bogus token does before the move, it must do the same after. No live token required.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Git | The move; rename detection; the solo commit | ✓ | 2.51.0.windows.1 | — |
| `core.longpaths` | Windows path safety | ✓ | `true` | Not needed (max path ≈163 chars) |
| Node.js | `npx`, `.mjs` scripts, global `fetch` | ✓ | (repo targets `@types/node ^20`) | — |
| `typescript` | `npx tsc --noEmit` gate | ✓ | `^5` (devDep) | — |
| `next` | `npx next build`, `npx next dev` | ✓ | `^15.5.14` | — |
| `eslint` + `eslint-config-next` | Lint gate inside `next build` | ✓ | `^9` / `15.5.4` | — |
| `@prisma/client` generated | `npx next build` (sitemap reads the DB) | ✓ (in `node_modules`) | `^7.5.0` | `npx prisma generate` — contacts no DB |
| Preview Postgres (via `.env.local`) | Build-time read in `sitemap.ts` | ✓ | — | Already handled: `try/catch` ships the sitemap without guide URLs |
| Sanity API (via `.env.local`) | Build-time `generateStaticParams` for blog routes | ✓ | — | None — a Sanity outage fails the build; retry |
| System Chrome | `scripts/mobile-gate.mjs` only | ✓ | at `C:/Program Files/Google/Chrome/Application/chrome.exe` | Not needed for Phase 1 smoke (plain `fetch` suffices) |
| Vercel preview deploy | Optional end-of-phase browser smoke | ✓ (behind SSO) | — | Local `npx next dev` is sufficient for Phase 1; previews are behind SSO with no bypass secret, so any browser smoke rides Saeid's authenticated Chrome |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none — every dependency is present.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | **None, by design.** `.planning/codebase/TESTING.md`: "There is no vitest, jest, or any `*.test.*`/`*.spec.*` file anywhere in `src/`. This is the actual, deliberate verification strategy for this repo, not an oversight to 'fix' by bolting on a framework." |
| Config file | none — and none should be added |
| Quick run command | `npx tsc --noEmit` (must exit 0) |
| Full suite command | `npx tsc --noEmit && npx next build` — **NEVER `npm run build`** (chains `prisma migrate deploy`) |
| Smoke runner | `node scripts/checks/route-smoke.mjs` against `npx next dev --turbopack` on `http://localhost:3000` (override with `GATE_BASE_URL`, per the `mobile-gate.mjs` convention) |

`npm run dev` is **safe** — it is `next dev --turbopack` with no prisma chain. `[VERIFIED: package.json read]` Only `npm run build` is forbidden.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ROUTE-02 | **Every emitted URL is byte-identical** | build-artifact diff | `diff <(sorted values of routes-before) <(sorted values of routes-after)` on `.next/app-path-routes-manifest.json` | ❌ Wave 0 (one-liner, no file needed) |
| ROUTE-02 | All 11 moved-path specifiers resolve | static analysis | `npx tsc --noEmit` | ✅ existing gate |
| ROUTE-02 | Lint + type gates hold through the production build | build | `npx next build` | ✅ existing gate |
| ROUTE-02 | Rendering behavior unchanged (status, redirect, `lang`, `dir`, chrome presence) on the smoke list | smoke | `node scripts/checks/route-smoke.mjs --verify` | ❌ Wave 0 |
| ROUTE-02 | The `/cv/` bare-chrome special case still suppresses Navbar/Footer | smoke | same script — `hasNav === false` on `/cv/<slug>` | ❌ Wave 0 |
| ROUTE-02 | Unmatched URLs still serve the branded 404 | smoke | same script — 404 + body contains "Page not found" | ❌ Wave 0 |
| ROUTE-02 | The mobile gate still discovers all 151 guides (not 0) | smoke | `node scripts/mobile-gate.mjs --list-only \| wc -l` → **151** | ✅ existing script (needs the line-16 path fix) |
| ROUTE-02 | `src/middleware.ts` untouched (criterion 4) | diff | `git diff HEAD --stat -- src/middleware.ts src/components/appSkeleton/ConditionalChrome.tsx` → **empty** | ❌ Wave 0 (one-liner) |
| Phase SC-3 | `/fa` serves `<html lang="fa" dir="rtl">` | smoke | `curl -s localhost:3000/fa \| grep -o '<html[^>]*>'` | ❌ Wave 0 (plan 01-02) |
| Phase SC-3 | English pages still `lang="en"` and carry **no** `dir` attribute | smoke | same, against `/` and `/blog` | ❌ Wave 0 (plan 01-02) |

### Sampling Rate

- **Before touching anything (plan 01-01, task 1):** capture the route-manifest baseline **and** the smoke baseline. Everything downstream is a diff against these; without them the phase has no ground truth.
- **Per task:** `npx tsc --noEmit` after each batch of specifier edits.
- **Before the solo commit (not after):** the full gate — cold `npx tsc --noEmit` 0, `npx next build` 0, manifest diff empty, smoke `--verify` clean. Verifying before committing preserves "solo commit" (global CLAUDE.md forbids casual `--amend`, and a fix commit would break the criterion).
- **Plan 01-02 merge:** re-run the *entire* 01-01 gate. Adding `(fa)/layout.tsx` creates the second root layout and is the moment the 404 and cross-tree behaviors can change. Passing in 01-01 proves nothing about 01-02.
- **Phase gate:** full suite green + `node scripts/mobile-gate.mjs --list-only | wc -l` = 151, before `/gsd-verify-work`.

### How byte-for-byte URL preservation is verified — concretely

1. **Before** the move, at HEAD, run `npx next build`, then extract `Object.values(.next/app-path-routes-manifest.json)`, sort, save. Today that is **284** URLs including 151 guide routes, 73 API routes, `/sitemap.xml`, `/robots.txt`, `/icon.svg`, `/studio/[[...tool]]`, `/share/[token]`, `/_not-found`. `[VERIFIED: manifest inspected — 284 entries]`
2. **After** the move, repeat.
3. **Diff must be empty.** The manifest *keys* change (`/blog/page` → `/(en)/blog/page`) — that is expected and is exactly the evidence the group is invisible. Only the values are the contract.

This is stronger than any hand-written list because it is generated from the resolved route tree and covers routes nobody would think to enumerate. It is the single artifact that discharges ROUTE-02.

### Wave 0 Gaps

- [ ] `scripts/checks/route-smoke.mjs` — record/verify smoke over the criterion-1 route list; covers ROUTE-02 rendering behavior, the `/cv/` bare case, and the 404 assertion. Node global `fetch` + `node:assert`, no new dependencies.
- [ ] Baseline capture step (manifest values + smoke baseline) as the **first task of plan 01-01**, before any file moves.
- [ ] Line-16 path fix in `scripts/mobile-gate.mjs` (plus, recommended, a zero-targets guard so it can never pass on an empty discovery).
- [ ] Line-29 path fix in `scripts/fix-title-suffix.ts`.
- [ ] No framework install — explicitly out of scope and forbidden.

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1` in `.planning/config.json`. This phase adds no endpoints, no inputs, no crypto, and no data flows — it relocates files. The relevant security property is **negative**: no existing control may be weakened.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | **indirectly** | NextAuth v5 beta. Unchanged. But `(en)/layout.tsx` must keep its `NextAuthProvider` wrapper exactly as-is — dropping it during the move silently breaks session context on every English page. Assert `/dashboard` still redirects to `/auth/sign-in`. |
| V3 Session Management | **indirectly** | `src/middleware.ts` enforces role and suspended-user gating on `/dashboard/:path*`. **Success criterion 4 requires this file be untouched**; verify with an empty `git diff` on it. Because the matcher is a **URL** pattern and no URL changes, the gate is preserved by construction. |
| V4 Access Control | **indirectly** | Same middleware + the `dashboard/layout.tsx` onboarded check. The 9 `@/app/...` rewrites all sit inside `dashboard/`; a wrong rewrite could point an **admin** route at the wrong component. Smoke `/dashboard/admin/*` after the move. |
| V5 Input Validation | no | No new inputs. |
| V6 Cryptography | no | No crypto touched. |
| V14 Configuration | **yes** | `robots.ts` gates its `Disallow: /` on `VERCEL_ENV === "production"` and must keep emitting at `/robots.txt`; leaving it at the app root preserves this. If `experimental.globalNotFound` is ever enabled (OQ-1), that is a `next.config.ts` change requiring Saeid's sign-off. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Auth middleware silently stops matching after a route restructure | Elevation of Privilege | Matcher is URL-based and URLs are provably unchanged (manifest diff). Additionally assert `src/middleware.ts` has an empty diff, and smoke `/dashboard` for the expected redirect. |
| A cross-route `export { default } from "@/app/..."` rewritten to the wrong target, exposing an admin surface | Elevation of Privilege | Only 9 specifiers, all listed verbatim in Pitfall 2. Mechanical prefix insertion, no re-pointing. Smoke `/dashboard/admin/api-key` and `/dashboard/admin/suggest-category` specifically — those two are pure re-exports. |
| Preview/dev site becomes crawlable because `/robots.txt` 404s after the move | Information Disclosure | `robots.ts` stays at the app root; `/robots.txt` is in the manifest diff and in the smoke list. |
| Sanity Studio at `/studio` becomes unreachable or unauthenticated after the move | Information Disclosure | `/studio` is `Disallow`ed in prod robots and requires Sanity auth. The move needs the 5-level relative-import fix (Pitfall 1); smoke `/studio` for the same status as baseline. |

## Sources

### Primary (HIGH confidence — first-party evidence from this repo, gathered this session)

- `git ls-files src/app` + `awk`/`uniq -c` — 319 tracked files; exact per-directory counts
- `grep -rn -E '["'\'']\.\./' src/app/` — the 2 parent-escaping relative imports (exhaustive)
- `grep -rn '@/app/' src/ scripts/ prisma/` — the 9 alias imports across 8 files (exhaustive)
- `grep -rn -e 'src/app' scripts/ prisma/ src/lib/ src/sanity/ *.ts *.mjs` — the 2 scripts encoding the path
- `.next/app-path-routes-manifest.json` — 284 route entries; the URL-equality proof artifact
- Direct reads: `src/app/layout.tsx`, `not-found.tsx`, `error.tsx`, `sitemap.ts`, `robots.ts`, `src/middleware.ts`, `src/components/appSkeleton/ConditionalChrome.tsx`, `src/styles/globals.css`, `package.json`, `next.config.ts`, `tsconfig.json`, `vercel.json`, `scripts/mobile-gate.mjs`, `scripts/fix-title-suffix.ts`
- `git config --get core.longpaths` → `true`; `git --version` → 2.51.0.windows.1; path-length measurement via `git ls-files | awk length | sort -rn`
- `.planning/codebase/{STRUCTURE,TESTING,ARCHITECTURE,CONCERNS}.md` (2026-08-11)
- `2026-08-11-farsi-edition-design.md` (approved 2026-08-13) — the decision record

### Secondary (MEDIUM confidence — official Next.js documentation, fetched 2026-08-13)

- `nextjs.org/docs/app/api-reference/file-conventions/route-groups` — the three Caveats (full page load across root layouts; conflicting paths; home route must live in a group)
- `nextjs.org/docs/app/api-reference/file-conventions/layout` — "Any layout without a `layout.js` above it is a root layout"; the layout wraps `template/error/loading/not-found/page` (notably **not** `route`)
- `nextjs.org/docs/app/api-reference/file-conventions/not-found` — multiple root layouts named as the reason `global-not-found.js` exists; Version History places it at v15.4.0
- `nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons` — `favicon` valid only at `app/`, `icon` valid at `app/**/*`
- `nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap` — "place it in the root of your `app` directory"; sitemap is "a special Route Handler"
- `nextjs.org/docs/app/api-reference/file-conventions/route` — Route Handler API surface (no layout participation anywhere in it)

> ⚠ **Version caveat, stated honestly:** nextjs.org now serves documentation for **v16.3.0** while this repo runs **15.5.14**. Every rule cited above is a long-standing App Router behavior present since v13, and `global-not-found.js` is explicitly dated to v15.4.0 in its own Version History — so all citations apply. But no citation was read from a 15.5-pinned doc, which is why Next.js semantics are rated MEDIUM rather than HIGH, and why the phase gates on an actual build rather than on the docs.

### Tertiary (LOW confidence)

- None. No claim in this document rests on WebSearch, community posts, or unverified training knowledge. Everything not first-party is cited to nextjs.org.

*The `classify-confidence` seam returns `LOW` for the generic provider id `webfetch` (it has no notion of "fetched from the vendor's own documentation site"). Official-documentation claims are tagged `[CITED: url]` per the source hierarchy, and codebase-tool-verified claims `[VERIFIED: ...]`. Recorded here so the discrepancy is visible rather than silently overridden.*

## Metadata

**Confidence breakdown:**
- Move/Stay inventory & file counts: **HIGH** — every number produced by a git/grep command against the repo at `86903ca` this session, not from any prior document.
- The 11 breaking specifiers + 2 scripts: **HIGH** — exhaustive greps; the patterns used would return additional hits if any existed. This is the finding that most changes the plan, and it contradicts the approved design spec.
- Next.js route-group / root-layout semantics: **MEDIUM** — official docs, but served at v16.3 against a 15.5.14 runtime.
- Global 404 behavior with two root layouts: **LOW** — the docs describe the problem but not the failure mode. Deliberately converted into a blocking verification step rather than an assumption (OQ-1).
- Verification design (manifest diff, record/verify smoke): **HIGH** — the manifest was inspected and confirmed to contain all 284 URLs including every route in the success criteria.
- Windows / git mechanics: **HIGH** — measured (path lengths, `core.longpaths`, git version), not assumed.

**Research date:** 2026-08-13
**Valid until:** 2026-09-12 (30 days). Invalidate immediately on any Next.js major/minor upgrade, or if `src/app` gains a top-level file (`template.tsx`, `global-error.tsx`, `manifest.ts`, `opengraph-image.*`) — none of which exists today. `[VERIFIED: ls src/app]`
