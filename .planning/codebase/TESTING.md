# Testing Patterns

**Analysis Date:** 2026-08-11

## No Unit-Test Framework — This Is Intentional, Not a Gap

There is no vitest, jest, or any `*.test.*`/`*.spec.*` file anywhere in `src/`. This is the
actual, deliberate verification strategy for this repo, not an oversight to "fix" by bolting
on a framework. Treat the mechanisms below as the real test suite when planning or executing
work here:

1. **Type checking:** `npx tsc --noEmit` — currently 0 errors. This is the fastest, cheapest
   correctness gate and should be run after any non-trivial change.
2. **Production build:** `npx next build` (chains `prisma generate && prisma migrate deploy
   && next build` per the `"build"` script in `package.json`) — catches build-time errors,
   static generation failures, and (per `next.config.ts`) both ESLint errors
   (`ignoreDuringBuilds: false`) and TypeScript errors (`ignoreBuildErrors: false`).
   **Do not run this in an agent/automated context** — it runs `prisma migrate deploy`
   against the live production database as a side effect.
3. **One-off check scripts run via `npx tsx`:** pure-logic verification scripts, not part of
   any CI-integrated suite, invoked manually. Example: `scripts/checks/shared-pdfs-lib.check.ts`
   uses Node's built-in `assert` module to check `generateShareToken`/`slugifyFilename` from
   `src/lib/sharedPdfs.ts` (token length/alphabet/uniqueness over 1000 draws, slug edge cases
   including non-ASCII fallback). Run with `npx tsx scripts/checks/shared-pdfs-lib.check.ts`;
   prints `ALL PASS` or throws on `assert` failure.
4. **Mobile/visual gate:** `scripts/mobile-gate.mjs` — a Playwright-adjacent Puppeteer
   (`puppeteer-core` + system Chrome, no new browser download) script that drives every
   built visual guide page at a 360px viewport and asserts:
   - no horizontal overflow (`document.documentElement.scrollWidth - clientWidth <= 5`)
   - no SVG `<text>` elements under 9px rendered height (excludes `svg[aria-hidden="true"]`
     decorative icons, per SPEC §15.3 which scopes the rule to informative text only)
   - no `<input type="range">` shorter than 20px tall (thin-slider touch-target check)

   Requires a local dev server already running (`npx next dev`, default
   `http://localhost:3000`, overridable via `GATE_BASE_URL`). Usage:
   ```bash
   node scripts/mobile-gate.mjs                # all built guides (reads src/app/visual-guides/*/page.tsx)
   node scripts/mobile-gate.mjs some-guide-slug # one guide
   node scripts/mobile-gate.mjs --list-only     # print discoverable slugs, exit
   ```
   Exits non-zero and dumps a JSON failure list if any guide fails; this is the enforcement
   mechanism for `VISUAL_GUIDES_SPEC.md` §15 (Mobile / Responsive rules).
5. **Manual browser smoke:** for anything not covered by the above (auth flows, admin
   dashboard, email delivery, Sanity content rendering), verification is manual: run
   `npm run dev`, exercise the flow in a browser. There is no automated E2E suite
   (no Playwright test runner, no Cypress).

## Framework / Tooling Present

**Present:**
- TypeScript compiler (`typescript` devDependency) — the primary correctness gate via
  `tsc --noEmit`
- ESLint 9 flat config (`eslint.config.mjs`, extends `next/core-web-vitals` + `next/typescript`)
  — `npm run lint` runs bare `eslint`; also enforced during `next build`
- `tsx` (devDependency) — the runner for all one-off/check/maintenance scripts, both under
  `scripts/` and `prisma/`
- `puppeteer-core` — used exclusively by `scripts/mobile-gate.mjs`, not a general test runner

**Absent:**
- No vitest, jest, mocha, or any assertion-library-based unit test runner wired into
  `package.json` scripts
- No Playwright test runner (`@playwright/test`) — only `puppeteer-core` for the mobile gate
- No CI config found (no `.github/workflows/` observed) — verification is run locally by hand
  before pushing, per the repo's own house rule ("Do not push to remote before local
  verification", `VISUAL_GUIDES_SPEC.md` §14)
- No coverage tooling

## Script Conventions (the closest thing to a "test suite" here)

**Location and naming:**
- Logic-check scripts: `scripts/checks/[topic].check.ts` — DB-free, pure-function checks
  using `node:assert`
- General maintenance/verification scripts: `scripts/[verb-noun].ts` or `.mjs`
- Prisma-adjacent scripts: `prisma/[verb-noun].ts` (seed, verify, one-off data migrations)

**Shape of a check script** (`scripts/checks/shared-pdfs-lib.check.ts` as the reference
pattern):
```typescript
import assert from "node:assert";
import { generateShareToken, slugifyFilename } from "../../src/lib/sharedPdfs";

const tokens = new Set(Array.from({ length: 1000 }, () => generateShareToken()));
for (const t of tokens) {
  assert.strictEqual(t.length, 22, `token length ${t.length}`);
  assert.match(t, /^[A-Za-z0-9_-]+$/, `token alphabet: ${t}`);
}
assert.strictEqual(tokens.size, 1000, "tokens must not collide in 1000 draws");
console.log("shared-pdfs-lib.check.ts: ALL PASS");
```
- Header comment states purpose and exact run command
- Explicitly notes what is *not* covered (DB-touching functions like `getActiveShare` are
  left to manual verification, not faked with a DB mock)
- On success: prints a plain "ALL PASS" line. On failure: an unhandled `AssertionError`
  throws and the script exits non-zero — no custom test-runner reporting layer

**Shape of a Prisma verify script** (`prisma/verify-seed-state.ts`):
```typescript
/** Read-only post-seed verification. Run: npx tsx prisma/verify-seed-state.ts */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env" });
const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  // queries DB, console.logs counts/state for manual eyeballing
}
```
Pattern: loads `.env` via `dotenv`, connects with `PrismaPg` adapter (Prisma 7 driver-adapter
style, not the legacy `datasources` URL config), runs read-only queries, and prints
human-readable summary lines for a person to check by eye. This is a report script, not an
assertion-based test — there is no pass/fail exit code from it.

**Seed script** (`prisma/seed-guides.ts`):
- Registered via `package.json`: `"prisma": { "seed": "tsx prisma/seed-guides.ts" }`, run with
  `npx prisma db seed`
- Explicitly documented as idempotent (safe to re-run)
- Source of truth for the Visual Guides curriculum: category/unit/guide ordering, slugs,
  colors — `VISUAL_GUIDES_SPEC.md` §8 defers to this file as canonical for guide order

## When Adding New Verification

Follow the existing pattern rather than introducing a new framework:
- Pure-function logic → a `.check.ts` script under `scripts/checks/`, using `node:assert`,
  run manually via `npx tsx`
- DB state sanity checks → a `prisma/verify-*.ts` read-only report script
- New visual guide → must pass `scripts/mobile-gate.mjs` for its slug before shipping, and
  satisfy the full checklist in `VISUAL_GUIDES_SPEC.md` §12 (accessibility) and §15 (mobile)
- Any change → `npx tsc --noEmit` clean, `eslint` clean, before commit/push

---

*Testing analysis: 2026-08-11*
