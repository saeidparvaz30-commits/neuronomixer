# Technology Stack

**Analysis Date:** 2026-08-11

## Languages

**Primary:**
- TypeScript 5 (strict mode) - entire `src/` tree, ~797 `.tsx` files under `src/app/visual-guides` alone
- TSX/JSX (React 19.1.0) - all UI, including the ~151 interactive visual guides

**Secondary:**
- SQL (Prisma migrations) - `prisma/migrations/`
- GROQ (Sanity query language) - queries embedded in server components/API routes that call `client.fetch(...)`

No i18n library is installed anywhere in the repo (no `next-intl`, `react-i18next`, etc.). All copy is hardcoded English.

## Runtime

**Environment:**
- Node.js (Next.js 15.5.14, App Router), deployed on Vercel
- `runtime = "nodejs"` explicitly set on routes needing Node APIs (e.g. `src/app/api/cv/design/route.ts`) since some routes use puppeteer/pg which are not Edge-compatible

**Package Manager:**
- npm (package.json + presumably package-lock.json; no pnpm/yarn lockfile found in root listing)

## Frameworks

**Core:**
- Next.js 15.5.14 - App Router, `next dev --turbopack` for dev
- React 19.1.0 / react-dom 19.1.0
- Tailwind CSS v4 (`tailwindcss": "^4"`, `@tailwindcss/postcss`, `@tailwindcss/typography`) - no `tailwind.config.js`; v4 uses CSS-based config, check `src/styles/`
- styled-components 6.1.19 - used alongside Tailwind in places

**CMS / Content:**
- Sanity 4.10.2 (`sanity`, `next-sanity` 11.4.2, `@sanity/vision`, `@sanity/icons`, `@sanity/image-url`) - blog content, Portable Text
- Studio mounted at `/studio` via `src/app/studio/[[...tool]]`, config in `sanity.config.ts` (root)
- Tiptap 3.x (`@tiptap/react`, `starter-kit`, `extension-image`, `extension-link`, `extension-table`, `extension-youtube`) - rich text editor used in author-facing post creation UI (not the public blog renderer, which uses Portable Text)

**ORM / Database:**
- Prisma 7.5.0 (`@prisma/client`, `@prisma/adapter-pg`, `prisma`) - Postgres via the `pg` driver adapter (`PrismaPg`), not the legacy Prisma binary engine
- `pg` 8.20.0 - underlying Postgres driver

**Auth:**
- next-auth v5 beta (`next-auth@^5.0.0-beta.30`) with `@auth/prisma-adapter`
- Providers: Google OAuth + Credentials (bcryptjs-hashed passwords)
- JWT session strategy, 30 min maxAge (`src/lib/auth.ts`)

**AI:**
- `@anthropic-ai/sdk` ^0.80.0 - used in `src/app/api/cv/design/route.ts` and `src/app/api/cv/extract/route.ts` (AI CV designer feature)

**Animation:**
- framer-motion 12.23.22
- gsap 3.13.0

**PDF / Document handling:**
- puppeteer-core 24.40.0 + `@sparticuz/chromium` 143.0.4 - headless Chrome for server-side PDF generation (Vercel-compatible serverless Chromium binary)
- react-pdf 10.4.1 - client-side PDF rendering/preview
- pdf-parse 1.1.1 - PDF text extraction (CV extract flow)
- mammoth 1.12.0 - .docx text extraction (CV extract flow)
- xlsx 0.18.5 - spreadsheet import/export

**Storage:**
- `@vercel/blob` 2.6.1 - shared PDFs feature (`src/app/api/dashboard/admin/shared-pdfs/`)

**Email:**
- nodemailer 7.0.7 + `@types/nodemailer` - transactional email (`src/lib/mailer.ts`)

**Bot protection:**
- react-google-recaptcha-v3 1.11.0 - client widget; server verifies via Google's `siteverify` endpoint directly with `fetch` in `src/lib/auth.ts` (no SDK wrapper)

**Search:**
- fuse.js 7.1.0 - client-side fuzzy search

**Testing/Build/Dev:**
- ESLint 9 + `eslint-config-next` 15.5.4
- No test runner (jest/vitest) present in dependencies — no automated test suite detected
- tsx 4.21.0 - runs TS scripts directly, used for Prisma seed (`prisma/seed-guides.ts`) and other one-off scripts in `scripts/`

## Key Dependencies

**Critical:**
- `@prisma/client` / `@prisma/adapter-pg` / `prisma` 7.5.0 - all app data (users, posts metadata, TokenUsage, guide completions, etc.)
- `next-auth` 5 beta - session/auth for entire dashboard/author/subscriber areas
- `next-sanity` / `sanity` - blog content source of truth
- `@anthropic-ai/sdk` - AI CV designer, billed per-call, tracked via `TokenUsage` Prisma model

**Infrastructure:**
- `@vercel/blob` - object storage for shared PDFs
- `@vercel/speed-insights` 1.2.0 - performance monitoring

## Configuration

**Environment — CRITICAL FOOTGUN (env file split):**

The repo has three env files at root: `.env`, `.env.local`, `.env.vercel-prod`. These resolve to **two different Supabase Postgres databases**:

- `.env` — read explicitly by `prisma.config.ts` via `dotenv`'s `config({ path: ".env" })`. This is the **PRODUCTION** Supabase DB, region `aws-1-eu-north-1`. Anything run through the Prisma CLI (`prisma migrate deploy`, `prisma studio`, `prisma db push`, etc., and the `npm run build` script which runs `prisma generate && prisma migrate deploy && next build`) hits this DB.
- `.env.local` — Next.js's standard local-override file, auto-loaded by `next dev`/`next build`/`next start` and **takes precedence over `.env`** per Next.js env-loading order. This points at the **PREVIEW** Supabase DB, region `aws-1-eu-central-1`. Any `node --env-file=.env.local ...` invocation, or plain `next dev`, uses this DB.
- `.env.vercel-prod` — appears to be a pulled/cached snapshot of the actual Vercel production environment variables (likely via `vercel env pull`); not auto-loaded by anything locally, reference only.

**Practical consequence:** running `next dev` (app queries) talks to the PREVIEW DB (`eu-central-1`), while running `npx prisma migrate deploy` or any bare Prisma CLI command talks to PRODUCTION (`eu-north-1`) because `prisma.config.ts` force-loads `.env` regardless of what Next.js loaded. It is easy to believe a local `prisma studio` session or a migration is inspecting/touching the same DB the dev server is reading from — it is not. Always check `DATABASE_URL`/`DIRECT_URL` origin before running any Prisma CLI command locally.

Do not run `npm run build`, `prisma migrate deploy`, `prisma db push`, or `prisma db seed` casually — `build` in particular chains a real `prisma migrate deploy` against the production database as part of the script.

**Build:**
- `next.config.ts` (root, TypeScript config file for Next.js 15)
- `sanity.config.ts` (root) - Sanity Studio config, marked `"use client"`, imports schema from `src/sanity/schemaTypes`
- `prisma.config.ts` (root) - Prisma 7's new config file (replaces `package.json#prisma` block partially); explicitly loads `.env` and sets `datasource.url` to `DIRECT_URL` (non-pooled, port 5432) for migrate/introspect
- `postcss.config.*` / Tailwind v4 CSS-first config likely in `src/styles/`
- `tsconfig.json` - path alias is exactly `{"@/*": ["./src/*"]}`, so every internal import is `@/...` (e.g. `@/lib/prisma`, `@/sanity/lib/client`)

## Platform Requirements

**Development:**
- Node.js compatible with Next.js 15 / React 19
- Local `.env.local` must be present and point at the preview DB for `next dev` to run without touching production

**Production:**
- Vercel (Next.js-native hosting, `@vercel/blob`, `@vercel/speed-insights`, Vercel Cron for `src/app/api/cron/publish-scheduled` gated by `CRON_SECRET`)
- Supabase Postgres (two projects: production in `aws-1-eu-north-1`, preview in `aws-1-eu-central-1`)
- Sanity project (hosted content lake + Studio at `/studio`)

---

*Stack analysis: 2026-08-11*
