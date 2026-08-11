# External Integrations

**Analysis Date:** 2026-08-11

## APIs & External Services

**AI / Content Generation:**
- Anthropic Claude API - `@anthropic-ai/sdk` ^0.80.0
  - `src/app/api/cv/design/route.ts` - AI CV designer: generates self-contained, one-page HTML/CSS resume designs from user CV data + style preferences (job-description mode or style-preferences mode). `runtime = "nodejs"`, `maxDuration = 120`. System prompt enforces strict single-A4-page, zero-JS, embedded-CSS output format (`STYLE:` / `DESCRIPTION:` header lines followed by raw HTML).
  - `src/app/api/cv/extract/route.ts` - extracts structured CV data from uploaded PDF/DOCX (paired with `pdf-parse` and `mammoth` for text extraction, then Claude structures it)
  - Every Claude call is expected to be logged to the `TokenUsage` Prisma model (see Data Storage below) — `userId`, `activity`, `model`, `inputTokens`, `outputTokens`, `totalTokens`. This is the app's usage/cost accounting layer for the AI CV feature; check both route handlers for the `prisma.tokenUsage.create(...)` call sites when auditing cost or adding new AI features.

**Bot Protection:**
- Google reCAPTCHA v3 - client via `react-google-recaptcha-v3` (`src/components/appSkeleton/ReCaptchaProviderClient.tsx`), server verification is a raw `fetch` to `https://www.google.com/recaptcha/api/siteverify` inside `src/lib/auth.ts` (Credentials provider `authorize`) — no SDK wrapper server-side. Score threshold is intentionally low (`score < 0.1` hard-blocks) to avoid false-positive lockouts on first-attempt logins. Controlled by `RECAPTCHA_SECRET_KEY` env var; verification is skipped entirely if unset or no token present.

## Content Management

**Sanity CMS:**
- Project config: `src/sanity/env.ts` reads `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_SANITY_API_VERSION` (default `2025-10-07`)
- Client: `src/sanity/lib/client.ts` - `createClient({ projectId, dataset, apiVersion, useCdn: false, token: process.env.SANITY_API_TOKEN })`. `useCdn: false` means every fetch hits the live Content Lake API directly (no Sanity CDN caching) — deliberate for freshness (author-published posts, scheduled-publish cron flips) at the cost of latency/quota.
- Live query API: `src/sanity/lib/live.ts` - wraps `next-sanity/live`'s `defineLive({ client })`, exporting `sanityFetch` (server-side query helper with automatic revalidation) and `<SanityLive />` (client component providing live updates in the browser without a full page reload). `<SanityLive />` must be mounted once in the root layout for the live-update behavior to work.
- Schema: `src/sanity/schemaTypes/` - `postType.ts`, `authorType.ts`, `categoryType.ts`, `blockContentType.ts` (Portable Text block schema), aggregated in `src/sanity/schemaTypes/index.ts`
- Studio: mounted in-app at `/studio` via `src/app/studio/[[...tool]]`, config in root `sanity.config.ts` (client component, `basePath: "/studio"`, `structureTool` + `visionTool` plugins, custom `structure.ts` for the desk layout)
- Content model is minimal (4 document types) — author profile/status data actually lives in Postgres (`User.sanityAuthorId`, `User.authorStatus` link the two systems), not in Sanity itself
- Blog content is fetched via `client.fetch<T>(groqQuery)` (see `src/app/api/cron/publish-scheduled/route.ts` for an example query shape) and rendered from Portable Text (`blockContentType`) using presumably `@portabletext/react` — verify in blog rendering components under `src/app/blog/`
- Cross-system sync: `src/app/api/cron/publish-scheduled/route.ts` (Vercel Cron) queries Sanity for `status="scheduled"` posts whose `publishedAt` has passed and flips them to `status="approved"` directly via a Sanity mutation, then presumably notifies the author via `src/lib/mailer.ts`

## Data Storage

**Databases:**
- Postgres via Supabase, accessed through Prisma 7 (`@prisma/client` + `@prisma/adapter-pg`, not the legacy binary engine) — see `src/lib/prisma.ts` (`PrismaPg({ connectionString: process.env.DATABASE_URL })`)
- **Two physically separate Supabase projects are in play** — see STACK.md "Environment — CRITICAL FOOTGUN" section for the full `.env` vs `.env.local` resolution rules. In summary: production DB is `aws-1-eu-north-1` (loaded by `prisma.config.ts` for all Prisma CLI ops), preview DB is `aws-1-eu-central-1` (loaded by `.env.local`, used by `next dev`/`next build`/`next start`).
- `DIRECT_URL` (non-pooled, port 5432) is used for Prisma CLI/migrations; `DATABASE_URL` (pooled, presumably PgBouncer/Supabase pooler) is used at runtime by the app (`src/lib/prisma.ts`)
- Schema: `prisma/schema.prisma` — key app models: `User`, `Account`/`Session`/`VerificationToken` (NextAuth), `Follow`, `ReadingHistory`, `Like`, `Bookmark`, `Comment`, `PasswordResetToken`, `Notification`, `AuthorCV`, `AuthorApiKey`, `GuideCompletion`, `TokenUsage`
- `TokenUsage` model (`prisma/schema.prisma:226-240`): `id`, `userId` (FK → User, cascade delete), `activity`, `model`, `inputTokens`, `outputTokens`, `totalTokens`, `createdAt`, indexed on `userId`, `activity`, `createdAt` — this is the sole persistence layer for AI (Claude) usage/cost tracking; any new Claude-calling route should write here

**File Storage:**
- Vercel Blob (`@vercel/blob`) - shared PDFs feature under `src/app/api/dashboard/admin/shared-pdfs/`, including a client-upload-token flow (`upload-token/route.ts`) so large files upload directly from browser to Blob storage rather than through the Next.js function

**Caching:**
- None detected (no Redis/Upstash package in dependencies); Sanity client explicitly disables CDN caching (`useCdn: false`)

## Authentication & Identity

**Auth Provider:**
- next-auth v5 (beta), self-hosted, `src/lib/auth.ts` + `src/lib/auth.config.ts`
- Providers: Google OAuth (`next-auth/providers/google`), Credentials (email/password, bcryptjs hash, `@auth/prisma-adapter` for persistence)
- Session strategy: JWT, 30-minute `maxAge` (short-lived so stale role/suspension claims self-heal quickly, including in edge middleware)
- Security hardening in `authorize()`: rate limiting via `checkRateLimit` (`src/lib/rateLimit.ts`) at 5 attempts / 15 min per email, timing-attack mitigation via a cached dummy bcrypt hash compared even when the account/password doesn't exist (prevents login-enumeration oracle), reCAPTCHA v3 score check
- Roles: `Role` enum on `User` (`SUBSCRIBER` default, presumably `AUTHOR`/`ADMIN`), plus separate `AuthorStatus` enum for author-application workflow, `suspended` boolean, `tokenVersion` int (likely used to invalidate JWTs on password change/suspension)

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry or similar in dependencies)

**Performance:**
- `@vercel/speed-insights` 1.2.0 - Vercel's built-in RUM/performance monitoring

**Logs:**
- No dedicated logging service detected; presumably console logging + Vercel's function log dashboard

## CI/CD & Deployment

**Hosting:**
- Vercel (Next.js-native), evidenced by `.vercel/` directory, `@vercel/blob`, `@vercel/speed-insights`, and the `puppeteer-core` + `@sparticuz/chromium` pairing (the standard combo for running headless Chrome inside Vercel's serverless function size/runtime limits)

**CI Pipeline:**
- Not detected in this pass (no `.github/workflows/` confirmed in the directory listing explored) — verify separately if needed

## Environment Configuration

**Required env vars (names only, values never read):**
- `DATABASE_URL`, `DIRECT_URL` - Postgres connection strings (pooled/non-pooled)
- `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_SANITY_API_VERSION`, `SANITY_API_TOKEN`
- `RECAPTCHA_SECRET_KEY` - server-side reCAPTCHA v3 verification (optional; skipped if unset)
- `CRON_SECRET` - bearer-token auth for `src/app/api/cron/publish-scheduled/route.ts`, must match Vercel Cron's configured header
- Anthropic API key (standard `ANTHROPIC_API_KEY`, consumed implicitly by the `Anthropic` SDK client in `src/app/api/cv/design/route.ts` / `cv/extract/route.ts`)
- next-auth: Google OAuth client ID/secret, `AUTH_SECRET`/`NEXTAUTH_SECRET`-style signing secret
- Vercel Blob: token auto-injected by Vercel when Blob store is linked to the project
- Mailer (nodemailer, `src/lib/mailer.ts`): SMTP host/port/user/pass or provider-specific credentials

**Secrets location:**
- Local dev: `.env` (production DB config, loaded only by Prisma CLI) and `.env.local` (preview DB + everything else, loaded by Next.js) — see STACK.md footgun note
- `.env.vercel-prod` present at root as a reference/pulled snapshot of actual Vercel production env vars, not auto-loaded
- Production/preview: Vercel project environment variables (per-environment: Production / Preview / Development)
- All three env files exist as plaintext at repo root — confirm they are `.gitignore`d before any commit review; do not read or echo their contents

## Webhooks & Callbacks

**Incoming:**
- Vercel Cron trigger → `GET /api/cron/publish-scheduled` (protected by `CRON_SECRET` bearer token, configured via `vercel.json` cron schedule)

**Outgoing:**
- Google reCAPTCHA `siteverify` POST (`src/lib/auth.ts`)
- Outbound transactional email via nodemailer/SMTP (`src/lib/mailer.ts`) - triggered on signup, password reset, author-application status changes, scheduled-post publish notifications

---

*Integration audit: 2026-08-11*
