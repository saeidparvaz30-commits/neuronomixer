---
phase: 01-route-groups
verified: 2026-08-16T20:39:21Z
status: passed
score: 12/12 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Sign in to Saeid's authenticated Chrome, open /dashboard/author/posts/<id>/edit, confirm the submit form renders with no chunk-load error in devtools console. Then spot-check /dashboard/admin/api-key and /dashboard/admin/suggest-category render the author-side pages they re-export."
    expected: "The lazy next/dynamic() import of SubmitPostForm resolves without a chunk-load error; the two admin re-export routes render the correct author-side component."
    why_human: "Requires an authenticated session (NextAuth sign-in) and browser devtools console inspection. This is the one site of the 9 alias-import fixes that a type check cannot fully vouch for (Task 2 Part C, site 9, marked 'the dangerous one'). Automated smoke only confirms the route returns its baseline HTTP status, not that the client-side chunk loads without error."
  - test: "In Saeid's Chrome against a local npx next start: load /fa and confirm it is visually styled (not raw HTML) and text flows right to left with correct Persian typography; load / and confirm navbar/footer are present and unchanged; request a nonsense URL and confirm the branded 404 renders left to right with its two call-to-action buttons."
    expected: "/fa renders as a coherent, right-to-left styled page; / is visually unchanged; the branded 404 displays correctly."
    why_human: "Visual/layout correctness (font rendering, RTL text flow, absence of LTR bleed) cannot be fully assessed via curl/grep. Note: this verifier independently confirmed via curl that /fa returns status 200, exactly one stylesheet link, the html tag lang=\"fa\" dir=\"rtl\", and Farsi body text — the remaining gap is purely visual/subjective confirmation in a real browser, not functional risk."
---

# Phase 1: Route Groups Verification Report

**Phase Goal:** Move all existing routes into `(en)` untouched, add the `(fa)` root layout with a placeholder route.
**Verified:** 2026-08-16T20:39:21Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Every existing English URL resolves exactly as before (SC1: route smoke covering a guide per category, `/blog`, a post, `/visual-guides`, `/cv`, `/share/[token]`, dashboard) | ✓ VERIFIED | Live run against `npx next start -p 3100`: `node scripts/checks/route-smoke.mjs --verify` → `28/28 passed`, `route-smoke.mjs: ALL PASS` (independently re-executed by this verifier, not just SUMMARY-claimed) |
| 2 | The `(en)` move landed as its own solo commit, gated on `tsc` 0 + `next build` 0 before anything else (SC2) | ✓ VERIFIED | `git show --name-status 411eebc`: only `src/app/` renames (242 detected + 1 add/delete pair, documented git-similarity edge case), `scripts/mobile-gate.mjs`, `scripts/fix-title-suffix.ts`, and the approved OQ-1 exception (`next.config.ts` + `src/app/global-not-found.tsx`). No `Co-Authored-By` line. |
| 3 | Placeholder Farsi route serves `<html lang="fa" dir="rtl">`; English pages still serve `lang="en"` LTR (SC3) | ✓ VERIFIED | Live curl + `--fa-check`: `/fa` → `200`, `<html lang="fa" dir="rtl">`, one `rel="stylesheet"` link, Farsi body text present; `/` and `/blog` → exactly `<html lang="en">` |
| 4 | `ConditionalChrome.tsx`'s `/cv/` special case and `src/middleware.ts` are untouched (SC4) | ✓ VERIFIED | `git hash-object` over the 5 frozen paths matches `frozen-files.sha` exactly (re-computed independently by this verifier); live curl to `/cv/__smoke-check-xyz` confirms zero `<nav>` occurrences |
| 5 | Sorted manifest values byte-identical before/after the `(en)` move (284 entries, 0 added/removed) | ✓ VERIFIED | `diff routes-before.txt routes-after.txt` → empty |
| 6 | Sorted manifest gains exactly one entry, `/fa`, after the `(fa)` scaffold, loses none | ✓ VERIFIED | `diff routes-before.txt routes-after-fa.txt` → `125a126 > /fa` only; live `.next/app-path-routes-manifest.json` (285 entries) matches `routes-after-fa.txt` byte-for-byte (trailing newline only difference) |
| 7 | An unmatched URL still returns HTTP 404 with the branded body marker and `lang="en"` | ✓ VERIFIED | Live curl to `/definitely-not-a-real-page-xyz` returns the `global-not-found.tsx` body (`<html lang="en">`, "Page not found" marker); `--verify` and `--fa-check` both assert this absolutely and pass |
| 8 | `node scripts/mobile-gate.mjs --list-only` prints 151 slugs, not 0 | ✓ VERIFIED | Live run: `151` (independently re-executed) |
| 9 | 13 path-encoding sites fixed (styles alias, sanity.config 5-parent relative import, 9 `@/app/(en)/dashboard/` specifiers, mobile-gate `"(en)"` segment, fix-title-suffix literal) | ✓ VERIFIED | `grep -rn '@/app/(en)/dashboard/' "src/app/(en)/"` → 9; `grep '"(en)"' scripts/mobile-gate.mjs` → 1; `grep 'src/app/(en)/page.tsx' scripts/fix-title-suffix.ts` → 1 |
| 10 | `src/app/(fa)/layout.tsx` is a minimal root layout (1 import, `metadataBase`, `lang="fa" dir="rtl"`) with no chrome/auth/analytics leaked in | ✓ VERIFIED | File read: exactly 1 import line (`@/styles/globals.css`), 20 lines total, no `NextAuthProvider`/`ConditionalChrome`/`Script`/`SpeedInsights` references |
| 11 | `src/app/(fa)/fa/page.tsx` exists (not `src/app/(fa)/page.tsx`, which would collide with `/`) | ✓ VERIFIED | `ls "src/app/(fa)/"` → `fa`, `layout.tsx` only; `ls "src/app/(fa)/fa/"` → `page.tsx`; no server component client directive |
| 12 | `route-smoke.mjs` gained a `--fa-check` mode without changing `--record`/`--verify` behavior or the baseline shape | ✓ VERIFIED | Full file read: three modes present (`--record`, `--verify`, `--fa-check`), `--verify` logic unchanged from 01-01 description, baseline JSON shape (`recordedAt`, `base`, `routes`) unchanged |

**Score:** 12/12 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/(en)/` | 243 tracked files, entire English tree | ✓ VERIFIED | `ls "src/app/(en)/"` shows all 11 dirs + 4 files; no root `layout.tsx` remains |
| `src/app/(fa)/layout.tsx` | Root layout, `lang="fa" dir="rtl"` | ✓ VERIFIED | Read in full, matches plan spec exactly |
| `src/app/(fa)/fa/page.tsx` | Placeholder Farsi page | ✓ VERIFIED | Read in full, renders Farsi heading + sentence |
| `src/app/global-not-found.tsx` | Branded global 404 (approved OQ-1 exception) | ✓ VERIFIED | Read in full; renders inline-styled 404 with brand marker |
| `scripts/checks/route-smoke.mjs` | 3-mode smoke tool | ✓ VERIFIED | Read in full; substantive, not a stub |
| `.planning/phases/01-route-groups/artifacts/routes-before.txt` | 284 sorted URLs | ✓ VERIFIED | `wc -l` = 284 |
| `.planning/phases/01-route-groups/artifacts/routes-after.txt` | 284 sorted URLs | ✓ VERIFIED | `wc -l` = 284, diff vs before is empty |
| `.planning/phases/01-route-groups/artifacts/routes-after-fa.txt` | 285 sorted URLs | ✓ VERIFIED | `wc -l` = 285, diff vs before is exactly `+/fa` |
| `.planning/phases/01-route-groups/artifacts/frozen-files.sha` | 5-line content fingerprint | ✓ VERIFIED | Matches live `git hash-object` recomputation exactly |
| `.planning/phases/01-route-groups/artifacts/route-smoke.baseline.json` | Recorded probe set | ✓ VERIFIED | Successfully consumed by live `--verify` run (28 routes) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/app/(en)/layout.tsx` | `@/styles/globals.css` | alias-form import | ✓ WIRED | Line 1; live home page HTML confirms styling active |
| `src/app/(en)/layout.tsx` | `NextAuthProvider` / `ConditionalChrome` | JSX nesting | ✓ WIRED | Provider still wraps chrome; `/dashboard` redirects to `/auth/sign-in` in live smoke |
| `src/app/(fa)/layout.tsx` | `@/styles/globals.css` | alias-form import | ✓ WIRED | Live curl to `/fa` shows exactly 1 stylesheet link |
| `next.config.ts` (`experimental.globalNotFound`) | `src/app/global-not-found.tsx` | framework composition | ✓ WIRED | Live curl to a nonsense URL renders the branded body, not Next's default |
| `scripts/mobile-gate.mjs` `allSlugs()` | `src/app/(en)/visual-guides/` | `path.join` segment insertion | ✓ WIRED | Live `--list-only` returns 151, not 0 |

### Data-Flow Trace (Level 4)

Not applicable — this phase is structural (file moves, route-group scaffolding, static layouts) with no dynamic data-fetching components introduced.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| English URL set unchanged, rendering behavior identical | `GATE_BASE_URL=http://localhost:3100 node scripts/checks/route-smoke.mjs --verify` (live run against `npx next start -p 3100`) | `28/28 passed`, `ALL PASS` | ✓ PASS |
| `/fa` Farsi RTL, English LTR, 404 composition holds under two root layouts | `GATE_BASE_URL=http://localhost:3100 node scripts/checks/route-smoke.mjs --fa-check` | `FA CHECK ALL PASS` | ✓ PASS |
| Guide discovery not silently broken (0/0 false-green risk) | `node scripts/mobile-gate.mjs --list-only \| wc -l` | `151` | ✓ PASS |
| Manifest byte-identity independently re-derived from live build output | `node -e "Object.values(require('./.next/app-path-routes-manifest.json')).sort()..."` diffed against committed `routes-after-fa.txt` | Identical (285 entries, trailing-newline-only diff) | ✓ PASS |
| Branded 404 renders (not Next's unstyled default) | `curl http://localhost:3100/definitely-not-a-real-page-xyz` | `<html lang="en">` + "Page not found" body marker | ✓ PASS |
| `/cv/` bare-chrome special case intact | `curl http://localhost:3100/cv/__smoke-check-xyz \| grep -o "<nav"` | 0 occurrences | ✓ PASS |
| Frozen-file fingerprint still holds | `git hash-object src/middleware.ts ... \| diff - frozen-files.sha` | No output (exit 0) | ✓ PASS |

All spot-checks were executed live by this verifier against a real `npx next start -p 3100` server (started, polled, verified, then cleanly killed) — not taken on SUMMARY.md's word.

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention exists in this repo; this phase uses `scripts/checks/route-smoke.mjs` as its equivalent, covered above under Behavioral Spot-Checks.

### Requirements Coverage

No standalone `.planning/REQUIREMENTS.md` exists in this project; requirement IDs are tracked in `.planning/ROADMAP.md`'s Traceability table.

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| ROUTE-02 | 01-01-PLAN.md, 01-02-PLAN.md | Existing English routes keep their exact URLs and rendering behavior | ✓ SATISFIED | Truths 1, 5, 7, 8 above; live manifest diff and route-smoke re-run |

**Orphaned requirements check:** ROADMAP.md's Traceability table maps only ROUTE-02 to Phase 1. Both plans declare `requirements: [ROUTE-02]`. No orphans — full 1/1 coverage.

(ROUTE-01 is explicitly noted in ROADMAP.md as only foundationally touched by Phase 1 — "the document-level `lang=\"fa\" dir=\"rtl\"` foundation" — and completes in Phase 4. Not a Phase 1 requirement; correctly excluded from this phase's traceability row.)

### Anti-Patterns Found

None. Scanned all phase-modified/created files (`src/app/(fa)/layout.tsx`, `src/app/(fa)/fa/page.tsx`, `src/app/(en)/layout.tsx`, `src/app/global-not-found.tsx`, `scripts/checks/route-smoke.mjs`, `scripts/mobile-gate.mjs`, `scripts/fix-title-suffix.ts`) for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`/stub markers — zero matches.

### Human Verification Required

### 1. Authenticated dashboard chunk-load and re-export spot-check

**Test:** Sign in to Saeid's authenticated Chrome, open `/dashboard/author/posts/<id>/edit`, confirm the submit form renders with no chunk-load error in devtools console. Spot-check `/dashboard/admin/api-key` and `/dashboard/admin/suggest-category` render the author-side pages they re-export.
**Expected:** The lazy `next/dynamic()` import resolves cleanly; both admin re-export routes render the correct author-side component.
**Why human:** Requires an authenticated NextAuth session and browser devtools inspection — the one of 13 path-fix sites (the lazy dynamic import) that a type check cannot fully vouch for.

### 2. Visual `/fa` and branded-404 confirmation

**Test:** In Saeid's Chrome against `npx next start`: load `/fa` and confirm visual RTL styling; load `/` and confirm nav/footer unchanged; request a nonsense URL and confirm the branded 404 renders correctly.
**Expected:** `/fa` is a coherent right-to-left styled page; `/` is visually unchanged; 404 displays with its two CTA buttons.
**Why human:** Visual/typographic correctness needs eyes on a real render. This verifier already confirmed the functional substrate live (status 200, correct `lang`/`dir` attributes, one stylesheet link, Farsi text present, branded 404 body) — this item closes the remaining subjective/visual gap only.

### Gaps Summary

No gaps found. All 12 must-have truths (merged from ROADMAP.md's 4 Success Criteria and both plans' `must_haves.truths`) were independently re-verified against the live codebase — not merely accepted from SUMMARY.md. This included re-executing `route-smoke.mjs --verify` and `--fa-check` against a freshly started `npx next start -p 3100` server, re-running `mobile-gate.mjs --list-only`, independently re-deriving the route manifest from the live `.next` build output and diffing it against the committed evidence files, and re-computing the `frozen-files.sha` fingerprint. All matched exactly. The only reason status is `human_needed` rather than `passed` is the two pre-existing, plan-documented human-check items (authenticated dashboard chunk-load spot-check, and visual `/fa`/404 confirmation) that no automated check can close — these were already flagged as outstanding in both SUMMARY.md files and are not new findings.

---

_Verified: 2026-08-16T20:39:21Z_
_Verifier: Claude (gsd-verifier)_
