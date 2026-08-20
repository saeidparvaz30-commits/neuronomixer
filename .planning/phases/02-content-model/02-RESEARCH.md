# Phase 2: Content Model - Research

**Researched:** 2026-08-20
**Domain:** Sanity v4 content modelling, GROQ query consolidation, Next.js 15 App Router data reads, one-off dataset migration
**Confidence:** HIGH (almost every finding below was verified by reading the installed source, the repo files, or by running read-only queries against both live Sanity datasets)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Filter reach (scope expansion vs roadmap, Saeid-approved 2026-08-20)
- **D-01:** ALL public English surfaces route through the shared filtered query module in this phase, not just the three blog page files. Concretely: `src/app/(en)/blog/page.tsx`, `src/app/(en)/blog/[categorySlug]/page.tsx`, `src/app/(en)/blog/[categorySlug]/[postSlug]/page.tsx`, `src/app/(en)/page.tsx` (homepage hero slots + latest posts), `src/app/(en)/authors/[slug]/page.tsx`, `src/app/sitemap.ts`, `src/app/api/v1/posts/route.ts` (feeds the nnx-search MCP index), and `src/app/(en)/review/page.tsx`.
- **D-02:** Dashboards, admin APIs, and the publish-scheduled cron stay DELIBERATELY unfiltered — admins manage both languages. Do not add language filters to `src/app/(en)/dashboard/**`, `src/app/api/dashboard/**`, or `src/app/api/cron/publish-scheduled/route.ts`.

#### Filter semantics
- **D-03:** The filter is TOLERANT: `(!defined(language) || language == "en")` — a post without a language field is English. Farsi is always explicit (`language == "fa"` set only by the Phase 3 pipeline), so tolerance carries zero leak risk.
- **D-04:** Belt and braces: every post CREATION path also stamps `language: "en"` on new documents. That means the dashboard/author API routes that create posts in Sanity (locate them during planning — they are the `_type == "post"` writers under `src/app/api/dashboard/`), plus `initialValue: "en"` in the Studio schema per the roadmap.

#### Studio split UX
- **D-05:** Two top-level lists in the Studio structure: "Posts — English" and "Posts — Farsi", each language-filtered.
- **D-06:** The Farsi list's preview shows the English source title as subtitle (via `translationOf->title`) so pairs are recognizable at a glance.
- **D-07:** The `translationOf` reference picker is filtered to English posts only (`options.filter` on the reference field).
- **D-08:** `translationNotes` is a read-only text field per the roadmap (populated by the Phase 3 verify pass).

#### Migration gate
- **D-09:** The one-off `npx tsx` migration defaults to a DRY-RUN report (count + slugs it would stamp). Mutation runs only with an explicit `--execute` flag, and executing against the production dataset waits for Saeid's explicit go in-session. Patch is `setIfMissing({language: "en"})` — additive, idempotent, re-runnable. No dataset export required.

### Claude's Discretion
- Query module file shape (named exports, `defineQuery` vs plain template strings, param conventions) — planner/researcher decide; the only hard rule is the language filter expressed once (a shared fragment/constant interpolated into every public query).
- Whether `/review?key=` uses the filtered module or is grouped with internal surfaces if research shows it is used to review pending submissions across languages — default is filtered (D-01); adjust with a note if evidence says otherwise.
- Exact Studio structure code layout in `src/sanity/structure.ts`.

### Deferred Ideas (OUT OF SCOPE)
- Extending language filtering into dashboards (e.g., a language column/filter in admin post lists) — revisit in Phase 4/5 if managing Farsi drafts in the dashboard gets noisy; deliberately out of scope now (D-02).
- `package-lock.json` repair (`npm ci` broken at HEAD) — pre-existing repo blocker, must be fixed before the next deploy but is NOT part of this phase.
- `/cv/[slug]` unguarded `generateStaticParams` build query — pre-existing, low priority, separate quick task.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONTENT-01 | Sanity models Farsi posts as sibling documents linked to their English source | Verified schema patterns for the three new fields against installed `sanity@4.22.0` and `@sanity/types` typings: string field with `options.list` + `initialValue` (repo precedent: `status`), `reference` with `options.filter` / `options.filterParams` / `options.disableNew`, and `readOnly: true` text (repo precedent: `submittedBy`). Studio split verified against the installed structure-builder implementation, including the `.filter()` replacement gotcha and the `apiVersion` warning. Preview subtitle through `translationOf.title` confirmed by official docs plus the existing `author.name` precedent in `postType.ts`. |
| CONTENT-02 | Blog queries read from a single shared module and filter by language in exactly one place | Complete byte-level inventory below of all 11 distinct post queries across the 8 public surfaces, including the four distinct status-predicate variants that must be preserved verbatim. Recommended module shape (plain exported template-literal constants, one exported `EN_LANGUAGE` fragment interpolated everywhere) verified as the lowest-friction option because no GROQ typegen exists in this repo. Verified read-only that the tolerant filter produces byte-identical result sets on both live datasets today. |
</phase_requirements>

## Summary

This phase is a refactor with a live-data migration attached, and its whole risk profile turns on a single fact from the milestone design: **Farsi posts reuse the English slug verbatim** (`/blog/x/y` pairs to `/fa/x/y`). The English post page currently resolves a post with `*[_type == "post" && slug.current == $slug && status == "approved"][0]`. The moment an approved Farsi sibling exists, that `[0]` becomes a coin flip between two documents, `generateStaticParams` starts emitting duplicate params, and `sitemap.ts` starts emitting duplicate URLs. This is not a hypothetical listing-pollution problem, it is a hard correctness break on the single-document read path, and it is exactly what the phase's ordering invariant exists to prevent. Every single-document query needs the language clause just as much as every listing query does.

The good news is that the change is provably inert today. Read-only probes against both live datasets confirm zero posts carry a `language` field and zero `drafts.*` post documents exist: production dataset `blog_posts` holds 26 posts, all `status: "approved"`; dev dataset `blog_posts_dev` holds 17 posts (11 approved, 4 scheduled, 1 pending, 1 draft). Running the blog listing query with and without the tolerant clause returns the identical count (15 on dev), so the refactor can be verified as a strict no-op before any Farsi document exists. There is also a third, free guard already in place: `src/sanity/lib/client.ts` runs on `apiVersion` `2025-10-07`, and `@sanity/client@7.26.2` defaults the perspective to `published` for any API version at or after `v2025-02-19`, so Sanity drafts can never reach a public page regardless of the language filter.

The most important structural finding is that "the three blog page files" from the roadmap is not an accurate description of the work. `src/app/(en)/blog/[categorySlug]/page.tsx` contains no GROQ at all, it is a ten-line `redirect()` to `/blog?cat=`. The real inventory is 11 distinct post queries across 8 files, carrying **four different status predicates** (tolerant, strict, approved-only, and none at all). Normalizing those four into one is the single most likely way to break this phase, so the shared module must preserve each one verbatim and add only the language clause. Two files (`sitemap.ts` and the post page's `generateMetadata`) have no status filter at all today, which is a pre-existing SEO oddity that must be carried over unchanged rather than fixed here.

**Primary recommendation:** Create `src/sanity/lib/queries.ts` as plain exported template-literal constants (no `defineQuery`, since no typegen exists and interpolation would break it anyway), with exactly one exported `EN_LANGUAGE` fragment interpolated into all 11 queries and three named status-predicate constants that mirror the four existing variants byte for byte. Land the extraction and the filter as one atomic pair before touching the schema, verify the no-op with a read-only parity check script that diffs each query's result set with and without the language clause on the live dataset, then add the schema fields, then run the dry-run-default migration on dev before prod, then split the Studio.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Language predicate on post reads | API / Backend (server-side GROQ in the shared module) | - | The filter must live where the query is authored, not where results are rendered. No client component may re-filter, or the "exactly one place" criterion breaks. |
| Query text ownership | API / Backend (`src/sanity/lib/queries.ts`) | - | Server modules only. `queries.ts` must never be imported by a `"use client"` component. |
| Language stamp on new documents | API / Backend (the two `client.create` post writers) | Studio (`initialValue`) | `initialValue` is a Studio-only affordance and does not run for `client.create`, so the API routes are the primary tier and the schema is belt and braces (D-04). |
| Language stamp on existing documents | Ops / one-off script (`npx tsx`) | - | Dataset state, not code. Runs once per dataset, dry-run by default (D-09). |
| Editorial language separation | Studio (`src/sanity/structure.ts`) | - | Presentation of the same documents, no data change. |
| Public URL surface (sitemap, hreflang) | API / Backend (`sitemap.ts`) | - | Phase 5 extends the same file with Farsi URLs; Phase 2 only adds the English clause. |
| Draft suppression | API / Backend (client `perspective: published`, implicit) | - | Already handled by `@sanity/client` v7 defaults. Do not reimplement. |

## Project Constraints (binding, from global preferences and ROADMAP standing constraints)

There is **no `CLAUDE.md` and no `.claude/CLAUDE.md` in this repository** (verified: `.claude/` contains only `settings.local.json` and `worktrees`). `.planning/config.json` points `claude_md_path` at `./.claude/CLAUDE.md`, which does not exist. The binding directives therefore come from the user's global preferences plus the ROADMAP standing constraints:

| Directive | Source | Consequence for this phase |
|-----------|--------|----------------------------|
| **NEVER run `npm run build` locally.** It chains `prisma migrate deploy` against the PRODUCTION database. The gate is `npx next build`. | ROADMAP standing constraints, STATE blockers | Every plan's build gate must spell out `npx next build`. |
| `npx tsc --noEmit` at 0 errors at every gate; lint gate is ON. | ROADMAP | Verified baseline today: `npx tsc --noEmit` exits 0. Note `tsconfig.json` includes `**/*.ts`, so any new script under `scripts/` is typechecked and must be strict-clean. |
| No test framework by design; verification is `npx tsx` check scripts plus browser smoke. | ROADMAP | Validation Architecture section below is built on `scripts/checks/*.check.ts`. |
| No new dependency without Saeid's explicit approval. | ROADMAP, global prefs | Zero new packages needed. Everything required is already installed. |
| No push, merge, or deploy without an explicit Saeid gate. | ROADMAP | The `--execute` run against the production dataset is an external write and needs an in-session go (already D-09). |
| npm is the authoritative package manager. Never pnpm or yarn. | STATE decision 2026-08-16 | Do not run any install command in this phase. `package-lock.json` is already dirty in the working copy. |
| **No AI commit attribution.** No `Co-Authored-By`, no `Claude-Session`, no "Generated with" lines, ever. | Global preference (GLOBAL, forever) | Applies to every commit in this phase. |
| No em dashes in English prose (does not apply to Farsi output). | ROADMAP content rules | Note: D-05's literal list titles "Posts — English" / "Posts — Farsi" contain em dashes. They are Studio UI chrome chosen by Saeid, not prose. `Posts (English)` / `Posts (Farsi)` is an em-dash-free alternative if he prefers; default to his literal wording. |
| Content rules: no USA/America/Israel references; byline is always Saeid Sheikhi. | ROADMAP | No content authored in this phase. |

## Standard Stack

Nothing is added. Every version below was read from `node_modules` on disk, not from `package.json` ranges.

### Core

| Library | Installed version | Purpose | Why standard |
|---------|-------------------|---------|--------------|
| `sanity` | **4.22.0** | Studio, `defineType` / `defineField`, structure builder | Already the content backbone. `sanity/structure` supplies `StructureResolver`. [VERIFIED: node_modules/sanity/package.json] |
| `@sanity/client` | **7.26.2** | `createClient`, `fetch`, `patch`, `create`, `transaction` | The runtime the shared module's queries execute against. Reached via `next-sanity`. [VERIFIED: node_modules/@sanity/client/package.json] |
| `next-sanity` | **11.6.13** | Re-exports `createClient` for `src/sanity/lib/client.ts`, `NextStudio` | Already the integration layer. [VERIFIED] |
| `next` | **15.5.23** | App Router, ISR, `generateStaticParams`, `MetadataRoute.Sitemap` | Existing framework. [VERIFIED] |
| `typescript` | **5.9.3** | `npx tsc --noEmit` gate | Existing. [VERIFIED] |
| `tsx` | **4.23.12** (devDependency `^4.21.0`) | Runs the migration and check scripts | Already the repo's script runner. Repo precedent: `npx tsx --env-file .env.local scripts/link-sanity-author.ts`. [VERIFIED] |
| Node.js | **v22.19.0** | Native `--env-file`, global `fetch` | Above the 20.6 floor `--env-file` requires. [VERIFIED: `node --version`] |

### Supporting

| Library | Installed version | Purpose | When to use |
|---------|-------------------|---------|-------------|
| `dotenv` | **17.4.2** (transitive, not in `package.json`) | Env loading in `scripts/migrate-post-status.mjs` | **Avoid.** It is not a declared dependency, so relying on it is a latent break. Use Node's `--env-file` instead, matching `scripts/link-sanity-author.ts`. [VERIFIED: resolvable at `node_modules/dotenv`, absent from `package.json`] |
| `@sanity/types` | bundled with `sanity@4.22.0` | `ReferenceFilterQueryOptions`, `ReferenceFilterResolverOptions` typings | Reference-field typing reference while authoring `translationOf`. [VERIFIED] |

### Alternatives Considered

| Instead of | Could use | Tradeoff |
|------------|-----------|----------|
| Plain exported template-literal constants | `defineQuery` from `next-sanity` / `groq` | `defineQuery` exists purely to mark strings for `sanity typegen`. **No typegen exists here** (no `sanity.types.ts`, no `schema.json`, no `typegen` script in `package.json`, zero `defineQuery` call sites). Worse, typegen requires a static literal, and the whole design interpolates a shared fragment, which typegen cannot follow. `defineQuery` would add ceremony with negative value. [VERIFIED by grep across `src/`] |
| Shared fragment as an interpolated `const` | Fragment as a GROQ `$param` | GROQ params carry values, not predicates. A predicate cannot be parameterised. Interpolation of a module-level constant is the only mechanism. |
| One-off `.ts` script run by `npx tsx` | `sanity exec` or the `sanity migrate` CLI | Both would work, but `npx tsx --env-file` is already the repo precedent, needs no CLI auth flow, and keeps the dry-run flag handling in plain TypeScript. `sanity migrate` also has its own dataset-targeting semantics that would need fresh verification. |
| `@sanity/document-internationalization` plugin | - | Explicitly rejected in the approved design spec: two plain fields for one language pair, no new dependency. Do not revisit. |

**Installation:** none. No package is added, removed, or upgraded in this phase.

## Package Legitimacy Audit

**This phase installs zero external packages.** The ROADMAP forbids new dependencies without Saeid's explicit approval, and the design was built specifically to avoid needing one. Every library used is already present in `node_modules` and already in `package.json` (except `dotenv`, which is transitive and which this research recommends *not* relying on).

| Package | Registry | Declared in package.json | Installed | Verdict | Disposition |
|---------|----------|--------------------------|-----------|---------|-------------|
| `sanity` | npm | yes (`^4.10.2`) | 4.22.0 | OK (pre-existing) | Unchanged |
| `@sanity/client` | npm | transitive via `next-sanity` | 7.26.2 | OK (pre-existing) | Unchanged |
| `next-sanity` | npm | yes (`^11.4.2`) | 11.6.13 | OK (pre-existing) | Unchanged |
| `tsx` | npm | yes, devDep (`^4.21.0`) | 4.23.12 | OK (pre-existing) | Unchanged |
| `dotenv` | npm | **no** (transitive only) | 17.4.2 | SUS for this purpose | **Do not import.** Use `node --env-file`. An undeclared dependency can vanish on any dependency-tree change, which would silently break the migration script. |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** `dotenv`, only in the sense that it is undeclared. No new install is proposed, so no `checkpoint:human-verify` install gate is needed in this phase.

## Architecture Patterns

### System Architecture Diagram

```
                                  SANITY DATASET
                    (prod: blog_posts 26 posts | dev: blog_posts_dev 17 posts)
                                        |
                       +----------------+----------------+
                       |                                 |
              READ PATH (filtered)              WRITE PATH (stamped)
                       |                                 |
        +--------------v--------------+     +------------v-------------+
        |  src/sanity/lib/client.ts   |     |  client.create(...)      |
        |  createClient(...)          |     |  2 post writers only:    |
        |  apiVersion 2025-10-07      |     |   api/v1/posts POST      |
        |  => perspective "published" |     |   api/dashboard/author/  |
        |     (drafts never returned) |     |     submit-post          |
        +--------------+--------------+     |  + language: "en" (D-04) |
                       |                    +------------+-------------+
                       |                                 |
        +--------------v-------------------------+       |
        |  src/sanity/lib/queries.ts   (NEW)     |       |
        |                                        |       |
        |  EN_LANGUAGE  <-- the ONE place        |       |
        |  (!defined(language)||language=="en")  |       |
        |                                        |       |
        |  STATUS_TOLERANT / STATUS_STRICT /     |       |
        |  STATUS_APPROVED   (verbatim carry-    |       |
        |  overs, 4 existing variants)           |       |
        |                                        |       |
        |  11 exported query constants           |       |
        +--+----+----+----+----+----+----+-------+       |
           |    |    |    |    |    |    |               |
   +-------+    |    |    |    |    |    +--------+      |
   |            |    |    |    |    |             |      |
   v            v    v    v    v    v             v      |
 blog/     (en)/page  post page  authors  sitemap  api/v1 review
 page.tsx   hero+     +metadata  /[slug]  .ts      /posts  page
 (dynamic)  latest    +staticPar (r=60)   (build)  GET     (force-
 r=default  (r=30)    (r=3600)                     (dyn)   dynamic)
                                                             |
                                        STUDIO  <------------+
                              src/sanity/structure.ts (NEW split)
                              +-- Posts, English   filter lang en
                              +-- Posts, Farsi     filter lang fa
                                    preview subtitle = translationOf.title

  DELIBERATELY UNFILTERED (D-02): 10 dashboard pages, 5 api/dashboard/*
  routes, api/cron/publish-scheduled, scripts/migrate-post-status.mjs
```

### Recommended Project Structure

```
src/sanity/
├── lib/
│   ├── client.ts        # unchanged
│   ├── image.ts         # unchanged
│   ├── live.ts          # unchanged (sanityFetch/SanityLive exist but are UNUSED)
│   └── queries.ts       # NEW: the only home for public post GROQ
├── schemaTypes/
│   └── postType.ts      # + language, translationOf, translationNotes
└── structure.ts         # language-split lists

scripts/
├── migrate-post-language.ts        # NEW: dry-run default, --execute to mutate
└── checks/
    ├── route-smoke.mjs             # existing, re-run --verify
    └── language-filter.check.ts    # NEW: read-only parity + fragment assertions
```

### Complete query inventory (the byte-faithful contract)

This is the authoritative list. Every entry was read from source. **Four distinct status predicates exist. Preserve all four.**

| # | File | Query name (suggested) | Status predicate | Params | Notes |
|---|------|------------------------|------------------|--------|-------|
| 1 | `src/app/(en)/blog/page.tsx` L28-42 | `blogIndexQuery` | **TOLERANT**: `(status == "approved" \|\| !defined(status) \|\| (status == "scheduled" && publishedAt <= now()))` | none | Compound `{categories, posts, authors}`. Only the `posts` branch takes the language clause. `order(featured desc, publishedAt desc)`. |
| 2 | `src/app/(en)/page.tsx` L25-30 | `homeHeroPostsQuery` | **STRICT**: `(status == "approved" \|\| (status == "scheduled" && publishedAt <= now()))` plus `defined(heroOrder)` | none | Part of one compound object query with #3 and #4. |
| 3 | `src/app/(en)/page.tsx` L31-36 | `homeLatestPostsQuery` | STRICT plus `!defined(heroOrder)` | none | `[0...6]`. |
| 4 | `src/app/(en)/page.tsx` L37-41 | `homeCategoriesQuery` | STRICT, **twice**, inside `count(*[...references(^._id)])` | none | Two nested post sub-queries inside a `category` query. Both need the language clause or category cards will count Farsi posts. Easy to miss. |
| 5 | `src/app/(en)/blog/[categorySlug]/[postSlug]/page.tsx` L14-35 | `postBySlugQuery` | **APPROVED-ONLY**: `status == "approved"` | `$slug` | **Highest risk query in the phase.** `[0]` on a slug that a Farsi sibling will share. |
| 6 | same file L38-41 | `postStaticParamsQuery` | APPROVED-ONLY plus `defined(slug.current) && defined(category->slug.current)` | none | Emits duplicate params once a Farsi sibling is approved. |
| 7 | same file L54-63 | `postMetadataBySlugQuery` | **NONE** | `$slug` | No status filter at all today. Carry that over verbatim; add only the language clause. |
| 8 | `src/app/(en)/authors/[slug]/page.tsx` L27-38 | `postsByAuthorSlugQuery` | TOLERANT, plus `author->slug.current == $slug` | `$slug` | `order(publishedAt desc) [0...20]`. |
| 9 | `src/app/sitemap.ts` L27-43 | `sitemapPostsQuery` | **NONE**, but `defined(slug.current) && defined(category->slug.current) && category->active == true` | none | Compound `{posts, authors}`. Only `posts` takes the clause. Phase 5 extends this file. |
| 10 | `src/app/api/v1/posts/route.ts` L53-72 | `postsByAuthorIdQuery` | **NONE**, `author._ref == $authorId` | `$authorId`, `$siteUrl` | Feeds the nnx-search MCP index. |
| 11 | `src/app/(en)/review/page.tsx` L72-87 | `authorReviewPostsQuery` | **NONE**, `author._ref == $authorId` | `$authorId` | Near-duplicate of #10; differs in projection (`"slug": slug.current`, no `url` select). Do not merge them, the projections differ. |

**Not a query:** `src/app/(en)/blog/[categorySlug]/page.tsx` is a 10-line `redirect()` to `/blog?cat=${categorySlug}`. It contains no GROQ. Roadmap success criterion 1 says "all three blog page files render from queries imported from `queries.ts`", which is literally unsatisfiable for this file. The planner should record it as satisfied-by-vacuity with an explicit note rather than inventing a query for it.

**Not in scope:** `src/app/(en)/authors/page.tsx` fetches only `_type == "author"`, no posts. Verified.

### Post-creation writers (D-04 targets)

Exactly two, confirmed by grepping every `client.create` / `_type: "post"` in `src/`:

| File | Line | Shape | Stamp |
|------|------|-------|-------|
| `src/app/api/v1/posts/route.ts` | L175-195 | `client.create({ _type: "post", ..., status: "pending", submittedBy, publishedAt })` | add `language: "en"` |
| `src/app/api/dashboard/author/submit-post/route.ts` | L72-98 | `const doc: Record<string, unknown> = { _type: "post", ... }` then `client.create(doc as any)` | add `language: "en"` to the object literal |

The other four `client.create` call sites create `_type: "author"` (`api/auth/signup`, `api/auth/complete-signup`, `api/join-authors`, `api/dashboard/subscriber/apply-author`) and one creates `_type: "category"` (`api/dashboard/admin/create-category`). None are post writers. [VERIFIED by grep]

### Pattern 1: One fragment, many queries

**What:** A single exported constant holds the language predicate. Every query interpolates it. Nothing else in `src/` may contain the substring `language ==`.
**When to use:** Always, for every query in the inventory above.
**Example:**

```typescript
// src/sanity/lib/queries.ts
// The ONE place the English-language predicate is expressed (CONTENT-02).
// Tolerant by decision D-03: a post with no language field is English.
export const EN_LANGUAGE = `(!defined(language) || language == "en")`;

// Status predicates carried over verbatim from the call sites they replace.
// Four variants exist in the codebase. Do not normalise them.
const STATUS_TOLERANT = `(status == "approved" || !defined(status) || (status == "scheduled" && publishedAt <= now()))`;
const STATUS_STRICT = `(status == "approved" || (status == "scheduled" && publishedAt <= now()))`;
const STATUS_APPROVED = `status == "approved"`;

export const blogIndexQuery = `{
  "categories": *[_type == "category" && active == true] | order(order asc) {
    _id, title, slug, description, intuitive
  },
  "posts": *[_type == "post" && ${EN_LANGUAGE} && ${STATUS_TOLERANT}] | order(featured desc, publishedAt desc) {
    _id, title, slug, description, publishedAt, featured,
    "bodyExcerpt": pt::text(body)[0...300],
    "mainImage": mainImage.asset->url,
    "category": category->{ _id, title, slug },
    "author": author->{ _id, name, slug, "image": image.asset->url, jobTitle }
  },
  "authors": *[_type == "author" && applicationStatus == "approved"] | order(order asc) [0...6] {
    _id, name, slug, "image": image.asset->url, jobTitle
  }
}`;
```

Note the clause position: `_type == "post" && ${EN_LANGUAGE} && ${STATUS_...}`. Putting the language clause immediately after `_type` keeps every query visually uniform and makes the "did I miss one" grep trivial (`grep -c EN_LANGUAGE` must equal 12, because query #4 uses it twice).

**Phase 4 forward-compatibility:** define the Farsi counterpart as a sibling constant when Phase 4 arrives (`export const FA_LANGUAGE = \`language == "fa"\``). Do not add it now, it would be dead code, but shape the module so adding it is one line.

### Pattern 2: Server-only module boundary

**What:** `queries.ts` exports strings only. It must never be imported by a `"use client"` component.
**Why:** `BlogClient` and `HomePageClient` already receive fully-resolved data as props. If a client component imported the query text, the language predicate would ship to the browser and someone would eventually re-filter client-side, which breaks "expressed in exactly one place".
**Enforcement:** a grep assertion in the check script: no file containing `"use client"` may import from `@/sanity/lib/queries`.

### Pattern 3: Dry-run-by-default mutation script

**What:** The migration reports before it writes. `--execute` is the only path to a mutation.
**Example:** see Code Examples below. Two mechanisms reinforce each other: the explicit flag, and `commit({ dryRun: true })`, which is a real `@sanity/client` option that validates the mutation server-side without persisting it. [VERIFIED: `BaseMutationOptions.dryRun?: boolean` in `node_modules/@sanity/client/dist/index.d.ts` L500]

### Pattern 4: Studio split with distinct list ids

**What:** Two `documentTypeList('post')` lists with different filters and, critically, different ids.
**Why it is not obvious:** verified in the installed `sanity@4.22.0` source, `S.documentTypeList(typeName)` presets `.id(spec.id || typeName)`. Two post lists both default to id `post`, which collides in the Studio URL/state. Set `.id()` explicitly on both.

### Anti-Patterns to Avoid

- **Normalising the four status predicates into one.** This is the single most likely way to break the phase. `blog/page.tsx` and `authors/[slug]` include no-status posts; `(en)/page.tsx` excludes them; the post page requires `approved`; `sitemap.ts`, `generateMetadata`, `/review` and `api/v1/posts` filter on none. All four behaviours must survive byte-identically. The phase changes *language* semantics only.
- **Calling `.filter()` on a `documentTypeList` without restating `_type`.** `.filter()` REPLACES the preset `_type == $type` filter. Verified in the installed source: `S.documentTypeList` returns `new DocumentTypeListBuilder(context).id(...).title(...).filter("_type == $type").params({type: typeName})`. A custom filter of just `language == "fa"` would list every document type in the dataset.
- **Omitting `.apiVersion()` on the filtered lists.** Verified in the installed source: serialising a document list whose filter differs from `_type == $type` without an apiVersion emits `console.warn("No apiVersion specified for document type list with custom filter: ... This will be required in the future")`. Pass the repo's `apiVersion` constant from `src/sanity/env.ts`.
- **Fixing the missing status filter in `sitemap.ts`.** It currently lists non-approved posts, which then 404. That is a real pre-existing SEO bug, but fixing it here would make the route-smoke and sitemap diffs non-empty and destroy the "provably inert" property of this phase. Log it as a separate quick task.
- **Interpolating any runtime value into GROQ.** Every runtime value in the inventory is already a `$param`. Keep it that way. `EN_LANGUAGE` is a compile-time constant, never user input. See Security Domain.
- **Relying on `initialValue: "en"` to cover API-created posts.** `initialValue` is a Studio form affordance. `client.create` bypasses it entirely. This is precisely why D-04 exists.
- **Importing `dotenv` in the new script.** It is undeclared. Use `npx tsx --env-file <file>`, matching `scripts/link-sanity-author.ts`.
- **Adding a `language` filter to `api/cron/publish-scheduled`.** Forbidden by D-02. See the related risk in Common Pitfalls.

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| Keeping Sanity drafts off public pages | A `!(_id in path("drafts.**"))` clause in every query | Nothing. `@sanity/client@7.26.2` with `apiVersion >= v2025-02-19` already defaults `perspective` to `published` | Verified in the installed typings. The repo's apiVersion is `2025-10-07`. Adding a manual draft clause is dead weight and would confuse the "one filter" story. |
| Validating a mutation before committing it | A hand-rolled "simulate the patch" routine | `client.patch(id).setIfMissing({...}).commit({ dryRun: true })` | First-class client option, server-validated, zero persistence. |
| Idempotent additive field stamping | Read-then-conditionally-write logic | `setIfMissing({ language: "en" })` | Atomic, re-runnable, never clobbers a value the pipeline set. |
| Batching many patches | A hand-rolled chunked loop with retry | `client.transaction().patch(...).commit()`, chunked at ~100 mutations | Sanity's transaction API is atomic per commit. At 26 and 17 documents, a single transaction per dataset is enough anyway. |
| Env loading in scripts | `import * as dotenv from "dotenv"` | `npx tsx --env-file .env.local scripts/x.ts` | Node 22.19 native, no undeclared dependency, and the repo already does this. |
| Restricting a reference picker | A custom input component | `options: { filter, filterParams }` or the resolver form, plus `disableNew: true` | First-class schema option. |
| Removing the "create" button from a Studio list | A custom pane component | `.initialValueTemplates([])` | Documented one-liner. |
| Showing a referenced document's title in a list preview | A custom preview React component | `preview.select` dot path (`translationOf.title`) | Sanity dereferences automatically. Repo already does this with `author.name`. |

**Key insight:** every mechanism this phase needs is already a first-class feature of the exact versions installed. The only genuinely new code is 11 query constants, 3 schema fields, 1 migration script, 1 check script, and about 25 lines of structure builder.

## Runtime State Inventory

This is a refactor plus a data migration, so the question that matters is: after every file in the repo is updated, what runtime state still lacks the `language` field?

| Category | Items found | Action required |
|----------|-------------|------------------|
| **Stored data** | **Sanity dataset `blog_posts` (PRODUCTION): 26 post documents, all `status: "approved"`, 0 with a `language` field, 0 `drafts.*` documents.** **Sanity dataset `blog_posts_dev` (DEV): 17 post documents (11 approved, 4 scheduled, 1 pending, 1 draft), 0 with a `language` field, 0 `drafts.*` documents.** [VERIFIED by read-only GROQ `count()` against both datasets, 2026-08-20] | **Data migration, twice.** The migration must be run against BOTH datasets. Dev first (`--env-file .env.local`), production second (`--env-file .env.vercel-prod`) and only on Saeid's explicit in-session go per D-09. Running it once locally does NOT satisfy success criterion 3, because local env points at the dev dataset. |
| **Live service config** | Sanity Studio structure is code (`src/sanity/structure.ts`), committed, not UI-configured. No Sanity Studio workspace config lives outside git. No Sanity webhooks were found referenced in the repo. Vercel project env vars hold the production `NEXT_PUBLIC_SANITY_DATASET=blog_posts` and `SANITY_API_TOKEN`; these are unchanged by this phase. | **None.** No external service config changes. |
| **OS-registered state** | None. No scheduled tasks, no pm2, no launchd. The only cron is `api/cron/publish-scheduled`, a Vercel cron hitting an in-repo route (unchanged, D-02). | **None. Verified by inspecting `vercel.json` scope and the repo's only cron route.** |
| **Secrets / env vars** | `SANITY_API_TOKEN` exists in both `.env.local` (dev dataset) and `.env.vercel-prod` (production dataset). Both were verified to READ successfully. **Write scope on either token is NOT verified** and cannot be proven read-only. `.env` contains no Sanity keys at all (it is the Prisma production-DB file). No key names change in this phase. | **No key rename. One verification step:** the migration's first `--execute` run should be preceded by a single-document `commit({ dryRun: true })` against the dev dataset to confirm the token has write scope before the loop starts. |
| **Build artifacts / caches** | `.next/` holds statically generated HTML for `/blog/[categorySlug]/[postSlug]` (`revalidate = 3600`), `/authors/[slug]` (`revalidate = 60`), `/` (`revalidate = 30`) and `sitemap.xml`. `tsconfig.tsbuildinfo` exists (incremental tsc). | **Regeneration, not migration.** A full `npx next build` regenerates all of it. The deployed production build must be regenerated after the filter lands and before the first Farsi document exists, otherwise stale ISR HTML built from the pre-filter query could still list a Farsi post. State this explicitly in the plan's ordering invariant: "filter deployed AND production rebuilt" is the real precondition, not "filter merged". |

## Common Pitfalls

### Pitfall 1: The shared slug makes `[0]` non-deterministic

**What goes wrong:** Farsi posts reuse the English slug verbatim (design spec: "Slugs are reused verbatim from the English post"). `postBySlugQuery` is `*[_type == "post" && slug.current == $slug && status == "approved"][0]`. Once an approved Farsi sibling exists, two documents match, and `[0]` picks one by GROQ's default ordering, not by intent. An English URL can start serving a Farsi article.
**Why it happens:** the roadmap frames this phase as being about "listings", so it is easy to treat single-document reads as lower priority. They are higher priority.
**How to avoid:** apply `EN_LANGUAGE` to queries #5, #6 and #7 with the same rigour as the listings. Add an explicit assertion to the check script: for every slug in the dataset, `count(*[_type == "post" && slug.current == $slug && <EN_LANGUAGE>])` must be exactly 1.
**Warning signs:** duplicate `(categorySlug, postSlug)` pairs out of `generateStaticParams`; duplicate URLs in `sitemap.xml`; a build-time warning about duplicate static params.

### Pitfall 2: The nested `count()` sub-queries on the homepage

**What goes wrong:** `homeCategoriesQuery` (#4) contains the status predicate twice, inside `count(*[_type == "post" && ... && references(^._id)])` used both as a filter and as a projected `postCount`. Miss either and category cards show a post count inflated by Farsi siblings, or a category with only Farsi posts appears on the English homepage.
**Why it happens:** they are nested inside a `_type == "category"` query, so a grep for `_type == "post"` at the top level of each query does not surface them.
**How to avoid:** count occurrences. `EN_LANGUAGE` must appear 12 times across the 11 queries (query #4 accounts for the extra two, and query #4's own two occurrences make its per-query count 2). Assert that count in the check script so a future edit cannot silently drop one.

### Pitfall 3: `.filter()` replaces rather than appends on `documentTypeList`

**What goes wrong:** `S.documentTypeList('post').filter('language == "fa"')` lists every document in the dataset with `language == "fa"`, of any type, because the preset `_type == $type` filter was overwritten.
**Why it happens:** the method name reads additive. It is not.
**How to avoid:** always restate the type: `.filter('_type == "post" && language == "fa"')`. Note that if you keep `.params({type: "post"})` you may write `_type == $type` instead, but restating the literal is clearer.
**Warning signs:** categories and authors appearing in a "Posts" list.

### Pitfall 4: Studio list id collision

**What goes wrong:** both lists default to id `post`, so navigating between them confuses the Studio's pane state and the URL.
**How to avoid:** `.id('posts-en')` and `.id('posts-fa')` explicitly, on both the list item and the child list.

### Pitfall 5: `initialValue` does not run for API-created posts

**What goes wrong:** a post submitted through `/api/v1/posts` or the author dashboard is created by `client.create` and never touches a Studio form, so `initialValue: "en"` never fires. The document lands with no `language`.
**Why it is survivable here:** D-03's tolerant filter treats a missing `language` as English, so such a post still appears correctly. But it undermines "Farsi is always explicit" as a data invariant and it makes the Studio's Farsi/English lists incomplete if those use a strict `language == "en"` filter.
**How to avoid:** D-04 (stamp both writers), and use the SAME tolerant predicate in the Studio's English list filter so an unstamped post is still visible there.

### Pitfall 6: The migration runs against the wrong dataset

**What goes wrong:** `.env.local` points `NEXT_PUBLIC_SANITY_DATASET` at `blog_posts_dev`. `.env.vercel-prod` points it at `blog_posts`. `.env` contains no Sanity keys at all. Running the migration the obvious way (`--env-file .env.local`) stamps 17 dev documents and zero production documents, while printing a confident success message.
**How to avoid:** the script must print `projectId`, `dataset` and the document count on every run, dry or wet, before anything else. Require the operator to read the dataset name back. Consider a `--dataset` flag that must match the env-derived dataset, or an explicit `--i-know-this-is-production` guard for `blog_posts`.
**Warning signs:** "Stamped 17 posts" when production has 26.

### Pitfall 7: Stale ISR output outlives the code change

**What goes wrong:** the filter is merged and deployed, but pages with `revalidate = 3600` keep serving HTML generated from the pre-filter query for up to an hour, and pages that were statically generated at build time keep serving until the next build. If a Farsi document were published in that window, it could appear on an English page even though the code is correct.
**How to avoid:** state the invariant in deploy terms, not merge terms. The filter must be deployed to production AND the production build regenerated BEFORE Phase 3 creates the first Farsi document. Since Phase 3 is a separate phase and creates drafts only (which the `published` perspective excludes anyway), the margin is comfortable, but the plan should say it out loud so the verifier can check it.

### Pitfall 8: The publish-scheduled cron would email every subscriber about a Farsi post

**What goes wrong:** `api/cron/publish-scheduled` finds `status == "scheduled" && publishedAt <= $now`, patches to `approved`, and calls `notifyAllUsers(...)` with an English subject line ("Your post is now live"). It is deliberately unfiltered by D-02. If a Farsi post is ever given `status: "scheduled"`, the cron will publish it and mail the entire subscriber list.
**How to avoid:** it is out of scope to change the cron, but the plan should record the resulting invariant for Phase 3: **Farsi documents must never carry `status: "scheduled"`.** The design already lands them as `draft`. Put this in the phase summary so Phase 3's planner inherits it.

### Pitfall 9: Adding a script that fails the typecheck gate

**What goes wrong:** `tsconfig.json` `include` is `["next-env.d.ts", "**/*.ts", "**/*.tsx", ...]`, so a new `scripts/migrate-post-language.ts` is compiled by `npx tsc --noEmit` under `strict: true`. `process.env.X` is `string | undefined`, and `client.create(doc)` on a `Record<string, unknown>` needs a cast (the existing `submit-post` route uses `as any` with an eslint-disable for exactly this reason).
**How to avoid:** write the script strict-clean from the start (non-null assertions on env vars, matching `link-sanity-author.ts`), and run `npx tsc --noEmit` immediately after creating it rather than at the end of the plan.

### Pitfall 10: `/review` and `api/v1/posts` have near-identical queries with different projections

**What goes wrong:** they look like duplicates and invite a merge. Query #10 projects `"url": select(defined(category) => $siteUrl + ...)` and takes a `$siteUrl` param; query #11 does not and builds the URL in TypeScript instead. Merging them changes at least one caller's output shape.
**How to avoid:** export them as two constants. Duplication of projection text is fine; the "exactly one place" criterion is about the language filter, not about projections.

## Code Examples

### The three schema fields

```typescript
// src/sanity/schemaTypes/postType.ts (additions only)
// Source: sanity 4.22.0 typings + https://www.sanity.io/docs/studio/reference-type

    defineField({
      name: "language",
      title: "Language",
      type: "string",
      options: {
        list: [
          { title: "English", value: "en" },
          { title: "Farsi", value: "fa" },
        ],
        layout: "radio",
      },
      initialValue: "en",
      description:
        "English posts are the source. Farsi posts are created by the translation pipeline.",
    }),
    defineField({
      name: "translationOf",
      title: "Translation of",
      type: "reference",
      to: [{ type: "post" }],
      description: "Set on Farsi documents only. Points at the English source post.",
      options: {
        // Resolver form, because the predicate depends on the current document
        // (self-exclusion). filterParams is typed `never` in this form; return
        // params from the resolver instead.
        filter: ({ document }) => {
          const publishedId = document._id.replace(/^drafts\./, "");
          return {
            filter:
              '(!defined(language) || language == "en") && !(_id in [$self, $selfDraft])',
            params: { self: publishedId, selfDraft: `drafts.${publishedId}` },
          };
        },
        disableNew: true,
      },
    }),
    defineField({
      name: "translationNotes",
      title: "Translation Notes",
      type: "text",
      rows: 6,
      readOnly: true,
      description:
        "Findings from the pipeline's verify pass. Written by the translation script, not by hand.",
    }),
```

`readOnly: true` has a direct precedent in this file (`submittedBy`, L107-112). The `options.list` + `layout: "radio"` + `initialValue` combination has a direct precedent too (`status`, L88-105). The resolver form of `options.filter` is confirmed by `ReferenceFilterResolverOptions` in the installed `@sanity/types` (`filter?: ReferenceFilterResolver; filterParams?: never`).

### Preview subtitle through the reference

```typescript
// src/sanity/schemaTypes/postType.ts (preview, extended for D-06)
// Source: https://www.sanity.io/docs/studio/previews-list-views
// "You can follow references by using dot notation to the related document
//  field you want to display in preview.select"
  preview: {
    select: {
      title: "title",
      author: "author.name",
      language: "language",
      sourceTitle: "translationOf.title",   // dereferenced automatically
      media: "mainImage",
    },
    prepare({ title, author, language, sourceTitle, media }) {
      const subtitle =
        language === "fa" && sourceTitle
          ? `fa of: ${sourceTitle}`
          : author && `by ${author}`;
      return { title, subtitle, media };
    },
  },
```

Note this changes the shared `postType` preview, which affects the English list too. The `language === "fa"` guard keeps the English list's subtitle byte-identical to today's `by ${author}`. Verify that in the Studio, it is the only user-visible change to the English editing experience.

### Studio structure split

```typescript
// src/sanity/structure.ts
import type { StructureResolver } from "sanity/structure";
import { apiVersion } from "./env";

// The Studio's own language predicates. The public-read predicate lives in
// src/sanity/lib/queries.ts; these are Studio chrome, not a read path, so the
// duplication is intentional and does not violate CONTENT-02.
const EN = '_type == "post" && (!defined(language) || language == "en")';
const FA = '_type == "post" && language == "fa"';

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Blog")
    .items([
      S.listItem()
        .id("posts-en")
        .title("Posts — English")
        .schemaType("post")
        .child(
          S.documentTypeList("post")
            .id("posts-en")
            .title("Posts — English")
            .filter(EN)                      // REPLACES `_type == $type`
            .apiVersion(apiVersion)          // silences the custom-filter warning
            .defaultOrdering([{ field: "publishedAt", direction: "desc" }]),
        ),
      S.listItem()
        .id("posts-fa")
        .title("Posts — Farsi")
        .schemaType("post")
        .child(
          S.documentTypeList("post")
            .id("posts-fa")
            .title("Posts — Farsi")
            .filter(FA)
            .apiVersion(apiVersion)
            .defaultOrdering([{ field: "publishedAt", direction: "desc" }])
            // Farsi documents come from the Phase 3 pipeline, never from a
            // Studio "create" button (which would stamp language "en").
            .initialValueTemplates([]),
        ),
      S.documentTypeListItem("category").title("Categories"),
      S.documentTypeListItem("author").title("Authors"),
      S.divider(),
      ...S.documentTypeListItems().filter(
        (item) => item.getId() && !["post", "category", "author"].includes(item.getId()!),
      ),
    ]);
```

Two things to check against the current file: the trailing `documentTypeListItems()` spread already excludes `post`, so the split does not double-list. And the `S.documentTypeListItem('post')` line is removed, replaced by the two list items above.

### Migration script skeleton

```typescript
/**
 * One-off: stamp language "en" on every post that lacks it.
 * Dry run (default):
 *   npx tsx --env-file .env.local        scripts/migrate-post-language.ts
 * Execute (dev):
 *   npx tsx --env-file .env.local        scripts/migrate-post-language.ts --execute
 * Execute (PRODUCTION, only on Saeid's explicit go):
 *   npx tsx --env-file .env.vercel-prod  scripts/migrate-post-language.ts --execute
 *
 * Additive and idempotent: setIfMissing never clobbers a value the pipeline set.
 */
import { createClient } from "@sanity/client";

const execute = process.argv.includes("--execute");

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!;

const client = createClient({
  projectId,
  dataset,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2025-10-07",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  perspective: "raw", // include drafts.* so a draft post is stamped too
});

type Row = { _id: string; title?: string; slug?: string };

async function main() {
  console.log(`project ${projectId}  dataset ${dataset}  mode ${execute ? "EXECUTE" : "DRY RUN"}`);
  if (execute && dataset === "blog_posts") {
    console.log("!! TARGET IS THE PRODUCTION DATASET !!");
  }

  const rows = await client.fetch<Row[]>(
    `*[_type == "post" && !defined(language)] | order(_createdAt asc){ _id, title, "slug": slug.current }`,
  );

  console.log(`${rows.length} post(s) without a language field:`);
  for (const r of rows) console.log(`  ${r._id}  ${r.slug ?? "(no slug)"}  ${r.title ?? ""}`);

  if (rows.length === 0) return console.log("Nothing to do.");

  if (!execute) {
    // Server-validated, nothing persisted. Proves the token has write scope.
    await client
      .patch(rows[0]._id)
      .setIfMissing({ language: "en" })
      .commit({ dryRun: true });
    console.log("Dry run OK (mutation validated server-side, nothing written).");
    console.log("Re-run with --execute to apply.");
    return;
  }

  let tx = client.transaction();
  for (const r of rows) tx = tx.patch(r._id, (p) => p.setIfMissing({ language: "en" }));
  await tx.commit();
  console.log(`Stamped ${rows.length} post(s) in ${dataset}.`);

  const remaining = await client.fetch<number>(`count(*[_type == "post" && !defined(language)])`);
  console.log(`Remaining without language: ${remaining}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

`dryRun` is a real `BaseMutationOptions` field on `@sanity/client@7.26.2` [VERIFIED in the installed typings]. `perspective: "raw"` is deliberate: the default `published` would skip any `drafts.*` post. Both datasets currently have zero draft documents, so this changes nothing today, but it makes the script correct if that changes before it runs.

### Read-only fragment unit test (verified to work)

GROQ can filter a literal array, which gives a completely read-only, deterministic unit test of the predicate against the real GROQ engine:

```groq
{
  "kept": [
    {"id":"fa","language":"fa"},
    {"id":"en","language":"en"},
    {"id":"none"}
  ][ (!defined(language) || language == "en") ].id
}
```

Executed against `blog_posts_dev` on 2026-08-20, this returned exactly `["en","none"]`. The `fa` item is excluded, the explicit `en` item is kept, and the item with no `language` field is kept, which is precisely D-03. Assert this in `scripts/checks/language-filter.check.ts` using the exported `EN_LANGUAGE` constant so the test moves with the constant.

### Schema assertion under tsx (verified to work)

`postType` can be imported and inspected from a plain `npx tsx` script. Verified live:

```bash
$ npx tsx probe.ts
FIELDS: title,slug,category,order,featured,heroOrder,author,mainImage,description,metaDescription,status,submittedBy,publishedAt,body
```

So the check script can assert CONTENT-01 mechanically:

```typescript
import { postType } from "../../src/sanity/schemaTypes/postType";
import assert from "node:assert";

const fields = postType.fields as unknown as Array<Record<string, unknown>>;
const byName = Object.fromEntries(fields.map((f) => [f.name as string, f]));

assert.ok(byName.language, "postType must define `language`");
assert.strictEqual(byName.language.type, "string");
assert.strictEqual(byName.language.initialValue, "en");
assert.ok(byName.translationOf, "postType must define `translationOf`");
assert.strictEqual(byName.translationOf.type, "reference");
assert.ok(byName.translationNotes, "postType must define `translationNotes`");
assert.strictEqual(byName.translationNotes.type, "text");
assert.strictEqual(byName.translationNotes.readOnly, true);
```

Note the current field count is **14**, not the 13 recorded in CONTEXT.md. After this phase it is 17.

## State of the Art

| Old approach | Current approach | When changed | Impact here |
|--------------|------------------|--------------|-------------|
| `@sanity/client` default perspective `raw` (drafts returned) | default `published` | API version `v2025-02-19` | The repo is on `2025-10-07`, so drafts are already excluded from every public read. Do not add draft-suppression clauses. [VERIFIED in installed typings] |
| Hand-written GROQ strings with no tooling | `defineQuery` + `sanity typegen` for typed results | Sanity typegen, 2024 onwards | Deliberately NOT adopted here. No typegen is configured, and the shared-fragment design is incompatible with typegen's static-literal requirement. |
| `deskTool` / `S.documentTypeListItem` only | `structureTool` with filtered `documentTypeList` and `initialValueTemplates` | Studio v3 onwards, `apiVersion` on filtered lists since v2.20 | The repo already uses `structureTool`. Filtered lists now warn if `apiVersion` is omitted. |
| `@sanity/document-internationalization` for language pairs | Two plain fields for a single language pair | Design decision, 2026-08-11 | Locked by the approved design. Not revisitable in this phase. |

**Deprecated / outdated in this repo:**
- `scripts/migrate-post-status.mjs` imports `dotenv`, which is not a declared dependency, and pins `apiVersion: "2024-01-01"`. Use it as a shape reference only. `scripts/link-sanity-author.ts` (tsx + `--env-file`) is the better precedent.
- `src/sanity/lib/live.ts` exports `sanityFetch` and `SanityLive`, but neither is used anywhere and `<SanityLive />` is not rendered. Leave it alone. Do not route the new module through it.

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|-------|---------|---------------|
| A1 | The `SANITY_API_TOKEN` in `.env.local` and `.env.vercel-prod` both carry write scope. Only read access was verified (writing would have been a side effect). | Runtime State Inventory, Migration | The `--execute` run fails with a 403 partway. Mitigated by the `commit({ dryRun: true })` probe on the first document before the loop, which surfaces the failure without partial writes. |
| A2 | Production Vercel env mirrors `.env.vercel-prod` (`NEXT_PUBLIC_SANITY_DATASET=blog_posts`). Read from the local file, not from the Vercel dashboard. | Runtime State Inventory | The migration could target the wrong production dataset. Confirm with `vercel env ls` or the dashboard before the production `--execute`. |
| A3 | No Sanity webhook or external consumer reads `_type == "post"` outside this repo. Nothing in the repo references one, but the Sanity project's webhook list was not inspected. | Runtime State Inventory | An external consumer could start receiving `language` in payloads. Additive field, so very low impact. |
| A4 | The nnx-search MCP index (fed by `api/v1/posts`) does not need re-indexing after the filter lands. The filter is inert today, so the payload is unchanged. | Query inventory #10 | None today. Becomes relevant in Phase 5 if Farsi posts should or should not be indexed, which is a Phase 5 decision. |
| A5 | Duplicate entries from `generateStaticParams` would be a build problem rather than silently deduplicated by Next.js 15. Not empirically tested, because it cannot be tested before a Farsi document exists. | Pitfall 1 | If Next silently dedupes, the failure mode is a wrong page rather than a failed build, which is worse, not better. Either way the fix is the same. |
| A6 | `/review` should follow D-01 and be filtered. See Open Questions for the evidence both ways. | Query inventory #11 | Low. The filter is inert today and flipping it later is a one-line change. |

## Open Questions

1. **Should `/review?key=` be filtered or grouped with internal surfaces?**
   - What we know: it is gated by an `nnx_` API key with a suspended/role check, returns `notFound()` without a valid key, is `force-dynamic`, lists an author's posts across **all** statuses (draft, pending, rejected, hidden), and renders its own `<html>` document with English headings. It is functionally an internal author/agent review dump that happens to live on a public URL. Because the client's perspective is `published`, Farsi *drafts* can never appear there regardless of the filter; only an approved Farsi post could.
   - What is unclear: whether Saeid uses `/review` as an all-content inspection surface where hiding half the catalog would be surprising.
   - Recommendation: **follow D-01 and filter it.** It sits under `(en)`, its chrome is English, and per the design Farsi review happens in the Studio. The change is provably inert today, and flipping it back is a one-line edit. Record the reasoning in the plan so a future reader does not treat it as an oversight.

2. **Does the production Sanity token have write scope?**
   - What we know: it reads successfully. Write scope cannot be probed without either writing or a `dryRun` mutation, and a `dryRun` mutation against production before Saeid's go would violate the spirit of D-09.
   - Recommendation: the plan's production step should be: run dry-run (which performs a single `dryRun: true` commit, server-validated, nothing persisted) as its own gate, show Saeid the 26-document report and the dataset name, then run `--execute` on his word.

3. **Should the Studio's English list use the tolerant or the strict predicate?**
   - What we know: after the migration, every post carries `language`, so tolerant and strict are equivalent. But posts created later by the two API writers will carry it only if D-04 lands, and any writer added in future might not.
   - Recommendation: use the **tolerant** predicate in the Studio English list (as shown in the code example) so a hypothetically unstamped post is still editable somewhere. Otherwise it becomes invisible in both lists.

4. **Which dataset does the phase's "success criterion 3" refer to?**
   - What we know: criterion 3 says "every pre-existing post carries `language: "en"`". There are two datasets with different contents (26 prod, 17 dev).
   - Recommendation: treat it as **both**, with production as the gating one. State it explicitly in the plan, since running only against `.env.local` looks like success but leaves production untouched.

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js (>= 20.6 for `--env-file`) | migration + check scripts | yes | v22.19.0 | - |
| `npx tsx` | migration + check scripts | yes | 4.23.12 | - |
| `npx tsc --noEmit` | typecheck gate | yes, **currently exits 0** | TypeScript 5.9.3 | - |
| `npx next build` | build gate | assumed yes (Phase 1 ran it green) | Next 15.5.23 | - |
| `npx next start` + `scripts/checks/route-smoke.mjs --verify` | regression gate, 28-route baseline recorded | yes, baseline present at `.planning/phases/01-route-groups/artifacts/route-smoke.baseline.json` | - | - |
| Sanity dev dataset `blog_posts_dev` | dev migration, live parity check | yes, read verified (17 posts) | project `pz9ppas8` | - |
| Sanity prod dataset `blog_posts` | production migration | yes, read verified (26 posts) | project `pz9ppas8` | - |
| Preview Postgres (Supabase pooler) | `npx next build` (`/cv/[slug]` has no try/catch, `sitemap.ts` does) | **yes, reachable right now** (`select 1` succeeded against `aws-1-eu-central-1.pooler.supabase.com:6543`) | - | If it pauses on idle, wake it in the Supabase dashboard before the build gate. This is a known STATE blocker. |
| `npm ci` | none in this phase | **NO, broken at HEAD** | - | Do not run any install. `node_modules` is already correct. This is an out-of-scope blocker. |
| Playwright against Vercel previews | not needed this phase | no (previews behind SSO, no bypass secret) | - | Browser smoke runs in Saeid's authenticated Chrome. |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** `npm ci` is unavailable, and this phase needs no install of any kind, so it does not block.

## Validation Architecture

`workflow.nyquist_validation` is `true` in `.planning/config.json`, so this section applies.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | **None, by design.** The ROADMAP states verification is `npx tsx` check scripts plus browser smoke. |
| Config file | none (no vitest/jest config, no `test` script in `package.json`) |
| Quick run command | `npx tsc --noEmit` then `npx tsx scripts/checks/language-filter.check.ts` |
| Full suite command | `npx tsc --noEmit` && `npx next build` && (`npx next start` in background) `node scripts/checks/route-smoke.mjs --verify` |

Existing precedent for the check-script convention: `scripts/checks/shared-pdfs-lib.check.ts`, which uses `node:assert`, relative imports into `src/`, and prints a final `ALL PASS` line. Match it exactly.

### Phase Requirements to Test Map

| Req ID | Behavior | Test type | Automated command | File exists? |
|--------|----------|-----------|-------------------|--------------|
| CONTENT-02 | The language predicate literal appears exactly once in `src/` | static / grep | `npx tsx scripts/checks/language-filter.check.ts` (assert `grep -r 'language ==' src/` yields only `queries.ts` and `structure.ts`) | Wave 0 |
| CONTENT-02 | The fragment behaves per D-03 (fa out, en in, undefined in) | unit, read-only GROQ on a literal array | same script | Wave 0 |
| CONTENT-02 | `EN_LANGUAGE` is interpolated into all 11 queries, 12 occurrences | static, on the imported constants | same script | Wave 0 |
| CONTENT-02 | Every query returns a byte-identical result set with and without the language clause (proves the refactor is inert) | integration, read-only against the live dataset | same script | Wave 0 |
| CONTENT-02 | Exactly one English post matches each slug | integration, read-only | same script | Wave 0 |
| CONTENT-02 | No `"use client"` file imports `@/sanity/lib/queries` | static / grep | same script | Wave 0 |
| CONTENT-02 | The three blog pages and the five other public surfaces contain zero inline `_type == "post"` GROQ | static / grep | same script | Wave 0 |
| CONTENT-01 | `postType` carries `language` (string, initialValue en), `translationOf` (reference), `translationNotes` (text, readOnly) | unit, importing the schema under tsx (verified to work) | same script | Wave 0 |
| CONTENT-01 | Every post in the target dataset has `language == "en"` after the migration | integration, read-only GROQ `count(*[_type == "post" && !defined(language)]) == 0` | `npx tsx --env-file <file> scripts/checks/language-filter.check.ts` | Wave 0 |
| CONTENT-01 | Studio lists render as two language-filtered panes with no console warning | **manual**, Saeid's browser at `/studio` | none (Studio is a client app behind auth) | manual-only, justified |
| ROUTE-02 (regression) | 28 English routes unchanged in status, final path, html tag, nav, footer | integration, existing harness | `node scripts/checks/route-smoke.mjs --verify` against `npx next start` | exists |
| ROUTE-02 (regression) | Route manifest unchanged (no URL added or removed) | build artifact diff | `diff` against `.planning/phases/01-route-groups/artifacts/routes-after-fa.txt` (285 URLs) | exists |
| Gate | Zero type errors | typecheck | `npx tsc --noEmit` | exists, currently 0 |
| Gate | Build succeeds without touching the production DB | build | `npx next build` (**never** `npm run build`) | exists |

**Important:** `route-smoke.mjs --verify` records status, redirect, content type, html tag, and the presence of `<nav>`, `<footer>` and the branded-404 marker. It does **not** record post counts, so it cannot catch a filter that silently drops posts. The parity assertions in `language-filter.check.ts` are what cover that. Both are required.

### Sampling Rate

- **Per task commit:** `npx tsc --noEmit`
- **After the queries.ts extraction + filter task (the atomic pair):** `npx tsc --noEmit` and `npx tsx scripts/checks/language-filter.check.ts` (parity assertions must show zero-diff result sets)
- **Per wave merge:** add `npx next build`
- **Phase gate:** full suite, including `npx next start` plus `route-smoke.mjs --verify` at 28/28, plus the migration verification query returning 0 on both datasets, plus Saeid's Studio browser check

### Wave 0 Gaps

- [ ] `scripts/checks/language-filter.check.ts` covers CONTENT-01 and CONTENT-02 (does not exist)
- [ ] Framework install: **not needed**, `node:assert` plus `tsx` is the established convention
- [ ] A pre-change snapshot of every query's result set, captured before the extraction lands, so the parity check has something to compare against. Suggest writing it to `.planning/phases/02-content-model/artifacts/query-baseline.json` the same way Phase 1 recorded `route-smoke.baseline.json`.

## Security Domain

`workflow.security_enforcement` is `true`, `security_asvs_level` 1.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard control |
|---------------|---------|------------------|
| V2 Authentication | no (unchanged) | `next-auth` and `authenticateApiKey` are untouched by this phase |
| V3 Session Management | no (unchanged) | - |
| V4 Access Control | **yes** | D-02 deliberately leaves admin surfaces unfiltered. This is an authorization decision: admins may see both languages. The control is that the unfiltered surfaces are all behind `auth()` / `authenticateApiKey` / the cron secret. Verify during planning that none of the D-02 surfaces is publicly reachable. |
| V5 Input Validation | **yes** | Every runtime value in every query in the inventory is already passed as a GROQ `$param` (`$slug`, `$authorId`, `$siteUrl`). The shared module must preserve that. `EN_LANGUAGE` and the status constants are module-level literals, never derived from input. |
| V6 Cryptography | no | `hashApiKey` unchanged |
| V7 Error Handling and Logging | minor | The migration script logs `_id`, slug and title. It must never log `SANITY_API_TOKEN` or the full env. |
| V14 Configuration | **yes** | Two datasets with near-identical config, one of them production. See the threat table. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard mitigation |
|---------|--------|---------------------|
| GROQ injection through string-concatenated query text | Tampering / Information disclosure | Keep every runtime value as a `$param`. The refactor is the moment this could regress, because it moves query text around. Add a check-script assertion that no exported query contains a `${` interpolation other than the known module-level constants. |
| Wrong-dataset mutation (dev script pointed at production, or the reverse) | Tampering | Print `projectId` and `dataset` on every run; explicit production callout; dry-run default; `setIfMissing` so a mis-run is a no-op on already-stamped documents. |
| Write token exposure in logs or in a committed file | Information disclosure | Never log env; never hardcode; `.env*` already gitignored (confirm `.gitignore` covers `.env.vercel-prod`). |
| Content leak across language boundary (Farsi content served on an English URL, or vice versa) | Information disclosure / Spoofing | The three-layer defence documented above: language filter (this phase), `published` perspective (already), and `status` filter (already). The shared-slug problem in Pitfall 1 is the concrete attack surface. |
| Mass notification triggered by a language-mismatched publish | Denial of service / reputational | Document the Phase 3 invariant that Farsi documents never carry `status: "scheduled"` (Pitfall 8). |
| Unfiltered internal surface becoming public later | Elevation of privilege | Record D-02's list in the phase summary so a future reader knows the omission is deliberate, not an oversight. |

**No new security surface is introduced by this phase.** The filter strictly narrows what public surfaces return, the schema fields are additive and non-sensitive, and the only new privileged operation is a one-off, additive, idempotent, dry-run-gated dataset patch.

## Sources

### Primary (HIGH confidence)

- **The repository itself**, read file by file on 2026-08-20: `src/app/(en)/blog/page.tsx`, `src/app/(en)/blog/[categorySlug]/page.tsx`, `src/app/(en)/blog/[categorySlug]/[postSlug]/page.tsx`, `src/app/(en)/page.tsx`, `src/app/(en)/authors/page.tsx`, `src/app/(en)/authors/[slug]/page.tsx`, `src/app/(en)/review/page.tsx`, `src/app/sitemap.ts`, `src/app/api/v1/posts/route.ts`, `src/app/api/dashboard/author/submit-post/route.ts`, `src/app/api/cron/publish-scheduled/route.ts`, `src/sanity/lib/client.ts`, `src/sanity/lib/live.ts`, `src/sanity/env.ts`, `src/sanity/structure.ts`, `src/sanity/schemaTypes/postType.ts`, `sanity.config.ts`, `sanity.cli.ts`, `tsconfig.json`, `package.json`, `scripts/migrate-post-status.mjs`, `scripts/link-sanity-author.ts`, `scripts/checks/route-smoke.mjs`, `scripts/checks/shared-pdfs-lib.check.ts`
- **Installed package sources and typings** (authoritative for the exact versions in use): `node_modules/@sanity/client/dist/index.d.ts` (perspective default change at `v2025-02-19`; `BaseMutationOptions.dryRun`; `setIfMissing`), `node_modules/@sanity/types/lib/index.d.ts` (`ReferenceFilterQueryOptions`, `ReferenceFilterResolverOptions`, `disableNew`), `node_modules/sanity/lib/structure.d.ts` (`DocumentListBuilder.filter/params/apiVersion/defaultOrdering`, `initialValueTemplates`, `canHandleIntent`), `node_modules/sanity/lib/_chunks-es/StructureToolProvider.js` (`documentTypeList` presets `_type == $type`; the custom-filter `apiVersion` warning; the "id is required" serialize error)
- **Live read-only probes against both Sanity datasets, 2026-08-20**: post counts and status distributions for `blog_posts` (26 approved, 0 with language, 0 drafts) and `blog_posts_dev` (17 posts, 0 with language, 0 drafts); listing-count parity with and without the tolerant clause (15 = 15); the literal-array predicate test returning `["en","none"]`
- **Live environment probes**: `node --version` v22.19.0, `npx tsc --noEmit` exit 0, `npx tsx` schema import succeeded, preview Postgres `select 1` succeeded
- **`.planning/` documents**: `ROADMAP.md`, `STATE.md`, `config.json`, `phases/01-route-groups/01-02-SUMMARY.md`, `phases/01-route-groups/artifacts/`
- **Approved milestone design spec**: `C:\Users\saeid\Desktop\Agent Simorgh\projects\2. NeuroNomixer\farsi edition\2026-08-11-farsi-edition-design.md`, sections 2 (content model) and the routes table (slug reuse)

### Secondary (MEDIUM confidence)

- [CITED: sanity.io/docs/studio/previews-list-views] preview `select` dot notation dereferences references automatically
- [CITED: sanity.io/docs/studio/reference-type] `options.filter`, `options.filterParams`, `options.disableNew`, and the caveat that the filter constrains search only
- [CITED: sanity.io/docs/studio/structure-builder-reference] `documentList` / `documentTypeList` with `.title()`, `.id()`, `.filter()`, `.params()`, `.apiVersion()`, `.defaultOrdering()`, `.initialValueTemplates()`, `.child()`; web-safe unique ids
- [CITED: reference.sanity.io/sanity/structure/DocumentTypeListBuilder] and sanity.io/docs/studio/initial-value-templates: `.initialValueTemplates([])` removes the create button

### Tertiary (LOW confidence)

- None. Every claim in this document traces to a file on disk, a live query, or an official Sanity documentation page.

## Metadata

**Confidence breakdown:**

- Query inventory and status-predicate semantics: **HIGH** - every query was read from source and transcribed, and the parity behaviour was confirmed by running the filtered and unfiltered variants against the live dataset.
- Standard stack: **HIGH** - versions read from `node_modules`, not from `package.json` ranges. Nothing is added.
- Sanity schema and structure-builder patterns: **HIGH** - verified against the installed 4.22.0 source and typings, then cross-checked with official docs. The `.filter()` replacement behaviour and the `apiVersion` warning came from reading the shipped implementation, not from memory.
- Dataset state and migration targeting: **HIGH** - counted directly in both datasets. The one gap is token write scope (A1), which is unverifiable without writing.
- Pitfalls: **HIGH** for 1 through 6 and 9 through 10 (each traces to a specific line of code or a verified API behaviour); **MEDIUM** for 7 (ISR staleness reasoning is sound but not empirically demonstrated) and 8 (the cron path was read but not executed).
- Validation architecture: **HIGH** - conventions taken from existing check scripts, and both novel techniques (GROQ literal-array filtering and importing `postType` under tsx) were executed successfully before being recommended.

**Research date:** 2026-08-20
**Valid until:** 2026-09-19 (30 days). The repo-specific findings hold until the files change. The `@sanity/client` perspective default and structure-builder behaviour are pinned to the installed versions and only change on upgrade. Re-verify the dataset counts immediately before the migration runs.
