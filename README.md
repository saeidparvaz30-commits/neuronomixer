# NeuroNomixer

A professional publishing platform for AI, data science, and engineering content. Built with Next.js 15, Sanity CMS, and Supabase — featuring role-based dashboards, a scheduled post pipeline, and an AI-powered CV designer.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.5 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| CMS | Sanity v4 (GROQ) |
| Database | Supabase (PostgreSQL) via Prisma 7 |
| Auth | NextAuth.js v5 (Google OAuth) |
| Editor | Tiptap |
| Email | Nodemailer + Brevo API |
| Animation | Framer Motion 12 |
| Deployment | Vercel |

---

## Features

### Public
- Blog with categories, search, and featured/hero posts
- Author profiles and author listing page
- Post view tracking and trending articles sidebar
- Contact form

### Author Dashboard
- Submit posts via rich Tiptap editor
- Track post status (pending → approved → published)
- CV builder with section management and avatar upload
- AI-powered CV designer (generates 3 styled HTML/PDF designs)
- API key management

### Admin Dashboard
- Post review, approval, rejection, and deletion workflow
- Scheduled post queue with manual "Post Now" / reschedule controls
- Hero post ordering
- Author application review and approval
- Category management (create with cover image, toggle active/inactive)
- User management (roles, VIP status, CV design quota, suspend/delete)
- Notification system

---

## Branch Structure

```
main              ← production
dev               ← bug fixes and small features
feature/*         ← long-running feature branches
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (PostgreSQL)
- A [Sanity](https://sanity.io) project with a dataset
- A [Google Cloud](https://console.cloud.google.com) OAuth app
- An [Anthropic](https://console.anthropic.com) API key (for CV designer)

### Environment Variables

Create `.env.local` in the project root:

```env
# Database (Supabase)
DATABASE_URL=postgresql://postgres.<ref>:...@pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.<ref>:...@pooler.supabase.com:5432/postgres

# Auth
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# Sanity
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=blog_posts
SANITY_API_TOKEN=

# AI (CV Designer)
ANTHROPIC_API_KEY=

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Install & Run

```bash
npm install
npx prisma migrate deploy
npm run dev
```

---

## Post Publishing Flow

1. Author submits post → Sanity document created with `status: "pending"`
2. Admin reviews → approves (sets `status: "approved"`) or rejects
3. Approved posts can be scheduled (`status: "scheduled"`, `publishedAt` set)
4. Scheduled posts go live automatically when `publishedAt` passes (GROQ query condition)
5. A nightly cron job flips `status` to `"approved"` for all past-scheduled posts

---

## CV Designer

Each author gets **1 AI design generation** (admin can grant more). A generation produces 3 distinct PDF-ready HTML CV designs using the Anthropic API. Designs are saved to the database so users can return to them at any time without spending another generation.
