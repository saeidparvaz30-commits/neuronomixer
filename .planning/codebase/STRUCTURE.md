# Codebase Structure

**Analysis Date:** 2026-08-11

## Directory Layout

```
neuronomixer/
├── src/
│   ├── app/                       # Next.js App Router routes
│   │   ├── layout.tsx              # ONLY root layout (html/body/fonts/providers)
│   │   ├── page.tsx                # Home page
│   │   ├── sitemap.ts / robots.ts  # SEO file-convention routes
│   │   ├── error.tsx / not-found.tsx
│   │   ├── icon.svg                # Favicon (Next file convention)
│   │   ├── api/                    # Route handlers (see below)
│   │   ├── auth/                   # Sign-in/up, password reset, email verify, suspended, setup-admin
│   │   ├── authors/[slug]/         # Public author profile pages
│   │   ├── blog/                   # Blog: list, [categorySlug], [categorySlug]/[postSlug]
│   │   ├── contact/                # Contact form page
│   │   ├── cv/[slug]/              # Public CV pages (bare chrome, no Navbar/Footer)
│   │   ├── dashboard/              # admin/, author/, subscriber/ role-gated areas
│   │   ├── privacy/
│   │   ├── review/                 # Editorial review queue (dynamic)
│   │   ├── share/[token]/          # Shared-PDF public view
│   │   ├── studio/[[...tool]]/     # Embedded Sanity Studio
│   │   └── visual-guides/          # 151 route folders, one per guide slug
│   ├── components/
│   │   ├── appSkeleton/            # Navbar, Footer, ConditionalChrome, providers, logo
│   │   ├── author/                 # Author-related widgets (follow button, etc.)
│   │   ├── Blog/                   # RichText, BlogPostBody, engagement, comments, read tracker
│   │   ├── Category/                # Category browsing UI
│   │   ├── dashboard/               # Dashboard-specific components
│   │   ├── HomePage/                 # Home page sections
│   │   ├── prompts/                  # Signup/engagement prompt modals
│   │   ├── Sanity/                   # Sanity Studio custom input components
│   │   ├── SharedPdf/                 # Shared-PDF viewer components
│   │   └── VisualGuides/              # 1 folder per guide (PascalCase), ~797 .tsx files total
│   ├── data/                        # Static JSON/TS content (CV data, hero text, etc.)
│   ├── hooks/                       # Shared React hooks
│   ├── lib/                         # Server/shared utilities (auth, prisma, mailer, validation)
│   │   └── prompts/                  # Prompt-related server logic
│   ├── sanity/                       # Sanity client + schema
│   │   ├── lib/                      # client.ts, image URL builder
│   │   └── schemaTypes/              # Document/field schema definitions
│   ├── styles/                       # globals.css
│   ├── types/                        # Shared TS types (next-auth augmentation, visual-guides)
│   └── middleware.ts                 # Edge middleware, matches /dashboard/:path* only
├── prisma/
│   ├── schema.prisma                  # All Postgres models
│   ├── migrations/                    # Prisma migration history
│   ├── seed-guides.ts                 # `npx prisma db seed` — visual guide catalog seed
│   └── *.ts                            # One-off maintenance scripts (run via `npx tsx`)
├── scripts/                            # One-off/maintenance scripts (run via `npx tsx`)
│   └── checks/                         # Verification scripts (e.g. shared-pdfs-lib.check.ts)
├── public/                              # Static assets (icons, logos, og images, attachments)
├── sanity.config.ts / sanity.cli.ts     # Sanity Studio config (project root, not src/)
├── prisma.config.ts                     # Prisma config
└── next.config.ts, tsconfig.json, eslint.config.mjs
```

## Directory Purposes

**`src/app/blog/`:**
- Purpose: Route tree for Sanity-backed editorial content.
- Contains: `page.tsx` (list), `[categorySlug]/page.tsx` (category), `[categorySlug]/[postSlug]/page.tsx` (post detail, ISR `revalidate = 3600`), `loading.tsx`.
- Key files: `src/app/blog/[categorySlug]/[postSlug]/page.tsx` (GROQ queries inline).

**`src/app/visual-guides/`:**
- Purpose: One route folder per interactive guide (151 total). Each `page.tsx` is a thin server component: static `metadata` + render of a single client component import from `src/components/VisualGuides/`.
- Contains: `<slug>/page.tsx` for each guide (e.g. `src/app/visual-guides/rag-explained/page.tsx`), plus an index page.
- Key files: none shared — every guide route is self-contained; no dynamic route segment is used (each guide is its own static folder, not `[slug]`).

**`src/components/VisualGuides/`:**
- Purpose: Implementation of every guide's interactive UI.
- Contains: One PascalCase folder per guide (e.g. `RAGExplained/`, `Backpropagation/`), each holding the guide's client component(s), sub-step components, and any guide-local assets/helpers. ~797 `.tsx` files across all folders.
- Key files: `<GuideName>Client.tsx` is the conventional entry component rendered by the matching route page.

**`src/app/api/`:**
- Purpose: All server route handlers, organized by domain.
- Contains: `auth/` (signup/signin/verify/reset/nextauth catch-all), `contact/`, `cron/publish-scheduled/`, `cv/` (design, extract, public), `dashboard/` (admin/author/profile/subscriber), `guides/complete/`, `join-authors/`, `notifications/mark-read/`, `posts/` (bookmark, comments, like), `share/[token]/`, `subscribe/`, `track-read/`, `v1/` (categories, posts, upload — API-key authenticated public API), `visual-guides/` (complete, curriculum, progress).
- Key files: each domain has a `route.ts` inside its folder (standard Next.js Route Handler convention).

**`src/sanity/`:**
- Purpose: Sanity CMS client and schema definitions consumed by both the public site and `/studio`.
- Contains: `lib/client.ts` (GROQ client singleton), `lib/` image URL helpers, `schemaTypes/` (post, author, category, etc. schema definitions).

**`prisma/`:**
- Purpose: Single Postgres schema for auth, visual-guide catalog, and engagement; plus maintenance scripts.
- Contains: `schema.prisma`, `migrations/`, and standalone `.ts` scripts (`seed-guides.ts`, `mark-existing-users-verified.ts`, `set-email-notifications-true.ts`, `verify-seed-state.ts`) each runnable via `npx tsx prisma/<script>.ts` (seed script specifically via `npx prisma db seed`).

**`scripts/`:**
- Purpose: Repo-wide one-off/maintenance/verification scripts, run with `npx tsx scripts/<name>.ts` (or `.mjs` via node directly for `migrate-post-status.mjs`, `mobile-gate.mjs`).
- Contains: `add-range-aria-labels.ts`, `check-smtp-tls.ts`, `fix-title-suffix.ts`, `link-sanity-author.ts`, `migrate-post-status.mjs`, `mobile-gate.mjs`, and `checks/shared-pdfs-lib.check.ts` (verification-style script).

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: sole root layout — establishes `<html>`, `<body>`, fonts, GA scripts, providers, chrome.
- `src/middleware.ts`: edge middleware, `matcher: ["/dashboard/:path*"]` only.
- `src/app/sitemap.ts`, `src/app/robots.ts`: SEO file-convention routes.

**Configuration:**
- `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`
- `sanity.config.ts`, `sanity.cli.ts` (repo root, not under `src/`)
- `prisma.config.ts`, `prisma/schema.prisma`
- `vercel.json`

**Core Logic:**
- `src/lib/prisma.ts`: Prisma client singleton.
- `src/lib/auth.ts` / `src/lib/auth.config.ts`: full vs. edge-safe NextAuth config.
- `src/lib/apiKeyAuth.ts` / `src/lib/apiKeyHash.ts`: `v1` API key auth.
- `src/lib/mailer.ts` / `src/lib/email.ts`: outbound email.
- `src/sanity/lib/client.ts`: Sanity GROQ client.

**Testing:**
- No dedicated test directory or test runner config found (no `*.test.*`/`*.spec.*`, no `jest.config.*`/`vitest.config.*` detected at repo root or under `src/`). Verification-style scripts live in `scripts/checks/` instead (e.g. `scripts/checks/shared-pdfs-lib.check.ts`) and `mobile-gate.mjs` at `scripts/`.

## Naming Conventions

**Files:**
- Route files: Next.js file conventions (`page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `sitemap.ts`, `robots.ts`).
- Route segment folders: kebab-case matching the URL slug (`visual-guides/rag-explained`, `blog/[categorySlug]`).
- Components: PascalCase filenames matching the exported component (`ReadTracker.tsx`, `RAGExplainedClient.tsx`).
- Guide component folders: PascalCase, one per guide topic, name derived from the guide (not always a literal transform of the kebab-case slug — e.g. slug `rag-explained` → folder `RAGExplained`).
- Library/utility files: camelCase (`apiKeyAuth.ts`, `validateSlug.ts`, `markdownToPortableText.ts`).
- Scripts: kebab-case, descriptive of the one-off action (`fix-title-suffix.ts`, `link-sanity-author.ts`).

**Directories:**
- `src/app/api/<domain>/<action>/route.ts` — domain folder, then action sub-folder, then `route.ts`.
- `src/components/<Domain>/<ComponentName>.tsx` for grouped-by-domain UI (`Blog/`, `VisualGuides/<Name>/`, `appSkeleton/`).

## Where to Add New Code

**New visual guide:**
- Catalog entry: add to `prisma/seed-guides.ts` (category/unit assignment) and re-run `npx prisma db seed`, or insert directly via a script following the `prisma/*.ts` convention (`npx tsx`).
- Implementation: new folder `src/components/VisualGuides/<NewGuideName>/` with a `<NewGuideName>Client.tsx` entry component.
- Route: new folder `src/app/visual-guides/<new-guide-slug>/page.tsx` — static `metadata` export + render of the client component, following the pattern in `src/app/visual-guides/rag-explained/page.tsx`.
- Sitemap: no manual step needed — `src/app/sitemap.ts` picks up any `VisualGuide` row with `visibility: "PUBLISHED"` and `implemented: true`.

**New blog feature (e.g., locale-aware fields):**
- Sanity schema changes: `src/sanity/schemaTypes/`.
- GROQ query changes: currently inline per page under `src/app/blog/**` — no shared query module exists yet; if adding cross-cutting fields (e.g., Farsi locale), consider centralizing queries in `src/sanity/lib/` first to avoid duplicating edits across `src/app/blog/page.tsx`, `src/app/blog/[categorySlug]/page.tsx`, `src/app/blog/[categorySlug]/[postSlug]/page.tsx`.
- Rendering changes: `src/components/Blog/RichText.tsx` (Portable Text serializers).

**New API endpoint:**
- `src/app/api/<domain>/<action>/route.ts`, following existing domain grouping (`posts/`, `guides/`, `dashboard/`, etc.).

**Route-group split (Farsi edition):**
- Since `src/app/layout.tsx` is the only root layout, a second locale root requires restructuring into route groups (e.g. `src/app/(en)/` and `src/app/(fa)/`) each with its own `layout.tsx` containing `<html lang="...">`; the current top-level `src/app/layout.tsx` cannot remain as-is once a second `<html>` root is introduced. `ConditionalChrome`'s `usePathname().startsWith(...)` pattern (`src/components/appSkeleton/ConditionalChrome.tsx`) will need to be reconciled with or replaced by route-group-level layouts.

**Utilities:**
- Shared helpers: `src/lib/`.
- Shared hooks: `src/hooks/`.
- Shared static data: `src/data/`.
- Shared types: `src/types/`.

## Special Directories

**`src/app/api/`:**
- Purpose: All server route handlers.
- Generated: No.
- Committed: Yes.

**`prisma/migrations/`:**
- Purpose: Prisma migration history, applied in production via `prisma migrate deploy` (chained into `npm run build`, per `package.json`).
- Generated: Yes (by `prisma migrate dev`/`prisma migrate deploy`).
- Committed: Yes.

**`.next/`:**
- Purpose: Next.js build output.
- Generated: Yes.
- Committed: No.

**`public/`:**
- Purpose: Static assets served at root (`icons/`, `logos/`, `og/`, `pictures/`, `attachments/`).
- Generated: No.
- Committed: Yes.

---

*Structure analysis: 2026-08-11*
