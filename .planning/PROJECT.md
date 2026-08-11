# NeuroNomixer

## What This Is

NeuroNomixer (www.neuronomixer.com) is a live Next.js 15 publishing platform for AI, data, and applied-analytics content, combining a Sanity-backed blog with a catalog of ~151 interactive "visual guides" that teach technical concepts through real in-browser computation rather than static diagrams. It is written and run by one person, Saeid Sheikhi, and serves readers who want technically honest explanations they can poke at.

The current milestone adds a **Farsi edition** at `neuronomixer.com/fa`: the blog translated and published in Persian, with localized right-to-left chrome, driven by an automated Claude translation pipeline that produces reviewable drafts rather than auto-published output.

## Core Value

Every published claim is correct and checkable. The platform's whole differentiator is that its numbers are really computed and its explanations survive scrutiny, so anything that puts unverified content under Saeid's byline is a failure regardless of how much reach it buys.

## Requirements

### Validated

Shipped, live, and relied upon. Inferred from the codebase map and production history.

- ✓ Sanity-backed blog with Portable Text rendering, categories, authors, and an editorial `status` workflow (existing)
- ✓ ~151 interactive visual guides across ~797 `.tsx` files, catalog metadata in Postgres, governed by `src/components/VisualGuides/VISUAL_GUIDES_SPEC.md` (existing)
- ✓ Mobile standard enforced by an automated 360px gate (`scripts/mobile-gate.mjs`) across the whole guide catalog (existing)
- ✓ Account system on next-auth v5 with email verification, password policy, and role/suspension gating (existing)
- ✓ Reader engagement in Postgres: views, likes, bookmarks, comments, reading history, guide completions (existing)
- ✓ Link-only shared PDFs on Vercel Blob with view tracking and full noindex isolation (existing)
- ✓ AI CV designer on the Anthropic SDK with token accounting via the `TokenUsage` model (existing)
- ✓ Semantic content search over posts and research via a local pgvector-backed MCP server (existing)
- ✓ SEO surface: sitemap including published guides, `robots.ts` gated on `VERCEL_ENV`, branded OG images, canonical titles (existing)
- ✓ Hardened auth and API surface following a completed seven-phase remediation program (existing)

### Active

The Farsi edition milestone. Design approved 2026-08-11.

- [ ] Farsi blog reachable at `neuronomixer.com/fa` with correct `lang="fa"` and `dir="rtl"` at the document level
- [ ] Existing English routes keep their exact URLs and rendering behavior
- [ ] Sanity models Farsi posts as sibling documents linked to their English source
- [ ] Blog queries read from a single shared module and filter by language in exactly one place
- [ ] A script translates approved English posts to Farsi drafts, preserving Portable Text structure, links, and code
- [ ] Translation output is checked for drift in numbers, dates, URLs, entity names, and glossary terms before it reaches Saeid
- [ ] Saeid publishes Farsi posts himself; nothing goes live unreviewed
- [ ] Site chrome, dates, and numerals render correctly in Farsi and right-to-left
- [ ] Search engines see correct hreflang pairing and Farsi URLs in the sitemap

### Out of Scope

- **A `.ir` domain**: Google hard-geotargets country ccTLDs and `.ir` is not on its generic list, so it would geo-fence rankings to Iran, the one country the host cannot serve. Cold domain authority, and IRNIC can suspend under its content clause.
- **Serving readers inside Iran**: Vercel's upstream (AWS) blocks OFAC-sanctioned countries. Reaching Iran needs a second origin, which is a hosting decision, not a translation one.
- **Translating the 151 visual guides**: 797 `.tsx` files with English baked into JSX, SVG axis labels, and slider labels, plus an RTL-page/LTR-chart problem and a re-run of the 360px gate against Farsi glyph metrics. Its own milestone.
- **Dashboard, auth flows, CV designer, shared PDFs, admin**: internal or single-user surfaces with no Farsi audience.
- **Farsi-native original content**: this milestone translates. Writing original Persian is a second content operation, not an automation.
- **Fully automatic publishing**: contradicts Core Value.
- **Monetization of the Farsi edition**: not a goal.

## Context

- **Approved design spec**: `C:\Users\saeid\Desktop\Agent Simorgh\projects\NeuroNomixer\plan\2026-08-11-farsi-edition-design.md` (+ `.html`). It carries the decision record, rejected alternatives, and cost analysis. Read it before planning any phase.
- **Codebase map**: `.planning/codebase/` (7 documents, generated 2026-08-11 at `5ea9ddb`).
- Two content systems coexist and must not be conflated: blog content lives in Sanity as Portable Text; guide content is hand-authored React with only catalog metadata in Postgres.
- `src/app/layout.tsx` is currently the **sole** root layout, so a second locale root requires route groups with sibling root layouts.
- Chrome is currently selected by a client-side `usePathname().startsWith("/cv/")` test in `ConditionalChrome.tsx`, which does not extend to a locale split.
- Blog GROQ queries are duplicated inline across three page files with no shared query module.
- `src/middleware.ts` matches only `/dashboard/:path*`, so `/fa` needs no middleware change.
- Blog posts render with ISR (`revalidate = 3600`); guide pages are fully static.
- No i18n library is installed anywhere in the repo.
- Translation economics were measured, not guessed: the whole backlog costs under $5 on Sonnet 5 with the Batch API. Cost is not a constraint on this milestone.

## Constraints

- **Tech stack**: Next.js 15 App Router, TypeScript, Tailwind v4, Prisma 7 + Supabase Postgres, Sanity, next-auth v5, Vercel. Required because this is a live production site, not a greenfield build.
- **Build safety**: never run `npm run build` locally; it chains `prisma migrate deploy`, and local `.env` resolves to the production database. Gate with `npx next build`.
- **Environment**: `.env.local` points at the preview database and overrides `.env` for Next.js and `node --env-file`, while the Prisma CLI reads `.env` and hits production. This is easy to misread in both directions.
- **Quality gates**: `tsc --noEmit` at 0 errors and the lint gate is ON (`ignoreDuringBuilds: false`, `ignoreBuildErrors: false`). Both are hard-enforced in `next.config.ts`.
- **Testing**: no unit-test framework exists by design. Verification is type checks, `npx tsx` check scripts, the 360px mobile gate, and manual browser smoke.
- **Preview verification**: Vercel previews sit behind SSO with no automation-bypass secret, so Playwright cannot reach them. Browser checks ride an authenticated session.
- **Dependencies**: no new dependency without Saeid's explicit approval.
- **Remote state**: no push, merge, or deploy without an explicit Saeid gate.
- **Content rules**: no references to USA, America, or Israel; no em dashes in English prose; byline is always Saeid Sheikhi.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Farsi lives at `neuronomixer.com/fa`, not a `.ir` domain | ccTLD geotargeting would fence rankings to a country the host cannot serve; subdirectory inherits existing domain authority | Pending |
| Audience is Farsi speakers globally, not readers inside Iran | Vercel/AWS blocks OFAC-sanctioned countries; serving Iran is a hosting problem outside this milestone | Pending |
| Route groups with two root layouts, not a `[locale]` segment | A locale segment would touch 151 guide routes, dashboard, auth, and every API route for no benefit; a `headers()` scheme would kill static generation | Pending |
| Two plain Sanity fields (`language`, `translationOf`) instead of `@sanity/document-internationalization` | Same result for one language pair with no new dependency, and it gives hreflang a direct edge | Pending |
| Claude Sonnet 5 via Batch API for translation | DeepL has no Persian; Google Translate is pricier here and worse at unstandardized Farsi ML terminology | Pending |
| Translate to draft, verify, human publish | Core Value forbids unreviewed content under Saeid's byline; the verify pass costs cents | Pending |
| Guides deferred to a later milestone | String extraction across 797 files plus RTL charts plus a glyph-metric gate re-run is its own program | Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. Is "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check: is it still the right priority?
3. Audit Out of Scope; reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-11 after initialization*
