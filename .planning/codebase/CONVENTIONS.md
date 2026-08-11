# Coding Conventions

**Analysis Date:** 2026-08-11

## Naming Patterns

**Files:**
- Route handlers: `src/app/api/[resource]/route.ts` (App Router convention)
- Page components: `src/app/**/page.tsx`, colocated with `layout.tsx` where needed
- Visual guide pages: `src/app/visual-guides/[slug]/page.tsx` — thin server component that only sets `metadata` and renders a client component
- Visual guide client components: `src/components/VisualGuides/[GuideFolder]/[Guide]Client.tsx` (PascalCase folder per guide, `Client` suffix on the root component)
- One-off maintenance/check scripts: `scripts/[verb-noun].ts` or `.mjs` (e.g. `scripts/fix-title-suffix.ts`, `scripts/check-smtp-tls.ts`), or `scripts/checks/[topic].check.ts` for logic-check scripts
- Prisma one-off scripts: `prisma/[verb-noun].ts` (e.g. `prisma/mark-existing-users-verified.ts`, `prisma/verify-seed-state.ts`)

**Functions:**
- camelCase throughout (`checkRateLimit`, `slugifyFilename`, `generateShareToken`)
- Helper/pure-logic functions in `src/lib/*.ts` are named for what they compute, not how (`slugifyFilename`, not `getSlug`)

**Variables:**
- camelCase; SCREAMING_SNAKE_CASE for module-level constant config/data tables (e.g. `CATEGORIES`, `STATS_UNITS`, `DATA_UNITS` in `prisma/seed-guides.ts`; `GUIDE_EASE`, `GUIDE_VIEWPORT` in `src/lib/guideMotion.ts`)

**Types:**
- PascalCase for types/interfaces, matching Prisma model names where relevant

## Code Style

**Formatting:**
- No `.prettierrc` present in repo root — formatting relies on editor defaults / `eslint-config-next` conventions rather than a dedicated Prettier config
- 2-space indentation observed consistently across `.ts`/`.tsx` files

**Linting:**
- `eslint.config.mjs` uses flat config via `FlatCompat`, extending `next/core-web-vitals` and `next/typescript`
- Ignored paths: `node_modules/**`, `.next/**`, `out/**`, `build/**`, `next-env.d.ts`
- `next.config.ts` sets `eslint: { ignoreDuringBuilds: false }` and `typescript: { ignoreBuildErrors: false }` — **lint and type errors both fail the production build**; the gate is real, not bypassed
- `npm run lint` runs bare `eslint` (package.json script: `"lint": "eslint"`)
- Occasional targeted `eslint-disable` comments are used for justified exceptions, e.g. `prisma/seed-guides.ts`: `// eslint-disable-next-line @typescript-eslint/no-explicit-any` when casting the Prisma adapter client

## TypeScript Configuration

- `tsconfig.json`: `strict: true`, `target: ES2017`, `moduleResolution: "bundler"`, path alias `@/*` → `./src/*`
- `noEmit: true` — type checking only, verification via `npx tsc --noEmit`
- One legacy script (`prisma/mark-existing-users-verified.ts`) is explicitly excluded from the TS project in `tsconfig.json`'s `exclude` array

## Import Organization

**Path Aliases:**
- `@/*` maps to `src/*` — used pervasively for internal imports (`@/lib/sharedPdfs`, `@/components/VisualGuides/...`)
- Relative imports (`../../src/lib/...`) are only used from files outside `src/` (e.g. `scripts/checks/*.check.ts`), since those scripts run standalone via `tsx` and are not compiled through the Next.js alias resolver in all contexts

**Order:**
- No enforced import-sorting rule in ESLint config; observed order in files is: external packages first, then `@/` aliased internal modules, then relative imports (Node builtins like `node:fs`, `node:assert` first when present)

## Error Handling

**API routes** (`src/app/api/*/route.ts`):
- Rate limiting checked first via `checkRateLimit(key, limit, windowMs)` from `src/lib/rateLimit.ts`; on rejection, routes fail closed toward *not leaking information* rather than returning an explicit 429 with detail — e.g. `src/app/api/cv/route.ts` returns `{ verified: true }` on rate-limit hit to avoid account-enumeration side channels (comment references `S10`, a numbered security finding)
- Deliberate uniform responses to prevent enumeration attacks: comments explicitly document *why* an error path returns a generic/safe response, not just what it does
- No global error-handling middleware; each route handles its own try/catch and returns `NextResponse.json(...)` with explicit status codes

**Scripts:**
- Use Node's `assert` module for one-off logic checks (`node:assert`, `assert.strictEqual`, `assert.match`) rather than a test framework — see `scripts/checks/shared-pdfs-lib.check.ts`
- Scripts print a final pass/fail summary line and `process.exit(1)` on failure (see `scripts/mobile-gate.mjs`)

## Comments

**When to comment:**
- Comments explain *why*, especially around security decisions, hydration-safety constraints, and past-incident avoidance. Example: `src/components/VisualGuides/GuideCompletion.tsx` usage rules in `VISUAL_GUIDES_SPEC.md` §4 explicitly reference "a past incident" where `GuideCompletion` was mounted in a conditional subcomponent, causing broken completion state — this is preserved as a comment/spec rule so it is not reintroduced
- File-header comments on scripts describe purpose, usage command, and any caveats (e.g. `scripts/mobile-gate.mjs` header lists usage args and dependencies)

**No em dashes rule (repo-wide, code and content):**
- `src/lib/validatePassword.ts:4`: "Returns null when acceptable, otherwise a user-facing reason (no em dashes)."
- `VISUAL_GUIDES_SPEC.md` §13 Content Rules: "No em dashes in prose. Use commas, colons, or separate sentences."
- `VISUAL_GUIDES_SPEC.md` §14 also lists "No `Co-Authored-By` lines in commits" and "Do not push to remote before local verification" as house rules baked into the spec itself

## House Content Rules

**Title suffix convention:**
- Page `<title>` metadata uses the pattern `"[Title] | NeuroNomixer"` (pipe separator, not em dash)
- `scripts/fix-title-suffix.ts` is a maintenance script (documented as fixing finding "F5") that strips a stray `" — NeuroNomixer"` / `" | NeuroNomixer"` suffix from **top-level** `metadata.title` fields only, walking every `src/app/**/page.tsx`; it explicitly leaves `openGraph`/`twitter` nested titles untouched (tracked via brace-depth parsing of the nested block)
- `VISUAL_GUIDES_SPEC.md` §1 shows the canonical page boilerplate: `title: "[Guide Title] | NeuroNomixer"`

**Visual guide component standard:**
- `src/components/VisualGuides/VISUAL_GUIDES_SPEC.md` (v2, "Phase 3 canonical standard") is the governing internal spec for all 90+ visual guide pages. Reference implementation: `src/components/VisualGuides/TimeSeriesForecast/TimeSeriesForecastClient.tsx`
- Key rules an executor must follow when touching a guide:
  - Fixed shell structure (breadcrumb nav → gold-kicker hero → guide content), no per-category layout variation
  - `GuideCompletion` (`src/components/VisualGuides/GuideCompletion.tsx`) is the single writer of completion state; exactly one instance per guide, rendered only from the top-level `[Guide]Client.tsx`, never a subcomponent; `isComplete` must be gated by a real interaction flag (never `true` on mount, never a timer)
  - Design tokens are fixed hex values (`#0f172a` background, `#d4af37` gold accent, etc.); accent/warning/success colors must be referenced via CSS vars (`var(--color-accent)`, `var(--color-warning)`, `var(--color-success)`), never raw hex
  - Animation vocabulary comes only from `useGuideMotion()` in `src/lib/guideMotion.ts`; no ad-hoc Framer Motion variants; no `Math.random()` at module scope or in render (hydration mismatch) — use the documented deterministic LCG instead
  - No charting libraries (Recharts, Chart.js); SVG only
  - Guide order/category source of truth is `prisma/seed-guides.ts`

**Accessibility conventions (sliders, canvases, SVG):**
- Every `<input type="range">` must have an `aria-label` or visible `<label>` (`VISUAL_GUIDES_SPEC.md` §12)
- Toggle/tab rows use `role="radiogroup"` + `role="radio"` + `aria-checked`, or plain buttons with `aria-pressed`
- Completion announcements go only through the shared `GuideCompletion` component's `aria-live="polite"` region — guides must not add their own
- Interactive SVG/canvas visualizations need a keyboard-operable alternative or text equivalent
- Color is never the sole indicator of state (pair with shape/text/icon)
- Mobile-specific accessibility/usability rules (§15, v3): native range inputs inherit a shared 24px-tall hit area from `globals.css`; custom drag surfaces must set `touch-action: none` (`touch-none` in Tailwind) for a 40px+ hit area; no hover-only affordances — every `whileHover` needs a tap/focus equivalent, and copy must say "Tap or hover", never "Hover" alone
- `scripts/add-range-aria-labels.ts` exists as a maintenance script to backfill missing `aria-label`s on range inputs

## Function Design

- API route handlers are small, single-purpose, one exported function per HTTP verb (`GET`, `POST`) per `route.ts`
- Pure/testable logic is extracted into `src/lib/*.ts` (e.g. `src/lib/sharedPdfs.ts` exports `generateShareToken`, `slugifyFilename` as pure functions, deliberately separated from DB-touching logic like `getActiveShare` so they can be checked without a database)

## Module Design

- `src/lib/` holds cross-cutting pure/shared logic (rate limiting, password validation, motion tokens, PDF sharing helpers)
- No barrel (`index.ts`) re-export files observed; imports reference concrete file paths directly

---

*Convention analysis: 2026-08-11*
