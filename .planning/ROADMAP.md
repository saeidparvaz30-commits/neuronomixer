# Roadmap: NeuroNomixer Farsi Edition

## Overview

Publish a Farsi edition of the NeuroNomixer blog at `neuronomixer.com/fa`. The journey: first split the app into two route groups so a second root layout can exist without touching a single English URL; then teach Sanity to model language siblings and make every blog query read from one shared, language-filtered module; then build the Claude Batch API translation pipeline that turns approved English posts into structurally intact Farsi drafts with an automated drift check; then build the Farsi routes and fully right-to-left chrome; finally wire hreflang and the sitemap, smoke the preview, translate the full backlog, and hand publishing to Saeid. Phase structure approved by Saeid 2026-08-13.

**Requirement source:** PROJECT.md `### Active` section. IDs assigned below in the Traceability table.

## Standing Constraints (non-negotiable, apply to every phase)

- **NEVER run `npm run build` locally.** It chains `prisma migrate deploy` against the PRODUCTION database (local `.env` resolves to prod for the Prisma CLI, while `.env.local` points at the preview DB for Next.js). The build gate is `npx next build`.
- `npx tsc --noEmit` at 0 errors at every gate; the lint gate is ON. No test framework exists by design: verification is `npx tsx` check scripts plus browser smoke.
- No new dependency without Saeid's explicit approval (the design avoids needing any).
- No push, merge, or deploy without an explicit Saeid gate.
- The 151 visual guides are OUT OF SCOPE for this milestone.
- Content rules: no USA/America/Israel references; byline is always Saeid Sheikhi; no em dashes in English prose (the em-dash rule does not apply to Farsi output).
- Preview deploys sit behind Vercel SSO with no bypass secret: Playwright cannot reach them; browser smoke runs in Saeid's authenticated Chrome.
- Declined: `neuronomixer.ir` registration (Saeid, 2026-08-13).

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Route Groups** - Move all existing routes into `(en)` untouched, add the `(fa)` root layout with a placeholder route
- [ ] **Phase 2: Content Model** - Shared GROQ module with a single language filter, Sanity language fields, `en` migration, Studio split
- [ ] **Phase 3: Translation Pipeline** - Batch API translation script with glossary, structure passthrough, verify pass, and draft-only output
- [ ] **Phase 4: Farsi Routes and Chrome** - `/fa` blog tree, Farsi dictionary, Vazirmatn, Jalali dates, RTL chrome, language switcher
- [ ] **Phase 5: SEO and Ship** - hreflang + sitemap, preview browser smoke, backlog translation run, Saeid review and manual publish

## Phase Details

### Phase 1: Route Groups
**Goal**: The app has two root layouts via route groups: every existing route lives in `src/app/(en)/` with URLs and behavior byte-for-byte unchanged, and `src/app/(fa)/fa/` exists with a root layout emitting `<html lang="fa" dir="rtl">` and one placeholder Farsi route.
**Depends on**: Nothing (first phase)
**Requirements**: ROUTE-02
**Success Criteria** (what must be TRUE):
  1. Every existing English URL resolves exactly as before: route smoke list passes covering one guide per category, `/blog`, one blog post, `/visual-guides`, `/cv`, `/share/[token]`, and the dashboard.
  2. The `(en)` move landed as its own solo commit, gated on `npx tsc --noEmit` at 0 and `npx next build` at 0 before anything else.
  3. Visiting the placeholder Farsi route serves a document whose root element is `<html lang="fa" dir="rtl">`, while English pages still serve `lang="en"` LTR.
  4. `ConditionalChrome.tsx` and its `/cv/` special case are untouched, and `src/middleware.ts` is untouched (still matches only `/dashboard/:path*`).
**Plans**: 2 plans

Plans:
- [ ] 01-01: The `(en)` move ONLY — every existing route directory into `src/app/(en)/`, solo commit, gated on tsc 0 + `npx next build` 0 + the route smoke list
- [ ] 01-02: Add `src/app/(fa)/fa/` with a root layout emitting `<html lang="fa" dir="rtl">` and one placeholder Farsi route

### Phase 2: Content Model
**Goal**: Sanity models Farsi posts as sibling documents linked to their English source, and all blog reads flow through one shared, language-filtered query module.
**Depends on**: Phase 1
**Requirements**: CONTENT-01, CONTENT-02
**Success Criteria** (what must be TRUE):
  1. All three blog page files render from queries imported from `src/sanity/lib/queries.ts`; no inline GROQ duplication remains.
  2. English blog listings and post pages return only `language == "en"` documents, with the filter expressed in exactly one place (the shared module).
  3. Every pre-existing post carries `language: "en"` after the one-off `npx tsx` migration.
  4. `postType.ts` carries `language` (string, `en`|`fa`, `initialValue: "en"`), `translationOf` (reference to post), and `translationNotes` (text, read-only in Studio), and the Studio structure lists English and Farsi documents as distinct language-filtered lists.
  5. The ordering invariant held: the English-language filter was live BEFORE the first Farsi document existed, so no Farsi draft can ever have surfaced in an English listing.

**Strict internal order (hard invariant, not optional):** (1) extract the blog GROQ queries — currently duplicated inline across three page files — into `src/sanity/lib/queries.ts` and repoint the three pages; (2) add the `language == "en"` filter in that single module; (3) add the three schema fields to `src/sanity/schemaTypes/postType.ts`; (4) one-off `npx tsx` migration stamping `language: "en"` on every existing post; (5) Studio structure split filtered by language.
**Plans**: TBD

### Phase 3: Translation Pipeline
**Goal**: A repeatable script translates approved English posts into structurally intact Farsi drafts in Sanity, with automated drift verification, so nothing machine-generated reaches Saeid unreviewed or reaches readers at all.
**Depends on**: Phase 2
**Requirements**: PIPE-01, PIPE-02
**Success Criteria** (what must be TRUE):
  1. Running `scripts/translate-posts.ts` (via `npx tsx`) against one real approved English post produces a Sanity DRAFT with `language: "fa"` and `translationOf` set, whose Portable Text is structurally intact: only `span.text` translated; `_key`, `_type`, `marks`, `markDefs`, and code blocks pass through untouched, links working.
  2. The second-pass structured-output verify (numbers, dates, URLs, entity names, code content, glossary adherence, untranslated leftovers) writes its findings to `translationNotes` on the draft, visible where the draft is reviewed.
  3. `content/fa-glossary.json` exists — Simorgh-drafted first pass from the catalog's recurring AI/data/finance terms, corrected by Saeid — and is injected in the system prompt with prompt caching, so glossary terms render consistently.
  4. The very first pipeline run was a dry-run to a scratch dataset before any production content was touched.
  5. Token spend for every run is recorded through the existing `TokenUsage` model.

**Implementation notes (fixed by design):** Claude Sonnet 5 (`claude-sonnet-5`) via the Batch API using the existing `@anthropic-ai/sdk`; results keyed by `custom_id` (batch results arrive in arbitrary order). Success gate for the phase: one real post translated end-to-end, structurally intact.
**Plans**: TBD

### Phase 4: Farsi Routes and Chrome
**Goal**: A Farsi speaker can read translated posts at `/fa` in a correctly right-to-left page with Persian typography, Persian digits, and Jalali dates, with fully localized chrome.
**Depends on**: Phase 3
**Requirements**: ROUTE-01, CHROME-01
**Success Criteria** (what must be TRUE):
  1. `/fa`, `/fa/[categorySlug]`, and `/fa/[categorySlug]/[postSlug]` render translated posts, mirroring the English blog routes with the same ISR (`revalidate = 3600`) and reusing English slugs verbatim.
  2. Farsi pages render in Vazirmatn (via `next/font/google`, subsets arabic+latin, variable `--font-fa`, display swap) with dates from `Intl.DateTimeFormat('fa-IR')`: Jalali calendar and Persian digits.
  3. The Farsi navbar and footer, composed directly in the `(fa)` root layout, render Farsi strings from the `src/i18n/fa.ts` dictionary (~50-80 strings, no i18n library) and link out to the English visual-guides catalog.
  4. A language switcher appears in both navbars and preserves the current post when a translation exists.
  5. RTL is achieved with Tailwind v4 logical utilities on blog and chrome components only; guides are untouched and English pages are visually and behaviorally unchanged.
**Plans**: TBD
**UI hint**: yes

### Phase 5: SEO and Ship
**Goal**: Search engines see the two language trees correctly paired, the full backlog exists as reviewed-ready Farsi drafts, and everything that goes live does so only by Saeid's hand.
**Depends on**: Phase 4
**Requirements**: SEO-01, PIPE-03
**Success Criteria** (what must be TRUE):
  1. Every translated post pair carries reciprocal hreflang alternates plus `x-default` pointing at the English original in `generateMetadata` on both trees, and hreflang pairs resolve both ways; `sitemap.ts` includes the Farsi URLs; `robots.ts` is unchanged.
  2. Farsi pages emit Farsi `og:title` / `og:description` on the existing default OG image.
  3. The Farsi smoke checklist passes on a preview deploy in Saeid's Chrome (previews are behind SSO; Playwright cannot reach them): `dir`/`lang` correct on `/fa` pages, Persian digits, no LTR bleed, hreflang resolves both ways, `/fa` in the sitemap, English tree unchanged.
  4. All ~30 backlog posts exist as Farsi drafts (approved decision: full backlog), and Saeid has read two full posts end to end before any bulk publish.
  5. Nothing is published (draft → approved is Saeid's manual act) and nothing is deployed to prod except on Saeid's explicit gate.
**Plans**: TBD

## Traceability

Requirement IDs assigned from PROJECT.md `### Active` (verbatim mapping):

| ID | Requirement (PROJECT.md Active) | Phase | Status |
|----|--------------------------------|-------|--------|
| ROUTE-01 | Farsi blog reachable at `neuronomixer.com/fa` with correct `lang="fa"` and `dir="rtl"` at the document level | Phase 4 | Pending |
| ROUTE-02 | Existing English routes keep their exact URLs and rendering behavior | Phase 1 | Pending |
| CONTENT-01 | Sanity models Farsi posts as sibling documents linked to their English source | Phase 2 | Pending |
| CONTENT-02 | Blog queries read from a single shared module and filter by language in exactly one place | Phase 2 | Pending |
| PIPE-01 | A script translates approved English posts to Farsi drafts, preserving Portable Text structure, links, and code | Phase 3 | Pending |
| PIPE-02 | Translation output is checked for drift in numbers, dates, URLs, entity names, and glossary terms before it reaches Saeid | Phase 3 | Pending |
| PIPE-03 | Saeid publishes Farsi posts himself; nothing goes live unreviewed | Phase 5 | Pending |
| CHROME-01 | Site chrome, dates, and numerals render correctly in Farsi and right-to-left | Phase 4 | Pending |
| SEO-01 | Search engines see correct hreflang pairing and Farsi URLs in the sitemap | Phase 5 | Pending |

Coverage: 9/9 Active requirements mapped. No orphans, no duplicates.

Note on ROUTE-01: Phase 1 establishes the document-level `lang="fa" dir="rtl"` foundation (the `(fa)` root layout), but the requirement completes only when the actual Farsi blog is reachable, which is Phase 4.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Route Groups | 0/2 | Not started | - |
| 2. Content Model | 0/TBD | Not started | - |
| 3. Translation Pipeline | 0/TBD | Not started | - |
| 4. Farsi Routes and Chrome | 0/TBD | Not started | - |
| 5. SEO and Ship | 0/TBD | Not started | - |
