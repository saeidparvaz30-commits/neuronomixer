<!-- refreshed: 2026-08-11 -->
# Architecture

**Analysis Date:** 2026-08-11

## System Overview

```text
┌───────────────────────────────────────────────────────────────────────┐
│                    Root Layout / App Shell                            │
│  `src/app/layout.tsx` (html/body, fonts, GA, providers)               │
│  `src/components/appSkeleton/ConditionalChrome.tsx` (Navbar/Footer)   │
└───────────────┬───────────────────────────────┬───────────────────────┘
                │                                │
                ▼                                ▼
┌───────────────────────────────┐   ┌────────────────────────────────────┐
│      Blog content system      │   │     Visual Guides content system    │
│ `src/app/blog/**`              │   │ `src/app/visual-guides/**` (151)    │
│ `src/components/Blog/*`        │   │ `src/components/VisualGuides/*`     │
│ `src/components/Sanity/*`      │   │ (~797 .tsx files, hand-authored)    │
└───────────────┬────────────────┘   └────────────┬─────────────────────┘
                │ Portable Text via GROQ            │ static React components
                ▼                                   ▼ (catalog + metadata only)
┌───────────────────────────────┐   ┌────────────────────────────────────┐
│     Sanity CMS (headless)      │   │  Postgres — VisualGuide/GuideUnit/  │
│ `src/sanity/lib/client.ts`     │   │  GuideCategory (Prisma)             │
│ `src/sanity/schemaTypes/*`     │   │  `prisma/schema.prisma`             │
└─────────────────────────────────┘   └────────────────────────────────────┘
                │                                   │
                └────────────────┬──────────────────┘
                                 ▼
                  ┌───────────────────────────────────┐
                  │ Postgres engagement tables (Prisma)│
                  │ PostView, Like, Bookmark, Comment, │
                  │ ReadingHistory, GuideCompletion    │
                  │ keyed by `slug` — shared across    │
                  │ both content systems               │
                  └───────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Root layout | `<html>`/`<body>`, font, metadata, GA scripts, auth/provider mounting | `src/app/layout.tsx` |
| ConditionalChrome | Client component deciding Navbar/Footer vs. bare shell (currently only `/cv/*` opts out) | `src/components/appSkeleton/ConditionalChrome.tsx` |
| Navbar / Footer | Global site chrome | `src/components/appSkeleton/Navbar.tsx`, `src/components/appSkeleton/Footer.tsx` |
| NextAuthProvider | Wraps app in NextAuth `SessionProvider` | `src/components/appSkeleton/NextAuthProvider.tsx` |
| Blog route tree | Category list → category page → post page, Sanity-backed | `src/app/blog/page.tsx`, `src/app/blog/[categorySlug]/page.tsx`, `src/app/blog/[categorySlug]/[postSlug]/page.tsx` |
| Blog rendering | Portable Text → React, comments, likes/bookmarks, read tracking | `src/components/Blog/RichText.tsx`, `src/components/Blog/BlogPostBody.tsx`, `src/components/Blog/PostEngagement.tsx`, `src/components/Blog/CommentsSection.tsx`, `src/components/Blog/ReadTracker.tsx` |
| Visual guide route pages | Thin server components: static `metadata` + render of one client component | `src/app/visual-guides/<slug>/page.tsx` (151 files, one per guide) |
| Visual guide UI | The actual interactive guide implementation, one folder per topic | `src/components/VisualGuides/<GuideName>/*` (~797 `.tsx` files total) |
| Guide catalog / DB | Guide metadata, ordering, unit/category grouping, visibility | `prisma/schema.prisma` (`VisualGuide`, `GuideCategory`, `GuideUnit`), seeded by `prisma/seed-guides.ts` |
| Engagement store | Cross-cutting like/bookmark/comment/view/reading-history/completion tracking, keyed by `slug` (works for both posts and guides) | `prisma/schema.prisma` (`PostView`, `Like`, `Bookmark`, `Comment`, `ReadingHistory`, `GuideCompletion`) |
| Sanity CMS config | Schema definitions, GROQ client, image URL builder | `src/sanity/schemaTypes/*`, `src/sanity/lib/client.ts` |
| Sanity Studio route | Embedded Studio UI under `/studio` | `src/app/studio/[[...tool]]/page.tsx` |
| Auth edge middleware | Route protection for `/dashboard/*` (edge runtime, no Prisma) | `src/middleware.ts`, `src/lib/auth.config.ts` |
| API routes | REST-ish route handlers for auth, guides, posts, dashboard, cron, sharing, etc. | `src/app/api/**/route.ts` |

## Pattern Overview

**Overall:** Next.js 15 App Router monolith with two parallel, independently-owned content pipelines sharing one Postgres engagement layer and one global app shell.

**Key Characteristics:**
- Blog content is headless-CMS driven (Sanity/Portable Text), fetched via GROQ at request/build time — content changes do not require a deploy.
- Visual guides are code-as-content: each guide is a hand-authored React component tree; adding/editing a guide requires a commit and deploy. The Postgres `VisualGuide` row is metadata/catalog only (slug, visibility, ordering) — it does not store guide body content.
- A single Postgres database (via Prisma, `@prisma/adapter-pg`) backs auth (NextAuth `User`/sessions), the visual-guide catalog, and all engagement tables for both systems, joined only by `slug` string (no FK between `Comment.slug` and either Sanity `post` or Prisma `VisualGuide`).
- `src/middleware.ts` is intentionally minimal (edge runtime, `authConfig` without Prisma) — it only gates `/dashboard/*`; deeper auth/onboarding checks happen in `src/app/dashboard/layout.tsx` where Prisma access is available.
- One root layout (`src/app/layout.tsx`) currently serves the entire app; there is no route-group split yet.

## Layers

**App Shell / Chrome:**
- Purpose: Global HTML skeleton, fonts, metadata defaults, analytics, session provider, conditional nav/footer.
- Location: `src/app/layout.tsx`, `src/components/appSkeleton/*`
- Contains: Root layout, `ConditionalChrome` (client component using `usePathname()`), `NextAuthProvider`, `GoogleAnalyticsTracker`, `FramerMotionProvider` wrapper (imported inside `ConditionalChrome`), reCAPTCHA provider, signup modal.
- Depends on: `next-auth`, `next/font/google` (Inter, `--font-sans` var), `next/script` for GA.
- Used by: every route in the app (single root layout, no segment-level override yet).

**Blog (Sanity-backed):**
- Purpose: Editorial long-form content authored in Sanity Studio, rendered as Portable Text.
- Location: `src/app/blog/**`, `src/components/Blog/*`, `src/components/Sanity/*`, `src/sanity/**`
- Contains: List/category/post route pages, GROQ queries inlined in page files, Portable Text renderer (`RichText.tsx`), comments/likes/engagement client widgets, read-time tracker.
- Depends on: `src/sanity/lib/client.ts` (Sanity client), Prisma (for engagement + author follow state via API routes), `src/app/api/posts/**`.
- Used by: `/blog`, `/blog/[categorySlug]`, `/blog/[categorySlug]/[postSlug]`, `/authors/[slug]` (cross-links).

**Visual Guides (code-as-content):**
- Purpose: ~151 interactive, hand-built explainer components covering statistics/ML/DL/LLM topics.
- Location: `src/app/visual-guides/<slug>/page.tsx` (route + metadata only), `src/components/VisualGuides/<Name>/*` (implementation, ~797 `.tsx` files across all guides).
- Contains: Per-guide route page exporting static `metadata` and rendering a single `<XClient />` component; the client component tree holds all interactive logic (steps, animations, quizzes, etc.).
- Depends on: Prisma `VisualGuide`/`GuideCategory`/`GuideUnit` for catalog/listing (`src/app/api/visual-guides/**`, `src/app/api/guides/**`), not for content body.
- Used by: `/visual-guides` index, `/visual-guides/<slug>` detail pages, sitemap generation.

**Data / Persistence:**
- Purpose: Relational store for users/auth, visual-guide catalog, and cross-content engagement.
- Location: `prisma/schema.prisma`, `src/lib/prisma.ts` (singleton client), `prisma/*.ts` one-off scripts.
- Contains: `User`, `ReadingHistory`, `Like`, `Bookmark`, `Comment`, `PostView`, `GuideCompletion`, `GuideCategory`, `GuideUnit`, `VisualGuide` models (line refs in `prisma/schema.prisma`: `User` L47, `ReadingHistory` L91, `Like` L105, `Bookmark` L116, `Comment` L129, `PostView` L195, `GuideCompletion` L242, `GuideCategory` L263, `GuideUnit` L279, `VisualGuide` L295).
- Depends on: `@prisma/adapter-pg` + Postgres (Vercel/Neon-style connection strings from env).
- Used by: API routes under `src/app/api/**`, dashboard pages, sitemap, engagement components.

**API Layer:**
- Purpose: Server-side route handlers for auth flows, contact form, CV/PDF, cron jobs, dashboard data, guide/post CRUD, sharing, subscriptions, read tracking, versioned public API (`v1`).
- Location: `src/app/api/**/route.ts` — subpaths: `auth`, `contact`, `cron`, `cv`, `dashboard`, `guides`, `join-authors`, `notifications`, `posts`, `share`, `subscribe`, `track-read`, `v1`, `visual-guides`.
- Depends on: `src/lib/prisma.ts`, `src/lib/auth.ts`/`auth.config.ts`, `src/lib/apiKeyAuth.ts`/`apiKeyHash.ts` (for `v1` API-key auth), `src/lib/mailer.ts`/`email.ts`, `src/lib/rateLimit.ts`.
- Used by: client components (fetch calls), cron triggers, external API-key consumers (`v1`).

## Data Flow

### Blog post request path

1. Request hits `src/app/blog/[categorySlug]/[postSlug]/page.tsx`, which is statically generated at build time via `generateStaticParams()` (queries Sanity for all approved post/category slug pairs) — `src/app/blog/[categorySlug]/[postSlug]/page.tsx:36`.
2. Page fetches the full post document from Sanity by slug (`postQuery`, GROQ) inside the server component — `src/app/blog/[categorySlug]/[postSlug]/page.tsx:14`.
3. `revalidate = 3600` makes the page ISR (regenerated at most hourly) rather than fully static or fully dynamic — `src/app/blog/[categorySlug]/[postSlug]/page.tsx:12`.
4. Portable Text body is rendered client-side via `RichText` (`src/components/Blog/RichText.tsx`), wrapped by `BlogPostBody`.
5. Client-only widgets (`ReadTracker`, `PostEngagement`, `CommentsSection`, `AuthorFollowButton`) call `src/app/api/posts/**` / `src/app/api/notifications/**` routes to read/write Postgres engagement rows keyed by `postSlug`.

### Visual guide request path

1. Request hits `src/app/visual-guides/<slug>/page.tsx` — a server component with hardcoded `metadata` (no DB call) that renders one client component, e.g. `RAGExplainedClient` — `src/app/visual-guides/rag-explained/page.tsx`.
2. No `generateStaticParams`/dynamic fetch is present on individual guide pages, so each is prerendered as a fully static route at build time (content is compiled into the bundle).
3. The `/visual-guides` index and curriculum/category views instead query Prisma (`VisualGuide`, `GuideCategory`, `GuideUnit`) via `src/app/api/visual-guides/curriculum/route.ts` and related API routes for listing/ordering/visibility — this is the only place the DB row for a guide is read on the guide-browsing path.
4. Guide-side engagement (likes, bookmarks, completions) writes to Postgres via `src/app/api/guides/**`, keyed by the guide's `slug`.

**State Management:**
- Server state: Sanity (blog content) and Postgres (catalog + engagement) are the sources of truth; no client-side global store beyond React context providers (`NextAuthProvider`, `FramerMotionProvider`) and local component state inside each guide.
- `FlushPendingCompletions` (mounted in root layout) reconciles any locally-queued guide-completion events against the server — `src/app/layout.tsx:5`.

## Key Abstractions

**Route page vs. Client component split (visual guides):**
- Purpose: Keep `metadata`/SEO in a server component while all interactivity lives in a client component.
- Examples: `src/app/visual-guides/rag-explained/page.tsx` → `src/components/VisualGuides/RAGExplained/RAGExplainedClient.tsx`.
- Pattern: One route folder per guide slug under `src/app/visual-guides/`, one matching PascalCase folder under `src/components/VisualGuides/`.

**Slug as cross-system join key:**
- Purpose: Lets one engagement schema (`Like`, `Bookmark`, `Comment`, `PostView`, `ReadingHistory`, `GuideCompletion`) serve both Sanity posts and Prisma-cataloged guides without a shared foreign key.
- Examples: `prisma/schema.prisma` engagement models all key on a `slug`/`postSlug` string field rather than a relation.
- Pattern: Loose coupling by convention — a typo or slug rename can silently orphan engagement rows; no referential integrity enforced by Postgres for the Sanity side (Sanity is external).

**ConditionalChrome route-based UI toggling:**
- Purpose: Single root layout, but different chrome for different route prefixes (currently `/cv/*` renders bare).
- Examples: `src/components/appSkeleton/ConditionalChrome.tsx:10` (`pathname.startsWith("/cv/")`).
- Pattern: Client component branching on `usePathname()`, not route groups/segment layouts — this is the seam the planned Farsi-edition route-group split will need to either extend or replace.

## Entry Points

**Root layout:**
- Location: `src/app/layout.tsx`
- Triggers: every request (only root layout in the app; no nested route-group layouts currently exist under `src/app/`).
- Responsibilities: defines `<html lang="en">` / `<body>`, loads Inter font as `--font-sans`, sets default `metadata` (including `metadataBase`), injects GA `<Script>` tags, wraps children in `NextAuthProvider` → `ConditionalChrome`, mounts `GeneralSignupPrompt`, `FlushPendingCompletions`, `GoogleAnalyticsTracker`, Vercel `SpeedInsights`.

**Middleware:**
- Location: `src/middleware.ts`
- Triggers: requests matching `config.matcher: ["/dashboard/:path*"]` only — it does not run on blog, visual-guide, or marketing routes.
- Responsibilities: NextAuth edge-compatible session check (`src/lib/auth.config.ts`, explicitly no Prisma/Node crypto per its own comment); redirects suspended users, gates `/dashboard/admin`, `/dashboard/author`, `/dashboard/subscriber` by role. Onboarding-completeness check is deferred to `src/app/dashboard/layout.tsx` where Prisma is available.

**sitemap.ts / robots.ts:**
- Location: `src/app/sitemap.ts`, `src/app/robots.ts`
- Triggers: `/sitemap.xml`, `/robots.txt` requests (Next.js file-convention routes).
- Responsibilities: `sitemap.ts` merges static routes, Sanity-sourced post/author URLs (GROQ query filtering `category->active == true`), and Prisma-sourced guide URLs (`VisualGuide` where `visibility: "PUBLISHED"`, `implemented: true`), swallowing DB errors so the sitemap still ships without guide URLs if Postgres is unreachable. `robots.ts` disallows `/api/`, `/studio/`, `/dashboard/`, `/review`, `/drafts/`, `/inactive/`, `/hidden/`, `/private/` on production (gated by `VERCEL_ENV === "production"`, not `NODE_ENV`, since `NODE_ENV` is always `"production"` on Vercel builds including previews) and blocks all crawling on non-production.

## Architectural Constraints

- **Rendering modes:** Visual guide detail pages (`src/app/visual-guides/<slug>/page.tsx`) are statically generated (no data fetch, no `dynamic`/`headers()`/`cookies()`). Blog post pages use ISR (`revalidate = 3600`). Routes forcing dynamic rendering via `headers()`/`cookies()`/`export const dynamic` are: `src/app/api/visual-guides/curriculum/route.ts`, `src/app/auth/complete-signup/page.tsx`, `src/app/dashboard/admin/authors/page.tsx`, `src/app/dashboard/admin/posts/page.tsx`, `src/app/dashboard/admin/token-usage/page.tsx`, `src/app/review/page.tsx`, `src/app/share/[token]/page.tsx`, `src/app/studio/[[...tool]]/page.tsx`.
- **Middleware scope:** `src/middleware.ts` only matches `/dashboard/:path*`; a Farsi-edition route-group split must not assume middleware runs on blog/visual-guide/marketing routes — it currently does not.
- **Single root layout:** Only `src/app/layout.tsx` exists under `src/app/`; there are no nested layouts at route-group level yet. `<html>`/`<body>`/fonts/providers/GA scripts are all established exactly once, here. Introducing a second root layout for a Farsi edition requires Next.js route groups with sibling root layouts (each with its own `<html>`), which Next.js supports only when there is no shared top-level `layout.tsx` above them — this file will need to be removed/restructured, not extended.
- **No FK between engagement tables and content:** `Comment`, `Like`, `Bookmark`, `PostView`, `ReadingHistory`, `GuideCompletion` key on plain `slug` strings (`prisma/schema.prisma`), not on a Sanity document reference or a guaranteed-unique constraint validated against Sanity. Renaming a post/guide slug orphans its engagement history silently.
- **Global mutable-ish state:** `src/lib/prisma.ts` exports a singleton Prisma client (standard Next.js dev-mode HMR-safe pattern). `src/sanity/lib/client.ts` exports a singleton Sanity client.
- **Scripts run outside Next.js request lifecycle:** `prisma/*.ts` and `scripts/*.ts` are standalone Node scripts executed via `npx tsx`, not part of the app; they import Prisma directly and load `.env` via `dotenv` (see `prisma/seed-guides.ts:1-14`).

## Anti-Patterns

### Inline GROQ queries duplicated per page

**What happens:** Each blog route page (`page.tsx`, `[categorySlug]/page.tsx`, `[categorySlug]/[postSlug]/page.tsx`) writes its own GROQ query string inline rather than sharing a query module.
**Why it's wrong:** Schema/field changes (e.g., adding a Farsi locale field) require hunting down and editing every inline query consistently; easy to miss one and get partial i18n coverage.
**Do this instead:** Centralize post/category GROQ queries in `src/sanity/lib/` (a queries module) before adding locale-aware fields for the Farsi edition.

### Route-based chrome branching via `usePathname()`

**What happens:** `ConditionalChrome` (`src/components/appSkeleton/ConditionalChrome.tsx`) is a client component that string-matches `pathname.startsWith("/cv/")` to decide whether to render Navbar/Footer.
**Why it's wrong:** This pattern doesn't scale to a second locale-specific shell — it would require another `startsWith` branch and duplicated logic rather than using Next.js's native segment-layout mechanism, and it forces the whole shell into a client component that can't use `usePathname()` during SSR before hydration.
**Do this instead:** For the Farsi edition, prefer a route group with its own `layout.tsx` (server component) over extending the `startsWith` branch list in `ConditionalChrome`.

## Error Handling

**Strategy:** Next.js file-convention error boundaries plus defensive `try/catch` around cross-system reads that can partially fail (e.g., sitemap's Prisma guide query).

**Patterns:**
- `src/app/error.tsx`, `src/app/not-found.tsx` — global error/404 boundaries.
- `sitemap.ts` wraps the Prisma `visualGuide.findMany` call in `try/catch`, degrading gracefully to an empty guide list rather than failing the whole sitemap — `src/app/sitemap.ts`.
- Blog post page calls `notFound()` when Sanity returns no matching post — `src/app/blog/[categorySlug]/[postSlug]/page.tsx:115`.

## Cross-Cutting Concerns

**Logging:** No centralized logger found in `src/lib`; relies on default console/Vercel platform logs.
**Validation:** `src/lib/validatePassword.ts`, `src/lib/validateSlug.ts` — ad hoc validators, not a shared schema library (no zod usage observed in the sampled files).
**Authentication:** NextAuth (`src/lib/auth.ts` full config with Prisma adapter; `src/lib/auth.config.ts` edge-safe subset for middleware) plus a separate API-key auth path for `v1` (`src/lib/apiKeyAuth.ts`, `src/lib/apiKeyHash.ts`).

---

*Architecture analysis: 2026-08-11*
