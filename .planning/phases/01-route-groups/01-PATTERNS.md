# Phase 1: Route Groups - Pattern Map

**Mapped:** 2026-08-13
**Files analyzed:** 6 distinct authoring targets (plus 243 pure renames with no content change)
**Analogs found:** 6 / 6

> Phase 1 is a directory move. 233 of the 243 moved files are byte-identical renames with **no pattern decision at all** — `git mv` and stop. This map only covers the files where something is *authored or edited*.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/app/(en)/layout.tsx` | root layout (RSC) | request-response (HTML doc) | `src/app/layout.tsx` (itself, moved) | exact — same file, 1 line edited |
| `src/app/(fa)/layout.tsx` | root layout (RSC) | request-response (HTML doc) | `src/app/layout.tsx` | role-match (deliberately reduced) |
| `src/app/(fa)/fa/page.tsx` | page (RSC, static) | request-response | `src/app/privacy/page.tsx` | exact |
| `src/app/(en)/studio/[[...tool]]/page.tsx` | page (catch-all) | request-response | itself, moved | exact — 1 specifier edited |
| 8 files under `src/app/(en)/dashboard/` | page / loader | request-response | themselves, moved | exact — 9 specifiers, mechanical prefix |
| `scripts/mobile-gate.mjs` | verification script | file-I/O discovery + browser | itself | exact — 1 line |
| `scripts/fix-title-suffix.ts` | codemod script | file-I/O | itself | exact — 1 line |
| `scripts/checks/route-smoke.mjs` **(NEW)** | verification script | request-response (fetch) | `scripts/checks/shared-pdfs-lib.check.ts` (assert style) + `scripts/mobile-gate.mjs` (CLI/BASE-URL style) | role-match, two-source composite |

## Pattern Assignments

### `src/app/(en)/layout.tsx` (root layout, request-response)

**Analog:** `src/app/layout.tsx` — this IS the file. It moves verbatim; **exactly one line changes**.

The full current content is the pattern. Line 1 only:

```diff
-import "../styles/globals.css";
+import "@/styles/globals.css";
```

Everything from line 2 to line 79 must survive **byte-identical**. Reproduced here so the planner can assert non-drift, and because three of these are load-bearing for the phase's own gates:

```tsx
import { Inter } from "next/font/google";
import ConditionalChrome from "@/components/appSkeleton/ConditionalChrome";
import { GeneralSignupPrompt } from "@/components/prompts";
import { FlushPendingCompletions } from "@/components/FlushPendingCompletions";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import GoogleAnalyticsTracker from "@/components/appSkeleton/GoogleAnalyticsTracker";
import NextAuthProvider from "@/components/appSkeleton/NextAuthProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
```

**Document shell pattern** (lines 44-48) — the `<html lang>` + `<body className>` shape the `(fa)` layout mirrors:

```tsx
return (
  <html lang="en">
    <body
      className={`${inter.variable} bg-[var(--background)] text-[var(--color-text)] transition-colors duration-300`}
    >
```

**Provider/chrome nesting** (lines 69-75) — dropping any of these silently breaks auth session context or analytics on every English page (ASVS V2 note in RESEARCH):

```tsx
<NextAuthProvider>
  <ConditionalChrome>{children}</ConditionalChrome>
  <GeneralSignupPrompt />
  <FlushPendingCompletions />
  <GoogleAnalyticsTracker />
  <SpeedInsights />
</NextAuthProvider>
```

**Metadata pattern** (lines 17-37) — `metadataBase` + `title.template` is the convention the `(fa)` layout copies in reduced form:

```tsx
export const metadata = {
  metadataBase: new URL("https://www.neuronomixer.com"),
  title: { default: "NeuroNomixer", template: "%s | NeuroNomixer" },
  description: "...",
  openGraph: { siteName: "NeuroNomixer", type: "website" as const, images: [...] },
  twitter: { card: "summary_large_image" as const, site: "@neuronomixer" },
  other: { "google-site-verification": "..." },
};
```

**Verification assertion for the planner:** `git diff -M --stat` on this file must show a rename with exactly 1 changed line. Any larger delta means chrome was lost.

---

### `src/app/(fa)/layout.tsx` (root layout, request-response) — NEW

**Analog:** `src/app/layout.tsx`, but **subtractively**. Copy only three things from it: the stylesheet import (alias form), `metadataBase`, and the `<body>` background/text classes. Take nothing else.

**Copy — stylesheet import (from `(en)` line 1, alias form):**
```tsx
import "@/styles/globals.css";
```
Non-obvious WHY: Tailwind is loaded per root layout, not globally. Without this line every `/fa` page renders completely unstyled.

**Copy — metadataBase (from `(en)` line 18):**
```tsx
export const metadata = {
  metadataBase: new URL("https://www.neuronomixer.com"),
  title: "NeuroNomixer",
};
```
Non-obvious WHY: without `metadataBase`, relative OG image URLs on `/fa` resolve against `localhost` at build time.

**Copy — body classes (from `(en)` line 47), minus `${inter.variable}` and minus the transition:**
```tsx
export default function FaRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="bg-[var(--background)] text-[var(--color-text)]">{children}</body>
    </html>
  );
}
```

**Do NOT copy** (all Phase 4): `Inter`/`--font-sans`, the two GA `<Script>` blocks, `NextAuthProvider`, `ConditionalChrome`, `GeneralSignupPrompt`, `FlushPendingCompletions`, `GoogleAnalyticsTracker`, `SpeedInsights`, `title.template`, openGraph/twitter/`google-site-verification`.

---

### `src/app/(fa)/fa/page.tsx` (page, request-response) — NEW

**Analog:** `src/app/privacy/page.tsx` — the repo's simplest static RSC page. Same shape: a bare `export const metadata`, a default function, a single `<main>` with the site's CSS-variable colour tokens.

**Full pattern to mirror** (`privacy/page.tsx:1-13`):

```tsx
export const metadata = {
  title: "Privacy Policy",
  description: "...",
  alternates: { canonical: "https://www.neuronomixer.com/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-[var(--color-text)]">
      <h1 className="text-4xl font-bold mb-8 text-[var(--color-accent)]">
        Privacy Policy
      </h1>
```

**Conventions to carry over:** no `"use client"`; colours via `var(--color-text)` / `var(--color-accent)` / `var(--background)`, never hard-coded hex; container is `max-w-4xl mx-auto px-6 py-16`; metadata is a plain object literal, not `Metadata`-typed (this repo does not import the `Metadata` type in page files).

**Deviation required:** the `/fa` page body is Farsi text, so no `alternates.canonical` yet (Phase 5 owns hreflang/canonical). Keep it to a heading and a sentence — the RESEARCH says "any minimal page satisfies the criteria."

---

### `src/app/(en)/studio/[[...tool]]/page.tsx` (page, request-response)

**Analog:** itself. One specifier, line 11:

```diff
-import config from "../../../../sanity.config";
+import config from "../../../../../sanity.config";
```

The `@/` alias cannot express this (it maps to `./src/*`; `sanity.config.ts` is at the repo root). Relative is correct here and is the only file in the moved tree where relative form survives.

---

### 8 files under `src/app/(en)/dashboard/` (9 specifiers)

**Analog:** each file is its own analog. The pattern is **mechanical prefix insertion**, `@/app/` → `@/app/(en)/`, nothing else. Do not convert to relative form (global CLAUDE.md: no surrounding cleanup).

Two distinct shapes appear. Shape A, pure re-export (2 sites):
```diff
-export { default } from "@/app/dashboard/author/api-key/page";
+export { default } from "@/app/(en)/dashboard/author/api-key/page";
```

Shape B, component/type import (6 sites), e.g.:
```diff
-import CVDesignerClient from "@/app/dashboard/author/cv/designer/CVDesignerClient";
+import CVDesignerClient from "@/app/(en)/dashboard/author/cv/designer/CVDesignerClient";
```

**The 9th site is the dangerous one** — a dynamic `import()` inside `next/dynamic` at `EditPostFormLoader.tsx:11`. It follows Shape B textually but `tsc` may not catch a stale one; it fails at runtime as a chunk-load error on the post-edit page. Same mechanical edit, plus a browser smoke of `/dashboard/author/posts/<id>/edit`.

Exhaustive site list is in RESEARCH.md Pitfall 2 — use it verbatim; do not re-grep and risk missing the dynamic one.

---

### `scripts/mobile-gate.mjs` (verification script, file-I/O discovery)

**Analog:** itself. The discovery function is the whole surface:

```js
function allSlugs() {
  const dir = path.join(process.cwd(), "src", "app", "visual-guides");
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(path.join(dir, e.name, "page.tsx")))
    .map((e) => e.name)
    .sort();
}
```

Edit line 16 to `path.join(process.cwd(), "src", "app", "(en)", "visual-guides")`. Note the existing style: path segments as **separate `path.join` arguments**, never a slash-joined string — follow it, so `(en)` stays its own argument and no shell/path quoting question arises.

**Optional zero-guard** (RESEARCH recommends; planner decides solo-commit purity). It belongs right after line 25 `const targets = ...`, before the `--list-only` branch, matching the script's existing `process.exit(1)` + `console.log` failure style from lines 68-72:

```js
console.log(`\n${targets.length - failures.length}/${targets.length} passed`);
if (failures.length) { console.log(JSON.stringify(failures, null, 2)); process.exit(1); }
```

---

### `scripts/fix-title-suffix.ts` (codemod script, file-I/O)

**Analog:** itself. Line 29 only:

```diff
-  if (file.replace(/\\/g, "/") === "src/app/page.tsx") continue; // handled manually (absolute)
+  if (file.replace(/\\/g, "/") === "src/app/(en)/page.tsx") continue; // handled manually (absolute)
```

The recursive `collectPageFiles("src/app")` on line 24 needs **no** change — it descends one extra level and still finds every page. Keep the trailing comment.

---

### `scripts/checks/route-smoke.mjs` (verification script, request-response) — NEW, Wave 0

No exact analog exists (no fetch-based smoke script in the repo). Compose from two:

**Assertion + exit style — copy from `scripts/checks/shared-pdfs-lib.check.ts`:**
```ts
/**
 * Logic checks for src/lib/sharedPdfs.ts. Run: npx tsx scripts/checks/shared-pdfs-lib.check.ts
 * DB-free: only pure helpers are checked here; ...
 */
import assert from "node:assert";
...
console.log("shared-pdfs-lib.check.ts: ALL PASS");
```
Carry over: a top-of-file docblock naming the exact run command and the scope/limits; `node:assert` with a message string on every assertion; a single `ALL PASS` line on success (non-zero exit comes from the thrown assertion).

**CLI + base-URL style — copy from `scripts/mobile-gate.mjs` lines 4-13, 23-29:**
```js
// Usage: node scripts/mobile-gate.mjs [slug ...]        (no args = all built guides)
//        node scripts/mobile-gate.mjs --list-only       (print slugs and exit)
// Requires a dev server on localhost:3000 (npx next dev).
const BASE = process.env.GATE_BASE_URL ?? "http://localhost:3000";

const args = process.argv.slice(2);
if (args.includes("--list-only")) { console.log(targets.join("\n")); process.exit(0); }
```
Carry over: `GATE_BASE_URL` env override with a localhost default (**this exact env var name** — it is the established convention and lets both gates run against one dev server); `--flag` parsing via plain `process.argv.slice(2)` + `args.includes(...)`; a per-item `ok  ` / `FAIL` line written with `process.stdout.write`; a summary `n/total passed` line; `process.exit(1)` with a JSON dump of failures.

**Extension:** `--record` / `--verify` flags per RESEARCH. File extension `.mjs` + top-level `await` (matches `mobile-gate.mjs`, which uses top-level `await` at line 31) rather than `.ts` + `tsx`, because it needs no repo imports.

## Shared Patterns

### Path aliasing
**Source:** `tsconfig.json` → `{"@/*": ["./src/*"]}`; usage in `src/app/layout.tsx:3-9`
**Apply to:** every moved file with a broken specifier
`@/` is a **path prefix, not a logical module name**. That is precisely why 9 `@/app/...` imports break. Rule for this phase: anything under `src/` uses `@/`; anything outside `src/` (only `sanity.config.ts`) uses relative.

### Colour tokens
**Source:** `src/app/layout.tsx:47`, `src/app/privacy/page.tsx:10-11`
**Apply to:** `(fa)/layout.tsx`, `(fa)/fa/page.tsx`
```tsx
className="bg-[var(--background)] text-[var(--color-text)]"
className="text-[var(--color-accent)]"
```
Never hard-code colours; the theme variables come from `src/styles/variables.css` via `globals.css`.

### Verification script conventions
**Source:** `scripts/mobile-gate.mjs`, `scripts/checks/shared-pdfs-lib.check.ts`
**Apply to:** `scripts/checks/route-smoke.mjs`
- Docblock with the literal run command at the top of the file
- `GATE_BASE_URL` env override, localhost:3000 default
- `node:assert`, zero new dependencies, no test framework
- Non-zero exit on failure, human-readable per-item progress lines
- `.mjs` + `node` for dependency-free scripts; `.ts` + `npx tsx` only when importing from `src/`

### Files that must NOT change
**Source:** RESEARCH success criterion 4
**Apply to:** the whole phase
`src/middleware.ts` and `src/components/appSkeleton/ConditionalChrome.tsx` — assert an empty `git diff` on both. `ConditionalChrome`'s `usePathname().startsWith("/cv/")` branch is explicitly out of scope.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `scripts/checks/route-smoke.mjs` | verification script | request-response | No fetch-based HTTP smoke script exists in the repo. Composited above from the assert-style of `shared-pdfs-lib.check.ts` and the CLI/base-URL style of `mobile-gate.mjs`; no third pattern needed. |
| (baseline manifest one-liners) | — | — | Inline `node -e` commands, not files. RESEARCH supplies them verbatim; no pattern decision. |

## Metadata

**Analog search scope:** `src/app/` (root files + one representative simple page), `scripts/`, `scripts/checks/`
**Files read:** 6 (`src/app/layout.tsx`, `src/app/privacy/page.tsx`, `scripts/mobile-gate.mjs`, `scripts/fix-title-suffix.ts`, `scripts/checks/shared-pdfs-lib.check.ts`, `01-RESEARCH.md`)
**Pattern extraction date:** 2026-08-13
