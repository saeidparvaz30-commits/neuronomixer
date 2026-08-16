---
phase: 01-route-groups
reviewed: 2026-08-16T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - scripts/checks/route-smoke.mjs
  - scripts/fix-title-suffix.ts
  - scripts/mobile-gate.mjs
  - src/app/(en)/layout.tsx
  - src/app/(en)/studio/[[...tool]]/page.tsx
  - src/app/(fa)/fa/page.tsx
  - src/app/(fa)/layout.tsx
  - src/app/global-not-found.tsx
  - next.config.ts
findings:
  critical: 0
  warning: 3
  info: 8
  total: 11
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-08-16
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Reviewed the route-group restructure: the two coexisting root layouts, the global 404 contingency, the modified gate scripts, and the studio catch-all. The core architecture is sound and cross-checks verify: `icon.svg`, `robots.ts`, `sitemap.ts`, and `api/` correctly remained at the `src/app` root (outside both groups, so they apply site-wide); `(en)/not-found.tsx` still exists for in-group `notFound()` calls; the `global-not-found.tsx` html tag (`<html lang="en">`, no `dir`) matches exactly what `route-smoke.mjs --fa-check` asserts; the studio's 5-level relative import to `sanity.config` resolves correctly from its new depth; and `mobile-gate.mjs`'s new `(en)/visual-guides` path is clean (153 literal slug directories, no dynamic `[slug]` or underscore dirs to pollute `allSlugs()`).

Note: an automated scan flagged invisible unicode in `src/app/(fa)/fa/page.tsx`; this is U+200C (zero-width non-joiner) inside the Farsi word "می‌گیرد" — correct Persian orthography, not an injection vector.

No critical issues. Three warnings concern gate-script robustness and a latent line-ending defect in the codemod; the rest are informational.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: mobile-gate passes 404/error pages as "ok" — no HTTP status check

**File:** `scripts/mobile-gate.mjs:38-58`
**Issue:** `page.goto()` succeeds regardless of response status, and the pass/fail decision is based only on overflow/tiny-text/thin-slider metrics. A guide URL that returns 404 (now served by the minimal `global-not-found.tsx`, which has zero overflow, no `svg text`, no sliders) or a 500 error page will report `ok` and count toward `N/N passed`. This matters more after this phase: a route accidentally dropped from the `(en)` move, or a mistyped slug argument, silently passes the gate instead of failing it.
**Fix:**
```js
const resp = await page.goto(`${BASE}/visual-guides/${slug}`, { waitUntil: "networkidle2", timeout: 60000 });
if (!resp || resp.status() !== 200) {
  failures.push({ slug, status: resp?.status() ?? null });
  process.stdout.write(`FAIL ${slug}  status=${resp?.status()}\n`);
  continue;
}
```

### WR-02: GA scripts render unconditionally with unguarded env interpolation

**File:** `src/app/(en)/layout.tsx:50-67`
**Issue:** `process.env.NEXT_PUBLIC_GA_ID` is interpolated into both the gtag.js `src` and an inline `dangerouslySetInnerHTML` script with no guard. When the env var is unset (local dev, preview environments, fresh clones), the page requests `https://www.googletagmanager.com/gtag/js?id=undefined` and executes `gtag('config', 'undefined', ...)`, polluting analytics and wasting a network request on every page. Secondarily, string interpolation of an env value into an inline script is an injection surface if the variable is ever set from a less-trusted source (build-time env is currently deploy-controlled, so this is hardening, not an active vulnerability). This file moved byte-identical, so the defect is pre-existing — flagged because the file is in review scope and the fix is cheap.
**Fix:**
```tsx
{process.env.NEXT_PUBLIC_GA_ID && (
  <>
    <Script strategy="afterInteractive"
      src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} />
    <Script id="google-analytics" strategy="afterInteractive" ... />
  </>
)}
```

### WR-03: fix-title-suffix strips `\r` from modified lines on CRLF files (mixed line endings)

**File:** `scripts/fix-title-suffix.ts:25,30,48,53`
**Issue:** The file is read and split on `"\n"`, so on CRLF checkouts (this is a Windows machine; git autocrlf commonly yields CRLF working files) each line retains a trailing `\r`. `TITLE_RE` ends with `(",?)\s*$` — the `\s*` consumes the `\r` — and the replacement `${m[1]}${m[2]}${m[4]}` does not restore it. Result: every rewritten line becomes LF while untouched lines stay CRLF, producing mixed line endings and noisy diffs in every file the codemod touches.
**Fix:** Capture and restore the tail:
```ts
const TITLE_RE = /^(\s*title:\s*")(.*?)(\s*(?:—|\|)\s*NeuroNomixer)(",?\s*)$/;
// replacement: `${m[1]}${m[2]}${m[4]}`  (m[4] now preserves trailing \r)
```
or split on `/\r?\n/` and rejoin with the file's detected EOL.

## Info

### IN-01: route-smoke baseline records `base` but --verify never checks it

**File:** `scripts/checks/route-smoke.mjs:219,223-241`
**Issue:** `--record` persists `base` (and implicitly the server mode via the header comment's "keep both runs on the same server mode" instruction), but `--verify` never compares `baseline.base` against the current `BASE`, nor records/validates dev-vs-prod mode. A baseline recorded against one server and verified against another produces misleading field diffs (e.g., `contentType`) or a silently wrong-target verification.
**Fix:** In `--verify`, warn or fail when `baseline.base !== BASE`.

### IN-02: No `(fa)` not-found — all `/fa/*` unmatched URLs get the English LTR 404

**File:** `src/app/(fa)/layout.tsx` (absence of `not-found.tsx`)
**Issue:** `/fa/anything` matches no route, so `global-not-found.tsx` serves it with `lang="en"`, LTR, English copy, and links to the English `/` and `/blog`. Acceptable for the placeholder phase (and the smoke check codifies this behavior), but a Farsi-localized not-found inside `(fa)` should be tracked for the phase that adds real `/fa` routes.
**Fix:** Add `src/app/(fa)/not-found.tsx` (RTL, Farsi copy) in a later phase; note that `global-not-found` will still serve fully-unmatched `/fa/*` URLs, so deep Farsi 404 coverage needs a `(fa)/fa/[...catchall]` or equivalent.

### IN-03: fix-title-suffix brace counting breaks on braces inside string values

**File:** `scripts/fix-title-suffix.ts:41-42`
**Issue:** `depthSinceNested` counts every `{`/`}` character on a line, including those inside string literals (e.g., a title or alt text containing `}`). An unbalanced brace inside a string closes or extends the nested block incorrectly, which can strip a nested openGraph/twitter title or skip a legitimate top-level one. Low likelihood for this codebase's metadata; acceptable for a one-shot codemod.
**Fix:** None required for a one-off script; if reused, strip string literals before counting braces.

### IN-04: Gate scripts are cwd-dependent with no guard

**File:** `scripts/checks/route-smoke.mjs:26-27`, `scripts/fix-title-suffix.ts:24`
**Issue:** `BASELINE_PATH` and `collectPageFiles("src/app")` are relative to `process.cwd()`. Run from anywhere but the repo root, route-smoke writes/reads the baseline in the wrong place and fix-title-suffix throws an unhelpful `ENOENT`.
**Fix:** Resolve against `import.meta.url`/`__dirname`, or fail fast with a clear message when `src/app` is absent.

### IN-05: JSDoc `@type` annotation is inert in a `.ts` file

**File:** `next.config.ts:1-2`
**Issue:** `/** @type {import('next').NextConfig} */` only provides type checking in `.js` files. In `.ts` it is ignored, so `nextConfig` is unvalidated — a typo like `experimental: { globalNotfound: true }` would compile silently and disable the 404 contingency this phase depends on.
**Fix:**
```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = { ... };
```

### IN-06: `(fa)` layout metadata lacks description and title template

**File:** `src/app/(fa)/layout.tsx:3-6`
**Issue:** The `(fa)` root layout defines only `metadataBase` and a bare string `title`. Future `/fa` pages without their own metadata inherit no description and no `"%s | ..."` template (the placeholder page currently supplies both itself). Fine for a scaffold; worth aligning when real Farsi content lands.
**Fix:** Mirror the `(en)` shape with a Farsi `title.template`/`default` and `description`.

### IN-07: route-smoke fetches have no timeout

**File:** `scripts/checks/route-smoke.mjs:52-53,78,96`
**Issue:** All `fetch` calls run without `AbortSignal.timeout`, so a hung dev server stalls the gate indefinitely instead of failing.
**Fix:** `fetch(BASE + url, { redirect: "follow", signal: AbortSignal.timeout(30_000) })`.

### IN-08: Hardcoded Chrome executable path

**File:** `scripts/mobile-gate.mjs:12`
**Issue:** `C:/Program Files/Google/Chrome/Application/chrome.exe` is machine-specific with no existence check; on any other layout, puppeteer throws a cryptic launch error. Pre-existing (only the guides path changed this phase).
**Fix:** Allow `process.env.CHROME_PATH ?? CHROME` and check `existsSync` before launch.

---

_Reviewed: 2026-08-16_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
