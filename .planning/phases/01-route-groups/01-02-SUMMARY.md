---
phase: 01-route-groups
plan: 02
subsystem: routing
tags: [route-groups, app-router, i18n-prep, rtl, next15]
status: complete
requires:
  - src/app with no root layout and the English tree inside src/app/(en)/ (from 01-01)
  - src/app/global-not-found.tsx serving the branded 404 above all route groups (from 01-01)
  - scripts/checks/route-smoke.mjs with a recorded 28-route baseline (from 01-01)
provides:
  - src/app/(fa)/ second root-layout route group emitting <html lang="fa" dir="rtl">
  - the /fa URL, the first Farsi route
  - scripts/checks/route-smoke.mjs --fa-check mode (Farsi RTL, English LTR, branded 404)
  - proof that two root layouts coexist with zero English URL or rendering change
affects:
  - Phase 4 (Farsi Routes and Chrome) — owns every piece of Farsi chrome deliberately left out of (fa)/layout.tsx
  - Phase 5 (SEO and Ship) — extends the single sitemap.ts with Farsi URLs and adds hreflang/canonical to /fa
tech-stack:
  added: []
  patterns:
    - Two coexisting root layouts via sibling route groups (Next.js App Router)
    - Subtractive root layout — copy only the stylesheet import, metadataBase and body colour tokens
    - Exact-string html-tag assertions rather than substring tests, so a stray attribute fails the gate
key-files:
  created:
    - src/app/(fa)/layout.tsx
    - src/app/(fa)/fa/page.tsx
    - .planning/phases/01-route-groups/artifacts/routes-after-fa.txt
  modified:
    - scripts/checks/route-smoke.mjs
    - .planning/phases/01-route-groups/01-VALIDATION.md
decisions:
  - OQ-1 needed no action in 01-02; the 01-01 globalNotFound fix held under two root layouts and next.config.ts was not touched
  - The frozen-files fingerprint is five paths, not the six the plan named, because pnpm-lock.yaml was deleted under Saeid's approval in 01-01
metrics:
  duration: ~35m
  completed: 2026-08-16
  tasks: 3
  commits: 3
---

# Phase 01 Plan 02: (fa) Root Layout Scaffold Summary

Added the second root layout at `src/app/(fa)/layout.tsx` and the placeholder `/fa` route, then re-ran the entire 01-01 gate from cold: the manifest gained exactly one URL and lost none, and the branded 404 survived unchanged.

## What Was Built

`src/app/` now holds two sibling root-layout groups, `(en)` and `(fa)`, with no layout above either of them. The Farsi layout is deliberately the smallest document that satisfies the phase: one import, a two-key `metadata` object, and an `<html lang="fa" dir="rtl">` shell around a `<body>` carrying only the two colour tokens. Every piece of chrome the English layout has (`Inter`, both GA `Script` blocks, `NextAuthProvider`, `ConditionalChrome`, `GeneralSignupPrompt`, `FlushPendingCompletions`, `GoogleAnalyticsTracker`, `SpeedInsights`) is absent by design and belongs to Phase 4.

The placeholder page lives at `src/app/(fa)/fa/page.tsx`. The literal `fa` directory inside the URL-invisible `(fa)` group is what emits `/fa`; a page directly at `src/app/(fa)/page.tsx` would resolve to `/` and collide with the English home page.

`scripts/checks/route-smoke.mjs` gained a third mode, `--fa-check`. `--record` and `--verify` are behaviourally untouched and the recorded baseline JSON shape is unchanged, so the 01-01 baseline still verifies against genuine pre-move values.

## Verification Results

| Gate | Result |
|------|--------|
| Cold `npx tsc --noEmit` | exit 0 |
| Cold `npx next build` | exit 0 (`npm run build` never invoked) |
| `wc -l routes-after-fa.txt` | 285 |
| `diff routes-before.txt routes-after-fa.txt` | 0 removals, 1 addition, `/fa` |
| `route-smoke.mjs --verify` | 28/28 passed, `ALL PASS` |
| `route-smoke.mjs --fa-check` | `FA CHECK ALL PASS` |
| `mobile-gate.mjs --list-only` | 151 slugs |
| `frozen-files.sha` fingerprint | no diff, `next.config.ts` byte-identical |
| `node --check route-smoke.mjs` | exit 0, 01-01 baseline still parses (28 routes) |

### Observed html tags, verbatim

| URL | Status | `<html>` tag |
|-----|--------|--------------|
| `/fa` | 200 | `<html lang="fa" dir="rtl">` |
| `/` | 200 | `<html lang="en">` |
| `/blog` | 200 | `<html lang="en">` |
| `/__unmatched-url-smoke-check` | 404 | `<html lang="en">` |

`/fa` served exactly one `rel="stylesheet"` link, confirming the `@/styles/globals.css` import is doing its job and the page is not raw unstyled HTML.

### OQ-1 outcome: the stop rule did NOT fire

The unmatched-URL probe returned status `404`, html tag `<html lang="en">` with no `dir` attribute, `<title>Page not found | NeuroNomixer</title>`, `<meta name="robots" content="noindex">` and the branded `Page not found` body marker. It resolved through `app/_not-found/page`, which is `global-not-found.tsx` composed above both route groups. The second root layout did not degrade it and did not leak `dir="rtl"` onto it.

No contingency was applied in this plan. `next.config.ts` was not opened, and the `frozen-files.sha` fingerprint proves it byte-for-byte. The OQ-1 contingency that is live in the repo was authorized by Saeid and applied one plan earlier, inside 01-01.

### Manifest delta

```
125a126
> /fa
```

284 URLs before, 285 after. The single addition is the whole delta.

## Deviations from Plan

### 1. The frozen-files fingerprint is five paths, not six

**Found during:** Task 1, the pre-commit fingerprint check.
**Issue:** the plan's acceptance criteria and Task 3 Part E both name a six-path `git hash-object` command ending in `pnpm-lock.yaml`. That file no longer exists: Saeid made npm authoritative in 01-01 and `pnpm-lock.yaml` plus `pnpm-workspace.yaml` were deleted. `frozen-files.sha` on disk holds five hashes, which 01-01 re-froze after the authorized `next.config.ts` change.
**Fix:** ran the fingerprint over the five surviving paths (`src/middleware.ts`, `ConditionalChrome.tsx`, `next.config.ts`, `package.json`, `package-lock.json`). It diffs clean at every checkpoint in this plan. The invariant the criterion protects, in particular that `next.config.ts` is untouched, is fully preserved.
**Files modified:** none.

### 2. Hard constraint 4 versus the repo state

**Found during:** planning read-through.
**Issue:** hard constraint 4 forbids enabling `experimental.globalNotFound` and authoring `global-not-found.tsx`. Both were already done in 01-01 under Saeid's explicit approval, so the constraint reads as already-violated at plan start.
**Resolution:** treated as a do-not-touch instruction rather than a revert instruction. Nothing was added, changed or reverted. The constraint's actual purpose, that no unapproved framework configuration change is smuggled in under this plan, is satisfied and mechanically proven by the fingerprint.
**Files modified:** none.

No Rule 1, 2 or 3 auto-fixes were needed. No authentication gates were hit. No package-manager command was run.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `/fa` renders a heading and one sentence | `src/app/(fa)/fa/page.tsx` | Intentional and specified by the plan. The phase's goal is the document shell (`lang="fa" dir="rtl"`), not Farsi content. Phase 4 replaces this page with the real Farsi home page and adds the chrome; Phase 5 adds hreflang and canonical. |
| `(fa)/layout.tsx` carries no nav, footer, fonts, auth or analytics | `src/app/(fa)/layout.tsx` | Intentional. Threat entries T-01-09 and T-01-10 make the reduced surface a requirement of this plan, not an omission. Phase 4 owns Farsi chrome. |

Neither stub blocks the plan's goal, which is the two-root-layout foundation.

## Threat Model Outcomes

| Threat ID | Outcome |
|-----------|---------|
| T-01-08 (404 composition) | Held. Blocking assertion in `--fa-check` plus the repeat in `--verify` both green. |
| T-01-09 (unstyled Farsi tree) | Mitigated. Exactly one import, and `/fa` serves one stylesheet link. |
| T-01-10 (auth/telemetry surface leak) | Mitigated. `grep -c '^import '` is 1 and the file is 20 lines. |
| T-01-11 (`next.config.ts` tampering) | Mitigated. Fingerprint clean; the file was never opened. |
| T-01-12 (middleware) | Accepted with verification. Fingerprint clean; `/dashboard` still redirects to `/auth/sign-in` in the smoke run. |
| T-01-SC (package manager) | Mitigated. No install of any kind; `package.json` and `package-lock.json` fingerprint clean. |
| T-01-DB (production Postgres) | Mitigated. Only `npx next build` was run. `npm run build` and every `prisma migrate` command were never invoked. |

No new security surface was introduced beyond what the plan's threat model already covers, so there are no threat flags.

## Commits

| SHA | Subject |
|-----|---------|
| 680c40a | feat(01-02): add the (fa) root layout and placeholder Farsi route |
| 06c5d6d | chore(01-02): add --fa-check mode to the route smoke tool |
| 5726207 | docs(01-02): record post-(fa) route manifest evidence |

No commit carries AI attribution.

## Manual Verification Still Outstanding

The plan's browser human check needs Saeid's Chrome and was not performed:

1. Load `/fa` and confirm it is styled and flows right to left.
2. Devtools: confirm the root element reads `lang="fa" dir="rtl"`.
3. Load `/` and confirm `lang="en"` with no `dir`, navbar and footer present.
4. Request a nonsense URL such as `/definitely-not-a-real-page` and confirm the branded 404 renders left to right.

Every one of these four is already green under automated assertion against `npx next start`, so this is a confirmation step rather than an open risk. Note for item 4: since 01-01 the branded 404 renders without nav and footer by design, which is the recorded accepted residual difference, so its absence there is expected and not a regression.

## Outstanding for Phase 2 and Beyond

- The `package-lock.json` out-of-sync blocker from 01-01 is still open. `npm ci` remains unavailable locally, in CI and on Vercel.
- `/cv/[slug]`'s `generateStaticParams` still has no try/catch fallback, so a paused dev database fails the whole build.
- Cross-tree navigation between `(en)` and `(fa)` is a full page load. Nothing links to `/fa` yet, but it constrains the Phase 4 language switcher.
- `experimental.globalNotFound` is an experimental flag. Any Next.js version bump should re-run `--fa-check` before deploy.

## Self-Check: PASSED

All five created or modified files verified present on disk; all three commit hashes verified present in git history.
