---
phase: 01-route-groups
plan: 01
subsystem: routing
tags: [route-groups, app-router, refactor, i18n-prep, next15]
status: complete
requires:
  - src/app tree with a single root layout at src/app/layout.tsx
provides:
  - src/app/(en)/ route group holding the entire English tree (243 files)
  - src/app/global-not-found.tsx as the global 404 above all route groups
  - scripts/checks/route-smoke.mjs record/verify HTTP smoke gate
  - a free src/app root that can now hold a sibling (fa) root layout
affects:
  - .planning/phases/01-route-groups/01-02-PLAN.md (the (fa) scaffold builds on this)
  - scripts/mobile-gate.mjs (guide discovery path)
  - scripts/fix-title-suffix.ts (home page skip guard)
tech-stack:
  added: []
  patterns:
    - Multiple root layouts via route groups (Next.js App Router)
    - experimental.globalNotFound plus global-not-found.tsx for a layout-independent 404
    - Record/verify HTTP smoke baselines instead of hand-asserted expected values
key-files:
  created:
    - src/app/global-not-found.tsx
    - scripts/checks/route-smoke.mjs
    - .planning/phases/01-route-groups/artifacts/routes-before.txt
    - .planning/phases/01-route-groups/artifacts/routes-after.txt
    - .planning/phases/01-route-groups/artifacts/route-smoke.baseline.json
    - .planning/phases/01-route-groups/artifacts/frozen-files.sha
  modified:
    - next.config.ts
    - scripts/mobile-gate.mjs
    - scripts/fix-title-suffix.ts
    - src/app/(en)/layout.tsx
    - src/app/(en)/studio/[[...tool]]/page.tsx
    - 8 files under src/app/(en)/dashboard/
decisions:
  - Enable experimental.globalNotFound and author global-not-found.tsx (OQ-1 contingency, approved by Saeid 2026-08-16)
  - Accept the loss of nav and footer on the global 404 as inherent to global-not-found.tsx
  - npm is the authoritative package manager; pnpm lockfile and workspace file deleted
  - Guide URLs for the smoke check are sampled from the server-rendered sitemap, not the client-rendered index
metrics:
  duration: ~9h15m wall clock (13:08 to 22:24), of which roughly 1h30m was active execution; the remainder was three human checkpoints
  completed: 2026-08-16
  tasks: 3
  files_moved: 243
  commits: 7
---

# Phase 01 Plan 01: (en) Route Group Move Summary

Moved all 243 English route files into `src/app/(en)/` with byte-identical URL output across all 284 emitted routes, and restored the branded global 404 that the move silently broke.

## What Was Built

`src/app/` now holds exactly five entries: `(en)/`, `api/`, `icon.svg`, `robots.ts`, `sitemap.ts`. There is no longer a root layout at `src/app/`, which is the precondition plan 01-02 needs in order to add a sibling `(fa)` root layout.

Two verification artifacts now exist that did not before:

- `scripts/checks/route-smoke.mjs`, a dependency-free record/verify HTTP gate. `--record` discovers a route list and snapshots status, redirect target, final path, content type, `<html>` tag and chrome markers. `--verify` re-probes exactly the recorded URL set and diffs every field. Absolute assertions (branded 404, `lang="en"` with no `dir`, no nav on `/cv/`) run in both modes.
- Committed before and after route manifests, which are the mechanical proof of ROUTE-02.

## Verification Results

| Gate | Result |
|------|--------|
| Cold `npx tsc --noEmit` | exit 0 |
| Cold `npx next build` | exit 0 (`npm run build` never invoked) |
| `diff routes-before.txt routes-after.txt` | empty, 284 URLs unchanged |
| `route-smoke.mjs --verify` | 28/28 passed, ALL PASS |
| `mobile-gate.mjs --list-only` | 151 slugs |
| `src/middleware.ts`, `ConditionalChrome.tsx` | empty git diff |
| `package.json`, `package-lock.json` | byte-identical to phase start |

The manifest diff is the load-bearing evidence. All 284 values are identical while 207 of the manifest keys gained the `(en)` segment (`/(en)/blog/page` still maps to `/blog`). That asymmetry is precisely the proof that the route group is invisible to routing.

Smoke coverage included `/dashboard` (still redirects to `/auth/sign-in`, confirming `NextAuthProvider` survived), both pure cross-route admin re-exports, `/studio`, a blog category, a blog post and eight guides.

## Deviations from Plan

### 1. Pre-existing blocker: hybrid npm and pnpm node_modules (resolved, Saeid decision)

**Found during:** Task 1, the green-at-HEAD gate.
**Issue:** `npx tsc --noEmit` failed at HEAD with two type errors in `SubmitPostForm.tsx`. `node_modules/` was a hybrid tree: every direct dependency was a pnpm symlink into `.pnpm/`, but `@tiptap/core` is an undeclared (phantom) dependency, so it resolved to a stale npm-era directory at 3.22.3 while `@tiptap/react` resolved to 3.29.2. Two type identities for one package.
**Resolution:** Saeid chose npm as authoritative. `node_modules` wiped, `pnpm-lock.yaml` and `pnpm-workspace.yaml` deleted, tree reinstalled, `npx prisma generate` re-run.
**Commit:** cf17610

### 2. package-lock.json is out of sync with package.json (still open)

**Found during:** the remediation above.
**Issue:** `npm ci` cannot run. `@sanity/visual-editing@3.0.5` requires `@sanity/client@^7.8.2`, its dependency edge is unrecorded in the lock, and the nested lock entry pins 6.29.1. npm resolves 7.26.2 from the registry and rejects the lock. Verified in isolation that HEAD's committed lockfile fails the same way (four invalid entries), so this predates the phase.
**Workaround:** installed with `npm install --no-package-lock`, leaving `package.json` and `package-lock.json` byte-identical.
**Status:** NOT FIXED. Repairing it requires a real `npm install`, which rewrites a tracked lockfile that this plan freezes. Flagged for a separate task. Until then `npm ci` is unavailable to Saeid, to CI and to Vercel.

### 3. Dev database was paused (resolved, Saeid restored it)

**Found during:** Task 1, the build gate. `/cv/[slug]`'s `generateStaticParams` calls `prisma.authorCV.findMany()` with no try/catch fallback, so an unreachable database fails the whole build. Saeid restored the paused Supabase dev project.

### 4. Research assumption A6 is false: the global 404 broke in 01-01, not 01-02

**Found during:** Task 3.
**Issue:** Pitfall 6 predicted the branded 404 would survive plan 01-01 because only one root layout exists after the move. It did not. Moving the sole root layout into a route group is by itself sufficient to break it: a `not-found.tsx` inside a group does not serve URLs that match no group. Measured on `/__unmatched-url-smoke-check`: status stayed 404, but `<html lang="en">` degraded to a bare `<html>` and the branded body was replaced by Next's built-in default.
**Fix:** Saeid authorized the OQ-1 contingency. `experimental: { globalNotFound: true }` in `next.config.ts` plus `src/app/global-not-found.tsx`. This is the sanctioned exception to hard constraint 4. The move commit was deliberately held until the fix was green so it stayed a single gated commit.
**Commit:** 411eebc (folded into the move commit)

### 5. Two route-smoke discovery assumptions were wrong

**Found during:** Task 1, recording the baseline.
**Issue:** the plan specified discovering a blog category from a one-segment href on `/blog`, and guides from hrefs on `/visual-guides`. Neither exists in the served HTML: `/blog` links only posts, and `/visual-guides` builds its catalog client-side so its HTML carries no guide links at all.
**Fix:** the category is derived from a post URL's first segment, and guides are sampled from the server-rendered sitemap. The script failed loudly rather than recording a short list, which is the behavior the plan asked for.
**Commit:** 413929a

### 6. Acceptance criteria that were themselves wrong

- The plan asserted `grep -c 'NextAuthProvider' layout.tsx` should be 2. The true count is 3 both before and after the move, because the closing tag sits on its own line. The meaningful invariant (unchanged from pre-move, provider still wrapping `ConditionalChrome`) holds.
- The plan expected 243 detected renames. Git detects 242. `dashboard/admin/suggest-category/page.tsx` is a single-line re-export whose only line changed, so similarity is 0% and git records delete plus add. All 243 files are present under `(en)`.
- The frozen-files fingerprint was specified over six files including `pnpm-lock.yaml`. That file was deleted under Saeid's approval, so the fingerprint is now five files. It was also re-frozen once more after the authorized `next.config.ts` change.

## Accepted Residual Difference

`global-not-found.tsx` renders outside every layout by design, so the global 404 no longer carries the `ConditionalChrome` nav and footer. Status 404, `<html lang="en">` and the branded "Page not found" marker are all preserved and remain absolutely asserted. This is recorded in `route-smoke.baseline.json` under `approvedDeviations`; the pre-move ground truth for that entry is preserved in git at commit 413929a. The baseline was NOT re-recorded wholesale, so the other 27 routes still diff against genuine pre-move values.

## Move/Stay Inventory

No deviation. Exactly as researched: 11 directories plus `layout.tsx`, `page.tsx`, `error.tsx`, `not-found.tsx` moved (243 files). `api/` (73 files), `sitemap.ts`, `robots.ts` and `icon.svg` stayed at the `src/app` root.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: config | next.config.ts | An experimental Next.js flag (`globalNotFound`) is now enabled in production configuration. Experimental flags carry no stability guarantee across minor upgrades, so any Next.js bump should re-verify the branded 404 before deploy. |

## Commits

| SHA | Subject |
|-----|---------|
| c64c036 | chore(01-01): add route smoke check and record phase-01 blocker |
| cf17610 | chore(01-01): repair node_modules to an npm-authoritative tree |
| f2a7abb | docs(01-01): record build retry result, correct dev DB terminology |
| 413929a | chore(01-01): capture pre-move route baselines |
| a12a641 | docs(01-01): record global 404 regression blocking the move commit |
| **411eebc** | **refactor(01-01): move all existing routes into the (en) route group** |
| **0e10bfc** | **docs(01-01): record post-move route manifest evidence** |

The move is a single commit containing only `src/app/` renames, the two script path fixes, and the authorized `next.config.ts` and `global-not-found.tsx` additions. No commit carries AI attribution.

## Outstanding for Plan 01-02

- Re-run the full 01-01 gate after `(fa)/layout.tsx` lands. The second root layout is the moment cross-tree behavior can change.
- Assert the global 404 does not pick up `dir="rtl"` once a Farsi root layout exists.
- Cross-tree navigation between `(en)` and `(fa)` triggers a full page load. Not an issue yet since nothing links to `/fa`, but it constrains the Phase 4 language switcher.

## Manual Verification Still Outstanding

The plan's human check was not performed, because it needs Saeid's authenticated Chrome:

- Sign in and open `/dashboard/author/posts/<id>/edit`, confirm the submit form renders with no chunk-load error. This exercises the lazy `next/dynamic` specifier, the one site a type check cannot fully vouch for.
- Spot-check `/dashboard/admin/api-key` and `/dashboard/admin/suggest-category` render the author pages they re-export.

Both routes returned their baseline-matching status in the automated smoke, so this is a confirmation step rather than an open risk.

## Self-Check: PASSED

All created files verified present on disk and all seven commit hashes verified present in git history.
